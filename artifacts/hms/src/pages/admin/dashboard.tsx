import { useGetAdminDashboard, useGetActivityFeed } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserRound, Calendar, DollarSign, FileText, Activity } from "lucide-react";
import { format } from "date-fns";

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

export default function AdminDashboard() {
  const { data: dash, isLoading } = useGetAdminDashboard();
  const { data: activity } = useGetActivityFeed({ limit: 10 });

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
        <StatCard title="Total Patients" value={dash?.totalPatients ?? 0} icon={Users} />
        <StatCard title="Total Doctors" value={dash?.totalDoctors ?? 0} icon={UserRound} />
        <StatCard title="Today's Appts" value={dash?.todayAppointments ?? 0} icon={Calendar} />
        <StatCard
          title="Monthly Revenue"
          value={`$${(dash?.monthlyRevenue ?? 0).toLocaleString()}`}
          icon={DollarSign}
          sub={`${dash?.pendingInvoices ?? 0} pending invoices`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dash?.recentAppointments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No appointments yet</p>
              )}
              {(dash?.recentAppointments ?? []).map((appt) => (
                <div key={appt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{appt.patient?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      Dr. {appt.doctor?.name ?? "—"} · {format(new Date(appt.appointmentDate), "MMM d, h:mm a")}
                    </p>
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
              <Activity className="h-4 w-4" /> Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(activity?.items ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
              {(activity?.items ?? []).map((item) => (
                <div key={item.id} className="flex gap-3 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(item.createdAt), "h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {(dash?.appointmentsByStatus ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appointment Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(dash?.appointmentsByStatus ?? []).map((s) => (
                <div key={s.status} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {s.status}
                  </span>
                  <span className="text-sm font-semibold">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
