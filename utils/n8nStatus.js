import fetch from "node-fetch";

export function startN8nStatusMonitor(client, isBotActive) {
  const baseUrl = process.env.N8N_WEBHOOK_URL;
  const url = baseUrl.replace(/\/[^/]+$/, "/status");

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

    } catch (err) {
      n8nState = "ERROR";
    }

    // Bot Active Status
    const botState = isBotActive.value ? "🟢 Active" : "🔴 Off";

    // Final status line
    const statusText = `${botState} | ${
      n8nState === "OK" ? "🟢 N8N OK" :
      n8nState === "DOWN" ? "🔴 N8N DOWN" :
      "🔴 N8N ERROR"
    }`;

    // Presence update
    client.user.setPresence({
      activities: [{ name: statusText }],
      status: isBotActive.value ? "online" : "idle",
    });

    console.log("Updated Bot Status:", statusText);
  }

  updateStatus(); 
  setInterval(updateStatus, 30_000); // run every 30 sec
}
