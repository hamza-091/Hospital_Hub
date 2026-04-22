import { useListMedicalRecords } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function PatientRecords() {
  const { user } = useAuth();
  const { data, isLoading } = useListMedicalRecords({ patientId: user?.patientProfile?.id });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (data?.records ?? []).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No medical records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.records ?? []).map((rec) => (
            <Card key={rec.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-primary">{rec.diagnosis}</p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(rec.visitDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Dr. {rec.doctor?.name ?? "—"}</p>
                      {rec.symptoms && (
                        <div className="mt-2 p-2 rounded bg-muted/40 text-xs">
                          <span className="font-medium">Symptoms:</span> {rec.symptoms}
                        </div>
                      )}
                      {rec.treatment && (
                        <div className="mt-1 p-2 rounded bg-muted/40 text-xs">
                          <span className="font-medium">Treatment:</span> {rec.treatment}
                        </div>
                      )}
                      {rec.notes && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                          {rec.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  {rec.followUpDate && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Follow-up</p>
                      <p className="text-xs font-semibold text-primary">{format(new Date(rec.followUpDate), "MMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
