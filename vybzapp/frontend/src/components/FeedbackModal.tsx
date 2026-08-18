import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import MessagePopup from './MessagePopup';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface FeedbackModalProps {
  show: boolean;
  onClose: () => void;
  context?: {
    storyId?: number;
    storyTitle?: string;
    step?: string;
    page?: string;
    url?: string;
  };
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ show, onClose, context }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    subject: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof formData>>({});
  const [formStartTime] = useState<number>(Date.now());
  const [honeypot, setHoneypot] = useState<string>('');

  useEffect(() => {
    if (show && context) {
      let contextSubject = '';
      let contextContent = '';

      if (context.storyTitle) {
        contextSubject = `Question about: ${context.storyTitle}`;
        contextContent = `I'm working on the story "${context.storyTitle}"`;
      } else if (context.page) {
        contextSubject = `Question about: ${context.page}`;
        contextContent = `I'm on the ${context.page} page`;
      }

      if (context.step) {
        contextContent += ` (${context.step} step)`;
      }

      if (context.url) {
        contextContent += `\n\nPage URL: ${context.url}`;
      }

      if (context.storyId) {
        contextContent += `\n\nStory ID: ${context.storyId}`;
      }

      setFormData(prev => ({
        ...prev,
        subject: contextSubject || prev.subject,
        content: contextContent || prev.content
      }));
    } else if (show && !context) {
      setFormData({
        full_name: '',
        email: '',
        subject: '',
        content: ''
      });
    }
  }, [show, context]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof typeof formData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<typeof formData> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Message is required';
    } else if (formData.content.trim().length < 10) {
      newErrors.content = 'Message must be at least 10 characters (required for support tickets)';
    } else if (formData.content.length > 250) {
      newErrors.content = 'Message must be 250 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) {
      console.warn('Spam detected: honeypot field filled');
      setMessage('Thank you for your submission.');
      setMessageType('success');
      setShowMessage(true);
      setTimeout(() => {
        onClose();
        setShowMessage(false);
      }, 2000);
      return;
    }

    const formFillTime = (Date.now() - formStartTime) / 1000;
    if (formFillTime < 3) {
      console.warn('Spam detected: form submitted too quickly');
      setMessage('Please take your time filling out the form.');
      setMessageType('warning');
      setShowMessage(true);
      return;
    }

    if (!validateForm()) {
      setMessage('Please correct the errors in the form');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    setIsSubmitting(true);
    setShowMessage(false);

    try {
      const submissionData: any = {
        ...formData,
        source: 'feedback_modal',
        _honeypot: honeypot,
        _form_time: formFillTime.toString()
      };
      const result = await apiService.submitContactForm(submissionData);

      if (result.success) {
        setMessage(result.message || 'Thanks for reaching out. Your message has been sent.');
        setMessageType('success');
        setShowMessage(true);

        setFormData({
          full_name: '',
          email: '',
          subject: '',
          content: ''
        });

        setTimeout(() => {
          onClose();
          setShowMessage(false);
        }, 2000);
      } else {
        if (result.errors) {
          setErrors(result.errors as Partial<typeof formData>);
          setMessage('Please correct the errors in the form');
        } else {
          setMessage('Failed to send message. Please try again.');
        }
        setMessageType('danger');
        setShowMessage(true);
      }
    } catch (error: any) {
      console.error('Feedback form error:', error);
      const errorMessage = error?.response?.data?.message ||
                          error?.response?.data?.errors ||
                          error?.message ||
                          'Failed to send message. Please try again.';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);

      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      subject: '',
      content: ''
    });
    setErrors({});
    setShowMessage(false);
    onClose();
  };

  const dialogRef = useDialogA11y(show, handleClose);

  if (!show) return null;

  return (
    <>
      <div
        className="modal-backdrop show"
        onClick={handleClose}
        style={{ zIndex: 1040 }}
      ></div>

      <div
        className="modal show d-block"
        tabIndex={-1}
        style={{ zIndex: 1050 }}
        role="presentation"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div
            className="modal-content"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
            tabIndex={-1}
          >
            <div className="modal-header border-bottom d-flex justify-content-between align-items-center px-3 py-2">
              <h5 id="feedback-modal-title" className="modal-title subtext-btn mb-0">
                Need Help or Have Feedback?
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-light border"
                onClick={handleClose}
                aria-label="Close"
                style={{ minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="fas fa-times" aria-hidden="true" style={{ fontSize: '1rem' }}></i>
              </button>
            </div>

            <div className="modal-body p-3 p-md-4">
              <MessagePopup
                message={message}
                type={messageType}
                show={showMessage}
                onClose={() => setShowMessage(false)}
                duration={5000}
              />

              <p className="subtext-btn-sm text-muted mb-3">
                Here to help! Send us your questions or feedback and we'll get back to you as soon as possible.
              </p>

              <form onSubmit={handleSubmit} className="needs-validation subtext-btn-sm" noValidate>
                <div className="row">
                  <div className="col-12 col-md-6 mb-3">
                    <label htmlFor="feedback_full_name" className="form-label subtext-btn-sm">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control subtext-btn-sm ${errors.full_name ? 'is-invalid' : ''}`}
                      id="feedback_full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      maxLength={30}
                    />
                    {errors.full_name && (
                      <div className="invalid-feedback subtext-btn-sm">{errors.full_name}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-6 mb-3">
                    <label htmlFor="feedback_email" className="form-label subtext-btn-sm">
                      Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control subtext-btn-sm ${errors.email ? 'is-invalid' : ''}`}
                      id="feedback_email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      maxLength={40}
                      autoComplete="email"
                    />
                    {errors.email && (
                      <div className="invalid-feedback subtext-btn-sm">{errors.email}</div>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="feedback_subject" className="form-label subtext-btn-sm">
                    Subject <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control subtext-btn-sm ${errors.subject ? 'is-invalid' : ''}`}
                    id="feedback_subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    maxLength={50}
                  />
                  {errors.subject && (
                    <div className="invalid-feedback subtext-btn-sm">{errors.subject}</div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="feedback_content" className="form-label subtext-btn-sm">
                    Message <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className={`form-control subtext-btn-sm ${errors.content ? 'is-invalid' : ''}`}
                    id="feedback_content"
                    name="content"
                    rows={4}
                    value={formData.content}
                    onChange={handleInputChange}
                    required
                    maxLength={250}
                  />
                  <div className="form-text subtext-btn-sm">
                    {formData.content.length}/250 characters
                  </div>
                  {errors.content && (
                    <div className="invalid-feedback subtext-btn-sm">{errors.content}</div>
                  )}
                </div>

                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <label htmlFor="website_url" style={{ display: 'none' }}>Website URL</label>
                  <input
                    type="text"
                    id="website_url"
                    name="website_url"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary subtext-btn-sm"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning subtext-btn-sm shadow"
                    disabled={isSubmitting}
                    style={{ backgroundColor: '#FFBC00', borderColor: '#FFBC00' }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Send
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedbackModal;
