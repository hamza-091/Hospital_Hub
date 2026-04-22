import { pgTable, text, serial, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const doctorsTable = pgTable("doctors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  specialty: text("specialty").notNull(),
  qualifications: text("qualifications"),
  yearsExperience: integer("years_experience"),
  consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  availableDays: text("available_days"),
  availableHours: text("available_hours"),
});

export const insertDoctorSchema = createInsertSchema(doctorsTable).omit({ id: true });
export type InsertDoctor = z.infer<typeof insertDoctorSchema>;
export type Doctor = typeof doctorsTable.$inferSelect;
