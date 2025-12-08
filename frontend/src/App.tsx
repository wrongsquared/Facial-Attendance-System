import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AttendanceReports } from './components/AttendanceReports';
import { UpdateProfile } from './components/UpdateProfile';
import { LecturerTimetable } from './components/LecturerTimetable';
import { LecturerAttendanceRecords } from './components/LecturerAttendanceRecords';
import { ManageUserAccounts } from './components/ManageUserAccounts';
import { StudentAttendanceHistory } from './components/StudentAttendanceHistory';
import { CreateUser } from './components/CreateUser';
import { UpdateUser } from './components/UpdateUser';
import { Footer } from './components/Footer';

type UserType = 'student' | 'lecturer' | 'admin' | null;
type LecturerView = 'dashboard' | 'reports' | 'profile' | 'timetable' | 'records';
type AdminView = 'dashboard' | 'manageUsers' | 'createUser' | 'updateUser';
type StudentView = 'dashboard' | 'attendanceHistory';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType>(null);
  const [lecturerView, setLecturerView] = useState<LecturerView>('dashboard');
  const [adminView, setAdminView] = useState<AdminView>('dashboard');
  const [studentView, setStudentView] = useState<StudentView>('dashboard');
  const [selectedUserData, setSelectedUserData] = useState<{
    userId: string;
    name: string;
    role: string;
    status: string;
  } | null>(null);

  const handleLogin = (userType: UserType) => {
    setCurrentUser(userType);
    setLecturerView('dashboard');
    setAdminView('dashboard');
    setStudentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLecturerView('dashboard');
    setAdminView('dashboard');
    setStudentView('dashboard');
  };

  const handleNavigateToReports = () => {
    setLecturerView('reports');
  };

  const handleNavigateToProfile = () => {
    setLecturerView('profile');
  };

  const handleNavigateToTimetable = () => {
    setLecturerView('timetable');
  };

  const handleNavigateToRecords = () => {
    setLecturerView('records');
  };

  const handleBackToDashboard = () => {
    setLecturerView('dashboard');
  };

  const handleNavigateToManageUsers = () => {
    setAdminView('manageUsers');
  };

  const handleBackToAdminDashboard = () => {
    setAdminView('dashboard');
  };

  const handleNavigateToCreateUser = () => {
    setAdminView('createUser');
  };

  const handleBackToManageUsers = () => {
    setAdminView('manageUsers');
  };

  const handleNavigateToUpdateUser = (userData: {
    userId: string;
    name: string;
    role: string;
    status: string;
  }) => {
    setSelectedUserData(userData);
    setAdminView('updateUser');
  };

  const handleNavigateToAttendanceHistory = () => {
    setStudentView('attendanceHistory');
  };

  const handleBackToStudentDashboard = () => {
    setStudentView('dashboard');
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
      {currentUser === 'student' && studentView === 'dashboard' && (
        <StudentDashboard 
          onLogout={handleLogout}
          onNavigateToAttendanceHistory={handleNavigateToAttendanceHistory}
        />
      )}
      {currentUser === 'student' && studentView === 'attendanceHistory' && (
        <StudentAttendanceHistory 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
        />
      )}
      {currentUser === 'lecturer' && lecturerView === 'dashboard' && (
        <LecturerDashboard 
          onLogout={handleLogout} 
          onNavigateToReports={handleNavigateToReports}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToTimetable={handleNavigateToTimetable}
          onNavigateToRecords={handleNavigateToRecords}
        />
      )}
      {currentUser === 'lecturer' && lecturerView === 'reports' && (
        <AttendanceReports 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
      {currentUser === 'lecturer' && lecturerView === 'profile' && (
        <UpdateProfile 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
        />
      )}
      {currentUser === 'lecturer' && lecturerView === 'timetable' && (
        <LecturerTimetable 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
      {currentUser === 'lecturer' && lecturerView === 'records' && (
        <LecturerAttendanceRecords 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
      {currentUser === 'admin' && adminView === 'dashboard' && (
        <AdminDashboard 
          onLogout={handleLogout} 
          onNavigateToManageUsers={handleNavigateToManageUsers}
        />
      )}
      {currentUser === 'admin' && adminView === 'manageUsers' && (
        <ManageUserAccounts 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onCreateUser={handleNavigateToCreateUser}
          onUpdateUser={handleNavigateToUpdateUser}
        />
      )}
      {currentUser === 'admin' && adminView === 'createUser' && (
        <CreateUser 
          onLogout={handleLogout} 
          onBack={handleBackToManageUsers}
          onCreateSuccess={handleBackToManageUsers}
        />
      )}
      {currentUser === 'admin' && adminView === 'updateUser' && selectedUserData && (
        <UpdateUser 
          onLogout={handleLogout} 
          onBack={handleBackToManageUsers}
          onUpdateSuccess={handleBackToManageUsers}
          userData={selectedUserData}
        />
      )}
      <Footer />
    </div>
  );
}