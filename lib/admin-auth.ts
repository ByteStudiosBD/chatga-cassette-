import { env } from "cloudflare:workers";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminSecurity } from "@/db/schema";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";

const COOKIE = "ctg_admin_session";
const PBKDF2_ITERATIONS = 100_000;
const encoder = new TextEncoder();

type RuntimeEnv = {
  ADMIN_OWNER_ID?: string;
  ADMIN_OWNER_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
};

function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(value: string) {
  const secret = runtimeEnv().ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Admin session secret is not configured");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function getOwner() {
  const user = await getChatGPTUser();
  if (!user) return { ok: false as const, status: 401, user: null };
  if (!isAdminOwner(user)) return { ok: false as const, status: 403, user };
  return { ok: true as const, status: 200, user };
}

export function isAdminOwner(user: Pick<ChatGPTUser, "userId" | "email">) {
  const { ADMIN_OWNER_ID: ownerId, ADMIN_OWNER_EMAIL: ownerEmail } = runtimeEnv();
  const idMatches = Boolean(ownerId && user.userId === ownerId);
  const emailMatches = Boolean(
    ownerEmail && user.email.trim().toLowerCase() === ownerEmail.trim().toLowerCase(),
  );
  return idMatches || emailMatches;
}

export async function hasAdminSession(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || (await hmac(payload)) !== signature) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as { uid: string; exp: number };
    return parsed.uid === userId && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function requireAdminApi() {
  const owner = await getOwner();
  if (!owner.ok) return owner;
  if (!(await hasAdminSession(owner.user.userId))) return { ok: false as const, status: 401, user: owner.user };
  return owner;
}

export async function setAdminSession(userId: string) {
  const payload = encodeBase64Url(encoder.encode(JSON.stringify({ uid: userId, exp: Date.now() + 12 * 60 * 60 * 1000 })));
  const token = `${payload}.${await hmac(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 12 * 60 * 60 });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
}

export async function currentPasswordHash() {
  const db = getDb();
  const [saved] = await db.select().from(adminSecurity).where(eq(adminSecurity.id, 1)).limit(1);
  return saved?.passwordHash ?? runtimeEnv().ADMIN_PASSWORD_HASH ?? "";
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterationsText, saltText, expectedText] = encoded.split("$");
  if (algorithm !== "pbkdf2" || !iterationsText || !saltText || !expectedText) return false;
  const iterations = Number(iterationsText);
  if (!Number.isSafeInteger(iterations) || iterations !== PBKDF2_ITERATIONS) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: decodeBase64Url(saltText), iterations }, key, 256));
  const expected = decodeBase64Url(expectedText);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++) difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS }, key, 256));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(derived)}`;
}

export async function forwardedUserId() {
  return (await headers()).get("oai-authenticated-user-id");
}
