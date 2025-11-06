import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import { initDB } from "./config/db.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleVoiceStateUpdate } from "./events/voiceJoinHandler.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const PREFIX = process.env.DISCORD_PREFIX || "!";
const OWNER_ID = process.env.OWNER_ID || "";
const isBotActive = { value: false }; // mutable

await initDB();

// Event: Bot ready
client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Event: Message create
client.on("messageCreate", async (message) => {
  await handleMessageCreate(client, message, PREFIX, OWNER_ID, isBotActive);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    await handleVoiceStateUpdate(oldState, newState);
  } catch (err) {
    console.error("Voice State Handler Error:", err);
  }
});

// Keep-alive server
const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
