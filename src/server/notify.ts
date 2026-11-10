/**
 * Tells the administrator about a new support ticket.
 * The ticket always shows in the admin panel; with TELEGRAM_BOT_TOKEN and
 * ADMIN_TELEGRAM_CHAT_ID set, a Telegram message is sent as well. Failures are
 * logged and never block the user.
 */
import type { Ticket } from "@/lib/types";

export function notifyAdminOfTicket(ticket: Ticket): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const text = `New support ticket ${ticket.token}\nFrom: ${ticket.email}\nAbout: ${ticket.category}\n\n${ticket.message}`;
  void fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  }).then(
    (res) => {
      if (!res.ok) console.error("Ticket notification failed", res.status);
    },
    (err) => console.error("Ticket notification failed", err),
  );
}
