import { Router, type IRouter } from "express";
import { db, usersTable, medicalRecordsTable, doctorsTable, patientsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function buildRecordWithDetails(record: typeof medicalRecordsTable.$inferSelect) {
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, record.doctorId));
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, record.patientId));
  let doctorUser = null, patientUser = null;
  if (doctor) {
    const [u] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, phone: usersTable.phone, status: usersTable.status, createdAt: usersTable.createdAt
    }).from(usersTable).where(eq(usersTable.id, doctor.userId));
    doctorUser = u;
  }
  if (patient) {
    const [u] = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, phone: usersTable.phone, status: usersTable.status, createdAt: usersTable.createdAt
    }).from(usersTable).where(eq(usersTable.id, patient.userId));
    patientUser = u;
  }
  return {
    id: record.id,
    patientId: record.patientId,
    doctorId: record.doctorId,
    appointmentId: record.appointmentId,
    // Normalize field names to match spec
    visitDate: record.createdAt,
    diagnosis: record.diagnosis,
    symptoms: null,
    treatment: record.treatmentPlan,
    notes: null,
    followUpDate: null,
    createdAt: record.createdAt,
    doctor: doctor ? { ...doctor, user: doctorUser } : null,
    patient: patient ? { ...patient, user: patientUser } : null,
  };
}

router.get("/medical-records", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId } = req.query as { patientId?: string; doctorId?: string };
  const conditions: SQL[] = [];
  if (patientId) conditions.push(eq(medicalRecordsTable.patientId, parseInt(patientId, 10)));
  if (doctorId) conditions.push(eq(medicalRecordsTable.doctorId, parseInt(doctorId, 10)));

  const records = await db.select().from(medicalRecordsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(medicalRecordsTable.createdAt);
  const result = await Promise.all(records.map(buildRecordWithDetails));
  res.json({ records: result });
});

router.post("/medical-records", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId: bodyDoctorId, visitDate, diagnosis, symptoms, treatment, notes, followUpDate } = req.body;

  if (!patientId || !diagnosis) {
    res.status(400).json({ error: "patientId and diagnosis are required" });
    return;
  }

  let doctorId: number;
  if (req.user!.role === "doctor") {
    const [doc] = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, req.user!.userId));
    if (!doc) { res.status(400).json({ error: "Doctor profile not found" }); return; }
    doctorId = doc.id;
  } else if (req.user!.role === "admin" && bodyDoctorId) {
    doctorId = bodyDoctorId;
  } else {
    res.status(403).json({ error: "Only doctors can create medical records" }); return;
  }

  const [record] = await db.insert(medicalRecordsTable).values({
    patientId,
    doctorId,
    diagnosis,
    treatmentPlan: treatment ?? null,
  }).returning();
  res.status(201).json(await buildRecordWithDetails(record));
});

router.get("/medical-records/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [record] = await db.select().from(medicalRecordsTable).where(eq(medicalRecordsTable.id, id));
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.json(await buildRecordWithDetails(record));
});

export default router;
