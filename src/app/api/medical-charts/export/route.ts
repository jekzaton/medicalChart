import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { withAdmin } from "@/lib/withAuth";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const allowedSortFields = [
  "hn",
  "an",
  "fullname",
  "regdate",
  "dchdate",
  "doctor_code",
  "ward_name",
  // "num_date",
  "status_chart",
  "created_at",
  "updated_at",
] as const;

type SortField = (typeof allowedSortFields)[number];

const isValidSortField = (value: string): value is SortField => {
  return allowedSortFields.includes(value as SortField);
};

const startOfDay = (value: string) => {
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (value: string) => {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getStatusLabel = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "success") return "ตรวจสอบแล้ว";
  if (normalized === "warning") return "รอตรวจสอบ";

  return status;
};

// GET /api/medical-charts/export?search=...&dchdateFrom=2026-05-01&dchdateTo=2026-05-31&sortBy=dchdate&sortOrder=desc
export const GET = withAdmin(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const dchdateFrom = (searchParams.get("dchdateFrom") || "").trim();
    const dchdateTo = (searchParams.get("dchdateTo") || "").trim();

    const requestedSortBy = (searchParams.get("sortBy") || "dchdate").trim();
    const requestedSortOrder = (searchParams.get("sortOrder") || "desc").trim();

    const sortBy: SortField = isValidSortField(requestedSortBy)
      ? requestedSortBy
      : "dchdate";

    const sortOrder: Prisma.SortOrder =
      requestedSortOrder.toLowerCase() === "asc" ? "asc" : "desc";

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

    let doctorCodesFromSearch: string[] = [];

    if (search) {
      const matchedDoctors = await prisma.doctor.findMany({
        where: {
          OR: [
            { doctorId: { contains: search } },
            { name: { contains: search } },
            { license: { contains: search } },
          ],
        },
        select: {
          doctorId: true,
        },
      });

      doctorCodesFromSearch = matchedDoctors.map((doctor) => doctor.doctorId);
    }

    const searchFilter: Prisma.medical_chartWhereInput = search
      ? {
          OR: [
            { hn: { contains: search } },
            { an: { contains: search } },
            { fullname: { contains: search } },
            { doctor_code: { contains: search } },
            { ward_name: { contains: search } },
            ...(doctorCodesFromSearch.length > 0
              ? [{ doctor_code: { in: doctorCodesFromSearch } }]
              : []),
          ],
        }
      : {};

    const dchdateFilter: Prisma.medical_chartWhereInput =
      fromDate || toDate
        ? {
            dchdate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {};

    const filters = [searchFilter, dchdateFilter].filter(
      (filter) => Object.keys(filter).length > 0,
    );

    const where: Prisma.medical_chartWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const medicalCharts = await prisma.medical_chart.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
    });

    const doctorCodes = [
      ...new Set(
        medicalCharts
          .map((chart) => chart.doctor_code)
          .filter((code): code is string => Boolean(code)),
      ),
    ];

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

    const rows = medicalCharts.map((chart, index) => {
      const doctor = doctorMap.get(chart.doctor_code);

      return {
        ลำดับ: index + 1,
        HN: chart.hn,
        AN: chart.an,
        "ชื่อ-สกุล": chart.fullname,
        "วัน Admit": formatDate(chart.regdate),
        "วัน Discharge": formatDate(chart.dchdate),
        วอร์ด: chart.ward_name,
        รหัสแพทย์: chart.doctor_code,
        ชื่อแพทย์: doctor?.name || "",
        เลขใบประกอบวิชาชีพ: doctor?.license || "",
        // จำนวนวันล่าช้า: chart.num_date,
        สถานะ: getStatusLabel(String(chart.status_chart)),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Medical Chart");

    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    const fileName = `medical-chart-${dchdateFrom || "all"}-to-${
      dchdateTo || "all"
    }.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          fileName,
        )}`,
      },
    });
  } catch (error) {
    console.error("EXPORT MEDICAL CHART ERROR:", error);

    return NextResponse.json(
      { message: "Export Excel ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});
