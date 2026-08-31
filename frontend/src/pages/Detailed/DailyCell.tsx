interface DailyCellProps {
  status: string;
}

const cellStyle: Record<string, string> = {
  P: "bg-[var(--status-present-bg)] text-[var(--status-present-fg)] font-bold",
  A: "bg-[var(--status-absent-bg)] text-[var(--status-absent-fg)] font-bold",
  L: "bg-[var(--status-leave-bg)] text-[var(--status-leave-fg)] font-bold",
  H: "bg-[var(--status-holiday-bg)] text-[var(--status-holiday-fg)] font-medium",
  HD: "bg-[var(--status-halfday-bg)] text-[var(--status-halfday-fg)] font-bold",
  Late: "bg-[var(--status-leave-bg)] text-[var(--status-leave-fg)] font-bold",
};

export function DailyCell({ status }: DailyCellProps) {
  const badge = cellStyle[status] || "bg-muted/30 text-muted-foreground";
  return (
    <span className={`inline-flex size-6 items-center justify-center rounded text-[11px] ${badge}`}>
      {status}
    </span>
  );
}
