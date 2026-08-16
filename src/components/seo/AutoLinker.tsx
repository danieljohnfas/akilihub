import React from 'react';
import Link from 'next/link';
import { AUTO_LINK_RULES, AUTO_LINK_REGEX } from '@/lib/seo/autolinks';

interface AutoLinkerProps {
  text: string | null | undefined;
  className?: string;
}

export function AutoLinker({ text, className }: AutoLinkerProps) {
  if (!text) return null;

  // Track which rules have already been linked to prevent over-optimization
  // (We only want to link the first occurrence of a keyword in the text)
  const usedRules = new Set<string>();

  // Split the text using our mega-regex.
  // Because we used capture groups in the regex (the outer parentheses), 
  // String.prototype.split will include the matched substrings in the resulting array.
  const parts = text.split(AUTO_LINK_REGEX);

  return (
    <p className={className}>
      {parts.map((part, i) => {
        // Even indices are normal text, odd indices are regex matches
        if (i % 2 === 0) {
          return <React.Fragment key={i}>{part}</React.Fragment>;
        }

        // Find the rule that matches this text (case-insensitive)
        const lowerPart = part.toLowerCase();
        const rule = AUTO_LINK_RULES.find(r => r.keyword.toLowerCase() === lowerPart);

        // If a rule matches and hasn't been used yet in this block, link it
        if (rule && !usedRules.has(rule.keyword)) {
          usedRules.add(rule.keyword);
          return (
            <Link 
              key={i} 
              href={rule.href}
              className="text-primary hover:underline font-medium"
              title={`View more jobs related to ${rule.keyword}`}
            >
              {part}
            </Link>
          );
        }

        // If the rule was already used (or somehow not found), return plain text
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </p>
  );
}
