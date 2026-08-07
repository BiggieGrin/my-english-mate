import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

interface ImageAttachButtonProps {
  disabled?: boolean;
  onImage: (dataUrl: string) => void;
}

/** Validates and base64-encodes an image file. Exported for paste handling. */
export function useImageProcessor(onImage: (dataUrl: string) => void) {
  const { toast } = useToast();

  return (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "סוג קובץ לא נתמך",
        description: "אנא בחר/י תמונה בפורמט JPG, PNG או WebP",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "הקובץ גדול מדי",
        description: "גודל התמונה המקסימלי הוא 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => onImage(reader.result as string);
    reader.onerror = () =>
      toast({
        title: "שגיאה",
        description: "לא הצלחנו לטעון את התמונה",
        variant: "destructive",
      });
    reader.readAsDataURL(file);
  };
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
