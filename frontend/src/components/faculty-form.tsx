import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Save } from "lucide-react";
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

export const emptyFaculty: FacultyInput = {
  cfmsId: "",
  name: "",
  email: "",
  designation: "Assistant Professor",
  department: "IT",
  mobile: "",
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="surface-panel p-6">
        <h2 className="text-base font-semibold">Identity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          CFMS ID and email are used to match biometric records and deliver monthly statements.
        </p>
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
        </div>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-base font-semibold">Posting</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              list="apfrs-departments"
              value={values.department}
              maxLength={40}
              onChange={(e) => set("department", e.target.value)}
            />
            <datalist id="apfrs-departments">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {field("department")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={values.designation}
              maxLength={80}
              onChange={(e) => set("designation", e.target.value)}
            />
            {field("designation")}
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

      <section className="surface-panel p-6">
        <h2 className="text-base font-semibold">Current cycle attendance</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Overwritten on the next biometric import; used for the report preview meanwhile.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-4">
          {(["present", "absent", "leave", "workingDays"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="capitalize">
                {key === "workingDays" ? "Working days" : key}
              </Label>
              <Input
                id={key}
                type="number"
                min={0}
                max={31}
                value={values[key]}
                onChange={(e) => set(key, Number(e.target.value) as FacultyInput[typeof key])}
              />
              {field(key)}
            </div>
          ))}
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
