import { handle, json, requireBot } from "@/server/http";
import { botJobs } from "@/server/store";

/** What the bot has to do: queued bookings to make, paid auto-book jobs still waiting for a slot, and alert links. */
export async function GET(request: Request) {
  return handle(async () => {
    requireBot(request);
    return json(await botJobs());
  });
}
