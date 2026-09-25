import { NextResponse, type NextRequest } from "next/server";
import { authFailureResponse, checkAdminAuth } from "@/lib/auth";

export const config = {
  matcher: ["/admin", "/api/clips/:path*"],
};

// Guards the admin page and every non-read request to the clips API:
// IP allowlist (ADMIN_ALLOWED_IPS) when set, otherwise HTTP Basic auth (ADMIN_PASSWORD).
export default async function proxy(request: NextRequest) {
  const isAdminPage = request.nextUrl.pathname === "/admin";
  const isWrite = request.method !== "GET" && request.method !== "HEAD";
  if (!isAdminPage && !isWrite) return NextResponse.next();

  const result = await checkAdminAuth(request.headers);
  if (result === "ok") return NextResponse.next();
  return authFailureResponse(result);
}
