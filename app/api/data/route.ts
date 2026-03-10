import { NextResponse } from "next/server";
import { getCachePayload, refreshCache } from "../../../lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0"
};

export async function GET() {
  const payload = await getCachePayload();
  return NextResponse.json(payload, {
    headers: NO_STORE_HEADERS
  });
}

export async function POST(request: Request) {
  try {
    const token = process.env.FORCE_REFRESH_TOKEN;
    if (token) {
      const headerToken = request.headers.get("x-refresh-token")?.trim();
      if (!headerToken || headerToken !== token) {
        return NextResponse.json(
          { error: "Token invalido" },
          {
            status: 401,
            headers: NO_STORE_HEADERS
          }
        );
      }
    }

    await refreshCache();
    const payload = await getCachePayload();
    return NextResponse.json(payload, {
      headers: NO_STORE_HEADERS
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar";
    console.error("[grid] data route failed", error);
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: NO_STORE_HEADERS
      }
    );
  }
}
