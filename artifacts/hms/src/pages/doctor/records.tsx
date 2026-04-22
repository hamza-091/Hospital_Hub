import { useState } from "react";
import { useListMedicalRecords, useCreateMedicalRecord, useListPatients } from "@workspace/api-client-react";
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
import { Plus, FileText, Search } from "lucide-react";
import { format } from "date-fns";

export default function DoctorRecords() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useListMedicalRecords({ doctorId: user?.doctorProfile?.id });
  const { data: patients } = useListPatients();
  const createRecord = useCreateMedicalRecord();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      patientId: "",
      visitDate: new Date().toISOString().split("T")[0],
      diagnosis: "",
      symptoms: "",
      treatment: "",
      notes: "",
      followUpDate: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createRecord.mutate(
      {
        data: {
          patientId: Number(values.patientId),
          doctorId: user?.doctorProfile?.id!,
          visitDate: values.visitDate,
          diagnosis: values.diagnosis,
          symptoms: values.symptoms || undefined,
          treatment: values.treatment || undefined,
          notes: values.notes || undefined,
          followUpDate: values.followUpDate || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Record created" });
          setOpen(false);
          form.reset();
          refetch();
        },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  });

  const filtered = (data?.records ?? []).filter(r =>
    !search || r.patient?.name?.toLowerCase().includes(search.toLowerCase()) || r.diagnosis.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search records..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Record</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Medical Record</DialogTitle></DialogHeader>
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
                  <Label>Visit Date *</Label>
                  <Input type="date" required {...form.register("visitDate")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Follow-up Date</Label>
                  <Input type="date" {...form.register("followUpDate")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Diagnosis *</Label>
                  <Input required {...form.register("diagnosis")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Symptoms</Label>
                  <Textarea rows={2} {...form.register("symptoms")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Treatment</Label>
                  <Textarea rows={2} {...form.register("treatment")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Notes</Label>
                  <Textarea rows={2} {...form.register("notes")} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createRecord.isPending}>
                {createRecord.isPending ? "Creating..." : "Create Record"}
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
            <div className="text-center py-16 text-muted-foreground">No records found</div>
          )}
          {filtered.map((rec) => (
            <Card key={rec.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{rec.patient?.name ?? "—"}</p>
                        <span className="text-xs text-muted-foreground">{format(new Date(rec.visitDate), "MMM d, yyyy")}</span>
                      </div>
                      <p className="text-sm font-medium text-primary mt-0.5">{rec.diagnosis}</p>
                      {rec.symptoms && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Symptoms:</span> {rec.symptoms}</p>}
                      {rec.treatment && <p className="text-xs text-muted-foreground"><span className="font-medium">Treatment:</span> {rec.treatment}</p>}
                    </div>
                  </div>
                  {rec.followUpDate && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Follow-up</p>
                      <p className="text-xs font-medium">{format(new Date(rec.followUpDate), "MMM d, yyyy")}</p>
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
