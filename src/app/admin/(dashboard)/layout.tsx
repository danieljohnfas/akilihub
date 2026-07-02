import Link from 'next/link';
import { Brain, LayoutDashboard, FileText, ShieldCheck, Activity, Banknote, Settings, LogOut } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tenders', label: 'Tenders', icon: FileText },
  { href: '/admin/compliance', label: 'Compliance', icon: ShieldCheck },
  { href: '/admin/health', label: 'Health Data', icon: Activity },
  { href: '/admin/salaries', label: 'Salaries', icon: Banknote },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0d0d14]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">AkiliBrain</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all text-sm font-medium group"
            >
              <Icon className="w-4 h-4 group-hover:text-indigo-400 transition-colors" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium w-full group"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
