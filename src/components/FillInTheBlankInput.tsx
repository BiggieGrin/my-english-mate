import { cn } from '@/lib/utils';

interface FillInTheBlankInputProps {
  content: string;
}

// Detect if text is primarily Hebrew (RTL) or English (LTR)
const detectTextDirection = (text: string): 'rtl' | 'ltr' => {
  const hebrewPattern = /[\u0590-\u05FF]/;
  const englishPattern = /[a-zA-Z]/;
  
  const hebrewCount = (text.match(new RegExp(hebrewPattern, 'g')) || []).length;
  const englishCount = (text.match(new RegExp(englishPattern, 'g')) || []).length;
  
  return hebrewCount > englishCount ? 'rtl' : 'ltr';
};

// Remove markdown symbols from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '')   // Remove italic
    .replace(/_{2}/g, '') // Remove underline
    .replace(/_/g, '')    // Remove single underscore
    .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
    .trim();
};

export const FillInTheBlankInput = ({ content }: FillInTheBlankInputProps) => {
  // Parse fill-in-the-blank pattern with optional hints: _____ (hint) or just _____
  const parseFillInTheBlank = (text: string): { elements: Array<{ type: 'text' | 'blank', content: string, hint?: string }> } | null => {
    // Match patterns like _____ (word) or just _____
    const blankWithHintPattern = /_{3,}\s*\([^)]+\)/g;
    const blankPattern = /_{3,}/g;
    
    // Check if there are any blanks at all
    if (!blankWithHintPattern.test(text) && !blankPattern.test(text)) {
      return null;
    }

    const elements: Array<{ type: 'text' | 'blank', content: string, hint?: string }> = [];
    let lastIndex = 0;
    
    // First try to match blanks with hints
    const combinedPattern = /_{3,}(?:\s*\([^)]+\))?/g;
    let match;
    
    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before the blank
      if (match.index > lastIndex) {
        elements.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Extract hint if present
      const hintMatch = match[0].match(/\(([^)]+)\)/);
      elements.push({
        type: 'blank',
        content: match[0],
        hint: hintMatch ? hintMatch[1] : undefined
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      elements.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return { elements };
  };

  const parsed = parseFillInTheBlank(content);

  if (!parsed) {
    // Not a fill-in-the-blank question, display as regular text
    const cleanContent = stripMarkdown(content);
    const contentDir = detectTextDirection(cleanContent);
    return (
      <p 
        className="text-lg whitespace-pre-wrap leading-relaxed"
        dir={contentDir}
        style={{ textAlign: contentDir === 'rtl' ? 'right' : 'left' }}
      >
        {cleanContent}
      </p>
    );
  }

  const { elements } = parsed;
  
  // Detect direction based on all text elements
  const allText = elements.filter(e => e.type === 'text').map(e => e.content).join(' ');
  const sentenceDir = detectTextDirection(allText);

  return (
    <div 
      className={cn(
        "text-lg leading-relaxed",
        sentenceDir === 'rtl' ? 'text-right' : 'text-left'
      )}
      dir={sentenceDir}
    >
      <div className="inline-flex flex-wrap items-baseline gap-1">
        {elements.map((element, index) => {
          if (element.type === 'text') {
            return (
              <span key={index} className="inline whitespace-pre-wrap">
                {stripMarkdown(element.content)}
              </span>
            );
          } else {
            return (
              <span key={index} className="inline-flex items-center gap-1 align-baseline">
                <span className="inline-flex items-center justify-center min-w-[8rem] h-9 px-3 border-2 border-dashed border-cyan-400 rounded-md bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-500">
                  <span className="text-sm text-cyan-600 dark:text-cyan-400 font-mono">___</span>
                </span>
                {element.hint && (
                  <span className="text-base text-muted-foreground whitespace-nowrap">({element.hint})</span>
                )}
              </span>
            );
          }
        })}
      </div>
    </div>
  );
};
