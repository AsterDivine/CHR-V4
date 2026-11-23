import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProcurementsForExport,
  computeFinancialSummary,
  buildExportFilename,
  escapeCsvCell,
  buildProcurementCsv,
  buildProcurementJson,
  formatExportCurrency,
} from './exportProcurement.js';

const SAMPLE_PROCUREMENTS = [
  {
    id: 1,
    reference_no: 'CHR-CAR-2024-001',
    title: 'Procurement of General Office Supplies for Q3-Q4 2024',
    description: 'Paper supplies, toner cartridges, and archival folders.',
    procurement_type: 'NP-53.9 Small Value Procurement',
    abc: 150000,
    budget_source: 'GAA 2024 - GAS',
    deadline: '2024-11-20',
    status: 'Awarded',
    awarded_amount: 142500,
    savings: 7500,
    awarded_bidder_name: 'Highland Paper & Office Depot',
    created_at: '2024-10-15 09:30:00',
    updated_at: '2024-11-02 14:15:00',
    bids: [
      {
        id: 1,
        company_name: 'Highland Paper & Office Depot',
        bidder_name: 'Roberto Flores',
        bid_amount: 142500,
        status: 'Selected',
        submitted_at: '2024-10-25 11:20:00',
        remarks: 'Complies with specs, delivery in 7 days.',
      },
    ],
    history: [
      {
        id: 1,
        action: 'Contract Awarded',
        previous_status: 'For Evaluation',
        new_status: 'Awarded',
        remarks: 'Awarded to "Highland Paper", savings PHP 7,500.00.',
        created_at: '2024-11-02 14:15:00',
      },
    ],
  },
  {
    id: 2,
    reference_number: 'CHR-CAR-2024-002',
    title: 'Supply and Delivery of Field Monitoring Laptops and Portable Scanners',
    abc: 450000,
    status: 'Open',
    awarded_amount: null,
    savings: null,
    total_bids: 0,
  },
  {
    id: 3,
    reference_no: 'CHR-CAR-2024-003',
    title: 'Preventive Maintenance, Parts Replacement, and Servicing for Official Vehicles',
    abc: 60000,
    status: 'For Evaluation',
    awarded_amount: null,
    savings: null,
    total_bids: 2,
  },
];

test('filterProcurementsForExport matches by Reference No. and Project Title case-insensitively', () => {
  assert.equal(filterProcurementsForExport(SAMPLE_PROCUREMENTS, '').length, 3);
  assert.equal(filterProcurementsForExport(SAMPLE_PROCUREMENTS, '   ').length, 3);

  const byRef = filterProcurementsForExport(SAMPLE_PROCUREMENTS, 'chr-car-2024-002');
  assert.equal(byRef.length, 1);
  assert.equal(byRef[0].id, 2);

  const byTitle = filterProcurementsForExport(SAMPLE_PROCUREMENTS, 'laptops');
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0].id, 2);

  const byPartialTitle = filterProcurementsForExport(SAMPLE_PROCUREMENTS, 'vehicles');
  assert.equal(byPartialTitle.length, 1);
  assert.equal(byPartialTitle[0].id, 3);

  const noMatch = filterProcurementsForExport(SAMPLE_PROCUREMENTS, 'NonExistent-999');
  assert.equal(noMatch.length, 0);
});

test('computeFinancialSummary computes savings and savings rate accurately', () => {
  const awardedSummary = computeFinancialSummary(SAMPLE_PROCUREMENTS[0]);
  assert.equal(awardedSummary.abc, 150000);
  assert.equal(awardedSummary.awardedAmount, 142500);
  assert.equal(awardedSummary.savings, 7500);
  assert.equal(awardedSummary.savingsRate, '5.0%');
  assert.equal(awardedSummary.totalBids, 1);

  const openSummary = computeFinancialSummary(SAMPLE_PROCUREMENTS[1]);
  assert.equal(openSummary.abc, 450000);
  assert.equal(openSummary.awardedAmount, null);
  assert.equal(openSummary.savings, null);
  assert.equal(openSummary.savingsRate, null);
  assert.equal(openSummary.totalBids, 0);
});

test('formatExportCurrency formats valid amounts and handles null/empty values', () => {
  assert.equal(formatExportCurrency(150000), '₱ 150,000.00');
  assert.equal(formatExportCurrency(null), '—');
  assert.equal(formatExportCurrency(undefined), '—');
});

test('buildExportFilename sanitizes reference number and extension', () => {
  assert.equal(
    buildExportFilename(SAMPLE_PROCUREMENTS[0], 'csv'),
    'CHR-CAR-2024-001_procurement_report.csv'
  );
  assert.equal(
    buildExportFilename({ reference_no: 'CHR/CAR 2024 #09' }, '.JSON'),
    'CHR_CAR_2024_09_procurement_report.json'
  );
});

test('escapeCsvCell properly quotes commas, double quotes, and newlines', () => {
  assert.equal(escapeCsvCell('plain'), 'plain');
  assert.equal(escapeCsvCell('a, b'), '"a, b"');
  assert.equal(escapeCsvCell('say "hello"'), '"say ""hello"""');
  assert.equal(escapeCsvCell('line1\nline2'), '"line1\nline2"');
  assert.equal(escapeCsvCell(null), '');
});

test('buildProcurementCsv includes summary, bids, and history with proper CSV escaping', () => {
  const csv = buildProcurementCsv(SAMPLE_PROCUREMENTS[0], '2026-11-23T02:00:00.000Z');
  assert.match(csv, /CHR-CAR CENTRALIZED PROCUREMENT REPORT/);
  assert.match(csv, /Reference No\.,CHR-CAR-2024-001/);
  assert.match(csv, /Approved Budget for the Contract \(ABC\),150000\.00/);
  assert.match(csv, /Highland Paper & Office Depot/);
  assert.match(csv, /"Complies with specs, delivery in 7 days\."/);
  assert.match(csv, /"Awarded to ""Highland Paper"", savings PHP 7,500\.00\."/);
});

test('buildProcurementJson outputs valid structured JSON', () => {
  const jsonText = buildProcurementJson(SAMPLE_PROCUREMENTS[0], '2026-11-23T02:00:00.000Z');
  const parsed = JSON.parse(jsonText);
  assert.equal(parsed.procurement.reference_no, 'CHR-CAR-2024-001');
  assert.equal(parsed.financial_summary.realized_savings, 7500);
  assert.equal(parsed.bids.length, 1);
  assert.equal(parsed.transaction_history.length, 1);
});
