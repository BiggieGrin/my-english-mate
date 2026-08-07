import { useCallback, useEffect, useRef, useState } from "react";

/** Distance from the bottom, in px, still counted as "pinned". */
const PIN_THRESHOLD = 80;

/**
 * Keeps a scroll container pinned to the bottom while content grows, without
 * fighting the reader when they scroll up to re-read something.
 *
 * Replaces a MutationObserver configured with `characterData: true` and
 * `subtree: true` over the entire message list, which fired -- and logged, and
 * issued a double-rAF scroll -- once per streamed character. A ResizeObserver
 * on the content wrapper coalesces to at most one callback per frame and only
 * fires on the height change we actually care about.
 */
export function useAutoScroll<
  TScroll extends HTMLElement = HTMLDivElement,
  TContent extends HTMLElement = HTMLDivElement,
>() {
  const scrollRef = useRef<TScroll>(null);
  const contentRef = useRef<TContent>(null);
  const pinnedRef = useRef(true);
  const [isPinned, setIsPinned] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /** Force re-pin, e.g. when the student sends a message while scrolled up. */
  const pin = useCallback(() => {
    pinnedRef.current = true;
    setIsPinned(true);
    scrollToBottom("auto");
  }, [scrollToBottom]);

  // Track whether the reader is at the bottom. One passive listener; no
  // debounce needed, because a programmatic scroll re-fires this handler and
  // lands pinned, so there is no flag to keep in sync.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const pinned = distance < PIN_THRESHOLD;
      pinnedRef.current = pinned;
      setIsPinned((prev) => (prev === pinned ? prev : pinned));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Follow content growth while pinned.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToBottom("auto");
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  return { scrollRef, contentRef, isPinned, scrollToBottom, pin };
}
