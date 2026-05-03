import { Router, type IRouter } from "express";
import { User, Doctor, Appointment } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { CreateDoctorBody, UpdateDoctorBody } from "@workspace/api-zod";

const router: IRouter = Router();

function publicUser(u: any) {
  if (!u) return null;
  return { id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt };
}

async function buildDoctorWithUser(doctor: any) {
  const u = await User.findById(doctor.userId).lean();
  return { ...doctor, id: doctor._id, user: publicUser(u) };
}

async function getDoctorAvailabilityPayload(doctorId: number, date: string) {
  const doctor = await Doctor.findById(doctorId).lean();
  if (!doctor) return null;

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);
  const booked = await Appointment.find({
    doctorId,
    scheduledAt: { $gte: dayStart, $lte: dayEnd },
    status: { $ne: "cancelled" },
  }).lean();

  const allSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const bookedTimes = new Set(booked.map(b => {
    const d = new Date(b.scheduledAt);
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }));
  const availableSlots = allSlots.filter(s => !bookedTimes.has(s));

  return { date, doctorId, availableSlots, bookedSlots: Array.from(bookedTimes) };
}

router.get("/doctors", async (req, res): Promise<void> => {
  const { specialty, search } = req.query as { specialty?: string; search?: string };
  const filter: any = {};
  if (specialty) {
    const safeSpec = specialty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.specialty = { $regex: safeSpec, $options: "i" };
  }
  let doctors = await Doctor.find(filter).lean();
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      $or: [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ],
    }).lean();
    const userIds = new Set(users.map((u: any) => u._id));
    doctors = doctors.filter(d => userIds.has(d.userId));
  }
  const result = await Promise.all(doctors.map(buildDoctorWithUser));
  res.json({ doctors: result });
});

router.post("/doctors", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDoctorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = parsed.data;
  const doctor = await Doctor.create({
    userId: data.userId,
    specialty: data.specialty,
    qualifications: data.qualifications ?? null,
    yearsExperience: data.yearsExperience ?? null,
    consultationFee: data.consultationFee != null ? String(data.consultationFee) : null,
    bio: data.bio ?? null,
    photoUrl: data.photoUrl ?? null,
    availableDays: data.availableDays ?? null,
    availableHours: data.availableHours ?? null,
  });
  res.status(201).json(await buildDoctorWithUser(doctor.toObject()));
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const doctor = await Doctor.findById(id).lean();
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(await buildDoctorWithUser(doctor));
});

router.patch("/doctors/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateDoctorBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const update: any = { ...parsed.data };
  if (update.consultationFee != null) update.consultationFee = String(update.consultationFee);
  const doctor = await Doctor.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!doctor) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(await buildDoctorWithUser(doctor));
});

router.get("/doctors/:id/availability", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const date = req.query.date as string;
  if (!date) { res.status(400).json({ error: "date required" }); return; }
  const payload = await getDoctorAvailabilityPayload(id, date);
  if (!payload) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(payload);
});

router.get("/doctors/:id/slots", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const date = req.query.date as string;
  if (!date) { res.status(400).json({ error: "date required" }); return; }
  const payload = await getDoctorAvailabilityPayload(id, date);
  if (!payload) { res.status(404).json({ error: "Doctor not found" }); return; }
  res.json(payload);
});

export default router;

