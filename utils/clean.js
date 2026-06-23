export async function clean(client, text) {
  if (text === undefined) {
    return "undefined";
  }

  if (text === null) {
    return "null";
  }

  if (typeof text === "string") {
    return text;
  }

  if (text instanceof Error) {
    return text.stack || text.message;
  }

  try {
    return JSON.stringify(text, null, 2);
  } catch {
    return String(text);
  }
}
