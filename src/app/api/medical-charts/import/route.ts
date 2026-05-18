import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import * as XLSX from "xlsx";
import { withAdmin } from "@/lib/withAuth";

export const runtime = "nodejs";

const prisma = new PrismaClient();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const rowSchema = z.object({
  hn: z.string().min(1, "กรอก HN"),
  an: z.string().min(1, "กรอก AN"),
  fullname: z.string().min(1, "กรอกชื่อ-สกุล"),
  regdate: z.coerce.date({ message: "วันที่ Admit ไม่ถูกต้อง" }),
  dchdate: z.coerce.date({ message: "วันที่ Discharge ไม่ถูกต้อง" }),
  doctor_code: z.string().min(1, "กรอกรหัสแพทย์"),
  ward_name: z.string().optional().default(""),
  num_date: z.coerce.number().int().min(0).optional().default(0),
  status_chart: z
    .enum(["SUCCESS", "WARNING", "success", "warning"])
    .optional()
    .default("WARNING"),
});

type ImportRow = z.infer<typeof rowSchema>;

type ExcelRow = Record<string, unknown>;

const normalizeKey = (key: string) => {
  return key
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
};

const getValue = (row: ExcelRow, keys: string[]) => {
  const normalizedRow = Object.entries(row).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[normalizeKey(key)] = value;
      return acc;
    },
    {},
  );

  for (const key of keys) {
    const value = normalizedRow[normalizeKey(key)];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
};

const toStringValue = (value: unknown) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const excelSerialDateToDate = (serial: number) => {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

const parseDateValue = (value: unknown) => {
  if (!value) return undefined;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return excelSerialDateToDate(value);
  }

  const text = String(value).trim();

  // รองรับ dd/mm/yyyy หรือ dd-mm-yyyy รวมถึงปี พ.ศ.
  const thaiDateMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (thaiDateMatch) {
    const day = Number(thaiDateMatch[1]);
    const month = Number(thaiDateMatch[2]);
    let year = Number(thaiDateMatch[3]);

    if (year > 2400) year -= 543;

    return new Date(year, month - 1, day);
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return undefined;

  return date;
};

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const calculateDelayDays = (dchdate: Date) => {
  const dischargeDate = startOfDay(dchdate);
  const today = startOfDay(new Date());

  // กำหนดครบกำหนด = วันที่จำหน่าย + 7 วัน
  // ถ้า dchdate + 7 คือวันที่ 8 จะยังไม่นับว่าล่าช้า
  // เริ่มนับล่าช้าวันถัดไป เช่น วันที่ 9 = ล่าช้า 1 วัน
  const dueDate = new Date(dischargeDate);
  dueDate.setDate(dueDate.getDate() + 7);

  const diffDays = Math.floor(
    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(diffDays, 0);
};

const normalizeStatus = (status: ImportRow["status_chart"]) => {
  const value = String(status || "WARNING").toLowerCase();
  return value === "success" ? "SUCCESS" : "WARNING";
};

const mapExcelRowToData = (row: ExcelRow) => {
  const regdate = parseDateValue(
    getValue(row, [
      "regdate",
      "admit_date",
      "admit",
      "วันที่เข้ารับบริการ",
      "วัน admit",
    ]),
  );

  const dchdate = parseDateValue(
    getValue(row, [
      "dchdate",
      "discharge_date",
      "discharge",
      "วันที่จำหน่าย",
      "วัน discharge",
    ]),
  );

  const rawNumDate = getValue(row, [
    "num_date",
    "delay_days",
    "จำนวนวัน",
    "จำนวนวันล่าช้า",
  ]);
  const parsedNumDate =
    rawNumDate === undefined ||
    rawNumDate === null ||
    String(rawNumDate).trim() === ""
      ? undefined
      : Number(rawNumDate);

  const data = {
    hn: toStringValue(getValue(row, ["hn", "HN"])),
    an: toStringValue(getValue(row, ["an", "AN"])),
    fullname: toStringValue(
      getValue(row, ["fullname", "name", "ชื่อ-สกุล", "ชื่อ สกุล"]),
    ),
    regdate,
    dchdate,
    doctor_code: toStringValue(
      getValue(row, ["doctor_code", "doctorId", "doctor_id", "รหัสแพทย์"]),
    ),
    ward_name: toStringValue(
      getValue(row, ["ward_name", "ward", "wardName", "หอผู้ป่วย", "วอร์ด"]),
    ),
    num_date: Number.isFinite(parsedNumDate) ? parsedNumDate : undefined,
    status_chart:
      toStringValue(getValue(row, ["status_chart", "status", "สถานะ"])) ||
      "WARNING",
  };

  return data;
};

export const POST = withAdmin(async (req: Request) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: "กรุณาอัปโหลดไฟล์ Excel" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "ไฟล์ต้องมีขนาดไม่เกิน 10MB" },
        { status: 400 },
      );
    }

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isExcel) {
      return NextResponse.json(
        { message: "รองรับเฉพาะไฟล์ .xlsx หรือ .xls เท่านั้น" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return NextResponse.json(
        { message: "ไม่พบ Sheet ในไฟล์ Excel" },
        { status: 400 },
      );
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      defval: "",
      raw: true,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลในไฟล์ Excel" },
        { status: 400 },
      );
    }

    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    const doctorCodes = [
      ...new Set(
        rows
          .map((row) =>
            toStringValue(
              getValue(row, [
                "doctor_code",
                "doctorId",
                "doctor_id",
                "รหัสแพทย์",
              ]),
            ),
          )
          .filter(Boolean),
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
      },
    });

    const doctorCodeSet = new Set(doctors.map((doctor) => doctor.doctorId));

    // ดึง AN ที่มีอยู่แล้วในระบบไว้ก่อน
    // ถ้า Excel มี AN ตรงกับข้อมูลเดิม จะ update แทน create
    const ans = [
      ...new Set(
        rows
          .map((row) => toStringValue(getValue(row, ["an", "AN"])))
          .filter(Boolean),
      ),
    ];

    const existingCharts = await prisma.medical_chart.findMany({
      where: {
        an: {
          in: ans,
        },
      },
      select: {
        id: true,
        an: true,
      },
    });

    const existingChartMap = new Map(
      existingCharts.map((chart) => [chart.an, chart]),
    );

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2; // header อยู่แถวที่ 1
      const rawData = mapExcelRowToData(rows[index]);

      const parsed = rowSchema.safeParse(rawData);

      if (!parsed.success) {
        skipped += 1;
        const messages = parsed.error.issues
          .map((issue) => issue.message)
          .join(", ");
        errors.push(`แถว ${rowNumber}: ${messages}`);
        continue;
      }

      const data = parsed.data;

      if (!doctorCodeSet.has(data.doctor_code)) {
        skipped += 1;
        errors.push(
          `แถว ${rowNumber}: ไม่พบรหัสแพทย์ ${data.doctor_code} ในระบบ`,
        );
        continue;
      }

      const numDate = calculateDelayDays(data.dchdate);

      const statusChart = normalizeStatus(data.status_chart);

      const existingChart = existingChartMap.get(data.an);

      if (existingChart) {
        await prisma.medical_chart.update({
          where: {
            id: existingChart.id,
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
            status_chart: statusChart,
          },
        });

        updated += 1;
      } else {
        const createdChart = await prisma.medical_chart.create({
          data: {
            hn: data.hn,
            an: data.an,
            fullname: data.fullname,
            regdate: data.regdate,
            dchdate: data.dchdate,
            doctor_code: data.doctor_code,
            ward_name: data.ward_name,
            num_date: numDate,
            status_chart: statusChart,
          },
        });

        inserted += 1;

        // กันกรณีในไฟล์ Excel มี AN ซ้ำกันเอง
        // แถวถัดไปที่ AN เดียวกันจะกลายเป็น update
        existingChartMap.set(data.an, {
          id: createdChart.id,
          an: createdChart.an,
        });
      }
    }

    return NextResponse.json({
      message: "นำเข้าข้อมูลสำเร็จ",
      total: rows.length,
      inserted,
      updated,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("IMPORT MEDICAL CHART ERROR:", error);

    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดระหว่างนำเข้าไฟล์" },
      { status: 500 },
    );
  }
});
