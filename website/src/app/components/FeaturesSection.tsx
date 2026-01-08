import { Button } from './ui/button';

export function FeaturesSection() {
  const features = [
    {
      title: 'AI Facial Recognition:',
      description: 'Automates attendance using real-time face detection and matching.'
    },
    {
      title: 'Liveness Detection:',
      description: 'Ensures only real students are marked present with anti-spoofing technology.'
    },
    {
      title: 'Virtual Tripwire:',
      description: 'Triggers attendance logging when students cross the entrance.'
    },
    {
      title: 'Multi-Face Detection:',
      description: 'Efficiently verify multiple students entering at once, ideal for large lecture halls, with quick processing.'
    }
  ];

  return (
    <section id="features" className="bg-black py-20 px-6">
      <div className="container mx-auto">
        <h2 className="text-4xl md:text-5xl text-white text-center mb-16">
          Key Features
        </h2>
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 bg-white rounded-full mt-2" />
                <div>
                  <h3 className="text-white text-lg mb-2">
                    <span className="font-semibold">{feature.title}</span> {feature.description}
                  </h3>
                </div>
              </div>
            ))}
            
            <div className="pt-4">
              <Button 
                className="bg-blue-500 text-white hover:bg-blue-600 px-8 py-6"
                onClick={() => {
                  (window as any).navigateTo('features');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Learn More
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <img 
              src="https://images.unsplash.com/photo-1639478411016-726027171e28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYWNpYWwlMjByZWNvZ25pdGlvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzY3NzAwNDQxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
              alt="Attendance devices" 
              className="w-full max-w-md object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}