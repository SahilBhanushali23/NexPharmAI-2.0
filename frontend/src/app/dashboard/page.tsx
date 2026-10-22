'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Activity,
  AlertTriangle,
  Boxes,
  Calendar,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  Layers,
  Sparkles,
  TrendingUp,
  Zap,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setLoadError('');
    try {
      const [sumRes, machRes, alertRes, schedRes] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getMachines({ limit: 6 }),
        api.getAlerts({ limit: 5 }),
        api.getActiveSchedule(),
      ]);

      const failedSources: string[] = [];
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      else failedSources.push('plant metrics');
      if (machRes.status === 'fulfilled') setMachines(machRes.value || []);
      else failedSources.push('machine fleet');
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value || []);
      else failedSources.push('alerts');
      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value);
      else failedSources.push('production schedule');

      if (failedSources.length > 0) {
        setLoadError(`Could not refresh ${failedSources.join(', ')}. Other dashboard data may be current.`);
      } else {
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoadError('Dashboard data could not be refreshed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickSchedule() {
    setGeneratingSchedule(true);
    try {
      await api.generateSchedule({ horizon_days: 7 });
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Scheduling error: ${err.message}`);
    } finally {
      setGeneratingSchedule(false);
    }
  }

  const oee = summary?.oee ? {
    availability: summary.oee.availability / 100,
    performance: summary.oee.performance / 100,
    quality_rate: summary.oee.quality / 100,
    overall_oee: summary.oee.overall / 100,
  } : null;

  const fleet = summary?.machines || null;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Executive Plant Dashboard</h1>
          <p className="page-description">
            Real-time telemetry, AI-driven predictive health, OR-Tools smart scheduling, and factory OEE optimization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleQuickSchedule}
            disabled={generatingSchedule}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            {generatingSchedule ? 'Optimizing CP-SAT...' : 'Run AI Production Scheduler'}
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : <Activity size={16} />}
            {loading ? 'Refreshing...' : 'Refresh Telemetry'}
          </button>
        </div>
      </div>

      <div aria-live="polite" style={{ minHeight: '1.2rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {loading
          ? 'Updating plant metrics, fleet, alerts, and schedule...'
          : lastRefreshed
          ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}`
          : ''}
      </div>
      {loadError && (
        <div role="alert" style={{ marginBottom: '1rem', color: 'var(--status-critical)' }}>
          {loadError}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--primary)' }}>
            <Gauge size={22} />
          </div>
          <div className="metric-label">Plant Overall OEE</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>
            {oee ? `${(oee.overall_oee * 100).toFixed(1)}%` : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--status-running)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ArrowUpRight size={14} /> World-class benchmark target 85%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-running)' }}>
            <Cpu size={22} />
          </div>
          <div className="metric-label">Machine Fleet Health</div>
          <div className="metric-value">
            {fleet ? <>{fleet.running}/{fleet.total} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Online</span></> : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {fleet?.critical > 0 ? (
              <span style={{ color: 'var(--status-critical)' }}>{fleet.critical} Critical degradation</span>
            ) : fleet ? (
              'All units within safety limits'
            ) : (
              'Waiting for fleet data'
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="metric-label">Active Plant Alerts</div>
          <div className="metric-value" style={{ color: (summary?.alerts?.active_total || 0) > 0 ? 'var(--status-warning)' : 'var(--text-primary)' }}>
            {summary?.alerts?.active_total ?? '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {summary?.alerts ? `${summary.alerts.critical} Critical • ${alerts.length} recent alerts loaded` : 'Waiting for alert data'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--secondary)' }}>
            <Calendar size={22} />
          </div>
          <div className="metric-label">Active Schedule Batches</div>
          <div className="metric-value">
            {schedule?.batches?.length || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Makespan: {schedule?.schedule?.total_makespan_hours?.toFixed(1) || 0} hrs (Horizon: {schedule?.schedule?.horizon_days || 7}d)
          </div>
        </div>
      </div>

      {/* OEE Triad & Live Fleet Status */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">OEE Efficiency Breakdown</div>
              <div className="card-subtitle">Availability × Performance × Quality</div>
            </div>
            <span className="badge badge-running">Live Metrics</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Availability (Uptime vs Planned)</span>
                  <span style={{ fontWeight: 600 }}>{oee ? `${(oee.availability * 100).toFixed(1)}%` : '—'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (oee?.availability || 0) * 100)}%`, background: 'var(--primary)' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Performance (Throughput vs Ideal)</span>
                  <span style={{ fontWeight: 600 }}>{oee ? `${(oee.performance * 100).toFixed(1)}%` : '—'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (oee?.performance || 0) * 100)}%`, background: 'var(--secondary)' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Quality (Good vs Total Output)</span>
                  <span style={{ fontWeight: 600 }}>{oee ? `${(oee.quality_rate * 100).toFixed(1)}%` : '—'}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (oee?.quality_rate || 0) * 100)}%`, background: 'var(--status-running)' }}></div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>OR-Tools Dynamic Rescheduling</span>
                <span className="badge badge-running">Autonomous Trigger Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fleet Quick Status Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Production Line & Fleet Health</div>
              <div className="card-subtitle">AI4I 2020 LightGBM & Isolation Forest Guard</div>
            </div>
            <Link href="/machines" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
              View All →
            </Link>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {machines.slice(0, 4).map((m) => {
                const score = m.health_score ?? 85;
                const statusClass =
                  m.status === 'RUNNING'
                    ? 'badge-running'
                    : m.status === 'WARNING'
                    ? 'badge-warning'
                    : m.status === 'CRITICAL'
                    ? 'badge-critical'
                    : 'badge-idle';

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name || m.machine_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {m.machine_code || m.machine_id} • {m.machine_type}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: score < 50 ? 'var(--status-critical)' : score < 75 ? 'var(--status-warning)' : 'var(--status-running)' }}>
                          {score.toFixed(0)}/100
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Health</div>
                      </div>
                      <span className={`badge ${statusClass}`}>{m.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts & Production Schedule Preview */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Live Sensor & Machine Alerts</div>
              <div className="card-subtitle">Predictive threshold anomalies and failure risks</div>
            </div>
            <Link href="/alerts" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
              Alert Center →
            </Link>
          </div>
          <div className="card-body">
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--status-running)', marginBottom: '0.5rem' }} />
                <div>Zero active unacknowledged alerts. Fleet operating normally.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${a.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.title}</div>
                      <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                        {a.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {a.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Schedule Timeline Preview */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Active Production Schedule Timeline</div>
              <div className="card-subtitle">Google OR-Tools CP-SAT Solved Sequence</div>
            </div>
            <Link href="/scheduler" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
              Schedule Detail →
            </Link>
          </div>
          <div className="card-body">
            {schedule?.batches?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {schedule.batches.slice(0, 4).map((b: any) => (
                  <div
                    key={b.id}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.batch_number}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Quantity: {b.quantity} units • Line: {b.line_id || 'Line 1'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-running" style={{ fontSize: '0.75rem' }}>{b.status}</span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Seq #{b.sequence_order || 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <Calendar size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                <div>No active schedule found. Click &quot;Run AI Production Scheduler&quot; above.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
