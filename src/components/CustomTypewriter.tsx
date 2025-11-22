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
  disabled 
}: CustomTypewriterProps) => {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const typeNextCharacter = () => {
      if (indexRef.current < content.length) {
        setDisplayedContent(content.slice(0, indexRef.current + 1));
        indexRef.current += 1;
        timeoutRef.current = setTimeout(typeNextCharacter, speed);
      } else {
        setIsComplete(true);
        onComplete();
      }
    };

    typeNextCharacter();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, speed, onComplete]);

  // Once typing is complete, show the formatted components
  if (isComplete) {
    if (content.includes("___")) {
      return <FillInTheBlankInput content={content} />;
    } else {
      return (
        <MultipleChoiceButtons
          content={content}
          onSelect={onSelectChoice || (() => {})}
          disabled={disabled || false}
        />
      );
    }
  }

  // During typing, show plain text with preserved whitespace
  return (
    <div className="whitespace-pre-wrap text-lg leading-relaxed">
      {displayedContent}
    </div>
  );
};
