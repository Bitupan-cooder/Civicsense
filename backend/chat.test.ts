import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { bestMatch, discordTag, initialSignalStatus, makeLinkToken, matchScore, moodleTag, parseEmbedding, readLinkToken, signalVisibleTo, telegramTag, verifyMoodleSignature } from './chat.ts';

const group = { id: -100123, type: 'supergroup', title: 'Hostel 3 Boys' };
const tg = (message: object) => ({ update_id: 1, message: { message_id: 50, from: { id: 777, is_bot: false }, chat: group, ...message } });

test('telegram: ordinary group chat is ignored', () => {
  assert.equal(telegramTag(tg({ text: 'anyone going to the canteen?' }), 'CivicSenseBot'), null);
  assert.equal(telegramTag(tg({ text: 'no water again', from: { id: 1, is_bot: true } }), 'CivicSenseBot'), null);
});

test('telegram: @mention and /report raise an issue, without the handle', () => {
  const t = telegramTag(tg({ text: '@CivicSenseBot no water in hostel 3 since morning', entities: [{ type: 'mention', offset: 0, length: 14 }] }), 'CivicSenseBot');
  assert.deepEqual([t?.kind, t?.text, t?.chatId, t?.chatTitle, t?.userId], ['report', 'no water in hostel 3 since morning', '-100123', 'Hostel 3 Boys', '777']);
  assert.equal(telegramTag(tg({ text: '/report@CivicSenseBot fan broken in room 12' }), 'CivicSenseBot')?.text, 'fan broken in room 12');
  assert.equal(telegramTag(tg({ text: '/report fan broken' }), 'CivicSenseBot')?.text, 'fan broken');
  assert.equal(telegramTag(tg({ text: '/report@OtherBot fan broken' }), 'CivicSenseBot'), null);
  // a mention of someone else is not a tag
  assert.equal(telegramTag(tg({ text: '@rahul no water', entities: [{ type: 'mention', offset: 0, length: 6 }] }), 'CivicSenseBot'), null);
});

test('telegram: an empty tag in reply to a message reports that message', () => {
  const t = telegramTag(tg({ text: '/report', reply_to_message: { message_id: 40, from: { id: 5, is_bot: false }, text: 'library wifi down for 3 days' } }), 'CivicSenseBot');
  assert.equal(t?.text, 'library wifi down for 3 days');
});

test('telegram: +1 in reply to the bot is support; other replies are ignored', () => {
  const bot = { message_id: 51, from: { id: 9, is_bot: true, username: 'CivicSenseBot' }, text: 'Noted…' };
  const t = telegramTag(tg({ text: '+1', reply_to_message: bot }), 'CivicSenseBot');
  assert.deepEqual([t?.kind, t?.replyToBotMessageId], ['support', '51']);
  assert.equal(telegramTag(tg({ text: 'me too!', reply_to_message: bot }), 'CivicSenseBot')?.kind, 'support');
  assert.equal(telegramTag(tg({ text: '👍', reply_to_message: bot }), 'CivicSenseBot')?.kind, 'support');
  assert.equal(telegramTag(tg({ text: 'this is fake', reply_to_message: bot }), 'CivicSenseBot'), null);
});

test('telegram: private chat is a private tag', () => {
  assert.equal(telegramTag(tg({ text: '/start link', chat: { id: 777, type: 'private' } }), 'CivicSenseBot')?.kind, 'private');
});

const dc = (m: object) => ({ id: '900', channel_id: '42', guild_id: '1', author: { id: '777', bot: false }, content: '', mentions: [], ...m });

test('discord: only explicit mentions and +1 replies to the bot count', () => {
  assert.equal(discordTag(dc({ content: 'anyone up?' }), 'BOT'), null);
  const t = discordTag(dc({ content: '<@BOT> streetlight out near the library', mentions: [{ id: 'BOT' }] }), 'BOT');
  assert.deepEqual([t?.kind, t?.text, t?.chatId], ['report', 'streetlight out near the library', '42']);
  const reply = { id: '899', author: { id: 'BOT', bot: true }, content: 'Noted…' };
  assert.deepEqual(discordTag(dc({ content: '+1', referenced_message: reply, mentions: [{ id: 'BOT' }] }), 'BOT')?.replyToBotMessageId, '899');
  // a reply to the bot pings it, but without <@BOT> or +1 it is not a report
  assert.equal(discordTag(dc({ content: 'lol', referenced_message: reply, mentions: [{ id: 'BOT' }] }), 'BOT'), null);
  assert.equal(discordTag(dc({ content: '<@!BOT>', referenced_message: { id: '1', author: { id: '5' }, content: 'gym roof leaking' } }), 'BOT')?.text, 'gym roof leaking');
  assert.equal(discordTag(dc({ guild_id: undefined, content: 'hi' }), 'BOT')?.kind, 'private');
});

test('link tokens: valid for the right account and only for 30 minutes', () => {
  const now = 1_800_000_000_000;
  const token = makeLinkToken('telegram', '777', 'secret', now);
  assert.deepEqual(readLinkToken(token, 'secret', now + 60e3), { platform: 'telegram', userId: '777' });
  assert.equal(readLinkToken(token, 'secret', now + 31 * 60e3), null, 'expired');
  assert.equal(readLinkToken(token, 'other-secret', now), null, 'wrong key');
  assert.equal(readLinkToken(token.replace('.777.', '.778.'), 'secret', now), null, 'tampered account');
  assert.equal(readLinkToken('garbage', 'secret', now), null);
  assert.equal(readLinkToken(undefined, 'secret', now), null);
});

test('matching: embeddings when both have one, word overlap otherwise', () => {
  assert.ok(matchScore({ text: 'a', embedding: [1, 0] }, { text: 'b', embedding: [0.99, 0.1] }) > 0.8);
  assert.equal(matchScore({ text: 'a', embedding: [1, 0] }, { text: 'a', embedding: [0, 1] }), 0);
  assert.ok(matchScore({ text: 'no water in hostel 3 bathroom', embedding: null }, { text: 'hostel 3 bathroom no water', embedding: [1] }) > 0);
  const rows = [{ id: 1, t: 'library wifi down' }, { id: 2, t: 'no water in hostel 3 bathroom' }];
  assert.equal(bestMatch(rows, { text: 'hostel 3 bathroom water', embedding: null }, (r) => ({ text: r.t, embedding: null }))?.id, 2);
  assert.equal(bestMatch(rows, { text: 'canteen food stale', embedding: null }, (r) => ({ text: r.t, embedding: null })), null);
  assert.deepEqual(parseEmbedding('[0.5,1]'), [0.5, 1]);
  assert.equal(parseEmbedding(null), null);
});

test('lifecycle: urgent and sensitive go straight to the post, the rest wait for a second student', () => {
  assert.equal(initialSignalStatus({ is_sensitive: true, priority: 3, needs_review: true }), 'open');
  assert.equal(initialSignalStatus({ is_sensitive: false, priority: 1, needs_review: false }), 'open');
  assert.equal(initialSignalStatus({ is_sensitive: false, priority: 3, needs_review: false }), 'pending');
  assert.equal(initialSignalStatus({ is_sensitive: false, priority: 1, needs_review: true }), 'pending');
});

test('visibility: admin sees all; a post sees only its open signals', () => {
  const s = { status: 'open' as const, authority_ids: ['water'] };
  assert.ok(signalVisibleTo({ ...s, status: 'pending' }, { isAdmin: true, authorityIds: [] }));
  assert.ok(signalVisibleTo(s, { isAdmin: false, authorityIds: ['water'] }));
  assert.ok(!signalVisibleTo(s, { isAdmin: false, authorityIds: ['sports'] }));
  assert.ok(!signalVisibleTo({ ...s, status: 'pending' }, { isAdmin: false, authorityIds: ['water'] }));
  assert.ok(!signalVisibleTo({ ...s, status: 'dismissed' }, { isAdmin: false, authorityIds: ['water'] }));
});

const post = (extra: object = {}) => ({ postid: 90, discussionid: 7, forum: 'Hostel forum', subject: 'Water', userid: 31, text: '', parentid: null, replytobot: false, parenttext: '', ...extra });

test('moodle: @CivicSense raises an issue, an empty tag uses the post it replies to, +1 under the bot supports', () => {
  assert.deepEqual(moodleTag(post({ text: '@CivicSense no water in Hostel 3 since morning' })), {
    platform: 'moodle', kind: 'report', chatId: '7', chatTitle: 'Hostel forum: Water', messageId: '90', userId: '31', text: 'no water in Hostel 3 since morning',
  });
  assert.equal(moodleTag(post({ text: '@civicsense', parentid: 89, parenttext: 'Hostel 3 taps are dry' }))!.text, 'Hostel 3 taps are dry');
  assert.equal(moodleTag(post({ text: 'me too', parentid: 91, replytobot: true }))!.replyToBotMessageId, '91');
  assert.equal(moodleTag(post({ text: 'this is fake', parentid: 91, replytobot: true })), null);
  assert.equal(moodleTag(post({ text: 'see you at CivicSense@du.ac.in' })), null);
  assert.equal(moodleTag({ text: '@CivicSense hi' }), null);
});

test('moodle: the signature covers time and body, and expires', () => {
  const now = 1_800_000_000_000, time = String(now / 1000), body = '{"postid":90}';
  const sig = createHmac('sha256', 's3cret').update(`${time}.${body}`).digest('hex');
  assert.ok(verifyMoodleSignature(body, time, sig, 's3cret', now));
  assert.ok(!verifyMoodleSignature(body + ' ', time, sig, 's3cret', now));
  assert.ok(!verifyMoodleSignature(body, time, sig, 'other', now));
  assert.ok(!verifyMoodleSignature(body, time, sig, 's3cret', now + 301e3));
  assert.ok(!verifyMoodleSignature(body, 'x', sig, 's3cret', now));
  assert.ok(!verifyMoodleSignature(body, time, sig, '', now));
  assert.ok(!verifyMoodleSignature(body, undefined, undefined, 's3cret', now));
});
