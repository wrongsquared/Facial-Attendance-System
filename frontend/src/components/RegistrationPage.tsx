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
    fullName: '',
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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle registration logic here
    console.log('Registration data:', formData);
    alert('Account created successfully!');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />

      <main className="flex-1 pt-20 px-6 py-12">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl md:text-5xl text-white text-center mb-12">
            Registration
          </h1>

          <form onSubmit={handleRegister}
            className="flex flex-col "
            style={{
              backgroundColor: 'black',
              border: '2px solid white',
              color: 'white', /* Changes text to white */
              padding: '40px',
              borderRadius: '8px'
            }}
          >
            {/* Institution and Administrator Details */}
            <div className="grid md:grid-cols-2 gap-12 mb-12">
              {/* Institution Details */}
              {/* <div>
                <h2 className="text-2xl text-white mb-6 font-semibold border-b border-gray-700 pb-2 w-fit">
                  Institution Details
                </h2>
                <div className="flex flex-col gap-6">
                  <div>
                    <Label htmlFor="institutionType" className="text-white mb-2 block">
                      Institution Type
                    </Label>
                    <select
                      id="institutionType"
                      name="institutionType"
                      value={formData.institutionType}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    >
                      <option value="">Select Institution Type</option>
                      <option value="university">University</option>
                      <option value="college">College</option>
                      <option value="polytechnic">Polytechnic</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="institutionName" className="text-white mb-2 block">
                      Institution Name
                    </Label>
                    <Input
                      id="institutionName"
                      name="institutionName"
                      type="text"
                      value={formData.institutionName}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-white mb-2 block">
                      Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 h-12 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white"
                      required
                    />
                  </div>
                </div>
              </div> */}

              {/* Administrator Details */}
              <div>
                <h2 className="text-2xl text-white mb-6 font-semibold border-b border-gray-700 pb-2 w-fit">
                  Administrator Details
                </h2>
                <div className="flex flex-col gap-6">
                  <div>
                    <Label htmlFor="fullName" className="text-white mb-2 block">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
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
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-white"
                        onClick={() => setShowPhoneNumber(!showPhoneNumber)}
                      >
                        {showPhoneNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
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
              <div className="grid md:grid-cols-2 gap-12">
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

            {/* Register Button */}
            <div className="mt-6 text-center">
              <Button
                type="submit"
                className="w-full bg-blue-500 text-white hover:bg-blue-600 py-8 text-xl"
              >
                Register
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}