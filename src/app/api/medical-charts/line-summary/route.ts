// src/app/api/medical-charts/line-summary/route.ts

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { withAdmin } from "@/lib/withAuth";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Helper
const getCountAll = (row: any) =>
  row._count && typeof row._count !== "boolean"
    ? Number(row._count._all ?? 0)
    : 0;

const formatThaiDate = (value?: string | Date | null) => {
  if (!value) return "-";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const normalizeStatus = (value: string | null | undefined) =>
  String(value || "").toUpperCase();

type SentDoctorSummary = {
  doctor_code: string;
  doctor_name: string;
  license: string;
  total: number;
  success: number;
  warning: number;
};

const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
};

// Flex bubble ต่อแพทย์ 1 คน
const buildDoctorBubble = ({
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
  const rangeText = `${formatThaiDate(dchdateFrom)} - ${formatThaiDate(
    dchdateTo,
  )}`;

  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: "สรุปเวชระเบียนแพทย์",
          weight: "bold",
          size: "md",
          color: "#111827",
        },
        {
          type: "separator",
          margin: "sm",
        },
        {
          type: "text",
          text: doctorName || "-",
          weight: "bold",
          size: "sm",
          margin: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: `รหัสแพทย์: ${doctorCode || "-"}`,
          size: "xxs",
          color: "#6B7280",
          wrap: true,
        },
        {
          type: "text",
          text: `ช่วง Discharge: ${rangeText}`,
          size: "xxs",
          color: "#6B7280",
          wrap: true,
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          margin: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              cornerRadius: "md",
              paddingAll: "sm",
              backgroundColor: "#F3F4F6",
              contents: [
                {
                  type: "text",
                  text: "ทั้งหมด",
                  size: "xxs",
                  align: "center",
                  color: "#374151",
                },
                {
                  type: "text",
                  text: String(total),
                  size: "lg",
                  weight: "bold",
                  align: "center",
                  color: "#111827",
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              cornerRadius: "md",
              paddingAll: "sm",
              backgroundColor: "#ECFDF5",
              contents: [
                {
                  type: "text",
                  text: "Success",
                  size: "xxs",
                  align: "center",
                  color: "#047857",
                },
                {
                  type: "text",
                  text: String(success),
                  size: "lg",
                  weight: "bold",
                  align: "center",
                  color: "#047857",
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              cornerRadius: "md",
              paddingAll: "sm",
              backgroundColor: "#FFFBEB",
              contents: [
                {
                  type: "text",
                  text: "Warning",
                  size: "xxs",
                  align: "center",
                  color: "#B45309",
                },
                {
                  type: "text",
                  text: String(warning),
                  size: "lg",
                  weight: "bold",
                  align: "center",
                  color: "#B45309",
                },
              ],
            },
          ],
        },
      ],
    },
  };
};

// รวม bubble เป็น flex carousel message
const formatNumber = (value: number) => {
  return new Intl.NumberFormat("th-TH").format(value || 0);
};

const safeText = (value: unknown, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const buildMedicalChartSummaryMessages = ({
  sentDoctors,
  dchdateFrom,
  dchdateTo,
}: {
  sentDoctors: SentDoctorSummary[];
  dchdateFrom: string;
  dchdateTo: string;
}) => {
  const PAGE_SIZE = 15;
  const doctorChunks = chunkArray(sentDoctors, PAGE_SIZE);

  const rangeText = `${formatThaiDate(dchdateFrom)} ถึง ${formatThaiDate(
    dchdateTo,
  )}`;

  const grandTotal = sentDoctors.reduce((sum, doc) => sum + doc.total, 0);
  const grandSuccess = sentDoctors.reduce((sum, doc) => sum + doc.success, 0);
  const grandWarning = sentDoctors.reduce((sum, doc) => sum + doc.warning, 0);

  const summaryCard = ({
    label,
    value,
    bg,
    color,
  }: {
    label: string;
    value: number;
    bg: string;
    color: string;
  }) => ({
    type: "box",
    layout: "vertical",
    backgroundColor: bg,
    cornerRadius: "lg",
    paddingAll: "sm",
    flex: 1,
    contents: [
      {
        type: "text",
        text: label,
        size: "xxs",
        color,
        align: "center",
        weight: "bold",
      },
      {
        type: "text",
        text: formatNumber(value),
        size: "xl",
        weight: "bold",
        color,
        align: "center",
        margin: "xs",
      },
      {
        type: "text",
        text: "คน",
        size: "xxs",
        color,
        align: "center",
      },
    ],
  });

  return doctorChunks.map((chunk, pageIndex) => {
    const doctorRows = chunk.flatMap((doc, index) => {
      const runningNo = pageIndex * PAGE_SIZE + index + 1;

      const row = {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        backgroundColor: "#FFFFFF",
        cornerRadius: "xl",
        paddingAll: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            width: "4px",
            backgroundColor: "#14B8A6",
            cornerRadius: "md",
            contents: [],
          },
          {
            type: "box",
            layout: "vertical",
            flex: 1,
            spacing: "xs",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                spacing: "sm",
                contents: [
                  {
                    type: "box",
                    layout: "vertical",
                    width: "28px",
                    height: "28px",
                    backgroundColor: "#CCFBF1",
                    cornerRadius: "xl",
                    justifyContent: "center",
                    alignItems: "center",
                    contents: [
                      {
                        type: "text",
                        text: String(runningNo),
                        size: "xxs",
                        weight: "bold",
                        color: "#0F766E",
                        align: "center",
                      },
                    ],
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    flex: 1,
                    spacing: "xs",
                    contents: [
                      {
                        type: "text",
                        text: safeText(doc.doctor_name),
                        weight: "bold",
                        size: "sm",
                        color: "#0F172A",
                        wrap: true,
                      },
                      {
                        type: "text",
                        text:
                          doc.license && doc.license !== "-"
                            ? `รหัสแพทย์: ${safeText(doc.doctor_code)}   •   ${safeText(doc.license)}`
                            : `รหัสแพทย์: ${safeText(doc.doctor_code)}`,
                        size: "xxs",
                        color: "#64748B",
                        wrap: true,
                      },
                    ],
                  },
                ],
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F8FAFC",
                cornerRadius: "lg",
                paddingAll: "sm",
                margin: "sm",
                contents: [
                  {
                    type: "text",
                    text: `ทั้งหมด ${formatNumber(
                      doc.total,
                    )} คน / สรุปเรียบร้อย ${formatNumber(
                      doc.success,
                    )} คน / รอสรุป ${formatNumber(doc.warning)} คน`,
                    size: "xs",
                    color: "#334155",
                    wrap: true,
                  },
                ],
              },
            ],
          },
        ],
      };

      if (index === 0) return [row];

      return [
        {
          type: "box",
          layout: "vertical",
          height: "8px",
          contents: [],
        },
        row,
      ];
    });

    return {
      type: "flex",
      altText: "สรุปเวชระเบียน",
      contents: {
        type: "bubble",
        size: "mega",
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "0px",
          backgroundColor: "#ECFEFF",
          contents: [
            {
              type: "box",
              layout: "vertical",
              paddingAll: "lg",
              backgroundColor: "#DFFBFF",
              spacing: "sm",
              contents: [
                {
                  type: "text",
                  text: "สรุปเวชระเบียน",
                  weight: "bold",
                  size: "xl",
                  color: "#0F766E",
                  margin: "sm",
                },
                {
                  type: "text",
                  text: `ช่วงวันที่ Discharge ${rangeText}`,
                  size: "xs",
                  color: "#0E7490",
                  wrap: true,
                },
                ...(doctorChunks.length > 1
                  ? [
                      {
                        type: "text",
                        text: `หน้า ${pageIndex + 1}/${doctorChunks.length}`,
                        size: "xxs",
                        color: "#0891B2",
                        weight: "bold",
                      },
                    ]
                  : []),
              ],
            },

            {
              type: "box",
              layout: "vertical",
              paddingAll: "md",
              spacing: "md",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#FFFFFF",
                  cornerRadius: "xl",
                  paddingAll: "md",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      spacing: "sm",
                      contents: [
                        {
                          type: "box",
                          layout: "vertical",
                          width: "4px",
                          backgroundColor: "#0EA5E9",
                          cornerRadius: "md",
                          contents: [],
                        },
                        {
                          type: "text",
                          text: "ภาพรวมทั้งหมด",
                          size: "sm",
                          weight: "bold",
                          color: "#0F172A",
                          flex: 1,
                        },
                      ],
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      spacing: "xs",
                      margin: "sm",
                      contents: [
                        summaryCard({
                          label: "ทั้งหมด",
                          value: grandTotal,
                          bg: "#E0F2FE",
                          color: "#0369A1",
                        }),
                        summaryCard({
                          label: "เรียบร้อย",
                          value: grandSuccess,
                          bg: "#DCFCE7",
                          color: "#15803D",
                        }),
                        summaryCard({
                          label: "รอสรุป",
                          value: grandWarning,
                          bg: "#FFEDD5",
                          color: "#C2410C",
                        }),
                      ],
                    },
                  ],
                },

                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#F0FDFA",
                  cornerRadius: "xl",
                  paddingAll: "sm",
                  contents: [
                    {
                      type: "text",
                      text: "รายละเอียดตามแพทย์",
                      size: "sm",
                      weight: "bold",
                      color: "#0F766E",
                    },
                  ],
                },

                ...doctorRows,
              ],
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          paddingAll: "md",
          backgroundColor: "#FFFFFF",
          contents: [
            {
              type: "separator",
              color: "#E2E8F0",
            },
            {
              type: "text",
              text: "http://172.16.101.34:3003",
              size: "xs",
              weight: "bold",
              color: "#475569",
              align: "center",
              margin: "md",
            },
            {
              type: "button",
              style: "primary",
              height: "sm",
              color: "#0F766E",
              margin: "sm",
              action: {
                type: "uri",
                label: "เปิดระบบ Medical Chart",
                uri: "http://172.16.101.34:3003",
              },
            },
            {
              type: "text",
              text: "By TonThanatnin@2026",
              size: "xxs",
              color: "#64748B",
              align: "center",
              margin: "sm",
              wrap: true,
              action: {
                type: "uri",
                label: "เปิดระบบ Medical Chart",
                uri: "http://172.16.101.34:3003",
              },
            },
          ],
        },
      },
    };
  });
};

// ส่ง MOPH Alert
const sendMophAlert = async ({ messages }: { messages: unknown[] }) => {
  const url = process.env.MOPH_ALERT_API_URL;
  const clientKey = process.env.CLIENT_KEY;
  const secretKey = process.env.SECRET_KEY;

  if (!url || !clientKey || !secretKey) {
    throw new Error("Missing MOPH alert credentials");
  }

  const messageBatches = chunkArray(messages, 5);
  const results: unknown[] = [];

  for (const batch of messageBatches) {
    const payload = {
      messages: batch,
    };

    console.log("MOPH Alert payload:", JSON.stringify(payload, null, 2));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-key": clientKey,
        "secret-key": secretKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseText = await res.text();

    let responseJson: unknown = null;

    try {
      responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseJson = responseText;
    }

    if (!res.ok) {
      console.error("MOPH Alert API failed:", {
        status: res.status,
        statusText: res.statusText,
        response: responseJson,
      });

      throw new Error(
        `MOPH Alert API error: ${res.status} ${JSON.stringify(responseJson)}`,
      );
    }

    results.push(responseJson);
  }

  return results;
};

const normalizeDoctorText = (value: unknown) => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const onlyDigits = (value: unknown) => {
  return String(value ?? "").replace(/\D/g, "");
};

const removeLicenseSuffix = (value: unknown) => {
  return String(value ?? "")
    .trim()
    .replace(/\s+ว\.?\s*\d{4,6}\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

export const POST = withAdmin(async (req: Request) => {
  try {
    const body = await req.json();

    const searchDoctor = String(body.searchDoctor || "").trim();

    const dchdateFrom = String(body.dchdateFrom || "").trim();
    const dchdateTo = String(body.dchdateTo || "").trim();

    const fromDate = dchdateFrom ? new Date(`${dchdateFrom}T00:00:00`) : null;

    const toDate = dchdateTo ? new Date(`${dchdateTo}T23:59:59`) : null;

    // =========================================================
    // โหลด Master แพทย์
    // =========================================================
    const doctorMaster = await prisma.doctor.findMany({
      select: {
        doctorId: true,
        name: true,
        license: true,
      },
    });

    // =========================================================
    // ค้นหาแพทย์จาก searchDoctor
    // รองรับ:
    // 0666
    // ชื่อแพทย์
    // ว75570
    // =========================================================
    const matchedDoctors = searchDoctor
      ? doctorMaster.filter((doctor) => {
          const keyword = normalizeDoctorText(searchDoctor);

          return (
            normalizeDoctorText(doctor.doctorId).includes(keyword) ||
            normalizeDoctorText(doctor.name).includes(keyword) ||
            normalizeDoctorText(doctor.license).includes(keyword)
          );
        })
      : [];

    // =========================================================
    // Doctor Filter
    //
    // สำคัญ:
    // ค้นทั้ง doctorId, ชื่อ และ license
    // เพราะ medical_chart บางแถวเก็บผิดเป็น
    // "พญ.วิภานดา อุดมเดช ว75570"
    // =========================================================
    const doctorOrFilters: Prisma.medical_chartWhereInput[] = [];

    if (searchDoctor) {
      // ค้นค่าที่ผู้ใช้กรอกโดยตรง
      doctorOrFilters.push({
        doctor_code: {
          contains: searchDoctor,
        },
      });

      matchedDoctors.forEach((doctor) => {
        if (doctor.doctorId) {
          doctorOrFilters.push({
            doctor_code: {
              contains: doctor.doctorId,
            },
          });
        }

        if (doctor.name) {
          doctorOrFilters.push({
            doctor_code: {
              contains: doctor.name,
            },
          });
        }

        if (doctor.license) {
          doctorOrFilters.push({
            doctor_code: {
              contains: doctor.license,
            },
          });
        }
      });
    }

    const doctorFilter: Prisma.medical_chartWhereInput =
      searchDoctor && doctorOrFilters.length > 0
        ? {
            OR: doctorOrFilters,
          }
        : {};

    // =========================================================
    // Date Filter
    // =========================================================
    const dateFilter: Prisma.medical_chartWhereInput =
      fromDate || toDate
        ? {
            dchdate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {};

    const where: Prisma.medical_chartWhereInput = {
      AND: [doctorFilter, dateFilter].filter(
        (filter) => Object.keys(filter).length > 0,
      ),
    };

    // =========================================================
    // Group Medical Chart
    // =========================================================
    const [groupedDoctors, statusRows] = await prisma.$transaction([
      prisma.medical_chart.groupBy({
        by: ["doctor_code"],
        where,
        _count: {
          _all: true,
        },
        orderBy: {
          doctor_code: "asc",
        },
      }),

      prisma.medical_chart.groupBy({
        by: ["doctor_code", "status_chart"],
        where,
        _count: {
          _all: true,
        },
        orderBy: [
          {
            doctor_code: "asc",
          },
          {
            status_chart: "asc",
          },
        ],
      }),
    ]);

    if (groupedDoctors.length === 0) {
      return NextResponse.json(
        {
          message: "ไม่พบข้อมูลสำหรับส่ง LINE",
          totalDoctors: 0,
        },
        {
          status: 404,
        },
      );
    }

    // =========================================================
    // Status map
    // =========================================================
    const statusMap = new Map<
      string,
      {
        success: number;
        warning: number;
      }
    >();

    statusRows.forEach((row) => {
      const rawDoctorCode = String(row.doctor_code || "").trim();

      if (!rawDoctorCode) return;

      const current = statusMap.get(rawDoctorCode) || {
        success: 0,
        warning: 0,
      };

      const count = getCountAll(row);
      const status = normalizeStatus(row.status_chart);

      if (status === "SUCCESS") {
        current.success += count;
      }

      if (status === "WARNING") {
        current.warning += count;
      }

      statusMap.set(rawDoctorCode, current);
    });

    // =========================================================
    // Map doctorId
    // =========================================================
    const doctorById = new Map(
      doctorMaster.map((doctor) => [
        normalizeDoctorText(doctor.doctorId),
        doctor,
      ]),
    );

    // =========================================================
    // หาแพทย์จริงจาก doctor_code ที่ medical_chart เก็บไว้
    // =========================================================
    const resolveDoctor = (rawDoctorCode: string) => {
      const raw = normalizeDoctorText(rawDoctorCode);

      // 1. doctorId ตรง
      const exactDoctor = doctorById.get(raw);

      if (exactDoctor) {
        return exactDoctor;
      }

      const rawDigits = onlyDigits(rawDoctorCode);

      // 2. เช็คชื่อ + license
      const byNameAndLicense = doctorMaster.find((doctor) => {
        const doctorName = normalizeDoctorText(doctor.name);
        const licenseDigits = onlyDigits(doctor.license);

        if (!doctorName || !licenseDigits) {
          return false;
        }

        return raw.includes(doctorName) && rawDigits.endsWith(licenseDigits);
      });

      if (byNameAndLicense) {
        return byNameAndLicense;
      }

      // 3. license
      const byLicense = doctorMaster.find((doctor) => {
        const licenseDigits = onlyDigits(doctor.license);

        if (licenseDigits.length < 4) {
          return false;
        }

        return rawDigits.endsWith(licenseDigits);
      });

      if (byLicense) {
        return byLicense;
      }

      // 4. ชื่อ
      const cleanRawName = normalizeDoctorText(
        removeLicenseSuffix(rawDoctorCode),
      );

      const byName = doctorMaster.find((doctor) => {
        const doctorName = normalizeDoctorText(doctor.name);

        if (!doctorName) {
          return false;
        }

        return doctorName === cleanRawName || raw.includes(doctorName);
      });

      return byName || null;
    };

    // =========================================================
    // รวมแพทย์คนเดียวกัน
    // =========================================================
    const sentDoctorMap = new Map<string, SentDoctorSummary>();

    groupedDoctors.forEach((group) => {
      const rawDoctorCode = String(group.doctor_code || "").trim();

      if (!rawDoctorCode) return;

      const doctor = resolveDoctor(rawDoctorCode);

      const status = statusMap.get(rawDoctorCode) || {
        success: 0,
        warning: 0,
      };

      /*
       * ถ้าหา master เจอ ให้ doctorId เป็นตัวระบุหลัก
       *
       * ตัวอย่าง:
       *
       * medical_chart:
       * 0666
       *
       * กับ
       *
       * พญ.วิภานดา อุดมเดช ว75570
       *
       * จะ resolve เป็นแพทย์คนเดียวกัน
       * และใช้ key = doctor:0666
       */
      const doctorKey = doctor
        ? `doctor:${normalizeDoctorText(doctor.doctorId)}`
        : `name:${normalizeDoctorText(removeLicenseSuffix(rawDoctorCode))}`;

      const doctorName =
        String(doctor?.name || "").trim() ||
        removeLicenseSuffix(rawDoctorCode) ||
        "-";

      const doctorCode = String(doctor?.doctorId || "").trim() || "-";

      const current = sentDoctorMap.get(doctorKey);

      if (current) {
        current.total += getCountAll(group);
        current.success += status.success;
        current.warning += status.warning;

        return;
      }

      const rawLicense = String(doctor?.license || "").trim();

      const doctorLicense = rawLicense
        ? /^ว\.?/i.test(rawLicense)
          ? rawLicense.replace(/^ว\.?\s*/i, "ว")
          : `ว${rawLicense}`
        : "-";

      sentDoctorMap.set(doctorKey, {
        doctor_code: doctorCode,
        doctor_name: doctorName,
        license: doctorLicense,
        total: getCountAll(group),
        success: status.success,
        warning: status.warning,
      });
    });

    // =========================================================
    // Array สำหรับส่ง LINE
    // =========================================================
    const sentDoctors = Array.from(sentDoctorMap.values()).sort((a, b) =>
      a.doctor_name.localeCompare(b.doctor_name, "th"),
    );

    // =========================================================
    // สร้าง LINE Flex
    // =========================================================
    const messages = buildMedicalChartSummaryMessages({
      sentDoctors,
      dchdateFrom,
      dchdateTo,
    });

    const mophResult = await sendMophAlert({
      messages,
    });

    return NextResponse.json({
      message: `ส่ง LINE สรุปชาร์ตแพทย์รวมสำเร็จ ${sentDoctors.length} ราย`,
      totalDoctors: sentDoctors.length,
      totalMessages: messages.length,
      mophResult,
    });
  } catch (error) {
    console.error("SEND LINE MEDICAL CHART ERROR:", error);

    return NextResponse.json(
      {
        message: "ส่ง LINE สรุปชาร์ตแพทย์ไม่สำเร็จ",

        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      {
        status: 500,
      },
    );
  }
});
