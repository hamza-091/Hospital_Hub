import { useListPrescriptions } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function PatientPrescriptions() {
  const { user } = useAuth();
  const { data, isLoading } = useListPrescriptions({ patientId: user?.patientProfile?.id });
  const { toast } = useToast();

  const handleDownload = async (id: number) => {
    const res = await fetch(`/api/prescriptions/${id}/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("hms_token")}` },
    });
    if (!res.ok) { toast({ title: "Failed to generate PDF", variant: "destructive" }); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `prescription-${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (data?.prescriptions ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Pill className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No prescriptions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.prescriptions ?? []).map((pres) => (
            <Card key={pres.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Pill className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold">Dr. {pres.doctor?.name ?? "—"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[pres.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {pres.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(pres.prescribedDate), "MMMM d, yyyy")}
                        {pres.expiryDate && ` · Expires ${format(new Date(pres.expiryDate), "MMM d, yyyy")}`}
                      </p>
                      <div className="space-y-1.5">
                        {(pres.items ?? []).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                            <Pill className="h-3 w-3 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{item.medicine?.name}</span>
                              <span className="text-muted-foreground"> · {item.dosage} · {item.frequency}</span>
                              {item.duration && <span className="text-muted-foreground"> · {item.duration}</span>}
                              {item.instructions && <p className="text-muted-foreground truncate">{item.instructions}</p>}
                            </div>
                            {item.quantity && <span className="text-muted-foreground shrink-0">Qty: {item.quantity}</span>}
                          </div>
                        ))}
                        {(pres.items ?? []).length === 0 && (
                          <p className="text-xs text-muted-foreground">No items</p>
                        )}
                      </div>
                      {pres.notes && <p className="text-xs text-muted-foreground mt-2">{pres.notes}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDownload(pres.id)} title="Download PDF">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
