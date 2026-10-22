'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import {
  Boxes,
  Plus,
  RefreshCw,
  Play,
  CheckCircle,
  Clock,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export default function ProductionPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [orderNumber, setOrderNumber] = useState(`PO-${Date.now().toString().slice(-4)}`);
  const [productId, setProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState(50000);
  const [priority, setPriority] = useState('MEDIUM');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ordRes, batRes, prodRes] = await Promise.allSettled([
        api.getOrders(),
        api.getBatches(),
        api.getProducts(),
      ]);

      if (ordRes.status === 'fulfilled') setOrders(ordRes.value || []);
      if (batRes.status === 'fulfilled') setBatches(batRes.value || []);
      if (prodRes.status === 'fulfilled') {
        const pList = prodRes.value || [];
        setProducts(pList);
        if (pList.length > 0 && !productId) {
          setProductId(pList[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading production data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber || !productId) return;
    setCreating(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      await api.createOrder({
        order_code: orderNumber,
        product_id: productId,
        quantity: Number(targetQuantity),
        priority: priority,
        due_date: dueDate.toISOString(),
      });
      setShowOrderModal(false);
      setOrderNumber(`PO-${Date.now().toString().slice(-4)}`);
      await loadData();
    } catch (err: any) {
      alert(`Order creation failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateBatchStatus(batchId: string, nextStatus: string) {
    try {
      await api.updateBatchStatus(batchId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(`Batch update failed: ${err.message}`);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Pharmaceutical Orders & Batch Control</h1>
          <p className="page-description">
            cGMP Batch Manufacturing Records (BMR), production orders, recipe gating, and real-time execution tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowOrderModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> New Production Order
          </button>
          <button
            onClick={loadData}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Production Orders Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Production Orders</div>
            <div className="card-subtitle">Master customer & distribution demands</div>
          </div>
          <span className="badge badge-running">{orders.length} Active Orders</span>
        </div>
        <div className="card-body">
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              No production orders created yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Product</th>
                  <th>Target Quantity</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{o.order_code}</td>
                    <td>{products.find((product) => product.id === o.product_id)?.product_name || o.product_id?.slice(0, 8)}</td>
                    <td>{o.quantity?.toLocaleString()} units</td>
                    <td>
                      <span className={`badge ${o.priority === 'CRITICAL' || o.priority === 'HIGH' ? 'badge-critical' : 'badge-warning'}`} style={{ fontSize: '0.75rem' }}>
                        {o.priority}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-running" style={{ fontSize: '0.75rem' }}>{o.status}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {o.due_date ? new Date(o.due_date).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Active Batches Execution Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Batch Manufacturing Execution</div>
            <div className="card-subtitle">Individual batch runs dispatched by the OR-Tools scheduler</div>
          </div>
          <span className="badge badge-running">{batches.length} Batches Tracked</span>
        </div>
        <div className="card-body">
          {batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              No batches generated yet. Run the AI Production Scheduler to create batches.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Batch Quantity</th>
                  <th>Status</th>
                  <th>Scheduled Start</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.batch_number}</td>
                    <td>{b.quantity?.toLocaleString()} units</td>
                    <td>
                      <span
                        className={`badge ${
                          b.status === 'COMPLETED'
                            ? 'badge-running'
                            : b.status === 'IN_PROGRESS'
                            ? 'badge-warning'
                            : 'badge-idle'
                        }`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {b.scheduled_start ? new Date(b.scheduled_start).toLocaleString() : 'Pending Dispatch'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {b.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleUpdateBatchStatus(b.id, 'IN_PROGRESS')}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                          >
                            Start Batch
                          </button>
                        )}
                        {b.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateBatchStatus(b.id, 'COMPLETED')}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: 'var(--status-running)', borderColor: 'var(--status-running)' }}
                          >
                            Complete Batch
                          </button>
                        )}
                        {b.status === 'COMPLETED' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--status-running)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={14} /> Passed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal for New Order */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div className="modal-title">Create Production Order</div>
              <button onClick={() => setShowOrderModal(false)} className="btn btn-outline btn-sm">✕</button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Order Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Select Pharmaceutical Product *
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="input-field"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name} ({p.description || 'Type not specified'}) - {p.product_code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Target Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Scheduling Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="input-field"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Standard</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical Rush Order</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Saving...' : 'Submit Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
