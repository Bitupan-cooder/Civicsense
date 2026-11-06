<?php
// English strings for local_civicsense.

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'CivicSense agent tag';
$string['url'] = 'CivicSense address';
$string['url_desc'] = 'For example https://civicsense.vercel.app. Leave empty to switch the plugin off.';
$string['secret'] = 'Shared secret';
$string['secret_desc'] = 'The same value as MOODLE_SECRET on the CivicSense server. Every forwarded post is signed with it.';
$string['botuser'] = 'Bot username';
$string['botuser_desc'] = 'The Moodle account CivicSense replies as (the owner of its web service token). Replies of +1 to its posts count as support.';
$string['forwardfailed'] = 'CivicSense could not be reached ({$a}). The post will be sent again later.';
$string['privacy:metadata:civicsense'] = 'Forum posts that tag @CivicSense, and replies to its own posts (a +1 counts as support), are sent to the CivicSense campus issue service, which analyses the issue and routes it to the responsible office. No other posts leave Moodle.';
$string['privacy:metadata:civicsense:userid'] = 'The Moodle ID of the student who wrote the post, matched to their linked CivicSense account.';
$string['privacy:metadata:civicsense:text'] = 'The text of the tagged post, and of the post it replies to when the tag itself is empty.';
$string['privacy:metadata:civicsense:forum'] = 'The forum name and discussion subject, shown to the officials as where the issue was raised.';
