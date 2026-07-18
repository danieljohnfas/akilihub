'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/app/auth/actions';

interface NavUserMenuProps {
  email: string;
}

export function NavUserMenu({ email }: NavUserMenuProps) {
  const initial = email.charAt(0).toUpperCase();
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="relative h-9 w-9 rounded-full border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center outline-none"
            aria-label="User menu"
          >
            <span className="text-sm font-semibold text-primary">
              {initial}
            </span>
          </button>
        }
      />
      <DropdownMenuContent className="min-w-[13rem]" align="end">
        <div className="px-2 py-1.5">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-medium leading-none">Signed in as</p>
            <p className="text-xs leading-none text-muted-foreground truncate max-w-[11rem]">
              {email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/account" className="flex items-center gap-2 w-full cursor-pointer">
              <User className="w-4 h-4" />
              My Account
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 w-full cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-400/10"
          onClick={() => {
            startTransition(() => {
              logout();
            });
          }}
        >
          <LogOut className="w-4 h-4" />
          {isPending ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
