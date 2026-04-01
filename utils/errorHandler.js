export function setupErrorHandler(client, logToSupport) {
  const originalError = console.error;

  function formatArgs(args) {
    return args
      .map((a) => {
        if (!a) return "undefined";
        if (a instanceof Error) return a.stack || a.message;

        if (typeof a === "object") {
          try {
            return JSON.stringify(a, null, 2);
          } catch {
            return "[Unserializable]";
          }
        }

        return String(a);
      })
      .join("\n");
  }

  function ignore(text) {
    return (
      text.includes("Unknown interaction") ||
      text.includes('"code": 10062') ||
      text.includes("Unknown Message") ||
      text.includes('"code": 10008')
    );
  }

  console.error = async (...args) => {
    const text = formatArgs(args);
    if (ignore(text)) return;

    originalError(...args);

    try {
      await logToSupport(client, `🚨 console.error:\n${text}`);
    } catch {}
  };

  process.on("unhandledRejection", async (reason) => {
    const text =
      reason instanceof Error ? reason.stack : JSON.stringify(reason, null, 2);

    if (ignore(text)) return;

    originalError("Unhandled Rejection:", reason);

    try {
      await logToSupport(client, `🚨 UNHANDLED REJECTION:\n${text}`);
    } catch {}
  });

  process.on("uncaughtException", async (err) => {
    const text = err?.stack || err?.message;

    if (ignore(text)) return;

    originalError("Uncaught Exception:", err);

    try {
      await logToSupport(client, `🚨 UNCAUGHT EXCEPTION:\n${text}`);
    } catch {}
  });
}