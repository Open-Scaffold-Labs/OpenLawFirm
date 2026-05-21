const express = require('express');
const { createNumberGenerator } = require('@openscaffold/core/server/numberGenerator');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  // Date-based matter number generator (e.g. M-20260520-001). Used to
  // suggest a default number on the new-matter form.
  const generateMatterNumber = createNumberGenerator({
    prefix: 'M',
    table: 'olf_matters',
    column: 'matter_number',
    mode: 'date',
    padWidth: 3,
  });

  /* Suggest the next matter number for the new-matter form */
  router.get('/next-number', async (req, res) => {
    try {
      const next = await generateMatterNumber(pool);
      res.json({ matter_number: next });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* List matters */
  router.get('/', async (req, res) => {
    try {
      const { status, practice_area_id, search, attorney_id } = req.query;
      let sql = `
        SELECT m.*, c.first_name as client_first, c.last_name as client_last, c.company_name,
               pa.name as practice_area_name, pa.code as practice_area_code,
               u.name as attorney_name, u2.name as originating_attorney_name,
               (SELECT COALESCE(SUM(te.hours * te.rate), 0) FROM olf_time_entries te WHERE te.matter_id = m.id AND te.billable = true) as total_billed,
               (SELECT COALESCE(SUM(te.hours), 0) FROM olf_time_entries te WHERE te.matter_id = m.id) as total_hours,
               (SELECT COALESCE(SUM(ctl.balance), 0) FROM olf_client_trust_ledger ctl WHERE ctl.matter_id = m.id) as trust_balance
        FROM olf_matters m
        LEFT JOIN olf_clients c ON m.client_id = c.id
        LEFT JOIN olf_practice_areas pa ON m.practice_area_id = pa.id
        LEFT JOIN users u ON m.responsible_attorney = u.id
        LEFT JOIN users u2 ON m.originating_attorney = u2.id
        WHERE 1=1
      `;
      const params = [];
      if (status) { params.push(status); sql += ` AND m.status = $${params.length}`; }
      if (practice_area_id) { params.push(practice_area_id); sql += ` AND m.practice_area_id = $${params.length}`; }
      if (attorney_id) { params.push(attorney_id); sql += ` AND m.responsible_attorney = $${params.length}`; }
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (m.matter_number ILIKE $${params.length} OR m.title ILIKE $${params.length} OR c.last_name ILIKE $${params.length})`;
      }
      sql += ' ORDER BY m.date_opened DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      console.error('Matters list error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Get single matter with full detail */
  router.get('/:id', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT m.*, c.first_name as client_first, c.last_name as client_last, c.company_name, c.email as client_email,
               pa.name as practice_area_name, u.name as attorney_name
        FROM olf_matters m
        LEFT JOIN olf_clients c ON m.client_id = c.id
        LEFT JOIN olf_practice_areas pa ON m.practice_area_id = pa.id
        LEFT JOIN users u ON m.responsible_attorney = u.id
        WHERE m.id = $1
      `, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Matter not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Create matter */
  router.post('/', async (req, res) => {
    try {
      const { matter_number, client_id, title, practice_area_id, billing_type, billing_rate, flat_fee_amount,
              responsible_attorney, originating_attorney, statute_of_limitations, court_name, case_number,
              opposing_party, opposing_counsel, notes } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO olf_matters (matter_number, client_id, title, practice_area_id, billing_type, billing_rate,
         flat_fee_amount, responsible_attorney, originating_attorney, statute_of_limitations, court_name,
         case_number, opposing_party, opposing_counsel, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [matter_number, client_id, title, practice_area_id, billing_type || 'hourly', billing_rate, flat_fee_amount,
         responsible_attorney, originating_attorney, statute_of_limitations, court_name, case_number,
         opposing_party, opposing_counsel, notes]
      );
      await logAudit('matter', rows[0].id, req.user.id, 'create', `Opened matter: ${matter_number}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Create matter error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update matter */
  router.put('/:id', async (req, res) => {
    try {
      const fields = req.body;
      const setClauses = [];
      const params = [];
      const allowed = ['title', 'practice_area_id', 'status', 'billing_type', 'billing_rate', 'flat_fee_amount',
        'responsible_attorney', 'originating_attorney', 'statute_of_limitations', 'court_name', 'case_number',
        'opposing_party', 'opposing_counsel', 'notes', 'date_closed'];
      for (const key of allowed) {
        if (fields[key] !== undefined) {
          params.push(fields[key]);
          setClauses.push(`${key} = $${params.length}`);
        }
      }
      if (!setClauses.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(req.params.id);
      setClauses.push('updated_at = NOW()');
      const { rows } = await pool.query(
        `UPDATE olf_matters SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`, params
      );
      if (!rows.length) return res.status(404).json({ error: 'Matter not found' });
      await logAudit('matter', rows[0].id, req.user.id, 'update', `Updated matter: ${rows[0].matter_number}`);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Matter time entries */
  router.get('/:id/time-entries', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT te.*, u.name
        FROM olf_time_entries te
        LEFT JOIN users u ON te.user_id = u.id
        WHERE te.matter_id = $1
        ORDER BY te.entry_date DESC, te.created_at DESC
      `, [req.params.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Matter expenses */
  router.get('/:id/expenses', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT e.*, u.name
        FROM olf_expenses e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.matter_id = $1
        ORDER BY e.expense_date DESC
      `, [req.params.id]);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Matter contacts */
  router.get('/:id/contacts', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM olf_contacts WHERE matter_id = $1 ORDER BY contact_type, name', [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/contacts', async (req, res) => {
    try {
      const { contact_type, name, firm_name, email, phone, address, notes } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO olf_contacts (matter_id, contact_type, name, firm_name, email, phone, address, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.params.id, contact_type, name, firm_name, email, phone, address, notes]
      );
      await logAudit('contact', rows[0].id, req.user.id, 'create', `Added ${contact_type} ${name}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/:id/contacts/:contactId', async (req, res) => {
    try {
      const allowed = ['contact_type', 'name', 'firm_name', 'email', 'phone', 'address', 'notes'];
      const setClauses = [];
      const params = [];
      for (const k of allowed) {
        if (req.body[k] !== undefined) {
          params.push(req.body[k]);
          setClauses.push(`${k} = $${params.length}`);
        }
      }
      if (!setClauses.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(req.params.contactId);
      params.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE olf_contacts SET ${setClauses.join(', ')} WHERE id = $${params.length - 1} AND matter_id = $${params.length} RETURNING *`,
        params
      );
      if (!rows.length) return res.status(404).json({ error: 'Contact not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.delete('/:id/contacts/:contactId', async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM olf_contacts WHERE id = $1 AND matter_id = $2',
        [req.params.contactId, req.params.id]
      );
      await logAudit('contact', req.params.contactId, req.user.id, 'delete', 'Contact removed from matter');
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Matter documents — metadata only for v0.1; physical file storage
     comes via the DocumentStore adapter (Box/iManage/NetDocuments)
     in a future iteration. */
  router.get('/:id/documents', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT d.*, u.name as uploaded_by_name FROM olf_documents d
         LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE d.matter_id = $1 ORDER BY d.created_at DESC`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/documents', async (req, res) => {
    try {
      const { file_name, file_type, file_size, doc_category, description } = req.body;
      if (!file_name) return res.status(400).json({ error: 'file_name required' });
      const { rows } = await pool.query(
        `INSERT INTO olf_documents (matter_id, file_name, file_type, file_size, doc_category, description, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.params.id, file_name, file_type, file_size, doc_category, description, req.user.id]
      );
      await logAudit('document', rows[0].id, req.user.id, 'create', `Document: ${file_name}`);
      res.status(201).json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.delete('/:id/documents/:docId', async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM olf_documents WHERE id = $1 AND matter_id = $2',
        [req.params.docId, req.params.id]
      );
      await logAudit('document', req.params.docId, req.user.id, 'delete', 'Document removed');
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
