import { connection } from "next/server";
import { handle, json, requireUser } from "@/server/http";

export async function GET(request: Request) {
  // Depends on the request's cookie, so never prerender this.
  await connection();
  return handle(() => json(requireUser(request)));
}
