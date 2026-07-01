'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
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
];

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm AkiliHub's AI. Ask me about tenders, business registrations, health data, or salaries across East Africa.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
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
          'fixed bottom-0 right-0 z-50 h-[90dvh] w-full max-w-sm',
          'flex flex-col bg-background border-l border-t border-white/10 shadow-2xl',
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
            <p className="font-semibold text-sm">AkiliHub AI</p>
            <p className="text-xs text-muted-foreground">East Africa Intelligence</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="shrink-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

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
                onClick={() => sendMessage(prompt)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-white/10">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about tenders, health, salaries..."
            className="flex-1 bg-white/5 border-white/10 focus-visible:ring-primary/50 text-sm"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0 bg-primary hover:bg-primary/90"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </aside>
    </>
  );
}
