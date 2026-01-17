import { Button } from './ui/button';

export function HeroSection() {
  return (
    <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(https://images.unsplash.com/photo-1606761568499-6d2451b23c66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50cyUyMGNsYXNzcm9vbSUyMGxlY3R1cmV8ZW58MXx8fHwxNzY3NzExNDAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral)` }}
      />
      <div className="absolute inset-0 bg-black/60" />
      
      <div className="relative z-10 text-center px-6 max-w-4xl">
        <h1 className="text-5xl md:text-6xl lg:text-7xl text-white mb-6">
          Attendance Made Simple
        </h1>
        <p className="text-xl text-white/90 mb-8">
          Reliable attendance tracking for educational institutions
        </p>
        <Button 
          size="lg" 
          className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-all px-8 py-6 text-lg"
          onClick={() => {
            (window as any).navigateTo('services');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Get started
        </Button>
      </div>
    </section>
  );
}