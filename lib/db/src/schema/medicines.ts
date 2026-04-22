import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { getNextId } from "./counter";

export interface IMedicine {
  _id: number;
  name: string;
  genericName: string | null;
  manufacturer: string | null;
  price: string | null;
  stockQuantity: number;
  expiryDate: string | null;
  category: string | null;
}

const medicineSchema = new Schema<IMedicine>(
  {
    _id: { type: Number },
    name: { type: String, required: true },
    genericName: { type: String, default: null },
    manufacturer: { type: String, default: null },
    price: { type: String, default: null },
    stockQuantity: { type: Number, default: 0 },
    expiryDate: { type: String, default: null },
    category: { type: String, default: null },
  },
  { _id: false, versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

medicineSchema.virtual("id").get(function () { return this._id; });

medicineSchema.pre("save", async function () {
  if (this.isNew && this._id == null) this._id = await getNextId("medicines");
});

export const Medicine: Model<IMedicine> =
  mongoose.models.Medicine || mongoose.model<IMedicine>("Medicine", medicineSchema);

export type MedicineDoc = HydratedDocument<IMedicine>;
