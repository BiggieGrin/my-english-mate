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

export const MultipleChoiceButtons = ({ content, onSelect, disabled }: MultipleChoiceButtonsProps) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Parse multiple-choice options from the content
  const parseChoices = (text: string): { choices: Choice[], beforeText: string, afterText: string } | null => {
    // Match patterns like "A) text", "B) text", etc.
    // Support both English and Hebrew letters
    const choicePattern = /([A-D])\)\s*([^\n]+)/g;
    const matches = Array.from(text.matchAll(choicePattern));
    
    if (matches.length < 2) return null;

    const choices: Choice[] = matches.map(match => ({
      letter: match[1],
      text: match[2].trim(),
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
    return <p className="text-lg whitespace-pre-wrap">{content}</p>;
  }

  const { choices, beforeText, afterText } = parsed;

  const handleChoiceClick = (letter: string) => {
    if (disabled || selectedChoice) return;
    setSelectedChoice(letter);
    onSelect(letter);
  };

  return (
    <div className="space-y-4">
      {beforeText && (
        <p className="text-lg whitespace-pre-wrap">{beforeText}</p>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {choices.map((choice) => (
          <Button
            key={choice.letter}
            onClick={() => handleChoiceClick(choice.letter)}
            disabled={disabled || selectedChoice !== null}
            variant="outline"
            className={cn(
              "h-auto py-4 px-4 text-right justify-start hover:bg-primary/10 hover:border-primary transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              selectedChoice === choice.letter && "bg-primary/20 border-primary font-semibold"
            )}
          >
            <span className="flex items-start gap-3 w-full">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {choice.letter}
              </span>
              <span className="flex-1 text-base leading-relaxed">
                {choice.text}
              </span>
            </span>
          </Button>
        ))}
      </div>

      {afterText && (
        <p className="text-lg whitespace-pre-wrap">{afterText}</p>
      )}
    </div>
  );
};
