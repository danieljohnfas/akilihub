'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

export const navLinks = [
  { href: '/tenders', label: 'Tenders', icon: 'solar:document-text-bold-duotone' },
  { href: '/jobs', label: 'Jobs', icon: 'solar:case-round-bold-duotone' },
  { href: '/compliance', label: 'Compliance', icon: 'solar:shield-check-bold-duotone' },
  { href: '/health', label: 'Health', icon: 'solar:heart-pulse-bold-duotone' },
  { href: '/salaries', label: 'Salaries', icon: 'solar:wallet-money-bold-duotone' },
];

export function DesktopNav() {
  const pathname = usePathname();
  
  return (
    <nav className="hidden lg:flex gap-4 xl:gap-6">
      {navLinks.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground whitespace-nowrap ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon icon={link.icon} className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-primary/70'}`} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNavLinks() {
  const pathname = usePathname();
  
  return (
    <>
      {navLinks.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 text-lg font-medium transition-colors hover:text-foreground ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon icon={link.icon} className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-primary/70'}`} />
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
