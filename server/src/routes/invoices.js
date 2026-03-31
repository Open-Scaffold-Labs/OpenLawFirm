const express = require('express');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  /* List invoices */
  router.get('/', async (req, res) => {
    try {
      const { status, client_id, matter_id } = req.query;
      let sql = `
        SELECT i.*, m.matter_number, m.title as matter_title,
               c.first_name as client_first, c.last_name as client_last, c.company_name
        FROM olf_invoices i
        LEFT JOIN olf_matters m ON i.matter_id = m.id
        LEFT JOIN olf_clients c ON i.client_id = c.id
        WHERE 1=1
      `;
      const params = [];
      if (status) { params.push(status); sql += ` AND i.status = $${params.length}`; }
      if (client_id) { params.push(client_id); sql += ` AND i.client_id = $${params.length}`; }
      if (matter_id) { params.push(matter_id); sql += ` AND i.matter_id = $${params.length}`; }
      sql += ' ORDER BY i.invoice_date DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Get single invoice with line items */
  router.get('/:id', async (req, res) => {
    try {
      const invoice = await pool.query(`
        SELECT i.*, m.matter_number, m.title as matter_title,
               c.first_name as client_first, c.last_name as client_last, c.company_name,
               c.address, c.city, c.state, c.zip, c.email as client_email
        FROM olf_invoices i
        LEFT JOIN olf_matters m ON i.matter_id = m.id
        LEFT JOIN olf_clients c ON i.client_id = c.id
        WHERE i.id = $1
      `, [req.params.id]);
      if (!invoice.rows.length) return res.status(404).json({ error: 'Invoice not found' });

      const lines = await pool.query(
        'SELECT * FROM olf_invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order, id',
        [req.params.id]
      );

      const payments = await pool.query(
        'SELECT * FROM olf_payments WHERE invoice_id = $1 ORDER BY payment_date DESC',
        [req.params.id]
      );

      res.json({ ...invoice.rows[0], line_items: lines.rows, payments: payments.rows });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Generate invoice from unbilled time/expenses on a matter */
  router.post('/generate', async (req, res) => {
    try {
      const { matter_id, include_expenses = true } = req.body;

      // Get matter & client info
      const matter = await pool.query('SELECT * FROM olf_matters WHERE id = $1', [matter_id]);
      if (!matter.rows.length) return res.status(404).json({ error: 'Matter not found' });
      const m = matter.rows[0];

      // Get approved, unbilled time entries
      const timeEntries = await pool.query(`
        SELECT te.*, u.full_name FROM olf_time_entries te
        LEFT JOIN users u ON te.user_id = u.id
        WHERE te.matter_id = $1 AND te.status = 'approved' AND te.billed_on_invoice_id IS NULL AND te.billable = true
        ORDER BY te.entry_date
      `, [matter_id]);

      // Get unbilled expenses
      let expenses = { rows: [] };
      if (include_expenses) {
        expenses = await pool.query(
          `SELECT * FROM olf_expenses WHERE matter_id = $1 AND status = 'pending' AND billed_on_invoice_id IS NULL AND billable = true
           ORDER BY expense_date`,
          [matter_id]
        );
      }

      // Generate invoice number
      const prefix = (await pool.query("SELECT value FROM olf_settings WHERE key = 'invoice_prefix'")).rows[0]?.value || 'INV';
      const countResult = await pool.query('SELECT COUNT(*) FROM olf_invoices');
      const invoiceNumber = `${prefix}-${String(parseInt(countResult.rows[0].count) + 1).padStart(5, '0')}`;

      // Calculate totals
      let subtotalFees = 0;
      let subtotalExpenses = 0;
      for (const te of timeEntries.rows) subtotalFees += parseFloat(te.hours) * parseFloat(te.rate);
      for (const ex of expenses.rows) subtotalExpenses += parseFloat(ex.amount);
      const totalAmount = subtotalFees + subtotalExpenses;

      // Get payment terms
      const terms = (await pool.query("SELECT value FROM olf_settings WHERE key = 'default_payment_terms'")).rows[0]?.value || '30';
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + parseInt(terms));

      // Create invoice
      const inv = await pool.query(
        `INSERT INTO olf_invoices (invoice_number, matter_id, client_id, status, invoice_date, due_date,
         subtotal_fees, subtotal_expenses, total_amount, balance_due)
         VALUES ($1, $2, $3, 'draft', CURRENT_DATE, $4, $5, $6, $7, $7) RETURNING *`,
        [invoiceNumber, matter_id, m.client_id, dueDate, subtotalFees, subtotalExpenses, totalAmount]
      );
      const invoiceId = inv.rows[0].id;

      // Create line items for time entries
      let sortOrder = 0;
      for (const te of timeEntries.rows) {
        const amount = parseFloat(te.hours) * parseFloat(te.rate);
        await pool.query(
          `INSERT INTO olf_invoice_line_items (invoice_id, line_type, time_entry_id, description, quantity, rate, amount, sort_order)
           VALUES ($1, 'fee', $2, $3, $4, $5, $6, $7)`,
          [invoiceId, te.id, `${te.entry_date} — ${te.full_name}: ${te.description}`, te.hours, te.rate, amount, sortOrder++]
        );
        // Mark time entry as billed
        await pool.query('UPDATE olf_time_entries SET billed_on_invoice_id = $1, status = $2 WHERE id = $3', [invoiceId, 'billed', te.id]);
      }

      // Create line items for expenses
      for (const ex of expenses.rows) {
        await pool.query(
          `INSERT INTO olf_invoice_line_items (invoice_id, line_type, expense_id, description, quantity, rate, amount, sort_order)
           VALUES ($1, 'expense', $2, $3, 1, $4, $4, $5)`,
          [invoiceId, ex.id, `Expense: ${ex.description}`, ex.amount, sortOrder++]
        );
        await pool.query('UPDATE olf_expenses SET billed_on_invoice_id = $1, status = $2 WHERE id = $3', [invoiceId, 'billed', ex.id]);
      }

      await logAudit('invoice', invoiceId, req.user.id, 'create', `Generated invoice ${invoiceNumber} for $${totalAmount.toFixed(2)}`);
      res.status(201).json(inv.rows[0]);
    } catch (err) {
      console.error('Generate invoice error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Update invoice status */
  router.put('/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'void'];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

      const { rows } = await pool.query(
        'UPDATE olf_invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Invoice not found' });
      await logAudit('invoice', rows[0].id, req.user.id, 'status_change', `Invoice status → ${status}`);
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* Record payment */
  router.post('/:id/payments', async (req, res) => {
    try {
      const { amount, payment_method, reference_number, payment_date, notes } = req.body;
      const invoice = await pool.query('SELECT * FROM olf_invoices WHERE id = $1', [req.params.id]);
      if (!invoice.rows.length) return res.status(404).json({ error: 'Invoice not found' });

      const payment = await pool.query(
        `INSERT INTO olf_payments (invoice_id, client_id, amount, payment_method, reference_number, payment_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.params.id, invoice.rows[0].client_id, amount, payment_method, reference_number, payment_date || new Date(), notes]
      );

      // Update invoice balances
      const newPaid = parseFloat(invoice.rows[0].amount_paid) + parseFloat(amount);
      const newBalance = parseFloat(invoice.rows[0].total_amount) - newPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      await pool.query(
        'UPDATE olf_invoices SET amount_paid = $1, balance_due = $2, status = $3, updated_at = NOW() WHERE id = $4',
        [newPaid, Math.max(0, newBalance), newStatus, req.params.id]
      );

      await logAudit('payment', payment.rows[0].id, req.user.id, 'create', `Payment of $${amount} on invoice ${invoice.rows[0].invoice_number}`);
      res.status(201).json(payment.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
