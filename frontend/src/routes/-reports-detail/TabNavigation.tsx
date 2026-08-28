type ViewTab = "summary" | "departments";

interface TabNavigationProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  filteredCount: number;
  departmentsCount: number;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  filteredCount,
  departmentsCount,
}: TabNavigationProps) {
  return (
    <div className="flex border-b border-border text-sm font-medium">
      <button
        onClick={() => onTabChange("summary")}
        className={`border-b-2 px-4 py-2.5 transition-colors ${
          activeTab === "summary"
            ? "border-primary text-primary font-semibold"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Faculty Summary ({filteredCount})
      </button>
      <button
        onClick={() => onTabChange("departments")}
        className={`border-b-2 px-4 py-2.5 transition-colors ${
          activeTab === "departments"
            ? "border-primary text-primary font-semibold"
            : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
      >
        Department Breakdown ({departmentsCount})
      </button>
    </div>
  );
}
