import { useListInvoices } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, CheckCircle, Clock, XCircle, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusConfig = {
  pending: { icon: Clock, className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  paid: { icon: CheckCircle, className: "bg-green-100 text-green-700", label: "Paid" },
  cancelled: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Cancelled" },
};

export default function PatientInvoices() {
  const { user } = useAuth();
  const { data, isLoading } = useListInvoices({ patientId: user?.patientProfile?.id });
  const { toast } = useToast();

  const handleDownload = async (id: number) => {
    const res = await fetch(`/api/invoices/${id}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("hms_token")}` },
    });
    if (!res.ok) { toast({ title: "Failed to generate PDF", variant: "destructive" }); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `invoice-${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPending = (data?.invoices ?? []).filter(i => i.status === "pending").reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-4">
      {totalPending > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Outstanding Balance: ${totalPending.toLocaleString()}</p>
            <p className="text-xs text-yellow-600">Please contact reception to settle pending invoices.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (data?.invoices ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.invoices ?? []).map((inv) => {
            const cfg = statusConfig[inv.status as keyof typeof statusConfig] ?? statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <Card key={inv.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                        <Receipt className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold">Invoice #{String(inv.id).padStart(5, "0")}</p>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                            <Icon className="h-3 w-3" />{cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(inv.invoiceDate), "MMMM d, yyyy")}
                          {inv.dueDate && ` · Due ${format(new Date(inv.dueDate), "MMM d, yyyy")}`}
                        </p>
                        {(inv.items ?? []).length > 0 && (
                          <div className="space-y-1">
                            {(inv.items ?? []).map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.description}</span>
                                <span>${Number(item.amount).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                          <span className="text-sm font-semibold">Total</span>
                          <span className="text-sm font-bold">${Number(inv.totalAmount).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDownload(inv.id)} title="Download PDF">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
