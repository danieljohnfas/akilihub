'use client';

import { useState, use, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Bot, User, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Message = { role: 'assistant' | 'user' | 'system', content: string };

export default function InterviewPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const resolvedParams = use(params);
  
  const [status, setStatus] = useState<'idle' | 'generating' | 'interviewing' | 'scoring' | 'done' | 'error'>('idle');
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [scoreData, setScoreData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const startInterview = async () => {
    try {
      setStatus('generating');
      setErrorMsg('');

      const res = await fetch('/api/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: resolvedParams.applicationId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions');

      setQuestions(data.questions);
      setMessages([{ role: 'assistant', content: data.questions[0] }]);
      setStatus('interviewing');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || status !== 'interviewing') return;

    const newMessages: Message[] = [...messages, { role: 'user', content: input.trim() }];
    setMessages(newMessages);
    setInput('');

    if (currentQIndex < questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: questions[nextIdx] }]);
      }, 500); // slight delay for realism
    } else {
      // Finished all questions, score it
      setStatus('scoring');
      try {
        const res = await fetch('/api/interview/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            applicationId: resolvedParams.applicationId,
            transcript: newMessages,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to score interview');

        setScoreData(data.interview);
        setStatus('done');
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message);
        setStatus('error');
      }
    }
  };

  const renderMessage = (msg: Message, i: number) => {
    const isAssistant = msg.role === 'assistant';
    return (
      <div key={i} className={cn("flex w-full mt-4 space-x-3 max-w-2xl", isAssistant ? "ml-0 mr-auto" : "ml-auto mr-0 justify-end")}>
        {isAssistant && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <div className={cn("p-3 rounded-lg text-sm", isAssistant ? "bg-muted text-foreground" : "bg-primary text-primary-foreground")}>
            {msg.content}
          </div>
        </div>
        {!isAssistant && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AI Mock Interview</h1>
        <p className="text-muted-foreground">Answer technical and behavioral questions tailored to your application.</p>
      </div>

      {status === 'idle' || status === 'generating' || (status === 'error' && questions.length === 0) ? (
        <Card className="max-w-md mx-auto mt-12 text-center p-6">
          <div className="flex justify-center mb-4">
            <Bot className="w-16 h-16 text-primary opacity-80" />
          </div>
          <CardTitle className="mb-2">Ready to begin?</CardTitle>
          <CardDescription className="mb-6">
            The AI will ask you 5 questions based on your CV and the job description. Take your time to answer thoroughly.
          </CardDescription>
          {errorMsg && <p className="text-sm text-destructive mb-4">{errorMsg}</p>}
          <Button onClick={startInterview} disabled={status === 'generating'} size="lg" className="w-full">
            {status === 'generating' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Bot className="mr-2 h-5 w-5" />}
            {status === 'generating' ? 'Preparing Questions...' : 'Start Interview'}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh]">
          {/* Chat Interface */}
          <Card className="md:col-span-2 flex flex-col h-full shadow-md overflow-hidden">
            <CardHeader className="bg-muted/50 border-b py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-sm">AI Interviewer</span>
                </div>
                {status === 'interviewing' && (
                  <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-full border">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 bg-background/50">
              {messages.map((msg, i) => renderMessage(msg, i))}
              {status === 'scoring' && (
                <div className="flex items-center gap-2 mt-6 text-muted-foreground text-sm justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating your interview performance...
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            {status === 'interviewing' && (
              <div className="p-4 bg-background border-t">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex items-center gap-2"
                >
                  <Input 
                    placeholder="Type your answer here..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={status !== 'interviewing'}
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit" disabled={!input.trim() || status !== 'interviewing'}>
                    Send
                  </Button>
                </form>
              </div>
            )}
          </Card>

          {/* Sidebar / Score Area */}
          <div className="flex flex-col gap-4 h-full">
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/50 border-b py-3 px-4">
                <CardTitle className="text-sm font-semibold">Evaluation Results</CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex-1 overflow-y-auto">
                {status === 'done' && scoreData ? (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col items-center justify-center space-y-2 mt-4">
                      <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-primary bg-primary/10">
                        <Trophy className="absolute -top-3 w-6 h-6 text-yellow-500 drop-shadow-sm" />
                        <span className="text-4xl font-bold text-primary">{scoreData.finalScore}</span>
                      </div>
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Final Score</span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-sm border-b pb-1">Detailed Feedback</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {scoreData.feedback}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 space-y-3 p-4">
                    <Trophy className="w-12 h-12 opacity-20" />
                    <p className="text-sm">Complete the interview to receive your score and feedback.</p>
                  </div>
                )}
              </CardContent>
              {status === 'done' && (
                <CardFooter className="bg-muted/50 border-t p-4">
                  <Link href="/dashboard" className="w-full">
                    <Button variant="default" className="w-full">
                      Return to Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
