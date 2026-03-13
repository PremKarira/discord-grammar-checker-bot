import fetch from "node-fetch";

export function startN8nStatusMonitor(client, isBotActive, botStatus) {
  const baseUrl = process.env.N8N_WEBHOOK_URL;
  const url = baseUrl?.replace(/\/[^/]+$/, "/status");

  if (!url) {
    console.error("❌ N8N_STATUS_URL missing");
    return;
  }

  async function updateStatus() {
    let n8nState = "ERROR";

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "ok") n8nState = "OK";
      else n8nState = "DOWN";
    } catch {
      n8nState = "ERROR";
    }

    // 1️⃣ Bot active
    const botState = isBotActive.value ? "🟢 BOT ON" : "🔴 BOT OFF";

    // 2️⃣ Commands
    const commandState = botStatus.commandEnabled ? "⚡ CMD ON" : "⚡ CMD OFF";

    // 3️⃣ Forwarding
    const forwardState = botStatus.forwardingEnabled
      ? "📨 FWD ON"
      : "📭 FWD OFF";

    // 4️⃣ Voice
    const voiceState = botStatus.voiceStateUpdate ? "🔊 VC ON" : "🔇 VC OFF";

    // N8N status
    const n8nStatus =
      n8nState === "OK"
        ? "🟢 N8N OK"
        : n8nState === "DOWN"
          ? "🔴 N8N DOWN"
          : "🔴 N8N ERR";

    const statusText = `${commandState} | ${voiceState} | ${n8nStatus}`;

    client.user.setPresence({
      activities: [{ name: statusText }],
      status: isBotActive.value ? "online" : "idle",
    });
  }

  updateStatus();
  setInterval(updateStatus, 30000);
}
