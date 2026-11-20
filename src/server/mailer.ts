import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string; html?: string };

function config() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error("SMTP is not configured (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD).");
  }
  const port = Number(SMTP_PORT);
  return {
    from: SMTP_FROM || SMTP_USER,
    transport: nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit SSL, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    }),
  };
}

/** Sends one email through the configured SMTP account. Throws if SMTP is missing or rejected. */
export async function sendMail({ to, subject, text, html }: Mail) {
  const { from, transport } = config();
  return transport.sendMail({ from, to, subject, text, html });
}
