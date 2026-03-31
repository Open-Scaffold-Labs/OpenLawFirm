const express = require('express');

module.exports = function (pool, logAudit) {
  const router = express.Router();

  /* ── Trust accounts ───────────────────────────────── */
  router.get('/accounts', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM olf_trust_accounts ORDER BY account_name'
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* ── Trust transactions ───────────────────────────── */
  router.get('/transactions', async (req, res) => {
    try {
      const { account_id, client_id, matter_id } = req.query;
      let sql = `
        SELECT tt.*, c.first_name as client_first, c.last_name as client_last,
               m.matter_number, u.full_name as created_by_name
        FROM olf_trust_transactions tt
        LEFT JOIN olf_clients c ON tt.client_id = c.id
        LEFT JOIN olf_matters m ON tt.matter_id = m.id
        LEFT JOIN users u ON tt.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      if (account_id) { params.push(account_id); sql += ` AND tt.trust_account_id = $${params.length}`; }
      if (client_id) { params.push(client_id); sql += ` AND tt.client_id = $${params.length}`; }
      if (matter_id) { params.push(matter_id); sql += ` AND tt.matter_id = $${params.length}`; }
      sql += ' ORDER BY tt.transaction_date DESC, tt.id DESC';
      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* ── Deposit to trust ─────────────────────────────── */
  router.post('/deposit', async (req, res) => {
    try {
      const { trust_account_id, client_id, matter_id, amount, description, check_number, reference_number } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');

        // Update trust account balance
        const acct = await dbClient.query(
          'UPDATE olf_trust_accounts SET balance = balance + $1 WHERE id = $2 RETURNING balance',
          [amount, trust_account_id]
        );
        const newBalance = parseFloat(acct.rows[0].balance);

        // Record transaction
        const txn = await dbClient.query(
          `INSERT INTO olf_trust_transactions (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, check_number, reference_number, transaction_date, created_by)
           VALUES ($1, $2, $3, 'deposit', $4, $5, $6, $7, $8, CURRENT_DATE, $9) RETURNING *`,
          [trust_account_id, client_id, matter_id, amount, newBalance, description, check_number, reference_number, req.user.id]
        );

        // Update client trust ledger
        await dbClient.query(`
          INSERT INTO olf_client_trust_ledger (trust_account_id, client_id, matter_id, balance)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (trust_account_id, client_id, matter_id)
          DO UPDATE SET balance = olf_client_trust_ledger.balance + $4, last_updated = NOW()
        `, [trust_account_id, client_id, matter_id, amount]);

        await dbClient.query('COMMIT');
        await logAudit('trust', txn.rows[0].id, req.user.id, 'deposit', `$${amount} deposit for client ${client_id}`);
        res.status(201).json(txn.rows[0]);
      } catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
      } finally {
        dbClient.release();
      }
    } catch (err) {
      console.error('Trust deposit error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* ── Disbursement from trust ──────────────────────── */
  router.post('/disbursement', async (req, res) => {
    try {
      const { trust_account_id, client_id, matter_id, amount, description, check_number, reference_number } = req.body;
      if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

      const dbClient = await pool.connect();
      try {
        await dbClient.query('BEGIN');

        // Check client trust balance first (three-way reconciliation guard)
        const clientBalance = await dbClient.query(
          'SELECT balance FROM olf_client_trust_ledger WHERE trust_account_id = $1 AND client_id = $2 AND matter_id = $3',
          [trust_account_id, client_id, matter_id]
        );
        const available = clientBalance.rows.length ? parseFloat(clientBalance.rows[0].balance) : 0;
        if (available < parseFloat(amount)) {
          await dbClient.query('ROLLBACK');
          return res.status(400).json({ error: `Insufficient client trust balance. Available: $${available.toFixed(2)}` });
        }

        // Update trust account balance
        const acct = await dbClient.query(
          'UPDATE olf_trust_accounts SET balance = balance - $1 WHERE id = $2 RETURNING balance',
          [amount, trust_account_id]
        );
        const newBalance = parseFloat(acct.rows[0].balance);

        // Record transaction (negative amount for disbursement)
        const txn = await dbClient.query(
          `INSERT INTO olf_trust_transactions (trust_account_id, client_id, matter_id, transaction_type, amount, running_balance, description, check_number, reference_number, transaction_date, created_by)
           VALUES ($1, $2, $3, 'disbursement', $4, $5, $6, $7, $8, CURRENT_DATE, $9) RETURNING *`,
          [trust_account_id, client_id, matter_id, -parseFloat(amount), newBalance, description, check_number, reference_number, req.user.id]
        );

        // Update client trust ledger
        await dbClient.query(
          `UPDATE olf_client_trust_ledger SET balance = balance - $1, last_updated = NOW()
           WHERE trust_account_id = $2 AND client_id = $3 AND matter_id = $4`,
          [amount, trust_account_id, client_id, matter_id]
        );

        await dbClient.query('COMMIT');
        await logAudit('trust', txn.rows[0].id, req.user.id, 'disbursement', `$${amount} disbursement for client ${client_id}`);
        res.status(201).json(txn.rows[0]);
      } catch (err) {
        await dbClient.query('ROLLBACK');
        throw err;
      } finally {
        dbClient.release();
      }
    } catch (err) {
      console.error('Trust disbursement error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* ── Client trust ledger (three-way reconciliation) ── */
  router.get('/client-ledger', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT ctl.*, c.first_name as client_first, c.last_name as client_last,
               m.matter_number, m.title as matter_title, ta.account_name
        FROM olf_client_trust_ledger ctl
        LEFT JOIN olf_clients c ON ctl.client_id = c.id
        LEFT JOIN olf_matters m ON ctl.matter_id = m.id
        LEFT JOIN olf_trust_accounts ta ON ctl.trust_account_id = ta.id
        ORDER BY c.last_name, m.matter_number
      `);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  /* ── Three-way reconciliation report ─────────────── */
  router.get('/reconciliation', async (req, res) => {
    try {
      const [accounts, clientLedger, transactions] = await Promise.all([
        pool.query('SELECT id, account_name, balance FROM olf_trust_accounts'),
        pool.query('SELECT trust_account_id, SUM(balance) as total FROM olf_client_trust_ledger GROUP BY trust_account_id'),
        pool.query(`
          SELECT trust_account_id, SUM(amount) as net_total
          FROM olf_trust_transactions
          GROUP BY trust_account_id
        `)
      ]);

      const report = accounts.rows.map(acct => {
        const clientTotal = clientLedger.rows.find(c => c.trust_account_id === acct.id)?.total || 0;
        const txnTotal = transactions.rows.find(t => t.trust_account_id === acct.id)?.net_total || 0;
        const bankBalance = parseFloat(acct.balance);
        const clientSum = parseFloat(clientTotal);
        return {
          account: acct.account_name,
          bank_balance: bankBalance,
          client_ledger_total: clientSum,
          transaction_net: parseFloat(txnTotal),
          balanced: Math.abs(bankBalance - clientSum) < 0.01,
          variance: bankBalance - clientSum
        };
      });

      res.json(report);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
