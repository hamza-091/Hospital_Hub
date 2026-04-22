import { useState } from "react";
import { useListDoctors, useGetDoctorSlots, useCreateAppointment } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Calendar, Clock, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { formatPKR } from "@/lib/currency";

export default function PatientBook() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [appointmentType, setAppointmentType] = useState("consultation");
  const [notes, setNotes] = useState("");

  const { data: doctors, isLoading: loadingDoctors } = useListDoctors();
  const { data: slots, isLoading: loadingSlots } = useGetDoctorSlots(
    selectedDoctor!,
    { date: selectedDate },
    { query: { enabled: !!selectedDoctor && !!selectedDate } }
  );
  const createAppt = useCreateAppointment();

  const handleBook = () => {
    if (!selectedDoctor || !selectedSlot || !user?.patientProfile?.id) return;
    createAppt.mutate(
      {
        data: {
          doctorId: selectedDoctor,
          patientId: user.patientProfile.id,
          appointmentDate: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          type: appointmentType as any,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Appointment booked!", description: `Scheduled for ${selectedDate} at ${selectedSlot.start}` });
          setLocation("/patient/appointments");
        },
        onError: (e) => toast({ title: "Failed to book", description: e.message, variant: "destructive" }),
      }
    );
  };

  const doctor = (doctors?.doctors ?? []).find(d => d.id === selectedDoctor);
  const today = new Date().toISOString().split("T")[0];

  const slotItems = (slots?.availableSlots ?? []).map((start) => {
    const [hours, minutes] = start.split(":").map(Number);
    const startDate = new Date(Date.UTC(2000, 0, 1, hours, minutes));
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
    const end = `${String(endDate.getUTCHours()).padStart(2, "0")}:${String(endDate.getUTCMinutes()).padStart(2, "0")}`;
    return { start, end };
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>{step > s ? <CheckCircle className="h-4 w-4" /> : s}</div>
            {s < 3 && <div className={`h-0.5 w-12 transition-colors ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
        <div className="ml-3 flex gap-8 text-xs text-muted-foreground">
          <span className={step === 1 ? "text-primary font-medium" : ""}>Select Doctor</span>
          <span className={step === 2 ? "text-primary font-medium" : ""}>Pick Time</span>
          <span className={step === 3 ? "text-primary font-medium" : ""}>Confirm</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Choose a Doctor</CardTitle></CardHeader>
          <CardContent>
            {loadingDoctors ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(doctors?.doctors ?? []).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => { setSelectedDoctor(doc.id); setStep(2); }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors hover:border-primary ${
                      selectedDoctor === doc.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.user?.name ?? `Doctor #${doc.id}`}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{doc.specialty}</span>
                          {doc.yearsExperience && <span className="text-xs text-muted-foreground">{doc.yearsExperience}y exp</span>}
                          {doc.consultationFee && <span className="text-xs text-muted-foreground">{formatPKR(doc.consultationFee)} fee</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Date & Time</CardTitle>
            {doctor && <p className="text-sm text-muted-foreground">Dr. {doctor.user?.name} · {doctor.specialty}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Appointment Date</Label>
              <Input type="date" min={today} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label>Available Slots</Label>
                {loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                  </div>
                ) : slotItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No slots available for this date</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotItems.map((slot) => (
                      <button
                        key={slot.start}
                        onClick={() => setSelectedSlot({ start: slot.start, end: slot.end })}
                        className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                          selectedSlot?.start === slot.start ? "bg-primary text-primary-foreground border-primary" :
                          "hover:border-primary hover:bg-primary/5"
                        }`}
                      >
                        <Clock className="h-3 w-3 inline mr-1" />
                        {slot.start}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!selectedSlot}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Confirm Appointment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 text-sm">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span><strong>Doctor:</strong> Dr. {doctor?.user?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span><strong>Date:</strong> {selectedDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span><strong>Time:</strong> {selectedSlot?.start} – {selectedSlot?.end}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Appointment Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="checkup">Check-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea rows={3} placeholder="Describe your symptoms or reason for visit..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleBook} disabled={createAppt.isPending}>
                {createAppt.isPending ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
