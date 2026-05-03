import { useListAppointments, useUpdateAppointment } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Stethoscope, AlertCircle, Clock, CreditCard } from "lucide-react";
import { Link } from "wouter";

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

export default function PatientAppointments() {
  const { user } = useAuth();
  const [status, setStatus] = useState("all");
  const { data, isLoading, refetch } = useListAppointments({
    patientId: user?.patientProfile?.id,
    status: status !== "all" ? status as any : undefined,
  });
  const updateAppt = useUpdateAppointment();
  const { toast } = useToast();

  const handleCancel = (id: number) => {
    updateAppt.mutate(
      { id, data: { status: "cancelled" } },
      {
        onSuccess: () => { toast({ title: "Appointment cancelled" }); refetch(); },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending Payment</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" asChild>
          <Link href="/patient/book">Book New</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.appointments ?? []).length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No appointments found</p>
              <Button size="sm" className="mt-3" asChild>
                <Link href="/patient/book">Book your first appointment</Link>
              </Button>
            </div>
          )}
          {(data?.appointments ?? []).map((appt) => (
            <Card key={appt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">Dr. {appt.doctor?.name ?? "—"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status] ?? "bg-gray-100"}`}>
                          {statusLabels[appt.status] ?? appt.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(appt.appointmentDate), "EEEE, MMMM d, yyyy")} · {appt.startTime} – {appt.endTime}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{appt.type?.replace("_", " ")}</p>
                      {appt.notes && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /> {appt.notes}
                        </p>
                      )}
                      {appt.status === "pending" && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2.5 py-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Payment required — go to <Link href="/patient/invoices" className="underline font-semibold hover:text-yellow-900">Invoices</Link> to pay</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col gap-1">
                    {appt.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        asChild
                      >
                        <Link href="/patient/invoices">
                          <CreditCard className="h-3 w-3" />
                          Pay
                        </Link>
                      </Button>
                    )}
                    {(appt.status === "pending" || appt.status === "scheduled" || appt.status === "confirmed") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleCancel(appt.id)}
                        disabled={updateAppt.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
