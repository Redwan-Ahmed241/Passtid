import { handle, json } from "@/server/http";
import { clearedCookie } from "@/server/session";

export async function POST() {
  return handle(() => json({ ok: true }, 200, { "Set-Cookie": clearedCookie() }));
}
