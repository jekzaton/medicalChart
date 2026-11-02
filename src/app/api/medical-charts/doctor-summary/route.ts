"use server";

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
  const validFilters = filters.filter((f) => Object.keys(f).length > 0);
  return validFilters.length > 0 ? { AND: validFilters } : {};
};

export const GET = withAdmin(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 10), 1),
      100,
    );
    const searchDoctor = (searchParams.get("searchDoctor") || "").trim();
    const dchdateFrom = (searchParams.get("dchdateFrom") || "").trim();
    const dchdateTo = (searchParams.get("dchdateTo") || "").trim();
    const skip = (page - 1) * limit;

    const fromDate = dchdateFrom ? startOfDay(dchdateFrom) : null;
    const toDate = dchdateTo ? endOfDay(dchdateTo) : null;

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { message: "วันที่เริ่มต้นต้องไม่มากกว่าวันสิ้นสุด" },
        { status: 400 },
      );
    }

    const doctorWhere: Prisma.doctorWhereInput = searchDoctor
      ? {
          OR: [
            { doctorId: searchDoctor }, // exact match
            { license: searchDoctor }, // exact match
            { name: { contains: searchDoctor } }, // partial match
          ],
        }
      : {};

    const dchdateFilter = buildDateFilter({ fromDate, toDate });

    // ดึงแพทย์ที่ตรงเงื่อนไข
    const doctors = await prisma.doctor.findMany({
      where: doctorWhere,
      orderBy: [{ name: "asc" }, { doctorId: "asc" }],
      select: {
        id: true,
        doctorId: true,
        name: true,
        license: true,
        cid: true,
        active: true,
        line_active: true,
      },
    });

    const doctorCodes = doctors.map((d) => d.doctorId).filter(Boolean);

    const doctorCodeFilter: Prisma.medical_chartWhereInput =
      doctorCodes.length > 0
        ? { doctor_code: { in: doctorCodes } }
        : { doctor_code: { in: ["__NO_DOCTOR__"] } };

    const medicalWhere = compactAnd([dchdateFilter, doctorCodeFilter]);

    // Fetch grouped data
    const [totalRows, statusRows, totalCharts, totalSuccess, totalWarning] =
      await prisma.$transaction([
        prisma.medical_chart.groupBy({
          by: ["doctor_code"],
          where: medicalWhere,
          _count: { _all: true },
          orderBy: { doctor_code: "asc" },
        }),
        prisma.medical_chart.groupBy({
          by: ["doctor_code", "status_chart"],
          where: medicalWhere,
          _count: { _all: true },
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
    totalRows.forEach(
      (row) =>
        row.doctor_code && totalMap.set(row.doctor_code, getCountAll(row)),
    );

    const statusMap = new Map<string, { success: number; warning: number }>();
    statusRows.forEach((row) => {
      if (!row.doctor_code) return;
      const current = statusMap.get(row.doctor_code) || {
        success: 0,
        warning: 0,
      };
      const count = getCountAll(row);
      const status = String(row.status_chart || "").toUpperCase();
      if (status === "SUCCESS") current.success += count;
      if (status === "WARNING") current.warning += count;
      statusMap.set(row.doctor_code, current);
    });

    const sortedItems = doctors
      .map((doctor, index) => {
        const status = statusMap.get(doctor.doctorId) || {
          success: 0,
          warning: 0,
        };
        return {
          id: doctor.id,
          doctor_code: doctor.doctorId,
          doctor_name: doctor.name,
          doctor_license: doctor.license,
          doctor_cid: doctor.cid,
          doctor_active: doctor.active ?? null,
          doctor_line_active: doctor.line_active ?? null,
          total: totalMap.get(doctor.doctorId) || 0,
          success: status.success,
          warning: status.warning,
        };
      })
      .filter((item) => item.total > 0)
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.success - a.success ||
          b.warning - a.warning ||
          String(a.doctor_name).localeCompare(String(b.doctor_name), "th"),
      )
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const totalDoctors = sortedItems.length;
    const totalPages = Math.max(Math.ceil(totalDoctors / limit), 1);
    const pagedItems = sortedItems.slice(skip, skip + limit);

    return NextResponse.json({
      data: pagedItems,
      totalCharts,
      totalDoctors,
      totalSuccessCharts: totalSuccess,
      totalWarningCharts: totalWarning,
      summary: { totalDoctors, totalCharts, totalSuccess, totalWarning },
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
        searchDoctor: searchDoctor || null,
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
