import { useState } from "react";
import { useListAppointments, useUpdateAppointment } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

export default function AdminAppointments() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useListAppointments({
    status: status !== "all" ? status as any : undefined,
  });
  const updateAppt = useUpdateAppointment();
  const { toast } = useToast();

  const handleStatus = (id: number, newStatus: string) => {
    updateAppt.mutate(
      { id, data: { status: newStatus as any } },
      {
        onSuccess: () => { toast({ title: "Appointment updated" }); refetch(); },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  };

  const filtered = (data?.appointments ?? []).filter(a =>
    !search ||
    a.patient?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.doctor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient or doctor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Doctor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No appointments found</td></tr>
                  )}
                  {filtered.map((appt) => (
                    <tr key={appt.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{appt.patient?.name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">Dr. {appt.doctor?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{format(new Date(appt.appointmentDate), "MMM d, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">{appt.startTime} – {appt.endTime}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell capitalize">{appt.type}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[appt.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {appt.status === "scheduled" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatus(appt.id, "confirmed")}>Confirm</Button>
                          )}
                          {(appt.status === "scheduled" || appt.status === "confirmed") && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStatus(appt.id, "completed")}>Complete</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleStatus(appt.id, "cancelled")}>Cancel</Button>
                            </>
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
