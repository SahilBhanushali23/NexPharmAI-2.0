'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Package,
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ShieldAlert
} from 'lucide-react';

export default function InventoryPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(100);
  const [adjustType, setAdjustType] = useState('RECEIVE');
  const [adjustNotes, setAdjustNotes] = useState('Supplier delivery stock replenishment');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    try {
      const data = await api.getInventory();
      setMaterials(data || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustModal) return;
    setAdjusting(true);
    try {
      await api.adjustStock(adjustModal.id, {
        quantity_delta: adjustType === 'CONSUME' || adjustType === 'SCRAP'
          ? -Math.abs(Number(adjustQty))
          : adjustType === 'RECEIVE'
          ? Math.abs(Number(adjustQty))
          : Number(adjustQty),
        transaction_type: adjustType,
        notes: adjustNotes,
      });
      setAdjustModal(null);
      await loadInventory();
    } catch (err: any) {
      alert(`Adjustment failed: ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  }

  const lowStockMaterials = materials.filter((m) => m.quantity <= m.reorder_level);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Raw Material Inventory & Shortage Gating</h1>
          <p className="page-description">
            Active stock monitoring, reorder thresholds, cGMP lot traceability, and automated production gating.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadInventory}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Refresh Stock
          </button>
        </div>
      </div>

      {/* Inventory KPI Cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card">
          <div className="metric-label">Total Material SKUs</div>
          <div className="metric-value">{materials.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Active API, Excipients, & Packaging
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Low Stock Gating Warnings</div>
          <div className="metric-value" style={{ color: lowStockMaterials.length > 0 ? 'var(--status-critical)' : 'var(--status-running)' }}>
            {lowStockMaterials.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Materials below safety reorder buffer
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Scheduler Inventory Status</div>
          <div className="metric-value" style={{ color: 'var(--primary)', fontSize: '1.5rem' }}>
            {lowStockMaterials.length > 0 ? 'GATED CONSTRAINTS' : 'SUFFICIENT'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            OR-Tools production orders checked against bills-of-materials
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Inventory Master Records</div>
            <div className="card-subtitle">Current stock vs minimum safety thresholds</div>
          </div>
          <span className="badge badge-running">Active Ledger</span>
        </div>
        <div className="card-body">
          {materials.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              No inventory materials registered.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material Code</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Safety Reorder Point</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const isLow = m.quantity <= m.reorder_level;
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{m.material_code}</td>
                      <td>{m.material_name}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.category}</td>
                      <td style={{ fontWeight: 700 }}>
                        {m.quantity?.toLocaleString()} {m.unit}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {m.reorder_level?.toLocaleString()} {m.unit}
                      </td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-critical' : 'badge-running'}`} style={{ fontSize: '0.75rem' }}>
                          {isLow ? 'CRITICAL SHORTAGE' : 'NOMINAL'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setAdjustModal(m);
                            setAdjustQty(500);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title">Adjust Stock: {adjustModal.material_name}</div>
              <button onClick={() => setAdjustModal(null)} className="btn btn-outline btn-sm">✕</button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Adjustment Type
                  </label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value)}
                    className="input-field"
                  >
                    <option value="RECEIVE">Stock In / Receipt (+)</option>
                    <option value="CONSUME">Production Consumption (-)</option>
                    <option value="SCRAP">Scrap / QC Rejection (-)</option>
                    <option value="ADJUST">Inventory Audit Delta (+/-)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Quantity ({adjustModal.unit})
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Audit Reason / Notes
                  </label>
                  <input
                    type="text"
                    required
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setAdjustModal(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={adjusting} className="btn btn-primary">
                  {adjusting ? 'Updating Ledger...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
