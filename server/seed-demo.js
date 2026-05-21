// Minimal demo seed — clients, matters, time entries, calendar events,
// trust account & balance. Idempotent: bails if any matters already exist.
//
// Run: node seed-demo.js  (uses the same DATABASE_URL as the server)

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/openfirehouse',
});

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT COUNT(*) FROM olf_matters');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Matters already exist — skipping demo seed.');
      return;
    }

    await client.query('BEGIN');

    // Get user IDs for the seed staff
    const staff = await client.query(
      "SELECT id, username FROM users WHERE username IN ('attorney','associate','paralegal')"
    );
    const userByName = Object.fromEntries(staff.rows.map((u) => [u.username, u.id]));

    // Practice area lookup
    const areas = await client.query('SELECT id, code FROM olf_practice_areas');
    const areaByCode = Object.fromEntries(areas.rows.map((a) => [a.code, a.id]));

    // Clients
    const c1 = await client.query(
      `INSERT INTO olf_clients (client_type, first_name, last_name, email, phone, state)
       VALUES ('individual','Maria','Sandoval','maria.sandoval@example.com','510-555-0142','CA')
       RETURNING id`
    );
    const c2 = await client.query(
      `INSERT INTO olf_clients (client_type, first_name, last_name, email, phone, state)
       VALUES ('individual','Raj','Patel','raj.patel@example.com','510-555-0177','CA')
       RETURNING id`
    );
    const c3 = await client.query(
      `INSERT INTO olf_clients (client_type, first_name, last_name, email, phone, state)
       VALUES ('individual','Linda','Garcia','linda.garcia@example.com','510-555-0119','CA')
       RETURNING id`
    );
    const c4 = await client.query(
      `INSERT INTO olf_clients (client_type, first_name, last_name, email, phone, state)
       VALUES ('individual','Sarah','Hartman','sarah.hartman@example.com','510-555-0188','CA')
       RETURNING id`
    );

    // Matters
    const m1 = await client.query(
      `INSERT INTO olf_matters
       (matter_number, client_id, title, practice_area_id, billing_type, billing_rate,
        responsible_attorney, statute_of_limitations, opposing_party, opposing_counsel)
       VALUES ('PI-2026-001', $1, 'Sandoval v. Acme Foods - Slip and Fall', $2, 'hourly', 350,
        $3, '2027-08-15', 'Acme Foods Inc.', 'Bell & Associates')
       RETURNING id`,
      [c1.rows[0].id, areaByCode.PI, userByName.attorney]
    );
    const m2 = await client.query(
      `INSERT INTO olf_matters
       (matter_number, client_id, title, practice_area_id, billing_type, billing_rate,
        responsible_attorney, opposing_party)
       VALUES ('PI-2026-002', $1, 'Patel v. Riverbend Transit - Auto Accident', $2, 'hourly', 350,
        $3, 'Riverbend Transit Co.')
       RETURNING id`,
      [c2.rows[0].id, areaByCode.PI, userByName.attorney]
    );
    const m3 = await client.query(
      `INSERT INTO olf_matters
       (matter_number, client_id, title, practice_area_id, billing_type, billing_rate,
        responsible_attorney)
       VALUES ('FAM-2026-001', $1, 'Garcia Dissolution', $2, 'hourly', 300, $3)
       RETURNING id`,
      [c3.rows[0].id, areaByCode.FAM, userByName.associate]
    );
    const m4 = await client.query(
      `INSERT INTO olf_matters
       (matter_number, client_id, title, practice_area_id, billing_type, billing_rate,
        responsible_attorney, statute_of_limitations)
       VALUES ('PI-2026-003', $1, 'Hartman v. Bayview Medical', $2, 'hourly', 350, $3, '2026-05-29')
       RETURNING id`,
      [c4.rows[0].id, areaByCode.PI, userByName.attorney]
    );

    // Billing rate for attorney + associate
    await client.query(
      `INSERT INTO olf_billing_rates (user_id, hourly_rate, effective_date)
       VALUES ($1, 350, CURRENT_DATE - INTERVAL '60 days'),
              ($2, 250, CURRENT_DATE - INTERVAL '60 days'),
              ($3, 150, CURRENT_DATE - INTERVAL '60 days')`,
      [userByName.attorney, userByName.associate, userByName.paralegal]
    );

    // Time entries — spread across the matters
    const timeRows = [
      [m1.rows[0].id, userByName.attorney, '2026-05-19', 0.2, 'L120', 'Telephone conference with client re settlement posture'],
      [m1.rows[0].id, userByName.attorney, '2026-05-19', 1.5, 'L210', 'Reviewed medical records, drafted demand outline'],
      [m1.rows[0].id, userByName.associate, '2026-05-18', 2.1, 'L110', 'Investigated incident location, photographed scene'],
      [m1.rows[0].id, userByName.paralegal, '2026-05-17', 0.8, 'L190', 'Organized medical records into chronological exhibit'],
      [m2.rows[0].id, userByName.attorney, '2026-05-19', 0.5, 'L120', 'Strategy call with co-counsel'],
      [m2.rows[0].id, userByName.associate, '2026-05-18', 3.2, 'L240', 'Drafted complaint, prepared exhibits'],
      [m3.rows[0].id, userByName.associate, '2026-05-19', 1.2, 'L240', 'Reviewed asset disclosures, prepared QDRO outline'],
      [m4.rows[0].id, userByName.attorney, '2026-05-19', 2.0, 'L240', 'Drafted motion for summary judgment'],
      [m4.rows[0].id, userByName.attorney, '2026-05-15', 0.3, 'L120', 'Conference re statute of limitations strategy'],
    ];
    for (const [matterId, userId, date, hours, code, desc] of timeRows) {
      await client.query(
        `INSERT INTO olf_time_entries
         (matter_id, user_id, entry_date, hours, rate, description, activity_code, billable, status)
         VALUES ($1, $2, $3, $4, 350, $5, $6, true, 'draft')`,
        [matterId, userId, date, hours, desc, code]
      );
    }

    // Calendar events — upcoming deadlines and hearings
    const events = [
      [m1.rows[0].id, userByName.attorney, 'Sandoval: Motion for Summary Judgment due', 'filing_deadline', '2026-05-25 17:00', false],
      [m2.rows[0].id, userByName.attorney, 'Patel discovery responses due', 'filing_deadline', '2026-05-27 17:00', false],
      [m3.rows[0].id, userByName.associate, 'Garcia mediation', 'hearing', '2026-05-28 10:00', true],
      [m4.rows[0].id, userByName.attorney, 'Hartman v. Bayview - Statute of limitations', 'statute_of_limitations', '2026-05-29 17:00', false],
      [m2.rows[0].id, userByName.attorney, 'Patel - Case management conference', 'hearing', '2026-06-08 09:30', true],
    ];
    for (const [matterId, userId, title, type, startTime, isCourt] of events) {
      await client.query(
        `INSERT INTO olf_calendar_events
         (matter_id, user_id, title, event_type, start_time, is_court_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [matterId, userId, title, type, startTime, isCourt]
      );
    }

    // Trust account
    const trust = await client.query(
      `INSERT INTO olf_trust_accounts (account_name, bank_name, account_number_last4, balance, status)
       VALUES ('Walsh Law IOLTA Operating', 'First California Bank', '4521', 52100.00, 'active')
       RETURNING id`
    );
    const trustId = trust.rows[0].id;

    // Trust deposits per client + matter
    const trustEntries = [
      [c1.rows[0].id, m1.rows[0].id, 15000, 'Sandoval initial retainer'],
      [c2.rows[0].id, m2.rows[0].id, 10000, 'Patel initial retainer'],
      [c3.rows[0].id, m3.rows[0].id, 7500, 'Garcia retainer'],
      [c4.rows[0].id, m4.rows[0].id, 15000, 'Hartman retainer'],
    ];
    let runningBalance = 0;
    for (const [clientId, matterId, amount, desc] of trustEntries) {
      runningBalance += amount;
      await client.query(
        `INSERT INTO olf_trust_transactions
         (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, transaction_date, created_by)
         VALUES ($1, $2, $3, 'deposit', $4, $5, $6, CURRENT_DATE - INTERVAL '15 days', $7)`,
        [trustId, clientId, matterId, amount, runningBalance, desc, userByName.attorney]
      );
      await client.query(
        `INSERT INTO olf_client_trust_ledger (trust_account_id, client_id, matter_id, balance)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (trust_account_id, client_id, matter_id)
         DO UPDATE SET balance = olf_client_trust_ledger.balance + $4`,
        [trustId, clientId, matterId, amount]
      );
    }
    // Apply small disbursement from Sandoval
    runningBalance -= 1750;
    await client.query(
      `INSERT INTO olf_trust_transactions
       (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, transaction_date, created_by)
       VALUES ($1, $2, $3, 'disbursement', $4, $5, 'Court filing fees', CURRENT_DATE - INTERVAL '3 days', $6)`,
      [trustId, c1.rows[0].id, m1.rows[0].id, 1750, runningBalance, userByName.attorney]
    );
    await client.query(
      `UPDATE olf_client_trust_ledger SET balance = balance - 1750
       WHERE trust_account_id = $1 AND client_id = $2 AND matter_id = $3`,
      [trustId, c1.rows[0].id, m1.rows[0].id]
    );
    await client.query(
      `UPDATE olf_trust_accounts SET balance = $1 WHERE id = $2`,
      [runningBalance, trustId]
    );

    await client.query('COMMIT');

    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM olf_clients) AS clients,
        (SELECT COUNT(*) FROM olf_matters) AS matters,
        (SELECT COUNT(*) FROM olf_time_entries) AS time_entries,
        (SELECT COUNT(*) FROM olf_calendar_events) AS events,
        (SELECT COUNT(*) FROM olf_trust_transactions) AS trust_txns
    `);
    console.log('Seed complete:', counts.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
