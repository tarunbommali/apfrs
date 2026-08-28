import { useRef } from "react";
import { UploadCloud } from "lucide-react";

interface DropzoneProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Dropzone({ onFileChange }: DropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => fileRef.current?.click()}
      className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
    >
      <UploadCloud className="size-10 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">Click to upload biometric Excel sheet (.xlsx)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Compatible with APFRS biometric monthly exports (e.g. 22130304001_REGULAR_Jan2025.xlsx)
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}
