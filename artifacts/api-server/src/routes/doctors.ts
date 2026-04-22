import { Router, type IRouter } from "express";
import { db, usersTable, doctorsTable, appointmentsTable } from "@workspace/db";
import { eq, ilike, and, or, SQL, gte, lt } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateDoctorBody, UpdateDoctorBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildDoctorWithUser(doctor: typeof doctorsTable.$inferSelect) {
  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    phone: usersTable.phone,
    status: usersTable.status,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, doctor.userId));
  return { ...doctor, user };
}

router.get("/doctors", async (req, res): Promise<void> => {
  const { specialty, search } = req.query as { specialty?: string; search?: string };
  const conditions: SQL[] = [];
  if (specialty) conditions.push(ilike(doctorsTable.specialty, `%${specialty}%`));

  let doctors = await db.select().from(doctorsTable).where(conditions.length > 0 ? and(...conditions) : undefined);

  if (search) {
    const users = await db.select().from(usersTable).where(
      or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))
    );
    const userIds = new Set(users.map(u => u.id));
    doctors = doctors.filter(d => userIds.has(d.userId));
  }

  const result = await Promise.all(doctors.map(buildDoctorWithUser));
  res.json({ doctors: result });
});

router.post("/doctors", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDoctorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [doctor] = await db.insert(doctorsTable).values({
    userId: data.userId,
    specialty: data.specialty,
    qualifications: data.qualifications ?? null,
    yearsExperience: data.yearsExperience ?? null,
    consultationFee: data.consultationFee != null ? String(data.consultationFee) : null,
    bio: data.bio ?? null,
    photoUrl: data.photoUrl ?? null,
    availableDays: data.availableDays ?? null,
    availableHours: data.availableHours ?? null,
  }).returning();
  res.status(201).json(await buildDoctorWithUser(doctor));
});

router.get("/doctors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, id));
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(await buildDoctorWithUser(doctor));
});

router.patch("/doctors/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateDoctorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Partial<typeof doctorsTable.$inferInsert> = {};
  if (data.specialty !== undefined) updates.specialty = data.specialty;
  if (data.qualifications !== undefined) updates.qualifications = data.qualifications;
  if (data.yearsExperience !== undefined) updates.yearsExperience = data.yearsExperience;
  if (data.consultationFee !== undefined) updates.consultationFee = data.consultationFee != null ? String(data.consultationFee) : null;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl;
  if (data.availableDays !== undefined) updates.availableDays = data.availableDays;
  if (data.availableHours !== undefined) updates.availableHours = data.availableHours;

  const [doctor] = await db.update(doctorsTable).set(updates).where(eq(doctorsTable.id, id)).returning();
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }
  res.json(await buildDoctorWithUser(doctor));
});

router.get("/doctors/:id/slots", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const doctorId = parseInt(raw, 10);
  const { date } = req.query as { date?: string };

  if (!date) {
    res.status(400).json({ error: "date query parameter required" });
    return;
  }

  const [doctor] = await db.select().from(doctorsTable).where(eq(doctorsTable.id, doctorId));
  if (!doctor) {
    res.status(404).json({ error: "Doctor not found" });
    return;
  }

  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(`${date}T23:59:59Z`);

  const booked = await db.select({ scheduledAt: appointmentsTable.scheduledAt })
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.doctorId, doctorId),
        gte(appointmentsTable.scheduledAt, dayStart),
        lt(appointmentsTable.scheduledAt, dayEnd),
        eq(appointmentsTable.status, "pending")
      )
    );

  const hoursStr = doctor.availableHours || "09:00-17:00";
  const [startStr, endStr] = hoursStr.split("-");
  const [startHour] = (startStr || "09:00").split(":").map(Number);
  const [endHour] = (endStr || "17:00").split(":").map(Number);

  const allSlots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  const bookedTimes = new Set(
    booked.map(b => {
      const d = new Date(b.scheduledAt);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    })
  );

  const availableSlots = allSlots.filter(s => !bookedTimes.has(s));
  const bookedSlots = allSlots.filter(s => bookedTimes.has(s));

  res.json({ date, doctorId, availableSlots, bookedSlots });
});

export default router;
