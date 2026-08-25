<?php

use App\Http\Middleware\EnsurePortfolioHandoverComplete;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Route;

it('does not lock branch staff who are not field officers', function () {
    $user = new User;
    $user->branch_id = 2;
    $user->setRelation('role', new Role(['name' => Role::BRANCH_USER]));

    expect($user->needsPortfolioHandover())->toBeFalse();
});

it('locks a field officer when members remain at the previous branch', function () {
    $pending = Mockery::mock();
    $pending->shouldReceive('exists')->once()->andReturn(true);

    $user = Mockery::mock(User::class)->makePartial();
    $user->setRelation('role', new Role(['name' => Role::FIELD_OFFICER]));
    $user->shouldReceive('pendingPortfolioHandoverMembers')->once()->andReturn($pending);

    expect($user->needsPortfolioHandover())->toBeTrue();
});

it('does not lock a field officer after old-branch members are assigned away', function () {
    $pending = Mockery::mock();
    $pending->shouldReceive('exists')->once()->andReturn(false);

    $user = Mockery::mock(User::class)->makePartial();
    $user->setRelation('role', new Role(['name' => Role::FIELD_OFFICER]));
    $user->shouldReceive('pendingPortfolioHandoverMembers')->once()->andReturn($pending);

    expect($user->needsPortfolioHandover())->toBeFalse();
});

it('redirects a locked officer to the handover screen', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->shouldReceive('needsPortfolioHandover')->once()->andReturn(true);

    $request = Request::create('/dashboard', 'GET');
    $request->setUserResolver(fn () => $user);
    $route = new Route(['GET'], 'dashboard', fn () => 'ok');
    $route->name('dashboard');
    $request->setRouteResolver(fn () => $route);

    $response = (new EnsurePortfolioHandoverComplete)->handle(
        $request,
        fn () => new Response('ok'),
    );

    expect($response->isRedirect())->toBeTrue()
        ->and($response->headers->get('Location'))->toBe(route('portfolio-handover.index'));
});

it('lets a locked officer open the handover screen', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->shouldReceive('needsPortfolioHandover')->never();

    $request = Request::create('/portfolio-handover', 'GET');
    $request->setUserResolver(fn () => $user);
    $route = new Route(['GET'], 'portfolio-handover', fn () => 'ok');
    $route->name('portfolio-handover.index');
    $request->setRouteResolver(fn () => $route);

    $response = (new EnsurePortfolioHandoverComplete)->handle(
        $request,
        fn () => new Response('handover'),
    );

    expect($response->getContent())->toBe('handover');
});
