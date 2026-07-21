import Link from 'next/link';
import { Logo } from '@/components/shared/Logo';
import { Twitter, Linkedin, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 mt-16 backdrop-blur-md">
      <div className="container mx-auto px-4 py-16 flex flex-col lg:flex-row justify-between gap-12">
        <div className="space-y-6 max-w-sm">
          <div className="flex items-center space-x-2">
            <Logo className="h-7 w-7" />
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">AkiliBrain</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            East Africa's unified professional intelligence platform.
            Providing critical data for professionals across the region.
          </p>
          <div className="flex items-center gap-4">
            <Link href="https://twitter.com/akilibrain" target="_blank" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-primary transition-all">
              <Twitter className="w-4 h-4" />
            </Link>
            <Link href="https://linkedin.com/company/akilibrain" target="_blank" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:text-primary transition-all">
              <Linkedin className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground/50 border-t border-white/5 pt-4 mt-2">
            Independent platform. Not affiliated with or endorsed by any government body.
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:flex-1">
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Modules</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/tenders" className="hover:text-primary transition-colors flex items-center gap-2">Procurement</Link></li>
              <li><Link href="/jobs" className="hover:text-primary transition-colors flex items-center gap-2">Jobs</Link></li>
              <li><Link href="/compliance" className="hover:text-primary transition-colors flex items-center gap-2">Compliance</Link></li>
              <li><Link href="/health" className="hover:text-primary transition-colors flex items-center gap-2">Health Data</Link></li>
              <li><Link href="/salaries" className="hover:text-primary transition-colors flex items-center gap-2">Salaries</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div className="space-y-4 col-span-2 md:col-span-1">
            <h4 className="font-semibold text-white">Data Sources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="https://ppra.go.tz" target="_blank" className="hover:text-white transition-colors underline decoration-white/20 underline-offset-4">PPRA (TZ)</Link> / <Link href="https://tenders.go.ke" target="_blank" className="hover:text-white transition-colors underline decoration-white/20 underline-offset-4">PPIP (KE)</Link></li>
              <li><Link href="https://who.int" target="_blank" className="hover:text-white transition-colors underline decoration-white/20 underline-offset-4">WHO AFRO</Link> / World Bank</li>
              <li><Link href="https://brela.go.tz" target="_blank" className="hover:text-white transition-colors underline decoration-white/20 underline-offset-4">BRELA</Link> / <Link href="https://kra.go.ke" target="_blank" className="hover:text-white transition-colors underline decoration-white/20 underline-offset-4">KRA</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="space-y-4 max-w-sm w-full bg-white/5 p-6 rounded-2xl border border-white/10">
          <h4 className="font-semibold text-white text-lg">Stay Ahead</h4>
          <p className="text-sm text-muted-foreground">
            Get a weekly digest of the top East African tenders and high-paying jobs.
          </p>
          <form className="flex gap-2 mt-2" action="/api/subscribe" method="POST">
            <Input 
              type="email" 
              name="email" 
              placeholder="Email address..." 
              required 
              className="bg-black/20 border-white/10 focus-visible:ring-primary/50"
            />
            <Button type="submit" size="icon" className="shrink-0 transition-transform active:scale-95">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground/60">No spam. Unsubscribe at any time.</p>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-sm text-muted-foreground bg-black/20">
        © {new Date().getFullYear()} AkiliBrain. All rights reserved.
      </div>
    </footer>
  );
}
