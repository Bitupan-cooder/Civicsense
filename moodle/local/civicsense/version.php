<?php
// CivicSense agent tag for Moodle forums: forwards posts that tag @CivicSense to the CivicSense server.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_civicsense';
$plugin->version = 2026110400;
$plugin->requires = 2022112800; // Moodle 4.1.
$plugin->maturity = MATURITY_ALPHA;
$plugin->release = '0.1';
