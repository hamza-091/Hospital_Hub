import { useState } from "react";
import { useListAppointments, useUpdateAppointment } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, CreditCard, CheckCircle } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  pending: "Pending Payment",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading, refetch } = useListAppointments({
    doctorId: user?.doctorProfile?.id,
    status: status !== "all" ? status as any : undefined,
  });
  const updateAppt = useUpdateAppointment();
  const { toast } = useToast();

  const handleStatus = (id: number, newStatus: string) => {
    updateAppt.mutate(
      { id, data: { status: newStatus as any } },
      {
        onSuccess: () => { toast({ title: "Updated" }); refetch(); },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending Payment</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Patient</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.appointments ?? []).length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No appointments</td></tr>
                  )}
                  {(data?.appointments ?? []).map((appt) => (
                    <tr key={appt.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {appt.patient?.name?.charAt(0)}
                          </div>
                          <p className="font-medium">{appt.patient?.name ?? "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{format(new Date(appt.appointmentDate), "MMM d, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">{appt.startTime} – {appt.endTime}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{appt.type}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        <p className="truncate max-w-[200px] text-xs">{appt.notes ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {appt.status === "pending" && <Clock className="h-3 w-3" />}
                          {appt.status === "confirmed" && <CheckCircle className="h-3 w-3" />}
                          {statusLabels[appt.status] ?? appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {appt.status === "pending" && (
                            <span className="text-xs text-yellow-600 flex items-center gap-1 mr-2">
                              <CreditCard className="h-3 w-3" />
                              Awaiting Payment
                            </span>
                          )}
                          {appt.status === "confirmed" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatus(appt.id, "completed")}>Complete</Button>
                          )}
                          {appt.status === "completed" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600" onClick={() => handleStatus(appt.id, "no_show")}>No Show</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
