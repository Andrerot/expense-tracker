import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_MAX_AGE_SECONDS,
  clearPinRateLimit,
  createAuthToken,
  isPinRateLimited,
  isPinValid,
  recordFailedPinAttempt,
} from "@/lib/appAuth";

type UnlockPayload = {
  pin?: unknown;
};

export async function POST(request: Request) {
  const rateLimitKey = getRateLimitKey(request);

  if (isPinRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova tra qualche minuto" },
      { status: 429 },
    );
  }

  let payload: UnlockPayload;

  try {
    payload = (await request.json()) as UnlockPayload;
  } catch {
    return NextResponse.json({ error: "PIN non valido" }, { status: 400 });
  }

  if (!isPinValid(payload.pin)) {
    recordFailedPinAttempt(rateLimitKey);
    return NextResponse.json({ error: "PIN non corretto" }, { status: 401 });
  }

  clearPinRateLimit(rateLimitKey);
  const response = NextResponse.json({ unlocked: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: await createAuthToken(),
    httpOnly: true,
    maxAge: AUTH_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function getRateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "local";
}
