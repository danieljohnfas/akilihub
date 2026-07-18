import Link from 'next/link';
import { Menu, LogOut, User } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@iconify/react';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/auth/actions';

const navLinks = [
  { href: '/tenders', label: 'Tenders', icon: 'solar:document-text-bold-duotone' },
  { href: '/jobs', label: 'Jobs', icon: 'solar:case-round-bold-duotone' },
  { href: '/compliance', label: 'Compliance', icon: 'solar:shield-check-bold-duotone' },
  { href: '/health', label: 'Health Data', icon: 'solar:heart-pulse-bold-duotone' },
  { href: '/salaries', label: 'Salaries', icon: 'solar:wallet-money-bold-duotone' },
  { href: '/developers', label: 'Dev Tools', icon: 'solar:code-circle-bold-duotone' },
];

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <Logo className="h-6 w-6" />
            <span className="font-bold text-xl inline-block">AkiliBrain</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon icon={link.icon} className="w-4 h-4 text-primary/70" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <GlobalSearch />
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger 
                  render={
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/20 text-primary font-medium text-xs">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  }
                />
                <DropdownMenuContent className="!w-56 min-w-[14rem]" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Account</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    render={
                      <Link href="/account" className="cursor-pointer w-full flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        My Account
                      </Link>
                    }
                  />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-400/10">
                    <form action={logout} className="w-full">
                      <button type="submit" className="w-full flex items-center gap-2 cursor-pointer">
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </form>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            )}
          </div>
          
          <Sheet>
            <SheetTrigger 
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 text-lg font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Icon icon={link.icon} className="w-5 h-5 text-primary/70" />
                    {link.label}
                  </Link>
                ))}
                
                <div className="mt-4 pt-4 border-t border-white/10">
                  {user ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {user.email}
                      </div>
                      <Link href="/account" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                        <User className="w-4 h-4" />
                        My Account
                      </Link>
                      <form action={logout}>
                        <Button className="w-full" variant="outline" type="submit">Sign Out</Button>
                      </form>
                    </div>
                  ) : (
                    <Link href="/login" className="block w-full">
                      <Button className="w-full" variant="outline">Sign In</Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
