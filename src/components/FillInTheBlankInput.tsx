import { stripMarkdown } from "@/lib/text";
import { RichText } from "@/components/lesson/RichText";

interface FillInTheBlankInputProps {
  content: string;
}

type Element =
  | { type: "text"; content: string }
  | { type: "blank"; hint?: string };

/** A blank is three or more underscores, optionally followed by "(hint)". */
const BLANK_PATTERN = /_{3,}(?:\s*\([^)]+\))?/g;

const parseLine = (line: string): Element[] | null => {
  const matches = Array.from(line.matchAll(BLANK_PATTERN));
  if (matches.length === 0) return null;

  const elements: Element[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    if (match.index! > lastIndex) {
      elements.push({
        type: "text",
        content: line.slice(lastIndex, match.index),
      });
    }
    const hint = match[0].match(/\(([^)]+)\)/)?.[1];
    elements.push({ type: "blank", hint });
    lastIndex = match.index! + match[0].length;
  }

  if (lastIndex < line.length) {
    elements.push({ type: "text", content: line.slice(lastIndex) });
  }

  return elements;
};

/**
 * Renders a fill-in-the-blank prompt.
 *
 * The blanks are presentational: the student types the full answer in the
 * composer below, which is what the tutor expects and what keeps a single
 * submission path. They exist to make the shape of the question legible at a
 * glance rather than as a wall of underscores.
 */
export const FillInTheBlankInput = ({ content }: FillInTheBlankInputProps) => {
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lineIndex} className="h-2" />;

        const elements = parseLine(trimmed);
        if (!elements) {
          return <RichText key={lineIndex} content={trimmed} />;
        }

        return (
          <p
            key={lineIndex}
            dir="auto"
            className="bidi-plaintext break-words text-[17px] leading-[2] text-foreground sm:text-base"
          >
            {elements.map((element, index) =>
              element.type === "text" ? (
                <span key={index}>{stripMarkdown(element.content)}</span>
              ) : (
                <span key={index} className="mx-1 inline-flex items-baseline gap-1">
                  <span
                    aria-label="מקום להשלמה"
                    className="inline-block min-w-[6rem] border-b-2 border-warm align-baseline"
                  />
                  {element.hint && (
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                      ({element.hint})
                    </span>
                  )}
                </span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
};
