import { useEffect, useRef } from "react";
import Typewriter from "typewriter-effect";

interface TypewriterMessageProps {
  content: string;
  isStreaming: boolean;
}

export const TypewriterMessage = ({ content, isStreaming }: TypewriterMessageProps) => {
  const typewriterRef = useRef<any>(null);

  return (
    <div className="typewriter-container">
      {!isStreaming && content ? (
        <Typewriter
          onInit={(typewriter) => {
            typewriterRef.current = typewriter;
            typewriter.typeString(content).start();
          }}
          options={{
            delay: 100,
            cursor: "",
          }}
        />
      ) : (
        <span>{content}</span>
      )}
    </div>
  );
};
