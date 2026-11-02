"use server";

import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

type UserRole = "admin" | "user";
type TokenPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
};

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, cid: true, role: true, active: true },
    });
    return user?.active ? user : null;
  } catch {
    return null;
  }
};

const startOfDay = (date: string) => new Date(`${date}T00:00:00.000`);
const endOfDay = (date: string) => new Date(`${date}T23:59:59.999`);

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

    const dchdateFrom = searchParams.get("dchdateFrom")?.trim() || "";
    const dchdateTo = searchParams.get("dchdateTo")?.trim() || "";
    const groupBy = (searchParams.get("groupBy") || "month").toLowerCase(); // day | month | year

    const fromDate = dchdateFrom ? startOfDay(dchdateFrom) : null;
    const toDate = dchdateTo ? endOfDay(dchdateTo) : null;

    const dateFilter: Prisma.medical_chartWhereInput =
      fromDate || toDate
        ? {
            dchdate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {};

    // Role filter
    let roleFilter: Prisma.medical_chartWhereInput = {};
    if (currentRole === "user") {
      if (!loginUser.cid)
        return NextResponse.json({
          total: 0,
          success: 0,
          warning: 0,
          dchdateFrom,
          dchdateTo,
          role: currentRole,
        });
      const ownDoctors = await prisma.doctor.findMany({
        where: { cid: loginUser.cid },
        select: { doctorId: true },
      });
      const ownDoctorCodes = ownDoctors.map((d) => d.doctorId).filter(Boolean);
      roleFilter = { doctor_code: { in: ownDoctorCodes } };
    }

    const filters = [roleFilter, dateFilter].filter(
      (f) => Object.keys(f).length > 0,
    );
    const where: Prisma.medical_chartWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    // Fetch charts
    const charts = await prisma.medical_chart.findMany({
      where,
      select: {
        dchdate: true,
        status_chart: true,
      },
    });

    // Group by day/month/year
    const items: {
      key: string;
      total: number;
      success: number;
      warning: number;
    }[] = [];
    const map = new Map<
      string,
      { total: number; success: number; warning: number }
    >();

    charts.forEach((chart) => {
      if (!chart.dchdate) return;
      const date = new Date(chart.dchdate);
      let key = "";
      if (groupBy === "day")
        key = date.toISOString().split("T")[0]; // YYYY-MM-DD
      else if (groupBy === "month")
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
      else if (groupBy === "year") key = `${date.getFullYear()}`; // YYYY

      if (!map.has(key)) map.set(key, { total: 0, success: 0, warning: 0 });
      const entry = map.get(key)!;
      entry.total += 1;
      entry.success += chart.status_chart === "SUCCESS" ? 1 : 0;
      entry.warning += chart.status_chart === "WARNING" ? 1 : 0;
    });

    map.forEach((value, key) => items.push({ key, ...value }));
    items.sort((a, b) => a.key.localeCompare(b.key));

    const total = charts.length;
    const success = charts.filter((c) => c.status_chart === "SUCCESS").length;
    const warning = charts.filter((c) => c.status_chart === "WARNING").length;

    return NextResponse.json({
      total,
      success,
      warning,
      dchdateFrom: dchdateFrom || null,
      dchdateTo: dchdateTo || null,
      role: currentRole,
      items, // ส่งให้ frontend ทำกราฟ
      groupBy,
    });
  } catch (error) {
    console.error("GET DASHBOARD MEDICAL CHART ERROR:", error);
    return NextResponse.json(
      { message: "โหลดข้อมูล Dashboard ไม่สำเร็จ" },
      { status: 500 },
    );
  }
}
