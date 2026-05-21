const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDb } = require('./db');
const scaffold = require('./scaffold');
const integrations = require('./integrations');

const app = express();
const PORT = process.env.PORT || 3024;
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  console.warn('Using fallback JWT_SECRET in development mode');
  return require('crypto').randomBytes(32).toString('hex');
})();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Make integrations available to route handlers
app.locals.integrations = integrations;

/* ── Health ─────────────────────────────────────────── */
app.get('/health', (req, res) =>
  res.json({ status: 'ok', app: 'OpenLawFirm', port: PORT })
);

/* ── Auth middleware ─────────────────────────────────── */
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/* ── RBAC middleware ─────────────────────────────────── */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/* ── Notification helper ────────────────────────────── */
async function createNotification(userId, type, title, message, relatedId = null) {
  try {
    await pool.query(`
      INSERT INTO olf_notifications (user_id, type, title, message, related_id, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, false, NOW())
      ON CONFLICT DO NOTHING
    `, [userId, type, title, message, relatedId]);
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/* ── Audit log helper ───────────────────────────────── */
async function logAudit(entityType, entityId, userId, action, detail) {
  try {
    await pool.query(
      'INSERT INTO olf_audit_log (entity_type, entity_id, user_id, action, detail) VALUES ($1, $2, $3, $4, $5)',
      [entityType, entityId, userId, action, detail]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

/* ── Auth routes ────────────────────────────────────── */
// Shared users table is OpenFirehouse-style: columns are `name` (single field)
// and `passwordHash` (camelCase, ecosystem convention). OpenLawFirm aliases
// name → full_name in JWT claims and API responses for internal consistency.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const hash = user.passwordHash || user.password;
    if (!hash) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, full_name: user.name },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, full_name: user.name } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, name AS full_name, role, email FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Notifications ──────────────────────────────────── */
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM olf_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE olf_notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Dashboard ──────────────────────────────────────── */
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const [matters, hours, trust, deadlines, recentTime] = await Promise.all([
      pool.query("SELECT status, COUNT(*) as count FROM olf_matters GROUP BY status"),
      pool.query(`
        SELECT COALESCE(SUM(hours), 0) as total_hours,
               COALESCE(SUM(CASE WHEN billable THEN hours ELSE 0 END), 0) as billable_hours,
               COALESCE(SUM(CASE WHEN billable THEN hours * rate ELSE 0 END), 0) as billable_value
        FROM olf_time_entries WHERE entry_date >= CURRENT_DATE - INTERVAL '30 days'
      `),
      pool.query("SELECT COALESCE(SUM(balance), 0) as total_trust FROM olf_trust_accounts WHERE status = 'active'"),
      pool.query(`
        SELECT ce.*, m.matter_number, m.title as matter_title
        FROM olf_calendar_events ce
        LEFT JOIN olf_matters m ON ce.matter_id = m.id
        WHERE ce.start_time >= NOW() AND ce.start_time <= NOW() + INTERVAL '14 days'
        ORDER BY ce.start_time LIMIT 10
      `),
      pool.query(`
        SELECT te.*, m.matter_number, u.name
        FROM olf_time_entries te
        LEFT JOIN olf_matters m ON te.matter_id = m.id
        LEFT JOIN users u ON te.user_id = u.id
        ORDER BY te.created_at DESC LIMIT 10
      `)
    ]);

    res.json({
      matters: matters.rows,
      billing: hours.rows[0],
      trust_balance: trust.rows[0].total_trust,
      upcoming_deadlines: deadlines.rows,
      recent_entries: recentTime.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Mount route modules ────────────────────────────── */
const clientsRoutes = require('./routes/clients');
const mattersRoutes = require('./routes/matters');
const timeEntriesRoutes = require('./routes/time-entries');
const expensesRoutes = require('./routes/expenses');
const invoicesRoutes = require('./routes/invoices');
const trustRoutes = require('./routes/trust');
const calendarRoutes = require('./routes/calendar');
const settingsRoutes = require('./routes/settings');

app.use('/api/clients', auth, clientsRoutes(pool, logAudit));
app.use('/api/matters', auth, mattersRoutes(pool, logAudit));
app.use('/api/time-entries', auth, timeEntriesRoutes(pool, logAudit));
app.use('/api/expenses', auth, expensesRoutes(pool, logAudit));
app.use('/api/invoices', auth, invoicesRoutes(pool, logAudit));
app.use('/api/trust', auth, trustRoutes(pool, logAudit));
app.use('/api/calendar', auth, calendarRoutes(pool, logAudit));
app.use('/api/settings', auth, settingsRoutes(pool));

/* ── Staff listing ──────────────────────────────────── */
app.get('/api/staff', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.name, u.role, u.email,
             br.hourly_rate
      FROM users u
      LEFT JOIN olf_billing_rates br ON br.user_id = u.id AND br.end_date IS NULL
      ORDER BY u.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Practice areas ─────────────────────────────────── */
app.get('/api/practice-areas', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM olf_practice_areas WHERE is_active = true ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Activity & task codes ──────────────────────────── */
app.get('/api/activity-codes', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM olf_activity_codes WHERE is_active = true ORDER BY code');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/task-codes', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM olf_task_codes WHERE is_active = true ORDER BY code');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Utilization / realization analytics for the managing-partner dashboard ── */
app.get('/api/analytics/utilization', auth, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '30'), 365);
    const targetHoursPerDay = parseFloat(req.query.target_hours || '7');
    const businessDays = Math.round((days * 5) / 7); // rough business-day estimate
    const targetHours = targetHoursPerDay * businessDays;

    // Per-attorney hours + value (for the lookback window)
    const perAttorney = await pool.query(`
      SELECT u.id AS user_id, u.name, u.role,
             COUNT(te.id) AS entry_count,
             COALESCE(SUM(te.hours), 0)::numeric AS total_hours,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours ELSE 0 END), 0)::numeric AS billable_hours,
             COALESCE(SUM(CASE WHEN te.billable THEN te.hours * te.rate ELSE 0 END), 0)::numeric AS wip_value,
             COALESCE(SUM(CASE WHEN te.status = 'billed' THEN te.hours * te.rate ELSE 0 END), 0)::numeric AS billed_value
      FROM users u
      LEFT JOIN olf_time_entries te
        ON te.user_id = u.id
       AND te.entry_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
      WHERE u.role IN ('partner', 'attorney', 'associate', 'paralegal', 'admin')
      GROUP BY u.id, u.name, u.role
      HAVING COUNT(te.id) > 0
      ORDER BY billable_hours DESC
    `, [days]);

    // Firm-wide totals
    const firmAgg = await pool.query(`
      SELECT
        COALESCE(SUM(hours), 0)::numeric AS total_hours,
        COALESCE(SUM(CASE WHEN billable THEN hours ELSE 0 END), 0)::numeric AS billable_hours,
        COALESCE(SUM(CASE WHEN billable THEN hours * rate ELSE 0 END), 0)::numeric AS wip_value,
        COALESCE(SUM(CASE WHEN status = 'billed' THEN hours * rate ELSE 0 END), 0)::numeric AS billed_value
      FROM olf_time_entries
      WHERE entry_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
    `, [days]);

    // AR aging
    const arAging = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN balance_due ELSE 0 END), 0)::numeric AS current_due,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - INTERVAL '30 days' THEN balance_due ELSE 0 END), 0)::numeric AS overdue_30,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '30 days' AND due_date >= CURRENT_DATE - INTERVAL '60 days' THEN balance_due ELSE 0 END), 0)::numeric AS overdue_60,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - INTERVAL '60 days' THEN balance_due ELSE 0 END), 0)::numeric AS overdue_90_plus
      FROM olf_invoices
      WHERE status IN ('sent', 'partial', 'overdue')
    `);

    // Top matters by hours in the window
    const topMatters = await pool.query(`
      SELECT m.id, m.matter_number, m.title,
             COALESCE(SUM(te.hours), 0)::numeric AS hours,
             COALESCE(SUM(te.hours * te.rate), 0)::numeric AS wip_value
      FROM olf_matters m
      JOIN olf_time_entries te ON te.matter_id = m.id
      WHERE te.entry_date >= CURRENT_DATE - ($1::int * INTERVAL '1 day')
      GROUP BY m.id, m.matter_number, m.title
      ORDER BY hours DESC
      LIMIT 10
    `, [days]);

    // Trust totals
    const trust = await pool.query(`
      SELECT COALESCE(SUM(balance), 0)::numeric AS total_balance
      FROM olf_trust_accounts WHERE status = 'active'
    `);

    res.json({
      window: { days, target_hours_per_attorney_per_day: targetHoursPerDay, target_hours_per_attorney: targetHours },
      firm: firmAgg.rows[0],
      per_attorney: perAttorney.rows.map((r) => ({
        ...r,
        utilization_pct: targetHours > 0
          ? Math.round((parseFloat(r.billable_hours) / targetHours) * 100)
          : null,
      })),
      ar_aging: arAging.rows[0],
      top_matters: topMatters.rows,
      trust: trust.rows[0],
    });
  } catch (err) {
    console.error('Utilization analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Start server ───────────────────────────────────── */
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🏛️  OpenLawFirm server running on http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health\n`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
