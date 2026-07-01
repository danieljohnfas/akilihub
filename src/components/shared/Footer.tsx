import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-muted/20 mt-16">
      <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row justify-between gap-8">
        <div className="space-y-4 max-w-sm">
          <h3 className="text-xl font-bold">AkiliHub</h3>
          <p className="text-sm text-muted-foreground">
            East Africa's unified professional intelligence platform. 
            Providing critical data for professionals across the region.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:gap-16">
          <div className="space-y-4">
            <h4 className="font-semibold">Modules</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/tenders" className="hover:text-primary transition-colors">Procurement</Link></li>
              <li><Link href="/compliance" className="hover:text-primary transition-colors">Compliance</Link></li>
              <li><Link href="/health" className="hover:text-primary transition-colors">Health Data</Link></li>
              <li><Link href="/salaries" className="hover:text-primary transition-colors">Salaries</Link></li>
              <li><Link href="/developers" className="hover:text-primary transition-colors">Dev Tools</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Data Sources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>PPRA (TZ), PPOA (KE)</li>
              <li>DHIS2 (Tanzania MoH)</li>
              <li>WHO AFRO</li>
              <li>BRELA, TRA</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        © 2026 AkiliHub. All rights reserved.
      </div>
    </footer>
  );
}
