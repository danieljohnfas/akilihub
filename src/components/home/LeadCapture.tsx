'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function LeadCapture() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      toast.success("You're subscribed!");
    }, 800);
  };

  if (success) {
    return (
      <div className="flex items-center justify-center gap-2 text-emerald-500 bg-emerald-500/10 py-3 px-6 rounded-full mx-auto w-fit border border-emerald-500/20">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">Subscribed to weekly reports!</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto w-full pt-4">
      <div className="relative w-full">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          type="email" 
          placeholder="Enter your email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="pl-9 rounded-full bg-white/5 border-white/10 h-12"
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full sm:w-auto rounded-full h-12 px-6">
        {loading ? "Subscribing..." : "Get Weekly Reports"}
      </Button>
    </form>
  );
}
