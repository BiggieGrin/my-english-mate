import { useState } from "react";
import { cn } from "@/lib/utils";
import { stripMarkdown } from "@/lib/text";
import { RichText } from "@/components/lesson/RichText";

interface MultipleChoiceButtonsProps {
  content: string;
  onSelect: (choice: string) => void;
  disabled?: boolean;
}

interface Choice {
  letter: string;
  text: string;
}

/** Matches "A) text" / "A. text" lines. At least two are needed to be a question. */
const CHOICE_PATTERN = /^([A-D])[).]\s*(.+?)$/gm;

interface ParsedChoices {
  choices: Choice[];
  beforeText: string;
  afterText: string;
}

const parseChoices = (text: string): ParsedChoices | null => {
  const matches = Array.from(text.matchAll(CHOICE_PATTERN));
  if (matches.length < 2) return null;

  const choices: Choice[] = matches.map((match) => {
    let answerText = match[2].trim();

    // Some replies put the question and the first option on one line; keep
    // only what follows the question mark.
    const questionMarkIndex = answerText.indexOf("?");
    if (questionMarkIndex !== -1) {
      answerText = answerText.slice(questionMarkIndex + 1).trim();
    }

    return { letter: match[1], text: stripMarkdown(answerText) };
  });

  const first = matches[0][0];
  const last = matches[matches.length - 1][0];
  const start = text.indexOf(first);
  const end = text.indexOf(last) + last.length;

  return {
    choices,
    beforeText: text.slice(0, start).trim(),
    afterText: text.slice(end).trim(),
  };
};

export const MultipleChoiceButtons = ({
  content,
  onSelect,
  disabled,
}: MultipleChoiceButtonsProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const parsed = parseChoices(content);

  if (!parsed) {
    return <RichText content={content} />;
  }

  const { choices, beforeText, afterText } = parsed;

  const handleClick = (letter: string) => {
    if (disabled || selected) return;
    setSelected(letter);
    onSelect(letter);
  };

  return (
    <div className="space-y-4">
      {beforeText && <RichText content={beforeText} />}

      <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {choices.map((choice) => {
          const isSelected = selected === choice.letter;
          return (
            <button
              key={choice.letter}
              type="button"
              onClick={() => handleClick(choice.letter)}
              disabled={disabled || selected !== null}
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-[3.5rem] w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-start transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed",
                isSelected
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-warm-border bg-background hover:border-primary hover:bg-primary/5",
                selected !== null && !isSelected && "opacity-50"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-warm-soft text-warm-foreground"
                )}
              >
                {choice.letter}
              </span>
              <span
                dir="auto"
                className="bidi-plaintext min-w-0 flex-1 break-words text-base leading-relaxed text-foreground"
              >
                {choice.text}
              </span>
            </button>
          );
        })}
      </div>

      {afterText && <RichText content={afterText} />}
    </div>
  );
};
