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
    const choicePattern = /^([A-D])[\)\.]\s*(.+?)$/gm;
    const matches = Array.from(text.matchAll(choicePattern));
    
    // Only show multiple choice buttons if we have at least 2 options
    // Otherwise, it's not a multiple choice question
    if (matches.length < 2) return null;

    // Extract choices - ONLY the answer text, nothing else
    const choices: Choice[] = matches.map(match => {
      let answerText = match[2].trim();
      
      // Remove any question marks or question-like content from choices
      // If the answer text contains a question mark, only keep text after it
      const questionMarkIndex = answerText.indexOf('?');
      if (questionMarkIndex !== -1) {
        answerText = answerText.substring(questionMarkIndex + 1).trim();
      }
      
      return {
        letter: match[1],
        text: stripMarkdown(answerText),
        fullOption: match[0]
      };
    });

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
  
  // Split text by newlines, each line gets its own direction based on first word
  const splitByLanguage = (text: string): Array<{ text: string; direction: 'rtl' | 'ltr' }> => {
    if (!text.trim()) return [];
    
    const segments: Array<{ text: string; direction: 'rtl' | 'ltr' }> = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        segments.push({ text: '', direction: 'ltr' });
        continue;
      }
      
      const firstWord = trimmedLine.split(/\s+/)[0];
      const direction = detectTextDirection(firstWord);
      segments.push({ text: trimmedLine, direction });
    }
    
    return segments;
  };

  return (
    <div className="space-y-4">
      {cleanBeforeText && (
        <div className="space-y-2">
          {splitByLanguage(cleanBeforeText).map((segment, idx) => (
            <p
              key={idx}
              className="text-lg leading-relaxed"
              dir={segment.direction}
              style={{ textAlign: segment.direction === 'rtl' ? 'right' : 'left' }}
            >
              {segment.text || '\u00A0'}
            </p>
          ))}
        </div>
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
                "h-auto min-h-[4.5rem] py-4 px-4 hover:bg-primary/10 hover:border-primary transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "w-full justify-start items-start",
                selectedChoice === choice.letter && "bg-primary/20 border-primary font-semibold ring-2 ring-primary/30"
              )}
            >
              <span 
                className={cn(
                  "flex items-start gap-3 w-full",
                  choiceDir === 'rtl' ? "flex-row-reverse" : "flex-row"
                )}
                dir={choiceDir}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary mt-0.5">
                  {choice.letter}
                </span>
                <span 
                  className="flex-1 text-base leading-relaxed break-words whitespace-normal overflow-wrap-anywhere"
                  style={{ 
                    textAlign: choiceDir === 'rtl' ? 'right' : 'left',
                    direction: choiceDir 
                  }}
                >
                  {choice.text}
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      {cleanAfterText && (
        <div className="space-y-2">
          {splitByLanguage(cleanAfterText).map((segment, idx) => (
            <p
              key={idx}
              className="text-lg leading-relaxed"
              dir={segment.direction}
              style={{ textAlign: segment.direction === 'rtl' ? 'right' : 'left' }}
            >
              {segment.text || '\u00A0'}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
