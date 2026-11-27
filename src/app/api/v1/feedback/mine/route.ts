import { MAX_FEEDBACK_MESSAGE, MAX_FEEDBACK_NAME } from "@/lib/types";
import { cleanLine, cleanMultiline } from "@/lib/sanitize";
import { myFeedback, saveFeedback } from "@/server/feedback";
import { errorJson, handle, json, rateLimit, readJson, requireUser } from "@/server/http";

export async function GET(request: Request) {
  return handle(async () => json(await myFeedback((await requireUser(request)).id)));
}

export async function PUT(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    rateLimit(request, "feedback", 10, 60 * 60 * 1000, user.id);
    const body = (await readJson(request)) as { rating?: unknown; message?: unknown; name?: unknown; allowPublic?: unknown };
    const rating = body.rating;
    const message = cleanMultiline(body.message, MAX_FEEDBACK_MESSAGE + 1);
    const name = cleanLine(body.name, MAX_FEEDBACK_NAME + 1);
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return errorJson(422, "invalid_rating", "Choose a rating from 1 to 5.");
    }
    if (message.length < 10) return errorJson(422, "message_too_short", "Write at least a short sentence.");
    if (message.length > MAX_FEEDBACK_MESSAGE) return errorJson(422, "message_too_long", "The message is too long.");
    if (!name || name.length > MAX_FEEDBACK_NAME) return errorJson(422, "invalid_name", "Enter the name to show, up to 40 characters.");
    return json(await saveFeedback(user.id, { rating, message, name, allowPublic: body.allowPublic === true }));
  });
}
