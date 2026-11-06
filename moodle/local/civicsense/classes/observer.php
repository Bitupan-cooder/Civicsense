<?php
// Picks out the forum posts meant for CivicSense and queues them; everything else is ignored and never leaves Moodle.

namespace local_civicsense;

defined('MOODLE_INTERNAL') || die();

class observer {
    /**
     * A post is forwarded when its text contains "@CivicSense", or when it replies to the bot's own post (a possible +1).
     * Sending happens in an ad hoc task (next cron run), so posting is never slowed down or blocked by CivicSense.
     */
    public static function post_created(\core\event\base $event): void {
        global $DB;
        if (!get_config('local_civicsense', 'url')) {
            return;
        }
        $postid = $event instanceof \mod_forum\event\discussion_created
            ? $DB->get_field('forum_discussions', 'firstpost', ['id' => $event->objectid])
            : $event->objectid;
        $post = $DB->get_record('forum_posts', ['id' => $postid]);
        $botuser = get_config('local_civicsense', 'botuser');
        $botid = $botuser ? (int) $DB->get_field('user', 'id', ['username' => $botuser, 'deleted' => 0]) : 0;
        if (!$post || (int) $post->userid === $botid) {
            return;
        }
        $parent = $post->parent ? $DB->get_record('forum_posts', ['id' => $post->parent]) : null;
        $replytobot = $parent && $botid && (int) $parent->userid === $botid;
        $text = content_to_text($post->message, $post->messageformat);
        $tagged = stripos($text, '@civicsense') !== false;
        if (!$tagged && !$replytobot) {
            return;
        }

        $discussion = $DB->get_record('forum_discussions', ['id' => $post->discussion], 'id, name, forum');
        $task = new task\forward_post();
        $task->set_custom_data([
            'postid' => (int) $post->id,
            'discussionid' => (int) $discussion->id,
            'forum' => $DB->get_field('forum', 'name', ['id' => $discussion->forum]),
            'subject' => $discussion->name,
            'userid' => (int) $post->userid,
            'text' => $text,
            'parentid' => $parent ? (int) $parent->id : null,
            'replytobot' => $replytobot,
            // an empty "@CivicSense" reply means "this post": only then is the parent's text needed
            'parenttext' => $tagged && $parent && !$replytobot ? content_to_text($parent->message, $parent->messageformat) : '',
        ]);
        \core\task\manager::queue_adhoc_task($task);
    }
}
