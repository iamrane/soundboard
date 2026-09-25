// Admin access control for the admin page and write endpoints. One of:
//   - ADMIN_ALLOWED_IPS (comma-separated): client IP must be listed. No password needed.
//   - ADMIN_PASSWORD: HTTP Basic auth, used only when no allowlist is set.
// Neither set: open locally, refused on Vercel.
// Uses Web Crypto only, so it runs in both the proxy and route handlers.

export type AuthResult = "ok" | "forbidden" | "unauthorized" | "unconfigured";

function allowedIps(): string[] {
  return (process.env.ADMIN_ALLOWED_IPS ?? "")
    .split(",")
    .map((ip) => normalizeIp(ip))
    .filter(Boolean);
}

function normalizeIp(value: string): string {
  const ip = value.trim().toLowerCase();
  // IPv4 addresses sometimes arrive as IPv4-mapped IPv6 (::ffff:1.2.3.4).
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

/**
 * Client IP as seen by the platform. On Vercel these headers are set by the edge
 * and cannot be spoofed by the client. Locally there is no proxy, so it is unknown.
 */
export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip");
  if (real) return normalizeIp(real);
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return normalizeIp(forwarded.split(",")[0]);
  return null;
}

export function checkAdminIp(headers: Headers): "ok" | "forbidden" | "unset" {
  const allowed = allowedIps();
  if (allowed.length === 0) return "unset";
  const ip = clientIp(headers);
  if (allowed.includes(ip ?? "")) return "ok";
  // Local dev: the Next server reports the loopback address, or nothing at all.
  const isLocal = ip === null || ip === "127.0.0.1" || ip === "::1";
  return isLocal && !process.env.VERCEL ? "ok" : "forbidden";
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da[i] ^ db[i];
  return diff === 0;
}

function decodeBasic(encoded: string): string | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export async function checkAdminAuth(headers: Headers): Promise<AuthResult> {
  const ipResult = checkAdminIp(headers);
  if (ipResult !== "unset") return ipResult;

  const authorization = headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return process.env.VERCEL ? "unconfigured" : "ok";

  const [scheme, encoded] = (authorization ?? "").split(" ");
  if (scheme !== "Basic" || !encoded) return "unauthorized";
  const decoded = decodeBasic(encoded);
  if (decoded === null) return "unauthorized";
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  return (await safeEqual(supplied, password)) ? "ok" : "unauthorized";
}

export function authFailureResponse(result: Exclude<AuthResult, "ok">): Response {
  if (result === "forbidden") {
    return Response.json({ error: "Admin access is not allowed from this network." }, { status: 403 });
  }
  if (result === "unconfigured") {
    return Response.json({ error: "Admin access is not configured (set ADMIN_ALLOWED_IPS or ADMIN_PASSWORD)." }, { status: 503 });
  }
  return Response.json(
    { error: "Admin password required." },
    { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Frontboard admin", charset="UTF-8"' } },
  );
}

/** Returns a failure response, or null when the request may proceed. */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const result = await checkAdminAuth(request.headers);
  return result === "ok" ? null : authFailureResponse(result);
}
