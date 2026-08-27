import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Mailbox,
  Mails,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Sparkles,
  Table2,
  User,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";

const SIDEBAR_STORAGE_KEY = "apfrs.chatgpt_sidebar.collapsed";

type NavItem = {
  to: string;
  label: string;
  icon: any;
  roles: string[];
  section?: "main" | "management";
};

const navItems: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, roles: ["admin"], section: "main" },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"], section: "main" },
  { to: "/detailed", label: "Detailed View", icon: Table2, roles: ["admin"], section: "main" },
  { to: "/consolidated", label: "Bulk Dispatch", icon: Mails, roles: ["admin"], section: "main" },
  { to: "/status-dashboard", label: "Delivery Status", icon: Radio, roles: ["admin"], section: "main" },
  { to: "/calendar", label: "Academic Calendar", icon: CalendarDays, roles: ["admin", "faculty"], section: "management" },
  { to: "/admin-dashboard", label: "Faculty Registry", icon: UserRound, roles: ["admin"], section: "management" },
  { to: "/email-config", label: "Email Settings", icon: Mailbox, roles: ["admin"], section: "management" },
  { to: "/faculty-profile", label: "My Profile", icon: User, roles: ["faculty"], section: "main" },
];

export function ChatGPTSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "admin";

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/login", replace: true });
  };

  const allowedItems = navItems.filter((item) => item.roles.includes(role));
  const mainItems = allowedItems.filter((i) => i.section === "main");
  const managementItems = allowedItems.filter((i) => i.section === "management");

  // Get user initials
  const initials = (user?.name || "EA")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={`ink-gradient sticky top-0 z-30 flex h-screen flex-col border-r border-sidebar-border text-sidebar-foreground transition-all duration-300 ease-in-out select-none ${
          collapsed ? "w-[68px]" : "w-[260px]"
        }`}
      >
        {/* ── Header Bar ── */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-sidebar-border/80">
          {collapsed ? (
            /* Collapsed: Shows Logo by default, on Hover smoothly reveals Open Sidebar Toggle Button */
            <div className="flex w-full justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleSidebar}
                    aria-label="Open sidebar"
                    className="group relative flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-sidebar-accent"
                  >
                    {/* Default Logo */}
                    <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30 shadow-sm transition-all duration-200 group-hover:scale-0 group-hover:opacity-0">
                      <Sparkles className="size-4" />
                    </div>

                    {/* Hover Toggle Button Icon */}
                    <div className="absolute inset-0 flex items-center justify-center scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 text-sidebar-accent-foreground">
                      <PanelLeftOpen className="size-5" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
                  Open sidebar
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            /* Expanded: Logo + Title on left, Close Sidebar Toggle on right */
            <>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30 shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="font-semibold text-sm leading-tight text-sidebar-accent-foreground">e-Office Jntugv</span>
                  <span className="text-[10px] text-sidebar-foreground/70 leading-tight">Attendance System</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleSidebar}
                      aria-label="Close sidebar"
                      className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <PanelLeftClose className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
                    Close sidebar
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>

        {/* ── Top Action: New Import (like "New chat") ── */}
        {role === "admin" ? (
          <div className="px-3 pt-3 pb-1">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/import"
                    className={`flex size-10 mx-auto items-center justify-center rounded-lg transition-colors ${
                      pathname === "/import"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Plus className="size-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
                  Import Biometric Data
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/import"
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border border-sidebar-border/60 ${
                  pathname === "/import"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="size-4 text-sidebar-primary" />
                  <span>Import Data</span>
                </div>
                <span className="rounded bg-sidebar-primary/20 px-1.5 py-0.5 text-[10px] text-sidebar-primary font-mono font-bold">XLSX</span>
              </Link>
            )}
          </div>
        ) : null}

        {/* ── Navigation Links ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-sidebar-border">
          {/* Main Section */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-semibold text-sidebar-foreground/50 tracking-wider uppercase">
                Workspace
              </p>
            )}
            {mainItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;

              return collapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      className={`flex size-10 mx-auto items-center justify-center rounded-lg transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="size-4.5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0 text-sidebar-foreground/70" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Management Section */}
          {managementItems.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-sidebar-border/60">
              {!collapsed && (
                <p className="px-2 pb-1 text-[11px] font-semibold text-sidebar-foreground/50 tracking-wider uppercase">
                  Management
                </p>
              )}
              {managementItems.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;

                return collapsed ? (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.to}
                        className={`flex size-10 mx-auto items-center justify-center rounded-lg transition-colors ${
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Icon className="size-4.5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0 text-sidebar-foreground/70" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer: User Profile / Sign Out (ChatGPT Style) ── */}
        <div className="border-t border-sidebar-border/80 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent ${
                  collapsed ? "justify-center" : "justify-between"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 text-white font-bold text-xs shadow-md">
                    {initials}
                  </div>

                  {!collapsed && (
                    <div className="flex flex-col text-left truncate">
                      <span className="truncate text-xs font-semibold text-sidebar-accent-foreground">
                        {user?.name || "Administrator"}
                      </span>
                      <span className="truncate text-[10px] text-sidebar-foreground/60">
                        {user?.email || "admin@apfrs.in"}
                      </span>
                    </div>
                  )}
                </div>

                {!collapsed && <ChevronUp className="size-4 text-sidebar-foreground/50" />}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align={collapsed ? "end" : "start"}
              className="w-56 bg-sidebar text-sidebar-foreground border-sidebar-border shadow-2xl"
            >
              <DropdownMenuLabel className="font-normal text-xs text-sidebar-foreground/70">
                Signed in as <strong className="text-sidebar-accent-foreground block font-semibold truncate">{user?.name || "Administrator"}</strong>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-sidebar-border" />

              {role === "faculty" && (
                <DropdownMenuItem asChild className="hover:bg-sidebar-accent text-xs cursor-pointer">
                  <Link to="/faculty-profile" className="flex items-center gap-2">
                    <User className="size-3.5" /> My Profile
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild className="hover:bg-sidebar-accent text-xs cursor-pointer">
                <Link to="/calendar" className="flex items-center gap-2">
                  <CalendarDays className="size-3.5" /> Academic Calendar
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-sidebar-border" />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 text-xs cursor-pointer flex items-center gap-2"
              >
                <LogOut className="size-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
