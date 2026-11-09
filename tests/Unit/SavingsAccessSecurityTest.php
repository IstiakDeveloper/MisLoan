<?php

use App\Http\Controllers\Member\SavingsApplicationController;
use App\Models\SavingsApplication;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    Schema::disableForeignKeyConstraints();
    Schema::dropIfExists('savings_applications');
    Schema::enableForeignKeyConstraints();
    Schema::create('savings_applications', function (Blueprint $t) {
        $t->id();
        $t->unsignedBigInteger('branch_id');
        $t->string('status');
        $t->json('form_data')->nullable();
        $t->timestamps();
    });
    $this->savings = SavingsApplication::create(['branch_id' => 9, 'status' => 'active']);
    $actor = Mockery::mock(User::class)->makePartial();
    $actor->is_active = true;
    $actor->shouldReceive('canAccessBranch')->with(9)->andReturn(false);
    $request = Request::create('/member/savings-applications/'.$this->savings->id, 'POST');
    $request->setUserResolver(fn () => $actor);
    app()->instance('request', $request);
    $this->request = $request;
    $this->controller = app(SavingsApplicationController::class);
});

it('blocks cross-branch access before activation withdrawal or deletion', function () {
    expect(fn () => $this->controller->activate($this->savings->id))->toThrow(HttpException::class)
        ->and(fn () => $this->controller->withdraw($this->request, $this->savings->id))->toThrow(HttpException::class)
        ->and(fn () => $this->controller->destroy($this->request, $this->savings->id))->toThrow(HttpException::class);
    expect($this->savings->fresh()->status)->toBe('active');
});

it('blocks cross-branch submission and approval', function () {
    expect(fn () => $this->controller->submit($this->savings->id))->toThrow(HttpException::class)
        ->and(fn () => $this->controller->approve($this->savings->id))->toThrow(HttpException::class)
        ->and(fn () => $this->controller->reject($this->request, $this->savings->id))->toThrow(HttpException::class);
});
