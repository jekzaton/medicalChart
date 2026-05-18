// lib/auth.ts

import { verifyToken } from "./jwt";

export function getUserFromRequest(req: Request) {
  const token = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
