<?php
// Privacy API: nothing is stored in Moodle; tagged posts are sent to CivicSense.

namespace local_civicsense\privacy;

use core_privacy\local\metadata\collection;

defined('MOODLE_INTERNAL') || die();

class provider implements \core_privacy\local\metadata\provider {
    public static function get_metadata(collection $collection): collection {
        $collection->add_external_location_link('civicsense', [
            'userid' => 'privacy:metadata:civicsense:userid',
            'text' => 'privacy:metadata:civicsense:text',
            'forum' => 'privacy:metadata:civicsense:forum',
        ], 'privacy:metadata:civicsense');
        return $collection;
    }
}
