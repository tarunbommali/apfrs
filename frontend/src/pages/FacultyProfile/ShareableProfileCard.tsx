import { useRef, useState } from "react";
import { Download, Linkedin, Check, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ShareableProfileCardProps {
  profile: {
    name?: string;
    email?: string;
    cfmsId?: string;
    cfms_id?: string;
    designation?: string;
    department?: string;
    mobile?: string;
    incharge?: string;
    jobStatus?: string;
    job_status?: string;
    dateOfJoining?: string;
    date_of_joining?: string;
    createdAt?: string;
    created_at?: string;
    /** When incharge is a term-based institutional role (Principal, Registrar, etc.),
     *  this is when THAT TERM started — distinct from overall teaching tenure. */
    positionSince?: string;
    position_since?: string;
    /** Highest academic qualification, e.g. "Ph.D", "M.Tech". Shown on the left card face
     *  where "Designation" used to be duplicated. */
    higherEducation?: string;
    higher_education?: string;
    qualification?: string;
    photoURL?: string;
    photo_url?: string;
  };
}

const DEPT_FULL_NAMES: Record<string, string> = {
  IT: "Information Technology",
  CSE: "Computer Science and Engineering",
  ECE: "Electronics and Communication Engineering",
  EEE: "Electrical and Electronics Engineering",
  ME: "Mechanical Engineering",
  MET: "Metallurgical Engineering",
  CIVIL: "Civil Engineering",
  "BS&HSS": "Basic Sciences & Humanities",
  BSH: "Basic Sciences & Humanities",
  MATH: "Mathematics",
  PHYSICS: "Physics",
  CHEMISTRY: "Chemistry",
};

/** Term-based institutional positions — not department-scoped, tracked by their own tenure. */
const INSTITUTIONAL_ROLES: Record<string, { headerTitle: string; badgeNoun: string }> = {
  PRINCIPAL: { headerTitle: "Office of the Principal", badgeNoun: "Principal" },
  "VICE PRINCIPAL": { headerTitle: "Office of the Vice-Principal", badgeNoun: "Vice-Principal" },
  "VICE-PRINCIPAL": { headerTitle: "Office of the Vice-Principal", badgeNoun: "Vice-Principal" },
  REGISTRAR: { headerTitle: "Office of the Registrar", badgeNoun: "Registrar" },
  DEAN: { headerTitle: "Office of the Dean", badgeNoun: "Dean" },
  DIRECTOR: { headerTitle: "Office of the Director", badgeNoun: "Director" },
  "CONTROLLER OF EXAMINATIONS": {
    headerTitle: "Office of the Controller of Examinations",
    badgeNoun: "Controller of Examinations",
  },
};

type RoleTier = "institutional" | "hod" | "incharge-generic" | "faculty";

function getFullDepartmentName(deptCode?: string): string {
  if (!deptCode) return "Engineering & Technology";
  const upper = deptCode.trim().toUpperCase();
  return DEPT_FULL_NAMES[upper] || deptCode;
}

function formatDate(dateVal?: string | null): string {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d
      .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
  } catch {
    return "—";
  }
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

function getInchargeRole(incharge?: string): string | null {
  const raw = (incharge || "").trim();
  if (raw !== "" && raw.toLowerCase() !== "none") return raw;
  return null;
}

function classifyRole(inchargeRole: string | null): {
  tier: RoleTier;
  config: (typeof INSTITUTIONAL_ROLES)[string] | null;
} {
  if (!inchargeRole) return { tier: "faculty", config: null };
  const key = inchargeRole.trim().toUpperCase();
  if (INSTITUTIONAL_ROLES[key]) return { tier: "institutional", config: INSTITUTIONAL_ROLES[key] };
  if (key === "HOD") return { tier: "hod", config: null };
  return { tier: "incharge-generic", config: null };
}

/** Whole-years diff, floor-based (no partial year rounds up). */
function yearsBetween(fromDate: Date, toDate: Date): number {
  let years = toDate.getFullYear() - fromDate.getFullYear();
  const hadAnniversary =
    toDate.getMonth() > fromDate.getMonth() ||
    (toDate.getMonth() === fromDate.getMonth() && toDate.getDate() >= fromDate.getDate());
  if (!hadAnniversary) years -= 1;
  return years;
}

function monthsBetween(fromDate: Date, toDate: Date): number {
  return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
}

/** "X Years at JNTU-GV" — overall teaching tenure, used for faculty/HOD/generic incharge. */
function getServiceTenureBadge(dateVal?: string | null): string {
  if (!dateVal) return "JNTU-GV Faculty";
  const joined = new Date(dateVal);
  if (isNaN(joined.getTime())) return "JNTU-GV Faculty";
  const years = yearsBetween(joined, new Date());
  if (years >= 1) return `${years} Year${years > 1 ? "s" : ""} at JNTU-GV`;
  const months = monthsBetween(joined, new Date());
  if (months >= 1) return `${months} Month${months > 1 ? "s" : ""} at JNTU-GV`;
  return "New at JNTU-GV";
}

/** "X Years as Principal" — term-based tenure for institutional roles. */
function getPositionTenureBadge(positionSince: string | null, badgeNoun: string): string {
  if (!positionSince) return badgeNoun;
  const since = new Date(positionSince);
  if (isNaN(since.getTime())) return badgeNoun;
  const years = yearsBetween(since, new Date());
  if (years >= 1) return `${years} Year${years > 1 ? "s" : ""} as ${badgeNoun}`;
  const months = monthsBetween(since, new Date());
  if (months >= 1) return `${months} Month${months > 1 ? "s" : ""} as ${badgeNoun}`;
  return `New as ${badgeNoun}`;
}

/** Formatted experience calculated from joining date (e.g. "2 Yrs 4 Mos", "5 Years", "8 Months") */
function getExperienceFormatted(dateVal?: string | null): string {
  if (!dateVal) return "—";
  const joined = new Date(dateVal);
  if (isNaN(joined.getTime())) return "—";
  const now = new Date();
  if (joined > now) return "Recent";

  const years = yearsBetween(joined, now);
  const totalMonths = monthsBetween(joined, now);
  const remainingMonths = totalMonths % 12;

  if (years >= 1) {
    if (remainingMonths > 0) {
      return `${years} Yrs ${remainingMonths} Mos`;
    }
    return `${years} Year${years > 1 ? "s" : ""}`;
  }
  if (totalMonths >= 1) {
    return `${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
  }
  return "< 1 Month";
}

export function ShareableProfileCard({ profile }: ShareableProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const deptCode = profile.department || "IT";
  const deptFullName = getFullDepartmentName(deptCode);
  const designation = profile.designation || "Assistant Professor";

  const inchargeRole = getInchargeRole(profile.incharge);
  const { tier, config } = classifyRole(inchargeRole);

  const inchargeTitle =
    tier === "hod" ? "Head of Department" : tier === "institutional" ? config!.badgeNoun : inchargeRole;

  const rawCadre = (profile.jobStatus || profile.job_status || "").trim();
  const cadre = rawCadre ? toTitleCase(rawCadre) : "Regular";

  const joinDateRaw =
    profile.dateOfJoining || profile.date_of_joining || profile.createdAt || profile.created_at;
  const dateJoined = formatDate(joinDateRaw);
  const experienceFormatted = getExperienceFormatted(joinDateRaw);

  const positionSinceRaw = profile.positionSince || profile.position_since || null;
  // Term-based roles fall back to overall join date if no explicit term-start is on file.
  const effectivePositionSince = tier === "institutional" ? positionSinceRaw || joinDateRaw : null;
  const positionSinceFormatted = effectivePositionSince ? formatDate(effectivePositionSince) : "—";

  const tenureBadge =
    tier === "institutional"
      ? getPositionTenureBadge(effectivePositionSince, config!.badgeNoun)
      : getServiceTenureBadge(joinDateRaw);

  const headerEyebrow = tier === "institutional" ? config!.headerTitle : `Department of ${deptFullName}`;

  // Highest academic qualification — replaces the duplicated "Designation" grid cell.
  const qualification =
    (profile.higherEducation || profile.higher_education || profile.qualification || "").trim() || "—";

  const photoSrc = profile.photoURL || profile.photo_url;
  const showPhoto = Boolean(photoSrc && !photoFailed);
  const facultyName = profile.name || "Faculty Member";

  const exportCard = async (opts: { pixelRatio: number }) => {
    if (!cardRef.current) throw new Error("Card not mounted");
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const rect = cardRef.current.getBoundingClientRect();
    return {
      dataUrl: await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: opts.pixelRatio,
        quality: 1,
        canvasWidth: Math.round(rect.width * opts.pixelRatio),
        canvasHeight: Math.round(rect.height * opts.pixelRatio),
        // Fetch cross-origin images (e.g. the faculty photo host) without requiring
        // the server to send CORS headers. Falls back gracefully per-image if a
        // particular host still blocks it — the rest of the export still succeeds.
        fetchRequestInit: { mode: "cors", cache: "no-cache" },
      }),
      width: Math.round(rect.width * opts.pixelRatio),
      height: Math.round(rect.height * opts.pixelRatio),
    };
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const { dataUrl, width, height } = await exportCard({ pixelRatio: 2 });
      const link = document.createElement("a");
      const safeName = facultyName.replace(/[^a-zA-Z0-9]/g, "_");
      link.download = `${safeName}_LinkedIn_Profile_Card.png`;
      link.href = dataUrl;
      link.click();
      toast.success(`Profile card downloaded! (${width} × ${height} px)`);
    } catch (err) {
      console.error("Failed to export image:", err);
      toast.error("Failed to generate image download.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareLinkedIn = async () => {
    try {
      const { dataUrl } = await exportCard({ pixelRatio: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        toast.success("Card copied to clipboard! Ready to paste into LinkedIn post.");
        setTimeout(() => setCopied(false), 2500);
      } else {
        await handleDownload();
      }
    } catch {
      await handleDownload();
    }
  };

  return (
    <div className="surface-panel overflow-hidden p-6 flex flex-col items-center justify-center gap-4">
      {/* ── Exportable Parchment Card ── */}
      <div className="w-full max-w-[440px] shadow-2xl rounded-sm overflow-hidden border border-[#D5CBBF]">
        <div
          ref={cardRef}
          className="relative w-full aspect-[4/5] bg-[#FAF7F2] text-[#1E293B] p-6 sm:p-8 flex flex-col justify-between select-none font-sans"
          style={{
            backgroundImage: "radial-gradient(#E8DFD1 0.75px, transparent 0.75px)",
            backgroundSize: "16px 16px",
          }}
        >
          <div className="absolute inset-3 border border-[#80142B]/20 pointer-events-none rounded-[2px]" />
          <div className="absolute inset-4 border border-[#80142B]/40 pointer-events-none rounded-[1px]" />

          {/* Top Header — role-aware: institution office vs. department */}
          <div className="relative z-10 text-center pt-2">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.2em] text-[#80142B] uppercase">
              {headerEyebrow}
            </p>
            <p className="text-[8px] sm:text-[9px] font-semibold tracking-[0.18em] text-[#475569] uppercase mt-0.5">
              JNTU-GV College of Engineering · Vizianagaram
            </p>
            <div className="w-12 h-[1px] bg-[#80142B]/30 mx-auto mt-2" />
          </div>

          {/* Center Profile Section */}
          <div className="relative z-10 text-center flex flex-col items-center my-auto py-2">
            <div className="relative size-24 sm:size-28 rounded-full p-1 bg-[#EFE8DC] border border-[#80142B]/30 shadow-inner flex items-center justify-center mb-3">
              <div className="size-full rounded-full overflow-hidden border border-dashed border-[#80142B]/40 flex items-center justify-center bg-[#E5DCCD]">
                {showPhoto ? (
                  <img
                    key={photoSrc}
                    src={photoSrc}
                    alt={facultyName}
                    className="size-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    onError={() => setPhotoFailed(true)}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[#D8CDBE] text-[#6A5A4A] font-serif text-2xl font-bold">
                    {facultyName.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {!showPhoto && (
              <span className="text-[8px] tracking-widest uppercase text-[#94A3B8] font-mono -mt-1 mb-1">
                Faculty Photo
              </span>
            )}

            <h1
              className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-serif"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {facultyName}
            </h1>

            <p
              className="text-xs sm:text-sm font-medium text-[#80142B] font-serif mt-0.5"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {designation}
              {inchargeTitle ? ` • ${inchargeTitle}` : ""}
            </p>

            {/* Institutional roles show their TERM start; everyone else shows overall join date */}
            {tier === "institutional" ? (
              positionSinceFormatted !== "—" && (
                <p className="text-[8px] sm:text-[9px] font-mono font-semibold tracking-[0.15em] text-[#64748B] uppercase mt-1">
                  {config!.badgeNoun} Since {positionSinceFormatted}
                </p>
              )
            ) : (
              dateJoined !== "—" && (
                <p className="text-[8px] sm:text-[9px] font-mono font-semibold tracking-[0.15em] text-[#64748B] uppercase mt-1">
                  In Service Since {dateJoined}
                </p>
              )
            )}

            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-[#80142B]/30 bg-[#80142B]/5 text-[#80142B] whitespace-nowrap">
              <span className="text-[7px] shrink-0">◆</span>
              <span className="text-[8px] sm:text-[9px] font-bold tracking-[0.14em] uppercase">
                {tenureBadge}
              </span>
            </div>
          </div>

          {/* 2x2 Grid — Row 1 now shows Qualification instead of a duplicated Designation;
              Row 2 swaps Department/Experience for Position/Since on institutional roles */}
          <div className="relative z-10 border-t border-[#D5CBBF] py-2.5 my-1">
            <div className="grid grid-cols-2 divide-x divide-[#D5CBBF]">
              <div className="pr-3 pb-2 text-left">
                <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] block">
                  Qualification
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block leading-tight mt-0.5 truncate">
                  {qualification}
                </span>
              </div>
              <div className="pl-3 pb-2 text-left">
                <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] block">
                  Cadre
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0F172A] block leading-tight mt-0.5">
                  {cadre}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#D5CBBF] pt-2 border-t border-[#E8DFD1]">
              {tier === "institutional" ? (
                <>
                  <div className="pr-3 text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Position
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] block leading-tight mt-0.5 truncate">
                      {config!.badgeNoun}
                    </span>
                  </div>
                  <div className="pl-3 text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Since
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] block leading-tight mt-0.5">
                      {positionSinceFormatted}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="pr-3 text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Department
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] block leading-tight mt-0.5 truncate">
                      {deptFullName}
                    </span>
                  </div>
                  <div className="pl-3 text-left">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[#64748B] block">
                      Experience
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#0F172A] block leading-tight mt-0.5">
                      {experienceFormatted}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Toolbar — monochrome, equal weight ── */}
      <TooltipProvider delayDuration={150}>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleShareLinkedIn}
                aria-label="Copy card for LinkedIn"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors duration-150"
              >
                {copied ? <Check className="size-4" /> : <Linkedin className="size-4" />}
                {copied ? "Copied" : "Copy for LinkedIn"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Copies the card image to your clipboard
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                aria-label="Download card as PNG"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                {isExporting ? "Exporting…" : "Download PNG"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Saves a high-resolution PNG
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}