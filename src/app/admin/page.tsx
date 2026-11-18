import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** Not linked from anywhere. Anyone who is not an administrator gets the ordinary 404 page. */
export default function AdminPage() {
  return <AdminPanel />;
}
