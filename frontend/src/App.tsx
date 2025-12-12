import { useState } from 'react';
import { useAuth } from './cont/AuthContext'; 
import { loginUser, LoginCredentials } from './services/api';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminAttendanceRecords } from './components/AdminAttendanceRecords';
import { AdminAttendanceReports } from './components/AdminAttendanceReports';
import { AttendanceReports } from './components/AttendanceReports';
import { UpdateProfile } from './components/UpdateProfile';
import { LecturerTimetable } from './components/LecturerTimetable';
import { LecturerAttendanceRecords } from './components/LecturerAttendanceRecords';
import { ManageUserAccounts } from './components/ManageUserAccounts';
import { ManageBiometricProfile } from './components/ManageBiometricProfile';
import { ManageUserProfile } from './components/ManageUserProfile';
import { AdminUpdateUserProfile } from './components/AdminUpdateUserProfile';
import { CreateBiometricProfile } from './components/CreateBiometricProfile';
import { UpdateBiometricProfile } from './components/UpdateBiometricProfile';
import { UpdateCustomGoal } from './components/UpdateCustomGoal';
import { ManualOverride } from './components/ManualOverride';
import { StudentAttendanceHistory } from './components/StudentAttendanceHistory';
import { StudentTimetable } from './components/StudentTimetable';
import { StudentProfile } from './components/StudentProfile';
import { StudentProgressTracker } from './components/StudentProgressTracker';
import { CreateUser } from './components/CreateUser';
import { UpdateUser } from './components/UpdateUser';
import { Footer } from './components/Footer';



type UserType = 'student' | 'lecturer' | 'admin' | null;
type LecturerView = 'dashboard' | 'reports' | 'profile' | 'timetable' | 'records';
type AdminView = 'dashboard' | 'manageUsers' | 'manageUserProfile' | 'updateUserProfile' | 'createCustomGoal' | 'manageBiometric' | 'createBiometric' | 'updateBiometric' | 'attendanceRecords' | 'adminReports' | 'manualOverride' | 'createUser' | 'updateUser';
type StudentView = 'dashboard' | 'attendanceHistory' | 'timetable' | 'profile' | 'progress';

export default function App() {
  const { user, login, logout, loading } = useAuth();
  const [role, setCurrentUser] = useState<UserType>(null);
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

  // 4. NEW LOGIN LOGIC: Connects to Backend
  const handleLogin = async (creds: LoginCredentials, selectedRole: string) => {
    try {
      // A. Call the API
      const data = await loginUser(creds);

      // B. Optional: Check Role Mismatch
      // Ensure the backend role matches the tab the user selected
      if (data.role_name.toLowerCase() !== selectedRole.toLowerCase()) {
        throw new Error(`Account found, but you are a ${data.role_name}. Please select the ${data.role_name} tab.`);
      }

      // C. Save to Context (Redirects automatically)
      login(data);

      // D. Reset views to default
      setLecturerView('dashboard');
      setAdminView('dashboard');
      setStudentView('dashboard');

    } catch (error: any) {
      console.error("Login Error:", error);
      alert(error.message || "Login failed");
    }
  };

  // 5. NEW LOGOUT LOGIC
  const handleLogout = () => {
    console.log("Logging out...");
    
    // 1. Run the Context logic (Server call + Local cleanup)
    logout(); 
    
    // 2. Reset your local view states (Clean slate for next user)
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

      // 6. LOADING STATE (Prevent flashing login screen)
  if (loading) {
    return <div className="flex min-h-screen justify-center items-center">Loading...</div>;
  }

  const handleNavigateToStudentProfile = () => {
    setStudentView('profile');
  };

  const handleNavigateToStudentProgress = () => {
    setStudentView('progress');
  };

  // Show login page if no user is logged in
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        <LoginPage onLogin={handleLogin} />
        <Footer />
      </div>
    );
  }

// 8. DETERMINE ROLE FOR RENDERING
  // Normalize to lowercase to match your strict comparisons
  const userRole = user.role_name.toLowerCase();

  // Show appropriate dashboard based on user type
  return (
    <div className="flex flex-col min-h-screen">
      {userRole === 'student' && studentView === 'dashboard' && (
        <StudentDashboard 
          onLogout={handleLogout}
          onNavigateToAttendanceHistory={handleNavigateToAttendanceHistory}
          onNavigateToTimetable={handleNavigateToStudentTimetable}
          onNavigateToProfile={handleNavigateToStudentProfile}
          onNavigateToProgress={handleNavigateToStudentProgress}
        />
      )}
      {userRole === 'student' && studentView === 'attendanceHistory' && (
        <StudentAttendanceHistory 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
        />
      )}
      {userRole === 'student' && studentView === 'timetable' && (
        <StudentTimetable 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
        />
      )}
      {userRole === 'student' && studentView === 'profile' && (
        <StudentProfile 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
        />
      )}
      {userRole === 'student' && studentView === 'progress' && (
        <StudentProgressTracker 
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
        />
      )}
      {userRole === 'lecturer' && lecturerView === 'dashboard' && (
        <LecturerDashboard 
          onLogout={handleLogout} 
          onNavigateToReports={handleNavigateToReports}
          onNavigateToProfile={handleNavigateToProfile}
          onNavigateToTimetable={handleNavigateToTimetable}
          onNavigateToRecords={handleNavigateToRecords}
        />
      )}
      {userRole === 'lecturer' && lecturerView === 'reports' && (
        <AttendanceReports 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
      {userRole === 'lecturer' && lecturerView === 'profile' && (
        <UpdateProfile 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
        />
      )}
      {userRole === 'lecturer' && lecturerView === 'timetable' && (
        <LecturerTimetable 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
      {userRole === 'lecturer' && lecturerView === 'records' && (
        <LecturerAttendanceRecords 
          onLogout={handleLogout} 
          onBack={handleBackToDashboard}
          onNavigateToProfile={handleNavigateToProfile}
        />
      )}
      {userRole === 'admin' && adminView === 'dashboard' && (
        <AdminDashboard 
          onLogout={handleLogout} 
          onNavigateToManageUsers={handleNavigateToManageUsers}
          onNavigateToManageUserProfile={handleNavigateToManageUserProfile}
          onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
          onNavigateToAttendanceRecords={handleNavigateToAdminAttendanceRecords}
          onNavigateToReports={handleNavigateToAdminReports}
        />
      )}
      {userRole === 'admin' && adminView === 'manageUsers' && (
        <ManageUserAccounts 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onCreateUser={handleNavigateToCreateUser}
          onUpdateUser={handleNavigateToUpdateUser}
        />
      )}
      {userRole === 'admin' && adminView === 'createUser' && (
        <CreateUser 
          onLogout={handleLogout} 
          onBack={handleBackToManageUsers}
          onCreateSuccess={handleBackToManageUsers}
        />
      )}
      {userRole === 'admin' && adminView === 'updateUser' && selectedUserData && (
        <UpdateUser 
          onLogout={handleLogout} 
          onBack={handleBackToManageUsers}
          onUpdateSuccess={handleBackToManageUsers}
          userData={selectedUserData}
        />
      )}
      {userRole === 'admin' && adminView === 'manageUserProfile' && (
        <ManageUserProfile 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onNavigateToCreateCustomGoal={handleNavigateToCreateCustomGoal}
          onNavigateToUpdateUserProfile={handleNavigateToUpdateUserProfile}
        />
      )}
      {userRole === 'admin' && adminView === 'updateUserProfile' && selectedBiometricUserData && (
        <AdminUpdateUserProfile 
          onLogout={handleLogout} 
          onBack={handleBackToManageUserProfile}
          onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
          userData={selectedBiometricUserData}
        />
      )}
      {userRole === 'admin' && adminView === 'createCustomGoal' && selectedCustomGoalUserData && (
        <UpdateCustomGoal 
          onLogout={handleLogout} 
          onBack={handleBackToManageUserProfile}
          userData={selectedCustomGoalUserData}
        />
      )}
      {userRole === 'admin' && adminView === 'manageBiometric' && (
        <ManageBiometricProfile 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onNavigateToCreateBiometric={handleNavigateToCreateBiometric}
          onNavigateToUpdateBiometric={handleNavigateToUpdateBiometric}
        />
      )}
      {userRole === 'admin' && adminView === 'createBiometric' && selectedBiometricUserData && (
        <CreateBiometricProfile 
          onLogout={handleLogout} 
          onBack={handleBackToBiometricProfile}
          userData={selectedBiometricUserData}
        />
      )}
      {userRole === 'admin' && adminView === 'updateBiometric' && selectedBiometricUserData && (
        <UpdateBiometricProfile 
          onLogout={handleLogout} 
          onBack={handleBackToBiometricProfile}
          userData={selectedBiometricUserData}
        />
      )}
      {userRole === 'admin' && adminView === 'attendanceRecords' && (
        <AdminAttendanceRecords 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
          onNavigateToManualOverride={handleNavigateToManualOverride}
        />
      )}
      {userRole === 'admin' && adminView === 'manualOverride' && selectedStudentData && (
        <ManualOverride 
          onLogout={handleLogout} 
          onBack={handleBackToAttendanceRecords}
          studentData={selectedStudentData}
        />
      )}
      {userRole === 'admin' && adminView === 'adminReports' && (
        <AdminAttendanceReports 
          onLogout={handleLogout} 
          onBack={handleBackToAdminDashboard}
        />
      )}
      <Footer />
    </div>
  );
}



// export default function App() {
//   // 3. REPLACE: Remove [currentUser, setCurrentUser]
//   //    USE: Global Context
//   const { user, login, logout, loading } = useAuth();

//   // Navigation State (Kept same as before)
//   const [currentUser, setCurrentUser] = useState<UserType>(null);
//   const [lecturerView, setLecturerView] = useState<LecturerView>('dashboard');
//   const [adminView, setAdminView] = useState<AdminView>('dashboard');
//   const [studentView, setStudentView] = useState<StudentView>('dashboard');
//   const [selectedUserData, setSelectedUserData] = useState<{
//     userId: string;
//     name: string;
//     role: string;
//     status: string;
//   } | null>(null);
//   const [selectedStudentData, setSelectedStudentData] = useState<{
//     userId: string;
//     studentName: string;
//     date: string;
//     status: string;
//   } | null>(null);
//   const [selectedBiometricUserData, setSelectedBiometricUserData] = useState<{
//     userId: string;
//     name: string;
//     role: string;
//   } | null>(null);
//   const [selectedCustomGoalUserData, setSelectedCustomGoalUserData] = useState<{
//     userId: string;
//     name: string;
//     role: string;
//     currentGoal: number | null;
//   } | null>(null);

//   // 4. NEW LOGIN LOGIC: Connects to Backend
//   const handleLogin = async (creds: LoginCredentials, selectedRole: string) => {
//     try {
//       // A. Call the API
//       const data = await loginUser(creds);

//       // B. Optional: Check Role Mismatch
//       // Ensure the backend role matches the tab the user selected
//       if (data.role_name.toLowerCase() !== selectedRole.toLowerCase()) {
//         throw new Error(`Account found, but you are a ${data.role_name}. Please select the ${data.role_name} tab.`);
//       }

//       // C. Save to Context (Redirects automatically)
//       login(data);

//       // D. Reset views to default
//       setLecturerView('dashboard');
//       setAdminView('dashboard');
//       setStudentView('dashboard');

//     } catch (error: any) {
//       console.error("Login Error:", error);
//       alert(error.message || "Login failed");
//     }
//   };

//   // 5. NEW LOGOUT LOGIC
//   const handleLogout = () => {
//     console.log("Logging out...");
    
//     // 1. Run the Context logic (Server call + Local cleanup)
//     logout(); 
    
//     // 2. Reset your local view states (Clean slate for next user)
//     setLecturerView('dashboard');
//     setAdminView('dashboard');
//     setStudentView('dashboard');
//   };

//   // 6. LOADING STATE (Prevent flashing login screen)
//   if (loading) {
//     return <div className="flex min-h-screen justify-center items-center">Loading...</div>;
//   }

//   const handleNavigateToStudentTimetable = () => {
//     setStudentView('timetable');
//   };

//   const handleNavigateToStudentProfile = () => {
//     setStudentView('profile');
//   };

//   const handleNavigateToStudentProgress = () => {
//     setStudentView('progress');
//   };

//   // 7. SHOW LOGIN IF NO USER
//   if (!user) {
//     return (
//       <div className="flex flex-col min-h-screen">
//         <LoginPage onLogin={handleLogin} />
//         <Footer />
//       </div>
//     );
//   }
  
//   // 8. DETERMINE ROLE FOR RENDERING
//   // Normalize to lowercase to match your strict comparisons
//   const role = user.role_name.toLowerCase();

//   return (
//     <div className="flex flex-col min-h-screen">
      
//       {/* --- STUDENT VIEWS --- */}
//       {role === 'student' && studentView === 'dashboard' && (
//         <StudentDashboard 
//           onLogout={handleLogout}
//           onNavigateToAttendanceHistory={handleNavigateToAttendanceHistory}
//           onNavigateToTimetable={handleNavigateToStudentTimetable}
//           onNavigateToProfile={handleNavigateToStudentProfile}
//           onNavigateToProgress={handleNavigateToStudentProgress}
//         />
//       )}
//       {role === 'student' && studentView === 'attendanceHistory' && (
//         <StudentAttendanceHistory 
//           onLogout={handleLogout}
//           onBack={handleBackToStudentDashboard}
//         />
//       )}
//       {currentUser === 'student' && studentView === 'timetable' && (
//         <StudentTimetable 
//           onLogout={handleLogout}
//           onBack={handleBackToStudentDashboard}
//           onNavigateToProfile={handleNavigateToStudentProfile}
//         />
//       )}
//       {currentUser === 'student' && studentView === 'profile' && (
//         <StudentProfile 
//           onLogout={handleLogout}
//           onBack={handleBackToStudentDashboard}
//         />
//       )}
//       {currentUser === 'student' && studentView === 'progress' && (
//         <StudentProgressTracker 
//           onLogout={handleLogout}
//           onBack={handleBackToStudentDashboard}
//           onNavigateToProfile={handleNavigateToStudentProfile}
//         />
//       )}
//       {currentUser === 'lecturer' && lecturerView === 'dashboard' && (

//       {/* --- LECTURER VIEWS --- */}
//       {role === 'lecturer' && lecturerView === 'dashboard' && (
//         <LecturerDashboard 
//           onLogout={handleLogout} 
//           onNavigateToReports={handleNavigateToReports}
//           onNavigateToProfile={handleNavigateToProfile}
//           onNavigateToTimetable={handleNavigateToTimetable}
//           onNavigateToRecords={handleNavigateToRecords}
//         />
//       )}
//       {role === 'lecturer' && lecturerView === 'reports' && (
//         <AttendanceReports 
//           onLogout={handleLogout} 
//           onBack={handleBackToDashboard}
//           onNavigateToProfile={handleNavigateToProfile}
//         />
//       )}
//       {role === 'lecturer' && lecturerView === 'profile' && (
//         <UpdateProfile 
//           onLogout={handleLogout} 
//           onBack={handleBackToDashboard}
//         />
//       )}
//       {role === 'lecturer' && lecturerView === 'timetable' && (
//         <LecturerTimetable 
//           onLogout={handleLogout} 
//           onBack={handleBackToDashboard}
//           onNavigateToProfile={handleNavigateToProfile}
//         />
//       )}
//       {role === 'lecturer' && lecturerView === 'records' && (
//         <LecturerAttendanceRecords 
//           onLogout={handleLogout} 
//           onBack={handleBackToDashboard}
//           onNavigateToProfile={handleNavigateToProfile}
//         />
//       )}

//       {/* --- ADMIN VIEWS --- */}
//       {role === 'admin' && adminView === 'dashboard' && (
//         <AdminDashboard 
//           onLogout={handleLogout} 
//           onNavigateToManageUsers={handleNavigateToManageUsers}
//           onNavigateToManageUserProfile={handleNavigateToManageUserProfile}
//           onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
//           onNavigateToAttendanceRecords={handleNavigateToAdminAttendanceRecords}
//           onNavigateToReports={handleNavigateToAdminReports}
//         />
//       )}
//       {role === 'admin' && adminView === 'manageUsers' && (
//         <ManageUserAccounts 
//           onLogout={handleLogout} 
//           onBack={handleBackToAdminDashboard}
//           onCreateUser={handleNavigateToCreateUser}
//           onUpdateUser={handleNavigateToUpdateUser}
//         />
//       )}
//       {role === 'admin' && adminView === 'createUser' && (
//         <CreateUser 
//           onLogout={handleLogout} 
//           onBack={handleBackToManageUsers}
//           onCreateSuccess={handleBackToManageUsers}
//         />
//       )}
//       {role === 'admin' && adminView === 'updateUser' && selectedUserData && (
//         <UpdateUser 
//           onLogout={handleLogout} 
//           onBack={handleBackToManageUsers}
//           onUpdateSuccess={handleBackToManageUsers}
//           userData={selectedUserData}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'manageUserProfile' && (
//         <ManageUserProfile 
//           onLogout={handleLogout} 
//           onBack={handleBackToAdminDashboard}
//           onNavigateToCreateCustomGoal={handleNavigateToCreateCustomGoal}
//           onNavigateToUpdateUserProfile={handleNavigateToUpdateUserProfile}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'updateUserProfile' && selectedBiometricUserData && (
//         <AdminUpdateUserProfile 
//           onLogout={handleLogout} 
//           onBack={handleBackToManageUserProfile}
//           onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
//           userData={selectedBiometricUserData}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'createCustomGoal' && selectedCustomGoalUserData && (
//         <UpdateCustomGoal 
//           onLogout={handleLogout} 
//           onBack={handleBackToManageUserProfile}
//           userData={selectedCustomGoalUserData}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'manageBiometric' && (
//         <ManageBiometricProfile 
//           onLogout={handleLogout} 
//           onBack={handleBackToAdminDashboard}
//           onNavigateToCreateBiometric={handleNavigateToCreateBiometric}
//           onNavigateToUpdateBiometric={handleNavigateToUpdateBiometric}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'createBiometric' && selectedBiometricUserData && (
//         <CreateBiometricProfile 
//           onLogout={handleLogout} 
//           onBack={handleBackToBiometricProfile}
//           userData={selectedBiometricUserData}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'updateBiometric' && selectedBiometricUserData && (
//         <UpdateBiometricProfile 
//           onLogout={handleLogout} 
//           onBack={handleBackToBiometricProfile}
//           userData={selectedBiometricUserData}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'attendanceRecords' && (
//         <AdminAttendanceRecords 
//           onLogout={handleLogout} 
//           onBack={handleBackToAdminDashboard}
//           onNavigateToManualOverride={handleNavigateToManualOverride}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'manualOverride' && selectedStudentData && (
//         <ManualOverride 
//           onLogout={handleLogout} 
//           onBack={handleBackToAttendanceRecords}
//           studentData={selectedStudentData}
//         />
//       )}
//       {currentUser === 'admin' && adminView === 'adminReports' && (
//         <AdminAttendanceReports 
//           onLogout={handleLogout} 
//           onBack={handleBackToAdminDashboard}
//         />
//       )}
//       <Footer />
//     </div>
//   );
// }