import mongoose from 'mongoose';

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new mongoose.Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);

export async function nextOrderNumber(year: number): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: `orders-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return `SL-${year}-${String(counter.seq).padStart(4, '0')}`;
}
