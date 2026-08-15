import { RECEIPT_NAMES } from "./board-config";

export type Attachment = { key: string; name: string; type: string; previewKey?: string; previewName?: string };
export type DrawMode = "ladder" | "picker";
export type PostModules = {
  qr?: { value: string; label: string };
  receipt?: { audience: string[] };
  relay?: { prompt: string };
  poll?: { options: string[] };
  draw?: { mode: DrawMode; pool: string[]; count: number };
};
export type DrawRung = { row: number; left: number };
export type DrawResult = { serial: string; mode: DrawMode; pool: string[]; winners: string[]; rungs: DrawRung[]; createdAt: string };

function asText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function uniqueNames(value: unknown, fallback: readonly string[] = []) {
  const list = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(list.map((item) => asText(item, 40)).filter(Boolean))).slice(0, 40);
}

export function normalizeModules(value: unknown): PostModules {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const output: PostModules = {};
  if (input.qr && typeof input.qr === "object") {
    const qr = input.qr as Record<string, unknown>;
    const qrValue = asText(qr.value, 2_000);
    if (qrValue) output.qr = { value: qrValue, label: asText(qr.label, 80) || "QR Code" };
  }
  if (input.receipt && typeof input.receipt === "object") {
    const audience = uniqueNames((input.receipt as Record<string, unknown>).audience, RECEIPT_NAMES);
    if (audience.length) output.receipt = { audience };
  }
  if (input.relay && typeof input.relay === "object") {
    output.relay = { prompt: asText((input.relay as Record<string, unknown>).prompt, 160) || "請留下接龍內容" };
  }
  if (input.poll && typeof input.poll === "object") {
    const options = uniqueNames((input.poll as Record<string, unknown>).options).slice(0, 8);
    if (options.length >= 2) output.poll = { options };
  }
  if (input.draw && typeof input.draw === "object") {
    const draw = input.draw as Record<string, unknown>;
    const pool = uniqueNames(draw.pool, RECEIPT_NAMES);
    const count = Math.min(3, Math.max(1, Number(draw.count) || 1));
    if (pool.length >= count) output.draw = { mode: draw.mode === "picker" ? "picker" : "ladder", pool, count };
  }
  return output;
}

export function parseModules(value: unknown): PostModules {
  if (typeof value !== "string" || !value) return {};
  try { return normalizeModules(JSON.parse(value)); } catch { return {}; }
}

export function normalizeAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const input = item as Record<string, unknown>;
    const key = asText(input.key, 300);
    const name = asText(input.name, 180);
    const type = asText(input.type, 100);
    if (!key.startsWith("board-documents/") || !name || !type) return [];
    const previewKey = asText(input.previewKey, 300);
    return [{ key, name, type, ...(previewKey.startsWith("board-documents/") ? { previewKey, previewName: asText(input.previewName, 180) } : {}) }];
  });
}

export function parseAttachments(value: unknown): Attachment[] {
  if (typeof value !== "string" || !value) return [];
  try { return normalizeAttachments(JSON.parse(value)); } catch { return []; }
}

export function parseDrawResult(value: unknown): DrawResult | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const input = JSON.parse(value) as DrawResult;
    if (!input.serial || !Array.isArray(input.pool) || !Array.isArray(input.winners)) return null;
    return input;
  } catch { return null; }
}
