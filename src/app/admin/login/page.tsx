'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Lock, KeyRound, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

type Step = 'password' | 'totp';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setStep('totp');
    setError('');
  };

  const handleDigitChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) digitRefs.current[idx + 1]?.focus();
    if (next.every(d => d !== '')) {
      submitTotp(next.join(''));
    }
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      submitTotp(pasted);
    }
  };

  const submitTotp = async (totpCode: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, code: totpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/admin');
      } else {
        setError(data.error || 'Login failed');
        setCode(['', '', '', '', '', '']);
        digitRefs.current[0]?.focus();
        triggerShake();
      }
    } catch {
      setError('Network error');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">AkiliBrain Admin</h1>
          <p className="text-white/40 text-sm mt-1">
            {step === 'password' ? 'Sign in to your admin panel' : 'Enter your authenticator code'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 'password' ? 'bg-indigo-500' : 'bg-indigo-500/30'}`} />
          <div className={`h-1 w-12 rounded-full transition-colors ${step === 'totp' ? 'bg-indigo-500' : 'bg-white/10'}`} />
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm">
          {step === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Admin Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={!password}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-all text-sm"
              >
                Continue
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                Open your authenticator app and enter the 6-digit code
              </div>

              {/* OTP boxes */}
              <div
                className={`flex gap-2 justify-center ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
                style={{ animation: shake ? 'shake 0.4s ease-in-out' : undefined }}
              >
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { digitRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleDigitChange(idx, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(idx, e)}
                    onPaste={handlePaste}
                    autoFocus={idx === 0}
                    className="w-11 h-13 text-center text-lg font-bold bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all py-3 caret-indigo-400"
                  />
                ))}
              </div>
              <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }`}</style>

              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => { setStep('password'); setError(''); setCode(['','','','','','']); }}
                className="w-full text-white/30 hover:text-white/60 text-xs transition-colors py-1"
              >
                ← Back to password
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          First time? <a href="/admin/setup" className="text-indigo-400 hover:text-indigo-300 transition-colors">Complete setup →</a>
        </p>
      </div>
    </div>
  );
}
