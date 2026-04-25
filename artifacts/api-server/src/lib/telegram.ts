import { logger } from "./logger";

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ??
  "6893223743:AAGuItvnqT7tixkqNOI0J8PZNlAYWdMC0Wc";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "854578633";

export async function sendToTelegram(message: string): Promise<void> {
  try {
    const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
    url.searchParams.set("chat_id", CHAT_ID);
    url.searchParams.set("text", message);
    url.searchParams.set("parse_mode", "HTML");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      await fetch(url, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    logger.warn({ err }, "telegram notification failed");
  }
}
