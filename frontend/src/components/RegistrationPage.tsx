
import { Header } from './Header';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';
import { Eye, EyeOff, Lock, Calendar } from 'lucide-react';
import { Footer } from './Footer';

export function RegistrationPage() {
  const [formData, setFormData] = useState({
    institutionType: '',
    institutionName: '',
    address: '',
    universityName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  const [selectedPlan, setSelectedPlan] = useState('subscription');

  const plans = {
    subscription: {
      name: 'Subscription Plan',
      type: 'subscription',
      yearly: 15000,
      priceRange: '$10k-$20k'
    },
    licensing: {
      name: 'Licensing Plan',
      type: 'licensing',
      oneTime: 55000,
      priceRange: '$50k-$60k'
    }
  };

  const getCurrentPrice = () => {
    const plan = plans[selectedPlan as keyof typeof plans];
    if (plan?.type === 'licensing') {
      return (plan as typeof plans.licensing).oneTime;
    }
    return (plan as typeof plans.subscription).yearly;
  };
  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [cardType, setCardType] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('billing.')) {
      const field = name.split('.')[1];
      setPaymentData({
        ...paymentData,
        billingAddress: {
          ...paymentData.billingAddress,
          [field]: value
        }
      });
    } else {
      setPaymentData({
        ...paymentData,
        [name]: value
      });
    }

    // Detect card type
    if (name === 'cardNumber') {
      const cardNumber = value.replace(/\s/g, '');
      if (cardNumber.startsWith('4')) {
        setCardType('visa');
      } else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) {
        setCardType('mastercard');
      } else if (cardNumber.startsWith('3')) {
        setCardType('amex');
      } else {
        setCardType('');
      }
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validatePayment = () => {
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length < 13) {
      alert('Please enter a valid card number');
      return false;
    }
    if (!paymentData.expiryDate || paymentData.expiryDate.length !== 4) {
      alert('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (!paymentData.cvv || paymentData.cvv.length < 3) {
      alert('Please enter a valid CVV');
      return false;
    }
    if (!paymentData.cardholderName.trim()) {
      alert('Please enter the cardholder name');
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // Validate payment information
    if (!validatePayment()) {
      return;
    }

    try {
      // Process payment first (simulate)
      const paymentResponse = await processPayment();

      if (!paymentResponse.success) {
        alert(`Payment failed: ${paymentResponse.error}`);
        return;
      }

      const response = await fetch(`${API_URL}/register-institution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          universityName: formData.universityName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          paymentId: paymentResponse.paymentId
        }),
      });

      if (response.ok) {
        alert('Account created successfully! Payment processed.');
        // Navigate to login page here
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred');
    }
  };

  const processPayment = async () => {
    // Simulate payment processing
    return new Promise<{ success: boolean, paymentId?: string, error?: string }>((resolve) => {
      setTimeout(() => {
        // Simulate payment success (you would integrate with real payment processor)
        const success = Math.random() > 0.1; // 90% success rate for demo
        if (success) {
          resolve({
            success: true,
            paymentId: 'pay_' + Math.random().toString(36).substr(2, 9)
          });
        } else {
          resolve({
            success: false,
            error: 'Card declined'
          });
        }
      }, 2000);
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />

      <main className="flex-1 pt-20 px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl md:text-5xl text-white text-center mb-12">
            Registration
          </h1>

          <form
            onSubmit={handleRegister}
            className="flex flex-col gap-12"
            autoComplete="on"
            style={{
              backgroundColor: 'black',
              border: '2px solid white',
              color: 'white',
              padding: '40px',
              borderRadius: '8px'
            }}
          >
            <div className="grid grid-cols-1 gap-12">

              {/* Administrator Details */}
              <div>
                <h2 className="text-2xl text-white mb-6 font-semibold border-b border-gray-700 pb-2 w-fit">
                  Administrator Details
                </h2>
                <div className="flex flex-col gap-6">
                  <div>
                    <Label htmlFor="universityName" className="text-white mb-2 block">
                      University Name
                    </Label>
                    <Input
                      id="universityName"
                      name="universityName"
                      type="text"
                      value={formData.universityName}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-white mb-2 block">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber" className="text-white mb-2 block">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        type={showPhoneNumber ? "text" : "tel"}
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                        required
                      />
                      {/* Optional: You might want an eye icon here too since you have a toggle state for it */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div>
              <h2 className="text-2xl text-white mb-6 font-semibold border-b border-gray-700 pb-2 w-fit">
                Account Security
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-white mb-2 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <Label htmlFor="confirmPassword" className="text-white mb-2 block">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-white"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Subscription Plan */}
            <div>
              <h2 className="text-2xl text-white mb-6 font-semibold border-b border-gray-700 pb-2 w-fit">
                Choose Your Plan
              </h2>
              
              {/* Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {Object.entries(plans).map(([planKey, plan]) => (
                  <div
                    key={planKey}
                    onClick={() => setSelectedPlan(planKey)}
                    className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPlan === planKey
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    } ${
                      planKey === 'subscription' ? 'ring-2 ring-blue-400 transform scale-105' : ''
                    }`}
                  >

                    
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold text-white mb-1">
                        {plan.type === 'licensing' 
                          ? (plan as typeof plans.licensing).priceRange 
                          : `$${(plan as typeof plans.subscription).yearly.toLocaleString()}`
                        }
                      </div>
                      <div className="text-gray-400 text-sm">
                        {plan.type === 'licensing' 
                          ? 'One-time Fee' 
                          : 'per year'
                        }
                      </div>
                    </div>

                    {selectedPlan === planKey && (
                      <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Information */}
            <div>
              <h2 className="text-2xl text-white mb-6 font-semibold border-b border-gray-700 pb-2 w-fit flex items-center gap-2">
                Payment Information
              </h2>

              {/* Security Notice */}

              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <Lock size={16} />
                <span className="font-medium">Secure Payment</span>
              </div>
              <p className="text-blue-200 text-sm">
                Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Card Details */}
                <div className="space-y-6">
                  <h3 className="text-xl text-white mb-4 font-medium">
                    <br />Card Details</h3>

                  <div>
                    <Label htmlFor="cardNumber" className="text-white mb-2 block">
                      Card Number
                    </Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        name="cardNumber"
                        type="text"
                        autoComplete="cc-number"
                        value={formatCardNumber(paymentData.cardNumber)}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\s/g, '');
                          setPaymentData({
                            ...paymentData,
                            cardNumber: rawValue
                          });
                          
                          // Detect card type
                          if (rawValue.startsWith('4')) {
                            setCardType('visa');
                          } else if (rawValue.startsWith('5') || rawValue.startsWith('2')) {
                            setCardType('mastercard');
                          } else if (rawValue.startsWith('3')) {
                            setCardType('amex');
                          } else {
                            setCardType('');
                          }
                        }}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white pl-12"
                        required
                      />

                      {cardType && (
                        <div className="absolute right-3 top-3 text-white text-sm">
                          {cardType.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate" className="text-white mb-2 block">
                        Expiry Date
                      </Label>
                      <div className="relative">
                        <Input
                          id="expiryDate"
                          name="expiryDate"
                          type="text"
                          autoComplete="cc-exp"
                          value={formatExpiryDate(paymentData.expiryDate)}
                          onChange={(e) => {
                            const rawValue = e.target.value.replace(/[^0-9]/g, '');
                            setPaymentData({
                              ...paymentData,
                              expiryDate: rawValue
                            });
                          }}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white pl-10"
                          required
                        />
                        <div className="absolute left-3 top-3 text-white">
                          <Calendar size={16} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cvv" className="text-white mb-2 block">
                        CVV
                      </Label>
                      <div className="relative">
                        <Input
                          id="cvv"
                          name="cvv"
                          type={showCvv ? "text" : "password"}
                          autoComplete="cc-csc"
                          value={paymentData.cvv}
                          onChange={handlePaymentChange}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white pl-10"
                          required
                        />
                        <div className="absolute left-3 top-3 text-white">
                          <Lock size={16} />
                        </div>
                        <button
                          type="button"
                          className="absolute right-3 top-3 text-white"
                          onClick={() => setShowCvv(!showCvv)}
                        >
                          {showCvv ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cardholderName" className="text-white mb-2 block">
                      Cardholder Name
                    </Label>
                    <Input
                      id="cardholderName"
                      name="cardholderName"
                      type="text"
                      autoComplete="cc-name"
                      value={paymentData.cardholderName}
                      onChange={handlePaymentChange}
                      placeholder="John Doe"
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>
                </div>

                {/* Billing Address */}
                <div className="space-y-6">
                  <h3 className="text-xl text-white mb-4 font-medium">
                    <br />Billing Address</h3>

                  <div>
                    <Label htmlFor="billing.street" className="text-white mb-2 block">
                      Street Address
                    </Label>
                    <Input
                      id="billing.street"
                      name="billing.street"
                      type="text"
                      value={paymentData.billingAddress.street}
                      onChange={handlePaymentChange}
                      placeholder="123 Main Street"
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billing.city" className="text-white mb-2 block">
                        City
                      </Label>
                      <Input
                        id="billing.city"
                        name="billing.city"
                        type="text"
                        value={paymentData.billingAddress.city}
                        onChange={handlePaymentChange}
                        placeholder="New York"
                        className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="billing.state" className="text-white mb-2 block">
                        State/Province
                      </Label>
                      <Input
                        id="billing.state"
                        name="billing.state"
                        type="text"
                        value={paymentData.billingAddress.state}
                        onChange={handlePaymentChange}
                        placeholder="NY"
                        className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billing.zipCode" className="text-white mb-2 block">
                        ZIP/Postal Code
                      </Label>
                      <Input
                        id="billing.zipCode"
                        name="billing.zipCode"
                        type="text"
                        value={paymentData.billingAddress.zipCode}
                        onChange={handlePaymentChange}
                        placeholder="10001"
                        className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="billing.country" className="text-white mb-2 block">
                        Country
                      </Label>
                      <Input
                        id="billing.country"
                        name="billing.country"
                        type="text"
                        value={paymentData.billingAddress.country}
                        onChange={handlePaymentChange}
                        placeholder="United States"
                        className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mt-8 p-6 border border-gray-600 rounded-lg bg-gray-900">
                <h4 className="text-lg text-white mb-4 font-medium">Payment Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-white">
                    <span>
                      {plans[selectedPlan as keyof typeof plans].name}
                      {plans[selectedPlan as keyof typeof plans].type === 'licensing' 
                        ? ' (One-time)'
                        : ' (Annual)'
                      }
                    </span>
                    <span>${getCurrentPrice().toLocaleString()}</span>
                  </div>


                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between text-white font-bold text-lg">
                      <span>Total</span>
                      <span>${(getCurrentPrice()).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Register Button */}
            <div className="mt-6 text-center">
              <Button
                type="submit"
                className="w-full bg-blue-500 text-white hover:bg-blue-600 py-6 text-xl flex items-center justify-center gap-2"
              >
                Complete Registration & Payment
              </Button>
              <p className="text-gray-400 text-sm mt-2">
                By clicking this button, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}