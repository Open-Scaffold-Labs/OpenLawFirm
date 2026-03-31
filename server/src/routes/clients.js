const express = require('express');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  /* List clients */
  router.get('/', async (req, res) => {
    try {
      const { status, search } = req.query;
      let sql = `
        SELECT c.*,
          (SELECT COUNT(*) FROM olf_matters m WHERE m.client_id = c.id AND m.status = 'open') as open_matters,
          (SELECT COALESCE(SUM(ctl.balance), 0) FROM olf_client_trust_ledger ctl WHERE ctl.client_id = c.id) as trust_balance
        FROM olf_clients c WHERE 1=1
      `;
      const params = [];
      if (status) { params.push(status); sql += ` AND c.status = $${params.length}`; }
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (c.first_name ILIKE $${params.length} OR c.last_name ILIKE $${params.length} OR c.company_name ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
      }
      sql += ' ORDER BY c.last_name, c.first_name';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('Clients list error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Get single client */
  router.get('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM olf_clients WHERE id = $1', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Client not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Create client */
  router.post('/', async (req, res) => {
    try {
      const { client_type, first_name, last_name, company_name, email, phone, address, city, state, zip, notes } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO olf_clients (client_type, first_name, last_name, company_name, email, phone, address, city, state, zip, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [client_type || 'individual', first_name, last_name, company_name, email, phone, address, city, state, zip, notes]
      );
      await logAudit('client', rows[0].id, req.user.id, 'create', `Created client: ${first_name} ${last_name}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create client error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update client */
  router.put('/:id', async (req, res) => {
    try {
      const { client_type, first_name, last_name, company_name, email, phone, address, city, state, zip, notes, status } = req.body;
      const { rows } = await pool.query(
        `UPDATE olf_clients SET client_type=$1, first_name=$2, last_name=$3, company_name=$4,
         email=$5, phone=$6, address=$7, city=$8, state=$9, zip=$10, notes=$11, status=$12, updated_at=NOW()
         WHERE id=$13 RETURNING *`,
        [client_type, first_name, last_name, company_name, email, phone, address, city, state, zip, notes, status, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Client not found' });
      await logAudit('client', rows[0].id, req.user.id, 'update', 'Updated client record');
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Get client's matters */
  router.get('/:id/matters', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT m.*, pa.name as practice_area_name, u.full_name as attorney_name
         FROM olf_matters m
         LEFT JOIN olf_practice_areas pa ON m.practice_area_id = pa.id
         LEFT JOIN users u ON m.responsible_attorney = u.id
         WHERE m.client_id = $1 ORDER BY m.date_opened DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
