import { requireAdminPage } from "@/lib/admin/require-admin";

export default async function AdminAiStatusLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <>{children}</>;
}
