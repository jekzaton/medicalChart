import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

const schema = z.object({
  hn: z.string().trim().min(1, "กรุณากรอก HN"),

  an: z.string().trim().min(1, "กรุณากรอก AN"),

  fullname: z.string().trim().min(1, "กรุณากรอกชื่อ - สกุล"),

  regdate: z.coerce.date({
    error: "วันที่ Admit ไม่ถูกต้อง",
  }),

  dchdate: z.coerce.date({
    error: "วันที่จำหน่ายไม่ถูกต้อง",
  }),

  doctor_code: z.string().trim().min(1, "กรุณาเลือกรหัสแพทย์"),

  ward_name: z.string().trim().min(1, "กรุณากรอกชื่อวอร์ด"),

  status_chart: z.enum(["SUCCESS", "WARNING"]).optional().default("WARNING"),
});

const getIdFromRequest = (req: Request) => {
  const { pathname } = new URL(req.url);
  const id = pathname.split("/").filter(Boolean).pop();

  return Number(id);
};

// ============================================================
// GET
// ============================================================

export const GET = withAdmin(async (req: Request) => {
  try {
    const id = getIdFromRequest(req);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "รหัส Medical Chart ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const chart = await prisma.medical_chart.findUnique({
      where: { id },
    });

    if (!chart) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่พบข้อมูล Medical Chart",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: chart,
    });
  } catch (error) {
    console.error("GET Medical Chart Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "ไม่สามารถโหลดข้อมูล Medical Chart ได้",
      },
      { status: 500 },
    );
  }
});

// ============================================================
// PUT
// ============================================================

export const PUT = withAdmin(async (req: Request) => {
  try {
    const id = getIdFromRequest(req);

    // ============================
    // Validate ID
    // ============================

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "รหัส Medical Chart ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    // ============================
    // Read body
    // ============================

    const body = await req.json();

    console.log("====================================");
    console.log("UPDATE MEDICAL CHART");
    console.log("ID:", id);
    console.log("BODY:", body);
    console.log("====================================");

    // ============================
    // Normalize
    // ============================

    const normalizedBody = {
      ...body,

      hn:
        body.hn !== undefined && body.hn !== null ? String(body.hn).trim() : "",

      an:
        body.an !== undefined && body.an !== null ? String(body.an).trim() : "",

      fullname:
        body.fullname !== undefined && body.fullname !== null
          ? String(body.fullname).trim()
          : "",

      doctor_code:
        body.doctor_code !== undefined && body.doctor_code !== null
          ? String(body.doctor_code).trim()
          : "",

      ward_name:
        body.ward_name !== undefined && body.ward_name !== null
          ? String(body.ward_name).trim()
          : "",

      status_chart:
        String(body.status_chart ?? "WARNING").toUpperCase() === "SUCCESS"
          ? "SUCCESS"
          : "WARNING",
    };

    // ============================
    // Zod Validate
    // ============================

    const parsed = schema.safeParse(normalizedBody);

    if (!parsed.success) {
      const errors = parsed.error.flatten();

      console.error("VALIDATION ERROR:", errors);

      const firstError =
        Object.values(errors.fieldErrors)
          .flat()
          .find((message) => Boolean(message)) ?? "ข้อมูลไม่ถูกต้อง";

      return NextResponse.json(
        {
          success: false,
          message: firstError,
          errors: errors.fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // ============================
    // Check existing
    // ============================

    const existingChart = await prisma.medical_chart.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        hn: true,
        an: true,
      },
    });

    if (!existingChart) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่พบข้อมูล Medical Chart",
        },
        { status: 404 },
      );
    }
    const duplicatedAn = await prisma.medical_chart.findFirst({
      where: {
        an: data.an,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicatedAn) {
      return NextResponse.json(
        {
          success: false,
          message: `AN ${data.an} ถูกใช้งานในเวชระเบียนรายการอื่นแล้ว`,
          field: "an",
        },
        { status: 400 },
      );
    }

    // ============================
    // Calculate num_date
    // ============================

    const today = new Date();

    const diffMilliseconds = today.getTime() - data.dchdate.getTime();

    const diffDays = Math.floor(diffMilliseconds / (1000 * 60 * 60 * 24));

    const numDate = diffDays >= 7 ? Math.floor((diffDays - 7) / 8) + 1 : 0;

    const updatedChart = await prisma.medical_chart.update({
      where: {
        id,
      },
      data: {
        hn: data.hn,
        an: data.an,
        fullname: data.fullname,
        regdate: data.regdate,
        dchdate: data.dchdate,
        doctor_code: data.doctor_code,
        ward_name: data.ward_name,
        num_date: numDate,
        status_chart: data.status_chart,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "แก้ไขข้อมูลเวชระเบียนเรียบร้อยแล้ว",
      data: updatedChart,
    });
  } catch (error) {
    console.error("PUT Medical Chart Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "เกิดข้อผิดพลาดระหว่างแก้ไขข้อมูลเวชระเบียน",
      },
      { status: 500 },
    );
  }
});

// ============================================================
// DELETE
// ============================================================

export const DELETE = withAdmin(async (req: Request) => {
  try {
    const id = getIdFromRequest(req);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "รหัส Medical Chart ไม่ถูกต้อง",
        },
        { status: 400 },
      );
    }

    const existing = await prisma.medical_chart.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "ไม่พบข้อมูล Medical Chart",
        },
        { status: 404 },
      );
    }

    await prisma.medical_chart.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "ลบข้อมูล Medical Chart เรียบร้อยแล้ว",
    });
  } catch (error) {
    console.error("DELETE Medical Chart Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "ไม่สามารถลบข้อมูล Medical Chart ได้",
      },
      { status: 500 },
    );
  }
});
