import { useState } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { FeaturesSection } from './components/FeaturesSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { Footer } from './components/Footer';
import { AboutPage } from './components/AboutPage';
import { FeaturesPage } from './components/FeaturesPage';
import { ServicesPage } from './components/ServicesPage';
import { RegistrationPage } from './components/RegistrationPage';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'features' | 'services' | 'registration' | 'login'>('home');

  // Make setCurrentPage available globally for navigation
  (window as any).navigateTo = setCurrentPage;

  if (currentPage === 'about') {
    return <AboutPage />;
  }

  if (currentPage === 'features') {
    return <FeaturesPage />;
  }

  if (currentPage === 'services') {
    return <ServicesPage />;
  }

  if (currentPage === 'registration') {
    return <RegistrationPage />;
  }

  if (currentPage === 'login') {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}