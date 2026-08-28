import { Link } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FacultyRowProps {
  faculty: any;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}

export function FacultyRow({ faculty, onDelete, isDeleting }: FacultyRowProps) {
  const inchargeRole = faculty.currentIncharge?.role || 
    (faculty.incharge && faculty.incharge !== "None" ? faculty.incharge : null);
  const photoSrc = faculty.photoURL || faculty.photo_url;

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-muted/50 transition-colors">
      <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">
        {faculty.cfmsId || faculty.cfms_id || "—"}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt={faculty.name}
                className="size-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-[10px] font-bold text-muted-foreground">
                {faculty.name ? faculty.name.slice(0, 1) : "F"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{faculty.name}</span>
            {inchargeRole ? (
              <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {inchargeRole}
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{faculty.email}</td>
      <td className="px-5 py-3 font-medium">{faculty.department}</td>
      <td className="px-5 py-3 text-xs text-muted-foreground">{faculty.designation}</td>
      <td className="px-5 py-3 font-mono text-xs">{faculty.mobile || "—"}</td>
      <td className="px-5 py-3">
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {faculty.jobStatus || faculty.job_status || "Regular"}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link to="/faculty/$id/edit" params={{ id: faculty.id }}>
              Edit
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(faculty.id, faculty.name)}
            disabled={isDeleting}
            aria-label={`Delete ${faculty.name}`}
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5 text-destructive" />
            )}
          </Button>
        </div>
      </td>
    </tr>
  );
}
