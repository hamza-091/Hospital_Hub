import { Router, type IRouter } from "express";
import { User, Appointment, Doctor, Patient } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function publicUser(u: any) {
  if (!u) return null;
  return { id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt };
}

async function buildAppointmentWithDetails(appt: any) {
  const doctor = await Doctor.findById(appt.doctorId).lean();
  const patient = await Patient.findById(appt.patientId).lean();
  let doctorUser = null, patientUser = null;
  if (doctor) doctorUser = await User.findById(doctor.userId).lean();
  if (patient) patientUser = await User.findById(patient.userId).lean();

  const scheduledAt = new Date(appt.scheduledAt);
  const endAt = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const startTime = `${pad(scheduledAt.getUTCHours())}:${pad(scheduledAt.getUTCMinutes())}`;
  const endTime = `${pad(endAt.getUTCHours())}:${pad(endAt.getUTCMinutes())}`;
  const appointmentDate = scheduledAt.toISOString().split("T")[0];

  return {
    id: appt._id,
    patientId: appt.patientId,
    doctorId: appt.doctorId,
    appointmentDate,
    startTime,
    endTime,
    status: appt.status,
    type: "consultation",
    notes: appt.notes ?? appt.reason ?? null,
    createdAt: appt.createdAt,
    doctor: doctor ? { ...doctor, id: doctor._id, user: publicUser(doctorUser) } : null,
    patient: patient ? { ...patient, id: patient._id, user: publicUser(patientUser) } : null,
  };
}

router.get("/appointments", requireAuth, async (req, res): Promise<void> => {
  const { status, doctorId, patientId, date } = req.query as {
    status?: string; doctorId?: string; patientId?: string; date?: string;
  };
  const filter: any = {};
  if (status) filter.status = status;
  if (doctorId) filter.doctorId = parseInt(doctorId, 10);
  if (patientId) filter.patientId = parseInt(patientId, 10);
  if (date) {
    filter.scheduledAt = {
      $gte: new Date(`${date}T00:00:00Z`),
      $lt: new Date(`${date}T23:59:59Z`),
    };
  }
  const appts = await Appointment.find(filter).sort({ scheduledAt: 1 }).lean();
  const result = await Promise.all(appts.map(buildAppointmentWithDetails));
  res.json({ appointments: result });
});

router.post("/appointments", requireAuth, async (req, res): Promise<void> => {
  const { doctorId, patientId: bodyPatientId, appointmentDate, startTime, notes } = req.body;

  if (!doctorId || !appointmentDate || !startTime) {
    res.status(400).json({ error: "doctorId, appointmentDate, and startTime are required" });
    return;
  }

  let patientId = bodyPatientId;
  if (!patientId && req.user!.role === "patient") {
    const pat = await Patient.findOne({ userId: req.user!.userId }).lean();
    if (!pat) { res.status(400).json({ error: "Patient profile not found" }); return; }
    patientId = pat._id;
  }
  if (!patientId) { res.status(400).json({ error: "patientId is required" }); return; }

  const scheduledAt = new Date(`${appointmentDate}T${startTime}:00Z`);

  const appt = await Appointment.create({
    doctorId,
    patientId,
    scheduledAt,
    reason: notes ?? null,
    status: "pending",
  });
  res.status(201).json(await buildAppointmentWithDetails(appt.toObject()));
});

router.get("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const appt = await Appointment.findById(id).lean();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await buildAppointmentWithDetails(appt));
});

router.patch("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, notes, appointmentDate, startTime } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (appointmentDate && startTime) {
    updates.scheduledAt = new Date(`${appointmentDate}T${startTime}:00Z`);
  }

  const appt = await Appointment.findByIdAndUpdate(id, updates, { new: true }).lean();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(await buildAppointmentWithDetails(appt));
});

export default router;

