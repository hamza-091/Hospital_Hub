import { Router, type IRouter } from "express";
import { Medicine } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { CreateMedicineBody, UpdateMedicineBody } from "@workspace/api-zod";

const router: IRouter = Router();

function normalize(m: any) {
  if (!m) return m;
  return { ...m, id: m._id, price: m.price ? Number(m.price) : null };
}

router.get("/medicines", requireAuth, async (req, res): Promise<void> => {
  const { search, category, lowStock } = req.query as { search?: string; category?: string; lowStock?: string };
  const filter: any = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: safe, $options: "i" };
  }
  if (category) filter.category = category;
  if (lowStock === "true") filter.stockQuantity = { $lt: 20 };
  const medicines = await Medicine.find(filter).lean();
  res.json({ medicines: medicines.map(normalize) });
});

router.post("/medicines", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMedicineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data: any = { ...parsed.data };
  if (data.price != null) data.price = String(data.price);
  const med = await Medicine.create(data);
  res.status(201).json(normalize(med.toObject()));
});

router.get("/medicines/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const med = await Medicine.findById(id).lean();
  if (!med) { res.status(404).json({ error: "Medicine not found" }); return; }
  res.json(normalize(med));
});

router.patch("/medicines/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateMedicineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const update: any = { ...parsed.data };
  if (update.price != null) update.price = String(update.price);
  const med = await Medicine.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!med) { res.status(404).json({ error: "Medicine not found" }); return; }
  res.json(normalize(med));
});

export default router;
