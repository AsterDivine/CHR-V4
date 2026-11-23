/**
 * =============================================================================
 * CENTRALIZED PROCUREMENT TRACKING AND FINANCIAL MONITORING SYSTEM (CHR-CAR)
 * File: src/utils/exportProcurement.js
 * =============================================================================
 *
 * Pure utility functions for searching, summarizing, and exporting
 * CHR-CAR procurement records (CSV and JSON formats).
 */

/**
 * Normalizes the procurement reference number across backend field aliases.
 *
 * @param {object} procurement
 * @returns {string}
 */
export function getReferenceNumber(procurement) {
  if (!procurement) return '';
  return String(procurement.reference_no || procurement.reference_number || '').trim();
}

/**
 * Filters a list of procurement records by Reference No. or Project Title.
 *
 * @template T
 * @param {Array<T>} procurements - Loaded procurement records from MySQL.
 * @param {string} [query]        - Search text entered by the user.
 * @returns {Array<T>} Matching procurement records.
 */
export function filterProcurementsForExport(procurements, query = '') {
  if (!Array.isArray(procurements)) {
    return [];
  }

  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) {
    return procurements;
  }

  return procurements.filter((record) => {
    const refNo = getReferenceNumber(record).toLowerCase();
    const title = String(record?.title || '').toLowerCase();
    return refNo.includes(normalizedQuery) || title.includes(normalizedQuery);
  });
}

/**
 * Formats a numeric value into Philippine Peso currency format.
 *
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatExportCurrency(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return '—';
  }
  return (
    '₱ ' +
    Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Computes financial metrics for a single procurement record.
 *
 * @param {object} procurement
 * @returns {{ abc: number, awardedAmount: number|null, savings: number|null, savingsRate: string|null, totalBids: number }}
 */
export function computeFinancialSummary(procurement) {
  const abc = Number(procurement?.abc || 0);
  const hasAwarded =
    procurement?.awarded_amount !== null &&
    procurement?.awarded_amount !== undefined &&
    procurement?.awarded_amount !== '';
  const awardedAmount = hasAwarded ? Number(procurement.awarded_amount) : null;

  let savings = null;
  if (
    procurement?.savings !== null &&
    procurement?.savings !== undefined &&
    procurement?.savings !== ''
  ) {
    savings = Number(procurement.savings);
  } else if (awardedAmount !== null) {
    savings = abc - awardedAmount;
  }

  const savingsRate =
    savings !== null && abc > 0 ? `${((savings / abc) * 100).toFixed(1)}%` : null;

  const totalBids = Array.isArray(procurement?.bids)
    ? procurement.bids.length
    : Number(procurement?.total_bids || 0);

  return {
    abc,
    awardedAmount,
    savings,
    savingsRate,
    totalBids,
  };
}

/**
 * Builds a filesystem-safe export filename for a procurement record.
 *
 * @param {object} procurement
 * @param {string} extension - File extension without leading dot (e.g. 'csv', 'json').
 * @returns {string}
 */
export function buildExportFilename(procurement, extension = 'csv') {
  const rawRef = getReferenceNumber(procurement) || `procurement-${procurement?.id || 'record'}`;
  const safeRef = rawRef
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'procurement';
  const safeExt = String(extension || 'csv').replace(/^\./, '').toLowerCase();
  return `${safeRef}_procurement_report.${safeExt}`;
}

/**
 * Escapes a single cell value according to RFC 4180 CSV rules.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a 2D array of rows into an RFC 4180 CSV string.
 *
 * @param {Array<Array<unknown>>} rows
 * @returns {string}
 */
function rowsToCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/**
 * Generates a structured CSV report for a single selected procurement record,
 * including its project summary, financial metrics, submitted bids, and audit trail.
 *
 * @param {object} procurement
 * @param {string} [exportedAtIso]
 * @returns {string}
 */
export function buildProcurementCsv(procurement, exportedAtIso = new Date().toISOString()) {
  const refNo = getReferenceNumber(procurement);
  const finance = computeFinancialSummary(procurement);
  const bids = Array.isArray(procurement?.bids) ? procurement.bids : [];
  const history = Array.isArray(procurement?.history) ? procurement.history : [];

  const rows = [
    ['CHR-CAR CENTRALIZED PROCUREMENT REPORT'],
    ['Agency', 'Commission on Human Rights - Cordillera Administrative Region (CHR-CAR)'],
    ['Exported At', exportedAtIso],
    [],
    ['SECTION 1: PROCUREMENT RECORD SUMMARY'],
    ['Field', 'Value'],
    ['Reference No.', refNo],
    ['Project Title', procurement?.title || ''],
    ['Procurement Type / Mode', procurement?.procurement_type || procurement?.procurement_mode || '—'],
    ['Status', procurement?.status || '—'],
    ['Budget Source', procurement?.budget_source || '—'],
    ['Submission Deadline', procurement?.deadline || '—'],
    ['Approved Budget for the Contract (ABC)', finance.abc.toFixed(2)],
    [
      'Awarded Contract Amount',
      finance.awardedAmount !== null ? finance.awardedAmount.toFixed(2) : 'Pending Award',
    ],
    [
      'Realized Savings (ABC - Awarded)',
      finance.savings !== null ? finance.savings.toFixed(2) : 'N/A',
    ],
    ['Savings Rate', finance.savingsRate || 'N/A'],
    ['Winning Supplier', procurement?.awarded_bidder_name || 'Pending Selection'],
    ['Created At', procurement?.created_at || '—'],
    ['Last Updated', procurement?.updated_at || procurement?.created_at || '—'],
    ['Description', procurement?.description || ''],
    [],
    ['SECTION 2: SUBMITTED SUPPLIER QUOTATIONS (BIDS)'],
    [
      'Bid ID',
      'Company Name',
      'Representative',
      'Bid Amount (PHP)',
      'Variance from ABC (PHP)',
      'Status',
      'Submitted At',
      'Remarks',
    ],
  ];

  if (bids.length === 0) {
    rows.push(['No supplier quotations recorded for this procurement.']);
  } else {
    for (const bid of bids) {
      const bidAmount = Number(bid.bid_amount || 0);
      const variance = finance.abc - bidAmount;
      rows.push([
        bid.id ?? '',
        bid.company_name || bid.bidder_name || '',
        bid.bidder_name || bid.representative_name || '',
        bidAmount.toFixed(2),
        variance.toFixed(2),
        bid.status || '',
        bid.submitted_at || bid.created_at || '',
        bid.remarks || '',
      ]);
    }
  }

  rows.push([]);
  rows.push(['SECTION 3: TRANSACTION HISTORY & AUDIT TRAIL']);
  rows.push(['Date & Time', 'Action Taken', 'Previous Status / Value', 'New Status / Value', 'Remarks']);

  if (history.length === 0) {
    rows.push(['No transaction history entries recorded for this procurement.']);
  } else {
    for (const entry of history) {
      rows.push([
        entry.created_at || '',
        entry.action || '',
        entry.previous_status ?? entry.old_value ?? '',
        entry.new_status ?? entry.new_value ?? '',
        entry.remarks || '',
      ]);
    }
  }

  return rowsToCsv(rows);
}

/**
 * Generates a formatted JSON export string for a single selected procurement record.
 *
 * @param {object} procurement
 * @param {string} [exportedAtIso]
 * @returns {string}
 */
export function buildProcurementJson(procurement, exportedAtIso = new Date().toISOString()) {
  const refNo = getReferenceNumber(procurement);
  const finance = computeFinancialSummary(procurement);

  const payload = {
    agency: 'Commission on Human Rights - Cordillera Administrative Region (CHR-CAR)',
    report_type: 'Single Procurement Record Export',
    exported_at: exportedAtIso,
    procurement: {
      id: procurement?.id ?? null,
      reference_no: refNo,
      title: procurement?.title || '',
      description: procurement?.description || '',
      procurement_type: procurement?.procurement_type || procurement?.procurement_mode || null,
      budget_source: procurement?.budget_source || null,
      deadline: procurement?.deadline || null,
      status: procurement?.status || null,
      winning_supplier: procurement?.awarded_bidder_name || null,
      created_at: procurement?.created_at || null,
      updated_at: procurement?.updated_at || null,
    },
    financial_summary: {
      approved_budget_abc: finance.abc,
      awarded_amount: finance.awardedAmount,
      realized_savings: finance.savings,
      savings_rate: finance.savingsRate,
      total_bids: finance.totalBids,
    },
    bids: Array.isArray(procurement?.bids) ? procurement.bids : [],
    transaction_history: Array.isArray(procurement?.history) ? procurement.history : [],
  };

  return JSON.stringify(payload, null, 2);
}
