export function setupErrorHandler(client, logToSupport) {
  const originalError = console.error;

  // ================= HELPER =================
  function formatArgs(args) {
    return args
      .map((a) => {
        if (!a) return "undefined";

        if (a instanceof Error) {
          return a.stack || a.message;
        }

        if (typeof a === "object") {
          try {
            return JSON.stringify(a, null, 2);
          } catch {
            return "[Unserializable Object]";
          }
        }

        return String(a);
      })
      .join("\n");
  }

  function shouldIgnore(text) {
    return (
      text.includes("Unknown interaction") ||
      text.includes('"code": 10062') ||
      text.includes("Unknown Message") ||
      text.includes('"code": 10008')
    );
  }

  // ================= console.error override =================
  console.error = async (...args) => {
    const text = formatArgs(args);

    // ❌ ignore noisy Discord API errors
    if (shouldIgnore(text)) return;

    // ✅ still print locally
    // originalError(...args);

    try {
      await logToSupport(client, `🚨 console.error:\n${text}`);
    } catch {}
  };

  // ================= unhandled promise =================
  process.on("unhandledRejection", async (reason) => {
    const text =
      reason instanceof Error ? reason.stack : JSON.stringify(reason, null, 2);

    if (shouldIgnore(text)) return;

    originalError("Unhandled Rejection:", reason);

    try {
      await logToSupport(client, `🚨 UNHANDLED REJECTION:\n${text}`);
    } catch {}
  });

  // ================= uncaught exception =================
  process.on("uncaughtException", async (err) => {
    const text = err?.stack || err?.message || String(err);

    if (shouldIgnore(text)) return;

    originalError("Uncaught Exception:", err);

    try {
      await logToSupport(client, `🚨 UNCAUGHT EXCEPTION:\n${text}`);
    } catch {}
  });
}