interface ProfileData {
  name?: string;
  email?: string;
  cfmsId?: string;
  cfms_id?: string;
  designation?: string;
  department?: string;
  mobile?: string;
  gender?: string;
  incharge?: string;
  jobStatus?: string;
  job_status?: string;
  higherEducation?: string;
  higher_education?: string;
  createdAt?: string;
  created_at?: string;
  dateOfJoining?: string;
  date_of_joining?: string;
  photoURL?: string;
  photo_url?: string;
}

interface IdentityDetailsProps {
  profile: ProfileData;
}

function formatDateOfJoin(dateVal?: string | null): string {
  if (!dateVal) return "01 Aug 2024";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "01 Aug 2024";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "01 Aug 2024";
  }
}

function getGenderLabel(gender?: string): string {
  if (!gender) return "Male";
  return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
}

function getInchargeRole(incharge?: string): string | null {
  const raw = (incharge || "").trim();
  if (raw !== "" && raw !== "None" && raw.toLowerCase() !== "none") {
    return raw;
  }
  return null;
}

export function IdentityDetails({ profile }: IdentityDetailsProps) {
  const inchargeRole = getInchargeRole(profile.incharge);
  const genderLabel = getGenderLabel(profile.gender);
  const dateOfJoinStr = formatDateOfJoin(
    profile.dateOfJoining || profile.date_of_joining || profile.createdAt || profile.created_at
  );
  const cadreStr = (profile.jobStatus || profile.job_status || "Regular").trim();
  const cadreLabel = cadreStr.toLowerCase() === "regular" ? "Regular" : "Contract";
  const higherEd = profile.higherEducation || profile.higher_education;

  const identityDetails: [string, string][] = [
    ["CFMS ID", profile.cfmsId || profile.cfms_id || "N/A"],
    ["Email", profile.email || "N/A"],
    ["Mobile", profile.mobile || "N/A"],
    ["Gender", genderLabel],
    ["Date of Joining", dateOfJoinStr],
    ["Post / Cadre", cadreLabel],
    ["Designation", profile.designation || "Assistant Professor"],
    ...(higherEd ? [["Higher Education", higherEd] as [string, string]] : []),
    ["Department", profile.department || "General"],
  ];

  if (inchargeRole) {
    identityDetails.push(["Incharge", inchargeRole]);
  }

  return (
    <section className="surface-panel p-6">
      <div className="flex items-center gap-4 border-b border-border/60 pb-5">
        <div className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-muted flex items-center justify-center font-mono text-lg font-semibold text-foreground shadow-sm">
          {profile.photoURL || profile.photo_url ? (
            <img
              src={profile.photoURL || profile.photo_url}
              alt={profile.name || "Faculty avatar"}
              className="size-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span>{profile.name ? profile.name.slice(0, 1) : "F"}</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{profile.name}</h2>
            {inchargeRole && (
              <span className="rounded-sm bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                {inchargeRole}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-muted-foreground">{profile.designation}</p>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity & Service Details</h3>
        <dl className="mt-3 space-y-2.5 text-sm">
          {identityDetails.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground text-xs font-medium">{k}</dt>
              <dd className="text-right">
                {k === "Department" ? (
                  <span className="inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--badge-accent-bg)] text-[var(--badge-accent-fg)] border border-primary/20">
                    {v}
                  </span>
                ) : k === "Post / Cadre" ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider border ${
                      v.toLowerCase() === "regular"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {v}
                  </span>
                ) : k === "Incharge" ? (
                  <span className="inline-flex items-center rounded-md bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent-foreground border border-accent/30">
                    {v}
                  </span>
                ) : (
                  <span className="font-mono text-xs font-semibold text-foreground">{v}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
