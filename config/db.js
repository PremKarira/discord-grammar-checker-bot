import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db,
  configCollection,
  uploadsCollection,
  edmCacheCollection,
  sessionsCollection;
export async function initDB() {
  await mongoClient.connect();
  db = mongoClient.db("ngnlBotGrammar");
  configCollection = db.collection("config");
  uploadsCollection = db.collection("uploads");
  edmCacheCollection = db.collection("edmCache");
  sessionsCollection = db.collection("sessions");

  await sessionsCollection.createIndex(
    { expires: 1 },
    { expireAfterSeconds: 0 },
  );
  console.log("✅ Connected to MongoDB");
}

export function getMongoClient() {
  return mongoClient;
}

export function getDB() {
  return db;
}

export function getConfigCollection() {
  return configCollection;
}

export function getUploadsCollection() {
  return uploadsCollection;
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

// ================= UPLOAD SYSTEM =================

export async function saveUpload(data) {
  await uploadsCollection.insertOne(data);
}

export async function getUpload(hex) {
  return await uploadsCollection.findOne({
    hex,
  });
}
export async function getUploads() {
  return await uploadsCollection
    .find({})
    .sort({
      createdAt: -1,
    })
    .toArray();
}

// ================= EDM CACHE =================

export async function getEdmCache() {
  const doc = await configCollection.findOne({
    _id: "edmCache",
  });

  if (!doc) {
    return null;
  }

  return {
    edmResponse: doc.edmResponse || null,
    specialImportsResponse: doc.specialImportsResponse || null,
    vehicleJsonResponse: doc.vehicleJsonResponse || null,
    updatedAt: doc.updatedAt || null,
  };
}

export async function saveEdmCache(data) {
  await configCollection.updateOne(
    {
      _id: "edmCache",
    },
    {
      $set: {
        edmResponse: data.edmResponse || null,
        specialImportsResponse: data.specialImportsResponse || null,
        vehicleJsonResponse: data.vehicleJsonResponse || null,
        updatedAt: new Date(),
      },
    },
    {
      upsert: true,
    },
  );
}

// ================= SESSION STORE =================

export function getSessionsCollection() {
  return sessionsCollection;
}

export async function getSession(sid) {
  return sessionsCollection.findOne({ _id: sid });
}

export async function saveSession(sid, session, expires) {
  await sessionsCollection.updateOne(
    { _id: sid },
    {
      $set: {
        session,
        expires: expires
          ? new Date(expires)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    },
    { upsert: true },
  );
}

export async function destroySession(sid) {
  await sessionsCollection.deleteOne({ _id: sid });
}

export async function touchSession(sid, expires) {
  await sessionsCollection.updateOne(
    { _id: sid },
    {
      $set: {
        expires: expires
          ? new Date(expires)
          : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    },
  );
}
