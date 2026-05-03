import { Router, type IRouter } from "express";
import { User, Patient } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { UpdatePatientBody } from "@workspace/api-zod";

const router: IRouter = Router();

function publicUser(u: any) {
  if (!u) return null;
  return { id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, status: u.status, createdAt: u.createdAt };
}

async function buildPatientWithUser(patient: any) {
  const u = await User.findById(patient.userId).lean();
  return { ...patient, id: patient._id, user: publicUser(u) };
}

router.get("/patients", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as { search?: string };
  let patients = await Patient.find({}).lean();
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await User.find({
      $or: [
        { name: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
      ],
    }).lean();
    const userIds = new Set(users.map((u: any) => u._id));
    patients = patients.filter(p => userIds.has(p.userId));
  }
  const result = await Promise.all(patients.map(buildPatientWithUser));
  res.json({ patients: result });
});

router.get("/patients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const patient = await Patient.findById(id).lean();
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(await buildPatientWithUser(patient));
});

router.patch("/patients/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const patient = await Patient.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  if (!patient) { res.status(404).json({ error: "Patient not found" }); return; }
  res.json(await buildPatientWithUser(patient));
});

export default router;

