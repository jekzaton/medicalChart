import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

const doctorSchema = z.object({
  doctorId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  license: z.string().trim().min(1),
  cid: z.string().trim().length(13).regex(/^\d+$/),
  active: z.coerce.boolean().optional(),
  line_active: z.coerce.boolean().optional(),
});

// GET /api/doctors/[id]
export const GET = withAdmin(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const idParam = url.pathname.split("/").pop();
    const id = Number(idParam);

    if (!id) return NextResponse.json({ message: "Missing doctor id" }, { status: 400 });

    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return NextResponse.json({ message: "Doctor not found" }, { status: 404 });

    return NextResponse.json({ doctor }, { status: 200 });
  } catch (error) {
    console.error("GET ERROR Doctor:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
});

// PATCH /api/doctors/[id]
export const PATCH = withAdmin(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const idParam = url.pathname.split("/").pop();
    const id = Number(idParam);

    if (!id) return NextResponse.json({ message: "Missing doctor id" }, { status: 400 });

    const body = await req.json();
    const result = doctorSchema.partial().safeParse(body);

    if (!result.success) {
      return NextResponse.json({ message: "Invalid data", errors: result.error.flatten() }, { status: 400 });
    }

    const data = result.data;

    // ถ้า active ปิด ต้องปิด line_active ด้วย
    if (data.active === false) data.line_active = false;

    const doctor = await prisma.doctor.update({ where: { id }, data });

    return NextResponse.json({ message: "อัปเดตแพทย์สำเร็จ", doctor }, { status: 200 });
  } catch (error) {
    console.error("PATCH ERROR Doctor:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "ข้อมูลซ้ำในระบบ" }, { status: 400 });
    }

    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
});