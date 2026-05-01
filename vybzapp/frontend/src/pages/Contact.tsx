import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import MessagePopup from '../components/MessagePopup';
import BackButton from '../components/BackButton';

interface ContactFormData {
  full_name: string;
  email: string;
  subject: string;
  content: string;
}

const Contact: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactFormData>({
    full_name: '',
    email: '',
    subject: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'danger' | 'warning' | 'info'>('success');
  const [showMessage, setShowMessage] = useState(false);
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof ContactFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactFormData> = {};

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
    } else if (formData.content.length > 250) {
      newErrors.content = 'Message must be 250 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage('Please correct the errors in the form');
      setMessageType('danger');
      setShowMessage(true);
      return;
    }

    setIsSubmitting(true);
    setShowMessage(false);

    try {
      const result = await apiService.submitContactForm({
        ...formData,
        source: 'contact_form',
      });
      
      if (result.success) {
        setMessage(result.message || 'Thanks for reaching out. Your message has been sent.');
        setMessageType('success');
        setShowMessage(true);
        
        // Reset form
        setFormData({
          full_name: '',
          email: '',
          subject: '',
          content: ''
        });
        
        // Optionally redirect after a delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Handle validation errors from server
        if (result.errors) {
          setErrors(result.errors as Partial<ContactFormData>);
          setMessage('Please correct the errors in the form');
        } else {
          setMessage('Failed to send message. Please try again.');
        }
        setMessageType('danger');
        setShowMessage(true);
      }
    } catch (error: any) {
      console.error('Contact form error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.errors || 
                          error?.message || 
                          'Failed to send message. Please try again.';
      setMessage(errorMessage);
      setMessageType('danger');
      setShowMessage(true);
      
      // Set field errors if provided by server
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseMessage = () => {
    setShowMessage(false);
  };

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="subtext-btn mb-0">Feedback & Enquiry</h1>
        <BackButton to="/" />
      </div>
      

      <MessagePopup
        message={message}
        type={messageType}
        show={showMessage}
        onClose={handleCloseMessage}
        duration={5000}
      />

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit} className="needs-validation" noValidate>
            <div className="row">
              <div className="col-12 col-md-6 mb-3">
                <label htmlFor="full_name" className="form-label subtext-btn-sm">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className={`form-control subtext-btn-sm ${errors.full_name ? 'is-invalid' : ''}`}
                  id="full_name"
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
                <label htmlFor="email" className="form-label subtext-btn-sm">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className={`form-control subtext-btn-sm ${errors.email ? 'is-invalid' : ''}`}
                  id="email"
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
              <label htmlFor="subject" className="form-label subtext-btn-sm">
                Subject <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control subtext-btn-sm ${errors.subject ? 'is-invalid' : ''}`}
                id="subject"
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
              <label htmlFor="content" className="form-label subtext-btn-sm">
                Message <span className="text-danger">*</span>
              </label>
              <textarea
                className={`form-control subtext-btn-sm ${errors.content ? 'is-invalid' : ''}`}
                id="content"
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

            <div className="text-center">
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
                  'Send'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;

