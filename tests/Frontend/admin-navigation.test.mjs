import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    activeNavigation,
    getAdminNavigation,
    getNavigationSections,
    navigationPath,
    pageAction,
} from '../../resources/js/lib/admin-navigation.ts';

const user = (role, overrides = {}) => ({
    id: 1,
    name: 'Test Staff',
    email: 'staff@example.test',
    role: { name: role },
    is_active: true,
    account_type: 'staff',
    ...overrides,
});
const links = (account) =>
    getAdminNavigation(account).flatMap((group) =>
        group.items.map((item) => item.href),
    );

test('personal super-admin financial modules have their own operational homes', () => {
    const groups = getAdminNavigation(user('super_admin'));
    for (const [href, module] of [
        ['/loan-ledger', 'loans'],
        ['/savings-ledger', 'savings'],
        ['/accounting', 'accounting'],
        ['/accounting/vouchers', 'accounting'],
        ['/accounting/journals', 'accounting'],
        ['/accounting/accounts', 'accounting-setup'],
        ['/accounting/periods', 'accounting-setup'],
        ['/accounting/reports', 'reports'],
    ]) {
        assert.equal(activeNavigation(groups, href)?.group.id, module);
    }
    assert.ok(links(user('super_admin')).includes('/users'));
    assert.ok(links(user('super_admin')).includes('/roles'));
});

test('sidebar sections separate daily work, supervision, reports and setup', () => {
    const groups = getAdminNavigation(user('super_admin'));
    const sections = getNavigationSections(groups);
    assert.deepEqual(
        sections.map((section) => section.id),
        ['daily', 'supervision', 'reports', 'setup'],
    );
    assert.deepEqual(
        sections[0].groups.map((group) => group.id),
        ['dashboard', 'members', 'loans', 'savings', 'accounting'],
    );
    assert.ok(sections.every((section) => section.groups.length));
    assert.ok(
        !sections
            .flatMap((section) => section.groups)
            .some((group) => group.id === 'account'),
    );
    for (const [path, group, section] of [
        ['/member-categories', 'organization', 'setup'],
        ['/submissions', 'imports', 'setup'],
        ['/accounting/accounts', 'accounting-setup', 'setup'],
        ['/head-office/cso-duty-roster', 'handovers', 'supervision'],
    ]) {
        const selected = activeNavigation(groups, path);
        assert.equal(selected?.group.id, group);
        assert.equal(selected?.group.section, section);
    }
    assert.equal(
        activeNavigation(
            getAdminNavigation(user('branch_manager')),
            '/cluster-handover',
        )?.group.id,
        'handovers',
    );
    assert.equal(
        activeNavigation(getAdminNavigation(user('branch_manager')), '/loan')
            ?.group.id,
        'imports',
    );
    assert.ok(
        groups.every(
            (group) =>
                group.title &&
                group.description &&
                group.englishTitle &&
                group.items.every((item) => item.title && item.englishTitle),
        ),
    );
});

test('organizational access flags never grant financial workspaces or role administration', () => {
    for (const role of [
        'head_office',
        'cso',
        'ed',
        'admf',
        'dmf',
        'area_manager',
        'zone_manager',
        'branch_manager',
        'branch_user',
        'field_officer',
        'unrecognized',
    ]) {
        const visible = links(user(role, { has_all_access: true }));
        for (const restricted of [
            '/accounting',
            '/accounting/vouchers',
            '/accounting/journals',
            '/accounting/accounts',
            '/accounting/periods',
            '/accounting/reports',
            '/loan-ledger',
            '/savings-ledger',
            '/loan-portfolio',
            '/roles',
        ]) {
            assert.ok(
                !visible.includes(restricted),
                `${role} must not see ${restricted}`,
            );
        }
    }
    for (const overrides of [
        { account_type: 'branch' },
        { is_active: false },
    ]) {
        const visible = links(user('super_admin', overrides));
        assert.ok(!visible.includes('/accounting'));
        assert.ok(!visible.includes('/users'));
        assert.ok(!visible.includes('/roles'));
    }
});

test('branch staff keep member workflows and only eligible reviewers see queues', () => {
    for (const role of ['branch_manager', 'branch_user', 'field_officer']) {
        const visible = links(user(role));
        assert.ok(visible.includes('/member-admissions'));
        assert.ok(visible.includes('/member/loan-applications'));
        assert.ok(visible.includes('/member/savings-applications'));
        assert.equal(visible.includes('/approvals'), role === 'branch_manager');
        assert.equal(
            visible.includes('/reports/approver-loan-approvals'),
            role === 'branch_manager',
        );
        assert.ok(!visible.includes('/head-office/loan-applications'));
        assert.ok(!visible.includes('/users'));
    }
    assert.ok(
        links(user('', { role: null, branch_id: 3 })).includes(
            '/member/loan-applications',
        ),
    );
});

test('approver, CSO and executive navigation preserves different responsibilities', () => {
    for (const role of ['admf', 'dmf', 'area_manager', 'zone_manager']) {
        const visible = links(user(role));
        assert.ok(visible.includes('/approvals'));
        assert.ok(visible.includes('/team-based-approvals/for-approver'));
        assert.ok(!visible.includes('/users'));
    }
    const cso = links(user('cso'));
    assert.ok(cso.includes('/verifications'));
    assert.ok(!cso.includes('/approvals'));
    assert.ok(!cso.includes('/loan-products'));
    const executive = links(user('ed'));
    assert.ok(executive.includes('/team-based-approvals/for-approver'));
    assert.ok(executive.includes('/head-office/team-based-approvals'));
    assert.ok(executive.includes('/organizations'));
});

test('only field officers with pending handover see the portfolio handover destination', () => {
    assert.ok(
        links(
            user('field_officer', { needs_portfolio_handover: true }),
        ).includes('/portfolio-handover'),
    );
    assert.ok(!links(user('field_officer')).includes('/portfolio-handover'));
    assert.ok(!links(user('super_admin')).includes('/portfolio-handover'));
});

test('longest route match distinguishes reports from their parent workspaces', () => {
    const groups = getAdminNavigation(user('super_admin'));
    assert.equal(
        activeNavigation(groups, '/accounting/reports')?.item.href,
        '/accounting/reports',
    );
    assert.equal(
        activeNavigation(groups, '/head-office/team-based-approvals/report')
            ?.group.id,
        'reports',
    );
    assert.equal(
        activeNavigation(groups, '/head-office/team-based-approvals/42/edit')
            ?.group.id,
        'approvals',
    );
    assert.equal(
        activeNavigation(
            groups,
            '/head-office/reports/approver-loan-approvals/print',
        )?.group.id,
        'reports',
    );
    assert.equal(activeNavigation(groups, '/accounting-other'), undefined);
});

test('aliases and URL normalization retain context on detail, edit and settings pages', () => {
    const groups = getAdminNavigation(user('super_admin'));
    const path = navigationPath(
        '/member/loan-applications/42/edit?tab=history#form',
    );
    const active = activeNavigation(groups, path);
    assert.equal(active?.group.id, 'loans');
    assert.equal(pageAction(path, active?.href), 'Edit');
    assert.equal(
        activeNavigation(groups, '/settings/profile')?.item.href,
        '/profile',
    );
    assert.equal(
        navigationPath('https://example.test/accounting/reports/?branch=2'),
        '/accounting/reports',
    );
    assert.equal(
        pageAction('/member-admissions/create', '/member-admissions'),
        'Create',
    );
});

test('navigation has no empty groups or duplicate destinations for any supported role', () => {
    for (const role of [
        'super_admin',
        'head_office',
        'cso',
        'ed',
        'admf',
        'dmf',
        'area_manager',
        'zone_manager',
        'branch_manager',
        'branch_user',
        'field_officer',
        'unrecognized',
    ]) {
        const groups = getAdminNavigation(user(role));
        const destinations = links(user(role));
        assert.ok(groups.every((group) => group.items.length));
        assert.equal(destinations.length, new Set(destinations).size, role);
        assert.ok(!destinations.includes('/settings/two-factor'));
        assert.ok(destinations.includes('/settings/password'));
    }
    assert.deepEqual(
        getAdminNavigation(user('unrecognized')).map((group) => group.id),
        ['dashboard', 'account'],
    );
});
