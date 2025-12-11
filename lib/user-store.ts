import crypto from "crypto";
import { getDb } from "@/lib/db";
import { MongoServerError, ObjectId } from "mongodb";

export type StoredUser = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: Date;
};

const hashPassword = (password: string, salt: string) => {
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
};

const usersCollection = async () => {
  const db = await getDb();
  const collection = db.collection<StoredUser>("users");
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
};

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
}) => {
  const emailKey = input.email.toLowerCase();
  const collection = await usersCollection();
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(input.password, salt);
  const now = new Date();
  const doc: Omit<StoredUser, "_id"> = {
    name: input.name.trim(),
    email: emailKey,
    passwordHash,
    salt,
    createdAt: now,
  };
  try {
    const result = await collection.insertOne(doc as StoredUser);
    return {
      id: result.insertedId.toHexString(),
      name: doc.name,
      email: doc.email,
    };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new Error("DUPLICATE_EMAIL");
    }
    throw error;
  }
};

export const authenticateUser = async (input: {
  email: string;
  password: string;
}) => {
  const emailKey = input.email.toLowerCase();
  const collection = await usersCollection();
  const user = await collection.findOne({ email: emailKey });
  if (!user) {
    return null;
  }
  const hash = hashPassword(input.password, user.salt);
  if (hash !== user.passwordHash) {
    return null;
  }
  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
  };
};

