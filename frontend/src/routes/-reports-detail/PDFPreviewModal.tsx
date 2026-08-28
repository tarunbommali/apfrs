import { Button } from "@/components/ui/button";

interface PDFPreviewModalProps {
  cfmsId: string | null;
  onClose: () => void;
  month: number;
  year: number;
  monthName: string;
}

export function PDFPreviewModal({
  cfmsId,
  onClose,
  month,
  year,
  monthName,
}: PDFPreviewModalProps) {
  if (!cfmsId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#12121a] border border-white/10 w-full max-w-4xl h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 p-4 bg-[#1a1a25]">
          <div>
            <h3 className="font-bold text-sm text-[#e8e8ed]">Report Preview</h3>
            <p className="text-[11px] text-white/50">
              Month: {monthName} {year} · CFMS ID: {cfmsId}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            Close
          </Button>
        </div>
        <div className="flex-1 bg-white p-2">
          <iframe
            src={`/api/admin/attendance/report/${cfmsId}/preview?month=${month}&year=${year}`}
            className="w-full h-full border-0 rounded"
            title="Attendance Statement Preview"
          />
        </div>
      </div>
    </div>
  );
}
