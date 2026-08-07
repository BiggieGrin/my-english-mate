import { RichText } from "./RichText";

interface StudentMessageProps {
  content: string;
  image?: string;
}

/**
 * A turn from the student.
 *
 * Deliberately plain. The previous version was a -0.8deg rotated "sticky
 * note" with a gradient pseudo-layer, a 4px left border, a pencil emoji and a
 * uppercase "תשובתך" label -- decoration that added extraneous cognitive load
 * without conveying anything the bubble's position and colour do not already.
 */
export const StudentMessage = ({ content, image }: StudentMessageProps) => (
  <article className="flex animate-message-in justify-end">
    <div className="max-w-[85%] rounded-bubble rounded-bl-md bg-student px-4 py-3 elevation-2 sm:max-w-[75%]">
      {image && (
        <img
          src={image}
          alt="תמונה שצירפת"
          className="mb-2 max-h-56 w-full rounded-2xl bg-black/15 object-contain"
        />
      )}
      {content?.trim() && <RichText content={content} tone="onPrimary" />}
    </div>
  </article>
);
