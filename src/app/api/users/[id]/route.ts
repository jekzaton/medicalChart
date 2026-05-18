import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

/* -------------------- 🔐 AUTH -------------------- */
async function getCurrentUser(req: Request) {
  const cookieToken = req.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];

  const bearerToken = req.headers.get("authorization")?.replace("Bearer ", "");

  const token = bearerToken || cookieToken;

  if (!token) return null;

  try {
    const decoded: any = verifyToken(token);
    return await prisma.user.findUnique({
      where: { id: decoded.id },
    });
  } catch {
    return null;
  }
}

async function requireAdmin(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  if (user.role !== "admin") {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}

/* -------------------- 🧠 UTIL -------------------- */
async function getId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const userId = Number(id);

  if (!id || isNaN(userId)) return null;

  return userId;
}

/* -------------------- ✅ GET -------------------- */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const userId = await getId(context);
    if (!userId) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET ERROR:", error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

/* -------------------- ✏️ PUT -------------------- */
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const userId = await getId(context);
    if (!userId) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const { password, cid, prefix, firstname, lastname, role, active } = body;

    let updateData: any = {
      cid,
      prefix: prefix ?? "",
      firstname,
      lastname,
      active,
    };

    // 🔒 เปลี่ยน role ได้เฉพาะ admin
    if (auth.user.role === "admin" && role) {
      updateData.role = role;
    }

    // 🔐 hash password
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    let user;
    try {
      user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    } catch (err: any) {
      if (err.code === "P2025") {
        return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
      }
      throw err;
    }

    return NextResponse.json({ message: "อัปเดตสำเร็จ", user });
  } catch (error) {
    console.error("PUT ERROR:", error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

/* -------------------- ❌ DELETE -------------------- */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const userId = await getId(context);
    if (!userId) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    try {
      await prisma.user.delete({
        where: { id: userId },
      });
    } catch (err: any) {
      if (err.code === "P2025") {
        return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
      }
      throw err;
    }

    return NextResponse.json({ message: "ลบผู้ใช้สำเร็จ" });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}

/* -------------------- 🔄 PATCH (toggle active) -------------------- */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const userId = await getId(context);
    if (!userId) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();

    const target = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!target) {
      return NextResponse.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
    }

    // 🔥 กันปิดตัวเอง
    if (auth.user.id === userId && body.active === false) {
      return NextResponse.json(
        { message: "ไม่สามารถปิดการใช้งานตัวเองได้" },
        { status: 400 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        active: body.active,
      },
    });

    return NextResponse.json({
      message: "อัปเดตสำเร็จ",
      user: updated,
    });
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return NextResponse.json({ message: "server error" }, { status: 500 });
  }
}
