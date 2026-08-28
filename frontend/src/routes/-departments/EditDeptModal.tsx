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
import type { Department } from "@/lib/queries";

interface EditDeptModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDept: Department | null;
  isPending: boolean;
  onSubmit: (data: {
    name: string;
    code: string;
    description: string;
    status: "active" | "inactive";
    eapcet_code?: string;
    branch_code?: string;
  }) => Promise<void>;
}

export function EditDeptModal({
  isOpen,
  onOpenChange,
  selectedDept,
  isPending,
  onSubmit,
}: EditDeptModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [eapcetCode, setEapcetCode] = useState("");
  const [branchCode, setBranchCode] = useState("");

  useEffect(() => {
    if (selectedDept && isOpen) {
      setName(selectedDept.name);
      setCode(selectedDept.code);
      setDescription(selectedDept.description || "");
      setStatus(selectedDept.status);
      setEapcetCode(selectedDept.eapcet_code || selectedDept.eapcetCode || "");
      setBranchCode(selectedDept.branch_code || selectedDept.branchCode || "");
    }
  }, [selectedDept, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      code,
      description,
      status,
      eapcet_code: eapcetCode,
      branch_code: branchCode,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>Modify department master records.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Department Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-code">Department Code *</Label>
            <Input
              id="edit-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-eapcet">AP EAPCET Code</Label>
              <Input
                id="edit-eapcet"
                value={eapcetCode}
                onChange={(e) => setEapcetCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-branch">JNTU-GV Branch Code</Label>
              <Input
                id="edit-branch"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <Input
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
