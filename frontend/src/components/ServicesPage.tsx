import { Header } from './Header';

import { Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Footer } from './Footer';

export function ServicesPage() {
  const comparisonFeatures = [
    { name: 'Full System Access', subscription: true, licensing: true },
    { name: 'Update & Maintenance', subscription: true, licensing: 'Optional' },
    { name: 'API Access', subscription: true, licensing: true },
    { name: 'Multi-Campus Support', subscription: true, licensing: true },
    { name: 'One-time cost', subscription: false, licensing: true },
    { name: 'Recurring Fee', subscription: true, licensing: 'Optional' }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-5xl md:text-6xl text-white text-center mb-8">
              Our Services
            </h1>
            
            <h2 className="text-2xl md:text-3xl text-white text-center mb-16">
              Choose the Right Plan for Your Institution
            </h2>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
              {/* Subscription Fees */}
              <div className="border border-white p-8 rounded-lg">
                <h3 className="text-white text-center mb-6 underline">
                  SUBSCRIPTION FEES
                </h3>
                <div className="text-center mb-8">
                  <p className="text-white text-4xl md:text-5xl font-bold mb-2">
                    $10k–$20k
                  </p>
                  <p className="text-white text-lg">Yearly</p>
                </div>
                <ul className="space-y-3 text-white">
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Annual or per semester billing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Full system access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Updates + maintenance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Support included</span>
                  </li>
                </ul>
              </div>

              {/* Licensing Fees */}
              <div className="border border-white p-8 rounded-lg">
                <h3 className="text-white text-center mb-6 underline">
                  LICENSING FEES
                </h3>
                <div className="text-center mb-8">
                  <p className="text-white text-4xl md:text-5xl font-bold mb-2">
                    $50k–$60k
                  </p>
                  <p className="text-white text-lg">One-time Fee</p>
                </div>
                <ul className="space-y-3 text-white">
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>One-time license fee</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Full system access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Updates + maintenance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Full usage rights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>Priority tech support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-1">•</span>
                    <span>API integration access</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan Comparison Table */}
            <div className="border border-white max-w-3xl mx-auto mb-16">
              <h3 className="text-white text-2xl text-center py-6 border-b border-white underline">
                Plan Comparison
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white">
                      <th className="text-white text-left p-6 font-bold">Features</th>
                      <th className="text-white text-center p-6 font-bold underline">Subscription</th>
                      <th className="text-white text-center p-6 font-bold underline">Licensing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, index) => (
                      <tr key={index} className="border-b border-white last:border-0">
                        <td className="text-white p-6 font-bold underline">{feature.name}</td>
                        <td className="text-center p-6">
                          {typeof feature.subscription === 'boolean' ? (
                            feature.subscription ? (
                              <Check className="w-6 h-6 text-red-500 mx-auto" strokeWidth={3} />
                            ) : (
                              <X className="w-6 h-6 text-red-500 mx-auto" strokeWidth={3} />
                            )
                          ) : (
                            <span className="text-white">{feature.subscription}</span>
                          )}
                        </td>
                        <td className="text-center p-6">
                          {typeof feature.licensing === 'boolean' ? (
                            feature.licensing ? (
                              <Check className="w-6 h-6 text-red-500 mx-auto" strokeWidth={3} />
                            ) : (
                              <X className="w-6 h-6 text-red-500 mx-auto" strokeWidth={3} />
                            )
                          ) : (
                            <span className="text-white">{feature.licensing}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA Section */}
            <div className="border border-white max-w-3xl mx-auto p-12 text-center">
              <h3 className="text-white text-2xl md:text-3xl mb-6">
                Ready to Implement Attendify at Your Institution?
              </h3>
              <Button 
                variant="link"
                className="text-blue-500 hover:text-blue-400 underline text-lg"
              >
                Contact us for Demo
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}