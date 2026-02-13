import { Button } from './ui/button';
import logoImage from "../assets/Logo.png";
import { Link, useNavigate } from "react-router-dom";

export function Header() {
  const navigate = useNavigate(); 

  const handleNavigation = (path: string) => {
    navigate(`/${path}`); 
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-800">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src={logoImage} alt="Attendify Logo" className="w-8 h-8" />
          <span className="text-white text-xl font-semibold">Attendify</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to ="/" className="text-white hover:text-gray-300 transition-colors">
            Home
          </Link>
          <Link to="/about" className="text-white hover:text-gray-300 transition-colors">
            About
          </Link>
          <Link to="/features" className="text-white hover:text-gray-300 transition-colors">
            Features
          </Link>
          <Link to="/services" className="text-white hover:text-gray-300 transition-colors">
            Services
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            className="bg-transparent text-white border-blue-500 hover:bg-blue-500 hover:text-white"
            onClick={() => navigate('/registration')}
          >
            Sign Up
          </Button>
          <Button 
            className="bg-blue-500 text-white hover:bg-blue-600"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        </div>
      </div>
    </header>
  );
}