import { useGetDoctorDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, CheckCircle, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

function StatCard({ title, value, icon: Icon, color = "text-primary" }: { title: string; value: string | number; icon: React.ElementType; color?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DoctorDashboard() {
  const { data: dash, isLoading } = useGetDoctorDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Today's Appts" value={dash?.todayAppointments?.length ?? 0} icon={Calendar} />
        <StatCard title="Week Patients" value={dash?.weekPatientCount ?? 0} icon={Users} />
        <StatCard title="Pending" value={dash?.pendingAppointments ?? 0} icon={Clock} />
        <StatCard title="Completed This Week" value={dash?.completedThisWeek ?? 0} icon={CheckCircle} color="text-green-600" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dash?.todayAppointments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No appointments today</p>
              )}
              {(dash?.todayAppointments ?? []).map((appt) => (
                <div key={appt.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {appt.patient?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{appt.patient?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{appt.startTime} – {appt.endTime} · {appt.type}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Recent Medical Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dash?.recentRecords ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No recent records</p>
              )}
              {(dash?.recentRecords ?? []).map((rec) => (
                <div key={rec.id} className="py-2.5 border-b last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{rec.patient?.name ?? "—"}</p>
                    <span className="text-xs text-muted-foreground">{format(new Date(rec.visitDate), "MMM d")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{rec.diagnosis}</p>
                  {rec.symptoms && <p className="text-xs text-muted-foreground mt-0.5 truncate">{rec.symptoms}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
