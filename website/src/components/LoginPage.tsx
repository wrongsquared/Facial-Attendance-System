import { Header } from './Header';
import { Footer } from './Footer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login data:', formData);
    alert('Login successful!');
  };

  const handleCreateAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    if ((window as any).navigateTo) {
      (window as any).navigateTo('registration');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20 px-6 py-12">
        <div className="container mx-auto max-w-lg">
          <h1 className="text-4xl md:text-5xl text-white text-center mb-12">
            Login
          </h1>

          <form onSubmit={handleLogin}>
            <div className="space-y-6 mb-12">
              <div>
                <Label htmlFor="email" className="text-white mb-2 block">
                  Email:
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-white mb-2 block">
                  Password:
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-black border border-white text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            </div>

            {/* Login Button */}
            <div className="text-center mb-4">
              <Button 
                type="submit"
                className="bg-blue-500 text-white hover:bg-blue-600 px-12 py-3 text-lg"
              >
                Login
              </Button>
            </div>

            {/* Create New Account Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleCreateAccount}
                className="text-blue-500 hover:text-blue-400 underline"
              >
                Create New Account
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}