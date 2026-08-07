import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  useImageProcessor,
} from "@/hooks/useImageProcessor";

interface ImageAttachButtonProps {
  disabled?: boolean;
  onImage: (dataUrl: string) => void;
}

/**
 * Attach controls. The camera entry is mobile-only, where `capture` opens the
 * rear camera directly -- on desktop it would just be a second file picker.
 */
export const ImageAttachButton = ({
  disabled,
  onImage,
}: ImageAttachButtonProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const processFile = useImageProcessor(onImage);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be picked again.
    event.target.value = "";
  };

  const triggerClass =
    "grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-warm-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40";

  return (
    <>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={disabled}
        aria-label="צלם תמונה"
        className={`${triggerClass} sm:hidden`}
      >
        <Camera className="h-5 w-5" />
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        aria-label="צרף תמונה"
        className={triggerClass}
      >
        <ImagePlus className="h-5 w-5" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
};
