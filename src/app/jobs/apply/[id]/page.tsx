'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, Download, Lock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'evaluating' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoadingAuth(false);
    };
    checkAuth();
  }, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleApply = async () => {
    if (!file) return;

    try {
      setStatus('uploading');
      setErrorMsg('');

      // 1. Upload CV
      const formData = new FormData();
      formData.append('cv', file);
      
      const uploadRes = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData,
      });
      
      const uploadData = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload CV');
      }

      setStatus('evaluating');

      // 2. Evaluate CV & Generate Cover Letter
      const evalRes = await fetch('/api/applications/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: id,
          cvText: uploadData.text,
          cvUrl: uploadData.documentId,
        }),
      });

      const evalData = await evalRes.json();

      if (!evalRes.ok) {
        throw new Error(evalData.error || 'Evaluation failed');
      }

      setResult(evalData.application);
      setStatus('success');
      
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error.message);
    }
  };

  const downloadCoverLetterText = () => {
    if (!result?.coverLetter) return;
    const blob = new Blob([result.coverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Cover_Letter.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingAuth) {
    return (
      <div className="container py-24 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-24 max-w-xl mx-auto space-y-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-muted rounded-full">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Login Required</h1>
        <p className="text-muted-foreground text-lg">
          Please sign in or create an account to use the AI Job Assistant and evaluate your CV.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link href={`/login?callbackUrl=/jobs/apply/${id}`}>
            <Button size="lg">Log In</Button>
          </Link>
          <Link href={`/signup?callbackUrl=/jobs/apply/${id}`}>
            <Button size="lg" variant="outline">Sign Up</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">AI Job Application</h1>
        <p className="text-muted-foreground">Upload your CV to get a tailored cover letter and AI match score.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Upload Your Resume</CardTitle>
          <CardDescription>We accept PDF or Plain Text files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="cv">Resume File</Label>
            <Input id="cv" type="file" accept=".pdf,.txt" onChange={handleFileChange} disabled={status !== 'idle' && status !== 'error'} />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleApply} 
            disabled={!file || status === 'uploading' || status === 'evaluating'}
            className="w-full sm:w-auto"
          >
            {status === 'uploading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'evaluating' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'idle' || status === 'error' ? 'Analyze & Apply' : status === 'uploading' ? 'Extracting CV...' : 'Evaluating Fit...'}
          </Button>
        </CardFooter>
      </Card>

      {status === 'success' && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                Analysis Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-background rounded-full w-24 h-24 border-4 border-primary shadow-inner">
                  <span className="text-3xl font-bold text-primary">{result.score}</span>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Score</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Match Feedback</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{result.matchAnalysis}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Tailored Cover Letter</CardTitle>
                <CardDescription>Generated specifically for this role using your CV.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadCoverLetterText}>
                <Download className="w-4 h-4 mr-2" />
                Download TXT
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-md whitespace-pre-wrap font-serif text-sm leading-relaxed border shadow-inner max-h-[400px] overflow-y-auto">
                {result.coverLetter}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/50 border-t p-4">
              <p className="text-sm text-muted-foreground">Ready for the next step?</p>
              <Link href={`/dashboard/interviews/${result.id}`}>
                <Button>Start Mock Interview</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
