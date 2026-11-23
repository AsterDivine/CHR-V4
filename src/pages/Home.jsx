import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Home / Prototype Navigation Component
 * Landing screen for the 50% working-system capstone prototype.
 *
 * SCOPE & ACCESS CONTROL NOTICE:
 * "Prototype only — authentication and final access control will be implemented in a later development stage."
 *
 * Used by: App.jsx as the root route (/).
 * Connects to: Client-side navigation to CHR Personnel and Bidder modules.
 * Database table affected: None.
 */
export default function Home() {
  return (
    <article aria-labelledby="prototype-home-title" style={{ maxWidth: '960px', margin: '0 auto', padding: '12px 0 36px 0' }}>
      {/* Official Government Seal & Title Banner */}
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            color: 'var(--color-primary-dark)',
            fontSize: '22px',
            fontWeight: 800,
            border: '3px solid var(--color-accent-amber)',
            boxShadow: 'var(--box-shadow-sm)',
            marginBottom: '12px',
          }}
        >
          CHR
        </div>
        <p style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '11px', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
          Republic of the Philippines &bull; Commission on Human Rights &bull; Cordillera Administrative Region
        </p>
        <h1
          id="prototype-home-title"
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--color-primary-dark)',
            margin: '8px 0 6px 0',
            lineHeight: 1.3,
          }}
        >
          Centralized Procurement Tracking and Financial Monitoring System
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          College Capstone Project &mdash; 50% Working-System Prototype Submission
        </p>
      </header>

      {/* QUICK LINKS DIRECTORY */}
      <section aria-labelledby="all-pages-heading">
        <div className="gov-card" style={{ padding: '20px 24px' }}>
          <h3 id="all-pages-heading" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary-dark)', marginBottom: '12px' }}>
            Prototype Site Map &amp; Direct Links
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>CHR Personnel Pages:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <Link to="/chr/dashboard" style={{ fontSize: '13px' }}>&bull; Dashboard</Link>
                <Link to="/chr/procurements" style={{ fontSize: '13px' }}>&bull; Procurement Records</Link>
                <Link to="/chr/procurements/new" style={{ fontSize: '13px' }}>&bull; Create Procurement</Link>
                <Link to="/chr/bids" style={{ fontSize: '13px' }}>&bull; Bids Evaluation</Link>
                <Link to="/chr/financials" style={{ fontSize: '13px' }}>&bull; Financial Monitoring</Link>
                <Link to="/chr/history" style={{ fontSize: '13px' }}>&bull; Transaction History</Link>
                <Link to="/chr/export" style={{ fontSize: '13px' }}>&bull; Export</Link>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '13px', color: 'var(--color-accent-gold)' }}>Bidder / Supplier Pages:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                <Link to="/bidder/opportunities" style={{ fontSize: '13px' }}>&bull; Open Opportunities</Link>
                <Link to="/bidder/submit-bid" style={{ fontSize: '13px' }}>&bull; Submit Quotation</Link>
                <Link to="/bidder/my-quotations" style={{ fontSize: '13px' }}>&bull; My Submitted Quotations</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
