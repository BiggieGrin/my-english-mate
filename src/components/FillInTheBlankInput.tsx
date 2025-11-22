import { cn } from "@/lib/utils";

interface FillInTheBlankInputProps {
  content: string;
}

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): "rtl" | "ltr" => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;

  const hebrewCount = (text.match(new RegExp(hebrewPattern, "g")) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, "g")) || []).length;

  return hebrewCount > englishCount ? "rtl" : "ltr";
};

// Remove markdown symbols from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*/g, "") // Remove bold
    .replace(/\*/g, "") // Remove italic
    .replace(/_{2}/g, "") // Remove underline
    .replace(/_/g, "") // Remove single underscore
    .replace(/~~(.*?)~~/g, "$1") // Remove strikethrough
    .trim();
};

export const FillInTheBlankInput = ({ content }: FillInTheBlankInputProps) => {
  // Parse fill-in-the-blank pattern with optional hints: _____ (hint) or just _____
  const parseFillInTheBlank = (
    text: string,
  ): { elements: Array<{ type: "text" | "blank"; content: string; hint?: string }> } | null => {
    // Match patterns like _____ (word) or just _____
    const blankWithHintPattern = /_{3,}\s*\([^)]+\)/g;
    const blankPattern = /_{3,}/g;

    // Check if there are any blanks at all
    if (!blankWithHintPattern.test(text) && !blankPattern.test(text)) {
      return null;
    }

    const elements: Array<{ type: "text" | "blank"; content: string; hint?: string }> = [];
    let lastIndex = 0;

    // First try to match blanks with hints
    const combinedPattern = /_{3,}(?:\s*\([^)]+\))?/g;
    let match;

    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        elements.push({
          type: "text",
          content: text.slice(lastIndex, match.index),
        });
      }

      // Extract hint if present
      const hintMatch = match[0].match(/\(([^)]+)\)/);
      elements.push({
        type: "blank",
        content: match[0],
        hint: hintMatch ? hintMatch[1] : undefined,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push({
        type: "text",
        content: text.slice(lastIndex),
      });
    }

    return { elements };
  };

  // Split content by lines
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, lineIdx) => {
        const cleanLine = line.trim();
        if (!cleanLine) return <p key={lineIdx}>&nbsp;</p>;

        const parsed = parseFillInTheBlank(cleanLine);

        if (!parsed) {
          // Not a fill-in-the-blank line, display as regular text
          const strippedLine = stripMarkdown(cleanLine);
          const lineDir = detectTextDirection(strippedLine);
          return (
            <p
              key={lineIdx}
              className="text-lg leading-relaxed"
              dir={lineDir}
              style={{ textAlign: lineDir === "rtl" ? "right" : "left" }}
            >
              {strippedLine}
            </p>
          );
        }

        const { elements } = parsed;

        // For fill-in-blank, detect direction based on the text (not hints)
        const questionText = elements
          .filter((e) => e.type === "text")
          .map((e) => e.content)
          .join(" ");
        const questionDir = detectTextDirection(questionText);

        return (
          <p
            key={lineIdx}
            className={cn("text-lg leading-relaxed", questionDir === "rtl" ? "text-right" : "text-left")}
            dir={questionDir}
          >
            <span className="inline whitespace-pre-wrap">
              {elements.map((element, index) => {
                if (element.type === "text") {
                  return stripMarkdown(element.content);
                } else {
                  return (
                    <span key={index} className="inline-block mx-1 align-baseline">
                      {element.hint && (
                        <span className="text-base text-muted-foreground whitespace-nowrap ml-1">
                          ({element.hint})
                        </span>
                      )}
                      <span className="inline-flex items-center justify-center min-w-[8rem] h-9 px-3 border-2 border-dashed border-cyan-400 rounded-md bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-500">
                        <span className="text-sm text-cyan-600 dark:text-cyan-400 font-mono">___</span>
                      </span>
                    </span>
                  );
                }
              })}
            </span>
          </p>
        );
      })}
    </div>
  );
};
