// generate-ledes-1998b.js — generate LEDES 1998B invoice export.
//
// LEDES 1998B (Legal Electronic Data Exchange Standard, "the 1998B format")
// is a pipe-delimited (|) plain-text format used to submit attorney invoices
// to corporate clients and insurance carriers. Most large clients require
// LEDES-formatted electronic billing.
//
// Spec: 24 columns, header row of field names, one row per line item.
// Reference: https://ledes.org/ledes-format-1998b/
//
// This module reads from the OpenLawFirm schema (olf_invoices,
// olf_invoice_line_items, olf_time_entries, olf_expenses, olf_matters,
// olf_clients, users) and emits a string suitable for download as
// `<invoice_number>.ledes` with content-type text/plain.

// Field order per LEDES 1998B spec.
const LEDES_FIELDS = [
  'INVOICE_DATE',
  'INVOICE_NUMBER',
  'CLIENT_ID',
  'LAW_FIRM_MATTER_ID',
  'INVOICE_TOTAL',
  'BILLING_START_DATE',
  'BILLING_END_DATE',
  'INVOICE_DESCRIPTION',
  'LINE_ITEM_NUMBER',
  'EXP/FEE/INV_ADJ_TYPE',
  'LINE_ITEM_NUMBER_OF_UNITS',
  'LINE_ITEM_ADJUSTMENT_AMOUNT',
  'LINE_ITEM_TOTAL',
  'LINE_ITEM_DATE',
  'LINE_ITEM_TASK_CODE',
  'LINE_ITEM_EXPENSE_CODE',
  'LINE_ITEM_ACTIVITY_CODE',
  'TIMEKEEPER_ID',
  'LINE_ITEM_DESCRIPTION',
  'LAW_FIRM_ID',
  'LINE_ITEM_UNIT_COST',
  'TIMEKEEPER_NAME',
  'TIMEKEEPER_CLASSIFICATION',
  'CLIENT_MATTER_ID',
];

const PIPE = '|';

/** ISO date (YYYY-MM-DD) or empty string */
function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

/** Format a number for LEDES (no thousands separator, 2 decimals) */
function fmtMoney(n) {
  const v = parseFloat(n || 0);
  return v.toFixed(2);
}

/** Escape a single LEDES field — strip pipes and newlines, trim. */
function esc(value) {
  if (value == null) return '';
  return String(value).replace(/[|\r\n]+/g, ' ').trim();
}

/**
 * Generate a LEDES 1998B invoice export string.
 *
 * @param {object} ctx
 * @param {object} ctx.invoice - olf_invoices row + matter/client joins
 * @param {Array} ctx.lineItems - olf_invoice_line_items rows
 * @param {Array} ctx.timeEntries - olf_time_entries rows for fee lines (lookup by time_entry_id)
 * @param {Array} ctx.expenses - olf_expenses rows for expense lines (lookup by expense_id)
 * @param {Array} ctx.staff - users rows for timekeeper info
 * @param {object} [ctx.firm] - { law_firm_id, law_firm_name }
 * @returns {string} LEDES 1998B text content
 */
function generateLedes1998B({ invoice, lineItems, timeEntries, expenses, staff, firm = {} }) {
  const teById = new Map((timeEntries || []).map((t) => [t.id, t]));
  const exById = new Map((expenses || []).map((e) => [e.id, e]));
  const userById = new Map((staff || []).map((u) => [u.id, u]));

  // Compute billing window from time-entry dates (or invoice date if none)
  const dates = (timeEntries || []).map((t) => t.entry_date).filter(Boolean);
  const billingStart = dates.length ? fmtDate(dates.reduce((a, b) => (a < b ? a : b))) : fmtDate(invoice.invoice_date);
  const billingEnd = dates.length ? fmtDate(dates.reduce((a, b) => (a > b ? a : b))) : fmtDate(invoice.invoice_date);

  const invoiceTotal = fmtMoney(invoice.total_amount);
  const invoiceDate = fmtDate(invoice.invoice_date);
  const clientId = String(invoice.client_id || '');
  const lawFirmMatterId = esc(invoice.matter_number);
  const clientMatterId = esc(invoice.client_matter_id || invoice.matter_number);
  const lawFirmId = esc(firm.law_firm_id || 'OPENLAWFIRM');
  const invoiceDescription = esc(
    invoice.matter_title
      ? `${invoice.matter_number} — ${invoice.matter_title}`
      : invoice.matter_number || ''
  );

  // Header row
  const lines = [LEDES_FIELDS.join(PIPE)];

  // Body rows
  (lineItems || []).forEach((li, idx) => {
    const lineItemNumber = String(idx + 1);
    const isFee = li.line_type === 'fee';
    const adjType = isFee ? 'F' : 'E';

    // Look up the source record (time entry or expense)
    const te = isFee && li.time_entry_id ? teById.get(li.time_entry_id) : null;
    const ex = !isFee && li.expense_id ? exById.get(li.expense_id) : null;

    const lineDate = fmtDate(te?.entry_date || ex?.expense_date || invoice.invoice_date);
    const units = parseFloat(li.quantity || (te ? te.hours : 1)).toFixed(2);
    const adjustment = '0.00';
    const lineTotal = fmtMoney(li.amount);
    const unitCost = fmtMoney(li.rate || (te ? te.rate : li.amount));

    const taskCode = isFee ? esc(te?.task_code || '') : '';
    const expenseCode = !isFee ? esc(ex?.expense_code || '') : '';
    const activityCode = isFee ? esc(te?.activity_code || '') : '';

    const timekeeperId = isFee && te ? String(te.user_id) : '';
    const timekeeperUser = isFee && te ? userById.get(te.user_id) : null;
    const timekeeperName = timekeeperUser ? esc(timekeeperUser.name) : '';
    const timekeeperClass = timekeeperUser ? esc(timekeeperUser.role).toUpperCase() : '';

    const description = esc(li.description);

    const row = [
      invoiceDate,
      esc(invoice.invoice_number),
      clientId,
      lawFirmMatterId,
      invoiceTotal,
      billingStart,
      billingEnd,
      invoiceDescription,
      lineItemNumber,
      adjType,
      units,
      adjustment,
      lineTotal,
      lineDate,
      taskCode,
      expenseCode,
      activityCode,
      timekeeperId,
      description,
      lawFirmId,
      unitCost,
      timekeeperName,
      timekeeperClass,
      clientMatterId,
    ];

    lines.push(row.join(PIPE));
  });

  // LEDES files traditionally end with a trailing newline
  return lines.join('\n') + '\n';
}

module.exports = { generateLedes1998B, LEDES_FIELDS };
