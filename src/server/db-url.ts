/**
 * pg treats sslmode=prefer, require and verify-ca as verify-full, and warns that its next major
 * version will make them weaker. Asking for verify-full keeps today's checking and ends the warning.
 * Any other setting, and an explicit libpq-compatible URL, is left as written.
 */
export function strictSslMode(url: string): string {
  if (/[?&]uselibpqcompat=true(&|$)/.test(url)) return url;
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/, "$1verify-full");
}
