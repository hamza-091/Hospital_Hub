import { Router, type IRouter } from "express";
import { User, Prescription, Doctor, Patient, Medicine } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import PDFDocument from "pdfkit";

const router: IRouter = Router();

function publicUser(u: any) {
  if (!u) return null;
  return { id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt };
}

async function buildPrescriptionWithDetails(prescription: any) {
  const doctor = await Doctor.findById(prescription.doctorId).lean();
  const patient = await Patient.findById(prescription.patientId).lean();
  let doctorUser = null, patientUser = null;
  if (doctor) doctorUser = await User.findById(doctor.userId).lean();
  if (patient) patientUser = await User.findById(patient.userId).lean();

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
    id: prescription._id,
    patientId: prescription.patientId,
    doctorId: prescription.doctorId,
    appointmentId: prescription.appointmentId,
    prescribedDate: prescription.createdAt,
    expiryDate: null,
    status: "active",
    notes: prescription.instructions,
    items,
    createdAt: prescription.createdAt,
    doctor: doctor ? { ...doctor, id: doctor._id, user: publicUser(doctorUser) } : null,
    patient: patient ? { ...patient, id: patient._id, user: publicUser(patientUser) } : null,
  };
}

router.get("/prescriptions", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId } = req.query as { patientId?: string; doctorId?: string };
  const filter: any = {};
  if (patientId) filter.patientId = parseInt(patientId, 10);
  if (doctorId) filter.doctorId = parseInt(doctorId, 10);
  const prescriptions = await Prescription.find(filter).sort({ createdAt: 1 }).lean();
  const result = await Promise.all(prescriptions.map(buildPrescriptionWithDetails));
  res.json({ prescriptions: result });
});

router.post("/prescriptions", requireAuth, async (req, res): Promise<void> => {
  const { patientId, doctorId: bodyDoctorId, appointmentId, notes, items } = req.body;

  let doctorId: number;
  if (req.user!.role === "doctor") {
    const doc = await Doctor.findOne({ userId: req.user!.userId }).lean();
    if (!doc) { res.status(400).json({ error: "Doctor profile not found" }); return; }
    doctorId = doc._id;
  } else if (req.user!.role === "admin" && bodyDoctorId) {
    doctorId = bodyDoctorId;
  } else {
    res.status(403).json({ error: "Only doctors can create prescriptions" }); return;
  }

  const medicineItems = await Promise.all((items ?? []).map(async (item: any) => {
    let medicineName = item.medicine?.name ?? `Medicine #${item.medicineId}`;
    if (item.medicineId) {
      const med = await Medicine.findById(item.medicineId).lean();
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

  const prescription = await Prescription.create({
    patientId,
    doctorId,
    appointmentId: appointmentId ?? null,
    medicines: medicineItems,
    instructions: notes ?? null,
  });
  res.status(201).json(await buildPrescriptionWithDetails(prescription.toObject()));
});

router.get("/prescriptions/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const prescription = await Prescription.findById(id).lean();
  if (!prescription) { res.status(404).json({ error: "Prescription not found" }); return; }
  res.json(await buildPrescriptionWithDetails(prescription));
});

router.get("/prescriptions/:id/pdf", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const prescription = await Prescription.findById(id).lean();
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
