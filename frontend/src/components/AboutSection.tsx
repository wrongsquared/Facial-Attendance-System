import { Button } from './ui/button';

export function AboutSection() {
  return (
    <section id="about" className="bg-black py-20 px-6">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center">
            <img 
              src="https://images.unsplash.com/photo-1606761568499-6d2451b23c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMGNsYXNzcm9vbSUyMGxlY3R1cmV8ZW58MXx8fHwxNzY3NzExNDAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
              alt="Classroom" 
              className="w-full max-w-sm rounded-lg object-cover"
            />
          </div>
          
          <div>
            <h2 className="text-4xl md:text-5xl text-white mb-6">
              About us
            </h2>
            <p className="text-white/90 text-lg leading-relaxed mb-8">
              Attendify is an AI-powered attendance system designed to automate and streamline attendance tracking for large classrooms. Using facial recognition, biometric profiling, and real-time verification, Attendify ensures accurate attendance with ease. Our system leverages advanced features like liveness detection, virtual tripwire for entry verification, and multi-face detection to support classes with over 200 students.
            </p>
            <Button 
              className="bg-blue-500 text-white hover:bg-blue-600 px-8 py-6"
              onClick={() => {
                (window as any).navigateTo('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}