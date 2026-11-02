// src/app/api/medical-charts/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import * as XLSX from "xlsx";
import { withAdmin } from "@/lib/withAuth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validDate = z.custom<Date>(
  (value) => value instanceof Date && !Number.isNaN(value.getTime()),
  "รูปแบบวันที่ไม่ถูกต้อง",
);

const rowSchema = z.object({
  hn: z.string().trim().min(1, "กรอก HN"),
  an: z.string().trim().min(1, "กรอก AN"),
  fullname: z.string().trim().min(1, "กรอกชื่อ-สกุล"),
  regdate: validDate,
  dchdate: validDate,
  doctor_code: z.string().trim().min(1, "กรอกรหัสแพทย์"),
  ward_name: z.string().trim().optional().default(""),
  status_chart: z.enum(["SUCCESS", "WARNING"]).optional().default("WARNING"),
});

type ImportRow = z.infer<typeof rowSchema>;
type ExcelRow = Record<string, unknown>;

type ImportError = {
  row: number;
  an?: string;
  hn?: string;
  message: string;
};

type ImportWarning = {
  row: number;
  an?: string;
  hn?: string;
  message: string;
};

const normalizeKey = (key: string) =>
  String(key)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[-–—]/g, "_")
    .replace(/[()]/g, "");

const toCleanString = (value: unknown) => String(value ?? "").trim();

const getCell = (row: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const normalizedKey = normalizeKey(key);
    const value = row[normalizedKey];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
};

const convertBuddhistToGregorian = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    const year = dateValue.getFullYear();

    if (year >= 2500) {
      return new Date(
        Date.UTC(year - 543, dateValue.getMonth(), dateValue.getDate()),
      );
    }

    return dateValue;
  }

  if (typeof dateValue === "number") {
    const d = XLSX.SSF.parse_date_code(dateValue);

    if (!d) return null;

    const year = d.y >= 2500 ? d.y - 543 : d.y;

    return new Date(Date.UTC(year, d.m - 1, d.d));
  }

  if (typeof dateValue === "string") {
    const value = dateValue.trim();

    if (!value) return null;

    const parts = value.split(/[/-]/).map((p) => parseInt(p, 10));

    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) {
      const parsed = new Date(value);

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }

      return null;
    }

    let day: number;
    let month: number;
    let year: number;

    // รองรับ yyyy-mm-dd
    if (String(parts[0]).length === 4 || parts[0] > 31) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      // รองรับ dd/mm/yyyy
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }

    if (year >= 2500) year -= 543;

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    return new Date(Date.UTC(year, month - 1, day));
  }

  return null;
};

const getImportMessage = (error: unknown) => {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Import failed";
};

function normalizeDate(value: any): Date {
  if (!value) return new Date();

  if (value instanceof Date) return value;

  // Excel serial number
  if (typeof value === "number") {
    return new Date((value - 25569) * 86400 * 1000);
  }

  return new Date(value);
}

const toDateKey = (value: Date | null | undefined) => {
  if (!value) return "";

  const date = new Date(value);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const isSameDate = (
  firstDate: Date | null | undefined,
  secondDate: Date | null | undefined,
) => {
  return toDateKey(firstDate) === toDateKey(secondDate);
};

export const POST = withAdmin(async (req: Request) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ message: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "File too large" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return NextResponse.json(
      { message: "ไม่พบ sheet ในไฟล์ Excel" },
      { status: 400 },
    );
  }

  const sheet = workbook.Sheets[sheetName];

  const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
    dateNF: "dd/mm/yyyy",
  });

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  for (const [index, row] of rawData.entries()) {
    const excelRowNumber = index + 2;

    const normalizedRow: Record<string, unknown> = {};

    Object.entries(row).forEach(([key, value]) => {
      normalizedRow[normalizeKey(key)] = value;
    });

    const an = toCleanString(
      getCell(normalizedRow, ["an", "AN", "เลข AN", "เลขที่ AN"]),
    );

    const hn = toCleanString(
      getCell(normalizedRow, ["hn", "HN", "เลข HN", "เลขที่ HN"]),
    );

    try {
      const mappedRow = {
        hn,
        an,
        fullname: toCleanString(
          getCell(normalizedRow, [
            "fullname",
            "full_name",
            "patient_name",
            "pt_name",
            "name",
            "ชื่อ-สกุล",
            "ชื่อสกุล",
            "ชื่อ_สกุล",
            "ชื่อ",
          ]),
        ),
        regdate: convertBuddhistToGregorian(
          getCell(normalizedRow, [
            "regdate",
            "reg_date",
            "admit_date",
            "admdate",
            "วันที่รับไว้",
            "วันที่_admit",
            "วันที่เข้ารับการรักษา",
          ]),
        ),
        dchdate: convertBuddhistToGregorian(
          getCell(normalizedRow, [
            "dchdate",
            "dch_date",
            "discharge_date",
            "วันที่จำหน่าย",
            "วันที่_discharge",
            "วันที่ออก",
          ]),
        ),
        doctor_code: toCleanString(
          getCell(normalizedRow, [
            "doctor_code",
            "doctor",
            "dr_code",
            "รหัสแพทย์",
            "แพทย์",
          ]),
        ),
        ward_name: toCleanString(
          getCell(normalizedRow, [
            "ward_name",
            "ward",
            "wardname",
            "หอผู้ป่วย",
            "วอร์ด",
          ]),
        ),
        status_chart: toCleanString(
          getCell(normalizedRow, [
            "status_chart",
            "status",
            "สถานะ",
            "สถานะชาร์ต",
          ]),
        ),
      };

      if (!mappedRow.hn && !mappedRow.an) {
        continue;
      }

      const status = String(mappedRow.status_chart || "WARNING").toUpperCase();

      const data: ImportRow = rowSchema.parse({
        ...mappedRow,
        status_chart: status === "SUCCESS" ? "SUCCESS" : "WARNING",
      });

      const today = new Date();
      const dchdate = normalizeDate(data.dchdate);
      const diffDays = Math.floor(
        (today.getTime() - data.dchdate.getTime()) / (1000 * 60 * 60 * 24),
      );

      const num_date = diffDays >= 7 ? Math.floor((diffDays - 7) / 8) + 1 : 0;

      const now = new Date();

      const chartData = {
        hn: data.hn,
        fullname: data.fullname,
        regdate: data.regdate,
        dchdate: data.dchdate,
        doctor_code: data.doctor_code,
        ward_name: data.ward_name,
        num_date,
        status_chart: data.status_chart,
        updated_at: now,
      };

      // ใช้ findFirst เพราะ DB ปัจจุบันยังไม่มี unique index ที่ an
      const existing = await prisma.medical_chart.findFirst({
        where: {
          an: data.an,
        },
        select: {
          id: true,
          hn: true,
          fullname: true,
          regdate: true,
          dchdate: true,
          doctor_code: true,
          ward_name: true,
          num_date: true,
          status_chart: true,
        },
      });

      if (existing) {
        const hasChanged =
          (existing.hn ?? "") !== chartData.hn ||
          (existing.fullname ?? "") !== chartData.fullname ||
          !isSameDate(existing.regdate, chartData.regdate) ||
          !isSameDate(existing.dchdate, chartData.dchdate) ||
          (existing.doctor_code ?? "") !== chartData.doctor_code ||
          (existing.ward_name ?? "") !== chartData.ward_name ||
          existing.num_date !== chartData.num_date ||
          existing.status_chart !== chartData.status_chart;

        if (hasChanged) {
          await prisma.medical_chart.update({
            where: {
              id: existing.id,
            },
            data: chartData,
          });

          updated += 1;
        } else {
          unchanged += 1;
        }
      } else {
        await prisma.medical_chart.create({
          data: {
            an: data.an,
            ...chartData,
            created_at: now,
          },
        });

        created += 1;
      }
    } catch (error: unknown) {
      failed += 1;

      const message = getImportMessage(error);

      console.error(
        `Error importing row=${excelRowNumber}, AN=${an || "N/A"}, HN=${hn || "N/A"}:`,
        error,
      );

      errors.push({
        row: excelRowNumber,
        an,
        hn,
        message,
      });
    }
  }

  const total = created + updated + unchanged + skipped + failed;
  const success = created + updated + unchanged;

  return NextResponse.json({
    message: `Import completed. Created: ${created}, Updated: ${updated}, Unchanged: ${unchanged}, Skipped: ${skipped}, Failed: ${failed}`,
    summary: {
      total,
      created,
      updated,
      unchanged,
      skipped,
      failed,
      success,
    },
    warnings,
    errors,
  });
});
