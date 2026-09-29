import { requireAdminPage } from "@/lib/admin/require-admin";

// Defence in depth: this route lives outside the (dashboard) layout, so it must
// verify the admin session itself instead of relying on middleware alone.
export default async function AdminResolveLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return <>{children}</>;
}
