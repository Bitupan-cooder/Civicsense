<?php
// A new discussion fires only discussion_created (not post_created for its first post), so both are observed.

defined('MOODLE_INTERNAL') || die();

$observers = [
    ['eventname' => '\mod_forum\event\post_created', 'callback' => '\local_civicsense\observer::post_created'],
    ['eventname' => '\mod_forum\event\discussion_created', 'callback' => '\local_civicsense\observer::post_created'],
];
