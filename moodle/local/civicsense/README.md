# CivicSense agent tag for Moodle (`local_civicsense`)

Students write **@CivicSense** in a forum post to raise a campus issue (water, power, Wi-Fi, hostel, safety, labs). CivicSense analyses it, routes it to the responsible office as a *signal*, and replies under the post. Other students who are affected reply to that answer with **+1**.

Only posts that contain "@CivicSense", and replies to CivicSense's own posts, are sent. No other forum content leaves Moodle. Nothing is stored in Moodle.

Requires Moodle 4.1 or later and a running cron.

## How it works

1. A student posts in any forum: `@CivicSense no water in Hostel 3 since morning`. A reply that says only `@CivicSense` reports the post it replies to.
2. The plugin queues the post. On the next cron run, it sends the post to CivicSense, signed with the shared secret.
3. CivicSense replies in the forum through Moodle's standard web services, as the bot account. A private Moodle message goes to the student when needed (for example, the one-time link that connects their CivicSense account).

## Setup (Moodle site administrator)

**1. Install the plugin.** Copy this folder to `<moodle>/local/civicsense` and open *Site administration > Notifications*.

**2. Create the bot account.** Create a user such as `civicsense` (first name "CivicSense"). It has to be able to reply in the forums where students tag it, and to message those students. The simplest way is to enrol it in those courses as a student. Alternatively, give it a system role with `mod/forum:replypost` and `moodle/site:sendmessage`.

**3. Give CivicSense a web service token for the bot.**
- *Site administration > Server > Web services > Overview*: enable web services and the **REST** protocol.
- *External services*: add a service called "CivicSense", tick *Enabled* and *Authorised users only*, and add the functions **`mod_forum_add_discussion_post`** and **`core_message_send_instant_messages`**. Under *Authorised users*, add the bot account.
- *Manage tokens*: create a token for the bot account and the "CivicSense" service.
- Give the bot account a role with `webservice/rest:use` (for example, a system role "Web service user").

**4. Configure the plugin.** Under *Site administration > Plugins > Local plugins > CivicSense agent tag*:

| Setting | Value |
|---|---|
| CivicSense address | for example `https://civicsense.vercel.app` (empty = off) |
| Shared secret | a long random string, the same as `MOODLE_SECRET` on the CivicSense server |
| Bot username | the bot account's username, for example `civicsense` |

**5. On the CivicSense server**, set these in `.env.local`, or in the hosting settings:

```
MOODLE_URL=https://moodle.example.ac.in
MOODLE_TOKEN=<the token from step 3>
MOODLE_SECRET=<the shared secret from step 4>
```

The Moodle server must be able to reach the CivicSense address. Moodle's HTTP client blocks private addresses such as `localhost` and `192.168.*` by default (*Site administration > Security > HTTP security*). Keep that block and use the public CivicSense address. The two servers' clocks must agree within 5 minutes, because each request is signed with a timestamp.

## Notes

- Replies arrive after the next cron run, usually within a minute. If CivicSense can't be reached, Moodle retries the task later.
- Edited posts aren't sent again. The text as first posted counts.
- Sensitive reports (harassment, threats) get no public reply. The student receives a private message, and only the Head sees the issue.
- Students link their Moodle account to CivicSense once, through a private link the bot sends them.
