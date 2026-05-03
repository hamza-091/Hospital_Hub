import { Router, type IRouter } from "express";
import { User, Doctor, Patient, Appointment, Invoice, MedicalRecord, Prescription } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function publicUserMin(u: any) {
  if (!u) return null;
  return { id: u._id, name: u.name };
}

function normalizeAppt(appt: any) {
  const scheduledAt = new Date(appt.scheduledAt);
  const endAt = new Date(scheduledAt.getTime() + 30 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    id: appt._id,
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

function normalizeInvoice(inv: any) {
  return {
    id: inv._id,
    patientId: inv.patientId,
    appointmentId: inv.appointmentId,
    invoiceDate: inv.issuedAt,
    dueDate: null,
    totalAmount: Number(inv.total),
    status: inv.status === "unpaid" ? "pending" : inv.status === "refunded" ? "cancelled" : "paid",
    items: (inv.lineItems ?? []).map((li: any) => ({
      description: li.description,
      amount: li.total,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })),
    paidAt: inv.paidAt,
    createdAt: inv.issuedAt,
  };
}

function normalizePrescription(rx: any) {
  return {
    id: rx._id,
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

async function attachApptUsers(appts: any[]) {
  return Promise.all(appts.map(async (appt) => {
    const doctor = await Doctor.findById(appt.doctorId).lean();
    const patient = await Patient.findById(appt.patientId).lean();
    let doctorUser = null, patientUser = null;
    if (doctor) doctorUser = await User.findById(doctor.userId).lean();
    if (patient) patientUser = await User.findById(patient.userId).lean();
    return {
      ...normalizeAppt(appt),
      doctor: doctor ? { ...doctor, id: doctor._id, user: publicUserMin(doctorUser) } : null,
      patient: patient ? { ...patient, id: patient._id, user: publicUserMin(patientUser) } : null,
    };
  }));
}

router.get("/dashboard/admin", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const totalPatients = await Patient.countDocuments();
  const totalDoctors = await Doctor.countDocuments();

  const todayAppointments = await Appointment.countDocuments({
    scheduledAt: { $gte: todayStart, $lt: todayEnd },
  });

  const paidThisMonth = await Invoice.find({
    status: "paid",
    paidAt: { $gte: monthStart, $lt: monthEnd },
  }).lean();
  const monthlyRevenue = paidThisMonth.reduce((s, inv: any) => s + Number(inv.total), 0);

  const statusAgg = await Appointment.aggregate([
    { $group: { _id: "$status", cnt: { $sum: 1 } } },
  ]);
  const appointmentsByStatus = statusAgg.map((r: any) => ({ status: r._id, count: r.cnt }));

  const pendingInvoices = await Invoice.countDocuments({ status: "unpaid" });
  const totalInvoices = await Invoice.countDocuments();

  const rawAppts = await Appointment.find({}).sort({ createdAt: 1 }).limit(5).lean();
  const recentAppointments = await attachApptUsers(rawAppts);

  res.json({
    totalPatients,
    totalDoctors,
    todayAppointments,
    monthlyRevenue,
    appointmentsByStatus,
    pendingInvoices,
    totalInvoices,
    recentAppointments,
  });
});

router.get("/dashboard/doctor", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const doctor = await Doctor.findOne({ userId }).lean();
  if (!doctor) { res.status(404).json({ error: "Doctor profile not found" }); return; }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

  const rawTodayAppts = await Appointment.find({
    doctorId: doctor._id,
    scheduledAt: { $gte: todayStart, $lt: todayEnd },
  }).sort({ scheduledAt: 1 }).lean();
  const todayAppointments = await attachApptUsers(rawTodayAppts);

  const weekPatientCount = await Appointment.countDocuments({
    doctorId: doctor._id,
    scheduledAt: { $gte: weekStart, $lt: todayEnd },
  });

  const pendingAppointments = await Appointment.countDocuments({
    doctorId: doctor._id,
    status: "pending",
  });

  const completedThisWeek = await Appointment.countDocuments({
    doctorId: doctor._id,
    status: "completed",
    scheduledAt: { $gte: weekStart },
  });

  const recentRawRecords = await MedicalRecord.find({ doctorId: doctor._id })
    .sort({ createdAt: 1 }).limit(5).lean();

  const recentRecords = await Promise.all(recentRawRecords.map(async (rec: any) => {
    const patient = await Patient.findById(rec.patientId).lean();
    let patientUser = null;
    if (patient) patientUser = await User.findById(patient.userId).lean();
    return {
      ...rec,
      id: rec._id,
      visitDate: rec.createdAt,
      patient: patient ? { ...patient, id: patient._id, name: patientUser?.name ?? null, user: publicUserMin(patientUser) } : null,
    };
  }));

  res.json({
    todayAppointments,
    weekPatientCount,
    pendingAppointments,
    completedThisWeek,
    recentRecords,
  });
});

router.get("/dashboard/patient", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const patient = await Patient.findOne({ userId }).lean();
  if (!patient) { res.status(404).json({ error: "Patient profile not found" }); return; }

  const now = new Date();
  const rawAppts = await Appointment.find({
    patientId: patient._id,
    scheduledAt: { $gte: now },
    status: { $ne: "cancelled" },
  }).sort({ scheduledAt: 1 }).limit(5).lean();
  const upcomingAppointments = await attachApptUsers(rawAppts);

  const rawRx = await Prescription.find({ patientId: patient._id })
    .sort({ createdAt: 1 }).limit(3).lean();
  const recentPrescriptions = rawRx.map(normalizePrescription);

  const unpaidInvoices = await Invoice.find({ patientId: patient._id, status: "unpaid" }).lean();
  const outstandingBalance = unpaidInvoices.reduce((acc, inv: any) => acc + Number(inv.total), 0);

  const rawInvoices = await Invoice.find({ patientId: patient._id })
    .sort({ issuedAt: 1 }).limit(5).lean();
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

  const recentAppts = await Appointment.find({}).sort({ createdAt: 1 }).limit(limit).lean();
  const recentUsers = await User.find({}).sort({ createdAt: 1 }).limit(limit).lean();
  const recentInvoices = await Invoice.find({ status: "paid" }).sort({ paidAt: 1 }).limit(limit).lean();

  const activities = [
    ...recentAppts.map((a: any) => ({
      id: `appt-${a._id}`,
      type: "appointment_created",
      title: `Appointment #${a._id}`,
      description: `Appointment scheduled (${a.status})`,
      createdAt: a.createdAt,
    })),
    ...recentUsers.map((u: any) => ({
      id: `user-${u._id}`,
      type: "user_registered",
      title: `New ${u.role} registered`,
      description: `${u.name} joined as ${u.role}`,
      createdAt: u.createdAt,
    })),
    ...recentInvoices.map((i: any) => ({
      id: `inv-${i._id}`,
      type: "invoice_paid",
      title: `Invoice #${i._id} paid`,
      description: `Invoice was marked as paid`,
      createdAt: i.paidAt || i.issuedAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  res.json({ items: activities });
});

export default router;
