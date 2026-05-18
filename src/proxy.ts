import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  const publicRoutes = ["/signin", "/signup"];
  const isPublic = publicRoutes.includes(pathname);
  // const isSignin = pathname === "/signin";
  const isApi = pathname.startsWith("/api");
  const isAdmin = pathname.startsWith("/admin");

  // ✅ 1. ไม่ยุ่ง API
  if (isApi) return NextResponse.next();

  // ✅ 2. ไม่ยุ่ง static files (สำคัญมาก)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // ❌ 3. ไม่มี token → ไป signin
  if (!token) {
    if (!isPublic) {
      return NextResponse.redirect(new URL("/signin", req.url));
    }
    return NextResponse.next();
  }

  // ✅ 4. มี token → decode
  let decoded: any;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    decoded = null;
  }

  // ❌ token พัง → ลบ cookie + ไป signin
  if (!decoded) {
    const res = NextResponse.redirect(new URL("/signin", req.url));
    res.cookies.delete("token");
    return res;
  }

  // 🔒 5. กัน admin route
  if (isAdmin && decoded.role !== "admin") {
    return NextResponse.redirect(new URL("/user/dashboard", req.url));
  }

  // 🔒 6. login แล้ว → ห้ามเข้า signin
  if (isPublic) {
    if (decoded.role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/user/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

// ✅ 7. matcher (สำคัญมาก)
export const config = {
  matcher: ["/((?!api|_next|images|favicon.ico).*)"],
};
