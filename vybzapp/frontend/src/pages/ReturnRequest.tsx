import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';
import BackButton from '../components/BackButton';

// Helper function to get CSRF token from cookies
function getCookie(name: string): string | null {
  let cookieValue: string | null = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

interface AvailableReturnItem {
  order_item_id: number;
  product_name: string;
  product_uuid: string;
  quantity_ordered: number;
  quantity_returned: number;
  available_quantity: number;
  unit_price: number;
}

interface ReturnRequestFormData {
  order_id: number;
  reason: string;
  reason_category: string;
  return_items: Array<{
    order_item_id: number;
    quantity: number;
    condition: string;
    condition_notes?: string;
  }>;
  return_shipping_paid_by: 'customer' | 'store';
}

const REASON_CATEGORIES = [
  { value: 'defective', label: 'Defective/Damaged' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'changed_mind', label: 'Changed Mind' },
  { value: 'size_fit', label: 'Size/Fit Issue' },
  { value: 'quality', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
];

const CONDITION_OPTIONS = [
  { value: 'new', label: 'New/Unopened' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

const ReturnRequest: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [availableItems, setAvailableItems] = useState<AvailableReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  const [formData, setFormData] = useState<ReturnRequestFormData>({
    order_id: parseInt(orderId || '0'),
    reason: '',
    reason_category: '',
    return_items: [],
    return_shipping_paid_by: 'customer',
  });

  useEffect(() => {
    if (orderId) {
      fetchAvailableItems();
    }
  }, [orderId]);

  const fetchAvailableItems = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`/api/orders/${orderId}/returnable-items/`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load returnable items');
      }

      const data = await response.json();
      setAvailableItems(data);
      
      // Initialize form data with available items
      setFormData(prev => ({
        ...prev,
        return_items: data.map((item: AvailableReturnItem) => ({
          order_item_id: item.order_item_id,
          quantity: 0,
          condition: 'good',
          condition_notes: '',
        })),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load returnable items');
      setMessage(err instanceof Error ? err.message : 'Failed to load returnable items');
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.return_items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, return_items: newItems };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.reason.trim()) {
      setMessage('Please provide a reason for the return');
      setMessageType('warning');
      setShowMessage(true);
      return;
    }

    if (!formData.reason_category) {
      setMessage('Please select a reason category');
      setMessageType('warning');
      setShowMessage(true);
      return;
    }

    // Filter out items with quantity 0
    const itemsToReturn = formData.return_items.filter(item => item.quantity > 0);
    
    if (itemsToReturn.length === 0) {
      setMessage('Please select at least one item to return');
      setMessageType('warning');
      setShowMessage(true);
      return;
    }

    // Validate quantities
    for (const item of itemsToReturn) {
      const availableItem = availableItems.find(ai => ai.order_item_id === item.order_item_id);
      if (availableItem && item.quantity > availableItem.available_quantity) {
        setMessage(`Cannot return ${item.quantity} of ${availableItem.product_name}. Only ${availableItem.available_quantity} available.`);
        setMessageType('warning');
        setShowMessage(true);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      // Add CSRF token for POST requests
      const csrfToken = getCookie('csrftoken') || 
                       document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await fetch('/api/returns/', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          order_id: formData.order_id,
          reason: formData.reason,
          reason_category: formData.reason_category,
          return_items: itemsToReturn,
          return_shipping_paid_by: formData.return_shipping_paid_by,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit return request');
      }

      const data = await response.json();
      setMessage('Return request submitted successfully!');
      setMessageType('success');
      setShowMessage(true);
      
      // Redirect to return detail page
      setTimeout(() => {
        navigate(`/product/returns/${data.id}/`);
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit return request';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && availableItems.length === 0) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
        <BackButton to={`/product/order/${orderId}/`} />
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title="Request Return"
        description={`Return items from Order #${orderId}`}
        actions={<BackButton to={`/product/order/${orderId}/`} />}
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
        duration={5000}
      />

      <form onSubmit={handleSubmit}>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light">
            <h6 className="subtext-btn-sm mb-0">Items to Return</h6>
          </div>
          <div className="card-body">
            {availableItems.length === 0 ? (
              <p className="subtext-btn-sm text-muted">No items available for return from this order.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th className="subtext-btn-sm">Product</th>
                      <th className="subtext-btn-sm">Available</th>
                      <th className="subtext-btn-sm">Quantity</th>
                      <th className="subtext-btn-sm">Condition</th>
                      <th className="subtext-btn-sm">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableItems.map((item, index) => (
                      <tr key={item.order_item_id}>
                        <td className="subtext-btn-sm">
                          <strong>{item.product_name}</strong>
                          <br />
                          <small className="text-muted">Ordered: {item.quantity_ordered}</small>
                          {item.quantity_returned > 0 && (
                            <small className="text-muted d-block">Already returned: {item.quantity_returned}</small>
                          )}
                        </td>
                        <td className="subtext-btn-sm">{item.available_quantity}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            min="0"
                            max={item.available_quantity}
                            value={formData.return_items[index]?.quantity || 0}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            disabled={item.available_quantity === 0}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={formData.return_items[index]?.condition || 'good'}
                            onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                            disabled={!formData.return_items[index]?.quantity || formData.return_items[index]?.quantity === 0}
                          >
                            {CONDITION_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <textarea
                            className="form-control form-control-sm"
                            rows={2}
                            placeholder="Condition notes (required for damaged/poor items)"
                            value={formData.return_items[index]?.condition_notes || ''}
                            onChange={(e) => handleItemChange(index, 'condition_notes', e.target.value)}
                            disabled={!formData.return_items[index]?.quantity || formData.return_items[index]?.quantity === 0}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light">
            <h6 className="subtext-btn-sm mb-0">Return Information</h6>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label subtext-btn-sm">
                Reason Category <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                value={formData.reason_category}
                onChange={(e) => setFormData(prev => ({ ...prev, reason_category: e.target.value }))}
                required
              >
                <option value="">Select a reason...</option>
                {REASON_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label subtext-btn-sm">
                Reason Details <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Please provide details about why you're returning these items..."
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label subtext-btn-sm">Return Shipping</label>
              <select
                className="form-select"
                value={formData.return_shipping_paid_by}
                onChange={(e) => setFormData(prev => ({ ...prev, return_shipping_paid_by: e.target.value as 'customer' | 'store' }))}
              >
                <option value="customer">I will pay return shipping</option>
                <option value="store">Store will pay return shipping</option>
              </select>
              {formData.return_shipping_paid_by === 'customer' && (
                <small className="text-muted subtext-btn-sm d-block mt-1">
                  Return shipping cost will be deducted from your refund amount.
                </small>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          <BackButton to={`/product/order/${orderId}/`} />
          <button
            type="submit"
            className="btn btn-primary subtext-btn-sm"
            disabled={submitting || availableItems.length === 0}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane me-1"></i>
                Submit Return Request
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReturnRequest;
