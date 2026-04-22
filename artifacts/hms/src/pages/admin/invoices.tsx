import { useState } from "react";
import { useListInvoices, useUpdateInvoice } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { formatPKR } from "@/lib/currency";

const statusConfig = {
  pending: { icon: Clock, className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  paid: { icon: CheckCircle, className: "bg-green-100 text-green-700", label: "Paid" },
  cancelled: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Cancelled" },
};

export default function AdminInvoices() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading, refetch } = useListInvoices({ status: status !== "all" ? status as any : undefined });
  const updateInvoice = useUpdateInvoice();
  const { toast } = useToast();

  const handleMarkPaid = (id: number) => {
    updateInvoice.mutate(
      { id, data: { status: "paid" } },
      {
        onSuccess: () => { toast({ title: "Invoice marked as paid" }); refetch(); },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  };

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

  const filtered = (data?.invoices ?? []).filter(inv =>
    !search || inv.patient?.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by patient..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No invoices found</td></tr>
                  )}
                  {filtered.map((inv) => {
                    const cfg = statusConfig[inv.status as keyof typeof statusConfig] ?? statusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-muted-foreground">#{String(inv.id).padStart(5, "0")}</td>
                        <td className="px-4 py-3 font-medium">{inv.patient?.user?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {format(new Date(inv.invoiceDate), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatPKR(inv.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.className}`}>
                            <Icon className="h-3 w-3" />{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.status === "pending" && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleMarkPaid(inv.id)}>
                                Mark Paid
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(inv.id)} title="Download PDF">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

