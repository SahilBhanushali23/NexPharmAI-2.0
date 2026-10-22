'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  CalendarDays,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  History,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Zap,
  RotateCcw
} from 'lucide-react';

export default function SchedulerPage() {
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [horizonDays, setHorizonDays] = useState(7);
  const [selectedMachineToFail, setSelectedMachineToFail] = useState('');
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    loadSchedulerData();
  }, []);

  async function loadSchedulerData() {
    setLoading(true);
    try {
      const [schedRes, revRes, machRes] = await Promise.allSettled([
        api.getActiveSchedule(),
        api.getScheduleRevisions(),
        api.getMachines(),
      ]);

      if (schedRes.status === 'fulfilled') setScheduleData(schedRes.value);
      if (revRes.status === 'fulfilled') setRevisions(revRes.value || []);
      if (machRes.status === 'fulfilled') {
        const mList = machRes.value || [];
        setMachines(mList);
        if (mList.length > 0 && !selectedMachineToFail) {
          setSelectedMachineToFail(mList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load scheduler data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSchedule() {
    setGenerating(true);
    try {
      const res = await api.generateSchedule({ horizon_days: horizonDays });
      alert(`Schedule generated successfully! Status: ${res.solver_status}, Batches: ${res.batches_scheduled}`);
      await loadSchedulerData();
    } catch (err: any) {
      alert(`Scheduling error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSimulateDynamicReschedule() {
    if (!selectedMachineToFail) return;
    setRescheduling(true);
    try {
      const res = await api.triggerReschedule({
        machine_id: selectedMachineToFail,
        trigger_reason: 'Automated test: Simulated critical thermal failure on equipment.',
      });
      alert(`Dynamic Rescheduling Completed!\nRevision created: ${res.revision?.revision_number || 1}\nReason: ${res.revision?.trigger_reason || 'Autonomous re-route'}`);
      await loadSchedulerData();
    } catch (err: any) {
      alert(`Reschedule trigger failed: ${err.message}`);
    } finally {
      setRescheduling(false);
    }
  }

  const batches = scheduleData?.batches || [];
  const schedule = scheduleData?.schedule || {};

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">AI Production Scheduler & Dynamic Rescheduling</h1>
          <p className="page-description">
            Constraint Programming (Google OR-Tools CP-SAT) engine optimizing makespan, line changeover times, and machine health gating.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleGenerateSchedule}
            disabled={generating}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} />
            {generating ? 'Solving CP-SAT Model...' : 'Solve Global Schedule'}
          </button>
          <button
            onClick={loadSchedulerData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Scheduler Metrics Overview */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card">
          <div className="metric-label">Schedule Version</div>
          <div className="metric-value" style={{ color: 'var(--primary)' }}>
            v{schedule?.version || 1}.0
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Solver: OR-Tools CP-SAT
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Optimized Makespan</div>
          <div className="metric-value">
            {schedule?.total_makespan_hours?.toFixed(1) || 0}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> hrs</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--status-running)', marginTop: '0.35rem' }}>
            Horizon: {schedule?.horizon_days || 7} Days
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Scheduled Batches</div>
          <div className="metric-value">
            {batches.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {batches.filter((b: any) => b.status === 'SCHEDULED').length} Queued • {batches.filter((b: any) => b.status === 'IN_PROGRESS').length} Active
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Schedule Revisions</div>
          <div className="metric-value" style={{ color: 'var(--secondary)' }}>
            {revisions.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Dynamic real-time replans
          </div>
        </div>
      </div>

      {/* Interactive Rescheduling Trigger Simulator */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-critical)' }}>
              <AlertOctagon size={18} />
              Simulate Machine Breakdown / Dynamic Rescheduling
            </div>
            <div className="card-subtitle">
              Tests Phase 16: Automatically re-routes scheduled batches away from degraded or failed machines without human intervention.
            </div>
          </div>
          <span className="badge badge-critical">Autonomous Guard</span>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Select Machine to Simulate Critical Outage
            </label>
            <select
              value={selectedMachineToFail}
              onChange={(e) => setSelectedMachineToFail(e.target.value)}
              className="input-field"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_code} — {m.name} ({m.status})
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={handleSimulateDynamicReschedule}
              disabled={rescheduling || !selectedMachineToFail}
              className="btn btn-primary"
              style={{ background: 'var(--status-critical)', borderColor: 'var(--status-critical)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RotateCcw size={16} />
              {rescheduling ? 'Re-solving OR-Tools CP-SAT...' : 'Trigger Autonomous Reschedule'}
            </button>
          </div>
        </div>
      </div>

      {/* Batch Sequence Timeline & Revision Audit Log */}
      <div className="grid-2">
        {/* Scheduled Batches List */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Production Batch Sequence</div>
              <div className="card-subtitle">Batches optimized by sequence, due dates, and machine capacities</div>
            </div>
            <span className="badge badge-running">Active Plan</span>
          </div>
          <div className="card-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {batches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <CalendarDays size={36} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                <div>No active batches scheduled. Click &quot;Solve Global Schedule&quot; above.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {batches.map((b: any, index: number) => (
                  <div
                    key={b.id || index}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.85rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'var(--primary-glow)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.batch_number}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Product ID: {b.product_id?.slice(0, 8)}... • Qty: {b.quantity} units
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-running" style={{ fontSize: '0.75rem' }}>
                        {b.status}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {b.scheduled_start ? new Date(b.scheduled_start).toLocaleDateString() : 'Queued'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Schedule Revision Audit Log */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Dynamic Revision Audit Trail</div>
              <div className="card-subtitle">Complete audit history of automated AI rescheduling decisions</div>
            </div>
            <History size={18} style={{ color: 'var(--secondary)' }} />
          </div>
          <div className="card-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {revisions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--status-running)', opacity: 0.7, marginBottom: '0.5rem' }} />
                <div>Baseline Schedule v1.0 active without disruption.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>
                        Revision #{rev.revision_number}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(rev.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      Trigger: <strong style={{ color: 'var(--text-primary)' }}>{rev.reason}</strong>
                    </div>
                    {rev.changes_summary?.degraded_machine && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Triggering machine: <strong style={{ color: 'var(--text-primary)' }}>{rev.changes_summary.degraded_machine}</strong>
                      </div>
                    )}
                    {rev.changes_summary?.reassigned_batches_count !== undefined && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Reassigned batches: {rev.changes_summary.reassigned_batches_count}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
