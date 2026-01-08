import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "your-secret-key-min-32-chars-long"
);
const SESSION_COOKIE_NAME = "zitadel_session";

interface SessionData {
  sessionId: string;
  sessionToken: string;
  userId: string;
  loginName: string;
  displayName?: string;
}

export async function createSessionCookie(data: SessionData) {
  //    @ts-ignore
  const token = await new SignJWT(data)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .setIssuedAt()
    .sign(SESSION_SECRET);

  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

export async function getSessionCookie(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);

  if (!token) return null;

  try {
    const verified = await jwtVerify(token.value, SESSION_SECRET);
    return verified.payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
