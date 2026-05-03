import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { User, Doctor, Patient } from "@workspace/db";
import { signToken, requireAuth } from "../lib/auth";
import { LoginBody, RegisterBody } from "@workspace/api-zod";

const router: IRouter = Router();

function safeUser(u: any) {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : u;
  const { passwordHash, _id, __v, id: _vid, ...rest } = obj;
  return { ...rest, id: _id };
}

function normalizeProfile(p: any) {
  if (!p) return null;
  const obj = p.toObject ? p.toObject() : p;
  const { _id, __v, id: _vid, ...rest } = obj;
  return { ...rest, id: _id };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const { email, password } = parsed.data;
    const user = await User.findOne({ email });
    if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }
    if (user.status === "suspended") { res.status(401).json({ error: "Account suspended" }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }
    const token = signToken({ userId: user._id, role: user.role, email: user.email });
    const doctorProfile = await Doctor.findOne({ userId: user._id }).lean();
    const patientProfile = await Patient.findOne({ userId: user._id }).lean();
    res.json({
      token,
      user: { ...safeUser(user), doctorProfile: normalizeProfile(doctorProfile), patientProfile: normalizeProfile(patientProfile) },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/register", async (req, res): Promise<void> => {
  try {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const { name, email, password, role, phone, specialty, qualifications, yearsExperience, consultationFee, bio, availableDays, availableHours, dateOfBirth, gender, bloodGroup, address, emergencyContact } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ error: "Email already registered" }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role as "admin" | "doctor" | "patient",
      phone: phone ?? null,
      status: "active",
    });

    let doctorProfile: any = null;
    let patientProfile: any = null;

    if (role === "doctor") {
      doctorProfile = await Doctor.create({
        userId: user._id,
        specialty: specialty || "General Medicine",
        qualifications: qualifications ?? null,
        yearsExperience: yearsExperience ?? null,
        consultationFee: consultationFee != null ? String(consultationFee) : null,
        bio: bio ?? null,
        availableDays: availableDays ?? null,
        availableHours: availableHours ?? null,
      });
    } else if (role === "patient") {
      patientProfile = await Patient.create({
        userId: user._id,
        dateOfBirth: dateOfBirth ?? null,
        gender: gender ?? null,
        bloodGroup: bloodGroup ?? null,
        address: address ?? null,
        emergencyContact: emergencyContact ?? null,
      });
    }

    const token = signToken({ userId: user._id, role: user.role, email: user.email });
    res.status(201).json({
      token,
      user: {
        ...safeUser(user),
        doctorProfile: normalizeProfile(doctorProfile),
        patientProfile: normalizeProfile(patientProfile),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await User.findById(userId);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const doctorProfile = await Doctor.findOne({ userId: user._id }).lean();
    const patientProfile = await Patient.findOne({ userId: user._id }).lean();
    res.json({ ...safeUser(user), doctorProfile: normalizeProfile(doctorProfile), patientProfile: normalizeProfile(patientProfile) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
