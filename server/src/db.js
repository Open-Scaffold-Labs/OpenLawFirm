const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/openfirehouse',
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`

      /* ── Clients ────────────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_clients (
        id SERIAL PRIMARY KEY,
        client_type VARCHAR(20) NOT NULL DEFAULT 'individual',
        first_name VARCHAR(80),
        last_name VARCHAR(80),
        company_name VARCHAR(200),
        email VARCHAR(150),
        phone VARCHAR(30),
        address TEXT,
        city VARCHAR(80),
        state VARCHAR(2),
        zip VARCHAR(10),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Practice areas ─────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_practice_areas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );

      /* ── Matters ────────────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_matters (
        id SERIAL PRIMARY KEY,
        matter_number VARCHAR(50) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES olf_clients(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        practice_area_id INTEGER REFERENCES olf_practice_areas(id),
        status VARCHAR(30) DEFAULT 'open',
        billing_type VARCHAR(30) DEFAULT 'hourly',
        billing_rate NUMERIC(10,2),
        flat_fee_amount NUMERIC(12,2),
        responsible_attorney INTEGER REFERENCES users(id),
        originating_attorney INTEGER REFERENCES users(id),
        date_opened DATE DEFAULT CURRENT_DATE,
        date_closed DATE,
        statute_of_limitations DATE,
        court_name VARCHAR(200),
        case_number VARCHAR(100),
        opposing_party VARCHAR(200),
        opposing_counsel VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Time entries (6-minute increments) ─────────────── */
      CREATE TABLE IF NOT EXISTS olf_time_entries (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER REFERENCES olf_matters(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
        hours NUMERIC(6,2) NOT NULL,
        rate NUMERIC(10,2) NOT NULL,
        description TEXT NOT NULL,
        activity_code VARCHAR(20),
        task_code VARCHAR(20),
        billable BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'draft',
        billed_on_invoice_id INTEGER,
        timer_start TIMESTAMP,
        timer_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Expense entries ────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_expenses (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER REFERENCES olf_matters(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount NUMERIC(12,2) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50),
        billable BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'pending',
        receipt_file VARCHAR(255),
        billed_on_invoice_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── UTBMS Activity & Task codes ────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_activity_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(200) NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS olf_task_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(200) NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT TRUE
      );

      /* ── Invoices ───────────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        matter_id INTEGER REFERENCES olf_matters(id),
        client_id INTEGER REFERENCES olf_clients(id),
        status VARCHAR(20) DEFAULT 'draft',
        invoice_date DATE DEFAULT CURRENT_DATE,
        due_date DATE,
        subtotal_fees NUMERIC(12,2) DEFAULT 0,
        subtotal_expenses NUMERIC(12,2) DEFAULT 0,
        tax_amount NUMERIC(12,2) DEFAULT 0,
        total_amount NUMERIC(12,2) DEFAULT 0,
        amount_paid NUMERIC(12,2) DEFAULT 0,
        balance_due NUMERIC(12,2) DEFAULT 0,
        ledes_format BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS olf_invoice_line_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES olf_invoices(id) ON DELETE CASCADE,
        line_type VARCHAR(20) NOT NULL DEFAULT 'fee',
        time_entry_id INTEGER REFERENCES olf_time_entries(id),
        expense_id INTEGER REFERENCES olf_expenses(id),
        description TEXT NOT NULL,
        quantity NUMERIC(8,2) DEFAULT 1,
        rate NUMERIC(10,2),
        amount NUMERIC(12,2) NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      /* ── Trust / IOLTA accounts ─────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_trust_accounts (
        id SERIAL PRIMARY KEY,
        account_name VARCHAR(200) NOT NULL,
        account_number VARCHAR(50),
        bank_name VARCHAR(200),
        balance NUMERIC(14,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS olf_trust_transactions (
        id SERIAL PRIMARY KEY,
        trust_account_id INTEGER REFERENCES olf_trust_accounts(id),
        client_id INTEGER REFERENCES olf_clients(id),
        matter_id INTEGER REFERENCES olf_matters(id),
        transaction_type VARCHAR(20) NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        running_balance NUMERIC(14,2),
        description TEXT,
        check_number VARCHAR(30),
        reference_number VARCHAR(50),
        transaction_date DATE DEFAULT CURRENT_DATE,
        reconciled BOOLEAN DEFAULT FALSE,
        reconciled_date DATE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Client trust ledger (per-client sub-balances) ──── */
      CREATE TABLE IF NOT EXISTS olf_client_trust_ledger (
        id SERIAL PRIMARY KEY,
        trust_account_id INTEGER REFERENCES olf_trust_accounts(id),
        client_id INTEGER REFERENCES olf_clients(id),
        matter_id INTEGER REFERENCES olf_matters(id),
        balance NUMERIC(14,2) DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(trust_account_id, client_id, matter_id)
      );

      /* ── Documents ──────────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_documents (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER REFERENCES olf_matters(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        file_size INTEGER,
        doc_category VARCHAR(50) DEFAULT 'general',
        description TEXT,
        uploaded_by INTEGER REFERENCES users(id),
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Calendar / Deadlines ───────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_calendar_events (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER REFERENCES olf_matters(id),
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        event_type VARCHAR(30) DEFAULT 'deadline',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        all_day BOOLEAN DEFAULT FALSE,
        location VARCHAR(255),
        description TEXT,
        reminder_minutes INTEGER DEFAULT 1440,
        is_court_date BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Contacts (opposing counsel, witnesses, etc.) ───── */
      CREATE TABLE IF NOT EXISTS olf_contacts (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER REFERENCES olf_matters(id),
        contact_type VARCHAR(30) NOT NULL DEFAULT 'other',
        name VARCHAR(200) NOT NULL,
        firm_name VARCHAR(200),
        email VARCHAR(150),
        phone VARCHAR(30),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Billing rates per user ─────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_billing_rates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        rate_type VARCHAR(20) DEFAULT 'standard',
        hourly_rate NUMERIC(10,2) NOT NULL,
        effective_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Matter-specific rates ──────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_matter_rates (
        id SERIAL PRIMARY KEY,
        matter_id INTEGER REFERENCES olf_matters(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        hourly_rate NUMERIC(10,2) NOT NULL,
        UNIQUE(matter_id, user_id)
      );

      /* ── Payments received ──────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES olf_invoices(id),
        client_id INTEGER REFERENCES olf_clients(id),
        amount NUMERIC(12,2) NOT NULL,
        payment_method VARCHAR(30),
        reference_number VARCHAR(100),
        payment_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Audit log ──────────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_audit_log (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(60) NOT NULL,
        detail TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      /* ── Notifications ──────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        related_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, type, title, created_at)
      );

      /* ── Firm settings ──────────────────────────────────── */
      CREATE TABLE IF NOT EXISTS olf_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

    `);

    /* ── Seed data ──────────────────────────────────────── */
    const { rows } = await client.query('SELECT count(*) FROM users WHERE username = $1', ['attorney']);
    if (parseInt(rows[0].count) === 0) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('lawfirm1234', 10);

      // Shared users table uses camelCase passwordHash + single 'name' field.
      await client.query(
        `INSERT INTO users (username, "passwordHash", name, role, email) VALUES
         ($1, $2, $3, $4, $5),
         ($6, $2, $7, $8, $9),
         ($10, $2, $11, $12, $13)
         ON CONFLICT (username) DO NOTHING`,
        [
          'attorney', hash, 'Katherine Walsh', 'partner', 'kwalsh@walshlaw.com',
          'associate', 'James Ortega', 'associate', 'jortega@walshlaw.com',
          'paralegal', 'Lisa Chen', 'paralegal', 'lchen@walshlaw.com'
        ]
      );

      // Practice areas
      await client.query(`
        INSERT INTO olf_practice_areas (name, code, description) VALUES
        ('Family Law', 'FAM', 'Divorce, custody, support, adoption'),
        ('Personal Injury', 'PI', 'Auto accidents, slip & fall, medical malpractice'),
        ('Criminal Defense', 'CRIM', 'Misdemeanors, felonies, DUI/DWI'),
        ('Estate Planning', 'EST', 'Wills, trusts, probate, guardianship'),
        ('Business Law', 'BUS', 'Formation, contracts, M&A, employment'),
        ('Real Estate', 'RE', 'Transactions, closings, disputes, landlord-tenant'),
        ('Immigration', 'IMM', 'Visas, green cards, naturalization, asylum'),
        ('Litigation', 'LIT', 'Civil litigation, arbitration, mediation')
        ON CONFLICT (code) DO NOTHING
      `);

      // UTBMS activity codes
      await client.query(`
        INSERT INTO olf_activity_codes (code, description, category) VALUES
        ('A101', 'Plan and prepare for', 'communication'),
        ('A102', 'Research', 'research'),
        ('A103', 'Draft/revise', 'drafting'),
        ('A104', 'Review/analyze', 'review'),
        ('A105', 'Communicate (in firm)', 'communication'),
        ('A106', 'Communicate (with client)', 'communication'),
        ('A107', 'Communicate (other outside counsel)', 'communication'),
        ('A108', 'Appear for/attend', 'court'),
        ('A109', 'Travel', 'travel'),
        ('A110', 'Inspect/investigate', 'investigation')
        ON CONFLICT (code) DO NOTHING
      `);

      // UTBMS task codes
      await client.query(`
        INSERT INTO olf_task_codes (code, description, category) VALUES
        ('L100', 'Case Assessment, Development, and Administration', 'litigation'),
        ('L110', 'Fact Investigation/Development', 'litigation'),
        ('L120', 'Analysis/Strategy', 'litigation'),
        ('L130', 'Experts/Consultants', 'litigation'),
        ('L140', 'Document/File Management', 'litigation'),
        ('L150', 'Budgeting', 'litigation'),
        ('L200', 'Pre-Trial Pleadings and Motions', 'litigation'),
        ('L300', 'Discovery', 'litigation'),
        ('L400', 'Trial Preparation and Trial', 'litigation'),
        ('L500', 'Appeal', 'litigation')
        ON CONFLICT (code) DO NOTHING
      `);

      // Sample clients
      await client.query(`
        INSERT INTO olf_clients (client_type, first_name, last_name, email, phone, address, city, state, zip) VALUES
        ('individual', 'Robert', 'Martinez', 'rmartinez@email.com', '555-0201', '100 Elm Street', 'Austin', 'TX', '78701'),
        ('individual', 'Sarah', 'Johnson', 'sjohnson@email.com', '555-0202', '250 Oak Ave', 'Dallas', 'TX', '75201'),
        ('company', 'TechStart', 'Inc.', 'legal@techstart.io', '555-0203', '400 Innovation Blvd', 'Austin', 'TX', '78702'),
        ('individual', 'David', 'Kim', 'dkim@email.com', '555-0204', '88 Pine St', 'Houston', 'TX', '77001'),
        ('individual', 'Maria', 'Rodriguez', 'mrodriguez@email.com', '555-0205', '555 Maple Dr', 'San Antonio', 'TX', '78201'),
        ('company', 'Greenfield', 'Properties LLC', 'info@greenfieldprop.com', '555-0206', '700 Commerce St', 'Fort Worth', 'TX', '76101')
      `);

      // Get user IDs
      const users = await client.query("SELECT id, username FROM users WHERE username IN ('attorney', 'associate', 'paralegal')");
      const uid = {};
      users.rows.forEach(u => uid[u.username] = u.id);

      // Sample matters
      await client.query(`
        INSERT INTO olf_matters (matter_number, client_id, title, practice_area_id, status, billing_type, billing_rate, responsible_attorney, originating_attorney, date_opened, statute_of_limitations, court_name, case_number, opposing_party, opposing_counsel, notes) VALUES
        ('2026-001', 1, 'Martinez v. Martinez — Divorce', 1, 'open', 'hourly', 350.00, $1, $1, '2026-01-15', '2027-01-15', 'Travis County Family Court', 'FC-2026-1234', 'Angela Martinez', 'Smith & Associates', 'Contested custody, community property division'),
        ('2026-002', 2, 'Johnson Personal Injury — Auto Accident', 2, 'open', 'contingency', NULL, $1, $1, '2026-02-01', '2028-02-01', NULL, NULL, 'ABC Insurance Co.', 'Insurance Defense LLP', 'Rear-end collision, soft tissue injuries'),
        ('2026-003', 3, 'TechStart Inc. — Series A Formation', 5, 'open', 'flat_fee', 15000.00, $1, $1, '2026-02-20', NULL, NULL, NULL, NULL, NULL, 'Corporate formation and Series A docs'),
        ('2026-004', 4, 'Kim Estate Plan', 4, 'open', 'hourly', 300.00, $2, $1, '2026-03-01', NULL, NULL, NULL, NULL, NULL, 'Will, revocable trust, POA, healthcare directive'),
        ('2026-005', 5, 'Rodriguez DWI Defense', 3, 'open', 'flat_fee', 5000.00, $2, $2, '2026-03-10', NULL, 'Travis County Criminal Court', 'CR-2026-5678', 'State of Texas', NULL, 'First offense, BAC 0.09'),
        ('2026-006', 6, 'Greenfield Properties — Commercial Lease Review', 6, 'open', 'hourly', 325.00, $2, $1, '2026-03-15', NULL, NULL, NULL, NULL, NULL, '3 commercial lease negotiations')
      `, [uid.attorney, uid.associate]);

      // Sample time entries (6-minute increments: 0.1 = 6 min)
      await client.query(`
        INSERT INTO olf_time_entries (matter_id, user_id, entry_date, hours, rate, description, activity_code, billable, status) VALUES
        (1, $1, '2026-03-25', 1.5, 350.00, 'Draft initial petition for divorce; review community property inventory', 'A103', true, 'approved'),
        (1, $1, '2026-03-26', 0.8, 350.00, 'Conference with client re: custody preferences and strategy', 'A106', true, 'approved'),
        (1, $3, '2026-03-26', 2.0, 175.00, 'Prepare discovery requests; compile financial document checklist', 'A101', true, 'approved'),
        (2, $1, '2026-03-24', 0.5, 350.00, 'Review police report and medical records', 'A104', true, 'draft'),
        (2, $2, '2026-03-25', 1.2, 275.00, 'Research comparative negligence standards in Texas', 'A102', true, 'draft'),
        (3, $1, '2026-03-20', 3.0, 350.00, 'Draft articles of incorporation and bylaws', 'A103', true, 'approved'),
        (3, $1, '2026-03-22', 2.5, 350.00, 'Review and negotiate term sheet with VC counsel', 'A104', true, 'approved'),
        (4, $2, '2026-03-27', 1.8, 275.00, 'Draft revocable living trust agreement', 'A103', true, 'draft'),
        (4, $2, '2026-03-28', 0.6, 275.00, 'Call with client to review trust provisions', 'A106', true, 'draft'),
        (5, $2, '2026-03-28', 1.0, 275.00, 'Review arrest report and dash cam footage', 'A104', true, 'draft'),
        (6, $2, '2026-03-29', 2.2, 325.00, 'Review and redline three commercial lease agreements', 'A104', true, 'draft'),
        (6, $3, '2026-03-29', 1.5, 175.00, 'Compile tenant improvement clause comparisons across leases', 'A102', true, 'draft')
      `, [uid.attorney, uid.associate, uid.paralegal]);

      // Trust account
      await client.query(`
        INSERT INTO olf_trust_accounts (account_name, account_number, bank_name, balance) VALUES
        ('Walsh Law IOLTA', '****7890', 'First National Bank', 35000.00)
      `);

      // Trust transactions
      await client.query(`
        INSERT INTO olf_trust_transactions (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, transaction_date, created_by) VALUES
        (1, 1, 1, 'deposit', 10000.00, 10000.00, 'Initial retainer deposit — Martinez divorce', '2026-01-16', $1),
        (1, 3, 3, 'deposit', 15000.00, 25000.00, 'Flat fee deposit — TechStart formation', '2026-02-21', $1),
        (1, 5, 5, 'deposit', 5000.00, 30000.00, 'Flat fee deposit — Rodriguez DWI', '2026-03-10', $1),
        (1, 6, 6, 'deposit', 5000.00, 35000.00, 'Retainer deposit — Greenfield lease review', '2026-03-15', $1),
        (1, 1, 1, 'disbursement', -2000.00, 33000.00, 'Transfer to operating — approved fees Jan-Feb', '2026-03-01', $1)
      `, [uid.attorney]);

      // Client trust ledger
      await client.query(`
        INSERT INTO olf_client_trust_ledger (trust_account_id, client_id, matter_id, balance) VALUES
        (1, 1, 1, 8000.00),
        (1, 3, 3, 15000.00),
        (1, 5, 5, 5000.00),
        (1, 6, 6, 5000.00)
        ON CONFLICT (trust_account_id, client_id, matter_id) DO NOTHING
      `);

      // Billing rates
      await client.query(`
        INSERT INTO olf_billing_rates (user_id, rate_type, hourly_rate, effective_date) VALUES
        ($1, 'standard', 350.00, '2026-01-01'),
        ($2, 'standard', 275.00, '2026-01-01'),
        ($3, 'standard', 175.00, '2026-01-01')
      `, [uid.attorney, uid.associate, uid.paralegal]);

      // Calendar events
      await client.query(`
        INSERT INTO olf_calendar_events (matter_id, user_id, title, event_type, start_time, all_day, is_court_date, description) VALUES
        (1, $1, 'Martinez — Temporary Orders Hearing', 'hearing', '2026-04-15 09:00:00', false, true, 'Travis County Courthouse, Room 3B'),
        (2, $1, 'Johnson — Demand Letter Deadline', 'deadline', '2026-04-10 00:00:00', true, false, 'Send demand to ABC Insurance'),
        (5, $2, 'Rodriguez — Arraignment', 'hearing', '2026-04-08 14:00:00', false, true, 'Travis County Criminal Court'),
        (4, $2, 'Kim — Document Signing Appointment', 'meeting', '2026-04-05 10:00:00', false, false, 'Client coming in to execute trust docs'),
        (1, $1, 'Martinez — Statute of Limitations', 'deadline', '2027-01-15 00:00:00', true, false, 'CRITICAL: SOL expires')
      `, [uid.attorney, uid.associate]);

      // Default settings
      await client.query(`
        INSERT INTO olf_settings (key, value) VALUES
        ('firm_name', 'Walsh Law PLLC'),
        ('billing_increment', '6'),
        ('default_payment_terms', '30'),
        ('ledes_enabled', 'true'),
        ('trust_reconciliation_frequency', 'monthly'),
        ('invoice_prefix', 'WL'),
        ('matter_prefix', '2026')
        ON CONFLICT (key) DO NOTHING
      `);

      console.log('OpenLawFirm database seeded with sample data');
    }

    console.log('OpenLawFirm database initialized successfully');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDb };
