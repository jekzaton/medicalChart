"use server";

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

type UserRole = "admin" | "user";

interface TokenPayload {
  id?: string | number;
  userId?: string | number;
  role?: string;
}

const getTokenFromRequest = (req: Request) => {
  const cookieToken = req.headers
    .get("cookie")
    ?.split(";")
    .find((c) => c.trim().startsWith("token="));
  if (cookieToken) return decodeURIComponent(cookieToken.split("=")[1]);
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.replace("Bearer ", "").trim();
  return "";
};

const getLoginUser = async (req: Request) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const userId = Number(payload.id ?? payload.userId);
    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user?.active ? user : null;
  } catch {
    return null;
  }
};

const buildDateFilter = (
  from: string,
  to: string,
): Prisma.medical_chartWhereInput => {
  const fromDate = from ? new Date(`${from}T00:00:00.000`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
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

// --- GET API ---
export async function GET(req: Request) {
  try {
    const loginUser = await getLoginUser(req);
    if (!loginUser)
      return NextResponse.json(
        { message: "กรุณาเข้าสู่ระบบก่อน" },
        { status: 401 },
      );

    const currentRole: UserRole = loginUser.role === "admin" ? "admin" : "user";
    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 10), 1),
      100,
    );

    const appliedSearch = (searchParams.get("search") || "").trim();
    const appliedSearchDoctor = (searchParams.get("searchDoctor") || "").trim();
    const dchdateFrom = (searchParams.get("dchdateFrom") || "").trim();
    const dchdateTo = (searchParams.get("dchdateTo") || "").trim();
    const skip = (page - 1) * limit;

    const roleFilter: Prisma.medical_chartWhereInput =
      currentRole === "user"
        ? {
            doctor_code: {
              in: (
                await prisma.doctor.findMany({
                  where: { cid: loginUser.cid },
                  select: { doctorId: true },
                })
              ).map((d) => d.doctorId),
            },
          }
        : {};

    // --- doctor filter ---
    let doctorCodesFromSearch: string[] = [];
    if (appliedSearchDoctor) {
      const matchedDoctors = await prisma.doctor.findMany({
        where: {
          OR: [
            { doctorId: appliedSearchDoctor }, // exact match
            { license: appliedSearchDoctor }, // exact match
            { name: { contains: appliedSearchDoctor } }, // partial match
          ],
        },
        select: { doctorId: true },
      });
      doctorCodesFromSearch = matchedDoctors.map((d) => d.doctorId);
    }
    const doctorFilter: Prisma.medical_chartWhereInput =
      doctorCodesFromSearch.length > 0
        ? { doctor_code: { in: doctorCodesFromSearch } }
        : {};

    // --- patient search filter ---
    const searchFilter: Prisma.medical_chartWhereInput = appliedSearch
      ? {
          OR: [
            { hn: { contains: appliedSearch } },
            { an: { contains: appliedSearch } },
            { fullname: { contains: appliedSearch } },
          ],
        }
      : {};

    // --- date filter ---
    const dateFilter = buildDateFilter(dchdateFrom, dchdateTo);

    const where: Prisma.medical_chartWhereInput = compactAnd([
      roleFilter,
      doctorFilter,
      searchFilter,
      dateFilter,
    ]);

    const requestedSortBy = (searchParams.get("sortBy") || "dchdate").trim();
    const requestedSortOrder = (searchParams.get("sortOrder") || "desc").trim();

    const allowedSortFields = [
      "hn",
      "an",
      "fullname",
      "regdate",
      "dchdate",
      "doctor_code",
      "ward_name",
      "status_chart",
      "created_at",
      "updated_at",
    ] as const;
    type SortField = (typeof allowedSortFields)[number];
    const sortBy: SortField = allowedSortFields.includes(
      requestedSortBy as SortField,
    )
      ? (requestedSortBy as SortField)
      : "dchdate";
    const sortOrder: Prisma.SortOrder =
      requestedSortOrder.toLowerCase() === "asc" ? "asc" : "desc";

    const [total, medicalCharts] = await prisma.$transaction([
      prisma.medical_chart.count({ where }),
      prisma.medical_chart.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
      }),
    ]);

    const doctorCodes = [
      ...new Set(medicalCharts.map((c) => c.doctor_code).filter(Boolean)),
    ];
    const doctors = await prisma.doctor.findMany({
      where: { doctorId: { in: doctorCodes } },
      select: { id: true, doctorId: true, name: true },
    });
    const doctorMap = new Map(doctors.map((d) => [d.doctorId, d]));

    const data = medicalCharts.map((chart) => ({
      ...chart,
      doctor_name: doctorMap.get(chart.doctor_code)?.name || null,
    }));

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        role: currentRole,
      },
    });
  } catch (err) {
    console.error("GET ERROR Medical Chart:", err);
    return NextResponse.json(
      { message: "Failed to fetch medical charts" },
      { status: 500 },
    );
  }
}
