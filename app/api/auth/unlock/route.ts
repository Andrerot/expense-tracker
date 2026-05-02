import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_MAX_AGE_SECONDS, createAuthToken, isPinValid } from "@/lib/appAuth";

type UnlockPayload = {
  pin?: unknown;
};

export async function POST(request: Request) {
  let payload: UnlockPayload;

  try {
    payload = (await request.json()) as UnlockPayload;
  } catch {
    return NextResponse.json({ error: "PIN non valido" }, { status: 400 });
  }

  if (!isPinValid(payload.pin)) {
    return NextResponse.json({ error: "PIN non corretto" }, { status: 401 });
  }

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
