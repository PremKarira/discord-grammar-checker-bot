import fetch from "node-fetch";

export async function startN8nStatusMonitor(client) {
  const baseUrl = process.env.N8N_WEBHOOK_URL;
  const statusUrl = baseUrl.replace(/\/[^/]+$/, "/status");

  const INTERVAL = 10_000;
  console.log(`🔍 Monitoring n8n status from: ${statusUrl}`);

  async function updateStatus() {
    try {
      const res = await fetch(statusUrl);
      const { status, message } = await res.json();
      const isOk = status === "ok";
      client.user.setPresence({
        activities: [
          { name: isOk ? `🟢` : `🔴 ${message || "Down"}`, type: 3 },
        ],
        status: isOk ? "online" : "dnd",
      });
    } catch (err) {
      client.user.setPresence({
        activities: [{ name: "⚠️ n8n Error", type: 3 }],
        status: "idle",
      });
      console.error("❌ Error fetching n8n status:", err.message);
    }
  }

  updateStatus();
  setInterval(updateStatus, INTERVAL);
}
