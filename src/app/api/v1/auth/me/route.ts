import { connection } from "next/server";
import { userExists } from "@/server/auth";
import { ApiError } from "@/server/errors";
import { handle, json, requireUser } from "@/server/http";

export async function GET(request: Request) {
  // Depends on the request's cookie, so never prerender this.
  await connection();
  return handle(async () => {
    const user = requireUser(request);
    // A valid cookie for an account that was deleted is no longer a session.
    if (!(await userExists(user.id))) throw new ApiError(401, "unauthenticated", "Sign in to continue.");
    return json(user);
  });
}
