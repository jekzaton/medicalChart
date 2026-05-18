import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcrypt";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

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

const schema = z.object({
  username: z.string().min(3, "username อย่างน้อย 3 ตัว"),
  password: z.string().min(6, "password อย่างน้อย 6 ตัว"),
  cid: z
    .string()
    .length(13, "เลขบัตรประชาชนต้อง 13 หลัก")
    .regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  prefix: z.string().nullable().optional(),
  firstname: z.string().min(1, "กรอกชื่อ"),
  lastname: z.string().min(1, "กรอกนามสกุล"),
  role: z.enum(["user", "admin"]),
  active: z.coerce.boolean(),
});

const getUniqueField = (target: unknown) => {
  const text = Array.isArray(target)
    ? target.join("_").toLowerCase()
    : String(target || "").toLowerCase();

  if (text.includes("username")) return "username";
  if (text.includes("cid")) return "cid";

  return "unique";
};

const getUniqueMessage = (field: string) => {
  if (field === "username") return "username นี้ถูกใช้แล้ว";
  if (field === "cid") return "เลขบัตรประชาชนนี้ถูกใช้แล้ว";

  return "ข้อมูลนี้มีอยู่ในระบบแล้ว";
};

// POST /api/users
export const POST = withAdmin(async (req: Request) => {
  try {
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

    const existingUsername = await prisma.user.findUnique({
      where: {
        username: data.username,
      },
      select: {
        id: true,
      },
    });

    if (existingUsername) {
      return NextResponse.json(
        {
          message: "username นี้ถูกใช้แล้ว",
          field: "username",
        },
        { status: 409 },
      );
    }

    const existingCid = await prisma.user.findUnique({
      where: {
        cid: data.cid,
      },
      select: {
        id: true,
      },
    });

    if (existingCid) {
      return NextResponse.json(
        {
          message: "เลขบัตรประชาชนนี้ถูกใช้แล้ว",
          field: "cid",
        },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        cid: data.cid,
        prefix: data.prefix || "",
        firstname: data.firstname,
        lastname: data.lastname,
        role: data.role,
        active: data.active,
      },
      select: userSelect,
    });

    return NextResponse.json(
      {
        message: "สร้างผู้ใช้สำเร็จ",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const field = getUniqueField(error.meta?.target);

      return NextResponse.json(
        {
          message: getUniqueMessage(field),
          field,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "สร้างผู้ใช้ไม่สำเร็จ",
      },
      { status: 500 },
    );
  }
});

// GET /api/users
export const GET = withAdmin(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );
    const search = (searchParams.get("search") || "").trim();

    const skip = (page - 1) * limit;

    const where: Prisma.userWhereInput = search
      ? {
          OR: [
            { username: { contains: search } },
            { cid: { contains: search } },
            { firstname: { contains: search } },
            { lastname: { contains: search } },
          ],
        }
      : {};

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
        select: userSelect,
      }),
    ]);

    return NextResponse.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("GET ERROR:", error);

    return NextResponse.json(
      {
        message: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ",
      },
      { status: 500 },
    );
  }
});
