const express = require('express');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  /* ── Round to billing increment (default 6 min = 0.1 hr) ── */
  function roundToIncrement(hours, incrementMinutes = 6) {
    const increment = incrementMinutes / 60;
    return Math.ceil(hours / increment) * increment;
  }

  /* List time entries (filterable) */
  router.get('/', async (req, res) => {
    try {
      const { matter_id, user_id, status, date_from, date_to, billable } = req.query;
      let sql = `
        SELECT te.*, m.matter_number, m.title as matter_title,
               c.first_name as client_first, c.last_name as client_last,
               u.name
        FROM olf_time_entries te
        LEFT JOIN olf_matters m ON te.matter_id = m.id
        LEFT JOIN olf_clients c ON m.client_id = c.id
        LEFT JOIN users u ON te.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (matter_id) { params.push(matter_id); sql += ` AND te.matter_id = $${params.length}`; }
      if (user_id) { params.push(user_id); sql += ` AND te.user_id = $${params.length}`; }
      if (status) { params.push(status); sql += ` AND te.status = $${params.length}`; }
      if (date_from) { params.push(date_from); sql += ` AND te.entry_date >= $${params.length}`; }
      if (date_to) { params.push(date_to); sql += ` AND te.entry_date <= $${params.length}`; }
      if (billable !== undefined) { params.push(billable === 'true'); sql += ` AND te.billable = $${params.length}`; }
      sql += ' ORDER BY te.entry_date DESC, te.created_at DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('Time entries list error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Create time entry */
  router.post('/', async (req, res) => {
    try {
      const { matter_id, entry_date, hours, description, activity_code, task_code, billable } = req.body;
      // Get rate: matter-specific → user default → 0
      let rate = 0;
      const matterRate = await pool.query(
        'SELECT hourly_rate FROM olf_matter_rates WHERE matter_id = $1 AND user_id = $2',
        [matter_id, req.user.id]
      );
      if (matterRate.rows.length) {
        rate = parseFloat(matterRate.rows[0].hourly_rate);
      } else {
        const userRate = await pool.query(
          'SELECT hourly_rate FROM olf_billing_rates WHERE user_id = $1 AND end_date IS NULL ORDER BY effective_date DESC LIMIT 1',
          [req.user.id]
        );
        if (userRate.rows.length) rate = parseFloat(userRate.rows[0].hourly_rate);
      }

      // Round hours to billing increment
      const roundedHours = roundToIncrement(parseFloat(hours));

      const { rows } = await pool.query(
        `INSERT INTO olf_time_entries (matter_id, user_id, entry_date, hours, rate, description, activity_code, task_code, billable, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft') RETURNING *`,
        [matter_id, req.user.id, entry_date || new Date(), roundedHours, rate, description, activity_code, task_code, billable !== false]
      );
      await logAudit('time_entry', rows[0].id, req.user.id, 'create', `${roundedHours}h on matter ${matter_id}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create time entry error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update time entry */
  router.put('/:id', async (req, res) => {
    try {
      const { hours, description, activity_code, task_code, billable, entry_date } = req.body;
      const roundedHours = hours ? roundToIncrement(parseFloat(hours)) : undefined;
      const { rows } = await pool.query(
        `UPDATE olf_time_entries SET
         hours = COALESCE($1, hours), description = COALESCE($2, description),
         activity_code = COALESCE($3, activity_code), task_code = COALESCE($4, task_code),
         billable = COALESCE($5, billable), entry_date = COALESCE($6, entry_date), updated_at = NOW()
         WHERE id = $7 AND status = 'draft' RETURNING *`,
        [roundedHours, description, activity_code, task_code, billable, entry_date, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Entry not found or not editable' });
      await logAudit('time_entry', rows[0].id, req.user.id, 'update', 'Updated time entry');
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Approve time entries (batch) */
  router.post('/approve', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids?.length) return res.status(400).json({ error: 'No entry IDs provided' });
      const { rows } = await pool.query(
        `UPDATE olf_time_entries SET status = 'approved', updated_at = NOW()
         WHERE id = ANY($1) AND status = 'draft' RETURNING *`,
        [ids]
      );
      for (const entry of rows) {
        await logAudit('time_entry', entry.id, req.user.id, 'approve', `Approved ${entry.hours}h`);
      }
      res.json({ approved: rows.length, entries: rows });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Delete time entry (draft only) */
  router.delete('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(
        "DELETE FROM olf_time_entries WHERE id = $1 AND status = 'draft' RETURNING *",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Entry not found or not deletable' });
      await logAudit('time_entry', rows[0].id, req.user.id, 'delete', 'Deleted draft time entry');
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Timer start/stop */
  router.post('/timer/start', async (req, res) => {
    try {
      const { matter_id, description, activity_code } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO olf_time_entries (matter_id, user_id, entry_date, hours, rate, description, activity_code, billable, status, timer_start)
         VALUES ($1, $2, CURRENT_DATE, 0, 0, $3, $4, true, 'timer', NOW()) RETURNING *`,
        [matter_id, req.user.id, description || 'Timer entry', activity_code]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/timer/stop/:id', async (req, res) => {
    try {
      const entry = await pool.query('SELECT * FROM olf_time_entries WHERE id = $1 AND status = $2', [req.params.id, 'timer']);
      if (!entry.rows.length) return res.status(404).json({ error: 'Timer not found' });

      const start = new Date(entry.rows[0].timer_start);
      const elapsed = (Date.now() - start.getTime()) / 3600000; // hours
      const roundedHours = roundToIncrement(elapsed);

      // Get rate
      let rate = 0;
      const userRate = await pool.query(
        'SELECT hourly_rate FROM olf_billing_rates WHERE user_id = $1 AND end_date IS NULL ORDER BY effective_date DESC LIMIT 1',
        [req.user.id]
      );
      if (userRate.rows.length) rate = parseFloat(userRate.rows[0].hourly_rate);

      const { rows } = await pool.query(
        `UPDATE olf_time_entries SET hours = $1, rate = $2, timer_end = NOW(), status = 'draft', updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [roundedHours, rate, req.params.id]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Today's summary for current user */
  router.get('/summary/today', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT COALESCE(SUM(hours), 0) as total_hours,
               COALESCE(SUM(CASE WHEN billable THEN hours ELSE 0 END), 0) as billable_hours,
               COALESCE(SUM(CASE WHEN billable THEN hours * rate ELSE 0 END), 0) as billable_value,
               COUNT(*) as entry_count
        FROM olf_time_entries
        WHERE user_id = $1 AND entry_date = CURRENT_DATE
      `, [req.user.id]);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
