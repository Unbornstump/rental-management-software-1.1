const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadModule(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Date,
    Math,
    parseFloat,
    parseInt,
    setTimeout,
    clearTimeout,
    window: {},
    document: {},
    navigator: {},
    global: {}
  };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: fullPath });
  return context.module.exports;
}

test('buildPaymentPreviewState computes live totals and status', () => {
  const exports = loadModule('financials-pages.js');
  const preview = exports.FinancialsPages.buildPaymentPreviewState(
    {
      current_month_paid: 5000,
      current_month_expected: 10000,
      rent_amount: 10000,
      month_transactions: []
    },
    '2500'
  );

  assert.equal(preview.current_month_paid, 7500);
  assert.equal(preview.current_month_status, 'partial');
  assert.equal(preview.owed, 2500);
  assert.equal(preview.surplus, 0);
});

test('getTenantCardState treats tenants with no lease as inactive with a badge', () => {
  const context = loadModule('tenants-pages.js');
  const preview = context.TenantsPages.getTenantCardState(
    { id: 8 },
    [],
    [],
    []
  );

  assert.equal(preview.tab, 'inactive');
  assert.equal(preview.badge, 'No lease assigned');
});

test('getTenantCardState keeps ended leases in inactive state', () => {
  const context = loadModule('tenants-pages.js');
  const preview = context.TenantsPages.getTenantCardState(
    { id: 9 },
    [
      { tenant: 9, status: 'expired', start_date: '2024-01-01', end_date: '2024-02-01' }
    ],
    [],
    []
  );

  assert.equal(preview.tab, 'inactive');
  assert.equal(preview.badge, null);
});
