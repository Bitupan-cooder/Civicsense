<?php
// Site administration > Plugins > Local plugins > CivicSense agent tag.

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_civicsense', get_string('pluginname', 'local_civicsense'));
    $settings->add(new admin_setting_configtext('local_civicsense/url',
        get_string('url', 'local_civicsense'), get_string('url_desc', 'local_civicsense'), '', PARAM_URL));
    $settings->add(new admin_setting_configpasswordunmask('local_civicsense/secret',
        get_string('secret', 'local_civicsense'), get_string('secret_desc', 'local_civicsense'), ''));
    $settings->add(new admin_setting_configtext('local_civicsense/botuser',
        get_string('botuser', 'local_civicsense'), get_string('botuser_desc', 'local_civicsense'), '', PARAM_USERNAME));
    $ADMIN->add('localplugins', $settings);
}
