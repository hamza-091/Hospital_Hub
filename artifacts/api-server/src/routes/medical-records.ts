import { Router, type IRouter } from "express";
import { User, MedicalRecord, Doctor, Patient } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function publicUser(u: any) {
  if (!u) return null;
  return { id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt };
}

async function buildRecordWithDetails(record: any) {
  const doctor = await Doctor.findById(record.doctorId).lean();
  const patient = await Patient.findById(record.patientId).lean();
  let doctorUser = null, patientUser = null;
  if (doctor) doctorUser = await User.findById(doctor.userId).lean();
  if (patient) patientUser = await User.findById(patient.userId).lean();

  return {
    id: record._id,
    patientId: record.patientId,
    doctorId: record.doctorId,
    appointmentId: record.appointmentId,
    visitDate: record.createdAt,
    diagnosis: record.diagnosis,
    symptoms: null,
    treatment: record.treatmentPlan,
    notes: null,
    followUpDate: null,
    createdAt: record.createdAt,
    doctor: doctor ? { ...doctor, id: doctor._id, user: publicUser(doctorUser) } : null,
    patient: patient ? { ...patient, id: patient._id, user: publicUser(patientUser) } : null,
  };
}

router.get("/medical-records", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId } = req.query as { patientId?: string; doctorId?: string };
  const filter: any = {};
  if (patientId) filter.patientId = parseInt(patientId, 10);
  if (doctorId) filter.doctorId = parseInt(doctorId, 10);
  const records = await MedicalRecord.find(filter).sort({ createdAt: 1 }).lean();
  const result = await Promise.all(records.map(buildRecordWithDetails));
  res.json({ records: result });
});

router.post("/medical-records", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId: bodyDoctorId, diagnosis, treatment } = req.body;
  if (!patientId || !diagnosis) { res.status(400).json({ error: "patientId and diagnosis are required" }); return; }

  let doctorId: number;
  if (req.user!.role === "doctor") {
    const doc = await Doctor.findOne({ userId: req.user!.userId }).lean();
    if (!doc) { res.status(400).json({ error: "Doctor profile not found" }); return; }
    doctorId = doc._id;
  } else if (req.user!.role === "admin" && bodyDoctorId) {
    doctorId = bodyDoctorId;
  } else {
    res.status(403).json({ error: "Only doctors can create medical records" }); return;
  }

  const record = await MedicalRecord.create({
    patientId,
    doctorId,
    diagnosis,
    treatmentPlan: treatment ?? null,
  });
  res.status(201).json(await buildRecordWithDetails(record.toObject()));
});

router.get("/medical-records/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const record = await MedicalRecord.findById(id).lean();
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.json(await buildRecordWithDetails(record));
});

export default router;

