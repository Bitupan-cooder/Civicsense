<?php
// Sends one queued post to CivicSense, which analyses it and replies in the forum through Moodle's web services.

namespace local_civicsense\task;

defined('MOODLE_INTERNAL') || die();

class forward_post extends \core\task\adhoc_task {
    public function execute() {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $url = get_config('local_civicsense', 'url');
        $secret = get_config('local_civicsense', 'secret');
        if (!$url || !$secret) {
            return; // Switched off since the post was queued.
        }
        $body = json_encode($this->get_custom_data());
        $time = (string) time();
        $curl = new \curl();
        $curl->setHeader([
            'Content-Type: application/json',
            'X-CivicSense-Time: ' . $time,
            'X-CivicSense-Signature: ' . hash_hmac('sha256', $time . '.' . $body, $secret),
        ]);
        $curl->post(rtrim($url, '/') . '/api/chat/moodle', $body, ['CURLOPT_TIMEOUT' => 60]);
        $status = (int) ($curl->get_info()['http_code'] ?? 0);
        if ($curl->get_errno() || $status === 0 || $status >= 500) {
            // An exception makes Moodle retry the task later, with a growing delay.
            throw new \moodle_exception('forwardfailed', 'local_civicsense', '', $curl->error ?: "HTTP $status");
        }
        if ($status >= 400) {
            mtrace("CivicSense refused the post (HTTP $status). Check the shared secret and that both server clocks are right.");
        }
    }
}
