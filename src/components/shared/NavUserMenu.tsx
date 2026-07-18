'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/app/auth/actions';

interface NavUserMenuProps {
  email: string;
}

export function NavUserMenu({ email }: NavUserMenuProps) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="relative h-9 w-9 rounded-full border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center"
            aria-label="User menu"
          >
            <span className="text-sm font-semibold text-primary">
              {initial}
            </span>
          </button>
        }
      />
      <DropdownMenuContent className="min-w-[13rem]" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-medium leading-none">Signed in as</p>
            <p className="text-xs leading-none text-muted-foreground truncate max-w-[11rem]">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
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
        <DropdownMenuItem className="p-0">
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-1.5 py-1 text-sm text-red-400 hover:text-red-300 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
