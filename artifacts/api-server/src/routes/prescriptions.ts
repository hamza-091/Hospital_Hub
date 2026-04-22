import { Router, type IRouter } from "express";
import { db, usersTable, prescriptionsTable, doctorsTable, patientsTable, medicinesTable } from "@workspace/db";
import { eq, and, inArray, SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

async function buildPrescriptionWithDetails(prescription: typeof prescriptionsTable.$inferSelect) {
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, prescription.doctorId));
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, prescription.patientId));
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
  // Normalize medicines array to items with medicine object
  const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];
  const items = medicines.map((m: any) => ({
    medicine: { id: m.medicineId, name: m.medicineName ?? `Medicine #${m.medicineId}` },
    dosage: m.dosage,
    frequency: m.frequency,
    duration: m.duration,
    quantity: m.quantity ?? null,
    instructions: m.instructions ?? null,
  }));
  return {
    id: prescription.id,
    patientId: prescription.patientId,
    doctorId: prescription.doctorId,
    appointmentId: prescription.appointmentId,
    prescribedDate: prescription.createdAt,
    expiryDate: null,
    status: "active",
    notes: prescription.instructions,
    items,
    createdAt: prescription.createdAt,
    doctor: doctor ? { ...doctor, user: doctorUser } : null,
    patient: patient ? { ...patient, user: patientUser } : null,
  };
}

router.get("/prescriptions", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId } = req.query as { patientId?: string; doctorId?: string };
  const conditions: SQL[] = [];
  if (patientId) conditions.push(eq(prescriptionsTable.patientId, parseInt(patientId, 10)));
  if (doctorId) conditions.push(eq(prescriptionsTable.doctorId, parseInt(doctorId, 10)));

  const prescriptions = await db.select().from(prescriptionsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(prescriptionsTable.createdAt);
  const result = await Promise.all(prescriptions.map(buildPrescriptionWithDetails));
  res.json({ prescriptions: result });
});

router.post("/prescriptions", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId: bodyDoctorId, appointmentId, prescribedDate, expiryDate, notes, items } = req.body;

  let doctorId: number;
  if (req.user!.role === "doctor") {
    const [doc] = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, req.user!.userId));
    if (!doc) { res.status(400).json({ error: "Doctor profile not found" }); return; }
    doctorId = doc.id;
  } else if (req.user!.role === "admin" && bodyDoctorId) {
    doctorId = bodyDoctorId;
  } else {
    res.status(403).json({ error: "Only doctors can create prescriptions" }); return;
  }

  // Enrich items with medicine names if available
  const medicineItems = await Promise.all((items ?? []).map(async (item: any) => {
    let medicineName = item.medicine?.name ?? `Medicine #${item.medicineId}`;
    if (item.medicineId) {
      const [med] = await db.select().from(medicinesTable).where(eq(medicinesTable.id, item.medicineId));
      if (med) medicineName = med.name;
    }
    return {
      medicineId: item.medicineId,
      medicineName,
      dosage: item.dosage ?? "",
      frequency: item.frequency ?? "",
      duration: item.duration ?? null,
      quantity: item.quantity ?? null,
      instructions: item.instructions ?? null,
    };
  }));

  const [prescription] = await db.insert(prescriptionsTable).values({
    patientId,
    doctorId,
    appointmentId: appointmentId ?? null,
    medicines: medicineItems,
    instructions: notes ?? null,
  }).returning();
  res.status(201).json(await buildPrescriptionWithDetails(prescription));
});

router.get("/prescriptions/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [prescription] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, id));
  if (!prescription) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(await buildPrescriptionWithDetails(prescription));
});

router.get("/prescriptions/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [prescription] = await db.select().from(prescriptionsTable).where(eq(prescriptionsTable.id, id));
  if (!prescription) { res.status(404).json({ error: "Prescription not found" }); return; }
  const details = await buildPrescriptionWithDetails(prescription);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="prescription-${id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(22).font("Helvetica-Bold").text("CareSync HMS", { align: "center" });
  doc.fontSize(12).font("Helvetica").text("PRESCRIPTION", { align: "center" });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown();

  doc.fontSize(11).font("Helvetica-Bold").text("Patient: ", { continued: true }).font("Helvetica").text(details.patient?.user?.name || "N/A");
  doc.font("Helvetica-Bold").text("Doctor: ", { continued: true }).font("Helvetica").text(`Dr. ${details.doctor?.user?.name || "N/A"} (${details.doctor?.specialty || "N/A"})`);
  doc.font("Helvetica-Bold").text("Date: ", { continued: true }).font("Helvetica").text(new Date(prescription.createdAt).toLocaleDateString());
  doc.moveDown();

  doc.fontSize(13).font("Helvetica-Bold").text("Medications:");
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
  doc.moveDown(0.5);

  details.items.forEach((item, idx) => {
    doc.fontSize(11).font("Helvetica-Bold").text(`${idx + 1}. ${item.medicine?.name || "N/A"}`);
    if (item.dosage) doc.font("Helvetica").text(`   Dosage: ${item.dosage}`);
    if (item.frequency) doc.font("Helvetica").text(`   Frequency: ${item.frequency}`);
    if (item.duration) doc.font("Helvetica").text(`   Duration: ${item.duration}`);
    if (item.quantity) doc.font("Helvetica").text(`   Quantity: ${item.quantity}`);
    doc.moveDown(0.5);
  });

  if (prescription.instructions) {
    doc.moveDown();
    doc.fontSize(11).font("Helvetica-Bold").text("Instructions:");
    doc.font("Helvetica").text(prescription.instructions);
  }

  doc.end();
});

export default router;
