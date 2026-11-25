import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  createProcurement,
  updateProcurement,
  loadProcurementDetails,
} from '../../services/api.js';

// Allowed procurement workflow statuses matching the MySQL `procurements` table.

const PROCUREMENT_STATUS_OPTIONS = [
  'Open',
  'For Evaluation',
  'Awarded',
  'In Progress',
  'Completed',
];

//Standard Philippine government procurement modes for CHR-CAR.

const PROCUREMENT_TYPE_OPTIONS = [
  'NP-53.9 Small Value Procurement',
  'Competitive Bidding (Public Bidding)',
  'Shopping (Section 52.1.b)',
  'Direct Contracting',
  'NP-53.1 Two-Failed Biddings',
  'Repeat Order',
];

/**
 * @param {number|string|null} amount - Monetary value from MySQL.
 * @returns {string} Formatted peso string (e.g., ₱150,000.00).
 */

//Peso format
function formatPeso(amount) {
  if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
    return '—';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**

 * @returns {object} Initial procurement form state.
 */

function createEmptyProcurement() {
  return {
    reference_no: '',
    title: '',
    description: '',
    procurement_type: 'NP-53.9 Small Value Procurement',
    abc: '',
    budget_source: '',
    deadline: '',
    status: 'Open',
  };
}

/**
 * Validates required procurement fields in React before sending to PHP.
 * Checks Reference Number, Title, ABC (> 0), and Submission Deadline.
 * @param {object} data - Current procurement form state.
 * @returns {{ isValid: boolean, errors: object }} Validation result and per-field error messages.
 */
function validateProcurementForm(data) {
  const errors = {};

  if (!data.reference_no || !data.reference_no.trim()) {
    errors.reference_no = 'Reference Number is required.';
  }

  if (!data.title || !data.title.trim()) {
    errors.title = 'Procurement Title is required.';
  }

  if (data.abc === '' || data.abc === null || data.abc === undefined) {
    errors.abc = 'Approved Budget for the Contract (ABC) is required.';
  } else if (isNaN(Number(data.abc)) || Number(data.abc) <= 0) {
    errors.abc = 'Approved Budget for the Contract (ABC) must be greater than 0.';
  }

  if (!data.deadline || !data.deadline.trim()) {
    errors.deadline = 'Submission Deadline is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * @returns {JSX.Element}
 */
export default function ProcurementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Core procurement form state aligned with MySQL `procurements` columns
  const [formData, setFormData] = useState(createEmptyProcurement);

  // Loaded MySQL record & recent transaction_history entries for immediate Edit verification
  const [loadedRecord, setLoadedRecord] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);

  // Validation and submission UI states
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  //Fetches the current procurement record from MySQL via the PHP endpoint
  
  const loadExistingProcurement = useCallback(async () => {
    if (!isEditMode) return;

    const proc = await loadProcurementDetails(id);

    setFormData({
      reference_no: proc.reference_no || proc.reference_number || '',
      title: proc.title || '',
      description: proc.description || '',
      procurement_type:
        proc.procurement_type || proc.procurement_mode || 'NP-53.9 Small Value Procurement',
      abc: proc.abc !== null && proc.abc !== undefined ? String(proc.abc) : '',
      budget_source: proc.budget_source || '',
      deadline: proc.deadline ? String(proc.deadline).substring(0, 10) : '',
      status: proc.status || 'Open',
    });

    setLoadedRecord(proc);
    setRecentHistory(Array.isArray(proc.history) ? proc.history.slice(0, 5) : []);
  }, [id, isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;

    setLoading(true);
    setErrorMessage('');
    loadExistingProcurement()
      .catch((err) => {
        setErrorMessage('Failed to load procurement record from MySQL: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [isEditMode, loadExistingProcurement]);

  /**
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>} event
   */
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  //Resets all form inputs and validation errors back to default empty values
  const handleResetForm = () => {
    setFormData(createEmptyProcurement());
    setFieldErrors({});
    setErrorMessage('');
    setSuccessMessage('');
  };

  /**
   * Validates the form in React, then connects to the PHP backend via fetch():
   * @param {React.FormEvent<HTMLFormElement>} event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Client-side React validation (PHP backend validates again)
    const validation = validateProcurementForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setErrorMessage('Please fix the highlighted required fields before submitting.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      if (isEditMode) {
        // Edit Mode payload: database ID identifies row; reference_no is read-only
        const updatePayload = {
          id: Number(id),
          title: formData.title.trim(),
          description: formData.description.trim(),
          procurement_type: formData.procurement_type,
          abc: Number(formData.abc),
          budget_source: formData.budget_source.trim(),
          deadline: formData.deadline,
          status: formData.status,
        };

        // Send changes to PHP update endpoint -> MySQL `procurements` & `transaction_history`
        const updateResult = await updateProcurement(updatePayload);

        // Reload full procurement record + transaction_history from MySQL immediately
        await loadExistingProcurement();

        setSuccessMessage(
          updateResult.message || 'Procurement record updated successfully.'
        );
      } else {
        const createPayload = {
          reference_no: formData.reference_no.trim(),
          title: formData.title.trim(),
          description: formData.description.trim(),
          procurement_type: formData.procurement_type,
          abc: Number(formData.abc),
          budget_source: formData.budget_source.trim(),
          deadline: formData.deadline,
          status: formData.status,
        };

        const result = await createProcurement(createPayload);
        const successMsg =
          result.message || 'Procurement record created successfully.';

        // Clear form after successful creation
        setFormData(createEmptyProcurement());
        setFieldErrors({});

        // Redirect to Procurement Records page, which reloads fresh rows from MySQL
        navigate('/chr/procurements', {
          state: {
            successMessage: `${successMsg} (${createPayload.reference_no})`,
          },
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to save procurement record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main aria-busy="true">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading procurement record from MySQL...
        </div>
      </main>
    );
  }

  return (
    <main aria-labelledby="create-procurement-title">
      {/* Semantic Page Header */}
      <header
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 id="create-procurement-title" className="page-title">
            {isEditMode
              ? `Edit Procurement: ${formData.reference_no || `#${id}`}`
              : 'Create Procurement'}
          </h1>
          <p className="page-subtitle">
            {isEditMode
              ? 'Update procurement details and workflow status in MySQL. Every change is logged in transaction_history.'
              : 'Register a CHR-CAR procurement record directly into the centralized MySQL database.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isEditMode && (
            <Link to={`/chr/procurements/${id}`} className="btn btn-secondary btn-sm">
              View Details
            </Link>
          )}
          <Link to="/chr/procurements" className="btn btn-secondary btn-sm">
            &larr; Back to Procurement Records
          </Link>
        </div>
      </header>

      {/* Main Form Section */}
      <section aria-labelledby="procurement-info-legend">
        {/* Success Confirmation Banner (Edit Mode Reloaded) */}
        {successMessage && (
          <aside
            role="status"
            aria-live="polite"
            style={{
              backgroundColor: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              padding: '12px 16px',
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid #bbf7d0',
              fontWeight: 600,
            }}
          >
            {successMessage} Reloaded latest values from MySQL.
          </aside>
        )}

        {/* Validation or Backend Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '12px 16px',
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid #fecaca',
              fontWeight: 500,
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="gov-card gov-form" noValidate>
          <fieldset style={{ border: 'none', padding: '24px', margin: 0 }}>
            <legend
              id="procurement-info-legend"
              style={{
                fontWeight: 700,
                fontSize: '16px',
                color: 'var(--color-primary-dark)',
                paddingBottom: '12px',
                marginBottom: '20px',
                borderBottom: '1px solid var(--color-border-light)',
                width: '100%',
              }}
            >
              Procurement Information
            </legend>

            {isEditMode && loadedRecord && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  marginBottom: '18px',
                  fontSize: '12.5px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <span>
                  <strong>Database Record ID:</strong> #{loadedRecord.id} (immutable)
                </span>
                <span>
                  <strong>Last Updated in MySQL:</strong>{' '}
                  {loadedRecord.updated_at || loadedRecord.created_at || '—'}
                </span>
              </div>
            )}

            <div className="form-row" style={{ marginBottom: '16px' }}>
              {/* Reference Number (Read-only in Edit Mode) */}
              <div className="form-group">
                <label htmlFor="reference_no" className="form-label">
                  Reference Number <span className="required">*</span>
                </label>
                <input
                  id="reference_no"
                  name="reference_no"
                  type="text"
                  className="form-input"
                  placeholder="e.g. CHR-CAR-2024-11-004"
                  value={formData.reference_no}
                  onChange={handleInputChange}
                  readOnly={isEditMode}
                  style={
                    isEditMode
                      ? { backgroundColor: '#f1f5f9', color: 'var(--color-text-muted)', cursor: 'not-allowed' }
                      : undefined
                  }
                  required
                />
                {fieldErrors.reference_no ? (
                  <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 500 }}>
                    {fieldErrors.reference_no}
                  </span>
                ) : (
                  <span className="form-help">
                    {isEditMode
                      ? 'Read-only official tracking reference number.'
                      : 'Unique CHR-CAR tracking or canvass reference number.'}
                  </span>
                )}
              </div>

              {/* Procurement Type */}
              <div className="form-group">
                <label htmlFor="procurement_type" className="form-label">
                  Procurement Type
                </label>
                <select
                  id="procurement_type"
                  name="procurement_type"
                  className="form-select"
                  value={formData.procurement_type}
                  onChange={handleInputChange}
                >
                  {PROCUREMENT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="form-help">
                  Applicable procurement mode under R.A. 9184.
                </span>
              </div>
            </div>

            {/* Procurement Title */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="title" className="form-label">
                Procurement Title <span className="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="form-input"
                placeholder="e.g. Supply and Delivery of ICT Peripherals for CHR-CAR Regional Office"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
              {fieldErrors.title && (
                <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 500 }}>
                  {fieldErrors.title}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                rows={4}
                placeholder="Enter scope of work, item specifications, delivery location (Baguio City), and key requirements..."
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-row" style={{ marginBottom: '16px' }}>
              {/* Approved Budget for the Contract (ABC) */}
              <div className="form-group">
                <label htmlFor="abc" className="form-label">
                  Approved Budget for the Contract (ABC) <span className="required">*</span>
                </label>
                <input
                  id="abc"
                  name="abc"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="e.g. 150000.00"
                  value={formData.abc}
                  onChange={handleInputChange}
                  required
                />
                {fieldErrors.abc ? (
                  <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 500 }}>
                    {fieldErrors.abc}
                  </span>
                ) : (
                  <span className="form-help">
                    Amount in Philippine Pesos (must be greater than 0).
                  </span>
                )}
              </div>

              {/* Budget Source */}
              <div className="form-group">
                <label htmlFor="budget_source" className="form-label">
                  Budget Source
                </label>
                <input
                  id="budget_source"
                  name="budget_source"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Regular Agency Fund (GAA 2024 MOOE)"
                  value={formData.budget_source}
                  onChange={handleInputChange}
                />
                <span className="form-help">
                  Fund allotment or GAA program source.
                </span>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '24px' }}>
              {/* Submission Deadline */}
              <div className="form-group">
                <label htmlFor="deadline" className="form-label">
                  Submission Deadline <span className="required">*</span>
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  className="form-input"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  required
                />
                {fieldErrors.deadline ? (
                  <span style={{ color: 'var(--color-danger)', fontSize: '12px', fontWeight: 500 }}>
                    {fieldErrors.deadline}
                  </span>
                ) : (
                  <span className="form-help">
                    Closing date for supplier quotation submission.
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="form-group">
                <label htmlFor="status" className="form-label">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  {PROCUREMENT_STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
                <span className="form-help">
                  Current lifecycle stage in the CHR-CAR procurement registry.
                </span>
              </div>
            </div>

            {/* Form Action Buttons inside Fieldset (No delete button for government records) */}
            <div
              style={{
                paddingTop: '16px',
                borderTop: '1px solid var(--color-border-light)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Clear Form
                </button>
              )}
              <Link to="/chr/procurements" className="btn btn-secondary">
                {isEditMode ? 'Back to Records' : 'Cancel'}
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? 'Saving to MySQL...'
                  : isEditMode
                  ? 'Update Procurement Record'
                  : 'Save Procurement Record'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>

      {/* Edit Mode: Immediate Reloaded MySQL Record & Recent Audit Trail */}
      {isEditMode && loadedRecord && (
        <section aria-labelledby="reloaded-record-heading" style={{ marginTop: '24px' }}>
          <div className="gov-card">
            <header className="gov-card-header">
              <h2
                id="reloaded-record-heading"
                style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-dark)', margin: 0 }}
              >
                Current Saved Values in MySQL ({loadedRecord.reference_no})
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Reloaded via get_procurement.php?id={loadedRecord.id}
              </span>
            </header>
            <div className="gov-card-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11.5px' }}>Title</div>
                  <strong>{loadedRecord.title}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11.5px' }}>Status</div>
                  <strong>{loadedRecord.status}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11.5px' }}>ABC</div>
                  <strong>{formatPeso(loadedRecord.abc)}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11.5px' }}>Deadline</div>
                  <strong>
                    {loadedRecord.deadline ? String(loadedRecord.deadline).substring(0, 10) : '—'}
                  </strong>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11.5px' }}>Budget Source</div>
                  <strong>{loadedRecord.budget_source || '—'}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--color-text-subtle)', fontSize: '11.5px' }}>Procurement Type</div>
                  <strong>{loadedRecord.procurement_type || '—'}</strong>
                </div>
              </div>

              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '10px' }}>
                Recent Audit Trail (transaction_history)
              </h3>
              {recentHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  No history entries recorded yet for this procurement.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="gov-table compact-table">
                    <thead>
                      <tr>
                        <th scope="col">Action</th>
                        <th scope="col">Old Value</th>
                        <th scope="col">New Value</th>
                        <th scope="col">Remarks</th>
                        <th scope="col">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHistory.map((h) => (
                        <tr key={h.id}>
                          <td><strong>{h.action}</strong></td>
                          <td>{h.old_value || '—'}</td>
                          <td>{h.new_value || '—'}</td>
                          <td>{h.remarks || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{h.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
