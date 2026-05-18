import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

const schema = z.object({
  hn: z.string().min(1, "กรุณากรอก HN"),
  an: z.string().min(1, "กรุณากรอก AN"),
  fullname: z.string().min(1, "กรุณากรอกชื่อ - สกุล"),
  regdate: z.coerce.date({ message: "วันที่ Admit ไม่ถูกต้อง" }),
  dchdate: z.coerce.date({ message: "วันที่ Discharge ไม่ถูกต้อง" }),
  doctor_code: z.string().min(1, "กรุณาเลือกรหัสแพทย์"),
  ward_name: z.string().min(1, "กรุณากรอกชื่อวอร์ด"),
  num_date: z.coerce.number().int().min(0).optional().default(0),
  status_chart: z
    .enum(["SUCCESS", "WARNING", "success", "warning"])
    .optional()
    .default("WARNING"),
});

const getIdFromRequest = (req: Request) => {
  const { pathname } = new URL(req.url);
  const id = pathname.split("/").filter(Boolean).pop();
  return Number(id);
};

const normalizeStatus = (status: string) => {
  return status.toLowerCase() === "success" ? "SUCCESS" : "WARNING";
};

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const calculateDelayDays = (dchdate: Date) => {
  const dischargeDate = startOfDay(dchdate);
  const today = startOfDay(new Date());

  const dueDate = new Date(dischargeDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const diffDays = Math.floor(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(diffDays, 0);
};

// GET /api/medical-charts/[id]
export const GET = withAdmin(async (req: Request) => {
  try {
    const id = getIdFromRequest(req);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: "รหัส Medical Chart ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const chart = await prisma.medical_chart.findUnique({
      where: { id },
    });

    if (!chart) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูล Medical Chart" },
        { status: 404 },
      );
    }

    const doctor = await prisma.doctor.findFirst({
      where: {
        doctorId: chart.doctor_code,
      },
      select: {
        id: true,
        doctorId: true,
        name: true,
        cid: true,
        license: true,
        active: true,
      },
    });

    return NextResponse.json({
      data: {
        ...chart,
        doctor_name: doctor?.name || null,
        doctor,
      },
    });
  } catch (error) {
    console.error("GET MEDICAL CHART BY ID ERROR:", error);

    return NextResponse.json(
      { message: "โหลดข้อมูล Medical Chart ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});

// PUT /api/medical-charts/[id]
export const PUT = withAdmin(async (req: Request) => {
  try {
    const id = getIdFromRequest(req);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: "รหัส Medical Chart ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    if (data.regdate > data.dchdate) {
      return NextResponse.json(
        { message: "วัน Admit ต้องไม่มากกว่าวัน Discharge" },
        { status: 400 },
      );
    }

    const existingChart = await prisma.medical_chart.findUnique({
      where: { id },
      select: {
        id: true,
        hn: true,
      },
    });

    if (!existingChart) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูล Medical Chart" },
        { status: 404 },
      );
    }

    // hn เป็น @unique ตาม schema จึงต้องกันซ้ำกับ record อื่น
    const duplicatedHn = await prisma.medical_chart.findUnique({
      where: {
        hn: data.hn,
      },
      select: {
        id: true,
      },
    });

    if (duplicatedHn && duplicatedHn.id !== id) {
      return NextResponse.json(
        {
          message: "HN นี้มีอยู่ในระบบแล้ว",
          field: "hn",
        },
        { status: 400 },
      );
    }

    const doctor = await prisma.doctor.findFirst({
      where: {
        doctorId: data.doctor_code,
      },
      select: {
        doctorId: true,
      },
    });

    if (!doctor) {
      return NextResponse.json(
        {
          message: "ไม่พบรหัสแพทย์นี้ในระบบ",
          field: "doctor_code",
        },
        { status: 400 },
      );
    }

    const updatedChart = await prisma.medical_chart.update({
      where: { id },
      data: {
        hn: data.hn,
        an: data.an,
        fullname: data.fullname,
        regdate: data.regdate,
        dchdate: data.dchdate,
        doctor_code: data.doctor_code,
        ward_name: data.ward_name,
        num_date:
          body.num_date === undefined || body.num_date === null
            ? calculateDelayDays(data.dchdate)
            : data.num_date,
        status_chart: normalizeStatus(data.status_chart),
      },
    });

    return NextResponse.json({
      message: "บันทึกข้อมูลสำเร็จ",
      data: updatedChart,
    });
  } catch (error: any) {
    console.error("UPDATE MEDICAL CHART ERROR:", error);

    if (error?.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target[0]
        : error.meta?.target;

      return NextResponse.json(
        {
          message:
            target === "hn" ? "HN นี้มีอยู่ในระบบแล้ว" : "ข้อมูลซ้ำในระบบ",
          field: target || "unique",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "บันทึกข้อมูล Medical Chart ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});

// DELETE /api/medical-charts/[id]
export const DELETE = withAdmin(async (req: Request) => {
  try {
    const id = getIdFromRequest(req);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { message: "รหัส Medical Chart ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const existingChart = await prisma.medical_chart.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingChart) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูล Medical Chart" },
        { status: 404 },
      );
    }

    await prisma.medical_chart.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "ลบข้อมูลสำเร็จ",
    });
  } catch (error) {
    console.error("DELETE MEDICAL CHART ERROR:", error);

    return NextResponse.json(
      { message: "ลบข้อมูล Medical Chart ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});
