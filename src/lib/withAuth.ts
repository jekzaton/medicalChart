import { getUserFromRequest } from "./auth";

export function withAdmin(handler: Function) {
  return async (req: Request, context: any) => {
    const user = getUserFromRequest(req);

    if (!user)
      return Response.json({ message: "Unauthorized" }, { status: 401 });

    if (user.role !== "admin")
      return Response.json({ message: "Forbidden" }, { status: 403 });

    return handler(req, context, user);
  };
}
