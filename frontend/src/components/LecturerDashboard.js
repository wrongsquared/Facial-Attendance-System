import React, { useState } from 'react';
import './Dashboard.css';
import LogoutDialog from './LogoutDialog';

function LecturerDashboard({ onLogout }) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false);
    onLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutDialog(false);
  };

  return (
    <div className="dashboard container">
      <div className="header">
        <div>
          <h1>Attendify</h1>
          <h2>Lecturer Portal</h2>
        </div>
        <div className="user-info">
          <div className="user-details">
            <p>Dr. Smith</p>
            <p>Lecturer ID: L12345</p>
          </div>
          <button className="logout-btn" onClick={handleLogoutClick}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="main-content">
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-number">3</div>
              <div className="stat-label">Total Courses</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">93</div>
              <div className="stat-label">Total Students</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">92.5%</div>
              <div className="stat-label">Average Attendance</div>
            </div>
          </div>
          
          <div className="attendance-card">
            <h3 className="section-title">Today's Classes</h3>
            <p>Classes scheduled for today</p>
            
            <div className="upcoming-classes">
              <div className="class-item recorded">
                <h4>CSCI334 - Database Systems</h4>
                <div className="class-details">
                  <span>9:00 AM - 11:00 AM</span>
                  <span>Building 3, Room 205</span>
                </div>
                <div className="attendance-recorded">
                  <span className="status-badge">Attendance recorded</span>
                  <span className="attendance-stats">42/45 students (93%)</span>
                </div>
              </div>
              
              <div className="class-item">
                <h4>CSCI203 - Algorithms</h4>
                <div className="class-details">
                  <span>2:00 PM - 4:00 PM</span>
                  <span>Building 3, Room 210</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="attendance-card">
            <h3 className="section-title">My Courses</h3>
            <p>Overview of your courses</p>
            
            <div className="course-list">
              <div className="course-item">
                <h4>CSCI334 - Database Systems</h4>
                <div className="course-stats">
                  <span>45 students enrolled</span>
                  <span className="attendance-rate">91% Attendance</span>
                </div>
              </div>
              
              <div className="course-item">
                <h4>CSCI203 - Algorithms</h4>
                <div className="course-stats">
                  <span>38 students enrolled</span>
                  <span className="attendance-rate">94% Attendance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="sidebar">
          <div className="attendance-card">
            <h3 className="section-title">Recent Sessions</h3>
            <p>Attendance records from recent classes</p>
            
            <div className="session-table">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Date</th>
                    <th>Attended</th>
                    <th>Total</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>CSCI334 - Database Systems</td>
                    <td>26 Oct 2023</td>
                    <td>42</td>
                    <td>45</td>
                    <td>93%</td>
                  </tr>
                  <tr>
                    <td>CSCI203 - Algorithms</td>
                    <td>25 Oct 2023</td>
                    <td>36</td>
                    <td>38</td>
                    <td>95%</td>
                  </tr>
                  <tr>
                    <td>CSCI334 - Database Systems</td>
                    <td>24 Oct 2023</td>
                    <td>40</td>
                    <td>45</td>
                    <td>89%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <div className="footer">
        <p>© 2023 University of Wollongong</p>
      </div>

      {/* Logout Dialog */}
      <LogoutDialog
        isOpen={showLogoutDialog}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
}

export default LecturerDashboard;