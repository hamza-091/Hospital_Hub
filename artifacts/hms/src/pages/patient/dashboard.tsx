import { useGetPatientDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, DollarSign, Pill, Receipt, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { formatPKR } from "@/lib/currency";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

export default function PatientDashboard() {
  const { data: dash, isLoading } = useGetPatientDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-medium">Upcoming Appts</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{dash?.upcomingAppointments?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-medium">Outstanding Balance</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold text-red-600">{formatPKR(dash?.outstandingBalance ?? 0)}</div>
          </CardContent>
        </Card>
        <Card className="hidden md:block">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground font-medium">Active Prescriptions</span>
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Pill className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {(dash?.recentPrescriptions ?? []).filter(p => p.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Appointments</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/patient/appointments">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dash?.upcomingAppointments ?? []).length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">No upcoming appointments</p>
                  <Button size="sm" asChild>
                    <Link href="/patient/book">Book Appointment</Link>
                  </Button>
                </div>
              )}
              {(dash?.upcomingAppointments ?? []).map((appt) => (
                <div key={appt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Dr. {appt.doctor?.user?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appt.appointmentDate), "MMM d, yyyy")} · {appt.startTime}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status] ?? "bg-gray-100"}`}>
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Recent Invoices
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link href="/patient/invoices">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(dash?.recentInvoices ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No invoices yet</p>
              )}
              {(dash?.recentInvoices ?? []).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">Invoice #{String(inv.id).padStart(4, "0")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(inv.invoiceDate), "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPKR(inv.totalAmount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" :
                      inv.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

