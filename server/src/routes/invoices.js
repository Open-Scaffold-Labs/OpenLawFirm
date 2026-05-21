const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createNumberGenerator } = require('@openscaffold/core/server/numberGenerator');
const { generateInvoicePDF } = require('../generate-invoice-pdf');
const { generateLedes1998B } = require('../generate-ledes-1998b');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  // Shared sequential number generator from @openscaffold/core
  // Pattern: INV-00001, INV-00002, ... (global mode, 5-digit pad)
  const generateInvoiceNumber = createNumberGenerator({
    prefix: 'INV',
    table: 'olf_invoices',
    column: 'invoice_number',
    mode: 'global',
    padWidth: 5,
  });

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
        SELECT te.*, u.name FROM olf_time_entries te
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

      // Generate invoice number via shared @openscaffold/core utility
      const invoiceNumber = await generateInvoiceNumber(pool);

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
          [invoiceId, te.id, `${new Date(te.entry_date).toISOString().slice(0, 10)} — ${te.name}: ${te.description}`, te.hours, te.rate, amount, sortOrder++]
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

  /* Download invoice PDF — uses shared reportlab pattern from openscaffold-core */
  router.get('/:id/pdf', async (req, res) => {
    try {
      // Load invoice with full context (matter, client, addresses) + line items + payments
      const inv = await pool.query(`
        SELECT i.*, m.matter_number, m.title AS matter_title,
               c.first_name AS client_first, c.last_name AS client_last, c.company_name,
               c.address, c.city, c.state, c.zip, c.email AS client_email
        FROM olf_invoices i
        LEFT JOIN olf_matters m ON i.matter_id = m.id
        LEFT JOIN olf_clients c ON i.client_id = c.id
        WHERE i.id = $1
      `, [req.params.id]);
      if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });

      const [lineItems, payments, firmSettings] = await Promise.all([
        pool.query(
          'SELECT * FROM olf_invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order, id',
          [req.params.id]
        ),
        pool.query(
          'SELECT * FROM olf_payments WHERE invoice_id = $1 ORDER BY payment_date',
          [req.params.id]
        ),
        pool.query(
          "SELECT key, value FROM olf_settings WHERE key IN ('firm_name','firm_address','firm_phone','firm_email','default_payment_terms')"
        ),
      ]);

      const settings = Object.fromEntries(firmSettings.rows.map((r) => [r.key, r.value]));
      const payload = {
        ...inv.rows[0],
        line_items: lineItems.rows,
        payments: payments.rows,
        firm_name: settings.firm_name || 'Open Scaffold Law Firm',
        firm_address: settings.firm_address || '',
        firm_phone: settings.firm_phone || '',
        firm_email: settings.firm_email || '',
        payment_terms: settings.default_payment_terms
          ? `Payment due within ${settings.default_payment_terms} days. Trust account balances may be applied with client authorization.`
          : null,
      };

      const outputPath = path.join(os.tmpdir(), `invoice-${inv.rows[0].invoice_number}-${Date.now()}.pdf`);
      await generateInvoicePDF(payload, outputPath);

      const pdfBytes = fs.readFileSync(outputPath);
      fs.unlinkSync(outputPath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${inv.rows[0].invoice_number}.pdf"`
      );
      res.send(pdfBytes);
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json({ error: 'PDF generation failed', detail: String(err.message || err) });
    }
  });

  /* Download invoice as LEDES 1998B text (for corporate / insurance carrier e-billing) */
  router.get('/:id/ledes', async (req, res) => {
    try {
      const inv = await pool.query(`
        SELECT i.*, m.matter_number, m.title AS matter_title
        FROM olf_invoices i
        LEFT JOIN olf_matters m ON i.matter_id = m.id
        WHERE i.id = $1
      `, [req.params.id]);
      if (!inv.rows.length) return res.status(404).json({ error: 'Invoice not found' });
      const invoice = inv.rows[0];

      const lineItemsRes = await pool.query(
        'SELECT * FROM olf_invoice_line_items WHERE invoice_id = $1 ORDER BY sort_order, id',
        [req.params.id]
      );
      const lineItems = lineItemsRes.rows;

      // Lookup source time entries + expenses for full LEDES detail
      const timeEntryIds = lineItems.filter((l) => l.time_entry_id).map((l) => l.time_entry_id);
      const expenseIds = lineItems.filter((l) => l.expense_id).map((l) => l.expense_id);

      const [timeEntriesRes, expensesRes] = await Promise.all([
        timeEntryIds.length
          ? pool.query('SELECT * FROM olf_time_entries WHERE id = ANY($1::int[])', [timeEntryIds])
          : Promise.resolve({ rows: [] }),
        expenseIds.length
          ? pool.query('SELECT * FROM olf_expenses WHERE id = ANY($1::int[])', [expenseIds])
          : Promise.resolve({ rows: [] }),
      ]);

      const userIds = [...new Set(timeEntriesRes.rows.map((t) => t.user_id).filter(Boolean))];
      const staffRes = userIds.length
        ? await pool.query('SELECT id, name, role FROM users WHERE id = ANY($1::int[])', [userIds])
        : { rows: [] };

      const firmSettings = await pool.query(
        "SELECT key, value FROM olf_settings WHERE key IN ('firm_name','law_firm_id')"
      );
      const settings = Object.fromEntries(firmSettings.rows.map((r) => [r.key, r.value]));

      const ledes = generateLedes1998B({
        invoice,
        lineItems,
        timeEntries: timeEntriesRes.rows,
        expenses: expensesRes.rows,
        staff: staffRes.rows,
        firm: {
          law_firm_id: settings.law_firm_id || 'OPENLAWFIRM',
          law_firm_name: settings.firm_name || 'OpenLawFirm',
        },
      });

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.ledes"`);
      res.send(ledes);
    } catch (err) {
      console.error('LEDES generation error:', err);
      res.status(500).json({ error: 'LEDES generation failed', detail: String(err.message || err) });
    }
  });

  return router;
};
