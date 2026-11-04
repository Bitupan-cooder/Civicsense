// Agent tag: students tag the CivicSense bot in a Telegram or Discord group to raise a campus issue ("signal").
// This file holds the pure parts (tag parsing, link tokens, matching, visibility) and the two platforms' send calls.
// The listeners are in chatbots.ts; the pipeline that analyses, filters and routes a tag is handleTag() in api.ts.
// Tested in backend/chat.test.ts.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { textSimilarity, DUPLICATE_THRESHOLD } from '../src/logic.ts';

export type Platform = 'telegram' | 'discord';
export const PLATFORM_NAMES: Record<Platform, string> = { telegram: 'Telegram', discord: 'Discord' };

/** Guardrails. A signal reaches the post holders once this many different students raised it (urgent ones at once). */
export const SIGNAL_CORROBORATION = 2;
/** Accepted tags per student per day (durable, counted in signal_supporters). */
export const TAGS_PER_DAY = 3;
/** Any tag per chat account per day, including rejected ones, so spam cannot run up AI calls. */
export const ATTEMPTS_PER_DAY = 10;

export interface Tag {
  platform: Platform;
  /** 'report' raises an issue, 'support' is a +1 on the bot's earlier reply, 'private' is a direct message to the bot */
  kind: 'report' | 'support' | 'private';
  chatId: string;
  chatTitle: string | null;
  messageId: string;
  userId: string;
  text: string;
  replyToBotMessageId?: string;
  /** Telegram bot username, for the "open a private chat with me" link */
  botName?: string;
}

/** "+1", "me too", "same here", 👍 as a reply to the bot's message counts as support. */
const SUPPORT = /^\s*(\+1|👍|me\s*too|same(\s+here)?|মোৰো)(?=[\s.!,]|$)/iu;

// ── Telegram (Bot API update objects) ──

/**
 * A group message is used only when it is meant for the bot: /report (or /report@bot), an @mention of the bot, or a
 * +1 reply to the bot's own message. Everything else returns null and is never stored.
 * With an empty /report or mention, the message it replies to is the issue.
 */
export function telegramTag(update: any, botUsername: string): Tag | null {
  const m = update?.message;
  if (!m?.from || m.from.is_bot) return null;
  const text: string = (m.text ?? m.caption ?? '').trim();
  const base = { platform: 'telegram' as const, chatId: String(m.chat.id), chatTitle: m.chat.title ?? null, messageId: String(m.message_id), userId: String(m.from.id), botName: botUsername };
  if (m.chat.type === 'private') return { ...base, kind: 'private', text };
  if (m.chat.type !== 'group' && m.chat.type !== 'supergroup') return null;

  const handle = '@' + botUsername.toLowerCase();
  const replied = m.reply_to_message;
  if (replied?.from?.username?.toLowerCase() === botUsername.toLowerCase() && SUPPORT.test(text)) {
    return { ...base, kind: 'support', text, replyToBotMessageId: String(replied.message_id) };
  }
  const command = text.match(/^\/report(@\w+)?(\s|$)/i);
  if (command && command[1] && command[1].toLowerCase() !== handle) return null; // /report@another_bot
  const mentioned = (m.entities ?? m.caption_entities ?? []).some((e: any) =>
    e.type === 'mention' && text.slice(e.offset, e.offset + e.length).toLowerCase() === handle);
  if (!command && !mentioned) return null;

  let issue = command ? text.slice(command[0].length) : text;
  issue = issue.replace(new RegExp(handle + '\\b', 'ig'), '').trim();
  if (!issue && replied && !replied.from?.is_bot) issue = (replied.text ?? replied.caption ?? '').trim();
  return { ...base, kind: 'report', text: issue };
}

// ── Discord (Gateway MESSAGE_CREATE payloads) ──

/** Same rules as Telegram: an @mention of the bot, or a +1 reply to the bot. Without the Message Content intent,
 * Discord sends the bot no other message text. */
export function discordTag(m: any, botId: string): Tag | null {
  if (!m?.author || m.author.bot || !botId) return null;
  const text: string = (m.content ?? '').trim();
  const base = { platform: 'discord' as const, chatId: String(m.channel_id), chatTitle: null, messageId: String(m.id), userId: String(m.author.id) };
  if (!m.guild_id) return { ...base, kind: 'private', text };

  const replied = m.referenced_message;
  const bare = text.replace(new RegExp(`<@!?${botId}>`, 'g'), '').trim();
  if (replied?.author?.id === botId && SUPPORT.test(bare)) return { ...base, kind: 'support', text: bare, replyToBotMessageId: String(replied.id) };
  // a reply to the bot pings it too, so only an explicit <@bot> in the text raises an issue
  if (bare === text) return null;
  const issue = bare || (replied && !replied.author?.bot ? (replied.content ?? '').trim() : '');
  return { ...base, kind: 'report', text: issue };
}

// ── Account linking: a signed, short-lived link the bot sends privately; the student opens it signed in ──

const LINK_TTL_MS = 30 * 60e3;
const sign = (payload: string, secret: string) => createHmac('sha256', 'chat-link:' + secret).update(payload).digest('base64url');

export function makeLinkToken(platform: Platform, userId: string, secret: string, now = Date.now()): string {
  const payload = `${platform}.${userId}.${now + LINK_TTL_MS}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readLinkToken(token: unknown, secret: string, now = Date.now()): { platform: Platform; userId: string } | null {
  if (typeof token !== 'string' || token.length > 300) return null;
  const [platform, userId, exp, sig] = token.split('.');
  if ((platform !== 'telegram' && platform !== 'discord') || !/^\d{1,25}$/.test(userId || '') || !sig) return null;
  const expected = Buffer.from(sign(`${platform}.${userId}.${exp}`, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (!(Number(exp) > now)) return null;
  return { platform, userId };
}

// ── Matching a tag to an open complaint or an earlier signal ──

export function cosine(a: number[], b: number[]): number {
  let dot = 0, x = 0, y = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; }
  return x && y ? dot / Math.sqrt(x * y) : 0;
}

export interface Comparable { text: string; embedding: number[] | null }

/** Embeddings when both sides have one (cross-language), otherwise word overlap. Returns the score, or 0 below threshold. */
export function matchScore(a: Comparable, b: Comparable): number {
  if (a.embedding && b.embedding && a.embedding.length === b.embedding.length) {
    const s = cosine(a.embedding, b.embedding);
    return s >= DUPLICATE_THRESHOLD.embedding ? s : 0;
  }
  const s = textSimilarity(a.text, b.text);
  return s >= DUPLICATE_THRESHOLD.words ? s : 0;
}

/** The row most similar to `mine` above the threshold, or null. */
export function bestMatch<T>(rows: T[] | null | undefined, mine: Comparable, toComparable: (row: T) => Comparable): T | null {
  let best: T | null = null;
  let top = 0;
  for (const row of rows || []) {
    const score = matchScore(mine, toComparable(row));
    if (score > top) { top = score; best = row; }
  }
  return best;
}

/** pgvector columns come back from PostgREST as "[0.1,...]"; jsonb as an array. */
export function parseEmbedding(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === 'string' && v.startsWith('[')) { try { return JSON.parse(v); } catch { return null; } }
  return null;
}

// ── Lifecycle and visibility ──

export type SignalStatus = 'pending' | 'open' | 'acknowledged' | 'converted' | 'dismissed';

/** Sensitive and urgent issues go to their post at once; the rest wait for a second student (or the admin). */
export function initialSignalStatus(r: { is_sensitive: boolean; priority: number; needs_review: boolean }): SignalStatus {
  return r.is_sensitive || (!r.needs_review && r.priority <= 2) ? 'open' : 'pending';
}

/** Administration sees every signal; a post holder sees the ones routed to their post once they are past 'pending'. */
export function signalVisibleTo(s: { status: SignalStatus; authority_ids: string[] }, viewer: { isAdmin: boolean; authorityIds: string[] }): boolean {
  if (viewer.isAdmin) return true;
  if (s.status === 'pending' || s.status === 'dismissed') return false;
  return s.authority_ids.some((id) => viewer.authorityIds.includes(id));
}

// ── Sending (REST). Failures are reported to the caller; nothing here retries. ──

export async function telegram(method: string, body: object, timeoutMs = 15000): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description || res.status}`);
  return json.result;
}

export async function discord(path: string, method = 'GET', body?: object): Promise<any> {
  const res = await fetch('https://discord.com/api/v10' + path, {
    method, headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Discord ${method} ${path}: ${json.message || res.status}`);
  return json;
}

/** Posts in the group, as a reply to the tag message when given. Returns the new message's id. */
export async function sendChatMessage(platform: Platform, chatId: string, text: string, replyTo?: string | null): Promise<string> {
  if (platform === 'telegram') {
    const sent = await telegram('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true },
      ...(replyTo ? { reply_parameters: { message_id: Number(replyTo), allow_sending_without_reply: true } } : {}) });
    return String(sent.message_id);
  }
  const sent = await discord(`/channels/${chatId}/messages`, 'POST', { content: text, allowed_mentions: { parse: [] },
    ...(replyTo ? { message_reference: { message_id: replyTo, fail_if_not_exists: false } } : {}) });
  return String(sent.id);
}

/** Direct message to one person. On Telegram this only works once they have opened a chat with the bot. */
export async function sendDirectMessage(platform: Platform, userId: string, text: string): Promise<void> {
  if (platform === 'telegram') { await telegram('sendMessage', { chat_id: userId, text, link_preview_options: { is_disabled: true } }); return; }
  const dm = await discord('/users/@me/channels', 'POST', { recipient_id: userId });
  await discord(`/channels/${dm.id}/messages`, 'POST', { content: text, allowed_mentions: { parse: [] } });
}
