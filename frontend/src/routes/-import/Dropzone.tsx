import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

interface DropzoneProps {
  onFileSelected: (file: File) => void;
}

export function Dropzone({ onFileSelected }: DropzoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all ${
        isDragging
          ? "border-primary bg-primary/10 shadow-[0_0_8px_rgba(94,106,210,0.2)] scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
    >
      <UploadCloud className={`size-10 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
      <p className="mt-3 text-sm font-medium">
        {isDragging ? "Drop your file here" : "Click or drag & drop to upload biometric Excel sheet (.xlsx)"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Compatible with APFRS biometric monthly exports (e.g. 22130304001_REGULAR_Jan2025.xlsx)
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

