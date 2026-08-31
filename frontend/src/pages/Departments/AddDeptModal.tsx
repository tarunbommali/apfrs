import { useState, useEffect } from "react";
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
import type { Faculty } from "@/lib/queries";

interface AddDeptModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  facultyList: Faculty[];
  isPending: boolean;
  onSubmit: (data: {
    name: string;
    code: string;
    description: string;
    hodId: string | null;
    eapcet_code?: string;
    branch_code?: string;
  }) => Promise<void>;
}

export function AddDeptModal({
  isOpen,
  onOpenChange,
  facultyList,
  isPending,
  onSubmit,
}: AddDeptModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [hodId, setHodId] = useState("none");
  const [role, setRole] = useState("HOD");
  const [eapcetCode, setEapcetCode] = useState("");
  const [branchCode, setBranchCode] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setCode("");
      setDescription("");
      setHodId("none");
      setRole("HOD");
      setEapcetCode("");
      setBranchCode("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      code,
      description,
      hodId: hodId === "none" ? null : hodId,
      eapcet_code: eapcetCode,
      branch_code: branchCode,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Department</DialogTitle>
          <DialogDescription>
            Add a new academic department to organize faculty and manage leadership assignments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-name">Department Name *</Label>
            <Input
              id="add-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-code">Department Code *</Label>
            <Input
              id="add-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CSE"
              required
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-eapcet">AP EAPCET Code</Label>
              <Input
                id="add-eapcet"
                value={eapcetCode}
                onChange={(e) => setEapcetCode(e.target.value)}
                placeholder="e.g. CSE"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-branch">JNTU-GV Branch Code</Label>
              <Input
                id="add-branch"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g. 05"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-desc">Description</Label>
            <Input
              id="add-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional department details"
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <Label>Initial Incharge</Label>
              <Select value={hodId} onValueChange={setHodId}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Assigned</SelectItem>
                  {facultyList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.department})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole} disabled={hodId === "none"}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOD">HOD</SelectItem>
                  <SelectItem value="Department Incharge">Incharge</SelectItem>
                  <SelectItem value="Coordinator">Coordinator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
