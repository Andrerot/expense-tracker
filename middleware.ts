import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/appAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMutatingRequest(request) && !isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origine richiesta non valida" }, { status: 403 });
  }

  if (pathname === "/api/auth/unlock" || pathname === "/api/auth/lock") {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/api/expenses") && !pathname.startsWith("/api/storage")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (await verifyAuthToken(token)) {
    return NextResponse.next();
  }

  return NextResponse.json({ error: "Sblocca Spendino con il PIN" }, { status: 401 });
}

export const config = {
  matcher: ["/api/auth/lock", "/api/auth/unlock", "/api/expenses/:path*", "/api/storage/:path*"],
};

function isMutatingRequest(request: NextRequest): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(request.method);
}

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.APP_ALLOWED_ORIGIN?.trim() || request.nextUrl.origin;

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  return origin === allowedOrigin;
}
