import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [userType, setUserType] = useState('Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(userType);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo">
          <h1>Attendify</h1>
          <p>University of Wollongong</p>
          <p>Attendance Management System</p>
        </div>
        
        <div className="user-type">
          <div 
            className={userType === 'Student' ? 'active' : ''}
            onClick={() => setUserType('Student')}
          >
            Student
          </div>
          <div 
            className={userType === 'Lecturer' ? 'active' : ''}
            onClick={() => setUserType('Lecturer')}
          >
            Lecturer
          </div>
          <div 
            className={userType === 'Admin' ? 'active' : ''}
            onClick={() => setUserType('Admin')}
          >
            Admin
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="your.email@uow.edu.au"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="login-btn">Login</button>
          
          <div className="forgot-password">
            <a href="#forgot">Forgot password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;