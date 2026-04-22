import { Router, type IRouter } from "express";
import { db, usersTable, doctorsTable, patientsTable, appointmentsTable, invoicesTable, medicalRecordsTable, prescriptionsTable } from "@workspace/db";
import { eq, and, gte, lt, count, sum, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function normalizeAppt(appt: typeof appointmentsTable.$inferSelect) {
  const scheduledAt = new Date(appt.scheduledAt);
  const endAt = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    id: appt.id,
    patientId: appt.patientId,
    doctorId: appt.doctorId,
    appointmentDate: scheduledAt.toISOString().split("T")[0],
    startTime: `${pad(scheduledAt.getUTCHours())}:${pad(scheduledAt.getUTCMinutes())}`,
    endTime: `${pad(endAt.getUTCHours())}:${pad(endAt.getUTCMinutes())}`,
    status: appt.status,
    type: "consultation",
    notes: appt.notes ?? appt.reason ?? null,
    createdAt: appt.createdAt,
  };
}

function normalizeInvoice(inv: typeof invoicesTable.$inferSelect) {
  return {
    id: inv.id,
    patientId: inv.patientId,
    appointmentId: inv.appointmentId,
    invoiceDate: inv.issuedAt,
    dueDate: null,
    totalAmount: inv.total,
    status: inv.status === "unpaid" ? "pending" : inv.status === "refunded" ? "cancelled" : "paid",
    items: (inv.lineItems ?? []).map(li => ({
      description: li.description,
      amount: li.total,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
    paidAt: inv.paidAt,
    createdAt: inv.issuedAt,
  };
}

function normalizePrescription(rx: typeof prescriptionsTable.$inferSelect) {
  return {
    id: rx.id,
    patientId: rx.patientId,
    doctorId: rx.doctorId,
    appointmentId: rx.appointmentId,
    prescribedDate: rx.createdAt,
    expiryDate: null,
    status: "active",
    notes: rx.instructions,
    items: (rx.medicines ?? []).map((m: any) => ({
      medicine: { id: m.medicineId, name: m.medicineName },
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
    })),
    createdAt: rx.createdAt,
  };
}

async function attachApptUsers(appts: typeof appointmentsTable.$inferSelect[]) {
  return Promise.all(appts.map(async (appt) => {
    const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, appt.doctorId));
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, appt.patientId));
    let doctorUser = null, patientUser = null;
    if (doctor) {
      const [u] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, doctor.userId));
      doctorUser = u;
    }
    if (patient) {
      const [u] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, patient.userId));
      patientUser = u;
    }
    return {
      ...normalizeAppt(appt),
      doctor: doctor ? { ...doctor, user: doctorUser } : null,
      patient: patient ? { ...patient, user: patientUser } : null,
    };
  }));
}

router.get("/dashboard/admin", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [{ totalPatients }] = await db.select({ totalPatients: count() }).from(patientsTable);
  const [{ totalDoctors }] = await db.select({ totalDoctors: count() }).from(doctorsTable);

  const [{ todayAppointments }] = await db.select({ todayAppointments: count() })
    .from(appointmentsTable)
    .where(and(gte(appointmentsTable.scheduledAt, todayStart), lt(appointmentsTable.scheduledAt, todayEnd)));

  const [revenueRow] = await db.select({ revenue: sum(invoicesTable.total) })
    .from(invoicesTable)
    .where(and(
      eq(invoicesTable.status, "paid"),
      gte(invoicesTable.paidAt, monthStart),
      lt(invoicesTable.paidAt, monthEnd)
    ));
  const monthlyRevenue = Number(revenueRow?.revenue || 0);

  const statusRows = await db.select({ status: appointmentsTable.status, cnt: count() })
    .from(appointmentsTable).groupBy(appointmentsTable.status);
  const appointmentsByStatus = statusRows.map(r => ({ status: r.status, count: Number(r.cnt) }));

  const [{ pendingInvoices }] = await db.select({ pendingInvoices: count() })
    .from(invoicesTable).where(eq(invoicesTable.status, "unpaid"));
  const [{ totalInvoices }] = await db.select({ totalInvoices: count() }).from(invoicesTable);

  const rawAppts = await db.select().from(appointmentsTable).orderBy(appointmentsTable.createdAt).limit(5);
  const recentAppointments = await attachApptUsers(rawAppts);

  res.json({
    totalPatients: Number(totalPatients),
    totalDoctors: Number(totalDoctors),
    todayAppointments: Number(todayAppointments),
    monthlyRevenue,
    appointmentsByStatus,
    pendingInvoices: Number(pendingInvoices),
    totalInvoices: Number(totalInvoices),
    recentAppointments,
  });
});

router.get("/dashboard/doctor", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, userId));
  if (!doctor) { res.status(404).json({ error: "Doctor profile not found" }); return; }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  const rawTodayAppts = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.doctorId, doctor.id),
      gte(appointmentsTable.scheduledAt, todayStart),
      lt(appointmentsTable.scheduledAt, todayEnd)
    )).orderBy(appointmentsTable.scheduledAt);
  const todayAppointments = await attachApptUsers(rawTodayAppts);

  const [{ weekPatientCount }] = await db.select({ weekPatientCount: count() })
    .from(appointmentsTable).where(and(
      eq(appointmentsTable.doctorId, doctor.id),
      gte(appointmentsTable.scheduledAt, weekStart),
      lt(appointmentsTable.scheduledAt, todayEnd)
    ));

  const [{ pendingAppointments }] = await db.select({ pendingAppointments: count() })
    .from(appointmentsTable).where(and(
      eq(appointmentsTable.doctorId, doctor.id),
      eq(appointmentsTable.status, "pending")
    ));

  const [{ completedThisWeek }] = await db.select({ completedThisWeek: count() })
    .from(appointmentsTable).where(and(
      eq(appointmentsTable.doctorId, doctor.id),
      eq(appointmentsTable.status, "completed"),
      gte(appointmentsTable.scheduledAt, weekStart)
    ));

  const recentRawRecords = await db.select().from(medicalRecordsTable)
    .where(eq(medicalRecordsTable.doctorId, doctor.id))
    .orderBy(medicalRecordsTable.createdAt).limit(5);

  const recentRecords = await Promise.all(recentRawRecords.map(async (rec) => {
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, rec.patientId));
    let patientUser = null;
    if (patient) {
      const [u] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, patient.userId));
      patientUser = u;
    }
    return {
      ...rec,
      visitDate: rec.createdAt,
      patient: patient ? { ...patient, name: patientUser?.name ?? null, user: patientUser } : null,
    };
  }));

  res.json({
    todayAppointments,
    weekPatientCount: Number(weekPatientCount),
    pendingAppointments: Number(pendingAppointments),
    completedThisWeek: Number(completedThisWeek),
    recentRecords,
  });
});

router.get("/dashboard/patient", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.userId, userId));
  if (!patient) { res.status(404).json({ error: "Patient profile not found" }); return; }

  const now = new Date();
  const rawAppts = await db.select().from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.patientId, patient.id),
      gte(appointmentsTable.scheduledAt, now),
      sql`${appointmentsTable.status} != 'cancelled'`
    )).orderBy(appointmentsTable.scheduledAt).limit(5);
  const upcomingAppointments = await attachApptUsers(rawAppts);

  const rawRx = await db.select().from(prescriptionsTable)
    .where(eq(prescriptionsTable.patientId, patient.id))
    .orderBy(prescriptionsTable.createdAt).limit(3);
  const recentPrescriptions = rawRx.map(normalizePrescription);

  const unpaidInvoices = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.patientId, patient.id), eq(invoicesTable.status, "unpaid")));
  const outstandingBalance = unpaidInvoices.reduce((acc, inv) => acc + Number(inv.total), 0);

  const rawInvoices = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.patientId, patient.id))
    .orderBy(invoicesTable.issuedAt).limit(5);
  const recentInvoices = rawInvoices.map(normalizeInvoice);

  res.json({
    upcomingAppointments,
    recentPrescriptions,
    outstandingBalance,
    recentInvoices,
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const { limit: limitStr } = req.query as { limit?: string };
  const limit = Math.min(parseInt(limitStr || "20", 10), 50);

  const recentAppts = await db.select({
    id: appointmentsTable.id, status: appointmentsTable.status, createdAt: appointmentsTable.createdAt,
  }).from(appointmentsTable).orderBy(appointmentsTable.createdAt).limit(limit);

  const recentUsers = await db.select({
    id: usersTable.id, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.createdAt).limit(limit);

  const recentInvoices = await db.select({
    id: invoicesTable.id, status: invoicesTable.status, paidAt: invoicesTable.paidAt, issuedAt: invoicesTable.issuedAt,
  }).from(invoicesTable).where(eq(invoicesTable.status, "paid")).orderBy(invoicesTable.paidAt).limit(limit);

  const activities = [
    ...recentAppts.map(a => ({
      id: `appt-${a.id}`,
      type: "appointment_created",
      title: `Appointment #${a.id}`,
      description: `Appointment scheduled (${a.status})`,
      createdAt: a.createdAt,
    })),
    ...recentUsers.map(u => ({
      id: `user-${u.id}`,
      type: "user_registered",
      title: `New ${u.role} registered`,
      description: `${u.name} joined as ${u.role}`,
      createdAt: u.createdAt,
    })),
    ...recentInvoices.map(i => ({
      id: `inv-${i.id}`,
      type: "invoice_paid",
      title: `Invoice #${i.id} paid`,
      description: `Invoice was marked as paid`,
      createdAt: i.paidAt || i.issuedAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  res.json({ items: activities });
});

export default router;
