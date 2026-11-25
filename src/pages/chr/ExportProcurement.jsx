import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadProcurements, loadProcurementDetails } from '../../services/api.js';
import {
  filterProcurementsForExport,
  getReferenceNumber,
  formatExportCurrency,
  computeFinancialSummary,
  buildExportFilename,
  buildProcurementCsv,
  buildProcurementJson,
} from '../../utils/exportProcurement.js';

/**
 * Maps procurement status strings to clean CSS badge classes.
 *
 * @param {string} status - Procurement status string.
 * @returns {string} CSS class name.
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case 'Open':
    case 'Published / Open':
      return 'badge badge-published';
    case 'Awarded':
      return 'badge badge-selected';
    case 'For Evaluation':
    case 'Under Evaluation':
      return 'badge badge-review';
    case 'In Progress':
      return 'badge badge-auth';
    case 'Completed':
      return 'badge badge-paid';
    default:
      return 'badge badge-draft';
  }
}

/**
 * Triggers a browser file download from string content.
 *
 * @param {string} content  - File text content.
 * @param {string} filename - Download file name.
 * @param {string} mimeType - MIME type string.
 */
function triggerFileDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 */
export default function ExportProcurement() {
  const [procurements, setProcurements] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [exportNotice, setExportNotice] = useState('');

  /**
   * Loads all procurement records from MySQL so users can search and select a project.
   */
  const fetchProcurementList = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const records = await loadProcurements();
      setProcurements(Array.isArray(records) ? records : []);
    } catch (err) {
      setProcurements([]);
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchProcurementList();
  }, []);

  /**
   * Loads full details (bids + transaction history) when a procurement is selected.
   *
   * @param {object} procurement - Summary procurement row chosen from the search list.
   */
  const handleSelectProcurement = async (procurement) => {
    setSelectedId(procurement.id);
    setExportNotice('');
    setDetailsError(null);
    setLoadingDetails(true);
    setSelectedDetails(procurement);

    try {
      const fullRecord = await loadProcurementDetails(procurement.id);
      if (fullRecord) {
        setSelectedDetails(fullRecord);
      }
    } catch (err) {
      setDetailsError(
        `Loaded summary record, but full bids and audit trail could not be retrieved: ${err.message}`
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedId(null);
    setSelectedDetails(null);
    setDetailsError(null);
    setExportNotice('');
  };

  const handleExportCsv = () => {
    if (!selectedDetails) return;
    const filename = buildExportFilename(selectedDetails, 'csv');
    const csvContent = '\uFEFF' + buildProcurementCsv(selectedDetails);
    triggerFileDownload(csvContent, filename, 'text/csv;charset=utf-8;');
    setExportNotice(`Exported CSV report: ${filename}`);
  };

  const handleExportJson = () => {
    if (!selectedDetails) return;
    const filename = buildExportFilename(selectedDetails, 'json');
    const jsonContent = buildProcurementJson(selectedDetails);
    triggerFileDownload(jsonContent, filename, 'application/json;charset=utf-8;');
    setExportNotice(`Exported JSON report: ${filename}`);
  };

  const handlePrintReport = () => {
    if (!selectedDetails) return;
    setExportNotice(
      `Opened print / PDF dialog for ${getReferenceNumber(selectedDetails)}.`
    );
    window.print();
  };

  const matchingProcurements = filterProcurementsForExport(procurements, searchQuery);
  const financialSummary = selectedDetails ? computeFinancialSummary(selectedDetails) : null;
  const selectedRefNo = selectedDetails ? getReferenceNumber(selectedDetails) : '';
  const selectedBids = Array.isArray(selectedDetails?.bids) ? selectedDetails.bids : [];
  const selectedHistory = Array.isArray(selectedDetails?.history) ? selectedDetails.history : [];

  return (
    <article aria-labelledby="export-page-heading">
      {/* Official Print-Only Masthead */}
      <div className="print-header">
        <p style={{ fontSize: '10pt', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Republic of the Philippines
        </p>
        <h3>Commission on Human Rights &mdash; Cordillera Administrative Region (CHR-CAR)</h3>
        <h2>Official Procurement Summary &amp; Financial Export Report</h2>
        {selectedDetails && (
          <p style={{ fontSize: '10pt' }}>
            Reference No.: <strong>{selectedRefNo}</strong> &bull; Generated:{' '}
            {new Date().toLocaleString('en-PH')}
          </p>
        )}
      </div>

      {/* Semantic Page Header (Screen Only) */}
      <header
        className="page-header no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 id="export-page-heading" className="page-title">
            Export Procurement Record
          </h1>
          <p className="page-subtitle">
            Search and select a procurement project by Reference No. or Project Title to preview and export its official report.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchProcurementList}
            disabled={loadingList}
          >
            {loadingList ? 'Refreshing...' : 'Refresh Records'}
          </button>
          <Link to="/chr/history" className="btn btn-outline btn-sm">
            &larr; Transaction History
          </Link>
        </div>
      </header>

      {/* Backend Connection Notice */}
      {listError && (
        <div className="notice-box warning no-print" role="alert">
          <div>
            <strong>Backend Connection Notice:</strong> {listError}
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Start your PHP development server (e.g. <code>php -S localhost:8000</code>) and ensure MySQL is active to load procurement records for export.
            </div>
          </div>
        </div>
      )}

      {/* Search & Select Procurement Card */}
      <section aria-labelledby="export-search-heading" className="gov-card no-print">
        <header className="gov-card-header">
          <h3 id="export-search-heading">1. Search &amp; Select Procurement</h3>
          <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            {loadingList
              ? 'Loading records...'
              : `Showing ${matchingProcurements.length} of ${procurements.length} ${
                  procurements.length === 1 ? 'record' : 'records'
                }`}
          </span>
        </header>

        <div className="gov-card-body">
          {/* Search Input Bar */}
          <form onSubmit={(e) => e.preventDefault()} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 320px' }}>
                <label
                  htmlFor="export-procurement-search"
                  className="form-label"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Search by Reference No. or Project Title
                </label>
                <input
                  id="export-procurement-search"
                  type="search"
                  className="form-input"
                  style={{ width: '100%' }}
                  placeholder="Enter Reference No. (e.g. CHR-CAR-2024-001) or Project Title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>

              {searchQuery && (
                <div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                </div>
              )}

              {selectedDetails && (
                <div>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleClearSelection}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Selectable Matching Procurements List */}
          {loadingList ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              Loading procurement records from MySQL...
            </div>
          ) : matchingProcurements.length === 0 ? (
            <div className="export-empty-results" role="status">
              {procurements.length === 0
                ? 'No procurement records are currently stored in the database.'
                : `No procurement records matched "${searchQuery}". Try searching another Reference No. or Project Title.`}
            </div>
          ) : (
            <div
              className="export-selector-list"
              role="region"
              aria-label="Matching procurement records"
              data-testid="export-procurement-results"
            >
              {matchingProcurements.map((proc) => {
                const refNo = getReferenceNumber(proc);
                const isSelected = Number(selectedId) === Number(proc.id);

                return (
                  <button
                    key={proc.id}
                    type="button"
                    className={`export-selector-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectProcurement(proc)}
                    aria-pressed={isSelected}
                  >
                    <div className="export-selector-main">
                      <div className="export-selector-ref-row">
                        <strong className="export-selector-ref">{refNo}</strong>
                        <span className={getStatusBadgeClass(proc.status)}>{proc.status}</span>
                        {isSelected && (
                          <span className="export-selected-tag">Selected</span>
                        )}
                      </div>
                      <div className="export-selector-title">{proc.title}</div>
                      <div className="export-selector-meta">
                        <span>{proc.procurement_type || proc.procurement_mode || 'Standard Procurement'}</span>
                        <span>&bull;</span>
                        <span>ABC: {formatExportCurrency(proc.abc)}</span>
                        {proc.deadline && (
                          <>
                            <span>&bull;</span>
                            <span>Deadline: {String(proc.deadline).substring(0, 10)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="export-selector-action">
                      {isSelected ? 'Selected ✓' : 'Select'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Export Confirmation Alert */}
      {exportNotice && (
        <aside
          role="status"
          aria-live="polite"
          className="notice-box no-print"
          style={{
            borderLeftColor: 'var(--color-success)',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            fontWeight: 600,
          }}
        >
          <div>{exportNotice}</div>
        </aside>
      )}

      {/* Partial Details Warning */}
      {detailsError && (
        <aside role="alert" className="notice-box warning no-print">
          <div>{detailsError}</div>
        </aside>
      )}

      {/* Selected Procurement Export Workspace & Preview */}
      {!selectedDetails ? (
        <section aria-label="Export selection prompt" className="gov-card no-print">
          <div
            className="gov-card-body"
            style={{ textAlign: 'center', padding: '36px 24px', color: 'var(--color-text-muted)' }}
          >
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '6px' }}>
              No Procurement Selected Yet
            </p>
            <p style={{ fontSize: '13.5px', maxWidth: '520px', margin: '0 auto' }}>
              Use the search bar above to find a procurement by <strong>Reference No.</strong> or{' '}
              <strong>Project Title</strong>, then select it to preview and export its full report.
            </p>
          </div>
        </section>
      ) : (
        <section aria-labelledby="export-preview-heading" className="reports-container">
          {/* Export Action Toolbar */}
          <div className="gov-card no-print">
            <header className="gov-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 id="export-preview-heading">2. Export Options &mdash; {selectedRefNo}</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {selectedDetails.title}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExportCsv}
                  disabled={loadingDetails}
                >
                  Export CSV (.csv)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleExportJson}
                  disabled={loadingDetails}
                >
                  Export JSON (.json)
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handlePrintReport}
                  disabled={loadingDetails}
                >
                  Print / Save PDF
                </button>
                <Link
                  to={`/chr/procurements/${selectedDetails.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  View Record &rarr;
                </Link>
              </div>
            </header>
          </div>

          {loadingDetails && (
            <div className="notice-box info no-print" role="status">
              <div>Loading full bids and transaction history for {selectedRefNo}...</div>
            </div>
          )}

          {/* Printable Report Preview Card */}
          <div className="gov-card">
            <header className="gov-card-header">
              <h3>Report Preview: {selectedRefNo}</h3>
              <span className={getStatusBadgeClass(selectedDetails.status)}>
                {selectedDetails.status}
              </span>
            </header>

            <div className="gov-card-body">
              {/* Financial Summary KPI Cards */}
              <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card">
                  <div className="stat-label">Approved Budget (ABC)</div>
                  <div className="stat-value">
                    {formatExportCurrency(financialSummary.abc)}
                  </div>
                  <div className="stat-help">Authorized contract ceiling</div>
                </div>

                <div className="stat-card stat-info">
                  <div className="stat-label">Awarded Contract Price</div>
                  <div className="stat-value">
                    {formatExportCurrency(financialSummary.awardedAmount)}
                  </div>
                  <div className="stat-help">
                    {selectedDetails.awarded_bidder_name
                      ? `Supplier: ${selectedDetails.awarded_bidder_name}`
                      : 'Pending winning bid selection'}
                  </div>
                </div>

                <div className="stat-card stat-accent">
                  <div className="stat-label">Realized Savings</div>
                  <div
                    className="stat-value"
                    style={{
                      color:
                        financialSummary.savings !== null
                          ? 'var(--color-success)'
                          : 'var(--color-text-main)',
                    }}
                  >
                    {formatExportCurrency(financialSummary.savings)}
                  </div>
                  <div className="stat-help">
                    {financialSummary.savingsRate
                      ? `${financialSummary.savingsRate} saved below ABC`
                      : 'Calculated upon bid award'}
                  </div>
                </div>
              </div>

              {/* Procurement Metadata Details */}
              <h4 className="export-section-heading">Procurement Information</h4>
              <dl className="export-detail-grid">
                <div className="export-detail-item">
                  <dt>Reference No.</dt>
                  <dd><strong>{selectedRefNo}</strong></dd>
                </div>
                <div className="export-detail-item">
                  <dt>Project Title</dt>
                  <dd>{selectedDetails.title}</dd>
                </div>
                <div className="export-detail-item">
                  <dt>Procurement Mode</dt>
                  <dd>{selectedDetails.procurement_type || selectedDetails.procurement_mode || '—'}</dd>
                </div>
                <div className="export-detail-item">
                  <dt>Budget Source</dt>
                  <dd>{selectedDetails.budget_source || '—'}</dd>
                </div>
                <div className="export-detail-item">
                  <dt>Submission Deadline</dt>
                  <dd>{selectedDetails.deadline ? String(selectedDetails.deadline).substring(0, 10) : '—'}</dd>
                </div>
                <div className="export-detail-item">
                  <dt>Winning Supplier</dt>
                  <dd>{selectedDetails.awarded_bidder_name || 'Pending Award'}</dd>
                </div>
              </dl>

              {selectedDetails.description && (
                <div style={{ marginTop: '14px', marginBottom: '22px' }}>
                  <div className="export-description-label">Scope / Description</div>
                  <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)' }}>
                    {selectedDetails.description}
                  </p>
                </div>
              )}

              {/* Submitted Bids Table */}
              <h4 className="export-section-heading" style={{ marginTop: '22px' }}>
                Submitted Supplier Quotations ({selectedBids.length})
              </h4>
              {selectedBids.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                  No supplier quotations have been submitted for this procurement.
                </p>
              ) : (
                <div className="table-responsive" style={{ marginBottom: '24px' }}>
                  <table className="gov-table print-table">
                    <thead>
                      <tr>
                        <th scope="col">Supplier / Company</th>
                        <th scope="col">Representative</th>
                        <th scope="col">Quoted Amount</th>
                        <th scope="col">Variance from ABC</th>
                        <th scope="col">Status</th>
                        <th scope="col">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBids.map((bid) => {
                        const variance = financialSummary.abc - Number(bid.bid_amount || 0);
                        return (
                          <tr key={bid.id}>
                            <td><strong>{bid.company_name || bid.bidder_name}</strong></td>
                            <td>{bid.bidder_name || bid.representative_name || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <strong>{formatExportCurrency(bid.bid_amount)}</strong>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {variance >= 0 ? (
                                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                  - {formatExportCurrency(variance)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                                  + {formatExportCurrency(Math.abs(variance))}
                                </span>
                              )}
                            </td>
                            <td>{bid.status || 'Submitted'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <small>{bid.submitted_at || bid.created_at || '—'}</small>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Transaction History Table */}
              <h4 className="export-section-heading">
                Transaction History &amp; Audit Trail ({selectedHistory.length})
              </h4>
              {selectedHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  No transaction history entries recorded for this procurement.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="gov-table print-table">
                    <thead>
                      <tr>
                        <th scope="col">Date &amp; Time</th>
                        <th scope="col">Action Taken</th>
                        <th scope="col">Status Transition</th>
                        <th scope="col">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedHistory.map((entry) => {
                        const prevVal = entry.previous_status ?? entry.old_value;
                        const nextVal = entry.new_status ?? entry.new_value;
                        return (
                          <tr key={entry.id}>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <small>{entry.created_at}</small>
                            </td>
                            <td><strong>{entry.action}</strong></td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {prevVal && nextVal
                                ? `${prevVal} → ${nextVal}`
                                : nextVal || 'Initial'}
                            </td>
                            <td>{entry.remarks || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Print-Only Official Signatory Block */}
              <div className="print-signatories">
                <div className="signatory-col">
                  <div>Prepared by:</div>
                  <div className="signature-line" />
                  <strong>Procurement Officer</strong>
                  <div>CHR-CAR Regional Office</div>
                </div>
                <div className="signatory-col">
                  <div>Reviewed by:</div>
                  <div className="signature-line" />
                  <strong>BAC Secretariat</strong>
                  <div>Bids and Awards Committee</div>
                </div>
                <div className="signatory-col">
                  <div>Approved by:</div>
                  <div className="signature-line" />
                  <strong>Regional Director</strong>
                  <div>CHR-CAR</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
