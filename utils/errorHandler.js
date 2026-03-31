export function setupErrorHandler(client, logToSupport) {
  const originalError = console.error;

  // ================= console.error override =================
  console.error = async (...args) => {
    originalError(...args);

    try {
      const text = args
        .map((a) =>
          typeof a === "string" ? a : JSON.stringify(a, null, 2)
        )
        .join("\n");

      await logToSupport(client, `🚨 console.error:\n${text}`);
    } catch {}
  };

  // ================= unhandled promise =================
  process.on("unhandledRejection", async (reason) => {
    originalError("Unhandled Rejection:", reason);

    try {
      await logToSupport(
        client,
        `🚨 UNHANDLED REJECTION:\n${reason?.stack || reason}`
      );
    } catch {}
  });

  // ================= uncaught exception =================
  process.on("uncaughtException", async (err) => {
    originalError("Uncaught Exception:", err);

    try {
      await logToSupport(
        client,
        `🚨 UNCAUGHT EXCEPTION:\n${err.stack}`
      );
    } catch {}
  });
}