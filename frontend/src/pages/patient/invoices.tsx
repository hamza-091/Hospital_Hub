import { useState } from "react";
import { useListInvoices, useUpdateInvoice } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Receipt, CheckCircle, Clock, XCircle, Download, Calendar, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { formatPKR } from "@/lib/currency";
import { useQueryClient } from "@tanstack/react-query";

const statusConfig = {
  pending: { icon: Clock, className: "bg-yellow-100 text-yellow-700", label: "Pending" },
  paid: { icon: CheckCircle, className: "bg-green-100 text-green-700", label: "Paid" },
  cancelled: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Cancelled" },
};

type PaymentStep = "qr" | "processing" | "done";

export default function PatientInvoices() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useListInvoices({ patientId: user?.patientProfile?.id });
  const { toast } = useToast();
  const updateInvoice = useUpdateInvoice();
  const queryClient = useQueryClient();

  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("qr");

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

  const handlePayClick = (invoice: any) => {
    setPayingInvoice(invoice);
    setPaymentStep("qr");
  };

  const handleDonePayment = () => {
    setPaymentStep("processing");
    // Simulate payment processing after 2-3 seconds
    setTimeout(() => {
      // Mark invoice as paid
      updateInvoice.mutate(
        { id: payingInvoice.id, data: { status: "paid" as any } },
        {
          onSuccess: () => {
            setPaymentStep("done");
            toast({ title: "Payment Successful!", description: `Invoice #${String(payingInvoice.id).padStart(5, "0")} has been paid.` });
            // Wait a moment then close and refetch
            setTimeout(() => {
              setPayingInvoice(null);
              setPaymentStep("qr");
              refetch();
              // Invalidate dashboard and appointment queries to refresh data
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/patient"] });
              queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
            }, 2000);
          },
          onError: (e) => {
            setPaymentStep("qr");
            toast({ title: "Payment Failed", description: e.message, variant: "destructive" });
          },
        }
      );
    }, 2500);
  };

  const totalPending = (data?.invoices ?? []).filter(i => i.status === "pending").reduce((s, i) => s + Number(i.totalAmount), 0);

  return (
    <div className="space-y-4">
      {totalPending > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Outstanding Balance: {formatPKR(totalPending)}</p>
            <p className="text-xs text-yellow-600">Please pay your pending invoices to confirm your appointments.</p>
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
                                <span>{formatPKR(item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t flex items-center justify-between">
                          <span className="text-sm font-semibold">Total</span>
                          <span className="text-sm font-bold">{formatPKR(inv.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {inv.status === "pending" && (
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => handlePayClick(inv)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay Now
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(inv.id)} title="Download PDF">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment QR Code Modal */}
      <Dialog open={!!payingInvoice} onOpenChange={(open) => {
        if (!open && paymentStep !== "processing") {
          setPayingInvoice(null);
          setPaymentStep("qr");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentStep === "qr" && "Scan QR Code to Pay"}
              {paymentStep === "processing" && "Processing Payment..."}
              {paymentStep === "done" && "Payment Successful!"}
            </DialogTitle>
            {paymentStep === "qr" && (
              <DialogDescription>
                Scan the QR code below using JazzCash to pay {payingInvoice && formatPKR(payingInvoice.totalAmount)} for Invoice #{payingInvoice && String(payingInvoice.id).padStart(5, "0")}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {paymentStep === "qr" && (
              <>
                <div className="rounded-xl border-2 border-dashed border-primary/30 p-3 bg-white">
                  <img
                    src="/payment-qr.jpeg"
                    alt="Payment QR Code - Scan to pay via JazzCash"
                    className="w-56 h-56 object-contain rounded-lg"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">HAMZA MEHMOOD-1916</p>
                  <p className="text-xs text-muted-foreground">Scan with JazzCash / Meezan Bank app</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 w-full text-center">
                  <p className="text-lg font-bold text-primary">{payingInvoice && formatPKR(payingInvoice.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">Amount to pay</p>
                </div>
                <Button onClick={handleDonePayment} className="w-full gap-2" size="lg">
                  <CheckCircle className="h-4 w-4" />
                  I've Done the Payment
                </Button>
              </>
            )}

            {paymentStep === "processing" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Verifying your payment...</p>
                <p className="text-xs text-muted-foreground">Please wait while we confirm your transaction</p>
              </div>
            )}

            {paymentStep === "done" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-500">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-700">Payment Confirmed!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {payingInvoice && formatPKR(payingInvoice.totalAmount)} paid successfully
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your appointment will be confirmed by the doctor shortly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
