import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  GetObjectOptions,
  PresignedDownloadOptions,
  PresignedUploadOptions,
  PresignedUploadUrl,
  PresignedUrlSet,
  PutObjectOptions,
  StorageService,
} from "@momeva/domain";
import { MVP_DEFAULTS } from "@momeva/shared";
import { Readable } from "node:stream";

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported S3 response body type");
}

function createPresignClient(
  config: S3StorageConfig,
  endpoint: string,
): S3Client {
  return new S3Client({
    endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle ?? true,
  });
}

export interface S3StorageConfig {
  endpoint: string;
  /** Host reachable on local Wi-Fi (e.g. 192.168.x.x). Used for presigned URLs. */
  lanEndpoint?: string;
  /** Host reachable on cellular / remote (Tailscale, ngrok). Used for presigned URLs. */
  publicEndpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly lanPresignClient?: S3Client;
  private readonly publicPresignClient?: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
    });

    if (config.lanEndpoint) {
      this.lanPresignClient = createPresignClient(config, config.lanEndpoint);
    }

    if (config.publicEndpoint) {
      this.publicPresignClient = createPresignClient(
        config,
        config.publicEndpoint,
      );
    }
  }

  private async signUrl(
    command: PutObjectCommand | GetObjectCommand,
    expiresIn: number,
  ): Promise<PresignedUrlSet> {
    // Primary URL always uses STORAGE_ENDPOINT (localhost in local, R2 in prod).
    // LAN/public variants are optional browser-reachable hosts for mobile/dev.
    const [url, lanUrl, publicUrl] = await Promise.all([
      getSignedUrl(this.client, command, { expiresIn }),
      this.lanPresignClient
        ? getSignedUrl(this.lanPresignClient, command, { expiresIn })
        : Promise.resolve(undefined),
      this.publicPresignClient
        ? getSignedUrl(this.publicPresignClient, command, { expiresIn })
        : Promise.resolve(undefined),
    ]);

    return { url, lanUrl, publicUrl };
  }

  async getPresignedUploadUrl(
    options: PresignedUploadOptions,
  ): Promise<PresignedUploadUrl> {
    const expiresIn =
      options.expiresInSeconds ?? MVP_DEFAULTS.PRESIGNED_UPLOAD_TTL_SECONDS;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ContentType: options.contentType,
      ContentLength: options.contentLength,
    });
    const urls = await this.signUrl(command, expiresIn);
    return {
      ...urls,
      key: options.key,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async getPresignedDownloadUrl(
    options: PresignedDownloadOptions,
  ): Promise<string> {
    const urls = await this.getPresignedDownloadUrls(options);
    return urls.url;
  }

  async getPresignedDownloadUrls(
    options: PresignedDownloadOptions,
  ): Promise<PresignedUrlSet> {
    const expiresIn =
      options.expiresInSeconds ?? MVP_DEFAULTS.PRESIGNED_DOWNLOAD_TTL_SECONDS;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ResponseContentDisposition: options.fileName
        ? `attachment; filename="${options.fileName}"`
        : undefined,
    });
    return this.signUrl(command, expiresIn);
  }

  async getObjectBuffer(options: GetObjectOptions): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Range: options.maxBytes
        ? `bytes=0-${options.maxBytes - 1}`
        : undefined,
    });
    const response = await this.client.send(command);
    return streamToBuffer(response.Body);
  }

  async putObject(options: PutObjectOptions): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}

export function createStorageServiceFromEnv(): S3StorageService {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const region = process.env.STORAGE_REGION ?? "auto";
  const bucket = process.env.STORAGE_BUCKET;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing storage environment variables: STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY",
    );
  }

  return new S3StorageService({
    endpoint,
    lanEndpoint: process.env.STORAGE_LAN_ENDPOINT,
    publicEndpoint: process.env.STORAGE_PUBLIC_ENDPOINT,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== "false",
  });
}
