// src/lib/auth.ts
import { verifyToken, type TokenPayload } from "./jwt";

export function getUserFromRequest(req: Request): TokenPayload | null {
  const cookieHeader = req.headers.get("cookie");

  // console.log("Cookie header:", cookieHeader);

  if (!cookieHeader) {
    console.log("ไม่พบ Cookie header");
    return null;
  }

  const token = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("token="))
    ?.slice("token=".length);

  if (!token) {
    console.log("ไม่พบ cookie ชื่อ token");
    return null;
  }

  const decodedToken = decodeURIComponent(token);
  const user = verifyToken(decodedToken);

  if (!user) {
    console.log("Token ไม่ถูกต้องหรือหมดอายุ");
    return null;
  }

  // console.log("Verified user:", user);

  return user;
}
