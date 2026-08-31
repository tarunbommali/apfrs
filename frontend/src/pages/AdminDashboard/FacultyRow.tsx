import { Link } from "react-router-dom";
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
        <div className="flex items-center gap-3">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={faculty.name}
              className="size-8 shrink-0 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-xs text-muted-foreground border border-border">
              {faculty.name?.charAt(0)?.toUpperCase() || "F"}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{faculty.name}</span>
              {inchargeRole && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                  {inchargeRole}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{faculty.email}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border border-primary/20">
          {faculty.department || "—"}
        </span>
      </td>
      <td className="px-5 py-3 text-xs text-foreground font-medium">{faculty.designation || "—"}</td>
      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{faculty.mobile || "—"}</td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider border ${
            (faculty.jobStatus || faculty.job_status || "Regular").toLowerCase() === "regular"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-muted text-muted-foreground border-border"
          }`}
        >
          {faculty.jobStatus || faculty.job_status || "Regular"}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/faculty/${faculty.id}/edit`}>
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
