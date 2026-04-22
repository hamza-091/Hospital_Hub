import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, doctorsTable, patientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { LoginBody, RegisterBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.status === "suspended") {
    res.status(401).json({ error: "Account suspended" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  const [doctorProfile] = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, user.id));
  const [patientProfile] = await db.select().from(patientsTable).where(eq(patientsTable.userId, user.id));
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ token, user: { ...safeUser, doctorProfile: doctorProfile || null, patientProfile: patientProfile || null } });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role, phone, specialty, qualifications, yearsExperience, consultationFee, bio, availableDays, availableHours, dateOfBirth, gender, bloodGroup, address, emergencyContact } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role: role as "admin" | "doctor" | "patient",
    phone: phone ?? null,
    status: "active",
  }).returning();

  let doctorProfile = null;
  let patientProfile = null;

  if (role === "doctor") {
    [doctorProfile] = await db.insert(doctorsTable).values({
      userId: user.id,
      specialty: specialty || "General Medicine",
      qualifications: qualifications ?? null,
      yearsExperience: yearsExperience ?? null,
      consultationFee: consultationFee != null ? String(consultationFee) : null,
      bio: bio ?? null,
      availableDays: availableDays ?? null,
      availableHours: availableHours ?? null,
    }).returning();
  } else if (role === "patient") {
    [patientProfile] = await db.insert(patientsTable).values({
      userId: user.id,
      dateOfBirth: dateOfBirth ?? null,
      gender: gender ?? null,
      bloodGroup: bloodGroup ?? null,
      address: address ?? null,
      emergencyContact: emergencyContact ?? null,
    }).returning();
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });
  const { passwordHash: _ph, ...safeUser } = user;
  res.status(201).json({ token, user: { ...safeUser, doctorProfile, patientProfile } });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [doctorProfile] = await db.select().from(doctorsTable).where(eq(doctorsTable.userId, user.id));
  const [patientProfile] = await db.select().from(patientsTable).where(eq(patientsTable.userId, user.id));
  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ ...safeUser, doctorProfile: doctorProfile || null, patientProfile: patientProfile || null });
});

export default router;
