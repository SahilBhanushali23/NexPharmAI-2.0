'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Gauge,
  Sparkles
} from 'lucide-react';

export default function QualityPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Form parameters
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [temp, setTemp] = useState(25.0);
  const [pressure, setPressure] = useState(1.01);
  const [humidity, setHumidity] = useState(45.0);
  const [mixingSpeed, setMixingSpeed] = useState(120.0);
  const [ph, setPh] = useState(7.1);
  const [mixingTime, setMixingTime] = useState(45);

  const [lastPrediction, setLastPrediction] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const [bRes, qRes] = await Promise.allSettled([
        api.getBatches(),
        api.getQualityHistory(),
      ]);

      if (bRes.status === 'fulfilled') {
        const bList = bRes.value || [];
        setBatches(bList);
        if (bList.length > 0 && !bList.some((batch) => batch.id === selectedBatchId)) {
          setSelectedBatchId(bList[0].id);
        }
      } else {
        console.error('Failed to load batches:', bRes.reason);
      }
      if (qRes.status === 'fulfilled') setHistory(qRes.value || []);
      else console.error('Failed to load quality history:', qRes.reason);

      if (bRes.status === 'rejected' || qRes.status === 'rejected') {
        setLoadError('Some quality data could not be refreshed. Check your connection and try again.');
      } else {
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load quality data:', err);
      setLoadError('Quality data could not be refreshed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunPrediction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatchId) return;
    setPredicting(true);
    try {
      const res = await api.predictQuality({
        batch_id: selectedBatchId,
        temperature: Number(temp),
        pressure: Number(pressure),
        humidity: Number(humidity),
        mixing_speed: Number(mixingSpeed),
        ph: Number(ph),
        mixing_time: Number(mixingTime),
      });
      setLastPrediction(res);
      await loadData();
    } catch (err: any) {
      alert(`Prediction failed: ${err.message}`);
    } finally {
      setPredicting(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Batch Quality & cGMP Release Prediction</h1>
          <p className="page-description">
            Critical Quality Attribute (CQA) assessment from recorded process parameters, with a QA release recommendation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : undefined} />
            {loading ? 'Refreshing...' : 'Refresh Tests'}
          </button>
        </div>
      </div>

      <div aria-live="polite" style={{ minHeight: '1.2rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {loading
          ? 'Refreshing batches and quality history...'
          : lastRefreshed
          ? `Last refreshed ${lastRefreshed.toLocaleTimeString()}`
          : ''}
      </div>
      {loadError && (
        <div role="alert" style={{ marginBottom: '1rem', color: 'var(--status-critical)' }}>
          {loadError}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Quality Prediction Simulator Form */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">CQA Batch Quality Assessment</div>
              <div className="card-subtitle">Input real-time blend / granulate / tablet parameters</div>
            </div>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="card-body">
            <form onSubmit={handleRunPrediction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Select In-Flight Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="input-field"
                  required
                  disabled={batches.length === 0}
                >
                  {batches.length === 0 && <option value="">No batches available</option>}
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} ({b.quantity} units) — Status: {b.status}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Process Temp (°C) [20 - 30]
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Pressure (bar) [0.95 - 1.15]
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={pressure}
                    onChange={(e) => setPressure(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Relative Humidity (%) [35 - 55]
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={humidity}
                    onChange={(e) => setHumidity(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Mixing Speed (rpm) [80 - 180]
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={mixingSpeed}
                    onChange={(e) => setMixingSpeed(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    pH Level [6.5 - 7.5]
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={ph}
                    onChange={(e) => setPh(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Mixing Time (minutes) [Target: 45]
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={mixingTime}
                    onChange={(e) => setMixingTime(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={predicting || !selectedBatchId}
                className="btn btn-primary"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
              >
                <Play size={16} />
                {predicting ? 'Evaluating Quality AI Model...' : 'Predict Batch Quality & Release'}
              </button>
            </form>
          </div>
        </div>

        {/* Prediction Result Display */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <div>
                <div className="card-title">Quality Assessment</div>
                <div className="card-subtitle">Process-parameter score and QA release recommendation</div>
              </div>
              <span className="badge badge-idle">Empirical Score</span>
            </div>
            <div className="card-body">
              {lastPrediction ? (
                <div>
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div
                      style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        color: lastPrediction.status === 'PASS' ? 'var(--status-running)' : lastPrediction.status === 'REJECT' ? 'var(--status-critical)' : 'var(--status-warning)',
                      }}
                    >
                      {lastPrediction.status === 'PASS' ? 'PASS - QA RELEASE REVIEW' : lastPrediction.status === 'REJECT' ? 'REJECT - QUARANTINE' : 'PENDING QA REVIEW'}
                    </div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Quality Score: <strong>{Number(lastPrediction.quality_score).toFixed(1)} / 100</strong>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Pass Probability:</span>
                      <strong>{(Number(lastPrediction.pass_probability) * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Quality Risk:</span>
                      <strong style={{ color: lastPrediction.quality_risk === 'LOW' ? 'var(--status-running)' : lastPrediction.quality_risk === 'HIGH' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                        {lastPrediction.quality_risk}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      A PASS is a QA release recommendation only; it does not formally release the batch.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  <Gauge size={48} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                  <div>Run the CQA Quality Simulator to evaluate in-spec probability.</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Compliant with FDA 21 CFR Part 11 & ICH Q8 / Q9 / Q10 Quality by Design (QbD) principles.
          </div>
        </div>
      </div>

      {/* Historical Test Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Batch Quality History</div>
            <div className="card-subtitle">Showing {history.length} logged quality assessments</div>
          </div>
        </div>
        <div className="card-body">
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              No quality predictions logged yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Batch ID</th>
                  <th>Quality Score</th>
                  <th>Pass Probability</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(h.created_at).toLocaleTimeString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{batches.find((batch) => batch.id === h.batch_id)?.batch_number || `${h.batch_id?.slice(0, 10)}...`}</td>
                    <td style={{ fontWeight: 700 }}>{Number(h.quality_score).toFixed(1)} / 100</td>
                    <td>{(Number(h.pass_probability) * 100).toFixed(1)}%</td>
                    <td>
                      <span className={`badge ${h.status === 'PASS' ? 'badge-running' : h.status === 'REJECT' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
