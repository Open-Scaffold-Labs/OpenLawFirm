// Sprint 4 — realistic demo seed for OpenLawFirm.
//
// Wipes existing demo matters/clients/time entries/calendar/trust data
// (but preserves users + practice areas + UTBMS code lookups) and creates
// a richer demo dataset:
//   - 10 matters across PI, family, employment, real estate, criminal
//   - 50+ time entries across 4 attorneys, spread over the last 30 days
//   - 1 IOLTA account with balances on every active matter
//   - 18 calendar events (deadlines + hearings) in the next 30 days
//   - 12 documents distributed across matters
//   - 5 invoices in various states (sent, paid, overdue)
//
// Safe to run multiple times — truncates the matter-derived tables first.
//
// Usage:
//   node --env-file=.env seed-realistic.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/openfirehouse',
});

// Helper: random date in the past N days
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Wipe matter-derived data (preserve users, practice_areas, codes)
    await client.query(`
      TRUNCATE
        olf_invoice_line_items, olf_invoices, olf_payments,
        olf_time_entries, olf_expenses,
        olf_trust_transactions, olf_client_trust_ledger, olf_trust_accounts,
        olf_calendar_events, olf_documents, olf_contacts,
        olf_matters, olf_clients,
        olf_audit_log, olf_notifications,
        olf_matter_rates, olf_billing_rates
      RESTART IDENTITY CASCADE
    `);

    // 2. Get user IDs
    const staff = await client.query(
      "SELECT id, username FROM users WHERE username IN ('attorney','associate','paralegal')"
    );
    if (staff.rows.length < 3) {
      throw new Error('Demo users not found — run OpenLawFirm server once to seed them first');
    }
    const U = Object.fromEntries(staff.rows.map((u) => [u.username, u.id]));

    // 3. Billing rates
    await client.query(
      `INSERT INTO olf_billing_rates (user_id, hourly_rate, effective_date)
       VALUES ($1, 350, $4), ($2, 250, $4), ($3, 150, $4)`,
      [U.attorney, U.associate, U.paralegal, daysAgo(60)]
    );

    // 4. Practice area lookup
    const areas = await client.query('SELECT id, code FROM olf_practice_areas');
    const A = Object.fromEntries(areas.rows.map((a) => [a.code, a.id]));

    // 5. Clients
    const clientSeeds = [
      ['individual', 'Maria', 'Sandoval', null, 'maria.sandoval@example.com', '510-555-0142', 'CA'],
      ['individual', 'Raj', 'Patel', null, 'raj.patel@example.com', '510-555-0177', 'CA'],
      ['individual', 'Linda', 'Garcia', null, 'linda.garcia@example.com', '510-555-0119', 'CA'],
      ['individual', 'Sarah', 'Hartman', null, 'sarah.hartman@example.com', '510-555-0188', 'CA'],
      ['individual', 'James', 'O\'Brien', null, 'james.obrien@example.com', '510-555-0203', 'CA'],
      ['individual', 'Priya', 'Iyer', null, 'priya.iyer@example.com', '510-555-0214', 'CA'],
      ['company', null, null, 'Greenfield Properties LLC', 'info@greenfieldprop.com', '510-555-0301', 'CA'],
      ['individual', 'Marcus', 'Reyes', null, 'marcus.reyes@example.com', '510-555-0188', 'CA'],
      ['individual', 'Helena', 'Vasquez', null, 'helena.v@example.com', '510-555-0245', 'CA'],
      ['individual', 'Thomas', 'Kim', null, 'tkim@example.com', '510-555-0291', 'CA'],
    ];
    const C = [];
    for (const [ct, fn, ln, co, em, ph, st] of clientSeeds) {
      const r = await client.query(
        `INSERT INTO olf_clients (client_type, first_name, last_name, company_name, email, phone, state, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8) RETURNING id`,
        [ct, fn, ln, co, em, ph, st, daysAgo(45)]
      );
      C.push(r.rows[0].id);
    }

    // 6. Matters — 10 across practice areas
    const matterSeeds = [
      // [num, clientIdx, title, practice, attorney, openedDaysAgo, statuteDaysAhead, opposing, counsel, notes]
      ['PI-2026-001', 0, 'Sandoval v. Acme Foods — Slip and Fall', A.PI, U.attorney, 90, 730, 'Acme Foods Inc.', 'Bell & Associates', 'High-value PI matter; client has substantial medical specials.'],
      ['PI-2026-002', 1, 'Patel v. Riverbend Transit — Auto Accident', A.PI, U.attorney, 60, 540, 'Riverbend Transit Co.', 'Murphy Defense Group', 'Soft-tissue case; treating physician deposition pending.'],
      ['FAM-2026-001', 2, 'Garcia Dissolution', A.FAM, U.associate, 75, null, 'Roberto Garcia', 'self-represented', 'Contested custody. Mediation scheduled.'],
      ['PI-2026-003', 3, 'Hartman v. Bayview Medical', A.PI, U.attorney, 21, 9, 'Bayview Medical Center', 'Stoddard Healthcare Defense', 'Statute runs in 9 days — file complaint this week.'],
      ['EMP-2026-001', 4, 'O\'Brien v. TechCo — Wrongful Termination', A.PI, U.attorney, 50, 365, 'TechCo Inc.', 'BigLaw LLP', 'Wage-and-hour claim; class certification pending.'],
      ['EST-2026-001', 5, 'Iyer Estate Plan', A.EST, U.associate, 25, null, null, null, 'Comprehensive plan; revocable trust + advance directives.'],
      ['CRIM-2026-001', 7, 'People v. Reyes — DUI', A.CRIM, U.attorney, 14, null, 'People of the State of California', 'Alameda County DA', 'First-offense DUI; DMV hearing on calendar.'],
      ['FAM-2026-002', 8, 'Vasquez Adoption', A.FAM, U.associate, 35, null, null, null, 'Step-parent adoption; biological father consent obtained.'],
      ['PI-2026-004', 9, 'Kim v. CityScape Construction', A.PI, U.attorney, 110, 620, 'CityScape Construction', 'Hammond Defense', 'Construction site injury. Workers comp lien outstanding.'],
      ['PI-2026-005', 6, 'Greenfield Properties — Commercial Lease Dispute', A.PI, U.associate, 18, 1095, 'TenantCo LLC', 'Bell & Associates', 'Lease enforcement and damages; settlement conference next month.'],
    ];
    const M = [];
    for (let i = 0; i < matterSeeds.length; i++) {
      const [num, ci, title, paid, atty, opened, statute, op, oc, notes] = matterSeeds[i];
      const r = await client.query(
        `INSERT INTO olf_matters
         (matter_number, client_id, title, practice_area_id, billing_type, billing_rate,
          responsible_attorney, date_opened, statute_of_limitations,
          opposing_party, opposing_counsel, notes, status)
         VALUES ($1, $2, $3, $4, 'hourly', 350, $5, $6, $7, $8, $9, $10, 'open')
         RETURNING id`,
        [num, C[ci], title, paid, atty, daysAgo(opened),
         statute != null ? new Date(Date.now() + statute * 86400000).toISOString().slice(0, 10) : null,
         op, oc, notes]
      );
      M.push(r.rows[0].id);
    }

    // 7. Time entries — ~55 spread over the last 30 days
    // UTBMS activity codes (L-codes) and task codes paired by typical
    // litigation work-product so each generated time entry has both.
    const codes = ['L110', 'L120', 'L160', 'L190', 'L210', 'L240', 'L250', 'L310'];
    const taskByActivity = {
      L110: 'L100', // Fact Investigation/Development → Case Assessment
      L120: 'L100', // Analysis/Strategy → Case Assessment
      L160: 'L100', // Settlement/Non-Binding ADR → Case Assessment
      L190: 'L100', // Other Case Assessment activities → Case Assessment
      L210: 'L200', // Pleadings → Pre-Trial Pleadings & Motions
      L240: 'L200', // Dispositive Motions → Pre-Trial Pleadings & Motions
      L250: 'L300', // Other Written Motions → Discovery (best fit fallback)
      L310: 'L300', // Written Discovery → Discovery
    };
    const narratives = [
      'Telephone conference with client',
      'Reviewed and analyzed medical records',
      'Drafted demand letter outline',
      'Investigated incident location, took photographs',
      'Researched precedent on liability theory',
      'Prepared discovery requests',
      'Drafted motion for summary judgment',
      'Reviewed deposition transcript',
      'Strategy meeting with co-counsel',
      'Prepared client for deposition',
      'Reviewed settlement offer; drafted response',
      'Court appearance — case management conference',
      'Email correspondence with opposing counsel',
      'Drafted trial brief',
      'Reviewed expert witness report',
      'Mediation preparation',
      'Reviewed bills and prepared statement of damages',
      'Researched and drafted memorandum',
    ];
    let timeRowCount = 0;
    for (let day = 0; day < 30; day++) {
      // 1-3 entries per day
      const entriesToday = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < entriesToday; i++) {
        const matterId = M[Math.floor(Math.random() * M.length)];
        const userId = [U.attorney, U.attorney, U.attorney, U.associate, U.associate, U.paralegal][Math.floor(Math.random() * 6)];
        const hours = Math.round((0.2 + Math.random() * 3.0) * 10) / 10;
        const code = codes[Math.floor(Math.random() * codes.length)];
        const narrative = narratives[Math.floor(Math.random() * narratives.length)];
        const rate = userId === U.attorney ? 350 : userId === U.associate ? 250 : 150;
        await client.query(
          `INSERT INTO olf_time_entries
           (matter_id, user_id, entry_date, hours, rate, description, activity_code, task_code, billable, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)`,
          [matterId, userId, daysAgo(day), hours, rate, narrative, code, taskByActivity[code],
           day < 7 ? 'draft' : day < 20 ? 'approved' : 'billed']
        );
        timeRowCount++;
      }
    }

    // 8. IOLTA trust account
    const trust = await client.query(
      `INSERT INTO olf_trust_accounts (account_name, bank_name, account_number, balance, status, created_at)
       VALUES ('Walsh Law IOLTA Operating', 'First California Bank', 'xxxx4521', 0, 'active', $1) RETURNING id`,
      [daysAgo(180)]
    );
    const trustId = trust.rows[0].id;

    // 9. Trust deposits + occasional disbursements
    const retainerAmounts = [15000, 10000, 7500, 15000, 12500, 8000, 5000, 6500, 11000, 9000];
    let runningBalance = 0;
    for (let i = 0; i < M.length; i++) {
      runningBalance += retainerAmounts[i];
      await client.query(
        `INSERT INTO olf_trust_transactions
         (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, transaction_date, created_by)
         VALUES ($1, $2, $3, 'deposit', $4, $5, $6, $7, $8)`,
        [trustId, C[matterSeeds[i][1]], M[i], retainerAmounts[i], runningBalance,
         `${matterSeeds[i][0]} initial retainer`, daysAgo(40 - i * 2), U.attorney]
      );
      await client.query(
        `INSERT INTO olf_client_trust_ledger (trust_account_id, client_id, matter_id, balance)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (trust_account_id, client_id, matter_id)
         DO UPDATE SET balance = olf_client_trust_ledger.balance + EXCLUDED.balance`,
        [trustId, C[matterSeeds[i][1]], M[i], retainerAmounts[i]]
      );
    }

    // A few disbursements (filing fees, expert witness retainer)
    const disbursements = [
      [0, 1750, 'Court filing fees', 7],
      [3, 3500, 'Expert witness retainer', 14],
      [4, 850, 'Deposition transcript', 5],
      [6, 1200, 'DMV hearing filing fee', 10],
    ];
    for (const [mIdx, amount, desc, daysBack] of disbursements) {
      runningBalance -= amount;
      await client.query(
        `INSERT INTO olf_trust_transactions
         (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, transaction_date, created_by)
         VALUES ($1, $2, $3, 'disbursement', $4, $5, $6, $7, $8)`,
        [trustId, C[matterSeeds[mIdx][1]], M[mIdx], amount, runningBalance, desc, daysAgo(daysBack), U.attorney]
      );
      await client.query(
        `UPDATE olf_client_trust_ledger SET balance = balance - $1
         WHERE trust_account_id = $2 AND client_id = $3 AND matter_id = $4`,
        [amount, trustId, C[matterSeeds[mIdx][1]], M[mIdx]]
      );
    }

    await client.query(`UPDATE olf_trust_accounts SET balance = $1 WHERE id = $2`, [runningBalance, trustId]);

    // 10. Calendar events — 18 in the next 30 days
    const events = [
      [0, U.attorney, 'Sandoval: Defense expert deposition', 'meeting', 2, '10:00', false],
      [3, U.attorney, 'Hartman v. Bayview — Statute of Limitations expires', 'statute_of_limitations', 9, '17:00', false],
      [3, U.attorney, 'Hartman: File complaint deadline', 'filing_deadline', 7, '17:00', false],
      [1, U.attorney, 'Patel discovery responses due', 'filing_deadline', 5, '17:00', false],
      [2, U.associate, 'Garcia mediation', 'hearing', 9, '10:00', true],
      [6, U.attorney, 'Reyes DMV hearing', 'hearing', 4, '14:30', true],
      [4, U.attorney, 'O\'Brien class cert motion hearing', 'hearing', 12, '09:00', true],
      [1, U.attorney, 'Patel: Case management conference', 'hearing', 18, '09:30', true],
      [0, U.attorney, 'Sandoval: Demand letter delivery deadline', 'filing_deadline', 14, '17:00', false],
      [9, U.associate, 'Greenfield settlement conference', 'hearing', 22, '13:00', true],
      [7, U.associate, 'Vasquez adoption hearing', 'hearing', 16, '11:00', true],
      [5, U.associate, 'Iyer estate plan execution meeting', 'meeting', 3, '14:00', false],
      [6, U.attorney, 'Reyes: Arraignment', 'hearing', 24, '08:30', true],
      [8, U.attorney, 'Kim: Workers comp lien negotiation call', 'meeting', 7, '11:00', false],
      [9, U.associate, 'Greenfield: Mediation brief due', 'filing_deadline', 17, '17:00', false],
      [2, U.associate, 'Garcia: Asset disclosure due', 'filing_deadline', 5, '17:00', false],
      [0, U.attorney, 'Sandoval: Mediation', 'hearing', 28, '09:00', true],
      [4, U.attorney, 'O\'Brien: Deposition prep with client', 'meeting', 6, '15:00', false],
    ];
    for (const [mi, ui, title, type, dahead, time, courtDate] of events) {
      const eventDate = daysAhead(dahead);
      const [h, m] = time.split(':').map(Number);
      eventDate.setHours(h, m, 0, 0);
      await client.query(
        `INSERT INTO olf_calendar_events
         (matter_id, user_id, title, event_type, start_time, is_court_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')`,
        [M[mi], ui, title, type, eventDate.toISOString(), courtDate]
      );
    }

    // 11. Documents — 12 distributed across matters
    const docSeeds = [
      [0, 'Sandoval_Medical_Records_Combined.pdf', 'medical_record', 'Complete medical records from St. Mary\'s and follow-up providers'],
      [0, 'Sandoval_Incident_Photos.zip', 'evidence', 'Photographs of incident location'],
      [0, 'Sandoval_Demand_Letter_DRAFT_v2.docx', 'correspondence', 'Working draft of settlement demand'],
      [1, 'Patel_Police_Report.pdf', 'pleading', 'Initial police report from CHP'],
      [1, 'Patel_Insurance_Correspondence.pdf', 'correspondence', 'Initial correspondence with carrier'],
      [3, 'Hartman_Bayview_Medical_Records.pdf', 'medical_record', 'Hospital records subpoenaed'],
      [3, 'Hartman_Complaint_DRAFT.docx', 'pleading', 'Draft complaint — file before 5/29'],
      [4, 'OBrien_Employment_Agreement.pdf', 'contract', 'Original employment agreement and amendments'],
      [4, 'OBrien_Class_Cert_Motion.docx', 'pleading', 'Motion for class certification'],
      [2, 'Garcia_Asset_Disclosure.pdf', 'pleading', 'Form FL-160 asset and debt disclosure'],
      [5, 'Iyer_Revocable_Trust_DRAFT.docx', 'contract', 'Working draft of revocable living trust'],
      [9, 'Greenfield_Lease_Original.pdf', 'contract', 'Original commercial lease at issue'],
    ];
    for (const [mi, filename, dtype, desc] of docSeeds) {
      await client.query(
        `INSERT INTO olf_documents (matter_id, file_name, doc_category, description, uploaded_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [M[mi], filename, dtype, desc, U.paralegal, daysAgo(Math.floor(Math.random() * 25) + 1)]
      );
    }

    // 12. Invoices — 5 in various states
    const invoiceSeeds = [
      // [matterIdx, invDate, dueDate, total, status, paymentsApplied]
      [0, daysAgo(45), daysAgo(15), 8400, 'sent', 0],         // outstanding, not yet overdue
      [1, daysAgo(60), daysAgo(30), 5200, 'partial', 2500],   // partial pay
      [2, daysAgo(90), daysAgo(60), 3800, 'overdue', 0],      // overdue 60+ days
      [4, daysAgo(20), daysAgo(-10), 12500, 'sent', 0],       // due in 10 days
      [8, daysAgo(120), daysAgo(90), 6700, 'paid', 6700],     // fully paid
    ];
    for (let i = 0; i < invoiceSeeds.length; i++) {
      const [mi, invDate, dueDate, total, status, paid] = invoiceSeeds[i];
      const balance = total - paid;
      const matterId = M[mi];
      const clientId = C[matterSeeds[mi][1]];
      const inv = await client.query(
        `INSERT INTO olf_invoices
         (invoice_number, matter_id, client_id, status, invoice_date, due_date,
          subtotal_fees, subtotal_expenses, total_amount, balance_due)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $7, $8) RETURNING id`,
        [`INV-${String(i + 1).padStart(5, '0')}`, matterId, clientId, status, invDate, dueDate, total, balance]
      );
      if (paid > 0) {
        await client.query(
          `INSERT INTO olf_payments (invoice_id, amount, payment_date, payment_method)
           VALUES ($1, $2, $3, 'check')`,
          [inv.rows[0].id, paid, daysAgo(Math.floor(Math.random() * 30))]
        );
      }
    }

    await client.query('COMMIT');

    // 13. Report
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM olf_clients)            AS clients,
        (SELECT COUNT(*) FROM olf_matters)            AS matters,
        (SELECT COUNT(*) FROM olf_time_entries)       AS time_entries,
        (SELECT ROUND(SUM(hours)::numeric, 1) FROM olf_time_entries) AS total_hours,
        (SELECT COUNT(*) FROM olf_calendar_events)    AS events,
        (SELECT COUNT(*) FROM olf_documents)          AS documents,
        (SELECT COUNT(*) FROM olf_trust_transactions) AS trust_txns,
        (SELECT balance FROM olf_trust_accounts LIMIT 1) AS trust_balance,
        (SELECT COUNT(*) FROM olf_invoices)           AS invoices,
        (SELECT ROUND(SUM(balance_due)::numeric, 2) FROM olf_invoices) AS ar_balance
    `);
    console.log('\nRealistic seed complete:');
    console.log(counts.rows[0]);
    console.log(`\n${timeRowCount} time entries created.\n`);
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
