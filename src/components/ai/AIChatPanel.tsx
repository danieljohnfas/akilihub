'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Paperclip, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChatMessage, Message } from './ChatMessage';

const SUGGESTED_PROMPTS = [
  "Latest IT tenders in Tanzania",
  "Is ACME Ltd registered with BRELA?",
  "Maternal health stats in Kenya",
  "Senior engineer salary in Nairobi",
  "Match jobs to my CV",
];

type CvState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'ready'; filename: string; text: string }
  | { status: 'error'; message: string };

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm AkiliBrain's AI assistant. Ask me about tenders, business registrations, health data, or salaries across East Africa.\n\n📎 You can also **upload your CV** (PDF or TXT) and I'll find the best matching jobs for you!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cvState, setCvState] = useState<CvState>({ status: 'idle' });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.ok ? data.response : (data.error || 'Something went wrong. Please try again.'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      // Re-focus input so user knows they can continue typing
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading]);

  const handleCvUpload = useCallback(async (file: File) => {
    setCvState({ status: 'uploading' });

    try {
      const formData = new FormData();
      formData.append('cv', file);

      const res = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setCvState({ status: 'error', message: data.error || 'Failed to process CV.' });
        return;
      }

      setCvState({ status: 'ready', filename: data.filename, text: data.text });

      // Auto-send the CV for job matching
      const cvQuery = `Here is my CV — please find the best matching jobs for me from your database:\n\n${data.text.substring(0, 8000)}`;
      await sendMessage(cvQuery);

    } catch {
      setCvState({ status: 'error', message: 'Upload failed. Please try pasting your CV as text.' });
    }
  }, [sendMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCvUpload(file);
      // Reset input so the same file can be re-uploaded
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload CV"
      />

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant"
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl',
          'bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center',
          'transition-all duration-300 hover:scale-110 hover:shadow-primary/40',
          'ring-2 ring-white/10',
          isOpen && 'opacity-0 pointer-events-none scale-90'
        )}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <aside
        className={cn(
          'fixed bottom-0 right-0 z-[51] h-[90dvh] w-full max-w-sm',
          'flex flex-col bg-background border-l border-t border-white/10 shadow-2xl overflow-hidden',
          'rounded-tl-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-y-0 translate-x-0' : 'translate-y-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">AkiliBrain AI</p>
            <p className="text-xs text-muted-foreground">East Africa Intelligence</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* CV Status Banner */}
        {cvState.status !== 'idle' && (
          <div className={cn(
            'mx-3 mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs',
            cvState.status === 'uploading' && 'bg-blue-500/10 border border-blue-500/20 text-blue-400',
            cvState.status === 'ready' && 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
            cvState.status === 'error' && 'bg-red-500/10 border border-red-500/20 text-red-400',
          )}>
            {cvState.status === 'uploading' && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading your CV...</>}
            {cvState.status === 'ready' && <><CheckCircle2 className="w-3.5 h-3.5" /> CV loaded: {cvState.filename}</>}
            {cvState.status === 'error' && <><AlertCircle className="w-3.5 h-3.5" /> {cvState.message}</>}
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex gap-1.5 items-center bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Suggested Prompts */}
        {messages.length <= 1 && !isLoading && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map(prompt => (
              <button
                key={prompt}
                onClick={() => prompt === 'Match jobs to my CV' ? fileInputRef.current?.click() : sendMessage(prompt)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border border-white/10 transition-colors text-left",
                  prompt === 'Match jobs to my CV'
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    : 'bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground'
                )}
              >
                {prompt === 'Match jobs to my CV' ? '📎 ' : ''}{prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-3 border-t border-white/10">
          {/* CV Upload Button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || cvState.status === 'uploading'}
            title="Upload your CV (PDF or TXT)"
            className="shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            {cvState.status === 'uploading'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : cvState.status === 'ready'
              ? <FileText className="w-4 h-4 text-emerald-400" />
              : <Paperclip className="w-4 h-4" />
            }
          </Button>

          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={cvState.status === 'ready' ? 'Ask a follow-up about your results…' : 'Ask anything, or upload your CV…'}
            className="flex-1 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-sm"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className={cn(
              'shrink-0 transition-all duration-200',
              input.trim() && !isLoading
                ? 'bg-primary hover:bg-primary/90 opacity-100'
                : 'bg-primary/30 opacity-50 cursor-not-allowed'
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </aside>
    </>
  );
}
