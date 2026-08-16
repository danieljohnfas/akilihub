"use client";

import { useState } from "react";
import { resolveManualLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ResolveItem({
  id,
  type,
  title,
  company,
  sourceUrl,
}: {
  id: string;
  type: "job" | "tender";
  title: string;
  company: string;
  sourceUrl: string;
}) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResolve = async () => {
    if (!url || !url.startsWith("http")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await resolveManualLink(id, type, url);
      if (res.success) {
        toast.success("URL resolved successfully");
      } else {
        toast.error(res.error || "Failed to resolve URL");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg bg-card items-start md:items-center justify-between mb-4 shadow-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
            {type}
          </span>
          <h3 className="font-semibold truncate" title={title}>
            {title}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground truncate mb-2">{company}</p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs flex items-center text-blue-600 hover:underline truncate"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          {sourceUrl}
        </a>
      </div>

      <div className="w-full md:w-[400px] flex gap-2">
        <Input
          placeholder="Paste true employer URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleResolve} disabled={isLoading || !url}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Save
        </Button>
      </div>
    </div>
  );
}
