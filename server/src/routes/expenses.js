const express = require('express');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  /* List expenses (filterable like time entries) */
  router.get('/', async (req, res) => {
    try {
      const { matter_id, user_id, status, billable, date_from, date_to } = req.query;
      let sql = `
        SELECT e.*, m.matter_number, m.title AS matter_title,
               c.first_name AS client_first, c.last_name AS client_last, c.company_name,
               u.name AS user_name
        FROM olf_expenses e
        LEFT JOIN olf_matters m ON e.matter_id = m.id
        LEFT JOIN olf_clients c ON m.client_id = c.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE 1=1
      `;
      const params = [];
      if (matter_id) { params.push(matter_id); sql += ` AND e.matter_id = $${params.length}`; }
      if (user_id)   { params.push(user_id);   sql += ` AND e.user_id = $${params.length}`; }
      if (status)    { params.push(status);    sql += ` AND e.status = $${params.length}`; }
      if (billable !== undefined) {
        params.push(billable === 'true');
        sql += ` AND e.billable = $${params.length}`;
      }
      if (date_from) { params.push(date_from); sql += ` AND e.expense_date >= $${params.length}`; }
      if (date_to)   { params.push(date_to);   sql += ` AND e.expense_date <= $${params.length}`; }
      sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('Expenses list error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Get single */
  router.get('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM olf_expenses WHERE id = $1', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Create */
  router.post('/', async (req, res) => {
    try {
      const {
        matter_id, expense_date, amount, description, category,
        billable, receipt_file,
      } = req.body;
      if (!matter_id || !amount || !description) {
        return res.status(400).json({ error: 'matter_id, amount, and description required' });
      }
      const { rows } = await pool.query(
        `INSERT INTO olf_expenses
         (matter_id, user_id, expense_date, amount, description, category, billable, receipt_file, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
        [matter_id, req.user.id, expense_date || new Date(), amount, description,
         category, billable !== false, receipt_file]
      );
      await logAudit('expense', rows[0].id, req.user.id, 'create', `$${amount} on matter ${matter_id}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create expense error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update */
  router.put('/:id', async (req, res) => {
    try {
      const allowed = ['expense_date', 'amount', 'description', 'category', 'billable', 'receipt_file', 'status'];
      const setClauses = [];
      const params = [];
      for (const k of allowed) {
        if (req.body[k] !== undefined) {
          params.push(req.body[k]);
          setClauses.push(`${k} = $${params.length}`);
        }
      }
      if (!setClauses.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE olf_expenses SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Delete (only allowed when unbilled) */
  router.delete('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM olf_expenses WHERE id = $1', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      if (rows[0].billed_on_invoice_id) {
        return res.status(400).json({ error: 'Cannot delete an expense already billed on an invoice.' });
      }
      await pool.query('DELETE FROM olf_expenses WHERE id = $1', [req.params.id]);
      await logAudit('expense', req.params.id, req.user.id, 'delete', 'Expense deleted');
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Approve (bulk) */
  router.post('/approve', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids[] required' });
      const { rows } = await pool.query(
        `UPDATE olf_expenses SET status = 'approved' WHERE id = ANY($1::int[]) RETURNING *`,
        [ids]
      );
      await logAudit('expense', ids.join(','), req.user.id, 'approve', `${ids.length} expense(s) approved`);
      res.json({ entries: rows });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
