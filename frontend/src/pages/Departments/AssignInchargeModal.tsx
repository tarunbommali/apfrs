import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Department, Faculty } from "@/lib/queries";

interface AssignInchargeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDept: Department | null;
  facultyList: Faculty[];
  isPending: boolean;
  onSubmit: (data: {
    hodId: string | null;
    role: string;
    startDate: string;
    endDate: string | null;
  }) => Promise<void>;
}

export function AssignInchargeModal({
  isOpen,
  onOpenChange,
  selectedDept,
  facultyList,
  isPending,
  onSubmit,
}: AssignInchargeModalProps) {
  const [hodId, setHodId] = useState("none");
  const [role, setRole] = useState("HOD");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (selectedDept && isOpen) {
      setHodId(selectedDept.hod_id || "none");
      setRole(selectedDept.hod_id ? "HOD" : "HOD");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
    }
  }, [selectedDept, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hodId: hodId === "none" ? null : hodId,
      role,
      startDate,
      endDate: endDate || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Department Incharge</DialogTitle>
          <DialogDescription>
            Select an existing faculty member to assign leadership for {selectedDept?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1 bg-muted/30 p-3 rounded border border-border text-xs">
            <span className="font-semibold text-foreground block">Current Assignment</span>
            {selectedDept?.hod_id ? (
              <span className="text-muted-foreground">
                {selectedDept.hod_name} ({selectedDept.hod_email})
              </span>
            ) : (
              <span className="text-muted-foreground italic">None Assigned</span>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Select New HOD/Incharge</Label>
            <Select value={hodId} onValueChange={setHodId}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Clear Assignment (Not Assigned)</SelectItem>
                {facultyList
                  .filter((f) => f.department?.toLowerCase() === selectedDept?.code?.toLowerCase())
                  .map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leadership Role</Label>
            <Select value={role} onValueChange={setRole} disabled={hodId === "none"}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOD">HOD</SelectItem>
                <SelectItem value="Department Incharge">Department Incharge</SelectItem>
                <SelectItem value="Coordinator">Coordinator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-start-date">Appointment Start Date (required)</Label>
            <Input
              id="assign-start-date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={hodId === "none"}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-end-date">Appointment End Date (optional)</Label>
            <Input
              id="assign-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Leave empty for open-ended"
              disabled={hodId === "none"}
              className="text-xs"
            />
          </div>
          {selectedDept?.hod_id && hodId !== "none" && hodId !== selectedDept.hod_id && (
            <div className="flex gap-2 items-start text-xs bg-amber-500/10 p-3 rounded border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <Shield className="size-4 mt-0.5 shrink-0" />
              <span>
                <strong>Note:</strong> Saving this will replace the current HOD <strong>{selectedDept.hod_name}</strong>.
              </span>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Assigning..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
