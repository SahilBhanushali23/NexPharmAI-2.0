'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  TrendingUp,
  Sparkles,
  Calendar,
  AlertCircle,
  Database,
  BarChart,
  Layers
} from 'lucide-react';

export default function ForecastingPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [horizonDays, setHorizonDays] = useState(30);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await api.getProducts();
      setProducts(data || []);
      if (data && data.length > 0) {
        setSelectedProductId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }

  async function handleGenerateForecast() {
    if (!selectedProductId) return;
    setLoading(true);
    setForecast(null);
    try {
      const res = await api.generateForecast({
        product_id: selectedProductId,
        horizon_days: Number(horizonDays),
      });
      setForecast(res);
    } catch (err: any) {
      alert(`Forecast generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const forecastItems = forecast?.forecasts || [];
  const chartItems = forecastItems.filter((_: any, index: number) => {
    const sampleEvery = Math.max(1, Math.ceil(forecastItems.length / 14));
    return index % sampleEvery === 0;
  }).slice(0, 14);
  const dailyAverage = forecastItems.length > 0
    ? forecastItems.reduce((sum: number, item: any) => sum + Number(item.predicted_demand || 0), 0) / forecastItems.length
    : 0;
  const averageLowerBound = forecastItems.length > 0
    ? forecastItems.reduce((sum: number, item: any) => sum + Number(item.lower_bound || 0), 0) / forecastItems.length
    : 0;
  const averageUpperBound = forecastItems.length > 0
    ? forecastItems.reduce((sum: number, item: any) => sum + Number(item.upper_bound || 0), 0) / forecastItems.length
    : 0;
  const maximumDemand = Math.max(...forecastItems.map((item: any) => Number(item.predicted_demand || 0)), 1);
  const selectedProduct = products.find((product) => product.id === selectedProductId);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Demand Forecasting Engine</h1>
          <p className="page-description">
            Time-series pharmaceutical demand projection (7-day, 30-day, 90-day horizons) informing raw material procurement and production planning.
          </p>
        </div>

        {/* Data Integrity Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
          <Database size={16} style={{ color: 'var(--status-warning)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--status-warning)', fontWeight: 600 }}>
            INTEGRITY STATUS: HISTORICAL SALES DATASET REQUIRED
          </span>
        </div>
      </div>

      {/* Control Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Forecast Parameters</div>
            <div className="card-subtitle">Select SKU and planning horizon</div>
          </div>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Target Pharmaceutical SKU
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setForecast(null);
              }}
              className="input-field"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_name} — SKU: {p.product_code} — Type: {p.description || 'Not specified'}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '180px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
              Forecast Horizon
            </label>
            <select
              value={horizonDays}
              onChange={(e) => {
                setHorizonDays(Number(e.target.value));
                setForecast(null);
              }}
              className="input-field"
            >
              <option value={7}>7 Days (Short-term)</option>
              <option value={30}>30 Days (Monthly)</option>
              <option value={90}>90 Days (Quarterly S&OP)</option>
            </select>
          </div>

          <div>
            <button
              onClick={handleGenerateForecast}
              disabled={loading || !selectedProductId}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <TrendingUp size={16} />
              {loading ? 'Computing Time-Series...' : 'Generate Demand Forecast'}
            </button>
          </div>
        </div>
      </div>

      {/* Forecast Output */}
      {forecast ? (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Forecast Projections: {forecast.product_name || 'Pharmaceutical SKU'}</div>
              <div className="card-subtitle">
                Horizon: {forecast.horizon_days} Days • Total Projected Demand: {Number(forecast.total_projected_demand || 0).toLocaleString()} units
              </div>
            </div>
            <span className="badge badge-warning">{forecast.training_data_status || 'Historical sales dataset required for model training'}</span>
          </div>
          <div className="card-body">
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div className="metric-card">
                <div className="metric-label">Projected Daily Demand Mean</div>
                <div className="metric-value">
                  {dailyAverage.toFixed(0)}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> units/day</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Projected Daily Range</div>
                <div className="metric-value" style={{ color: 'var(--primary)' }}>
                  {averageLowerBound.toFixed(0)}–{averageUpperBound.toFixed(0)}<span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> units/day</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Recommended Production Batches</div>
                <div className="metric-value" style={{ color: 'var(--secondary)' }}>
                  {selectedProduct?.batch_size
                    ? `${Math.ceil(Number(forecast.total_projected_demand || 0) / selectedProduct.batch_size)} Batches`
                    : 'Batch size unavailable'}
                </div>
              </div>
            </div>

            {/* Daily projections breakdown preview */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                Projected Daily Demand
              </div>
              {chartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  No forecast points were returned for this SKU.
                </div>
              ) : (
                <div aria-label="Forecasted daily demand chart" style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', height: '180px', padding: '0.5rem 0' }}>
                  {chartItems.map((item: any, idx: number) => (
                  <div key={item.date} title={`${item.date}: ${Number(item.predicted_demand).toLocaleString()} units`} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(4, Number(item.predicted_demand || 0) / maximumDemand * 100)}%`,
                        background: 'linear-gradient(to top, var(--secondary), var(--primary))',
                        borderRadius: '3px',
                      }}
                    ></div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.date?.slice(5)}</span>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <div>Select SKU and horizon above, then click &quot;Generate Demand Forecast&quot;.</div>
        </div>
      )}
    </div>
  );
}
