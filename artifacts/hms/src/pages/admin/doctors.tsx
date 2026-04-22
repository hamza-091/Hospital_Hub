import { useState } from "react";
import { useListDoctors, useCreateDoctor, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Stethoscope, DollarSign, Star } from "lucide-react";

export default function AdminDoctors() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useListDoctors({ search: search || undefined, specialty: specialty || undefined });
  const createDoctor = useCreateDoctor();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      userId: "",
      specialty: "",
      qualifications: "",
      yearsExperience: "",
      consultationFee: "",
      bio: "",
      availableDays: "Mon,Tue,Wed,Thu,Fri",
      availableHours: "09:00-17:00",
    },
  });

  const { data: users } = useListUsers({ role: "doctor" });
  const doctorUsers = (users?.users ?? []).filter(u => !u.doctorProfile);

  const onSubmit = form.handleSubmit((values) => {
    createDoctor.mutate(
      {
        data: {
          userId: Number(values.userId),
          specialty: values.specialty,
          qualifications: values.qualifications || undefined,
          yearsExperience: values.yearsExperience ? Number(values.yearsExperience) : undefined,
          consultationFee: values.consultationFee ? Number(values.consultationFee) : undefined,
          bio: values.bio || undefined,
          availableDays: values.availableDays || undefined,
          availableHours: values.availableHours || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Doctor profile created" });
          setOpen(false);
          form.reset();
          refetch();
        },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search doctors..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Input placeholder="Specialty filter..." className="w-[180px]" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Doctor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Doctor Profile</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>User Account</Label>
                <Select onValueChange={(v) => form.setValue("userId", v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {doctorUsers.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name} — {u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Specialty *</Label>
                  <Input required {...form.register("specialty")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Years Experience</Label>
                  <Input type="number" {...form.register("yearsExperience")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Consultation Fee ($)</Label>
                  <Input type="number" step="0.01" {...form.register("consultationFee")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Qualifications</Label>
                  <Input {...form.register("qualifications")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Available Days</Label>
                <Input placeholder="Mon,Tue,Wed,Thu,Fri" {...form.register("availableDays")} />
              </div>
              <div className="space-y-1.5">
                <Label>Available Hours</Label>
                <Input placeholder="09:00-17:00" {...form.register("availableHours")} />
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Input {...form.register("bio")} />
              </div>
              <Button type="submit" className="w-full" disabled={createDoctor.isPending}>
                {createDoctor.isPending ? "Creating..." : "Create Doctor Profile"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.doctors ?? []).length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">No doctors found</div>
          )}
          {(data?.doctors ?? []).map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{doc.user?.name ?? `Doctor #${doc.id}`}</p>
                    <p className="text-xs text-muted-foreground">{doc.user?.email}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{doc.specialty}</span>
                    {doc.yearsExperience && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3" />{doc.yearsExperience}y exp
                      </span>
                    )}
                  </div>
                  {doc.consultationFee && (
                    <p className="text-sm flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />{doc.consultationFee} consultation fee
                    </p>
                  )}
                  {doc.qualifications && <p className="text-xs text-muted-foreground">{doc.qualifications}</p>}
                  {doc.availableDays && (
                    <p className="text-xs text-muted-foreground">{doc.availableDays} · {doc.availableHours}</p>
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
