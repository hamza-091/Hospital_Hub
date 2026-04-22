import { Router, type IRouter } from "express";
import { db, usersTable, appointmentsTable, doctorsTable, patientsTable } from "@workspace/db";
import { eq, and, gte, lt, SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function buildAppointmentWithDetails(appt: typeof appointmentsTable.$inferSelect) {
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, appt.doctorId));
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, appt.patientId));
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

  // Normalize to spec-compatible format
  const scheduledAt = new Date(appt.scheduledAt);
  const endAt = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const startTime = `${pad(scheduledAt.getUTCHours())}:${pad(scheduledAt.getUTCMinutes())}`;
  const endTime = `${pad(endAt.getUTCHours())}:${pad(endAt.getUTCMinutes())}`;
  const appointmentDate = scheduledAt.toISOString().split("T")[0];

  return {
    id: appt.id,
    patientId: appt.patientId,
    doctorId: appt.doctorId,
    appointmentDate,
    startTime,
    endTime,
    status: appt.status,
    type: "consultation",
    notes: appt.notes ?? appt.reason ?? null,
    createdAt: appt.createdAt,
    doctor: doctor ? { ...doctor, user: doctorUser } : null,
    patient: patient ? { ...patient, user: patientUser } : null,
  };
}

router.get("/appointments", requireAuth, async (req, res): Promise<void> => {
  const { status, doctorId, patientId, date } = req.query as {
    status?: string; doctorId?: string; patientId?: string; date?: string;
  };
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(appointmentsTable.status, status as "pending" | "confirmed" | "completed" | "cancelled"));
  if (doctorId) conditions.push(eq(appointmentsTable.doctorId, parseInt(doctorId, 10)));
  if (patientId) conditions.push(eq(appointmentsTable.patientId, parseInt(patientId, 10)));
  if (date) {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);
    conditions.push(gte(appointmentsTable.scheduledAt, dayStart));
    conditions.push(lt(appointmentsTable.scheduledAt, dayEnd));
  }

  const appts = await db.select().from(appointmentsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(appointmentsTable.scheduledAt);
  const result = await Promise.all(appts.map(buildAppointmentWithDetails));
  res.json({ appointments: result });
});

router.post("/appointments", requireAuth, async (req, res): Promise<void> => {
  const { doctorId, patientId: bodyPatientId, appointmentDate, startTime, type, notes } = req.body;

  if (!doctorId || !appointmentDate || !startTime) {
    res.status(400).json({ error: "doctorId, appointmentDate, and startTime are required" });
    return;
  }

  let patientId = bodyPatientId;
  if (!patientId && req.user!.role === "patient") {
    const [pat] = await db.select().from(patientsTable).where(eq(patientsTable.userId, req.user!.userId));
    if (!pat) {
      res.status(400).json({ error: "Patient profile not found" });
      return;
    }
    patientId = pat.id;
  }
  if (!patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }

  const scheduledAt = new Date(`${appointmentDate}T${startTime}:00Z`);

  const [appt] = await db.insert(appointmentsTable).values({
    doctorId,
    patientId,
    scheduledAt,
    reason: notes ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(await buildAppointmentWithDetails(appt));
});

router.get("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await buildAppointmentWithDetails(appt));
});

router.patch("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status, notes, appointmentDate, startTime } = req.body;
  const updates: Partial<typeof appointmentsTable.$inferInsert> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (appointmentDate && startTime) {
    updates.scheduledAt = new Date(`${appointmentDate}T${startTime}:00Z`);
  }

  const [appt] = await db.update(appointmentsTable).set(updates).where(eq(appointmentsTable.id, id)).returning();
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(await buildAppointmentWithDetails(appt));
});

export default router;
