const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  /* Get all settings */
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT key, value FROM olf_settings ORDER BY key');
      const settings = {};
      rows.forEach(r => settings[r.key] = r.value);
      res.json(settings);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update a setting */
  router.put('/:key', async (req, res) => {
    try {
      const { value } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO olf_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW() RETURNING *`,
        [req.params.key, value]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
