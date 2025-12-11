import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

const globalForMongo = globalThis as unknown as {
  mongoClient?: MongoClient;
  mongoClientPromise?: Promise<MongoClient>;
};

const client = globalForMongo.mongoClient ?? new MongoClient(uri);
const clientPromise =
  globalForMongo.mongoClientPromise ?? client.connect();

if (!globalForMongo.mongoClient) {
  globalForMongo.mongoClient = client;
  globalForMongo.mongoClientPromise = clientPromise;
}

export async function getDb(dbName = "medicare") {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}

