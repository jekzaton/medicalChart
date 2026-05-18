import { NextResponse } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type TokenPayload = {
  id?: number | string;
  userId?: number | string;
  sub?: number | string;
  role?: string;
};

const booleanSchema = z.preprocess((value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return value;
}, z.boolean());

const doctorUpdateSchema = z.object({
  doctorId: z.string().trim().min(1, "กรอกรหัสแพทย์"),
  name: z.string().trim().min(1, "กรอกชื่อ-สกุล"),
  license: z.string().trim().min(1, "กรอกใบประกอบวิชาชีพ"),
  cid: z
    .string()
    .trim()
    .length(13, "เลขบัตรประชาชนต้อง 13 หลัก")
    .regex(/^\d+$/, "ต้องเป็นตัวเลขเท่านั้น"),
  active: booleanSchema.default(true),
  line_active: booleanSchema.default(true),
});

const doctorPatchSchema = doctorUpdateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "ไม่มีข้อมูลสำหรับอัปเดต",
  });

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

const getCurrentUser = async (req: Request) => {
  const token = getTokenFromRequest(req);

  if (!token) return null;

  try {
    const decoded = verifyToken(token) as TokenPayload;
    const userId = getUserIdFromPayload(decoded);

    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) return null;

    return user;
  } catch {
    return null;
  }
};

const requireAdmin = async (req: Request) => {
  const user = await getCurrentUser(req);

  if (!user) {
    return {
      error: NextResponse.json(
        { message: "กรุณาเข้าสู่ระบบก่อน" },
        { status: 401 },
      ),
    };
  }

  if (user.role !== "admin") {
    return {
      error: NextResponse.json(
        { message: "ไม่มีสิทธิ์ใช้งานส่วนนี้" },
        { status: 403 },
      ),
    };
  }

  return { user, error: null };
};

const getId = async (context: RouteContext) => {
  const params = await context.params;
  const id = Number(params.id);

  return Number.isInteger(id) && id > 0 ? id : null;
};

const getPrismaUniqueMessage = (target?: unknown) => {
  const fields = Array.isArray(target)
    ? target.map(String)
    : [String(target || "")];

  if (fields.some((field) => field.includes("doctorId"))) {
    return { message: "รหัสแพทย์นี้มีในระบบแล้ว", field: "doctorId" };
  }

  if (fields.some((field) => field.includes("cid"))) {
    return { message: "เลขบัตรประชาชนนี้มีในระบบแล้ว", field: "cid" };
  }

  if (fields.some((field) => field.includes("license"))) {
    return { message: "เลขใบประกอบวิชาชีพนี้มีในระบบแล้ว", field: "license" };
  }

  return { message: "ข้อมูลซ้ำในระบบ", field: "unknown" };
};

const buildUpdateData = (
  data: z.infer<typeof doctorPatchSchema>,
): Prisma.doctorUpdateInput => {
  const updateData: Prisma.doctorUpdateInput = {};

  if (data.doctorId !== undefined) updateData.doctorId = data.doctorId.trim();
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.cid !== undefined) updateData.cid = data.cid.trim();
  if (data.license !== undefined) updateData.license = data.license.trim();
  if (data.active !== undefined) {
    updateData.active = data.active;

    if (data.active === false) {
      updateData.line_active = false;
    }
  }

  if (data.line_active !== undefined && data.active !== false) {
    updateData.line_active = data.line_active;
  }

  return updateData;
};

const checkDuplicateDoctor = async ({
  id,
  doctorId,
  cid,
  license,
}: {
  id: number;
  doctorId?: string;
  cid?: string;
  license?: string;
}) => {
  const orConditions: Prisma.doctorWhereInput[] = [];

  if (doctorId) orConditions.push({ doctorId });
  if (cid) orConditions.push({ cid });
  if (license) orConditions.push({ license });

  if (orConditions.length === 0) return null;

  const duplicate = await prisma.doctor.findFirst({
    where: {
      id: {
        not: id,
      },
      OR: orConditions,
    },
    select: {
      doctorId: true,
      cid: true,
      license: true,
    },
  });

  if (!duplicate) return null;

  if (doctorId && duplicate.doctorId === doctorId) {
    return { message: "รหัสแพทย์นี้มีในระบบแล้ว", field: "doctorId" };
  }

  if (cid && duplicate.cid === cid) {
    return { message: "เลขบัตรประชาชนนี้มีในระบบแล้ว", field: "cid" };
  }

  if (license && duplicate.license === license) {
    return { message: "เลขใบประกอบวิชาชีพนี้มีในระบบแล้ว", field: "license" };
  }

  return { message: "ข้อมูลแพทย์มีในระบบแล้ว", field: "unknown" };
};

// GET /api/doctors/[id]
export async function GET(req: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      select: {
        id: true,
        doctorId: true,
        name: true,
        cid: true,
        license: true,
        active: true,
        line_active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ message: "ไม่พบแพทย์" }, { status: 404 });
    }

    return NextResponse.json(doctor);
  } catch (error) {
    console.error("GET ERROR Doctor ID:", error);

    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

// PUT /api/doctors/[id]
export async function PUT(req: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const result = doctorUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = result.data;

    const duplicate = await checkDuplicateDoctor({
      id,
      doctorId: data.doctorId,
      cid: data.cid,
      license: data.license,
    });

    if (duplicate) {
      return NextResponse.json(duplicate, { status: 400 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: buildUpdateData(data),
    });

    return NextResponse.json({
      message: "อัปเดตข้อมูลแพทย์สำเร็จ",
      doctor,
    });
  } catch (error) {
    console.error("PUT ERROR Doctor ID:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "ไม่พบแพทย์" }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(getPrismaUniqueMessage(error.meta?.target), {
        status: 400,
      });
    }

    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

// PATCH /api/doctors/[id]
// ใช้สำหรับ toggle active / line_active หรือแก้บาง field
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const result = doctorPatchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "ข้อมูลไม่ถูกต้อง",
          errors: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = result.data;

    const duplicate = await checkDuplicateDoctor({
      id,
      doctorId: data.doctorId,
      cid: data.cid,
      license: data.license,
    });

    if (duplicate) {
      return NextResponse.json(duplicate, { status: 400 });
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: buildUpdateData(data),
    });

    return NextResponse.json({
      message: "อัปเดตสำเร็จ",
      doctor,
    });
  } catch (error) {
    console.error("PATCH ERROR Doctor ID:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "ไม่พบแพทย์" }, { status: 404 });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(getPrismaUniqueMessage(error.meta?.target), {
        status: 400,
      });
    }

    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

// DELETE /api/doctors/[id]
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    await prisma.doctor.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "ลบข้อมูลแพทย์สำเร็จ",
    });
  } catch (error) {
    console.error("DELETE ERROR Doctor ID:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ message: "ไม่พบแพทย์" }, { status: 404 });
    }

    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}
