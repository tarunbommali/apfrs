import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Save, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { departments } from "@/lib/apfrs-data";
import { facultySchema, jobStatuses, type FacultyInput } from "@/lib/faculty-registry";
import { useQuery } from "@tanstack/react-query";
import { departmentsQuery } from "@/lib/queries";

export const emptyFaculty: FacultyInput = {
  cfmsId: "",
  name: "",
  email: "",
  photoURL: null,
  designation: "Assistant Professor",
  higherEducation: "",
  department: "IT",
  mobile: "",
  gender: "male",
  jobStatus: "Regular",
  present: 0,
  absent: 0,
  leave: 0,
  workingDays: 24,
};

type Errors = Partial<Record<keyof FacultyInput, string>>;

export function FacultyForm({
  initial,
  submitLabel,
  onSubmit,
  footer,
}: {
  initial: FacultyInput;
  submitLabel: string;
  onSubmit: (value: FacultyInput) => void;
  footer?: React.ReactNode;
}) {
  const [values, setValues] = useState<FacultyInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [imgError, setImgError] = useState(false);

  const { data: deptsData } = useQuery(departmentsQuery({ status: "active" }));
  const dbDepartments = useMemo(() => {
    const list = deptsData?.departments?.map((d) => d.code) || departments;
    const cleanList = Array.from(new Set(list));
    if (!cleanList.some(code => code.toLowerCase() === "uncategorized")) {
      cleanList.push("Uncategorized");
    }
    return cleanList;
  }, [deptsData]);

  const set = <K extends keyof FacultyInput>(key: K, value: FacultyInput[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = facultySchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FacultyInput;
        if (!next[key]) next[key] = issue.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  const field = (key: keyof FacultyInput) =>
    errors[key] ? <p className="text-xs font-medium text-destructive">{errors[key]}</p> : null;

  const initials = values.name
    ? values.name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "FA";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Identity Section ── */}
      <section className="surface-panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-semibold">Identity</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              CFMS ID, institutional email, and faculty profile credentials.
            </p>
          </div>

          {/* Photo Avatar Preview */}
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center shrink-0 shadow-sm">
              {values.photoURL && !imgError ? (
                <img
                  src={values.photoURL}
                  alt={values.name || "Faculty preview"}
                  className="size-full object-cover"
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                />
              ) : (
                <span className="font-semibold text-sm text-muted-foreground">{initials}</span>
              )}
            </div>
            <div className="text-xs">
              <span className="font-medium block text-foreground">Avatar Preview</span>
              <span className="text-[11px] text-muted-foreground">
                {values.photoURL && !imgError ? "Photo linked" : "Initials fallback"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cfmsId">CFMS ID</Label>
            <Input
              id="cfmsId"
              value={values.cfmsId}
              maxLength={20}
              onChange={(e) => set("cfmsId", e.target.value)}
              placeholder="1000218038"
            />
            {field("cfmsId")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={values.name}
              maxLength={100}
              onChange={(e) => set("name", e.target.value)}
              placeholder="B. Tirumula Rao"
            />
            {field("name")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Institutional email</Label>
            <Input
              id="email"
              type="email"
              value={values.email}
              maxLength={255}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name.dept@jntugvcev.edu.in"
            />
            {field("email")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              inputMode="numeric"
              value={values.mobile}
              maxLength={10}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              placeholder="9876543210"
            />
            {field("mobile")}
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={values.gender || "male"}
              onValueChange={(v) => set("gender", v as FacultyInput["gender"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {field("gender")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photoURL">Photo URL (optional)</Label>
            <Input
              id="photoURL"
              type="url"
              value={values.photoURL || ""}
              maxLength={500}
              onChange={(e) => {
                setImgError(false);
                set("photoURL", e.target.value.trim() ? e.target.value.trim() : null);
              }}
              placeholder="https://example.com/photos/avatar.jpg"
            />
            {field("photoURL")}
          </div>
        </div>
      </section>

      {/* ── Posting & Department Section ── */}
      <section className="surface-panel p-6">
        <h2 className="text-base font-semibold">Posting & Department</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Academic department, official designation, and employment status.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={values.department}
              onValueChange={(v) => set("department", v)}
            >
              <SelectTrigger id="department">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {dbDepartments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field("department")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={values.designation}
              maxLength={80}
              onChange={(e) => set("designation", e.target.value)}
              placeholder="Assistant Professor"
            />
            {field("designation")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="higherEducation">Higher education</Label>
            <Input
              id="higherEducation"
              value={values.higherEducation || ""}
              maxLength={100}
              onChange={(e) => set("higherEducation", e.target.value)}
              placeholder="e.g. Ph.D, M.Tech, M.Sc"
            />
            {field("higherEducation")}
          </div>

          <div className="space-y-2">
            <Label>Job status</Label>
            <Select
              value={values.jobStatus}
              onValueChange={(v) => set("jobStatus", v as FacultyInput["jobStatus"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {jobStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field("jobStatus")}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{footer}</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/admin-dashboard">Cancel</Link>
          </Button>
          <Button type="submit">
            <Save className="size-4" /> {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
