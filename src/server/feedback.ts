/**
 * Customer feedback. A customer writes it, decides whether it may be shown, and an administrator
 * publishes or hides it. The administrator cannot change the customer's words.
 */
import type { AdminFeedback, Feedback, FeedbackInput, FeedbackStatus, MyFeedbackResponse, PublicFeedback } from "@/lib/types";
import { query } from "./db";
import { ApiError } from "./errors";
import { paidSessionPattern } from "./payments";

interface Row {
  user_id: string;
  rating: number;
  message: string;
  display_name: string;
  allow_public: boolean;
  status: FeedbackStatus;
  updated_at: Date;
}

const COLUMNS = "user_id, rating, message, display_name, allow_public, status, updated_at";

const toFeedback = (r: Row): Feedback => ({
  rating: r.rating,
  message: r.message,
  name: r.display_name,
  allowPublic: r.allow_public,
  status: r.status,
  updatedAt: r.updated_at.toISOString(),
});

async function hasPaid(userId: string): Promise<boolean> {
  const rows = await query("select 1 from payments where user_id = $1 and session_id like $2 limit 1", [userId, paidSessionPattern()]);
  return rows.length > 0;
}

export async function myFeedback(userId: string): Promise<MyFeedbackResponse> {
  const [row] = await query<Row>(`select ${COLUMNS} from feedback where user_id = $1`, [userId]);
  return { eligible: await hasPaid(userId), feedback: row ? toFeedback(row) : null };
}

/** Writing again replaces the earlier feedback, which then has to be reviewed again. */
export async function saveFeedback(userId: string, input: FeedbackInput): Promise<Feedback> {
  if (!(await hasPaid(userId))) throw new ApiError(403, "not_a_customer", "Feedback is for customers who have paid for a plan.");
  const [row] = await query<Row>(
    `insert into feedback (user_id, rating, message, display_name, allow_public) values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set rating = excluded.rating, message = excluded.message,
       display_name = excluded.display_name, allow_public = excluded.allow_public, status = 'waiting', updated_at = now()
     returning ${COLUMNS}`,
    [userId, input.rating, input.message, input.name, input.allowPublic],
  );
  return toFeedback(row);
}

export async function publishedFeedback(): Promise<PublicFeedback[]> {
  const rows = await query<Row>(
    `select ${COLUMNS} from feedback where status = 'published' and allow_public order by updated_at desc limit 12`,
  );
  return rows.map((r) => ({ rating: r.rating, message: r.message, name: r.display_name, updatedAt: r.updated_at.toISOString() }));
}

export async function adminFeedback(): Promise<AdminFeedback[]> {
  const rows = await query<Row & { email: string }>(
    `select f.user_id, f.rating, f.message, f.display_name, f.allow_public, f.status, f.updated_at, u.email
       from feedback f join users u on u.id = f.user_id
      order by (f.status = 'waiting') desc, f.updated_at desc`,
  );
  return rows.map((r) => ({ ...toFeedback(r), clientId: r.user_id, email: r.email }));
}

/** Erase one customer's feedback, for when they ask for it to be deleted. */
export async function adminDeleteFeedback(userId: string): Promise<void> {
  const rows = await query("delete from feedback where user_id = $1 returning user_id", [userId]);
  if (!rows.length) throw new ApiError(404, "feedback_not_found", "No such feedback.");
}

/** `seenAt` is the version the administrator read, so words changed since then are never published unread. */
export async function adminSetFeedbackStatus(userId: string, status: FeedbackStatus, seenAt: string): Promise<Feedback> {
  const [row] = await query<Row>(
    `update feedback set status = $2
      where user_id = $1 and date_trunc('milliseconds', updated_at) = $3::timestamptz and (allow_public or $2 <> 'published')
      returning ${COLUMNS}`,
    [userId, status, seenAt],
  );
  if (!row) throw new ApiError(409, "feedback_changed", "This feedback changed while you were looking at it. Refresh and try again.");
  return toFeedback(row);
}
