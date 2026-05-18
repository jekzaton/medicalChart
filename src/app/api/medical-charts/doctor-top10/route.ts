import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

const startOfDay = (value: string) => {
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (value: string) => {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

// GET /api/medical-charts/doctor-top10?dchdateFrom=2026-05-01&dchdateTo=2026-05-31&limit=10
export const GET = withAdmin(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const dchdateFrom = (searchParams.get("dchdateFrom") || "").trim();
    const dchdateTo = (searchParams.get("dchdateTo") || "").trim();

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      50,
    );

    const fromDate = dchdateFrom ? startOfDay(dchdateFrom) : null;
    const toDate = dchdateTo ? endOfDay(dchdateTo) : null;

    if (dchdateFrom && !fromDate) {
      return NextResponse.json(
        { message: "วันที่เริ่มต้น Discharge ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (dchdateTo && !toDate) {
      return NextResponse.json(
        { message: "วันที่สิ้นสุด Discharge ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { message: "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด" },
        { status: 400 },
      );
    }

    const dateWhere: Prisma.medical_chartWhereInput =
      fromDate || toDate
        ? {
            dchdate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {};

    /**
     * ✅ จุดสำคัญ:
     * จัดอันดับจากจำนวน status_chart = SUCCESS มากที่สุด
     */
    const groupedSuccess = await prisma.medical_chart.groupBy({
      by: ["doctor_code"],
      where: {
        ...dateWhere,
        status_chart: "SUCCESS",
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          doctor_code: "desc",
        },
      },
      take: limit,
    });

    const doctorCodes = groupedSuccess
      .map((item) => item.doctor_code)
      .filter(Boolean);

    if (doctorCodes.length === 0) {
      return NextResponse.json({
        totalCharts: 0,
        totalDoctors: 0,
        totalSuccessCharts: 0,
        items: [],
        dchdateFrom: dchdateFrom || null,
        dchdateTo: dchdateTo || null,
      });
    }

    const doctors = await prisma.doctor.findMany({
      where: {
        doctorId: {
          in: doctorCodes,
        },
      },
      select: {
        doctorId: true,
        name: true,
        license: true,
      },
    });

    const doctorMap = new Map(
      doctors.map((doctor) => [doctor.doctorId, doctor]),
    );

    /**
     * ดึงจำนวน success / warning / total ของแพทย์ Top 10 ชุดนี้
     */
    const statusRows = await prisma.medical_chart.groupBy({
      by: ["doctor_code", "status_chart"],
      where: {
        ...dateWhere,
        doctor_code: {
          in: doctorCodes,
        },
      },
      _count: {
        _all: true,
      },
    });

    const statusMap = new Map<
      string,
      {
        total: number;
        success: number;
        warning: number;
      }
    >();

    for (const row of statusRows) {
      const current = statusMap.get(row.doctor_code) || {
        total: 0,
        success: 0,
        warning: 0,
      };

      current.total += row._count._all;

      if (row.status_chart === "SUCCESS") {
        current.success = row._count._all;
      }

      if (row.status_chart === "WARNING") {
        current.warning = row._count._all;
      }

      statusMap.set(row.doctor_code, current);
    }

    /**
     * ✅ เรียงตาม groupedSuccess อยู่แล้ว
     * อันดับ 1 = แพทย์ที่ SUCCESS เยอะที่สุด
     */
    const items = groupedSuccess.map((item, index) => {
      const doctor = doctorMap.get(item.doctor_code);

      const status = statusMap.get(item.doctor_code) || {
        total: 0,
        success: item._count._all,
        warning: 0,
      };

      return {
        rank: index + 1,
        doctor_code: item.doctor_code,
        doctor_name: doctor?.name || null,
        doctor_license: doctor?.license || null,
        total: status.total,
        success: status.success,
        warning: status.warning,
      };
    });

    const totalCharts = items.reduce((sum, item) => sum + item.total, 0);
    const totalSuccessCharts = items.reduce(
      (sum, item) => sum + item.success,
      0,
    );

    return NextResponse.json({
      totalCharts,
      totalDoctors: items.length,
      totalSuccessCharts,
      items,
      dchdateFrom: dchdateFrom || null,
      dchdateTo: dchdateTo || null,
    });
  } catch (error) {
    console.error("GET DOCTOR TOP10 ERROR:", error);

    return NextResponse.json(
      { message: "โหลดข้อมูล Top 10 แพทย์ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});
