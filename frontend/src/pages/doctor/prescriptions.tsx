import { useState } from "react";
import { useListPrescriptions, useCreatePrescription, useListPatients, useListMedicines, useListMedicalRecords } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pill, Search, Download } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

export default function DoctorPrescriptions() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useListPrescriptions({ doctorId: user?.doctorProfile?.id });
  const { data: patients } = useListPatients();
  const { data: medicines } = useListMedicines();
  const { data: records } = useListMedicalRecords({ doctorId: user?.doctorProfile?.id });
  const createPrescription = useCreatePrescription();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      patientId: "",
      medicalRecordId: "",
      prescribedDate: new Date().toISOString().split("T")[0],
      expiryDate: "",
      notes: "",
      medicineId: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: "",
      instructions: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createPrescription.mutate(
      {
        data: {
          patientId: Number(values.patientId),
          doctorId: user?.doctorProfile?.id!,
          medicalRecordId: values.medicalRecordId ? Number(values.medicalRecordId) : undefined,
          prescribedDate: values.prescribedDate,
          expiryDate: values.expiryDate || undefined,
          notes: values.notes || undefined,
          items: values.medicineId ? [{
            medicineId: Number(values.medicineId),
            dosage: values.dosage,
            frequency: values.frequency,
            duration: values.duration || undefined,
            quantity: values.quantity ? Number(values.quantity) : undefined,
            instructions: values.instructions || undefined,
          }] : [],
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Prescription created" });
          setOpen(false);
          form.reset();
          refetch();
        },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  });

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

  const filtered = (data?.prescriptions ?? []).filter(p =>
    !search || p.patient?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search prescriptions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Prescription</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Prescription</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Patient *</Label>
                  <Select required onValueChange={(v) => form.setValue("patientId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                    <SelectContent>
                      {(patients?.patients ?? []).map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.user?.name ?? `Patient #${p.id}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prescribed Date</Label>
                  <Input type="date" {...form.register("prescribedDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input type="date" {...form.register("expiryDate")} />
                </div>
              </div>
              <div className="border rounded-lg p-3 space-y-3">
                <p className="text-sm font-medium">Medicine</p>
                <div className="space-y-1.5">
                  <Label>Select Medicine</Label>
                  <Select onValueChange={(v) => form.setValue("medicineId", v)}>
                    <SelectTrigger><SelectValue placeholder="Choose medicine..." /></SelectTrigger>
                    <SelectContent>
                      {(medicines?.medicines ?? []).map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Dosage</Label>
                    <Input placeholder="e.g. 500mg" {...form.register("dosage")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Input placeholder="e.g. twice daily" {...form.register("frequency")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration</Label>
                    <Input placeholder="e.g. 7 days" {...form.register("duration")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input type="number" {...form.register("quantity")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Instructions</Label>
                  <Input placeholder="e.g. Take with food" {...form.register("instructions")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={2} {...form.register("notes")} />
              </div>
              <Button type="submit" className="w-full" disabled={createPrescription.isPending}>
                {createPrescription.isPending ? "Creating..." : "Create Prescription"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No prescriptions found</div>
          )}
          {filtered.map((pres) => (
            <Card key={pres.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Pill className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{pres.patient?.name ?? "—"}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[pres.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {pres.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{format(new Date(pres.prescribedDate), "MMM d, yyyy")}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(pres.items ?? []).map((item, idx) => (
                          <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {item.medicine?.name} · {item.dosage} · {item.frequency}
                          </span>
                        ))}
                        {(pres.items ?? []).length === 0 && <span className="text-xs text-muted-foreground">No items</span>}
                      </div>
                      {pres.notes && <p className="text-xs text-muted-foreground mt-1">{pres.notes}</p>}
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
