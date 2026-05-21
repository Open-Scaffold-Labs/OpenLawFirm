const express = require('express');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  /* List events */
  router.get('/', async (req, res) => {
    try {
      const { matter_id, user_id, event_type, date_from, date_to } = req.query;
      let sql = `
        SELECT ce.*, m.matter_number, m.title as matter_title,
               u.name as user_name
        FROM olf_calendar_events ce
        LEFT JOIN olf_matters m ON ce.matter_id = m.id
        LEFT JOIN users u ON ce.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (matter_id) { params.push(matter_id); sql += ` AND ce.matter_id = $${params.length}`; }
      if (user_id) { params.push(user_id); sql += ` AND ce.user_id = $${params.length}`; }
      if (event_type) { params.push(event_type); sql += ` AND ce.event_type = $${params.length}`; }
      if (date_from) { params.push(date_from); sql += ` AND ce.start_time >= $${params.length}`; }
      if (date_to) { params.push(date_to); sql += ` AND ce.start_time <= $${params.length}`; }
      sql += ' ORDER BY ce.start_time';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Create event */
  router.post('/', async (req, res) => {
    try {
      const { matter_id, title, event_type, start_time, end_time, all_day, location, description, reminder_minutes, is_court_date } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO olf_calendar_events (matter_id, user_id, title, event_type, start_time, end_time, all_day, location, description, reminder_minutes, is_court_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [matter_id, req.user.id, title, event_type || 'deadline', start_time, end_time, all_day || false, location, description, reminder_minutes || 1440, is_court_date || false]
      );
      await logAudit('calendar', rows[0].id, req.user.id, 'create', `Created event: ${title}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update event */
  router.put('/:id', async (req, res) => {
    try {
      const { title, event_type, start_time, end_time, all_day, location, description, reminder_minutes, is_court_date, status } = req.body;
      const { rows } = await pool.query(
        `UPDATE olf_calendar_events SET title=$1, event_type=$2, start_time=$3, end_time=$4,
         all_day=$5, location=$6, description=$7, reminder_minutes=$8, is_court_date=$9, status=$10
         WHERE id=$11 RETURNING *`,
        [title, event_type, start_time, end_time, all_day, location, description, reminder_minutes, is_court_date, status, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Event not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Delete event */
  router.delete('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query('DELETE FROM olf_calendar_events WHERE id = $1 RETURNING *', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Event not found' });
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
