import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/appAuth";

export async function POST() {
  const response = NextResponse.json({ unlocked: false });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });

  return response;
}
