export const AUTH_COOKIE_NAME = "spendino_unlocked";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const DEFAULT_APP_PIN = "1234";
const PIN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

type PinAttemptState = {
  attempts: number;
  resetAt: number;
};

const pinAttemptStore = new Map<string, PinAttemptState>();

export function getAppPin(): string {
  return process.env.APP_PIN?.trim() || DEFAULT_APP_PIN;
}

export function isPinValid(value: unknown): boolean {
  return typeof value === "string" && value.trim() === getAppPin();
}

export function isPinRateLimited(key: string, now = Date.now()): boolean {
  const state = pinAttemptStore.get(key);

  if (!state) {
    return false;
  }

  if (state.resetAt <= now) {
    pinAttemptStore.delete(key);
    return false;
  }

  return state.attempts >= PIN_RATE_LIMIT_MAX_ATTEMPTS;
}

export function recordFailedPinAttempt(key: string, now = Date.now()): void {
  const current = pinAttemptStore.get(key);

  if (!current || current.resetAt <= now) {
    pinAttemptStore.set(key, {
      attempts: 1,
      resetAt: now + PIN_RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  pinAttemptStore.set(key, {
    attempts: current.attempts + 1,
    resetAt: current.resetAt,
  });
}

export function clearPinRateLimit(key: string): void {
  pinAttemptStore.delete(key);
}

export async function createAuthToken(now = Math.floor(Date.now() / 1000)): Promise<string> {
  const signature = await signAuthPayload(String(now));
  return `${now}.${signature}`;
}

export async function verifyAuthToken(token: string | undefined): Promise<boolean> {
  if (!token) {
    return false;
  }

  const [createdAt, signature] = token.split(".");
  const createdAtSeconds = Number.parseInt(createdAt ?? "", 10);
  const now = Math.floor(Date.now() / 1000);

  if (!createdAt || !signature || !Number.isFinite(createdAtSeconds)) {
    return false;
  }

  if (createdAtSeconds > now || now - createdAtSeconds > AUTH_MAX_AGE_SECONDS) {
    return false;
  }

  const expectedSignature = await signAuthPayload(createdAt);
  return constantTimeEqual(signature, expectedSignature);
}

async function signAuthPayload(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${value}:${getAppPin()}`));

  return base64UrlEncode(signature);
}

function getAuthSecret(): string {
  return process.env.APP_AUTH_SECRET?.trim() || getAppPin();
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

function base64UrlEncode(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
