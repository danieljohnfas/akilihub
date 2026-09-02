'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';

export function CVMatcher() {
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setIsUploading(true);
    setStatusText('Extracting skills from CV...');
    
    try {
      // 1. Upload CV
      const formData = new FormData();
      formData.append('cv', file);

      const uploadRes = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        let errMessage = 'Failed to parse CV document.';
        try {
          const errData = await uploadRes.json();
          if (errData.error) errMessage = errData.error;
        } catch(e) {}
        throw new Error(errMessage);
      }

      const uploadData = await uploadRes.json();
      const documentId = uploadData.documentId;

      setIsUploading(false);
      setIsMatching(true);
      setStatusText('AI scanning 20,000+ jobs for perfect matches...');

      // 2. Match CV
      const matchRes = await fetch('/api/match-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      if (!matchRes.ok) {
        throw new Error('Failed to match jobs.');
      }

      const matchData = await matchRes.json();
      setMatches(matchData.matches || []);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsUploading(false);
      setIsMatching(false);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50 border-y border-blue-100">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <Sparkles className="text-blue-600 w-8 h-8" />
            Match Your CV to 20,000+ Jobs
          </h2>
          <p className="text-gray-600 text-lg">
            Upload your resume and let our AI instantly find the perfect roles for your skills across East Africa.
          </p>
        </div>

        {!isUploading && !isMatching && matches.length === 0 && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-300 bg-white rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="application/pdf,.pdf" 
              onChange={handleFileUpload} 
            />
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800">Upload your PDF CV</h3>
            <p className="text-gray-500 mt-2">We will never share your personal data.</p>
          </div>
        )}

        {(isUploading || isMatching) && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-blue-100">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800">{statusText}</h3>
            <p className="text-gray-500 mt-2">This usually takes about 5-10 seconds.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 text-center">
            {error}
          </div>
        )}

        {matches.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="text-green-500 w-6 h-6" />
                Top AI Matches
              </h3>
              <button 
                onClick={() => setMatches([])}
                className="text-blue-600 hover:underline font-medium"
              >
                Upload a different CV
              </button>
            </div>
            <div className="space-y-4">
              {matches.map((match, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white font-bold px-4 py-1 rounded-bl-lg">
                    {match.matchScore}% Match
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 pr-24">{match.title}</h4>
                  <p className="text-gray-600 font-medium mt-1">{match.companyName}</p>
                  <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm italic">
                    " {match.matchReason} "
                  </div>
                  {match.sourceUrl && (
                    <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                      View Job Details
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
