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
    voiceTargets: doc?.voiceTargets || [],
    replyTargets: doc?.replyTargets || [],
  };
}

// Save testers or targets
export async function saveUsers(users) {
  await configCollection.updateOne(
    { _id: "users" },
    { $set: users },
    { upsert: true },
  );
}

// Specific helper for voice targets (optional)
export async function getVoiceTargets() {
  const doc = await configCollection.findOne({ _id: "users" });
  return doc?.voiceTargets || [];
}

export async function saveVoiceTargets(ids) {
  await configCollection.updateOne(
    { _id: "users" },
    { $set: { voiceTargets: ids } },
    { upsert: true },
  );
}

// ================= FORWARDING CONFIG =================

// Get forwarding status
export async function getForwardingStatus() {
  const doc = await configCollection.findOne({ _id: "forwarding" });
  return doc?.enabled ?? true; // default true
}

// Save forwarding status
export async function saveForwardingStatus(status) {
  await configCollection.updateOne(
    { _id: "forwarding" },
    { $set: { enabled: status } },
    { upsert: true },
  );
}

// ================= BOT STATUS =================

export async function getBotStatus() {
  const doc = await configCollection.findOne({ _id: "botStatus" });

  return {
    commandEnabled: doc?.commandEnabled ?? false,
    voiceStateUpdate: doc?.voiceStateUpdate ?? false,
    forwardingEnabled: doc?.forwardingEnabled ?? true,
  };
}

export async function saveBotStatus(status) {
  await configCollection.updateOne(
    { _id: "botStatus" },
    { $set: status },
    { upsert: true },
  );
}
