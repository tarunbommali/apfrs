import { AlertTriangle, CheckCircle2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface JSONEditorProps {
  jsonText: string;
  onJsonChange: (value: string) => void;
  jsonError: string | null;
  holidayCount: number;
  onFormat: () => void;
}

export function JSONEditor({
  jsonText,
  onJsonChange,
  jsonError,
  holidayCount,
  onFormat,
}: JSONEditorProps) {
  return (
    <div className="surface-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Two-Way JSON Editor</h2>
          <p className="text-xs text-muted-foreground">
            Edit holiday definitions directly in JSON. Changes synchronize to MySQL and the manual view live.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onFormat}>
            <Wand2 className="size-4 mr-1.5" /> Format JSON
          </Button>
        </div>
      </div>

      <Textarea
        value={jsonText}
        onChange={(e) => onJsonChange(e.target.value)}
        spellCheck={false}
        aria-label="Holidays JSON editor"
        placeholder={`[
  {
    "date": "2026-01-26",
    "label": "Republic Day",
    "type": "Public holiday"
  },
  {
    "date": "2026-04-14",
    "label": "Dr. Ambedkar Jayanti",
    "type": "Public holiday"
  },
  {
    "date": "2026-08-15",
    "label": "Independence Day",
    "type": "Public holiday"
  }
]

// Supported fields:
//   date  — Required. Format: YYYY-MM-DD
//   label — Required. Display name of the holiday (also accepted as "name")
//   type  — Optional. One of: "Public holiday", "Institutional", "Academic", "Vacation"
//   id    — Optional. Auto-generated if omitted.`}
        className="min-h-[500px] w-full resize-y rounded-none border-0 font-mono text-xs leading-relaxed focus-visible:ring-0"
      />

      <div
        className={`flex items-start gap-2 border-t px-5 py-3 text-xs ${
          jsonError
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        {jsonError ? (
          <>
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="font-mono">{jsonError}</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Valid JSON — <strong className="text-foreground">{holidayCount}</strong> total holidays
              saved in database.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
