'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, QrCode, Copy, Check, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

type Step = 'loading' | 'qr' | 'confirm' | 'done';

export default function AdminSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch('/api/admin/setup')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setSecret(data.secret);
        setQrDataUrl(data.qrDataUrl);
        setStep('qr');
      })
      .catch(() => setError('Failed to load setup. Try refreshing.'));
  }, []);

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDigitChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) setCode(pasted.split(''));
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    const totpCode = code.join('');
    if (totpCode.length < 6) { setError('Please enter the full 6-digit code'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code: totpCode, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('done');
        setTimeout(() => router.push('/admin/login'), 2500);
      } else {
        setError(data.error || 'Verification failed');
        setCode(['', '', '', '', '', '']);
        digitRefs.current[0]?.focus();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">Admin Setup</h1>
          <p className="text-white/40 text-sm mt-1">One-time configuration — takes 2 minutes</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm space-y-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-white/40 text-sm">Generating your secret key…</p>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
          )}

          {step === 'qr' && (
            <>
              {/* Step 1: Scan QR */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">1</span>
                  <h2 className="text-white font-medium text-sm">Scan with your authenticator app</h2>
                </div>
                <p className="text-white/40 text-xs mb-4 ml-8">Google Authenticator, Authy, 1Password, or any TOTP app.</p>
                <div className="flex justify-center">
                  {qrDataUrl && (
                    <div className="bg-white p-3 rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt="TOTP QR Code" className="w-44 h-44" />
                    </div>
                  )}
                </div>
              </div>

              {/* Manual entry fallback */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs font-bold flex items-center justify-center">2</span>
                  <h2 className="text-white/40 font-medium text-sm">Or enter this key manually</h2>
                </div>
                <div className="ml-8 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <code className="text-indigo-300 text-xs font-mono flex-1 break-all">{secret}</code>
                  <button onClick={copySecret} className="text-white/40 hover:text-white/80 transition-colors shrink-0">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('confirm')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-all text-sm"
              >
                I&apos;ve scanned it →
              </button>
            </>
          )}

          {step === 'confirm' && (
            <form onSubmit={handleConfirm} className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">3</span>
                  <h2 className="text-white font-medium text-sm">Set your admin password</h2>
                </div>
                <div className="space-y-3 ml-8">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="New password (min 8 chars)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center justify-center">4</span>
                  <h2 className="text-white font-medium text-sm">Confirm your authenticator code</h2>
                </div>
                <div className="flex gap-2 justify-center ml-8">
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
                      className="w-10 text-center text-lg font-bold bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all py-2.5"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Complete Setup
              </button>

              <button type="button" onClick={() => setStep('qr')} className="w-full text-white/30 hover:text-white/60 text-xs transition-colors">
                ← Back to QR code
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-white font-bold text-lg">Setup Complete!</h2>
              <p className="text-white/40 text-sm text-center">Your admin panel is secured. Redirecting to login…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
