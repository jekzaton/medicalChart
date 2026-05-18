import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  try {
    // 🔥 ดึง token จาก header หรือ cookie
    const authHeader = req.headers.get("authorization");
    const token =
      authHeader?.replace("Bearer ", "") || req.cookies.get("token")?.value;

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 🔥 verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return Response.json({ message: "Invalid token" }, { status: 401 });
    }

    // 🔥 query user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        prefix: true,
        firstname: true,
        lastname: true,
        role: true,
        active: true,
      },
    });

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Server error" }, { status: 500 });
  }
}
