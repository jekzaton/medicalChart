import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mysecret";

export type TokenPayload = {
  id: number;
  username: string;
  role: "admin" | "user";
};

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
