"use client";

import Script from "next/script";
import { useConsent } from "@/components/consent/ConsentProvider";

/** Microsoft Clarity records sessions, so it only loads after the visitor accepts. */
export function ClarityAnalytics() {
  const { consent } = useConsent();
  const projectId = process.env.NEXT_PUBLIC_CLARITY_ID || "xpkd5pzndw";

  if (consent !== "granted" || !projectId) return null;

  return (
    <Script
      id="clarity-script"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", ${JSON.stringify(projectId)});
        `,
      }}
    />
  );
}
