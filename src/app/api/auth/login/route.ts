export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { signToken } from "@/lib/jwt";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // ✅ เช็ค active ก่อน
    if (!user.active) {
      return NextResponse.json(
        { message: "บัญชีถูกปิดการใช้งาน" },
        { status: 403 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        { message: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 },
      );
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 },
    );

    const isProduction = process.env.NODE_ENV === "production";

    const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://");

    res.cookies.set("token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isProduction && isHttps,
      // secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });

    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Pragma", "no-cache");

    return res;
  } catch (error) {
    console.log("LOGIN ERROR:", error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}
