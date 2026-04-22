import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  bloodGroup: text("blood_group"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  allergies: text("allergies"),
  medicalHistory: text("medical_history"),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
