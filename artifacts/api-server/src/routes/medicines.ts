import { Router, type IRouter } from "express";
import { db, medicinesTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { CreateMedicineBody, UpdateMedicineBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/medicines", requireAuth, async (req, res): Promise<void> => {
  const { search, category, lowStock } = req.query as { search?: string; category?: string; lowStock?: string };
  const conditions: SQL[] = [];
  if (search) conditions.push(ilike(medicinesTable.name, `%${search}%`));
  if (category) conditions.push(ilike(medicinesTable.category, `%${category}%`));
  if (lowStock === "true") conditions.push(sql`${medicinesTable.stockQuantity} < 20`);

  const medicines = await db.select().from(medicinesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  res.json({ medicines: medicines.map(m => ({ ...m, price: m.price ? Number(m.price) : null })) });
});

router.post("/medicines", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMedicineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [medicine] = await db.insert(medicinesTable).values({
    name: parsed.data.name,
    genericName: parsed.data.genericName ?? null,
    manufacturer: parsed.data.manufacturer ?? null,
    price: parsed.data.price != null ? String(parsed.data.price) : null,
    stockQuantity: parsed.data.stockQuantity,
    expiryDate: parsed.data.expiryDate ?? null,
    category: parsed.data.category ?? null,
  }).returning();
  res.status(201).json({ ...medicine, price: medicine.price ? Number(medicine.price) : null });
});

router.get("/medicines/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [medicine] = await db.select().from(medicinesTable).where(eq(medicinesTable.id, id));
  if (!medicine) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.json({ ...medicine, price: medicine.price ? Number(medicine.price) : null });
});

router.patch("/medicines/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateMedicineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const updates: Partial<typeof medicinesTable.$inferInsert> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.genericName !== undefined) updates.genericName = data.genericName;
  if (data.manufacturer !== undefined) updates.manufacturer = data.manufacturer;
  if (data.price !== undefined) updates.price = data.price != null ? String(data.price) : null;
  if (data.stockQuantity !== undefined) updates.stockQuantity = data.stockQuantity;
  if (data.expiryDate !== undefined) updates.expiryDate = data.expiryDate;
  if (data.category !== undefined) updates.category = data.category;

  const [medicine] = await db.update(medicinesTable).set(updates).where(eq(medicinesTable.id, id)).returning();
  if (!medicine) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.json({ ...medicine, price: medicine.price ? Number(medicine.price) : null });
});

router.delete("/medicines/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [medicine] = await db.delete(medicinesTable).where(eq(medicinesTable.id, id)).returning();
  if (!medicine) {
    res.status(404).json({ error: "Medicine not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
