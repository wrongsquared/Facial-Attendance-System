import './styles/globals.css';
import { useState } from 'react';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentTimetable } from './components/StudentTimetable';
import { LecturerTimetable } from './components/LecturerTimetable';
import { StudentAttendanceHistory } from './components/StudentAttendanceHistory';
import { LecturerAttendanceRecords } from './components/LecturerAttendanceRecords';
import { AdminAttendanceRecords } from './components/AdminAttendanceRecords';
import { StudentProgressTracker } from './components/StudentProgressTracker';
import { ManageBiometricProfile } from './components/ManageBiometricProfile';
import { ManageUserProfile } from './components/ManageUserProfile';
import { AdminUpdateUserProfile } from './components/AdminUpdateUserProfile';
import { CreateBiometricProfile } from './components/CreateBiometricProfile';
import { UpdateBiometricProfile } from './components/UpdateBiometricProfile';
import { UpdateCustomGoal } from './components/UpdateCustomGoal';
import { ManualOverride } from './components/ManualOverride';
import { AttendanceReports } from './components/AttendanceReports';
import { AdminAttendanceReports } from './components/AdminAttendanceReports';
import { StudentProfile } from './components/StudentProfile';
import { Toast } from './components/Toast';
import { Button } from './components/ui/button';

// Initial attendance records data
const initialAttendanceRecords = [
  { userId: "7891011", studentName: "John Smith", date: "2025-12-10", status: "Present" },
  { userId: "7891012", studentName: "Emma Johnson", date: "2025-12-10", status: "Absent" },
  { userId: "7891011", studentName: "John Smith", date: "2025-12-11", status: "Late" },
  { userId: "7891012", studentName: "Emma Johnson", date: "2025-12-11", status: "Present" },
];

// User profile data type
interface UserProfileData {
  userId: string;
  name: string;
  role: string;
  status: string;
  email: string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  enrollmentDate: string;
  associatedModules: string;
  biometricStatus: string;
  biometricLastUpdated: string;
}

type AttendanceRecord = {
  userId: string;
  studentName: string;
  date: string;
  status: string;
};

type UserType = 'student' | 'lecturer' | 'admin' | null;
type LecturerView = 'dashboard' | 'reports' | 'profile' | 'timetable' | 'records';
type AdminView = 'dashboard' | 'manageUsers' | 'manageUserProfile' | 'updateUserProfile' | 'createCustomGoal' | 'manageBiometric' | 'createBiometric' | 'updateBiometric' | 'attendanceRecords' | 'adminReports' | 'manualOverride' | 'createUser' | 'updateUser';
type StudentView = 'dashboard' | 'attendanceHistory' | 'timetable' | 'profile' | 'progress';

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
  const [selectedStudentData, setSelectedStudentData] = useState<{
    userId: string;
    studentName: string;
    date: string;
    status: string;
  } | null>(null);
  const [selectedBiometricUserData, setSelectedBiometricUserData] = useState<{
    userId: string;
    name: string;
    role: string;
  } | null>(null);
  const [selectedCustomGoalUserData, setSelectedCustomGoalUserData] = useState<{
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  } | null>(null);

  // User goals state - mapping userId to goal percentage (null means deleted/no goal)
  const [userGoals, setUserGoals] = useState<Record<string, number | null>>({
    "7891011": 85,
    "7891012": 90,
    "7891013": 80,
    "7891014": 85,
    "7891015": 75,
    "7891016": 90,
    "7891017": 80,
    "7891018": 85,
  });

  // User profiles state - comprehensive profile data for all users
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileData>>({
    "7891011": {
      userId: "7891011",
      name: "John Smith",
      role: "Student",
      status: "Active",
      email: "john.smith@uow.edu.au",
      dateOfBirth: "1998-05-15",
      contactNumber: "+61 412 345 678",
      address: "123 Main Street, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI251, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "28 Oct 2025",
    },
    "7891012": {
      userId: "7891012",
      name: "Emma Johnson",
      role: "Student",
      status: "Active",
      email: "emma.johnson@uow.edu.au",
      dateOfBirth: "1999-08-22",
      contactNumber: "+61 423 456 789",
      address: "456 Ocean Drive, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI251, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "15 Oct 2025",
    },
    "7891013": {
      userId: "7891013",
      name: "Michael Brown",
      role: "Student",
      status: "Inactive",
      email: "michael.brown@uow.edu.au",
      dateOfBirth: "1997-12-10",
      contactNumber: "+61 434 567 890",
      address: "789 Beach Road, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI251",
      biometricStatus: "Not Enrolled",
      biometricLastUpdated: "N/A",
    },
    "L001": {
      userId: "L001",
      name: "Dr. Rachel Wong",
      role: "Lecturer",
      status: "Active",
      email: "rachel.wong@uow.edu.au",
      dateOfBirth: "1985-03-15",
      contactNumber: "+61 445 678 901",
      address: "321 University Ave, Wollongong NSW 2500",
      enrollmentDate: "01 Jan 2020",
      associatedModules: "CSCI334, CSCI251, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "10 Nov 2025",
    },
    "L002": {
      userId: "L002",
      name: "Prof. David Chen",
      role: "Lecturer",
      status: "Active",
      email: "david.chen@uow.edu.au",
      dateOfBirth: "1980-07-20",
      contactNumber: "+61 456 789 012",
      address: "654 Campus Street, Wollongong NSW 2500",
      enrollmentDate: "01 Mar 2018",
      associatedModules: "CSCI334, CSCI235",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "05 Dec 2025",
    },
    "7891014": {
      userId: "7891014",
      name: "Sarah Williams",
      role: "Student",
      status: "Active",
      email: "sarah.williams@uow.edu.au",
      dateOfBirth: "1998-11-30",
      contactNumber: "+61 467 890 123",
      address: "987 Coastal Way, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "20 Nov 2025",
    },
    "7891015": {
      userId: "7891015",
      name: "James Davis",
      role: "Student",
      status: "Active",
      email: "james.davis@uow.edu.au",
      dateOfBirth: "1999-04-18",
      contactNumber: "+61 478 901 234",
      address: "159 Harbor View, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI251, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "30 Oct 2025",
    },
    "A001": {
      userId: "A001",
      name: "Admin User",
      role: "Admin",
      status: "Active",
      email: "admin@uow.edu.au",
      dateOfBirth: "1990-01-01",
      contactNumber: "+61 400 000 000",
      address: "1 Admin Building, Wollongong NSW 2500",
      enrollmentDate: "01 Jan 2020",
      associatedModules: "N/A",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "01 Dec 2025",
    },
    "7891016": {
      userId: "7891016",
      name: "Lisa Anderson",
      role: "Student",
      status: "Inactive",
      email: "lisa.anderson@uow.edu.au",
      dateOfBirth: "1998-09-25",
      contactNumber: "+61 489 012 345",
      address: "753 Seaside Drive, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI251",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "15 Sep 2025",
    },
    "L003": {
      userId: "L003",
      name: "Dr. Maria Garcia",
      role: "Lecturer",
      status: "Active",
      email: "maria.garcia@uow.edu.au",
      dateOfBirth: "1982-06-12",
      contactNumber: "+61 490 123 456",
      address: "852 Faculty Lane, Wollongong NSW 2500",
      enrollmentDate: "01 Jul 2019",
      associatedModules: "CSCI203, CSCI235",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "25 Nov 2025",
    },
    "7891017": {
      userId: "7891017",
      name: "Robert Taylor",
      role: "Student",
      status: "Active",
      email: "robert.taylor@uow.edu.au",
      dateOfBirth: "1999-02-14",
      contactNumber: "+61 401 234 567",
      address: "369 Student Street, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI251, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "10 Oct 2025",
    },
    "7891018": {
      userId: "7891018",
      name: "Jennifer Martinez",
      role: "Student",
      status: "Active",
      email: "jennifer.martinez@uow.edu.au",
      dateOfBirth: "1998-07-08",
      contactNumber: "+61 412 345 678",
      address: "147 Campus Road, Wollongong NSW 2500",
      enrollmentDate: "15 Feb 2023",
      associatedModules: "CSCI334, CSCI203",
      biometricStatus: "Enrolled",
      biometricLastUpdated: "18 Nov 2025",
    },
  });

  // Attendance records state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialAttendanceRecords);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const hideToast = () => {
    setToastMessage(null);
  };

  // Function to update attendance record
  const updateAttendanceRecord = (userId: string, date: string, newStatus: string) => {
    setAttendanceRecords(prev => 
      prev.map(record => 
        record.userId === userId && record.date === date
          ? { ...record, status: newStatus }
          : record
      )
    );
  };

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

  const handleNavigateToManageUserProfile = () => {
    setAdminView('manageUserProfile');
  };

  const handleNavigateToBiometricProfile = () => {
    setAdminView('manageBiometric');
  };

  const handleNavigateToCreateBiometric = (userData: {
    userId: string;
    name: string;
    role: string;
  }) => {
    setSelectedBiometricUserData(userData);
    setAdminView('createBiometric');
  };

  const handleNavigateToUpdateBiometric = (userData: {
    userId: string;
    name: string;
    role: string;
  }) => {
    setSelectedBiometricUserData(userData);
    setAdminView('updateBiometric');
  };

  const handleBackToBiometricProfile = () => {
    setAdminView('manageBiometric');
  };

  const handleNavigateToCreateCustomGoal = (userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  }) => {
    setSelectedCustomGoalUserData(userData);
    setAdminView('createCustomGoal');
  };

  const handleBackToManageUserProfile = () => {
    setAdminView('manageUserProfile');
  };

  const handleUpdateUserGoal = (userId: string, goal: number) => {
    setUserGoals(prev => ({
      ...prev,
      [userId]: goal
    }));
  };

  const handleDeleteUserGoal = (userId: string) => {
    setUserGoals(prev => ({
      ...prev,
      [userId]: null
    }));
  };

  const handleUpdateUserProfile = (userId: string, profileData: Omit<UserProfileData, 'userId'>) => {
    // Store the old name before updating
    const oldName = userProfiles[userId]?.name;
    
    setUserProfiles(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...profileData,
        userId, // Ensure userId is preserved
      }
    }));
    
    // Also update attendance records if name changed
    if (profileData.name && oldName !== profileData.name) {
      setAttendanceRecords(prevRecords =>
        prevRecords.map(record =>
          record.userId === userId
            ? { ...record, studentName: profileData.name }
            : record
        )
      );
    }
  };

  const handleNavigateToUpdateUserProfile = (userData: {
    userId: string;
    name: string;
    role: string;
  }) => {
    setSelectedBiometricUserData(userData);
    setAdminView('updateUserProfile');
  };

  const handleNavigateToAdminAttendanceRecords = () => {
    setAdminView('attendanceRecords');
  };

  const handleNavigateToAdminReports = () => {
    setAdminView('adminReports');
  };

  const handleNavigateToManualOverride = (studentData: {
    userId: string;
    studentName: string;
    date: string;
    status: string;
  }) => {
    setSelectedStudentData(studentData);
    setAdminView('manualOverride');
  };

  const handleBackToAttendanceRecords = () => {
    setAdminView('attendanceRecords');
  };

  const handleNavigateToAttendanceHistory = () => {
    setStudentView('attendanceHistory');
  };

  const handleBackToStudentDashboard = () => {
    setStudentView('dashboard');
  };

  const handleNavigateToStudentTimetable = () => {
    setStudentView('timetable');
  };

  const handleNavigateToStudentProfile = () => {
    setStudentView('profile');
  };

  const handleNavigateToStudentProgress = () => {
    setStudentView('progress');
  };

  // Show login page if no user is logged in
  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen">
        <LoginPage onLogin={handleLogin} />
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
          onNavigateToTimetable={handleNavigateToStudentTimetable}
          onNavigateToProfile={handleNavigateToStudentProfile}
          onNavigateToProgress={handleNavigateToStudentProgress}
        />
      )}
      {currentUser === 'student' && studentView === 'attendanceHistory' && (
        <StudentAttendanceHistory 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
        />
      )}
      {currentUser === 'student' && studentView === 'timetable' && (
        <StudentTimetable 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
        />
      )}
      {currentUser === 'student' && studentView === 'profile' && (
        <StudentProfile 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
        />
      )}
      {currentUser === 'student' && studentView === 'progress' && (
        <StudentProgressTracker 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl mb-4">Profile Page - Coming Soon</h2>
            <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
          </div>
        </div>
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
          onNavigateToManageUserProfile={handleNavigateToManageUserProfile}
          onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
          onNavigateToAttendanceRecords={handleNavigateToAdminAttendanceRecords}
          onNavigateToReports={handleNavigateToAdminReports}
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
          showToast={showToast}
        />
      )}
      {currentUser === 'admin' && adminView === 'manageUserProfile' && (
        <ManageUserProfile 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onNavigateToCreateCustomGoal={handleNavigateToCreateCustomGoal}
          onNavigateToUpdateUserProfile={handleNavigateToUpdateUserProfile}
          userGoals={userGoals}
          userProfiles={userProfiles}
        />
      )}
      {currentUser === 'admin' && adminView === 'updateUserProfile' && selectedBiometricUserData && (
        <AdminUpdateUserProfile 
          onLogout={handleLogout} 
          onBack={handleBackToManageUserProfile}
          onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
          userData={selectedBiometricUserData}
          userProfileData={userProfiles[selectedBiometricUserData.userId]}
          onUpdateProfile={handleUpdateUserProfile}
          showToast={showToast}
        />
      )}
      {currentUser === 'admin' && adminView === 'createCustomGoal' && selectedCustomGoalUserData && (
        <UpdateCustomGoal 
          onLogout={handleLogout} 
          onBack={handleBackToManageUserProfile}
          userData={selectedCustomGoalUserData}
          onUpdateGoal={handleUpdateUserGoal}
          onDeleteGoal={handleDeleteUserGoal}
          showToast={showToast}
        />
      )}
      {currentUser === 'admin' && adminView === 'manageBiometric' && (
        <ManageBiometricProfile 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onNavigateToCreateBiometric={handleNavigateToCreateBiometric}
          onNavigateToUpdateBiometric={handleNavigateToUpdateBiometric}
        />
      )}
      {currentUser === 'admin' && adminView === 'createBiometric' && selectedBiometricUserData && (
        <CreateBiometricProfile 
          onLogout={handleLogout} 
          onBack={handleBackToBiometricProfile}
          userData={selectedBiometricUserData}
        />
      )}
      {currentUser === 'admin' && adminView === 'updateBiometric' && selectedBiometricUserData && (
        <UpdateBiometricProfile 
          onLogout={handleLogout} 
          onBack={handleBackToBiometricProfile}
          userData={selectedBiometricUserData}
          showToast={showToast}
        />
      )}
      {currentUser === 'admin' && adminView === 'attendanceRecords' && (
        <AdminAttendanceRecords 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onNavigateToManualOverride={handleNavigateToManualOverride}
          attendanceRecords={attendanceRecords}
          updateAttendanceRecord={updateAttendanceRecord}
        />
      )}
      {currentUser === 'admin' && adminView === 'manualOverride' && selectedStudentData && (
        <ManualOverride 
          onLogout={handleLogout} 
          onBack={handleBackToAttendanceRecords}
          studentData={selectedStudentData}
          showToast={showToast}
          updateAttendanceRecord={updateAttendanceRecord}
        />
      )}
      {currentUser === 'admin' && adminView === 'adminReports' && (
        <AdminAttendanceReports 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
        />
      )}
      <Toast message={toastMessage} onClose={hideToast} />
    </div>
  );
}