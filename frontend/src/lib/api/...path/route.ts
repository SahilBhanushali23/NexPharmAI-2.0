
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { path: string[] } | Promise<{ path: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext) {
  const backendUrl = process.env.API_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { detail: "API_URL is missing in Vercel environment variables" },
      { status: 500 }
    );
  }

  const { path } = await context.params;
  const baseUrl = backendUrl.endsWith("/")
    ? backendUrl
    : `${backendUrl}/`;

  const targetUrl = new URL(path.join("/"), baseUrl);
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend proxy failed:", error);
    return NextResponse.json(
      { detail: "Could not connect to the backend service" },
      { status: 502 }
    );
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
};
