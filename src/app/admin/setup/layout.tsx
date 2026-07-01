// The login and setup pages bypass the admin sidebar layout
// by using their own full-page layout.
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
