import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const allowedSortFields = [
  "hn",
  "an",
  "fullname",
  "regdate",
  "dchdate",
  "doctor_code",
  "ward_name",
  "num_date",
  "status_chart",
  "created_at",
  "updated_at",
] as const;

type SortField = (typeof allowedSortFields)[number];
type UserRole = "admin" | "user";

type TokenPayload = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  username?: string;
  role?: string;
};

const userSelect = {
  id: true,
  username: true,
  cid: true,
  role: true,
  active: true,
};

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

const getCookieValue = (cookieHeader: string, names: string[]) => {
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const name of names) {
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));

    if (cookie) {
      return decodeURIComponent(cookie.slice(name.length + 1));
    }
  }

  return "";
};

const getTokenFromRequest = (req: Request) => {
  const cookieToken = getCookieValue(req.headers.get("cookie") || "", [
    "token",
    "auth_token",
    "access_token",
  ]);

  if (cookieToken) return cookieToken;

  const authorization = req.headers.get("authorization") || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  return "";
};

const getUserIdFromPayload = (payload: TokenPayload) => {
  const rawId = payload.id ?? payload.userId ?? payload.sub;
  const id = Number(rawId);

  return Number.isFinite(id) && id > 0 ? id : null;
};

const getLoginUser = async (req: Request) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT_SECRET");
  }

  const token = getTokenFromRequest(req);

  if (!token) return null;

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const userId = getUserIdFromPayload(payload);

    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user || !user.active) return null;

    return user;
  } catch {
    return null;
  }
};

const emptyResponse = ({
  page,
  limit,
  dchdateFrom,
  dchdateTo,
  sortBy,
  sortOrder,
  message,
}: {
  page: number;
  limit: number;
  dchdateFrom: string;
  dchdateTo: string;
  sortBy: SortField;
  sortOrder: Prisma.SortOrder;
  message?: string;
}) => {
  return NextResponse.json({
    data: [],
    meta: {
      total: 0,
      page,
      limit,
      totalPages: 1,
      dchdateFrom: dchdateFrom || null,
      dchdateTo: dchdateTo || null,
      sortBy,
      sortOrder,
      message,
    },
  });
};

// GET /api/medical-charts?page=1&limit=10&search=...&dchdateFrom=2026-05-01&dchdateTo=2026-05-10&sortBy=dchdate&sortOrder=desc
// admin เห็นทั้งหมด
// user เห็นเฉพาะ chart ของตัวเอง: user.cid -> doctor.cid -> doctor.doctorId -> medical_chart.doctor_code
export async function GET(req: Request) {
  try {
    const loginUser = await getLoginUser(req);

    if (!loginUser) {
      return NextResponse.json(
        { message: "กรุณาเข้าสู่ระบบก่อน" },
        { status: 401 },
      );
    }

    const currentRole: UserRole = loginUser.role === "admin" ? "admin" : "user";
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );

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

    let ownDoctors: Array<{
      id: number;
      doctorId: string;
      name: string;
      cid: string;
      license: string;
      active: boolean | null;
    }> = [];

    let ownDoctorCodes: string[] = [];

    if (currentRole === "user") {
      if (!loginUser.cid) {
        return emptyResponse({
          page,
          limit,
          dchdateFrom,
          dchdateTo,
          sortBy,
          sortOrder,
          message: "บัญชีนี้ยังไม่มีเลขบัตรประชาชน",
        });
      }

      ownDoctors = await prisma.doctor.findMany({
        where: {
          cid: loginUser.cid,
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

      ownDoctorCodes = ownDoctors
        .map((doctor) => doctor.doctorId)
        .filter((code): code is string => Boolean(code));

      if (ownDoctorCodes.length === 0) {
        return emptyResponse({
          page,
          limit,
          dchdateFrom,
          dchdateTo,
          sortBy,
          sortOrder,
          message: "ไม่พบข้อมูลแพทย์ที่ผูกกับบัญชีนี้",
        });
      }
    }

    let doctorCodesFromSearch: string[] = [];

    if (search) {
      const matchedDoctorWhere: Prisma.doctorWhereInput = {
        AND: [
          currentRole === "user"
            ? {
                doctorId: {
                  in: ownDoctorCodes,
                },
              }
            : {},
          {
            OR: [
              { doctorId: { contains: search } },
              { name: { contains: search } },
              { license: { contains: search } },
              { cid: { contains: search } },
            ],
          },
        ].filter((filter) => Object.keys(filter).length > 0),
      };

      const matchedDoctors = await prisma.doctor.findMany({
        where: matchedDoctorWhere,
        select: {
          doctorId: true,
        },
      });

      doctorCodesFromSearch = matchedDoctors.map((doctor) => doctor.doctorId);
    }

    const roleFilter: Prisma.medical_chartWhereInput =
      currentRole === "user"
        ? {
            doctor_code: {
              in: ownDoctorCodes,
            },
          }
        : {};

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

    const filters = [roleFilter, searchFilter, dchdateFilter].filter(
      (filter) => Object.keys(filter).length > 0,
    );

    const where: Prisma.medical_chartWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const orderBy: Prisma.medical_chartOrderByWithRelationInput[] = [
      { [sortBy]: sortOrder },
      { id: "desc" },
    ];

    const [total, medicalCharts] = await prisma.$transaction([
      prisma.medical_chart.count({ where }),
      prisma.medical_chart.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const doctorCodes = [
      ...new Set(
        medicalCharts
          .map((chart) => chart.doctor_code)
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    const doctors =
      currentRole === "user"
        ? ownDoctors.filter((doctor) => doctorCodes.includes(doctor.doctorId))
        : await prisma.doctor.findMany({
            where: {
              doctorId: {
                in: doctorCodes,
              },
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

    const doctorMap = new Map(
      doctors.map((doctor) => [doctor.doctorId, doctor]),
    );

    const data = medicalCharts.map((chart) => {
      const doctor = doctorMap.get(chart.doctor_code) || null;

      return {
        ...chart,
        doctor_name: doctor?.name || null,
        doctor: doctor
          ? {
              ...doctor,
              active: Boolean(doctor.active),
            }
          : null,
      };
    });

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        dchdateFrom: dchdateFrom || null,
        dchdateTo: dchdateTo || null,
        sortBy,
        sortOrder,
        role: currentRole,
      },
    });
  } catch (error) {
    console.error("GET ERROR Medical Chart:", error);

    return NextResponse.json(
      { message: "Failed to fetch medical charts" },
      { status: 500 },
    );
  }
}
