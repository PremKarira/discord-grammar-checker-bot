import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db, configCollection;

export async function initDB() {
  await mongoClient.connect();
  db = mongoClient.db("ngnlBotGrammar");
  configCollection = db.collection("config");
  console.log("✅ Connected to MongoDB");
}

export function getConfigCollection() {
  return configCollection;
}

// Fetch targets or testers from DB
export async function getUsers() {
  const doc = await configCollection.findOne({ _id: "users" });
  return {
    testers: doc?.testers || [],
    targets: doc?.targets || [],
  };
}

// Save testers or targets
export async function saveUsers(users) {
  await configCollection.updateOne(
    { _id: "users" },
    { $set: users },
    { upsert: true }
  );
}
