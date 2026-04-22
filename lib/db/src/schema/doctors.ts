import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export interface IDoctor {
  _id: number;
  userId: number;
  specialty: string;
  qualifications: string | null;
  yearsExperience: number | null;
  consultationFee: string | null;
  bio: string | null;
  photoUrl: string | null;
  availableDays: string | null;
  availableHours: string | null;
}

const doctorSchema = new Schema<IDoctor>(
  {
    _id: { type: Number },
    userId: { type: Number, required: true, index: true },
    specialty: { type: String, required: true },
    qualifications: { type: String, default: null },
    yearsExperience: { type: Number, default: null },
    consultationFee: { type: String, default: null },
    bio: { type: String, default: null },
    photoUrl: { type: String, default: null },
    availableDays: { type: String, default: null },
    availableHours: { type: String, default: null },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

doctorSchema.virtual("id").get(function () { return this._id; });

doctorSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("doctors");
});

export const Doctor: Model<IDoctor> =
  mongoose.models.Doctor || mongoose.model<IDoctor>("Doctor", doctorSchema);

export type DoctorDoc = HydratedDocument<IDoctor>;
