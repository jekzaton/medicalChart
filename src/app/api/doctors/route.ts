import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

const doctorSchema = z.object({
  doctorId: z.string().trim().min(1, "กรอกรหัสแพทย์"),
  name: z.string().trim().min(1, "กรอกชื่อ-สกุล"),
  license: z.string().trim().min(1, "กรอกใบประกอบวิชาชีพ"),
  cid: z
    .string()
    .trim()
    .length(13, "เลขบัตรประชาชนต้อง 13 หลัก")
    .regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  active: z.coerce.boolean().default(true),
  line_active: z.coerce.boolean().default(true),
});

const getPrismaUniqueMessage = (target?: unknown) => {
  const fields = Array.isArray(target)
    ? target.map(String)
    : [String(target || "")];

  if (fields.includes("doctorId")) return "รหัสแพทย์นี้มีในระบบแล้ว";
  if (fields.includes("cid")) return "เลขบัตรประชาชนนี้มีในระบบแล้ว";
  if (fields.includes("license")) return "เลขใบประกอบวิชาชีพนี้มีในระบบแล้ว";

  return "ข้อมูลซ้ำในระบบ";
};

// POST /api/doctors
export const POST = withAdmin(async (req: Request) => {
  try {
    const body = await req.json();
    const result = doctorSchema.safeParse(body);

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

    const duplicateDoctor = await prisma.doctor.findFirst({
      where: {
        OR: [
          { doctorId: data.doctorId },
          { cid: data.cid },
          { license: data.license },
        ],
      },
      select: {
        doctorId: true,
        cid: true,
        license: true,
      },
    });

    if (duplicateDoctor) {
      let message = "ข้อมูลแพทย์มีในระบบแล้ว";

      if (duplicateDoctor.doctorId === data.doctorId) {
        message = "รหัสแพทย์นี้มีในระบบแล้ว";
      } else if (duplicateDoctor.cid === data.cid) {
        message = "เลขบัตรประชาชนนี้มีในระบบแล้ว";
      } else if (duplicateDoctor.license === data.license) {
        message = "เลขใบประกอบวิชาชีพนี้มีในระบบแล้ว";
      }

      return NextResponse.json({ message }, { status: 400 });
    }

    const doctor = await prisma.doctor.create({
      data: {
        doctorId: data.doctorId,
        name: data.name,
        cid: data.cid,
        license: data.license,
        active: data.active,
        line_active: data.line_active,
      },
    });

    return NextResponse.json(
      {
        message: "สร้างข้อมูลแพทย์สำเร็จ",
        doctor,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST ERROR Doctor:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message: getPrismaUniqueMessage(error.meta?.target),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "server error doctor" },
      { status: 500 },
    );
  }
});

// GET /api/doctors?page=1&limit=10&search=...
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

    const where: Prisma.doctorWhereInput = search
      ? {
          OR: [
            { cid: { contains: search } },
            { name: { contains: search } },
            { doctorId: { contains: search } },
            { license: { contains: search } },
          ],
        }
      : {};

    const [total, doctors] = await prisma.$transaction([
      prisma.doctor.count({ where }),
      prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      data: doctors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("GET ERROR Doctor:", error);

    return NextResponse.json(
      { message: "Failed to fetch doctors" },
      { status: 500 },
    );
  }
});
