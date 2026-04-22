import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, and, or, SQL } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const { search, role, status } = req.query as { search?: string; role?: string; status?: string };
  const conditions: SQL[] = [];
  if (search) {
    conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))!);
  }
  if (role) conditions.push(eq(usersTable.role, role as "admin" | "doctor" | "patient"));
  if (status) conditions.push(eq(usersTable.status, status as "active" | "suspended"));

  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    phone: usersTable.phone,
    status: usersTable.status,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(conditions.length > 0 ? and(...conditions) : undefined);
  res.json({ users });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [user] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    phone: usersTable.phone,
    status: usersTable.status,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status as "active" | "suspended";
  if (parsed.data.role !== undefined) updates.role = parsed.data.role as "admin" | "doctor" | "patient";

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    phone: usersTable.phone,
    status: usersTable.status,
    createdAt: usersTable.createdAt,
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

export default router;
