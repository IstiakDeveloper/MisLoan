<?php

it('redirects guests to the sign-in page', function () {
    $response = $this->get('/');

    $response->assertRedirect(route('login'));
});
