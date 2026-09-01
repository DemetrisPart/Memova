import { logWorkerError, logMetric } from "@momeva/logging";
import {
  MEDIA_PROCESS_IMAGE_JOB,
  MEDIA_QUEUE_NAME,
} from "@momeva/shared";
import { createStorageServiceFromEnv, type S3StorageService } from "@momeva/storage";
import { Job, Worker } from "bullmq";
import IORedis from "ioredis";
import sharp from "sharp";
import {
  MediaAssetStatus,
  MediaVariantType,
  prisma,
} from "@momeva/database";
import {
  buildMediaVariantKey,
  IMAGE_VARIANT_SPECS,
  type MediaProcessImageJobPayload,
} from "@momeva/domain";
import {
  markMediaFailed,
  notifyAdminsOfProcessingFailure,
} from "./admin-failure-notify";
import { maybeNotifyCouplePhotoMilestone50 } from "./couple-milestone-notify";
import {
  maybeNotifyCoupleFirstGuestPhoto,
  maybeNotifyCoupleStorageNearFull,
} from "./couple-event-driven-notify";

let storage: S3StorageService | undefined;

function getStorage(): S3StorageService {
  if (!storage) {
    storage = createStorageServiceFromEnv();
  }
  return storage;
}

async function processImageJob(
  job: Job<MediaProcessImageJobPayload>,
): Promise<void> {
  const { mediaAssetId, eventId } = job.data;

  const media = await prisma.mediaAsset.findFirst({
    where: {
      id: mediaAssetId,
      eventId,
      deletedAt: null,
    },
  });

  if (!media) {
    throw new Error(`Media asset not found: ${mediaAssetId}`);
  }

  if (media.status === MediaAssetStatus.ACTIVE) {
    return;
  }

  if (media.status !== MediaAssetStatus.PROCESSING) {
    throw new Error(
      `Media asset ${mediaAssetId} is not in PROCESSING state (${media.status})`,
    );
  }

  const env = process.env.APP_ENV ?? "development";
  const originalBuffer = await getStorage().getObjectBuffer({
    key: media.originalKey,
  });

  const metadata = await sharp(originalBuffer).metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  const thumbSpec = IMAGE_VARIANT_SPECS.THUMB;
  const webSpec = IMAGE_VARIANT_SPECS.WEB;

  const thumbBuffer = await sharp(originalBuffer)
    .rotate()
    .resize(thumbSpec.maxDimension, thumbSpec.maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: thumbSpec.quality })
    .toBuffer();

  const webBuffer = await sharp(originalBuffer)
    .rotate()
    .resize(webSpec.maxDimension, webSpec.maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: webSpec.quality })
    .toBuffer();

  const thumbKey = buildMediaVariantKey(
    env,
    eventId,
    mediaAssetId,
    "thumb",
    thumbSpec.extension,
  );
  const webKey = buildMediaVariantKey(
    env,
    eventId,
    mediaAssetId,
    "web",
    webSpec.extension,
  );

  await getStorage().putObject({
    key: thumbKey,
    body: thumbBuffer,
    contentType: "image/webp",
  });

  await getStorage().putObject({
    key: webKey,
    body: webBuffer,
    contentType: "image/webp",
  });

  await prisma.$transaction(async (tx) => {
    await tx.mediaVariant.upsert({
      where: {
        mediaAssetId_variant: {
          mediaAssetId,
          variant: MediaVariantType.THUMB,
        },
      },
      create: {
        mediaAssetId,
        variant: MediaVariantType.THUMB,
        storageKey: thumbKey,
        sizeBytes: BigInt(thumbBuffer.length),
      },
      update: {
        storageKey: thumbKey,
        sizeBytes: BigInt(thumbBuffer.length),
      },
    });

    await tx.mediaVariant.upsert({
      where: {
        mediaAssetId_variant: {
          mediaAssetId,
          variant: MediaVariantType.WEB,
        },
      },
      create: {
        mediaAssetId,
        variant: MediaVariantType.WEB,
        storageKey: webKey,
        sizeBytes: BigInt(webBuffer.length),
      },
      update: {
        storageKey: webKey,
        sizeBytes: BigInt(webBuffer.length),
      },
    });

    await tx.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        status: MediaAssetStatus.ACTIVE,
        width,
        height,
        failureReason: null,
      },
    });
  });

  void maybeNotifyCouplePhotoMilestone50(eventId);
  void maybeNotifyCoupleFirstGuestPhoto(eventId);
  void maybeNotifyCoupleStorageNearFull(eventId);
}

export function startMediaWorker(): Worker<MediaProcessImageJobPayload> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for worker-media");
  }

  const concurrency = parseInt(
    process.env.WORKER_MEDIA_CONCURRENCY ?? "2",
    10,
  );

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<MediaProcessImageJobPayload>(
    MEDIA_QUEUE_NAME,
    async (job) => {
      if (job.name !== MEDIA_PROCESS_IMAGE_JOB) {
        throw new Error(`Unknown job name: ${job.name}`);
      }
      await processImageJob(job);
    },
    {
      connection,
      concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 2,
    },
  );

  worker.on("failed", (job, err) => {
    const maxAttempts = job?.opts?.attempts ?? 3;
    const isFinalFailure = !job || job.attemptsMade >= maxAttempts;
    const reason =
      err instanceof Error && err.message
        ? err.message
        : "Media processing failed";

    logWorkerError({
      jobId: job?.id ?? "unknown",
      queue: MEDIA_QUEUE_NAME,
      mediaId: job?.data.mediaAssetId,
      message: isFinalFailure
        ? "Media processing job failed permanently"
        : "Media processing job failed — will retry",
      err,
    });

    if (isFinalFailure && job?.data.mediaAssetId) {
      logMetric("worker.job_failed", {
        mediaAssetId: job.data.mediaAssetId,
        eventId: job.data.eventId,
        attemptsMade: job.attemptsMade,
      });
      void (async () => {
        await markMediaFailed(job.data.mediaAssetId, reason);
        await notifyAdminsOfProcessingFailure({
          eventId: job.data.eventId,
          mediaId: job.data.mediaAssetId,
          reason,
        });
      })();
    }
  });

  return worker;
}
