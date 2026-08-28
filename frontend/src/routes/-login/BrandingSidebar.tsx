export function BrandingSidebar() {
  return (
    <div className="ink-gradient relative hidden flex-col justify-between p-12 lg:flex">
      <p className="font-mono text-lg font-semibold text-sidebar-accent-foreground">e-Office Jntugv</p>
      <div>
        <h2 className="max-w-md text-3xl font-semibold leading-tight text-sidebar-accent-foreground">
          Attendance, verified. Faculty reports, delivered.
        </h2>
        <p className="mt-4 max-w-md text-sm text-sidebar-foreground/75">
          Upload monthly biometric sheets, sync academic calendars, review department summaries, and dispatch faculty statements seamlessly.
        </p>
      </div>
      <p className="text-xs text-sidebar-foreground/60">
        JNTU-GV College of Engineering · Vizianagaram
      </p>
    </div>
  );
}
