import { Router, type IRouter } from "express";
import { db, usersTable, patientsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { UpdatePatientBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildPatientWithUser(patient: typeof patientsTable.$inferSelect) {
  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    phone: usersTable.phone,
    status: usersTable.status,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, patient.userId));
  return { ...patient, user };
}

router.get("/patients", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as { search?: string };

  let patients = await db.select().from(patientsTable);

  if (search) {
    const users = await db.select().from(usersTable).where(
      or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))
    );
    const userIds = new Set(users.map(u => u.id));
    patients = patients.filter(p => userIds.has(p.userId));
  }

  const result = await Promise.all(patients.map(buildPatientWithUser));
  res.json({ patients: result });
});

router.get("/patients/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(await buildPatientWithUser(patient));
});

router.patch("/patients/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdatePatientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [patient] = await db.update(patientsTable).set(parsed.data).where(eq(patientsTable.id, id)).returning();
  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }
  res.json(await buildPatientWithUser(patient));
});

export default router;
