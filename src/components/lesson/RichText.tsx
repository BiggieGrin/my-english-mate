import { cn } from "@/lib/utils";
import { stripMarkdown } from "@/lib/text";

interface RichTextProps {
  content: string;
  /** `onPrimary` is for text sitting on the student's coloured bubble. */
  tone?: "default" | "onPrimary";
  /** Shows a blinking caret while the reply is still streaming. */
  caret?: boolean;
  className?: string;
}

/**
 * The single place lesson prose is rendered.
 *
 * Replaces four copies of a `splitByLanguage(...).map(...)` pattern that broke
 * text into one <p> per line and set `dir` from the line's first word. That
 * mangled lines opening with digits, quotes or "A)", and lost the model's
 * paragraph spacing. `unicode-bidi: plaintext` (via .bidi-plaintext) lets the
 * browser do the same job per paragraph, natively and correctly.
 */
export const RichText = ({
  content,
  tone = "default",
  caret = false,
  className,
}: RichTextProps) => (
  <div
    dir="auto"
    className={cn(
      "bidi-plaintext whitespace-pre-wrap break-words text-[17px] leading-[1.7] sm:text-base",
      tone === "onPrimary" ? "text-student-foreground" : "text-foreground",
      className
    )}
  >
    {stripMarkdown(content)}
    {caret && (
      <span
        aria-hidden
        className="ms-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-caret-blink bg-current align-baseline"
      />
    )}
  </div>
);
