import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const schema = z
  .object({
    prefix: z.string().nullable().optional(),
    firstname: z.string().min(1, "กรุณากรอกชื่อ"),
    lastname: z.string().min(1, "กรุณากรอกนามสกุล"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const password = data.password?.trim() || "";
    const confirmPassword = data.confirmPassword?.trim() || "";

    if (!password && !confirmPassword) return;

    if (password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "รหัสผ่านอย่างน้อย 6 ตัวอักษร",
      });
    }

    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "ยืนยันรหัสผ่านไม่ตรงกัน",
      });
    }
  });

type TokenPayload = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  username?: string;
  role?: string;
};

const userSelect = {
  id: true,
  username: true,
  cid: true,
  prefix: true,
  firstname: true,
  lastname: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

const getTokenFromRequest = (req: Request) => {
  const cookie = req.headers.get("cookie") || "";

  const match = cookie.match(
    /(?:^|;\s*)(token|auth_token|access_token)=([^;]+)/,
  );

  if (match?.[2]) {
    return decodeURIComponent(match[2]);
  }

  const authorization = req.headers.get("authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  return "";
};

const getUserIdFromPayload = (payload: TokenPayload) => {
  const rawId = payload.id ?? payload.userId ?? payload.sub;
  const id = Number(rawId);

  return Number.isFinite(id) && id > 0 ? id : null;
};

const getLoginUser = async (req: Request) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT_SECRET");
  }

  const token = getTokenFromRequest(req);

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const userId = getUserIdFromPayload(payload);

    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!user || !user.active) return null;

    return user;
  } catch {
    return null;
  }
};

// PUT /api/auth/profile
// ต้อง login ก่อน และแก้ไขได้เฉพาะ profile ของตัวเองเท่านั้น
export async function PUT(req: Request) {
  try {
    const loginUser = await getLoginUser(req);

    if (!loginUser) {
      return NextResponse.json(
        { message: "กรุณาเข้าสู่ระบบก่อน" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = result.data;
    const updateData: Prisma.userUpdateInput = {
      prefix: data.prefix || "",
      firstname: data.firstname.trim(),
      lastname: data.lastname.trim(),
    };

    if (data.password?.trim()) {
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: loginUser.id,
      },
      data: updateData,
      select: userSelect,
    });

    return NextResponse.json({
      message: "อัปเดตโปรไฟล์สำเร็จ",
      user: updatedUser,
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    return NextResponse.json(
      { message: "อัปเดตโปรไฟล์ไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
