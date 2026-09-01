import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { getLogger } from "@momeva/logging";

const HTTP_STATUS_TITLES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "Bad Request",
  [HttpStatus.UNAUTHORIZED]: "Unauthorized",
  [HttpStatus.FORBIDDEN]: "Forbidden",
  [HttpStatus.NOT_FOUND]: "Not Found",
  [HttpStatus.CONFLICT]: "Conflict",
  [HttpStatus.TOO_MANY_REQUESTS]: "Too Many Requests",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
  [HttpStatus.SERVICE_UNAVAILABLE]: "Service Unavailable",
};

/** RFC 7807 Problem Details (+ requestId extension). */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  /** Nested validation errors when present. */
  errors?: string[];
  retryAfterSeconds?: number;
};

function titleForStatus(status: number): string {
  return HTTP_STATUS_TITLES[status] ?? `HTTP ${status}`;
}

function detailFromHttpBody(
  status: number,
  body: string | object,
): { detail: string; errors?: string[]; retryAfterSeconds?: number } {
  if (typeof body === "string") {
    return { detail: body };
  }

  const record = body as Record<string, unknown>;
  const retryAfterSeconds =
    typeof record.retryAfterSeconds === "number"
      ? record.retryAfterSeconds
      : undefined;

  const message = record.message;
  if (typeof message === "string") {
    return { detail: message, retryAfterSeconds };
  }
  if (Array.isArray(message) && message.every((m) => typeof m === "string")) {
    const errors = message as string[];
    return {
      detail: errors.join("; ") || titleForStatus(status),
      errors,
      retryAfterSeconds,
    };
  }

  if (typeof record.error === "string" && !message) {
    return { detail: record.error, retryAfterSeconds };
  }

  return { detail: titleForStatus(status), retryAfterSeconds };
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = getLogger().child({ service: "api" });

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers["x-request-id"] as string) ?? "unknown";
    const instance = request.originalUrl || request.url || "/";

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      // Non-error HttpException (e.g. 202 magic-link pending) — keep original body.
      if (status < 400) {
        response.status(status).json(
          typeof raw === "string"
            ? { message: raw, requestId }
            : { ...(raw as object), requestId },
        );
        return;
      }

      const { detail, errors, retryAfterSeconds } = detailFromHttpBody(
        status,
        raw,
      );

      const problem: ProblemDetails = {
        type: "about:blank",
        title: titleForStatus(status),
        status,
        detail,
        instance,
        requestId,
        ...(errors?.length ? { errors } : {}),
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
      };

      response
        .status(status)
        .type("application/problem+json")
        .json(problem);
      return;
    }

    this.logger.error(
      {
        err: exception,
        requestId,
        method: request.method,
        path: request.originalUrl,
      },
      "Unhandled API exception",
    );

    const isProd = this.config.get("NODE_ENV") === "production";
    const problem: ProblemDetails = {
      type: "about:blank",
      title: titleForStatus(HttpStatus.INTERNAL_SERVER_ERROR),
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: isProd ? "Internal server error" : "Unexpected error",
      instance,
      requestId,
    };

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .type("application/problem+json")
      .json(problem);
  }
}
