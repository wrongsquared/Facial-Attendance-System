import { Button } from './ui/button';
import logoImage from "figma:asset/737eefd7a203d17ef41c9a4db8356bb5c6df1be7.png";

export function Header() {
  const handleNavigation = (page: 'home' | 'about' | 'features' | 'services' | 'registration' | 'login', e: React.MouseEvent) => {
    e.preventDefault();
    if ((window as any).navigateTo) {
      (window as any).navigateTo(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => handleNavigation('home', e)}>
          <img src={logoImage} alt="Attendify Logo" className="w-8 h-8" />
          <span className="text-white text-xl font-semibold">Attendify</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#home" onClick={(e) => handleNavigation('home', e)} className="text-white hover:text-gray-300 transition-colors">
            Home
          </a>
          <a href="#about" onClick={(e) => handleNavigation('about', e)} className="text-white hover:text-gray-300 transition-colors">
            About
          </a>
          <a href="#features" onClick={(e) => handleNavigation('features', e)} className="text-white hover:text-gray-300 transition-colors">
            Features
          </a>
          <a href="#services" onClick={(e) => handleNavigation('services', e)} className="text-white hover:text-gray-300 transition-colors">
            Services
          </a>
        </nav>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="bg-transparent text-white border-blue-500 hover:bg-blue-500 hover:text-white"
            onClick={(e) => handleNavigation('registration', e)}
          >
            Sign Up
          </Button>
          <Button 
            className="bg-blue-500 text-white hover:bg-blue-600"
            onClick={(e) => handleNavigation('login', e)}
          >
            Login
          </Button>
        </div>
      </div>
    </header>
  );
}