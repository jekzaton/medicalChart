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

const normalizeStatus = (value: unknown) => String(value || "").toUpperCase();

const getCountAll = (value: unknown) => {
  if (!value || typeof value !== "object") return 0;

  const count = value as {
    _count?: true | { _all?: number | null; doctor_code?: number | null };
  };

  if (!count._count || count._count === true) return 0;
  return Number(count._count._all ?? count._count.doctor_code ?? 0);
};

const buildDateFilter = ({
  fromDate,
  toDate,
}: {
  fromDate: Date | null;
  toDate: Date | null;
}): Prisma.medical_chartWhereInput => {
  if (!fromDate && !toDate) return {};

  return {
    dchdate: {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    },
  };
};

const compactAnd = (filters: Prisma.medical_chartWhereInput[]) => {
  const validFilters = filters.filter(
    (filter) => Object.keys(filter).length > 0,
  );
  return validFilters.length > 0 ? { AND: validFilters } : {};
};

// GET /api/medical-charts/doctor-summary?page=1&limit=10&search=...&dchdateFrom=2026-05-01&dchdateTo=2026-05-31
export const GET = withAdmin(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );
    const search = (searchParams.get("search") || "").trim();
    const dchdateFrom = (searchParams.get("dchdateFrom") || "").trim();
    const dchdateTo = (searchParams.get("dchdateTo") || "").trim();

    const skip = (page - 1) * limit;

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

    const doctorWhere: Prisma.doctorWhereInput = search
      ? {
          OR: [
            { doctorId: { contains: search } },
            { name: { contains: search } },
            { license: { contains: search } },
            { cid: { contains: search } },
          ],
        }
      : {};

    const dchdateFilter = buildDateFilter({ fromDate, toDate });

    // ดึงแพทย์ที่ตรงเงื่อนไขทั้งหมดก่อน เพื่อให้เรียงตามจำนวนชาร์ตจริงได้
    // ถ้า paginate ก่อน แล้วค่อยนับ จะเรียงได้แค่ภายในหน้านั้น ซึ่งไม่ตรงความต้องการ
    const doctors = await prisma.doctor.findMany({
      where: doctorWhere,
      orderBy: [{ name: "asc" }, { doctorId: "asc" }],
      select: {
        id: true,
        doctorId: true,
        name: true,
        cid: true,
        license: true,
        active: true,
        line_active: true,
      },
    });

    const doctorCodes = doctors
      .map((doctor) => doctor.doctorId)
      .filter((code): code is string => Boolean(code));

    const doctorCodeFilter: Prisma.medical_chartWhereInput =
      doctorCodes.length > 0
        ? {
            doctor_code: {
              in: doctorCodes,
            },
          }
        : {
            doctor_code: {
              in: ["__NO_DOCTOR__"],
            },
          };

    const medicalWhere: Prisma.medical_chartWhereInput = compactAnd([
      dchdateFilter,
      doctorCodeFilter,
    ]);

    const [totalRows, statusRows, totalCharts, totalSuccess, totalWarning] =
      await prisma.$transaction([
        prisma.medical_chart.groupBy({
          by: ["doctor_code"],
          where: medicalWhere,
          _count: {
            _all: true,
          },
          orderBy: {
            doctor_code: "asc",
          },
        }),
        prisma.medical_chart.groupBy({
          by: ["doctor_code", "status_chart"],
          where: medicalWhere,
          _count: {
            _all: true,
          },
          orderBy: [{ doctor_code: "asc" }, { status_chart: "asc" }],
        }),
        prisma.medical_chart.count({ where: medicalWhere }),
        prisma.medical_chart.count({
          where: compactAnd([medicalWhere, { status_chart: "SUCCESS" }]),
        }),
        prisma.medical_chart.count({
          where: compactAnd([medicalWhere, { status_chart: "WARNING" }]),
        }),
      ]);

    const totalMap = new Map<string, number>();

    for (const row of totalRows) {
      if (!row.doctor_code) continue;
      totalMap.set(row.doctor_code, getCountAll(row));
    }

    const statusMap = new Map<string, { success: number; warning: number }>();

    for (const row of statusRows) {
      if (!row.doctor_code) continue;

      const current = statusMap.get(row.doctor_code) || {
        success: 0,
        warning: 0,
      };

      const count = getCountAll(row);
      const status = normalizeStatus(row.status_chart);

      if (status === "SUCCESS") current.success += count;
      if (status === "WARNING") current.warning += count;

      statusMap.set(row.doctor_code, current);
    }

    const sortedItems = doctors
      .map((doctor) => {
        const status = statusMap.get(doctor.doctorId) || {
          success: 0,
          warning: 0,
        };

        return {
          id: doctor.id,
          doctor_code: doctor.doctorId,
          doctor_name: doctor.name || null,
          doctor_license: doctor.license || null,
          doctor_cid: doctor.cid || null,
          doctor_active: doctor.active ?? null,
          doctor_line_active: doctor.line_active ?? null,
          total: totalMap.get(doctor.doctorId) || 0,
          success: status.success,
          warning: status.warning,
        };
      })
      // แสดงและนับเฉพาะแพทย์ที่มีชาร์ตตามช่วงวันที่/เงื่อนไขที่ค้นหาเท่านั้น
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        // เรียงตามจำนวนชาร์ตทั้งหมดมากไปน้อย
        if (b.total !== a.total) return b.total - a.total;

        // ถ้าจำนวนชาร์ตเท่ากัน ให้เรียง success มากไปน้อย
        if (b.success !== a.success) return b.success - a.success;

        // ถ้ายังเท่ากัน ให้ warning มากไปน้อย
        if (b.warning !== a.warning) return b.warning - a.warning;

        // สุดท้ายเรียงชื่อแพทย์ให้นิ่ง
        return String(a.doctor_name || a.doctor_code).localeCompare(
          String(b.doctor_name || b.doctor_code),
          "th",
        );
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    // จำนวนแพทย์ทั้งหมดตรงนี้คือจำนวนแพทย์ที่มีชาร์ตจริงตามช่วงวันที่/เงื่อนไขค้นหา
    const totalDoctors = sortedItems.length;
    const totalPages = Math.max(Math.ceil(totalDoctors / limit), 1);
    const pagedItems = sortedItems.slice(skip, skip + limit);

    return NextResponse.json({
      data: pagedItems,
      items: pagedItems,
      totalCharts,
      totalDoctors,
      totalSuccessCharts: totalSuccess,
      totalWarningCharts: totalWarning,
      summary: {
        totalDoctors,
        totalCharts,
        totalSuccess,
        totalWarning,
      },
      meta: {
        total: totalDoctors,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        sortBy: "total",
        sortOrder: "desc",
        dchdateFrom: dchdateFrom || null,
        dchdateTo: dchdateTo || null,
        search: search || null,
      },
    });
  } catch (error) {
    console.error("GET DOCTOR CHART SUMMARY ERROR:", error);

    return NextResponse.json(
      { message: "โหลดข้อมูลสรุปชาร์ตแพทย์ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});
