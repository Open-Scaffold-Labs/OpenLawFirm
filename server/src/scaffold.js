/**
 * @openscaffold/core — OpenLawFirm server utilities
 */
const scaffold = {};

try {
  scaffold.asyncHandler = require('@openscaffold/core/server/asyncHandler').default
    || require('@openscaffold/core/server/asyncHandler');
} catch (e) { console.log('⚠ asyncHandler not available:', e.message); }

try {
  scaffold.queryBuilder = require('@openscaffold/core/server/queryBuilder').default
    || require('@openscaffold/core/server/queryBuilder');
} catch (e) { console.log('⚠ queryBuilder not available:', e.message); }

try {
  scaffold.crudFactory = require('@openscaffold/core/server/crudFactory').default
    || require('@openscaffold/core/server/crudFactory');
} catch (e) { console.log('⚠ crudFactory not available:', e.message); }

try {
  scaffold.validator = require('@openscaffold/core/server/validator').default
    || require('@openscaffold/core/server/validator');
} catch (e) { console.log('⚠ validator not available:', e.message); }

try {
  scaffold.numberGenerator = require('@openscaffold/core/server/numberGenerator').default
    || require('@openscaffold/core/server/numberGenerator');
} catch (e) { console.log('⚠ numberGenerator not available:', e.message); }

try {
  scaffold.accounting = require('@openscaffold/core/server/accounting').default
    || require('@openscaffold/core/server/accounting');
} catch (e) { console.log('⚠ accounting not available:', e.message); }

module.exports = scaffold;
