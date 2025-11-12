import React, { useState } from 'react';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState('');

  const handleLogin = (type) => {
    setIsLoggedIn(true);
    setUserType(type);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType('');
  };

  const renderDashboard = () => {
    switch (userType) {
      case 'Student':
        return <StudentDashboard onLogout={handleLogout} />;
      case 'Lecturer':
        return <LecturerDashboard onLogout={handleLogout} />;
      case 'Admin':
        return <AdminDashboard onLogout={handleLogout} />;
      default:
        return <StudentDashboard onLogout={handleLogout} />;
    }
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        renderDashboard()
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;