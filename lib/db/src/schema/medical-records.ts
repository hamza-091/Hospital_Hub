import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { doctorsTable } from "./doctors";
import { patientsTable } from "./patients";
import { appointmentsTable } from "./appointments";

export const medicalRecordsTable = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patientsTable.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id").notNull().references(() => doctorsTable.id, { onDelete: "cascade" }),
  appointmentId: integer("appointment_id").references(() => appointmentsTable.id, { onDelete: "set null" }),
  diagnosis: text("diagnosis").notNull(),
  treatmentPlan: text("treatment_plan"),
  attachedFileUrls: text("attached_file_urls"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecordsTable).omit({ id: true, createdAt: true });
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;
export type MedicalRecord = typeof medicalRecordsTable.$inferSelect;
