<?php

use App\Mail\BranchUsersSummaryMail;
use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $this->admin = User::factory()->create(['role_id' => $role->id]);
});

it('sends an expiring token to the personal email without changing or disclosing the password', function () {
    $user = User::factory()->create();
    $hash = $user->password;
    $this->actingAs($this->admin)->post('/users/'.$user->id.'/send-credentials')->assertRedirect()->assertSessionHas('success');
    Notification::assertSentTo($user, ResetPassword::class, fn ($notification) => filled($notification->token));
    expect($user->fresh()->password)->toBe($hash)->and(Hash::check('password', $user->fresh()->password))->toBeTrue();
    $this->post('/users/'.$user->id.'/send-credentials')->assertSessionHas('error');
    expect($user->fresh()->password)->toBe($hash);
});

it('skips inactive and shared branch identities', function () {
    foreach ([User::factory()->create(['is_active' => false]), User::factory()->create(['account_type' => 'branch'])] as $user) {
        $this->actingAs($this->admin)->post('/users/'.$user->id.'/send-credentials')->assertSessionHas('error');
        Notification::assertNotSentTo($user, ResetPassword::class);
    }
});

it('restricts setup dispatch to active personal super administrators', function () {
    $target = User::factory()->create();
    $headOffice = User::factory()->create();
    $this->actingAs($headOffice)->post('/users/'.$target->id.'/send-credentials')->assertForbidden();
    Notification::assertNothingSent();
});

it('sends bulk setup links only to eligible users and honors role exclusions', function () {
    $staff = User::factory()->create();
    $inactive = User::factory()->create(['is_active' => false]);
    $branch = User::factory()->create(['account_type' => 'branch']);
    $this->actingAs($this->admin)->post('/users/send-credentials-all', ['exclude_role_ids' => [$this->admin->role_id]])->assertSessionHas('success');
    Notification::assertSentTo($staff, ResetPassword::class);
    foreach ([$inactive, $branch, $this->admin] as $user) {
        Notification::assertNotSentTo($user, ResetPassword::class);
    }
});

it('does not create common branch PINs or print supplied secrets during migration', function () {
    Role::create(['name' => 'branch_user', 'display_name' => 'Branch User']);
    $zone = Zone::create(['name' => 'Zone', 'code' => 'Z1']);
    $area = Area::create(['name' => 'Area', 'code' => 'A1', 'zone_id' => $zone->id]);
    $branch = Branch::create(['name' => 'Branch', 'code' => '0001', 'area_id' => $area->id]);
    $this->artisan('branch-accounts:migrate', ['--default-pin' => '12345678'])->assertExitCode(1);
    expect($branch->fresh()->login_pin)->toBeNull();
    $this->artisan('branch-accounts:migrate')->assertExitCode(0);
    $this->post('/login', ['mode' => 'branch', 'branch_id' => $branch->id, 'pin' => '12345678'])->assertSessionHasErrors();
    expect($branch->fresh()->login_pin)->toBeNull()->and(User::where('branch_id', $branch->id)->where('account_type', 'branch')->count())->toBe(1);
});

it('renders branch directories without common passwords or reset tokens', function () {
    $branch = new Branch(['name' => 'Test branch', 'code' => '001']);
    $user = User::factory()->create();
    $html = (new BranchUsersSummaryMail($branch, collect([$user])))->render();
    expect($html)->not->toContain('12345678')->not->toContain($user->password)->toContain('Password setup');
});
