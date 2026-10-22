'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  BellRing,
  Filter,
  ShieldAlert,
  Clock
} from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [loadError, setLoadError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [severityFilter]);

  async function loadAlerts() {
    setLoading(true);
    setLoadError('');
    try {
      const params: any = {};
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      const data = await api.getAlerts(params);
      setAlerts(data || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setLoadError('Alerts could not be refreshed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(id: string) {
    try {
      await api.acknowledgeAlert(id);
      await loadAlerts();
    } catch (err: any) {
      alert(`Acknowledge failed: ${err.message}`);
    }
  }

  async function handleResolve(id: string) {
    try {
      await api.resolveAlert(id);
      await loadAlerts();
    } catch (err: any) {
      alert(`Resolve failed: ${err.message}`);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Alert Notification Center</h1>
          <p className="page-description">
            Real-time critical plant notifications triggered by sensor telemetry, predictive failure models, and out-of-spec quality batches.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadAlerts}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : undefined} />
            {loading ? 'Refreshing...' : 'Refresh Alerts'}
          </button>
        </div>
      </div>

      <div aria-live="polite" style={{ minHeight: '1.2rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {loading
          ? 'Refreshing alert notifications...'
          : lastRefreshed
          ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}`
          : ''}
      </div>
      {loadError && (
        <div role="alert" style={{ marginBottom: '1rem', color: 'var(--status-critical)' }}>
          {loadError}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Severity Filter:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'WARNING'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`btn btn-sm ${severityFilter === sev ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Alert Event Log</div>
            <div className="card-subtitle">Showing {alerts.length} notifications</div>
          </div>
          <span className="badge badge-running">Live Socket Monitored</span>
        </div>
        <div className="card-body">
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} style={{ color: 'var(--status-running)', marginBottom: '0.5rem' }} />
              <div>All equipment and parameters nominal. No active alerts.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Machine / Asset</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => {
                  const sevClass =
                    a.severity === 'CRITICAL'
                      ? 'badge-critical'
                      : a.severity === 'WARNING'
                      ? 'badge-warning'
                      : 'badge-idle';

                  return (
                    <tr key={a.id}>
                      <td>
                        <span className={`badge ${sevClass}`} style={{ fontSize: '0.72rem' }}>
                          {a.severity}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{a.title}</td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '300px' }}>{a.message}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {a.machine?.name || a.machine_id?.slice(0, 8) || 'Plant Global'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(a.created_at).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className={`badge ${a.is_resolved ? 'badge-running' : a.is_acknowledged ? 'badge-warning' : 'badge-critical'}`} style={{ fontSize: '0.72rem' }}>
                          {a.is_resolved ? 'RESOLVED' : a.is_acknowledged ? 'ACKNOWLEDGED' : 'NEW'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          {!a.is_acknowledged && !a.is_resolved && (
                            <button
                              onClick={() => handleAcknowledge(a.id)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }}
                            >
                              Ack
                            </button>
                          )}
                          {!a.is_resolved && (
                            <button
                              onClick={() => handleResolve(a.id)}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '0.2rem 0.45rem' }}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
