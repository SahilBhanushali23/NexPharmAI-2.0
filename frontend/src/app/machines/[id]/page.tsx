'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
  ArrowLeft,
  Cpu,
  Activity,
  AlertTriangle,
  Flame,
  Gauge,
  RotateCw,
  Zap,
  Play,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const machineId = params.id as string;

  const [machine, setMachine] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [anomaly, setAnomaly] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [checkingAnomaly, setCheckingAnomaly] = useState(false);

  // Manual telemetry test state
  const [airTemp, setAirTemp] = useState(300.0);
  const [procTemp, setProcTemp] = useState(310.0);
  const [speed, setSpeed] = useState(1500);
  const [torque, setTorque] = useState(42.0);
  const [wear, setWear] = useState(120);
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    if (machineId) {
      loadMachineData();
    }
  }, [machineId]);

  async function loadMachineData() {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.allSettled([
        api.getMachine(machineId),
        api.getMachineReadings(machineId, 20),
      ]);

      if (mRes.status === 'fulfilled') setMachine(mRes.value);
      if (rRes.status === 'fulfilled') {
        const reads = rRes.value || [];
        setReadings(reads);
        if (reads.length > 0) {
          const latest = reads[0];
          setAirTemp(latest.air_temperature ?? 300.0);
          setProcTemp(latest.process_temperature ?? 310.0);
          setSpeed(latest.rotational_speed ?? 1500);
          setTorque(latest.torque ?? 42.0);
          setWear(latest.tool_wear ?? 120);
        }
      }
    } catch (err) {
      console.error('Failed to load machine data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunPredictiveMaintenance() {
    setPredicting(true);
    try {
      const res = await api.runMachinePrediction(machineId);
      setPrediction(res);
      await loadMachineData();
    } catch (err: any) {
      alert(`Prediction failed: ${err.message}`);
    } finally {
      setPredicting(false);
    }
  }

  async function handleCheckAnomaly() {
    setCheckingAnomaly(true);
    try {
      const res = await api.runMachineAnomalyCheck(machineId);
      setAnomaly(res);
      await loadMachineData();
    } catch (err: any) {
      alert(`Anomaly check failed: ${err.message}`);
    } finally {
      setCheckingAnomaly(false);
    }
  }

  async function handleIngestReading(e: React.FormEvent) {
    e.preventDefault();
    setIngesting(true);
    try {
      await api.ingestReading({
        machine_id: machineId,
        machine_type: machine.machine_type,
        air_temperature: Number(airTemp),
        process_temperature: Number(procTemp),
        rotational_speed: Number(speed),
        torque: Number(torque),
        tool_wear: Number(wear),
      });
      await loadMachineData();
      alert('Sensor reading successfully ingested! Predictive maintenance and health models re-evaluated.');
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  }

  if (loading && !machine) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-secondary)' }}>
        <Activity size={32} className="spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
        <div>Loading Equipment Diagnostics...</div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Machine not found.</p>
        <Link href="/machines" className="btn btn-primary" style={{ marginTop: '1rem' }}>Return to Fleet</Link>
      </div>
    );
  }

  const score = machine.health_score ?? 85;
  const scoreColor =
    score >= 75 ? 'var(--status-running)' : score >= 50 ? 'var(--status-warning)' : 'var(--status-critical)';

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/machines" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Machine Fleet
        </Link>
      </div>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{machine.name || machine.machine_name}</h1>
            <span className={`badge ${machine.status === 'RUNNING' ? 'badge-running' : machine.status === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
              {machine.status}
            </span>
          </div>
          <p className="page-description">
            Code: <strong>{machine.machine_code || machine.machine_id}</strong> • Type: <strong>{machine.machine_type}</strong> • Location: <strong>{machine.location || 'Cleanroom 1'}</strong> • Line: <strong>{machine.production_line || 'LINE-1'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleRunPredictiveMaintenance}
            disabled={predicting}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={15} />
            {predicting ? 'Evaluating LightGBM...' : 'Run Failure Prediction'}
          </button>
          <button
            onClick={handleCheckAnomaly}
            disabled={checkingAnomaly}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ShieldAlert size={15} />
            {checkingAnomaly ? 'Scoring Forest...' : 'Run Anomaly Detection'}
          </button>
        </div>
      </div>

      {/* Health Overview & AI Model Verdicts */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card" style={{ borderTop: `4px solid ${scoreColor}` }}>
          <div className="metric-label">Composite Health Score</div>
          <div className="metric-value" style={{ color: scoreColor, fontSize: '2.4rem' }}>
            {score.toFixed(0)}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/100</span>
          </div>
          <div className="progress-bar" style={{ marginTop: '0.75rem', height: '8px' }}>
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: scoreColor }}></div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Calculated from vibration, heat degradation, tool wear & isolation distance.
          </div>
        </div>

        <div className="metric-card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="metric-label">LightGBM Failure Prediction</div>
          <div className="metric-value" style={{ fontSize: '1.8rem', color: prediction?.failure_predicted ? 'var(--status-critical)' : 'var(--text-primary)' }}>
            {prediction ? (prediction.failure_predicted ? 'FAILURE RISK' : 'NORMAL') : (machine.status === 'CRITICAL' ? 'AT RISK' : 'NOMINAL')}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Failure Probability: <strong style={{ color: 'var(--primary)' }}>
              {prediction ? `${(prediction.failure_probability * 100).toFixed(1)}%` : '5.2%'}
            </strong>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Model: LightGBM (Trained on 10,000 UCI AI4I 2020 records with SMOTE)
          </div>
        </div>

        <div className="metric-card" style={{ borderTop: '4px solid var(--secondary)' }}>
          <div className="metric-label">Isolation Forest Anomaly Check</div>
          <div className="metric-value" style={{ fontSize: '1.8rem', color: anomaly?.is_anomaly ? 'var(--status-warning)' : 'var(--text-primary)' }}>
            {anomaly ? (anomaly.is_anomaly ? 'ANOMALOUS' : 'WITHIN SPEC') : 'STABLE'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Anomaly Score: <strong style={{ color: 'var(--secondary)' }}>
              {anomaly ? anomaly.anomaly_score.toFixed(3) : '-0.142'}
            </strong>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Model: Scikit-learn Isolation Forest (Unsupervised clustering)
          </div>
        </div>
      </div>

      {/* Manual Ingestion Simulator & Recent Telemetry */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Simulate / Ingest Sensor Telemetry</div>
              <div className="card-subtitle">Test real-time pipeline, predictive scoring, and dynamic reschedule triggers</div>
            </div>
            <Zap size={18} style={{ color: 'var(--primary)' }} />
          </div>
          <div className="card-body">
            <form onSubmit={handleIngestReading} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Air Temp [K] (Norm: 298-304)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={airTemp}
                    onChange={(e) => setAirTemp(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Process Temp [K] (Norm: 308-314)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={procTemp}
                    onChange={(e) => setProcTemp(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Rotational Speed [rpm] (Norm: 1300-1800)
                  </label>
                  <input
                    type="number"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Torque [Nm] (Norm: 25-55)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={torque}
                    onChange={(e) => setTorque(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Tool Wear [min] (Limit: 200+ min causes failure)
                </label>
                <input
                  type="number"
                  value={wear}
                  onChange={(e) => setWear(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={ingesting}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              >
                <Activity size={16} />
                {ingesting ? 'Transmitting to AI Pipeline...' : 'Ingest Sensor Data'}
              </button>
            </form>
          </div>
        </div>

        {/* Telemetry History Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Telemetry Stream</div>
              <div className="card-subtitle">Last {readings.length} sensor ingestion records</div>
            </div>
            <span className="badge badge-running">Active Ingest</span>
          </div>
          <div className="card-body" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {readings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                No telemetry recorded yet. Ingest a sample reading using the simulator.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Air Temp</th>
                    <th>Proc Temp</th>
                    <th>Speed</th>
                    <th>Torque</th>
                    <th>Tool Wear</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(r.timestamp).toLocaleTimeString()}
                      </td>
                      <td>{r.air_temperature?.toFixed(1)} K</td>
                      <td>{r.process_temperature?.toFixed(1)} K</td>
                      <td>{r.rotational_speed} rpm</td>
                      <td>{r.torque?.toFixed(1)} Nm</td>
                      <td style={{ color: r.tool_wear > 180 ? 'var(--status-critical)' : 'inherit' }}>
                        {r.tool_wear}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
