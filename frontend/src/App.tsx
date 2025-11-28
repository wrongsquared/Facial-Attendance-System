import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';

type UserType = 'student' | 'lecturer' | 'admin' | null;

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType>(null);

  const handleLogin = (userType: UserType) => {
    setCurrentUser(userType);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Show login page if no user is logged in
  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen">
        <LoginPage onLogin={handleLogin} />
        <Footer />
      </div>
    );
  }

  // Show appropriate dashboard based on user type
  return (
    <div className="flex flex-col min-h-screen">
      {currentUser === 'student' && <StudentDashboard onLogout={handleLogout} />}
      {currentUser === 'lecturer' && <LecturerDashboard onLogout={handleLogout} />}
      {currentUser === 'admin' && <AdminDashboard onLogout={handleLogout} />}
      <Footer />
    </div>
  );
}
