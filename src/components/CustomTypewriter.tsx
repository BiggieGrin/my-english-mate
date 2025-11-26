import { useState, useEffect, useRef } from "react";
import { FillInTheBlankInput } from "./FillInTheBlankInput";
import { MultipleChoiceButtons } from "./MultipleChoiceButtons";

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): "rtl" | "ltr" => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;

  const hebrewCount = (text.match(new RegExp(hebrewPattern, "g")) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, "g")) || []).length;

  return hebrewCount > englishCount ? "rtl" : "ltr";
};

// Split text into segments based on language for proper direction handling
const splitByLanguage = (text: string): Array<{ text: string; direction: "rtl" | "ltr" }> => {
  if (!text.trim()) return [];

  const segments: Array<{ text: string; direction: "rtl" | "ltr" }> = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      segments.push({ text: "", direction: "ltr" });
      continue;
    }

    const firstWord = trimmedLine.split(/\s+/)[0];
    const direction = detectTextDirection(firstWord);
    segments.push({ text: trimmedLine, direction });
  }

  return segments;
};

interface CustomTypewriterProps {
  content: string;
  onComplete: () => void;
  speed?: number;
  onSelectChoice?: (choice: string) => void;
  disabled?: boolean;
  onTypingUpdate?: () => void;
}

export const CustomTypewriter = ({
  content,
  onComplete,
  speed = 20,
  onSelectChoice,
  disabled,
  onTypingUpdate,
}: CustomTypewriterProps) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Main typing effect
  useEffect(() => {
    // Reset state when content changes
    setDisplayedContent("");
    setIsComplete(false);
    indexRef.current = 0;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    const typeNextCharacter = () => {
      if (indexRef.current < content.length) {
        setDisplayedContent(content.slice(0, indexRef.current + 1));
        indexRef.current += 1;
        onTypingUpdate?.();
        timeoutRef.current = window.setTimeout(typeNextCharacter, speed);
      } else {
        setIsComplete(true);
        onComplete();
      }
    };

    timeoutRef.current = window.setTimeout(typeNextCharacter, speed);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [content, speed, onComplete]);

  // Scrolling during typing is handled by the parent via onTypingUpdate


  // Once typing is complete, show the formatted components
  if (isComplete) {
    if (content.includes("___")) {
      return <FillInTheBlankInput content={content} />;
    }

    return (
      <MultipleChoiceButtons
        content={content}
        onSelect={onSelectChoice || (() => {})}
        disabled={disabled || false}
      />
    );
  }

  // During typing, show text with proper direction handling per line
  const segments = splitByLanguage(displayedContent);
  
  return (
    <div ref={containerRef} className="space-y-1">
      {segments.length > 0 ? (
        segments.map((segment, idx) => (
          <p
            key={idx}
            className="text-lg leading-relaxed"
            dir={segment.direction}
            style={{ textAlign: segment.direction === "rtl" ? "right" : "left" }}
          >
            {segment.text || "\u00A0"}
          </p>
        ))
      ) : (
        <p className="text-lg leading-relaxed">&nbsp;</p>
      )}
    </div>
  );
};
