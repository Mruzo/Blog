import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';
import BackButton from '../components/BackButton';

interface ReturnItem {
  id: number;
  order_item_id: number;
  product_name: string;
  product_uuid: string;
  quantity: number;
  condition: string;
  condition_notes?: string;
}

interface ReturnRequest {
  id: number;
  order: {
    id: number;
  };
  status: string;
  reason: string;
  reason_category: string;
  return_window_days: number;
  return_shipping_cost: number;
  return_shipping_paid_by: string;
  return_label_url?: string;
  return_tracking_number?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
  completed_at?: string;
  refund_amount?: number;
  returnitem_set: ReturnItem[];
  credit_note?: {
    id: number;
    credit_note_number: string;
    amount: number;
    status: string;
    pdf_url?: string;
    stripe_refund_id?: string;
  };
}

const ReturnRequestDetail: React.FC = () => {
  const { returnId } = useParams<{ returnId: string }>();
  const navigate = useNavigate();
  const [returnRequest, setReturnRequest] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (returnId) {
      fetchReturnRequest();
    }
  }, [returnId]);

  const fetchReturnRequest = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch(`/api/returns/${returnId}/`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Return request not found');
        }
        throw new Error(`Failed to load return request: ${response.statusText}`);
      }

      const data = await response.json();
      setReturnRequest(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load return request details.';
      setError(errorMessage);
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      case 'completed':
        return 'info';
      case 'processing':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'fas fa-check-circle';
      case 'pending':
        return 'fas fa-clock';
      case 'rejected':
        return 'fas fa-times-circle';
      case 'completed':
        return 'fas fa-check-double';
      case 'processing':
        return 'fas fa-spinner fa-spin';
      default:
        return 'fas fa-question-circle';
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !returnRequest) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error || 'Return request not found'}
        </div>
        <BackButton to="/product/returns/list/" />
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title={`Return Request #${returnRequest.id}`}
        description={`For Order #${returnRequest.order.id} - Submitted on ${new Date(returnRequest.created_at).toLocaleDateString()}`}
        actions={
          <>
            <span className={`badge bg-${getStatusColor(returnRequest.status)} me-2`}>
              <i className={`${getStatusIcon(returnRequest.status)} me-1`}></i>
              {returnRequest.status.charAt(0).toUpperCase() + returnRequest.status.slice(1)}
            </span>
            <BackButton to="/product/returns/list/" />
          </>
        }
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      <div className="row">
        {/* Return Items */}
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Items to Return</h6>
            </div>
            <div className="card-body p-0">
              {returnRequest.returnitem_set.map((item) => (
                <div key={item.id} className="d-flex align-items-center p-3 border-bottom">
                  <div className="flex-grow-1">
                    <h6 className="subtext-btn-sm mb-1">{item.product_name}</h6>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted subtext-btn-sm">Qty: {item.quantity}</span>
                      <span className="text-muted subtext-btn-sm">Condition: {item.condition.replace('_', ' ')}</span>
                    </div>
                    {item.condition_notes && (
                      <small className="text-muted d-block mt-1">{item.condition_notes}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Information */}
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Return Information</h6>
            </div>
            <div className="card-body">
              <div className="mb-2">
                <strong className="subtext-btn-sm">Reason Category:</strong>
                <span className="subtext-btn-sm ms-2">{returnRequest.reason_category.replace('_', ' ')}</span>
              </div>
              <div className="mb-2">
                <strong className="subtext-btn-sm">Reason:</strong>
                <p className="subtext-btn-sm mt-1">{returnRequest.reason}</p>
              </div>
              <div className="mb-2">
                <strong className="subtext-btn-sm">Return Window:</strong>
                <span className="subtext-btn-sm ms-2">{returnRequest.return_window_days} days</span>
              </div>
              <div>
                <strong className="subtext-btn-sm">Return Shipping:</strong>
                <span className="subtext-btn-sm ms-2">
                  {returnRequest.return_shipping_paid_by === 'customer' 
                    ? `Customer pays ($${returnRequest.return_shipping_cost.toFixed(2)})`
                    : 'Store pays'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="col-lg-4">
          {/* Refund Summary */}
          {returnRequest.refund_amount !== undefined && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h6 className="subtext-btn-sm mb-0">Refund Summary</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span className="subtext-btn-sm">Refund Amount:</span>
                  <span className="subtext-btn-sm fw-bold">${returnRequest.refund_amount.toFixed(2)}</span>
                </div>
                {returnRequest.return_shipping_paid_by === 'customer' && (
                  <div className="d-flex justify-content-between mb-2">
                    <span className="subtext-btn-sm text-muted">Return Shipping:</span>
                    <span className="subtext-btn-sm text-muted">-${returnRequest.return_shipping_cost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Credit Note */}
          {returnRequest.credit_note && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h6 className="subtext-btn-sm mb-0">Credit Note</h6>
              </div>
              <div className="card-body">
                <div className="subtext-btn-sm mb-2">
                  <div><strong>#:</strong> {returnRequest.credit_note.credit_note_number}</div>
                  <div><strong>Amount:</strong> ${returnRequest.credit_note.amount.toFixed(2)}</div>
                  <div><strong>Status:</strong> {returnRequest.credit_note.status}</div>
                  {returnRequest.credit_note.stripe_refund_id && (
                    <div><strong>Transaction ID:</strong> <code>{returnRequest.credit_note.stripe_refund_id}</code></div>
                  )}
                </div>
                {returnRequest.credit_note.pdf_url && (
                  <a
                    href={returnRequest.credit_note.pdf_url}
                    className="btn btn-outline-primary btn-sm w-100 subtext-btn-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="fas fa-download me-1"></i>Download Credit Note PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Return Label */}
          {returnRequest.return_label_url && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light">
                <h6 className="subtext-btn-sm mb-0">Return Shipping Label</h6>
              </div>
              <div className="card-body">
                {returnRequest.return_tracking_number && (
                  <div className="subtext-btn-sm mb-2">
                    <strong>Tracking Number:</strong><br />
                    <code>{returnRequest.return_tracking_number}</code>
                  </div>
                )}
                <a
                  href={returnRequest.return_label_url}
                  className="btn btn-outline-success btn-sm w-100 subtext-btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fas fa-download me-1"></i>Download Return Label
                </a>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="subtext-btn-sm mb-0">Timeline</h6>
            </div>
            <div className="card-body">
              <div className="subtext-btn-sm">
                <div className="mb-2">
                  <strong>Created:</strong><br />
                  {new Date(returnRequest.created_at).toLocaleString()}
                </div>
                {returnRequest.approved_at && (
                  <div className="mb-2">
                    <strong>Approved:</strong><br />
                    {new Date(returnRequest.approved_at).toLocaleString()}
                  </div>
                )}
                {returnRequest.rejected_at && (
                  <div className="mb-2">
                    <strong>Rejected:</strong><br />
                    {new Date(returnRequest.rejected_at).toLocaleString()}
                  </div>
                )}
                {returnRequest.completed_at && (
                  <div>
                    <strong>Completed:</strong><br />
                    {new Date(returnRequest.completed_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="d-grid gap-2">
            <SmallButton 
              variant="outline-primary"
              to={`/product/order/${returnRequest.order.id}/`}
            >
              <i className="fas fa-shopping-bag me-1"></i>View Original Order
            </SmallButton>
            <SmallButton 
              variant="outline-primary"
              to="/product/returns/list/"
            >
              <i className="fas fa-list me-1"></i>Back to Returns
            </SmallButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnRequestDetail;
