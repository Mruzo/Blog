import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PageHeader from '../components/PageHeader';
import SmallButton from '../components/SmallButton';

interface ReturnItem {
  id: number;
  order_item_id: number;
  product_name: string;
  quantity: number;
  condition: string;
}

interface ReturnRequest {
  id: number;
  order: {
    id: number;
  };
  status: string;
  reason_category: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  refund_amount?: number;
  return_tracking_number?: string;
  credit_note?: {
    id: number;
    credit_note_number: string;
    amount: number;
    status: string;
    pdf_url?: string;
  };
  returnitem_set: ReturnItem[];
}

const ReturnRequestList: React.FC = () => {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Token ${token}`;
      }

      const response = await fetch('/api/returns/list/', {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load return requests');
      }

      const data = await response.json();
      setReturns(data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load return requests');
      setMessage(err instanceof Error ? err.message : 'Failed to load return requests');
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

  if (error && returns.length === 0) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '1200px' }}>
      <PageHeader
        title="My Returns"
        description="View and track your return requests"
      />

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={3000}
      />

      {returns.length === 0 ? (
        <div className="text-center py-5">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5">
              <i className="fas fa-undo fa-4x text-muted mb-3"></i>
              <h5 className="subtext-btn-sm text-muted mb-3">No return requests yet</h5>
              <p className="subtext-btn-sm text-muted mb-4">
                You haven't submitted any return requests.
              </p>
              <Link to="/product/my-orders/" className="btn btn-primary subtext-btn-sm">
                <i className="fas fa-shopping-bag me-1"></i>View Orders
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {returns.map((returnRequest) => (
            <div key={returnRequest.id} className="col-12 mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="subtext-btn-sm mb-1">Return #{returnRequest.id}</h6>
                      <small className="text-muted">
                        For Order #{returnRequest.order.id} - {new Date(returnRequest.created_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <span className={`badge bg-${getStatusColor(returnRequest.status)}`}>
                        <i className={`${getStatusIcon(returnRequest.status)} me-1`}></i>
                        {returnRequest.status.charAt(0).toUpperCase() + returnRequest.status.slice(1)}
                      </span>
                      {returnRequest.refund_amount && (
                        <span className="subtext-btn-sm fw-bold">${returnRequest.refund_amount.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-8">
                      <h6 className="subtext-btn-sm mb-3">Items to Return</h6>
                      {returnRequest.returnitem_set.map((item) => (
                        <div key={item.id} className="d-flex justify-content-between align-items-center mb-2">
                          <div>
                            <span className="subtext-btn-sm">{item.product_name}</span>
                            <small className="text-muted d-block">
                              Qty: {item.quantity} - Condition: {item.condition.replace('_', ' ')}
                            </small>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2">
                        <small className="text-muted">
                          <strong>Reason:</strong> {returnRequest.reason_category.replace('_', ' ')}
                        </small>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      {returnRequest.credit_note && (
                        <div className="mb-3">
                          <h6 className="subtext-btn-sm mb-2">Credit Note</h6>
                          <div className="subtext-btn-sm">
                            <div><strong>#:</strong> {returnRequest.credit_note.credit_note_number}</div>
                            <div><strong>Amount:</strong> ${returnRequest.credit_note.amount.toFixed(2)}</div>
                            <div><strong>Status:</strong> {returnRequest.credit_note.status}</div>
                          </div>
                        </div>
                      )}
                      {returnRequest.return_tracking_number && (
                        <div>
                          <h6 className="subtext-btn-sm mb-2">Tracking</h6>
                          <div className="subtext-btn-sm">
                            <code>{returnRequest.return_tracking_number}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-footer bg-transparent border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <SmallButton 
                      variant="outline-primary"
                      to={`/product/returns/${returnRequest.id}/`}
                    >
                      <i className="fas fa-eye me-1"></i>View Details
                    </SmallButton>
                    {returnRequest.credit_note?.pdf_url && (
                      <a
                        href={returnRequest.credit_note.pdf_url}
                        className="btn btn-outline-success btn-sm subtext-btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fas fa-download me-1"></i>Download Credit Note
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReturnRequestList;
