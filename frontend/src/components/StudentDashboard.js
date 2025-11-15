import React, { useState } from 'react';
import './Dashboard.css';
import LogoutDialog from './LogoutDialog';

function StudentDashboard({ onLogout }) {
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
          <h2>Student Portal</h2>
        </div>
        <div className="user-info">
          <div className="user-details">
            <p>John Smith</p>
            <p>Student ID: 7654321</p>
          </div>
          <button className="logout-btn" onClick={handleLogoutClick}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      
      {/* Rest of your dashboard content remains the same */}
      <div className="dashboard-content">
        <div className="main-content">
          <div className="attendance-card">
            <div className="attendance-overview">
              <div className="attendance-percentage">89.5%</div>
              <div className="attendance-stats">94 of 105 classes attended</div>
            </div>
            
            <div className="divider"></div>
            
            <h3 className="section-title">Upcoming Classes</h3>
            <p>Your scheduled classes</p>
            
            <div className="upcoming-classes">
              <div className="class-item">
                <h4>CSCI334 - Database Systems</h4>
                <div className="class-details">
                  <span>9:00 AM - 11:00 AM</span>
                  <span>Building 3, Room 205</span>
                </div>
              </div>
              
              <div className="class-item">
                <h4>CSCI251 - Software Engineering</h4>
                <div className="class-details">
                  <span>2:00 PM - 4:00 PM</span>
                  <span>Building 1, Room 101</span>
                </div>
              </div>
              
              <div className="class-item">
                <h4>CSCI203 - Algorithms</h4>
                <div className="class-details">
                  <span>10:00 AM - 12:00 PM</span>
                  <span>Building 3, Room 308</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-number">5/6</div>
              <div className="stat-label">Classes attended this week</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">2</div>
              <div className="stat-label">Classes scheduled today</div>
            </div>
          </div>
          
          <div className="attendance-card attendance-by-subject">
            <h3 className="section-title">Attendance by Subject</h3>
            <p>Your attendance rate per subject</p>
            
            <div className="subject-list">
              <div className="subject-item">
                <span className="subject-name">CSCI334 - Database Systems</span>
                <span className="subject-stats">
                  <span className="subject-percentage">92%</span>
                  <span>11 of 12 classes attended</span>
                </span>
              </div>
              
              <div className="subject-item">
                <span className="subject-name">CSCI251 - Software Engineering</span>
                <span className="subject-stats">
                  <span className="subject-percentage">100%</span>
                  <span>13 of 13 classes attended</span>
                </span>
              </div>
              
              <div className="subject-item">
                <span className="subject-name">CSCI203 - Algorithms</span>
                <span className="subject-stats">
                  <span className="subject-percentage">77%</span>
                  <span>10 of 13 classes attended</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="sidebar">
          <div className="attendance-card attendance-history">
            <h3 className="section-title">Recent Attendance History</h3>
            <p>Your recent class attendance records</p>
            
            <div className="history-list">
              <div className="history-item">
                <div className="history-details">
                  <h4>CSCI334 - Database Systems</h4>
                  <div className="history-date">28 Oct 2023</div>
                </div>
                <div className="attendance-status present">Present</div>
              </div>
              
              <div className="history-item">
                <div className="history-details">
                  <h4>CSCI251 - Software Engineering</h4>
                  <div className="history-date">28 Oct 2023</div>
                </div>
                <div className="attendance-status present">Present</div>
              </div>
              
              <div className="history-item">
                <div className="history-details">
                  <h4>CSCI203 - Algorithms</h4>
                  <div className="history-date">27 Oct 2023</div>
                </div>
                <div className="attendance-status present">Present</div>
              </div>
              
              <div className="history-item">
                <div className="history-details">
                  <h4>CSCI334 - Database Systems</h4>
                  <div className="history-date">26 Oct 2023</div>
                </div>
                <div className="attendance-status present">Present</div>
              </div>
              
              <div className="history-item">
                <div className="history-details">
                  <h4>CSCI251 - Software Engineering</h4>
                  <div className="history-date">26 Oct 2023</div>
                </div>
                <div className="attendance-status present">Present</div>
              </div>
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

export default StudentDashboard;