import "server-only";
import axios from "axios";
import { NextResponse } from "next/server";
import { backendApiClient } from "@/lib/server/backendApiClient";
import { logger } from "@/lib/utils/logger";
import type { ReportExportFormat } from "@/types/report.types";

/**
 * Shared helper for the three `/api/reports/*\/export` Route Handlers
 * (Timesheet, User Roles Summary, Monthly Cost & Revenue). Each backend
 * `Report/Export*` endpoint returns a raw file body (xlsx or csv), not the
 * usual `{ StatusCode, IsSuccess, Message, Data }` JSON envelope, so this
 * intentionally does NOT go through `lib/server/backendEnvelope.ts` — the
 * response is streamed back to the browser as-is with the correct
 * `Content-Type`/`Content-Disposition` headers so it downloads as a file.
 */

const CONTENT_TYPES: Record<ReportExportFormat, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
};

interface FetchReportExportOptions {
  /** Backend path, e.g. `/Report/ExportTimesheetReport`. */
  backendPath: string;
  params: Record<string, string | number | boolean | undefined>;
  accessToken: string;
  format: ReportExportFormat;
  /** Suggested download filename, including extension. */
  filename: string;
  fallbackMessage: string;
}

/** Escapes double quotes in a filename to keep the `Content-Disposition` header well-formed. */
function sanitizeFilename(filename: string): string {
  return filename.replace(/"/g, "'");
}

/**
 * Calls a `Report/Export*` backend endpoint and returns its binary body as a
 * downloadable `NextResponse`, or a JSON `{ message }` error response if the
 * backend call fails.
 */
export async function fetchReportExport({
  backendPath,
  params,
  accessToken,
  format,
  filename,
  fallbackMessage,
}: FetchReportExportOptions): Promise<NextResponse> {
  try {
    const response = await backendApiClient.get<ArrayBuffer>(backendPath, {
      params,
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: "arraybuffer",
    });

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
      },
    });
  } catch (error) {
    const { status, message } = normalizeBinaryBackendError(error, fallbackMessage);
    return NextResponse.json({ message }, { status });
  }
}

/**
 * Variant of `lib/server/normalizeBackendError.ts` for binary (`arraybuffer`)
 * responses: axios still populates `error.response.data` with the raw bytes
 * of the backend's error body on failure, so this attempts to decode it as
 * UTF-8 JSON to recover a business-rule message for 4xx errors, falling back
 * to a generic message for 5xx/network failures (never leaking internals).
 */
function normalizeBinaryBackendError(
  error: unknown,
  fallbackMessage: string
): { status: number; message: string } {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 502;
    let backendMessage: string | undefined;

    const data = error.response?.data as ArrayBuffer | Buffer | undefined;
    if (data) {
      try {
        const text = Buffer.isBuffer(data) ? data.toString("utf-8") : Buffer.from(data).toString("utf-8");
        const parsed = JSON.parse(text) as { Message?: string; message?: string };
        backendMessage = parsed.Message ?? parsed.message;
      } catch {
        // Non-JSON (or empty) error body — fall through to the generic message.
      }
    }

    if (status >= 400 && status < 500 && backendMessage) {
      return { status, message: backendMessage };
    }

    logger.error("Backend report export request failed", { status });
    return { status: status >= 500 ? 502 : status, message: fallbackMessage };
  }

  logger.error("Unexpected error calling backend report export endpoint", error);
  return { status: 500, message: fallbackMessage };
}
