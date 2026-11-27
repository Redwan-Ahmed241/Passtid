import { publishedFeedback } from "@/server/feedback";
import { handle, json } from "@/server/http";

/** Published feedback for the home page. Open to everyone, cached briefly at the edge. */
export async function GET(request: Request) {
  void request.headers; // read per request: the list lives in the database
  return handle(async () => json({ feedback: await publishedFeedback() }, 200, { "Cache-Control": "public, s-maxage=60" }));
}
