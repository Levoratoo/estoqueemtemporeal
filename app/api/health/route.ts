import { NextResponse } from "next/server";
import { getCachePayload } from "../../../lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const payload = await getCachePayload();
  return NextResponse.json(
    {
      status: payload.error ? "degraded" : "ok",
      lastRefreshAt: payload.lastRefreshAt,
      error: payload.error ?? null
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    }
  );
}
