<?php

use App\Http\Controllers\Concerns\RequiresSuperAdminDeletePin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

it('keeps maintenance commands out of the web router', function () {
    foreach (['utility.migrate', 'utility.clear', 'utility.storage-link'] as $name) {
        expect(Route::has($name))->toBeFalse();
    }
});

it('rejects the legacy default administrative pin and accepts an individual password', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->shouldReceive('isSuperAdmin')->andReturnTrue();
    $user->password = Hash::make('individual-test-password');
    config(['app.superadmin_delete_pin' => '8934']);

    $checker = new class
    {
        use RequiresSuperAdminDeletePin;

        public function accepts(Request $request): bool
        {
            return $this->userPasswordIsValid($request);
        }
    };

    foreach (['8934' => false, 'individual-test-password' => true] as $credential => $allowed) {
        $request = Request::create('/', 'POST', ['password' => (string) $credential]);
        $request->setUserResolver(fn () => $user);
        expect($checker->accepts($request))->toBe($allowed);
    }
});
