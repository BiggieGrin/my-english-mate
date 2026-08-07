import { useToast } from "@/hooks/use-toast";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

/**
 * Validates an image file and hands back a base64 data URL.
 *
 * Shared by the attach buttons and the composer's paste handler, so a pasted
 * screenshot goes through exactly the same size and type checks as a picked
 * file.
 */
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

    if (file.size > MAX_IMAGE_SIZE) {
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
