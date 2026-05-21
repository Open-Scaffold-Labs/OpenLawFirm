// generate-invoice-pdf.js — server-side invoice PDF generator.
//
// Follows the same pattern as openscaffold-core's generate-proposal-pdf.js:
// emit a Python reportlab script as a series of strings (NOT a JS template
// literal, to avoid f-string vs ${} conflicts) and execute via child_process.
//
// Brand colors per openscaffold-core/DOCUMENT-STANDARDS.md:
//   Electric Indigo #4F46E5 (primary)
//   Navy            #1B3A5C (headings)

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Generate a PDF for the given invoice payload.
 *
 * @param {object} invoice - The full invoice object including line_items,
 *   payments, matter info, client info, and firm settings.
 * @param {string} outputPath - Where to write the PDF.
 * @returns {Promise<string>} the outputPath (resolved when generation completes)
 */
async function generateInvoicePDF(invoice, outputPath) {
  const dataJson = JSON.stringify(invoice).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safePath = outputPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  const L = [];
  L.push('import json, sys');
  L.push('from reportlab.lib.pagesizes import letter');
  L.push('from reportlab.lib.units import inch');
  L.push('from reportlab.lib.colors import HexColor');
  L.push('from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable');
  L.push('from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle');
  L.push('from reportlab.lib.enums import TA_LEFT, TA_RIGHT');
  L.push('from datetime import datetime');
  L.push('');
  L.push("BRAND  = HexColor('#4F46E5')");
  L.push("NAVY   = HexColor('#1B3A5C')");
  L.push("LIGHT  = HexColor('#ECECFB')");
  L.push("GRAY   = HexColor('#F8FAFC')");
  L.push("BORDER = HexColor('#E2E8F0')");
  L.push("TEXT   = HexColor('#334155')");
  L.push("MUTED  = HexColor('#94A3B8')");
  L.push("RED    = HexColor('#DC2626')");
  L.push("GREEN  = HexColor('#059669')");
  L.push('');
  L.push("data = json.loads('''" + dataJson + "''')");
  L.push("output_path = '''" + safePath + "'''");
  L.push('');
  L.push('doc = SimpleDocTemplate(output_path, pagesize=letter,');
  L.push('  leftMargin=0.75*inch, rightMargin=0.75*inch,');
  L.push('  topMargin=0.5*inch, bottomMargin=0.75*inch)');
  L.push('styles = getSampleStyleSheet()');
  L.push('');
  L.push("styles.add(ParagraphStyle('InvoiceTitle', parent=styles['Title'], fontSize=24, textColor=NAVY, spaceAfter=4, alignment=TA_LEFT))");
  L.push("styles.add(ParagraphStyle('TagRight', parent=styles['Normal'], fontSize=10, textColor=BRAND, alignment=TA_RIGHT))");
  L.push("styles.add(ParagraphStyle('SectionHead', parent=styles['Heading2'], fontSize=12, textColor=NAVY, spaceBefore=14, spaceAfter=6))");
  L.push("styles.add(ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, textColor=TEXT, leading=14, spaceAfter=4))");
  L.push("styles.add(ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=MUTED, leading=11))");
  L.push("styles.add(ParagraphStyle('RightSmall', parent=styles['Normal'], fontSize=10, textColor=TEXT, alignment=TA_RIGHT))");
  L.push("styles.add(ParagraphStyle('RightBold', parent=styles['Normal'], fontSize=11, textColor=NAVY, alignment=TA_RIGHT, fontName='Helvetica-Bold'))");
  L.push("styles.add(ParagraphStyle('TotalBalance', parent=styles['Normal'], fontSize=14, textColor=BRAND, alignment=TA_RIGHT, fontName='Helvetica-Bold'))");
  L.push('');
  L.push('story = []');
  L.push('');
  // ─── Header ──────────────────────────────────────────────
  L.push("firm_name = data.get('firm_name', 'Law Firm')");
  L.push("header = [[");
  L.push("    Paragraph('<b>' + firm_name + '</b>', styles['InvoiceTitle']),");
  L.push("    Paragraph('INVOICE', styles['TagRight']),");
  L.push("]]");
  L.push("ht = Table(header, colWidths=[4.5*inch, 2.5*inch])");
  L.push("ht.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 0)]))");
  L.push("story.append(ht)");
  L.push('');
  // ─── Firm + bill-to ─────────────────────────────────────
  L.push("firm_addr = data.get('firm_address', '')");
  L.push("firm_phone = data.get('firm_phone', '')");
  L.push("firm_email = data.get('firm_email', '')");
  L.push("firm_block = []");
  L.push("if firm_addr:  firm_block.append(firm_addr)");
  L.push("if firm_phone: firm_block.append(firm_phone)");
  L.push("if firm_email: firm_block.append(firm_email)");
  L.push("firm_info = '<br/>'.join(firm_block)");
  L.push('');
  L.push("client_company = data.get('company_name')");
  L.push("client_first = data.get('client_first') or ''");
  L.push("client_last  = data.get('client_last') or ''");
  L.push("client_name = client_company if client_company else (client_first + ' ' + client_last).strip()");
  L.push("client_lines = ['<b>' + client_name + '</b>']");
  L.push("if data.get('address'): client_lines.append(data['address'])");
  L.push("city_state_zip = []");
  L.push("if data.get('city'):  city_state_zip.append(data['city'])");
  L.push("if data.get('state') and data.get('zip'): city_state_zip.append(data['state'] + ' ' + data['zip'])");
  L.push("elif data.get('state'): city_state_zip.append(data['state'])");
  L.push("elif data.get('zip'):   city_state_zip.append(data['zip'])");
  L.push("if city_state_zip: client_lines.append(', '.join(city_state_zip))");
  L.push("if data.get('client_email'): client_lines.append(data['client_email'])");
  L.push("bill_to = '<br/>'.join(client_lines)");
  L.push('');
  L.push("info_data = [[");
  L.push("    Paragraph(firm_info or '&nbsp;', styles['Small']),");
  L.push("    Paragraph('<b>Bill To:</b><br/>' + bill_to, styles['Body']),");
  L.push("]]");
  L.push("it = Table(info_data, colWidths=[3.5*inch, 3.5*inch])");
  L.push("it.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))");
  L.push("story.append(Spacer(1, 8))");
  L.push("story.append(it)");
  L.push('');
  // ─── Invoice meta ────────────────────────────────────────
  L.push("def fmt_date(s):");
  L.push("    if not s: return ''");
  L.push("    try: return datetime.fromisoformat(str(s).replace('Z','+00:00')).strftime('%B %d, %Y')");
  L.push("    except: return str(s)[:10]");
  L.push('');
  L.push("meta_rows = [");
  L.push("    [Paragraph('<b>Invoice #</b>', styles['Small']), Paragraph(data.get('invoice_number',''), styles['Body'])],");
  L.push("    [Paragraph('<b>Invoice Date</b>', styles['Small']), Paragraph(fmt_date(data.get('invoice_date')), styles['Body'])],");
  L.push("    [Paragraph('<b>Due Date</b>', styles['Small']), Paragraph(fmt_date(data.get('due_date')), styles['Body'])],");
  L.push("    [Paragraph('<b>Matter</b>', styles['Small']), Paragraph((data.get('matter_number','') + ' — ' + data.get('matter_title','')).strip(' — '), styles['Body'])],");
  L.push("]");
  L.push("meta = Table(meta_rows, colWidths=[1.4*inch, 5.6*inch])");
  L.push("meta.setStyle(TableStyle([");
  L.push("    ('VALIGN', (0,0), (-1,-1), 'TOP'),");
  L.push("    ('BOTTOMPADDING', (0,0), (-1,-1), 2),");
  L.push("    ('TOPPADDING', (0,0), (-1,-1), 2),");
  L.push("]))");
  L.push("story.append(Spacer(1, 12))");
  L.push("story.append(meta)");
  L.push("story.append(Spacer(1, 8))");
  L.push("story.append(HRFlowable(width='100%', thickness=1, color=BORDER))");
  L.push('');
  // ─── Line items ──────────────────────────────────────────
  L.push("line_items = data.get('line_items', [])");
  L.push("fee_items = [li for li in line_items if li.get('line_type') == 'fee']");
  L.push("exp_items = [li for li in line_items if li.get('line_type') == 'expense']");
  L.push('');
  L.push("def render_line_table(items, header_label, show_qty_rate=True):");
  L.push("    if not items: return None");
  L.push("    if show_qty_rate:");
  L.push("        header = [");
  L.push("            Paragraph('<b>' + header_label + '</b>', styles['Small']),");
  L.push("            Paragraph('<b>Hours</b>', styles['Small']),");
  L.push("            Paragraph('<b>Rate</b>', styles['Small']),");
  L.push("            Paragraph('<b>Amount</b>', ParagraphStyle('hR', parent=styles['Small'], alignment=TA_RIGHT)),");
  L.push("        ]");
  L.push("        rows = [header]");
  L.push("        for li in items:");
  L.push("            amount = float(li.get('amount', 0))");
  L.push("            qty = float(li.get('quantity', 0))");
  L.push("            rate = float(li.get('rate', 0))");
  L.push("            rows.append([");
  L.push("                Paragraph(li.get('description',''), styles['Body']),");
  L.push("                Paragraph('{:.1f}'.format(qty), styles['Body']),");
  L.push("                Paragraph('${:,.2f}'.format(rate), styles['Body']),");
  L.push("                Paragraph('${:,.2f}'.format(amount), styles['RightSmall']),");
  L.push("            ])");
  L.push("        widths = [3.5*inch, 0.8*inch, 1.0*inch, 1.5*inch]");
  L.push("    else:");
  L.push("        header = [Paragraph('<b>' + header_label + '</b>', styles['Small']),");
  L.push("                  Paragraph('<b>Amount</b>', ParagraphStyle('hR', parent=styles['Small'], alignment=TA_RIGHT))]");
  L.push("        rows = [header]");
  L.push("        for li in items:");
  L.push("            amount = float(li.get('amount', 0))");
  L.push("            rows.append([");
  L.push("                Paragraph(li.get('description',''), styles['Body']),");
  L.push("                Paragraph('${:,.2f}'.format(amount), styles['RightSmall']),");
  L.push("            ])");
  L.push("        widths = [5.3*inch, 1.5*inch]");
  L.push("    t = Table(rows, colWidths=widths)");
  L.push("    t.setStyle(TableStyle([");
  L.push("        ('BACKGROUND', (0,0), (-1,0), GRAY),");
  L.push("        ('LINEBELOW', (0,0), (-1,0), 0.5, NAVY),");
  L.push("        ('LINEBELOW', (0,1), (-1,-1), 0.25, BORDER),");
  L.push("        ('VALIGN', (0,0), (-1,-1), 'TOP'),");
  L.push("        ('TOPPADDING', (0,0), (-1,-1), 5),");
  L.push("        ('BOTTOMPADDING', (0,0), (-1,-1), 5),");
  L.push("        ('LEFTPADDING', (0,0), (-1,-1), 6),");
  L.push("        ('RIGHTPADDING', (0,0), (-1,-1), 6),");
  L.push("    ]))");
  L.push("    return t");
  L.push('');
  L.push("ft = render_line_table(fee_items, 'Professional Fees', show_qty_rate=True)");
  L.push("if ft:");
  L.push("    story.append(Spacer(1, 14))");
  L.push("    story.append(ft)");
  L.push('');
  L.push("et = render_line_table(exp_items, 'Expenses', show_qty_rate=False)");
  L.push("if et:");
  L.push("    story.append(Spacer(1, 10))");
  L.push("    story.append(et)");
  L.push('');
  // ─── Totals ─────────────────────────────────────────────
  L.push("subtotal_fees = float(data.get('subtotal_fees', 0))");
  L.push("subtotal_exp  = float(data.get('subtotal_expenses', 0))");
  L.push("total         = float(data.get('total_amount', 0))");
  L.push("balance_due   = float(data.get('balance_due', 0))");
  L.push("payments_total = total - balance_due");
  L.push('');
  L.push("totals_rows = []");
  L.push("if subtotal_fees > 0: totals_rows.append([");
  L.push("    Paragraph('Subtotal — Fees', styles['Body']),");
  L.push("    Paragraph('${:,.2f}'.format(subtotal_fees), styles['RightSmall'])])");
  L.push("if subtotal_exp > 0: totals_rows.append([");
  L.push("    Paragraph('Subtotal — Expenses', styles['Body']),");
  L.push("    Paragraph('${:,.2f}'.format(subtotal_exp), styles['RightSmall'])])");
  L.push("totals_rows.append([");
  L.push("    Paragraph('<b>Total</b>', styles['Body']),");
  L.push("    Paragraph('${:,.2f}'.format(total), styles['RightBold'])])");
  L.push("if payments_total > 0: totals_rows.append([");
  L.push("    Paragraph('Payments received', styles['Body']),");
  L.push("    Paragraph('(${:,.2f})'.format(payments_total), styles['RightSmall'])])");
  L.push("totals_rows.append([");
  L.push("    Paragraph('<b>Balance Due</b>', styles['Body']),");
  L.push("    Paragraph('${:,.2f}'.format(balance_due), styles['TotalBalance'])])");
  L.push('');
  L.push("totals_table = Table(totals_rows, colWidths=[4.3*inch, 2.5*inch])");
  L.push("totals_table.setStyle(TableStyle([");
  L.push("    ('LINEABOVE', (0,-1), (-1,-1), 1.0, BRAND),");
  L.push("    ('VALIGN', (0,0), (-1,-1), 'TOP'),");
  L.push("    ('TOPPADDING', (0,0), (-1,-1), 3),");
  L.push("    ('BOTTOMPADDING', (0,0), (-1,-1), 3),");
  L.push("]))");
  L.push("story.append(Spacer(1, 12))");
  L.push("story.append(totals_table)");
  L.push('');
  // ─── Payment history ────────────────────────────────────
  L.push("payments = data.get('payments', []) or []");
  L.push("if payments:");
  L.push("    story.append(Paragraph('Payment History', styles['SectionHead']))");
  L.push("    p_rows = [[Paragraph('<b>Date</b>', styles['Small']),");
  L.push("              Paragraph('<b>Method</b>', styles['Small']),");
  L.push("              Paragraph('<b>Reference</b>', styles['Small']),");
  L.push("              Paragraph('<b>Amount</b>', ParagraphStyle('pR', parent=styles['Small'], alignment=TA_RIGHT))]]");
  L.push("    for p in payments:");
  L.push("        p_rows.append([");
  L.push("            Paragraph(fmt_date(p.get('payment_date')), styles['Body']),");
  L.push("            Paragraph((p.get('payment_method') or '').title(), styles['Body']),");
  L.push("            Paragraph(p.get('reference_number') or '—', styles['Body']),");
  L.push("            Paragraph('${:,.2f}'.format(float(p.get('amount', 0))), styles['RightSmall']),");
  L.push("        ])");
  L.push("    pt = Table(p_rows, colWidths=[1.4*inch, 1.4*inch, 2.2*inch, 1.8*inch])");
  L.push("    pt.setStyle(TableStyle([");
  L.push("        ('BACKGROUND', (0,0), (-1,0), GRAY),");
  L.push("        ('LINEBELOW', (0,0), (-1,0), 0.5, NAVY),");
  L.push("        ('LINEBELOW', (0,1), (-1,-1), 0.25, BORDER),");
  L.push("        ('VALIGN', (0,0), (-1,-1), 'TOP'),");
  L.push("        ('TOPPADDING', (0,0), (-1,-1), 4),");
  L.push("        ('BOTTOMPADDING', (0,0), (-1,-1), 4),");
  L.push("        ('LEFTPADDING', (0,0), (-1,-1), 6),");
  L.push("        ('RIGHTPADDING', (0,0), (-1,-1), 6),");
  L.push("    ]))");
  L.push("    story.append(pt)");
  L.push('');
  // ─── Footer ─────────────────────────────────────────────
  L.push("story.append(Spacer(1, 30))");
  L.push("story.append(HRFlowable(width='100%', thickness=0.5, color=BORDER))");
  L.push("story.append(Spacer(1, 6))");
  L.push("terms = data.get('payment_terms') or 'Payment due within 30 days of invoice date. Trust account balances may be applied against this invoice with client authorization.'");
  L.push("story.append(Paragraph(terms, styles['Small']))");
  L.push('');
  L.push("doc.build(story)");

  const script = L.join('\n');
  const scriptPath = path.join(os.tmpdir(), `olf-invoice-${invoice.id}-${Date.now()}.py`);
  fs.writeFileSync(scriptPath, script);

  try {
    execSync(`python3 "${scriptPath}"`, { stdio: 'pipe' });
  } finally {
    try { fs.unlinkSync(scriptPath); } catch {}
  }

  return outputPath;
}

module.exports = { generateInvoicePDF };
