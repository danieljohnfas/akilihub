'use client';

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn('flex gap-3 w-full', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
        isUser 
          ? 'bg-primary/20 border-primary/30 text-primary' 
          : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      {/* Bubble */}
      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser 
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-white/5 border border-white/10 text-foreground rounded-tl-sm'
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={cn('text-[10px] mt-1.5', isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
