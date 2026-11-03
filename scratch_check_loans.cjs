const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'mis-loan'
    });

    const [loans] = await conn.query(`
        SELECT id, application_no, status, requested_amount, approved_amount, submitted_at, created_at, branch_id
        FROM loan_applications
        ORDER BY id DESC
        LIMIT 20
    `);
    console.log("Total loans sampled: ", loans.length);
    console.table(loans);

    const [stats] = await conn.query(`
        SELECT status, count(*) as count, min(requested_amount) as min_req, max(requested_amount) as max_req
        FROM loan_applications
        GROUP BY status
    `);
    console.table(stats);

    const [minMaxDates] = await conn.query(`
        SELECT MIN(submitted_at), MAX(submitted_at), MIN(created_at), MAX(created_at) FROM loan_applications
    `);
    console.log("Dates in loan_applications:", minMaxDates);

    await conn.end();
}

check();
