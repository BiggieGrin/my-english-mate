import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FillInTheBlankInputProps {
  content: string;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;
  
  const hebrewCount = (text.match(new RegExp(hebrewPattern, 'g')) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, 'g')) || []).length;
  
  return hebrewCount > englishCount ? 'rtl' : 'ltr';
};

// Remove markdown symbols from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '')   // Remove italic
    .replace(/_{2}/g, '') // Remove underline
    .replace(/_/g, '')    // Remove single underscore
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .trim();
};

export const FillInTheBlankInput = ({ content, onSubmit, disabled }: FillInTheBlankInputProps) => {
  const [answer, setAnswer] = useState('');

  // Parse fill-in-the-blank pattern: _____ or _______ or similar
  const parseFillInTheBlank = (text: string): { parts: string[], blanks: number } | null => {
    // Match patterns like _____, ______, etc. (3 or more underscores)
    const blankPattern = /_{3,}/g;
    const matches = text.match(blankPattern);
    
    if (!matches || matches.length === 0) return null;

    // Split by blanks
    const parts = text.split(blankPattern);
    
    return { parts, blanks: matches.length };
  };

  const parsed = parseFillInTheBlank(content);

  if (!parsed) {
    // Not a fill-in-the-blank question, display as regular text
    const cleanContent = stripMarkdown(content);
    const contentDir = detectTextDirection(cleanContent);
    return (
      <p 
        className="text-lg whitespace-pre-wrap leading-relaxed"
        dir={contentDir}
        style={{ textAlign: contentDir === 'rtl' ? 'right' : 'left' }}
      >
        {cleanContent}
      </p>
    );
  }

  const { parts } = parsed;

  const handleSubmit = () => {
    if (!answer.trim() || disabled) return;
    onSubmit(answer.trim());
    setAnswer('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Detect direction of the sentence parts
  const sentenceDir = detectTextDirection(parts.join(' '));

  return (
    <div className="space-y-4">
      <div 
        className={cn(
          "text-lg leading-relaxed flex flex-wrap items-center gap-2",
          sentenceDir === 'rtl' ? 'flex-row-reverse' : 'flex-row'
        )}
        dir={sentenceDir}
        style={{ textAlign: sentenceDir === 'rtl' ? 'right' : 'left' }}
      >
        {parts.map((part, index) => (
          <span key={index} className="inline-flex items-center gap-2">
            <span className="whitespace-pre-wrap">{stripMarkdown(part)}</span>
            {index < parts.length - 1 && (
              <span className="inline-flex items-center justify-center w-24 h-10 border-2 border-dashed border-primary/40 rounded bg-primary/5">
                <span className="text-xs text-muted-foreground">___</span>
              </span>
            )}
          </span>
        ))}
      </div>
      
      <div className="flex gap-2 items-center" dir="rtl">
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="הקלד/י את התשובה כאן..."
          disabled={disabled}
          className="flex-1"
          dir="ltr"
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !answer.trim()}
          size="icon"
          className="shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
