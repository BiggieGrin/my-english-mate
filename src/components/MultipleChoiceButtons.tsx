import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MultipleChoiceButtonsProps {
  content: string;
  onSelect: (choice: string) => void;
  disabled?: boolean;
}

interface Choice {
  letter: string;
  text: string;
  fullOption: string;
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

export const MultipleChoiceButtons = ({ content, onSelect, disabled }: MultipleChoiceButtonsProps) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Parse multiple-choice options from the content
  const parseChoices = (text: string): { choices: Choice[], beforeText: string, afterText: string } | null => {
    // Match patterns like "A) text", "A. text", "B) text", "B. text", etc.
    // Support both English and Hebrew letters
    const choicePattern = /([A-D])[\)\.]\s*([^\n]+)/g;
    const matches = Array.from(text.matchAll(choicePattern));
    
    if (matches.length < 2) return null;

    const choices: Choice[] = matches.map(match => ({
      letter: match[1],
      text: stripMarkdown(match[2].trim()),
      fullOption: match[0]
    }));

    // Split the text into before choices, choices, and after choices
    const firstMatch = matches[0];
    const lastMatch = matches[matches.length - 1];
    const firstIndex = text.indexOf(firstMatch[0]);
    const lastIndex = text.indexOf(lastMatch[0]) + lastMatch[0].length;
    
    const beforeText = text.substring(0, firstIndex).trim();
    const afterText = text.substring(lastIndex).trim();

    return { choices, beforeText, afterText };
  };

  const parsed = parseChoices(content);

  if (!parsed) {
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

  const { choices, beforeText, afterText } = parsed;

  const handleChoiceClick = (letter: string) => {
    if (disabled || selectedChoice) return;
    setSelectedChoice(letter);
    onSelect(letter);
  };

  const cleanBeforeText = beforeText ? stripMarkdown(beforeText) : '';
  const cleanAfterText = afterText ? stripMarkdown(afterText) : '';
  const beforeTextDir = cleanBeforeText ? detectTextDirection(cleanBeforeText) : 'rtl';
  const afterTextDir = cleanAfterText ? detectTextDirection(cleanAfterText) : 'rtl';

  return (
    <div className="space-y-4">
      {cleanBeforeText && (
        <p 
          className="text-lg whitespace-pre-wrap leading-relaxed"
          dir={beforeTextDir}
          style={{ textAlign: beforeTextDir === 'rtl' ? 'right' : 'left' }}
        >
          {cleanBeforeText}
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
        {choices.map((choice) => {
          const choiceDir = detectTextDirection(choice.text);
          return (
            <Button
              key={choice.letter}
              onClick={() => handleChoiceClick(choice.letter)}
              disabled={disabled || selectedChoice !== null}
              variant="outline"
              className={cn(
                "h-auto min-h-[4rem] py-4 px-4 hover:bg-primary/10 hover:border-primary transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "w-full text-left",
                selectedChoice === choice.letter && "bg-primary/20 border-primary font-semibold ring-2 ring-primary/30"
              )}
            >
              <span 
                className={cn(
                  "flex items-center gap-3 w-full",
                  choiceDir === 'rtl' ? "flex-row-reverse" : "flex-row"
                )}
                dir={choiceDir}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {choice.letter}
                </span>
                <span 
                  className="flex-1 text-base leading-relaxed break-words"
                  style={{ textAlign: choiceDir === 'rtl' ? 'right' : 'left' }}
                >
                  {choice.text}
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      {cleanAfterText && (
        <p 
          className="text-lg whitespace-pre-wrap leading-relaxed"
          dir={afterTextDir}
          style={{ textAlign: afterTextDir === 'rtl' ? 'right' : 'left' }}
        >
          {cleanAfterText}
        </p>
      )}
    </div>
  );
};
