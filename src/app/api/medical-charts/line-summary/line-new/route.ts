import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { withAdmin } from "@/lib/withAuth";

const prisma = new PrismaClient();

type CountRow = {
  _count?:
    | true
    | {
        _all?: number | null;
        [key: string]: number | null | undefined;
      };
};

type DoctorForSend = {
  doctorId: string;
  name: string;
  cid: string | null;
};

const getCountAll = (row: CountRow) => {
  if (!row._count || row._count === true) return 0;
  return Number(row._count._all ?? 0);
};

const startOfDay = (value: string) => {
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (value: string) => {
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatThaiDate = (value?: string | Date | null) => {
  if (!value) return "-";

  const date =
    typeof value === "string" && value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatThaiTime = (value: Date) => {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
};

const normalizeStatus = (value: unknown) => String(value || "").toUpperCase();

const getMophAlertApiUrl = () => process.env.MOPH_ALERT_API_URL || "";
const getClientKey = () => process.env.CLIENT_KEY || "";
const getSecretKey = () => process.env.SECRET_KEY || "";

const makeStatBox = ({
  label,
  value,
  unit = "เคส",
  bgColor,
  textColor,
}: {
  label: string;
  value: number;
  unit?: string;
  bgColor: string;
  textColor: string;
}) => ({
  type: "box",
  layout: "vertical",
  flex: 1,
  backgroundColor: bgColor,
  cornerRadius: "12px",
  paddingAll: "9px",
  contents: [
    {
      type: "text",
      text: label,
      size: "xxs",
      color: "#6B7280",
      align: "center",
    },
    {
      type: "text",
      text: value.toLocaleString(),
      size: "lg",
      weight: "bold",
      color: textColor,
      align: "center",
      margin: "xs",
    },
    {
      type: "text",
      text: unit,
      size: "xxs",
      color: "#6B7280",
      align: "center",
    },
  ],
});

const buildDoctorFlexMessage = ({
  doctorName,
  doctorCode,
  total,
  success,
  warning,
  dchdateFrom,
  dchdateTo,
}: {
  doctorName: string;
  doctorCode: string;
  total: number;
  success: number;
  warning: number;
  dchdateFrom: string;
  dchdateTo: string;
}) => {
  const now = new Date();
  const rangeText = `${dchdateFrom ? formatThaiDate(dchdateFrom) : "เริ่มต้น"} - ${
    dchdateTo ? formatThaiDate(dchdateTo) : "ปัจจุบัน"
  }`;

  return {
    type: "flex",
    altText: "สรุปชาร์ต",
    contents: {
      type: "bubble",
      size: "mega",
      hero: {
        type: "image",
        url: "https://yth.moph.go.th/bg/yth_logo_lg.jpg",
        size: "full",
        aspectRatio: "20:8",
        aspectMode: "cover",
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#ECFDF5",
            cornerRadius: "18px",
            paddingAll: "14px",
            spacing: "xs",
            borderColor: "#A7F3D0",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: "สรุปชาร์ต",
                weight: "bold",
                size: "lg",
                color: "#064E3B",
                wrap: true,
                align: "center",
              },
              {
                type: "text",
                text: doctorName || "ไม่พบชื่อแพทย์",
                weight: "bold",
                size: "sm",
                color: "#047857",
                wrap: true,
                align: "center",
                margin: "xs",
              },
              {
                type: "text",
                text: doctorCode ? `รหัสแพทย์: ${doctorCode}` : "รหัสแพทย์: -",
                size: "xxs",
                color: "#047857",
                wrap: true,
                align: "center",
              },
              {
                type: "text",
                text: `ช่วง Discharge: ${rangeText}`,
                size: "xxs",
                color: "#047857",
                wrap: true,
                align: "center",
                margin: "xs",
              },
            ],
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F9FAFB",
            cornerRadius: "16px",
            paddingAll: "14px",
            spacing: "sm",
            borderColor: "#D1FAE5",
            borderWidth: "1px",
            contents: [
              {
                type: "text",
                text: "ภาพรวมเคสของคุณ",
                weight: "bold",
                size: "sm",
                color: "#065F46",
                wrap: true,
                align: "center",
              },
              {
                type: "separator",
                color: "#E5E7EB",
                margin: "sm",
              },
              {
                type: "box",
                layout: "horizontal",
                spacing: "xs",
                contents: [
                  makeStatBox({
                    label: "ทั้งหมด",
                    value: total,
                    bgColor: "#EFF6FF",
                    textColor: "#1D4ED8",
                  }),
                  makeStatBox({
                    label: "เสร็จ",
                    value: success,
                    bgColor: "#ECFDF5",
                    textColor: "#047857",
                  }),
                  makeStatBox({
                    label: "ค้าง",
                    value: warning,
                    bgColor: "#FEF2F2",
                    textColor: "#DC2626",
                  }),
                ],
              },
              {
                type: "text",
                text: `รวมทั้งหมด ${total.toLocaleString()} เคส`,
                size: "xs",
                color: "#374151",
                wrap: true,
                align: "center",
                margin: "sm",
              },
            ],
          },
          {
            type: "separator",
            margin: "sm",
            color: "#D1FAE5",
          },
          {
            type: "box",
            layout: "horizontal",
            backgroundColor: "#F0FDF4",
            cornerRadius: "14px",
            paddingAll: "11px",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  {
                    type: "text",
                    text: "วันที่ส่ง",
                    size: "xxs",
                    color: "#6B7280",
                    align: "center",
                  },
                  {
                    type: "text",
                    text: formatThaiDate(now),
                    size: "xs",
                    weight: "bold",
                    color: "#047857",
                    align: "center",
                    margin: "xs",
                  },
                ],
              },
              {
                type: "separator",
                color: "#BBF7D0",
              },
              {
                type: "box",
                layout: "vertical",
                flex: 1,
                contents: [
                  {
                    type: "text",
                    text: "เวลา",
                    size: "xxs",
                    color: "#6B7280",
                    align: "center",
                  },
                  {
                    type: "text",
                    text: `${formatThaiTime(now)} น.`,
                    size: "xs",
                    weight: "bold",
                    color: "#047857",
                    align: "center",
                    margin: "xs",
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "14px",
        spacing: "sm",
        backgroundColor: "#FFFFFF",
        contents: [
          {
            type: "text",
            text: "Powered by MOPH Alert YTH",
            size: "xxs",
            color: "#9CA3AF",
            align: "center",
          },
        ],
      },
    },
  };
};

const sendMophAlert = async ({
  cid,
  messages,
}: {
  cid: string[];
  messages: unknown[];
}) => {
  const url = getMophAlertApiUrl();
  const clientKey = getClientKey();
  const secretKey = getSecretKey();

  if (!url) throw new Error("Missing MOPH_ALERT_API_URL");
  if (!clientKey) throw new Error("Missing CLIENT_KEY");
  if (!secretKey) throw new Error("Missing SECRET_KEY");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "client-key": clientKey,
      "secret-key": secretKey,
    },
    body: JSON.stringify({
      cid,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`MOPH Alert API error: ${response.status} ${text}`);
  }

  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

export const POST = withAdmin(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));

    const search = String(body.search || "").trim();
    const dchdateFrom = String(body.dchdateFrom || "").trim();
    const dchdateTo = String(body.dchdateTo || "").trim();

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
            { cid: { contains: search } },
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

    const [total, groupedDoctors, statusRows] = await prisma.$transaction([
      prisma.medical_chart.count({ where }),
      prisma.medical_chart.groupBy({
        by: ["doctor_code"],
        where,
        _count: {
          doctor_code: true,
          _all: true,
        },
        orderBy: {
          _count: {
            doctor_code: "desc",
          },
        },
      }),
      prisma.medical_chart.groupBy({
        by: ["doctor_code", "status_chart"],
        where,
        _count: {
          _all: true,
        },
        orderBy: [{ doctor_code: "asc" }, { status_chart: "asc" }],
      }),
    ]);

    if (total === 0 || groupedDoctors.length === 0) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลชาร์ตในช่วงวันที่ที่เลือก" },
        { status: 404 },
      );
    }

    const doctorCodes = groupedDoctors
      .map((item) => item.doctor_code)
      .filter((code): code is string => Boolean(code));

    const doctors = await prisma.doctor.findMany({
      where: {
        doctorId: {
          in: doctorCodes,
        },
        cid: {
          not: "",
        },
      },
      select: {
        doctorId: true,
        name: true,
        cid: true,
      },
    });

    const doctorMap = new Map<string, DoctorForSend>(
      doctors.map((doctor) => [
        doctor.doctorId,
        {
          doctorId: doctor.doctorId,
          name: doctor.name,
          cid: doctor.cid || null,
        },
      ]),
    );

    const statusMap = new Map<string, { success: number; warning: number }>();

    for (const row of statusRows) {
      const count = getCountAll(row);
      const current = statusMap.get(row.doctor_code) || {
        success: 0,
        warning: 0,
      };

      if (normalizeStatus(row.status_chart) === "SUCCESS") {
        current.success = count;
      }

      if (normalizeStatus(row.status_chart) === "WARNING") {
        current.warning = count;
      }

      statusMap.set(row.doctor_code, current);
    }

    const sentDoctors: Array<{
      doctor_code: string;
      doctor_name: string;
      cid: string;
      total: number;
      success: number;
      warning: number;
    }> = [];

    const skippedDoctors: Array<{
      doctor_code: string;
      reason: string;
    }> = [];

    for (const group of groupedDoctors) {
      const doctor = doctorMap.get(group.doctor_code);

      if (!doctor?.cid) {
        skippedDoctors.push({
          doctor_code: group.doctor_code,
          reason: "ไม่พบ CID ของแพทย์",
        });
        continue;
      }

      const groupTotal = getCountAll(group);
      const status = statusMap.get(group.doctor_code) || {
        success: 0,
        warning: 0,
      };

      const flexMessage = buildDoctorFlexMessage({
        doctorName: doctor.name || group.doctor_code,
        doctorCode: group.doctor_code,
        total: groupTotal,
        success: status.success,
        warning: status.warning,
        dchdateFrom,
        dchdateTo,
      });

      await sendMophAlert({
        cid: [doctor.cid],
        messages: [flexMessage],
      });

      sentDoctors.push({
        doctor_code: group.doctor_code,
        doctor_name: doctor.name || group.doctor_code,
        cid: doctor.cid,
        total: groupTotal,
        success: status.success,
        warning: status.warning,
      });
    }

    if (sentDoctors.length === 0) {
      return NextResponse.json(
        {
          message: "ไม่พบแพทย์ที่มี CID สำหรับส่ง LINE",
          skippedDoctors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: `ส่ง LINE สรุปชาร์ตแพทย์สำเร็จ ${sentDoctors.length} ราย`,
      total,
      sentDoctors,
      skippedDoctors,
    });
  } catch (error) {
    console.error("SEND LINE MEDICAL CHART SUMMARY ERROR:", error);

    return NextResponse.json(
      { message: "ส่ง LINE สรุปชาร์ตแพทย์ไม่สำเร็จ" },
      { status: 500 },
    );
  }
});
