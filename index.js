import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import { initDB } from "./config/db.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleVoiceStateUpdate } from "./events/voiceJoinHandler.js";
import { handlePresenceUpdate } from "./events/presenceUpdate.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";
import { startN8nStatusMonitor } from "./utils/n8nStatus.js";
import { EmbedBuilder } from "discord.js";
import { Events } from "discord.js";
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const PREFIX = process.env.DISCORD_PREFIX || "!";
const OWNER_ID = process.env.OWNER_ID || "";
const isBotActive = { value: false };

await initDB();

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  startN8nStatusMonitor(client, isBotActive);
});

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

client.on("presenceUpdate", async (oldPresence, newPresence) => {
  if (!isBotActive.value) return;
  await handlePresenceUpdate(client, oldPresence, newPresence);
});

client.on("interactionCreate", async (interaction) => {
  await handleInteractionCreate(interaction);
});

const app = express();
app.get("/", (req, res) => res.send("✅ Discord bot running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);
