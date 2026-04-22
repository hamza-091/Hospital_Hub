import { pgTable, text, serial, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const medicinesTable = pgTable("medicines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  genericName: text("generic_name"),
  manufacturer: text("manufacturer"),
  price: numeric("price", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  expiryDate: text("expiry_date"),
  category: text("category"),
});

export const insertMedicineSchema = createInsertSchema(medicinesTable).omit({ id: true });
export type InsertMedicine = z.infer<typeof insertMedicineSchema>;
export type Medicine = typeof medicinesTable.$inferSelect;
