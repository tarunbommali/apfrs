import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { facultyListQuery } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only fetch when the dialog is open and user is admin
  const { data } = useQuery({
    ...facultyListQuery({ limit: 200 }),
    enabled: open && user?.role === "admin",
  });
  const people = data?.faculty ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground sm:w-72"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search faculty, email, CFMS ID…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search by name, email or CFMS ID…" />
        <CommandList>
          <CommandEmpty>No matching faculty records.</CommandEmpty>
          {people.length > 0 && (
            <CommandGroup heading="Faculty records">
              {people.map((p) => (
                <CommandItem
                  key={`f-${p.id}`}
                  value={`faculty ${p.name} ${p.email} ${p.cfmsId} ${p.department}`}
                  onSelect={() => go("/admin-dashboard")}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="truncate">
                      {p.name}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{p.cfmsId}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{p.department}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
