// Agent tag listeners: Telegram long polling and the Discord Gateway. Both connect outwards, so no public URL is needed.
// Opt in with CHAT_BOTS=true in exactly one long-running process (a second poller on the same Telegram bot gets 409).
// Each tag goes to respondToTag() in api.ts; this file only receives messages. (Moodle pushes instead: /api/chat/moodle.)
import { respondToTag as respond } from './api.ts';
import { discord, discordTag, telegram, telegramTag } from './chat.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ponytail: tags are handled one at a time per platform; queue them in parallel if groups get busy.
async function pollTelegram(): Promise<void> {
  const me = await telegram('getMe', {});
  await telegram('deleteWebhook', {}); // getUpdates refuses to run while a webhook is set
  console.log(`[chatbots] Telegram: listening as @${me.username}`);
  let offset = 0;
  for (;;) {
    try {
      const updates = await telegram('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] }, 60000);
      for (const u of updates) {
        offset = u.update_id + 1;
        const tag = telegramTag(u, me.username);
        if (tag) await respond(tag);
      }
    } catch (err) {
      console.error('[chatbots] Telegram poll failed:', (err as Error).message);
      await wait(5000);
    }
  }
}

const GUILD_MESSAGES = 1 << 9;
const DIRECT_MESSAGES = 1 << 12;
const channelNames = new Map<string, string | null>();

async function channelName(id: string): Promise<string | null> {
  if (!channelNames.has(id)) channelNames.set(id, await discord(`/channels/${id}`).then((c) => (c.name ? '#' + c.name : null), () => null));
  return channelNames.get(id)!;
}

// ponytail: reconnects with a fresh identify instead of resuming; missed messages during a reconnect are lost.
function connectDiscord(): void {
  const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
  let seq: number | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let botId = '';
  ws.onmessage = (event) => {
    const p = JSON.parse(String(event.data));
    if (p.s != null) seq = p.s;
    if (p.op === 10) {
      heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 1, d: seq })), p.d.heartbeat_interval);
      ws.send(JSON.stringify({ op: 2, d: { token: process.env.DISCORD_BOT_TOKEN, intents: GUILD_MESSAGES | DIRECT_MESSAGES, properties: { os: 'linux', browser: 'civicsense', device: 'civicsense' } } }));
    } else if (p.op === 1) {
      ws.send(JSON.stringify({ op: 1, d: seq }));
    } else if (p.op === 7 || p.op === 9) {
      ws.close(); // Discord asked for a reconnect, or the session is invalid
    } else if (p.t === 'READY') {
      botId = p.d.user.id;
      console.log(`[chatbots] Discord: listening as ${p.d.user.username}`);
    } else if (p.t === 'MESSAGE_CREATE') {
      const tag = discordTag(p.d, botId);
      if (!tag) return; // not meant for the bot: ignored, never stored
      void channelName(tag.chatId).then((chatTitle) => respond({ ...tag, chatTitle }));
    }
  };
  ws.onclose = (event) => {
    clearInterval(heartbeat);
    // 4004 bad token, 4013/4014 intents: retrying will not help
    if ([4004, 4013, 4014].includes(event.code)) { console.error(`[chatbots] Discord stopped (${event.code} ${event.reason}). Check DISCORD_BOT_TOKEN.`); return; }
    setTimeout(connectDiscord, 5000);
  };
  ws.onerror = () => { /* onclose follows and reconnects */ };
}

export function startChatBots(): void {
  const g = globalThis as { civicChatBots?: boolean };
  if (process.env.CHAT_BOTS !== 'true' || g.civicChatBots) return; // Vite re-runs its config on change: start once
  g.civicChatBots = true;
  if (process.env.TELEGRAM_BOT_TOKEN) pollTelegram().catch((err) => console.error('[chatbots] Telegram not started:', err.message));
  if (process.env.DISCORD_BOT_TOKEN) connectDiscord();
  if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.DISCORD_BOT_TOKEN) console.warn('[chatbots] CHAT_BOTS=true but no TELEGRAM_BOT_TOKEN or DISCORD_BOT_TOKEN is set.');
}
