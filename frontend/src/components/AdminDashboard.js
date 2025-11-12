import React from 'react';
import './Dashboard.css';

function AdminDashboard({ onLogout }) {
  return (
    <div className="dashboard container">
      <div className="header">
        <div>
          <h1>Attendify</h1>
          <h2>Admin Portal</h2>
        </div>
        <div className="user-info">
          <div className="user-details">
            <p>Admin User</p>
            <p>Admin ID: A78901</p>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="main-content">
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-number">2847</div>
              <div className="stat-label">Total Students</div>
              <div className="stat-change">+127 from last month</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">312</div>
              <div className="stat-label">Active Courses</div>
              <div className="stat-change">+15 from last month</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">87.3%</div>
              <div className="stat-label">Average Attendance</div>
            </div>
          </div>
          
          <div className="attendance-card">
            <h3 className="section-title">Status Alerts</h3>
            <p>Important notifications and warnings</p>
            
            <div className="alerts-list">
              <div className="alert-item warning">
                <h4>CSCI101 has below 75% attendance rate</h4>
                <span className="alert-time">2 hours ago</span>
              </div>
              
              <div className="alert-item info">
                <h4>4 new user registrations pending approval</h4>
                <span className="alert-time">3 hours ago</span>
              </div>
              
              <div className="alert-item success">
                <h4>System backup completed successfully</h4>
                <span className="alert-time">1 day ago</span>
              </div>
            </div>
          </div>
          
          <div className="attendance-card">
            <h3 className="section-title">Courses Requiring Attention</h3>
            <p>Courses with attendance below 80%</p>
            
            <div className="course-list">
              <div className="course-item warning">
                <h4>CSCI101 - Introduction to Programming</h4>
                <div className="course-details">
                  <span>Dr. Smith</span>
                  <span>45 students</span>
                  <span className="attendance-rate low">74% Attendance</span>
                </div>
              </div>
              
              <div className="course-item">
                <h4>MATH201 - Calculus II</h4>
                <div className="course-details">
                  <span>Prof. Johnson</span>
                  <span>42 students</span>
                  <span className="attendance-rate">79% Attendance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="sidebar">
          <div className="attendance-card">
            <h3 className="section-title">Quick Actions</h3>
            <p>Common administrative tasks</p>
            
            <div className="quick-actions">
              <button className="action-btn">
                <i className="fas fa-user-plus"></i>
                Add New User
              </button>
              <button className="action-btn">
                <i className="fas fa-book"></i>
                Create New Course
              </button>
              <button className="action-btn">
                <i className="fas fa-chart-bar"></i>
                Generate Reports
              </button>
            </div>
          </div>
          
          <div className="attendance-card">
            <h3 className="section-title">User Management</h3>
            <p>Recent user registrations and updates</p>
            
            <div className="user-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Emma Thompson</td>
                    <td>emma.thompson@uow.edu.au</td>
                    <td>Student</td>
                    <td><span className="status-online">Online</span></td>
                    <td><button className="manage-btn">Manage</button></td>
                  </tr>
                  <tr>
                    <td>Michael Chen</td>
                    <td>michael.chen@uow.edu.au</td>
                    <td>Lecturer</td>
                    <td><span className="status-online">Online</span></td>
                    <td><button className="manage-btn">Manage</button></td>
                  </tr>
                  <tr>
                    <td>Sarah Johnson</td>
                    <td>sarah.johnson@uow.edu.au</td>
                    <td>Student</td>
                    <td><span className="status-pending">Pending</span></td>
                    <td><button className="manage-btn">Manage</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;