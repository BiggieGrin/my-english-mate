import { useState, useEffect, useRef } from "react";
import { FillInTheBlankInput } from "./FillInTheBlankInput";
import { MultipleChoiceButtons } from "./MultipleChoiceButtons";

interface CustomTypewriterProps {
  content: string;
  onComplete: () => void;
  speed?: number;
  onSelectChoice?: (choice: string) => void;
  disabled?: boolean;
}

export const CustomTypewriter = ({
  content,
  onComplete,
  speed = 20,
  onSelectChoice,
  disabled,
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

  // Auto-scroll to keep the typing message in view
  useEffect(() => {
    if (!isComplete && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [displayedContent, isComplete]);

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

  // During typing, show plain text with preserved whitespace
  return (
    <div ref={containerRef} className="whitespace-pre-wrap text-lg leading-relaxed">
      {displayedContent}
    </div>
  );
};
