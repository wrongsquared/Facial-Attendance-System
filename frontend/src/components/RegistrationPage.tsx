import { Header } from './Header';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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

  const [showPhoneNumber, setShowPhoneNumber] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/register-institution', { // Update URL to match backend
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          universityName: formData.universityName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password
        }),
      });

      if (response.ok) {
        alert('Account created successfully!');
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
            className="flex flex-col gap-12" // Added gap-12 to space out the major sections
            style={{
              backgroundColor: 'black',
              border: '2px solid white',
              color: 'white',
              padding: '40px',
              borderRadius: '8px'
            }}
          >
            {/* 
               Since Institution Details is commented out, I removed the 
               grid-cols-2 here so Administrator Details takes full width. 
               If you uncomment Institution Details later, add 'md:grid-cols-2' back.
            */}
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

              {/* GRID FIX: This container now holds two separate divs side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">

                {/* Column 1: Password */}
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

                {/* Column 2: Confirm Password */}
                {/* Moved OUT of the previous div so it sits in the second column */}
                <div>
                  <Label htmlFor="confirmPassword" className="text-white mb-2 block">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      // SYNTAX FIX: Changed from literal "password" to conditional type
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

            {/* Register Button */}
            <div className="mt-6 text-center">
              <Button
                type="submit"
                className="w-full bg-blue-500 text-white hover:bg-blue-600 py-6 text-xl"
              >
                Register
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}