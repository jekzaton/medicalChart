import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

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

const emptyDashboardResponse = ({
  dchdateFrom,
  dchdateTo,
  role,
  message,
}: {
  dchdateFrom: string;
  dchdateTo: string;
  role: UserRole;
  message?: string;
}) => {
  return NextResponse.json({
    total: 0,
    success: 0,
    warning: 0,
    dchdateFrom: dchdateFrom || null,
    dchdateTo: dchdateTo || null,
    role,
    message,
  });
};

// GET /api/medical-charts/dashboard?dchdateFrom=2026-05-01&dchdateTo=2026-05-10
// admin เห็นทั้งหมด
// user เห็นเฉพาะของตัวเอง: user.cid -> doctor.cid -> doctor.doctorId -> medical_chart.doctor_code
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

    const dchdateFrom = (searchParams.get("dchdateFrom") || "").trim();
    const dchdateTo = (searchParams.get("dchdateTo") || "").trim();

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

    let ownDoctorCodes: string[] = [];
    let doctorName: string | null = null;
    let doctorCode: string | null = null;

    if (currentRole === "user") {
      if (!loginUser.cid) {
        return emptyDashboardResponse({
          dchdateFrom,
          dchdateTo,
          role: currentRole,
          message: "บัญชีนี้ยังไม่มีเลขบัตรประชาชน",
        });
      }

      const ownDoctors = await prisma.doctor.findMany({
        where: {
          cid: loginUser.cid,
        },
        select: {
          doctorId: true,
          name: true,
        },
      });

      ownDoctorCodes = ownDoctors
        .map((doctor) => doctor.doctorId)
        .filter((code): code is string => Boolean(code));

      doctorName = ownDoctors[0]?.name || null;
      doctorCode = ownDoctors[0]?.doctorId || null;

      if (ownDoctorCodes.length === 0) {
        return emptyDashboardResponse({
          dchdateFrom,
          dchdateTo,
          role: currentRole,
          message: "ไม่พบข้อมูลแพทย์ที่ผูกกับบัญชีนี้",
        });
      }
    }

    const roleFilter: Prisma.medical_chartWhereInput =
      currentRole === "user"
        ? {
            doctor_code: {
              in: ownDoctorCodes,
            },
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

    const filters = [roleFilter, dchdateFilter].filter(
      (filter) => Object.keys(filter).length > 0,
    );

    const where: Prisma.medical_chartWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [total, success, warning] = await prisma.$transaction([
      prisma.medical_chart.count({ where }),

      prisma.medical_chart.count({
        where: {
          AND: [
            where,
            {
              status_chart: "SUCCESS",
            },
          ],
        },
      }),

      prisma.medical_chart.count({
        where: {
          AND: [
            where,
            {
              status_chart: "WARNING",
            },
          ],
        },
      }),
    ]);

    return NextResponse.json({
      total,
      success,
      warning,
      dchdateFrom: dchdateFrom || null,
      dchdateTo: dchdateTo || null,
      role: currentRole,
      doctor_name: doctorName,
      doctor_code: doctorCode,
    });
  } catch (error) {
    console.error("GET DASHBOARD MEDICAL CHART ERROR:", error);

    return NextResponse.json(
      { message: "โหลดข้อมูล Dashboard ไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
