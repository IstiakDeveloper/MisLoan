<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        if (! $app->environment('testing') || $app->configurationIsCached()) {
            throw new RuntimeException('Tests require the testing environment and uncached configuration.');
        }

        $config = $app['config'];
        $config->set('database.default', 'sqlite');
        $config->set('database.connections.sqlite.url', null);
        $config->set('database.connections.sqlite.database', ':memory:');
        $config->set('filesystems.default', 'local');
        $config->set('filesystems.disks.local.root', storage_path('framework/testing/local'));
        $config->set('filesystems.disks.public.root', storage_path('framework/testing/public'));

        if (isset($this->traitsUsedByTest[RefreshDatabase::class])) {
            $port = filter_var(getenv('MISLOAN_TEST_MYSQL_PORT'), FILTER_VALIDATE_INT, [
                'options' => ['min_range' => 1, 'max_range' => 65535],
            ]);
            $password = getenv('MISLOAN_TEST_MYSQL_PASSWORD');
            if ($port === false || $password === false || $password === '') {
                throw new RuntimeException('Feature tests require MISLOAN_TEST_MYSQL_PORT and MISLOAN_TEST_MYSQL_PASSWORD for a disposable local MySQL instance.');
            }

            $config->set('database.default', 'mysql');
            $config->set('database.connections.mysql', array_replace($config->get('database.connections.mysql'), [
                'url' => null,
                'host' => '127.0.0.1',
                'port' => $port,
                'database' => 'misloan_test',
                'username' => 'misloan_test',
                'password' => $password,
                'unix_socket' => '',
                'options' => [],
            ]));
        }

        return $app;
    }
}
