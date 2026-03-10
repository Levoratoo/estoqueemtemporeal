import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0"
};

export async function POST(request: Request) {
  try {
    const refreshUrl = new URL("/api/data", request.url);
    const forwardHeaders = new Headers();
    const refreshToken = request.headers.get("x-refresh-token")?.trim();

    if (refreshToken) {
      forwardHeaders.set("x-refresh-token", refreshToken);
    }

    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: forwardHeaders,
      cache: "no-store"
    });

    const payload = await response.text();
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
        ...NO_STORE_HEADERS
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar";
    console.error("[grid] refresh proxy failed", error);
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: NO_STORE_HEADERS
      }
    );
  }
}
