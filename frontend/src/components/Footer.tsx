import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribed:', email);
  };

  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Stay Connected Section */}
          <div>
            <h3 className="text-3xl text-white mb-6">Stay Connected</h3>
            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="flex items-start gap-2">
                <input 
                  type="checkbox" 
                  id="newsletter"
                  className="mt-1"
                />
                <label htmlFor="newsletter" className="text-white text-sm">
                  Yes, subscribe me to your newsletter.
                </label>
              </div>
              
              <Button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-6"
              >
                Subscribe
              </Button>
            </form>
          </div>

          {/* Contact Information Section */}
          <div className="flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-white">
                <p className="mb-1">123-456-7890</p>
                <p className="mb-1">info@attendify.com</p>
                <p className="mt-4">500 Terry Francois Street,</p>
                <p>6th Floor, San Francisco,</p>
                <p>CA 94158</p>
              </div>
            </div>

            <div>
              <div className="flex gap-4 mb-6">
                <a href="#" className="text-white hover:text-blue-500 transition-colors">
                  <Facebook className="w-6 h-6" />
                </a>
                <a href="#" className="text-white hover:text-blue-500 transition-colors">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-white hover:text-blue-500 transition-colors">
                  <Twitter className="w-6 h-6" />
                </a>
                <a href="#" className="text-white hover:text-blue-500 transition-colors">
                  <Linkedin className="w-6 h-6" />
                </a>
              </div>

              <div className="text-gray-400 text-sm space-y-2">
                <div className="flex flex-wrap gap-3">
                  <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                  <span>|</span>
                  <a href="#" className="hover:text-white transition-colors">Accessibility Statement</a>
                  <span>|</span>
                  <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
                  <span>|</span>
                  <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
                  <span>|</span>
                  <a href="#" className="hover:text-white transition-colors">Shipping Policy</a>
                </div>
                <p className="mt-4">© 2025 Attendify. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}