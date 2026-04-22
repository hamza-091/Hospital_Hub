import { Router, type IRouter } from "express";
import { User } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

function publicUser(u: any) {
  if (!u) return null;
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    status: u.status,
    createdAt: u.createdAt,
  };
}

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const { search, role, status } = req.query as { search?: string; role?: string; status?: string };
  const filter: any = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
    ];
  }
  if (role) filter.role = role;
  if (status) filter.status = status;
  const users = await User.find(filter).lean();
  res.json({ users: users.map(publicUser) });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const user = await User.findById(id).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(publicUser(user));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = await User.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(publicUser(user));
});

export default router;
