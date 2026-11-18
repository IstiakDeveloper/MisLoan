const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the production helper without adding another frontend test runner.
const compiled = ts.transpileModule(
    readFileSync(
        resolve(__dirname, '../../resources/js/utils/cycleAdmissionDraft.ts'),
        'utf8',
    ),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    },
).outputText;
const helper = { exports: {} };
new Function('exports', compiled)(helper.exports);
const { restoreCycleAdmissionDraft, cycleAdmissionEdits } = helper.exports;
const fields = [
    'revision',
    'mobile_number',
    'monthly_income',
    'family_members',
    'customer_photo',
];
const initial = {
    id: 30,
    revision: 5,
    application_no: '1',
    nid_number: '1234567890',
    branch_id: 1,
    mobile_number: '01711111111',
    monthly_income: 10000,
    customer_photo: 'cycles/30/photo.jpg',
    customer_photo_path: 'cycles/30/photo.jpg',
};

test('restores editable values while identity and server-owned document paths remain authoritative', () => {
    const restored = restoreCycleAdmissionDraft(
        initial,
        {
            ...initial,
            nid_number: 'wrong',
            application_no: 'wrong',
            branch_id: 99,
            mobile_number: '01833333333',
            monthly_income: 0,
            family_members: [],
            customer_photo: 'another/member/photo.jpg',
            customer_photo_path: 'another/member/photo.jpg',
        },
        fields,
        ['customer_photo'],
    );
    assert.equal(restored.nid_number, initial.nid_number);
    assert.equal(restored.application_no, initial.application_no);
    assert.equal(restored.branch_id, 1);
    assert.equal(restored.customer_photo, initial.customer_photo);
    assert.equal(restored.customer_photo_path, initial.customer_photo_path);
    assert.equal(restored.mobile_number, '01833333333');
    assert.equal(restored.monthly_income, 0);
    assert.deepEqual(restored.family_members, []);
});

test('ignores stale revisions, another admission, and malformed cache values', () => {
    for (const cached of [
        null,
        [],
        'bad JSON value',
        { ...initial, revision: 4 },
        { ...initial, id: 31 },
    ]) {
        assert.deepEqual(
            restoreCycleAdmissionDraft(initial, cached, fields, []),
            initial,
        );
    }
});

test('preserves explicit document removal but retains server documents for omitted uploads', () => {
    assert.equal(
        restoreCycleAdmissionDraft(
            initial,
            { ...initial, customer_photo: null },
            fields,
            ['customer_photo'],
        ).customer_photo,
        null,
    );
    assert.equal(
        restoreCycleAdmissionDraft(initial, { id: 30, revision: 5 }, fields, [
            'customer_photo',
        ]).customer_photo,
        initial.customer_photo,
    );
});

test('submits only fields accepted by the Cycle Hub request', () => {
    const payload = cycleAdmissionEdits(
        { ...initial, status: 'approved', monthly_income: 0 },
        fields,
    );
    assert.deepEqual(payload, {
        revision: 5,
        mobile_number: initial.mobile_number,
        monthly_income: 0,
        customer_photo: initial.customer_photo,
    });
    assert.ok(!('nid_number' in payload));
    assert.ok(!('application_no' in payload));
    assert.ok(!('id' in payload));
});
