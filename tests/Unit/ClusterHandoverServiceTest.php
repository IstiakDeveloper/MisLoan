<?php

use App\Models\MemberAdmission;
use App\Models\Samity;
use App\Models\User;
use App\Services\ClusterHandoverService;

it('groups leftover members by transferred officer and samity cluster', function () {
    $leftOfficer = new User(['name' => 'Maruf', 'pin' => '1055']);
    $leftOfficer->id = 169;

    $samity = new Samity([
        'samity_name' => 'Cluster A',
        'samity_name_bn' => 'ক্লাস্টার ক',
    ]);
    $samity->id = 7;

    $first = new MemberAdmission([
        'assigned_officer_id' => 169,
        'samity_id' => 7,
    ]);
    $first->id = 11;
    $first->setRelation('assignedOfficer', $leftOfficer);
    $first->setRelation('samity', $samity);

    $second = new MemberAdmission([
        'assigned_officer_id' => 169,
        'samity_id' => 7,
    ]);
    $second->id = 12;
    $second->setRelation('assignedOfficer', $leftOfficer);
    $second->setRelation('samity', $samity);

    $ungrouped = new MemberAdmission([
        'assigned_officer_id' => 169,
        'samity_id' => null,
    ]);
    $ungrouped->id = 13;
    $ungrouped->setRelation('assignedOfficer', $leftOfficer);

    $groups = (new ClusterHandoverService)->groupIntoClusters(collect([$first, $second, $ungrouped]));

    expect($groups)->toHaveCount(1)
        ->and($groups[0]['from_officer']['id'])->toBe(169)
        ->and($groups[0]['from_officer']['name'])->toBe('Maruf')
        ->and($groups[0]['clusters'])->toHaveCount(2);

    $named = collect($groups[0]['clusters'])->firstWhere('samity_id', 7);
    $none = collect($groups[0]['clusters'])->firstWhere('samity_id', null);

    expect($named['member_count'])->toBe(2)
        ->and($named['member_ids'])->toBe([11, 12])
        ->and($named['samity_name'])->toBe('ক্লাস্টার ক')
        ->and($none['member_count'])->toBe(1)
        ->and($none['samity_name'])->toBe('সমিতি নেই');
});
