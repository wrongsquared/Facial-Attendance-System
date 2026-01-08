import { useState } from 'react';
import { Header } from './app/components/Header';
import { HeroSection } from './app/components/HeroSection';
import { AboutSection } from './app/components/AboutSection';
import { FeaturesSection } from './app/components/FeaturesSection';
import { TestimonialsSection } from './app/components/TestimonialsSection';
import { Footer } from './app/components/Footer';
import { AboutPage } from './app/components/AboutPage';
import { FeaturesPage } from './app/components/FeaturesPage';
import { ServicesPage } from './app/components/ServicesPage';
import { RegistrationPage } from './app/components/RegistrationPage';
import { LoginPage } from './app/components/LoginPage';

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