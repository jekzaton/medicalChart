// src/lib/jwt.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error("ไม่พบ JWT_SECRET ใน environment variables");
}

export type TokenPayload = {
  id: number;
  username: string;
  role: "admin" | "user";
};

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (
      typeof payload === "string" ||
      typeof payload.id !== "number" ||
      typeof payload.username !== "string" ||
      !["admin", "user"].includes(payload.role)
    ) {
      return null;
    }

    return payload as TokenPayload;
  } catch (error) {
    console.error("verifyToken error:", error);
    return null;
  }
}
