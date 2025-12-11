import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";

export type ChatMessageDoc = {
  _id: ObjectId;
  userId: string;
  role: "user" | "assistant";
  content: string;
  time: Date;
  severity?: number;
  severityLabel?: "green" | "yellow" | "red" | "black";
  action?: string;
  doctorQuestion?: string;
};

const messagesCollection = async () => {
  const db = await getDb();
  const collection = db.collection<ChatMessageDoc>("messages");
  await collection.createIndex({ userId: 1, time: 1 });
  return collection;
};

export const saveMessages = async (
  userId: string,
  entries: Omit<ChatMessageDoc, "_id" | "userId" | "time">[]
) => {
  const collection = await messagesCollection();
  const time = new Date();
  const docs = entries.map((entry) => ({
    ...entry,
    userId,
    time,
  }));
  await collection.insertMany(docs as any);
};

export const listMessages = async (userId: string, limit = 50) => {
  const collection = await messagesCollection();
  const docs = await collection
    .find({ userId })
    .sort({ time: 1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    role: d.role,
    content: d.content,
    time: d.time,
    severity: d.severity,
    severityLabel: d.severityLabel,
    action: d.action,
    doctorQuestion: d.doctorQuestion,
  }));
};

export const deleteMessages = async (userId: string) => {
  const collection = await messagesCollection();
  await collection.deleteMany({ userId });
};

