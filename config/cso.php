<?php

use Carbon\Carbon;

return [

    /*
    | Weekly off days for CSO auto roster rotation.
    | Carbon: 0 = Sunday … 5 = Friday … 6 = Saturday.
    | Friday is skipped so Thursday and Saturday do not get the same areas.
    */
    'weekly_off_days' => [Carbon::FRIDAY],

];
