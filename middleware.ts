import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/welcome", "/login", "/signup"]);

/**
 * Fast routing on whether a session cookie exists. The cookie itself is
 * verified by every API call; a stale one is cleared there and the app
 * sends the visitor back to sign in.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has("tna_session");
  if (!signedIn && !PUBLIC.has(pathname)) return redirect(req, "/welcome");
  if (signedIn && (pathname === "/welcome" || pathname === "/login")) return redirect(req, "/");
  return NextResponse.next();
}

function redirect(req: NextRequest, to: string) {
  const url = req.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
