import { useState, useRef, useEffect } from 'react';
import { FlashSale, apiService } from '../services/api';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: FlashSale | null;
}

type PurchaseStep = 'email' | 'otp' | 'success' | 'error';

interface PurchaseState {
  step: PurchaseStep;
  email: string;
  otp: string;
  loading: boolean;
  error: string | null;
  success: boolean;
  purchaseData: any;
}

export default function PurchaseModal({ isOpen, onClose, sale }: PurchaseModalProps) {
  const [state, setState] = useState<PurchaseState>({
    step: 'email',
    email: '',
    otp: '',
    loading: false,
    error: null,
    success: false,
    purchaseData: null
  });

  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setState({
        step: 'email',
        email: '',
        otp: '',
        loading: false,
        error: null,
        success: false,
        purchaseData: null
      });
    }
  }, [isOpen]);

  // Focus email input when modal opens
  useEffect(() => {
    if (isOpen && state.step === 'email') {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen, state.step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || !state.email.trim()) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiService.requestPurchase({
        email: state.email.trim(),
        productId: sale.productId._id
      });

      if (response.data.success) {
        setState(prev => ({ 
          ...prev, 
          step: 'otp', 
          loading: false,
          error: null
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: response.data.message || 'Failed to send OTP' 
        }));
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.message || 'Network error. Please try again.' 
      }));
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || !state.email || !state.otp.trim() || state.otp.length !== 6) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiService.verifyPurchase({
        email: state.email,
        productId: sale.productId._id,
        otp: state.otp.trim()
      });

      if (response.data.success) {
        setState(prev => ({ 
          ...prev, 
          step: 'success', 
          loading: false,
          success: true,
          purchaseData: response.data.purchase,
          error: null
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: response.data.message || 'Invalid OTP' 
        }));
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.message || 'Verification failed. Please try again.' 
      }));
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOtp = state.otp.split('');
    newOtp[index] = value;
    const updatedOtp = newOtp.join('');
    
    setState(prev => ({ ...prev, otp: updatedOtp }));

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !state.otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleClose = () => {
    setState({
      step: 'email',
      email: '',
      otp: '',
      loading: false,
      error: null,
      success: false,
      purchaseData: null
    });
    onClose();
  };

  const handleBackToEmail = () => {
    setState(prev => ({ 
      ...prev, 
      step: 'email', 
      otp: '', 
      error: null 
    }));
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Purchase {sale.productId.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Summary */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            {sale.productId.imageUrl && (
              <img 
                src={sale.productId.imageUrl} 
                alt={sale.productId.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{sale.productId.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {sale.productId.salePrice ? (
                  <>
                    <span className="text-lg font-bold text-red-600">
                      ${sale.productId.salePrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      ${sale.productId.price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-gray-900">
                    ${sale.productId.price.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {sale.stock} left in stock
              </p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Email Step */}
          {state.step === 'email' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Enter your email to continue
              </h3>
              <form onSubmit={handleEmailSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    id="email"
                    value={state.email}
                    onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                {state.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{state.error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={state.loading || !state.email.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {state.loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>
            </div>
          )}

          {/* OTP Step */}
          {state.step === 'otp' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Enter verification code
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                We've sent a 6-digit code to {state.email}
              </p>
              <form onSubmit={handleOtpSubmit}>
                <div className="mb-6">
                  <div className="flex justify-center space-x-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => otpInputRefs.current[index] = el}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={state.otp[index] || ''}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ))}
                  </div>
                </div>
                {state.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{state.error}</p>
                  </div>
                )}
                <div className="flex flex-col space-y-3">
                  <button
                    type="submit"
                    disabled={state.loading || state.otp.length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    {state.loading ? 'Verifying...' : 'Complete Purchase'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Back to Email
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Success Step */}
          {state.step === 'success' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Purchase Successful!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Your order has been confirmed. You'll receive an email confirmation shortly.
              </p>
              {state.purchaseData && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Order ID: {state.purchaseData._id}</p>
                    <p>Email: {state.email}</p>
                    <p>Status: {state.purchaseData.status}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
