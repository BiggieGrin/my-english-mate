import { useRef, useState } from "react";
import { Send, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickReplyChips } from "./QuickReplyChips";
import { ImageAttachButton, useImageProcessor } from "./ImageAttachButton";
import type { LessonMode } from "@/lib/lessonModes";

interface AnswerComposerProps {
  mode: LessonMode;
  isStreaming: boolean;
  onSend: (text: string, image?: string | null) => void;
  onStop: () => void;
}

const MAX_TEXTAREA_HEIGHT = 128;

export const AnswerComposer = ({
  mode,
  isStreaming,
  onSend,
  onStop,
}: AnswerComposerProps) => {
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processFile = useImageProcessor(setImage);

  const canSend = (input.trim().length > 0 || image !== null) && !isStreaming;

  const submit = (text: string, attached: string | null) => {
    onSend(text, attached);
    setInput("");
    setImage(null);
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  };

  const handleSend = () => {
    if (!canSend) return;
    submit(input.trim(), image);
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    const el = event.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
      return;
    }
    if (event.key === "Escape" && isStreaming) {
      event.preventDefault();
      onStop();
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          processFile(file);
          return;
        }
      }
    }
  };

  return (
    <footer className="z-20 shrink-0 border-t border-warm-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-3 pb-3 pt-2.5 sm:px-4">
        {!isStreaming && (
          <QuickReplyChips
            mode={mode}
            disabled={isStreaming}
            onPick={(text) => submit(text, null)}
          />
        )}

        {image && (
          <div className="relative mb-2 inline-block">
            <img
              src={image}
              alt="תצוגה מקדימה"
              className="h-16 w-16 rounded-xl border border-warm-border object-cover"
            />
            <button
              type="button"
              onClick={() => setImage(null)}
              aria-label="הסר תמונה"
              className="absolute -left-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-destructive text-destructive-foreground elevation-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 rounded-3xl border border-input bg-background p-1.5 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <ImageAttachButton disabled={isStreaming} onImage={setImage} />

          {/* text-base (16px) keeps iOS Safari from zooming on focus. */}
          <textarea
            ref={textareaRef}
            rows={1}
            dir="auto"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="כתוב/כתבי את התשובה שלך…"
            aria-label="תיבת התשובה שלך"
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          {isStreaming ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onStop}
              aria-label="עצור את התשובה"
              className="h-11 w-11 shrink-0 rounded-full"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="שלח תשובה"
              className="h-11 w-11 shrink-0 rounded-full"
            >
              {/* Paper plane points right-to-left. */}
              <Send className="h-5 w-5 rotate-180" />
            </Button>
          )}
        </div>

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Enter לשליחה · Shift+Enter לשורה חדשה
        </p>
      </div>
    </footer>
  );
};
