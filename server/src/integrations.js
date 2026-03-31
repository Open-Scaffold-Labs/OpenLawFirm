/**
 * @openscaffold/integrations — OpenLawFirm
 *
 * Adapters: PDFBuilder (invoices, LEDES export), EmailBuilder (client comms),
 * SignatureService (engagement letters, retainer agreements), OCREngine (document intake)
 */
const adapters = {};

try {
  const { PDFBuilder } = require('@openscaffold/integrations/pdf');
  adapters.PDFBuilder = PDFBuilder;
  console.log('✓ PDFBuilder: ready');
} catch (e) {
  console.log('⚠ PDFBuilder not available:', e.message);
}

try {
  const { EmailBuilder } = require('@openscaffold/integrations/email');
  adapters.EmailBuilder = EmailBuilder;
  console.log('✓ EmailBuilder: ready');
} catch (e) {
  console.log('⚠ EmailBuilder not available:', e.message);
}

try {
  const { SignatureService } = require('@openscaffold/integrations/signature');
  adapters.SignatureService = SignatureService;
  console.log('✓ SignatureService: ready');
} catch (e) {
  console.log('⚠ SignatureService not available:', e.message);
}

try {
  const { OCREngine } = require('@openscaffold/integrations/ocr');
  adapters.OCREngine = OCREngine;
  console.log('✓ OCREngine: ready');
} catch (e) {
  console.log('⚠ OCREngine not available:', e.message);
}

try {
  const { PresentationBuilder } = require('@openscaffold/integrations/presentation');
  adapters.PresentationBuilder = PresentationBuilder;
  console.log('✓ PresentationBuilder: ready');
} catch (e) {
  console.log('⚠ PresentationBuilder not available:', e.message);
}

module.exports = adapters;
