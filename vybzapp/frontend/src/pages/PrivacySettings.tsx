import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import { snmovApiUrl } from '../utils/snmovApi';
import BackButton from '../components/BackButton';
import LoadingSpinner from '../components/LoadingSpinner';
import MessagePopup from '../components/MessagePopup';
import PasswordField from '../components/PasswordField';

const PrivacySettings: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useApi();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('info');
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token || !currentUser) {
      sessionStorage.setItem('redirectAfterLogin', '/account/privacy/');
      navigate('/login/');
      return;
    }
    setLoading(false);
  }, [currentUser, navigate]);

  const showPopup = (text: string, type: typeof messageType) => {
    setMessage(text);
    setMessageType(type);
    setShowMessage(true);
  };

  const handleExport = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    setExporting(true);
    try {
      const response = await fetch(snmovApiUrl('gdpr/export/'), {
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `justvybz_data_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showPopup('Your data export has been downloaded.', 'success');
    } catch (err) {
      showPopup(err instanceof Error ? err.message : 'Failed to export data', 'danger');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showPopup('Type DELETE to confirm account removal.', 'warning');
      return;
    }
    if (!deletePassword) {
      showPopup('Enter your password to confirm deletion.', 'warning');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    setDeleting(true);
    try {
      const response = await fetch(snmovApiUrl('gdpr/delete/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Deletion failed');
      }

      localStorage.removeItem('authToken');
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      showPopup(err instanceof Error ? err.message : 'Failed to delete account', 'danger');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeletePassword('');
      setDeleteConfirmText('');
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mt-4" style={{ maxWidth: '720px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="subtext-btn mb-0 font-quicksand">Privacy &amp; Data</h1>
        <BackButton to="/immersivecomics/my-studio/" />
      </div>

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={() => setShowMessage(false)}
      />

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4 font-quicksand">
          <h2 className="h5">Download your data</h2>
          <p className="text-muted">
            Request a copy of the personal information we hold about your account, including stories,
            episode comments, orders, and support history (GDPR Right of Access / CCPA Right to Know).
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Preparing export…' : 'Download my data'}
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm border-danger">
        <div className="card-body p-4 font-quicksand">
          <h2 className="h5 text-danger">Delete your account</h2>
          <p className="text-muted">
            Permanently delete your account, creative content, and episode comments. Order records may be retained in
            anonymized form for tax and legal compliance, but will no longer be linked to you.
          </p>
          <p className="small text-muted mb-3">
            This action cannot be undone. See our{' '}
            <Link to="/privacy/">Privacy Policy</Link> for details.
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete my account
            </button>
          ) : (
            <div className="border rounded p-3 bg-light">
              <p className="small fw-semibold mb-2">
                Type <strong>DELETE</strong> and enter your password to confirm.
              </p>
              <div className="mb-3">
                <label htmlFor="delete-confirm" className="form-label small">
                  Confirmation
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  className="form-control"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoComplete="off"
                  placeholder="DELETE"
                />
              </div>
              <div className="mb-3">
                <PasswordField
                  id="delete-password"
                  name="deletePassword"
                  label="Password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Confirm deletion'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteConfirmText('');
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-muted small mt-4 text-center">
        Questions? <a href="mailto:Justvybz@justvybz.com">Justvybz@justvybz.com</a>
      </p>
    </div>
  );
};

export default PrivacySettings;
