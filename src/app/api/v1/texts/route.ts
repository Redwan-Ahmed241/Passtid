import { connection } from "next/server";
import { getTexts } from "@/server/mock-backend";
import { handle, json } from "@/server/http";

/** Texts an administrator has changed. Public: every visitor's page applies them. */
export async function GET() {
  await connection();
  return handle(() => json(getTexts()));
}
