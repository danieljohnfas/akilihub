'use client';

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

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
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => {
                  const href = props.href || '';
                  if (href.startsWith('/')) {
                    return <Link href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{props.children}</Link>;
                  }
                  return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2" />;
                },
                p: ({ node, ...props }) => <p {...props} className="whitespace-pre-wrap mb-2 last:mb-0" />,
                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 space-y-1 mb-2" />,
                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 space-y-1 mb-2" />,
                li: ({ node, ...props }) => <li {...props} className="marker:text-muted-foreground" />,
                strong: ({ node, ...props }) => <strong {...props} className="font-semibold text-foreground" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <p className={cn('text-[10px] mt-1.5', isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
