// src/lib/withAuth.ts
import { getUserFromRequest } from "./auth";
import type { TokenPayload } from "./jwt";

type AdminHandler<TContext = unknown> = (
  req: Request,
  context: TContext,
  user: TokenPayload,
) => Response | Promise<Response>;

export function withAdmin<TContext = unknown>(handler: AdminHandler<TContext>) {
  return async (req: Request, context: TContext): Promise<Response> => {
    const user = getUserFromRequest(req);

    if (!user) {
      return Response.json(
        {
          message: "Unauthorized",
          reason: "ไม่พบ token หรือ token ไม่ถูกต้อง",
        },
        { status: 401 },
      );
    }

    if (user.role !== "admin") {
      return Response.json(
        {
          message: "Forbidden",
          reason: "บัญชีนี้ไม่มีสิทธิ์ admin",
        },
        { status: 403 },
      );
    }

    return handler(req, context, user);
  };
}
