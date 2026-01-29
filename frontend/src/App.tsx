import './index.css';
import { useEffect, useState } from 'react';
import { useAuth } from './cont/AuthContext';
import { loginUser, getNotifications, updateAttendanceRecord as updateAttendanceRecordAPI, getManageUsers, getStudentsForCustomGoals } from './services/api';
import { LoginCredentials } from './types/auth';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PlatformManagerDashboard } from './components/PlatformManagerDashboard';
import { ManageInstitutionsProfile } from './components/ManageInstitutionsProfile';
import { ViewInstitutionProfile } from './components/ViewInstitutionProfile';
import { UpdateInstitutionProfile } from './components/UpdateInstitutionProfile';
import { CreateInstitutionProfile } from './components/CreateInstitutionProfile';
import { AdminAttendanceRecords } from './components/AdminAttendanceRecords';
import { AdminAttendanceReports } from './components/AdminAttendanceReports';
import { AttendanceReports } from './components/AttendanceReports';
import { UpdateProfile } from './components/UpdateProfile';
import { ViewAdminProfile } from './components/ViewAdminProfile';
import { UpdateAdminProfile } from './components/UpdateAdminProfile';
import { LecturerTimetable } from './components/LecturerTimetable';
import { LecturerAttendanceRecords } from './components/LecturerAttendanceRecords';
import { ManageUserAccounts } from './components/ManageUserAccounts';
import { ManageBiometricProfile } from './components/ManageBiometricProfile';
import { ManageUserProfile } from './components/ManageUserProfile';
import { ManageCustomGoals } from './components/ManageCustomGoals';
import { CreateCustomGoal } from './components/CreateCustomGoal';
import { AdminUpdateUserProfile } from './components/AdminUpdateUserProfile';
import { CreateBiometricProfile } from './components/CreateBiometricProfile';
import { UpdateBiometricProfile } from './components/UpdateBiometricProfile';
import { ManualOverride } from './components/ManualOverride';
import { StudentAttendanceHistory } from './components/StudentAttendanceHistory';
import { StudentTimetable } from './components/StudentTimetable';
import { StudentProfile } from './components/StudentProfile';
import { StudentProgressTracker } from './components/StudentProgressTracker';
import { CreateUser } from './components/CreateUser';
import { UpdateUser } from './components/UpdateUser';
import { Toast } from './components/Toast';
import { ManageModules } from './components/ManageModules';
import { CreateModule } from './components/CreateModule';
import { UpdateModule } from './components/UpdateModule';

// Custom goals API functions
const updateStudentAttendanceMinimum = async (token: string, userId: string, attendanceMinimum: number) => {
  const response = await fetch(`http://localhost:8000/admin/users/${userId}/attendance-minimum`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ attendance_minimum: attendanceMinimum })
  });
  if (!response.ok) {
    throw new Error('Failed to update attendance minimum');
  }
  return response.json();
};

const deleteStudentAttendanceMinimum = async (token: string, userId: string) => {
  const response = await fetch(`http://localhost:8000/admin/users/${userId}/attendance-minimum`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    throw new Error('Failed to delete attendance minimum');
  }
  return response.json();
};
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { AboutSection } from './components/AboutSection';
import { FeaturesSection } from './components/FeaturesSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { Footer } from './components/Footer';
import { AboutPage } from './components/AboutPage';
import { FeaturesPage } from './components/FeaturesPage';
import { ServicesPage } from './components/ServicesPage';
import { RegistrationPage } from './components/RegistrationPage';
import type { AttendanceRecord } from './components/AdminAttendanceRecords';
import { NotificationAlerts } from "./components/NotificationAlerts";
import { NotificationItem } from './types/studentinnards';

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

type LecturerView = 'dashboard' | 'reports' | 'profile' | 'timetable' | 'records';
type AdminView = 'dashboard' | 'manageUsers' | 'manageUserProfile' | 'manageCustomGoals' | 'updateUserProfile' | 'createCustomGoal' | 'manageBiometric' | 'createBiometric' | 'updateBiometric' | 'attendanceRecords' | 'adminReports' | 'manualOverride' | 'createUser' | 'updateUser' | 'viewAdminProfile' | 'updateAdminProfile' | 'manageModules' | 'createModule' | 'updateModule';
type StudentView = 'dashboard' | 'attendanceHistory' | 'timetable' | 'profile' | 'progress';
type PlatformManagerView = 'dashboard' | 'manageInstitutions' | 'viewInstitution' | 'updateInstitution' | 'createInstitution';
type MarketingPage = 'home' | 'about' | 'features' | 'services' | 'registration' | 'login';

export default function App() {
  const { user, login, logout, loading, token } = useAuth();
  const [currentPage, setCurrentPage] = useState<MarketingPage>('home');
  const [lecturerView, setLecturerView] = useState<LecturerView>('dashboard');
  const [adminView, setAdminView] = useState<AdminView>('dashboard');
  const [studentView, setStudentView] = useState<StudentView>('dashboard');
  const [platformManagerView, setPlatformManagerView] = useState<PlatformManagerView>('dashboard');
  const [moduleRefreshTrigger, setModuleRefreshTrigger] = useState<number>(0);
  const [moduleToUpdate, setModuleToUpdate] = useState<any>(null);
  const [selectedInstitutionData, setSelectedInstitutionData] = useState<{
    institutionId: string;
    institutionName: string;
  } | null>(null);
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
  const [attendanceRefreshTrigger, setAttendanceRefreshTrigger] = useState(0);
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [notificationAlerts, setNotificationAlerts] = useState<NotificationItem[]>([]);
  // User goals state - mapping userId to goal percentage (null means deleted/no goal)
  const [userGoals, setUserGoals] = useState<Record<string, number | null>>({
  });

  // Goal metadata state - tracking when and by whom goals were set/updated
  const [goalMetadata, setGoalMetadata] = useState<Record<string, {
    lastUpdated: string;
    setBy: string;
  }>>({
  });

  // User profiles state - comprehensive profile data for all users
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileData>>({
  });

  // Loading state for student data
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Attendance records state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    const fetchAlerts = async () => {
      // Only fetch if user is logged in AND is a student
      if (token && user?.role_name.toLowerCase() === 'student') {
        try {
          const data = await getNotifications(token);
          setNotificationAlerts(data);
        } catch (err) {
          console.error("Failed to load notifications", err);
        }
      }
    };
    fetchAlerts();
  }, [token, user]);

  // Fetch student data for custom goals management
  useEffect(() => {
    const fetchStudentData = async () => {
      if (token && user?.role_name.toLowerCase() === 'admin' && adminView === 'manageCustomGoals') {
        setIsLoadingStudents(true);
        try {
          console.log('Fetching student data for custom goals...');

          // Fetch all students directly from Student table to get all 12 students
          const studentsData = await getStudentsForCustomGoals(token, '', 'All Status');
          console.log('Students data received:', studentsData);

          // Transform the data to match the expected userProfiles format
          const profilesMap: Record<string, any> = {};

          studentsData.forEach((student: any) => {
            profilesMap[student.uuid] = {
              userId: student.uuid,
              name: student.name,
              role: student.role,
              status: student.status,
              email: student.name.toLowerCase().replace(' ', '.') + '@example.com', // Generate email
              dateOfBirth: 'N/A',
              contactNumber: 'N/A',
              address: 'N/A',
              enrollmentDate: 'N/A',
              associatedModules: 'N/A',
              biometricStatus: 'N/A',
              biometricLastUpdated: 'N/A'
            };

            // Set the custom goal to attendanceMinimum from database
            const attendanceGoal = student.attendanceMinimum !== undefined && student.attendanceMinimum !== null && student.attendanceMinimum > 0
              ? student.attendanceMinimum
              : null;

            setUserGoals(prev => ({ ...prev, [student.uuid]: attendanceGoal }));
          });

          setUserProfiles(profilesMap);

        } catch (err) {
          console.error('Failed to load student data:', err);
          showToast('Failed to load student data');
        } finally {
          setIsLoadingStudents(false);
        }
      }
    };

    fetchStudentData();
  }, [token, user, adminView]);

  // Admin profile data state
  const [adminProfileData, setAdminProfileData] = useState({
    name: "John Smith",
    email: "john.smith@uow.edu.au",
    contactNumber: "+61 2 4221 3456",
    address: "123 Innovation Campus\nSquires Way\nNorth Wollongong NSW 2500\nAustralia",
    emergencyContactName: "Jane Smith",
    emergencyRelationship: "Spouse",
    emergencyContactNumber: "+61 412 345 678",
  });

  // Institutions state
  const [institutions, setInstitutions] = useState<Array<{
    id: string;
    name: string;
    status: string;
    address?: string;
    adminFullName?: string;
    adminEmail?: string;
    adminPhone?: string;
    tempPassword?: string;
  }>>([
    {
      id: "INS001",
      name: "University of Wollongong",
      status: "Active",
    },
    {
      id: "INS002",
      name: "University of Sydney",
      status: "Active",
    },
    {
      id: "INS003",
      name: "University of New South Wales",
      status: "Active",
    },
    {
      id: "INS004",
      name: "Monash University",
      status: "Active",
    },
    {
      id: "INS005",
      name: "University of Melbourne",
      status: "Inactive",
    },
    {
      id: "INS006",
      name: "Australian National University",
      status: "Active",
    },
    {
      id: "INS007",
      name: "University of Queensland",
      status: "Active",
    },
  ]);

  // Function to show toast messages
  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const hideToast = () => {
    setToastMessage(null);
  };

  // Function to update attendance record
  const updateAttendanceRecord = async (userId: string, date: string, newStatus: string, reason?: string, adminNotes?: string, lessonId?: number) => {
    try {
      if (!token) {
        throw new Error("No authentication token available");
      }

      // Call the API to update the record in the database
      await updateAttendanceRecordAPI(token, {
        user_id: userId,
        date: date,
        new_status: newStatus,
        reason: reason,
        admin_notes: adminNotes,
        lesson_id: lessonId
      });

      // Update the local state for immediate UI feedback
      setAttendanceRecords(prev =>
        prev.map(record =>
          record.userId === userId && record.date === date
            ? { ...record, status: newStatus }
            : record
        )
      );

      // Trigger refresh of attendance records in AdminAttendanceRecords component
      // This will be handled by the component's useEffect when we navigate back

    } catch (error) {
      console.error("Failed to update attendance record:", error);
      throw error; // Re-throw so ManualOverride component can handle the error
    }
  };

  // Login Logic
  const handleLogin = async (creds: LoginCredentials, _selectedRole: string) => {
    try {
      // Call the API
      const data = await loginUser(creds);

      // Optional: Check Role Mismatch
      // Ensure the backend role matches the tab the user selected
      //if (data.role_name.toLowerCase() !== selectedRole.toLowerCase()) {
      // throw new Error(`Account found, but you are a ${data.role_name}. Please select the ${data.role_name} tab.`);
      //}

      // Save to Context (Redirects automatically)
      login(data);

      // Reset views to default
      setLecturerView('dashboard');
      setAdminView('dashboard');
      setStudentView('dashboard');
      setPlatformManagerView('dashboard');


    } catch (error: any) {
      console.error("Login Error:", error);
      alert(error.message || "Login failed");
    }
  };

  // NEW LOGOUT LOGIC
  const handleLogout = () => {

    // Run the Context logic (Server call + Local cleanup)
    logout();

    // Reset your local view states (Clean slate for next user)
    setLecturerView('dashboard');
    setAdminView('dashboard');
    setStudentView('dashboard');
    setPlatformManagerView('dashboard');
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

  const handleNavigateToManageCustomGoals = () => {
    setAdminView('manageCustomGoals');
  };

  const handleNavigateToManageModules = () => {
    setAdminView('manageModules');
  };

  const handleNavigateToCreateModule = () => {
    setAdminView('createModule');
  };

  const handleNavigateToUpdateModule = (moduleData: any) => {
    setModuleToUpdate(moduleData);
    setAdminView('updateModule');
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

  const handleNavigateToCreateCustomGoalFromManageGoals = (userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  }) => {
    setSelectedCustomGoalUserData(userData);
    setAdminView('createCustomGoal');
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

  const handleBackToManageCustomGoals = () => {
    setAdminView('manageCustomGoals');
  };

  const handleBackFromCustomGoal = () => {
  };

  const handleUpdateUserGoal = async (userId: string, goal: number) => {
    try {
      // Update in database
      await updateStudentAttendanceMinimum(token!, userId, goal);

      // Update frontend state
      setUserGoals(prev => ({
        ...prev,
        [userId]: goal
      }));

      // Update metadata when goal is created/updated
      const now = new Date();
      const dateTime = now.toLocaleString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      setGoalMetadata(prev => ({
        ...prev,
        [userId]: {
          lastUpdated: dateTime,
          setBy: user?.name || "Admin User"
        }
      }));

      const studentName = userProfiles[userId]?.name || 'student';
      showToast(`Goal ${goal}% set successfully for ${studentName}`);
    } catch (error) {
      console.error('Failed to update goal:', error);
      showToast('Failed to update goal. Please try again.');
    }
  };
  const handleDismissAlert = (alertId: string) => {
    setNotificationAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };
  const handleDeleteUserGoal = async (userId: string, userName?: string) => {
    try {
      // Delete from database
      await deleteStudentAttendanceMinimum(token!, userId);

      // Update frontend state
      setUserGoals(prev => ({
        ...prev,
        [userId]: null
      }));

      // Remove metadata for deleted goal
      setGoalMetadata(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      const studentName = userName || userProfiles[userId]?.name || 'student';
      showToast(`Goal removed successfully for ${studentName}`);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      showToast('Failed to remove goal. Please try again.');
    }
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
    // Trigger refresh of attendance records
    setAttendanceRefreshTrigger(prev => {
      const newValue = prev + 1;
      return newValue;
    });
  };

  const handleNavigateToAdminProfile = () => {
    setAdminView('viewAdminProfile');
  };

  const handleNavigateToUpdateAdminProfile = () => {
    setAdminView('updateAdminProfile');
  };

  const handleBackToViewAdminProfile = () => {
    setAdminView('viewAdminProfile');
  };

  const handleSaveAdminProfile = (profileData: {
    name: string;
    email: string;
    contactNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyRelationship: string;
    emergencyContactNumber: string;
  }) => {
    // Update the admin profile state
    setAdminProfileData(profileData);
    showToast('Profile updated successfully!');
    setAdminView('viewAdminProfile');
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

  const handleNavigateToInstitutionsProfile = () => {
    setPlatformManagerView('manageInstitutions');
  };

  const handleBackToPlatformManagerDashboard = () => {
    setPlatformManagerView('dashboard');
  };

  const handleNavigateToCreateProfile = () => {
    setPlatformManagerView('createInstitution');
  };

  const handleCreateInstitution = (institutionData: {
    institutionName: string;
    address: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    tempPassword: string;
  }) => {
    // Generate new institution ID
    const newId = `INS${String(institutions.length + 1).padStart(3, '0')}`;

    // Add new institution to the list
    const newInstitution = {
      id: newId,
      name: institutionData.institutionName,
      status: "Active",
      address: institutionData.address,
      adminFullName: institutionData.fullName,
      adminEmail: institutionData.email,
      adminPhone: institutionData.phoneNumber,
      tempPassword: institutionData.tempPassword,
    };

    setInstitutions(prev => [...prev, newInstitution]);

    // Show success toast
    showToast(`Institution "${institutionData.institutionName}" created successfully!`);

    // Navigate back to manage institutions
    setPlatformManagerView('manageInstitutions');
  };

  const handleNavigateToViewInstitution = (institutionData: {
    institutionId: string;
    institutionName: string;
  }) => {
    setSelectedInstitutionData(institutionData);
    setPlatformManagerView('viewInstitution');
  };

  const handleBackToManageInstitutions = () => {
    setPlatformManagerView('manageInstitutions');
  };

  const handleNavigateToEditInstitution = () => {
    setPlatformManagerView('updateInstitution');
  };

  const handleBackToViewInstitution = () => {
    setPlatformManagerView('viewInstitution');
  };
  const handleOpenNotifications = () => {
    setIsNotificationOpen(true);
  };
  const handleUpdateInstitution = (updatedData: {
    institutionId: string;
    institutionName: string;
    institutionType?: string;
    address?: string;
    status?: "Active" | "Inactive";
    adminFullName?: string;
    adminEmail?: string;
    adminPhone?: string;
  }) => {
    // Update the selected institution data
    setSelectedInstitutionData({
      institutionId: updatedData.institutionId,
      institutionName: updatedData.institutionName,
    });
    // In a real app, this would make an API call to update the backend
    console.log("Institution updated in App.tsx:", updatedData);
  };

  // Make setCurrentPage available globally for navigation from marketing website Header
  (window as any).navigateTo = setCurrentPage;

  // Show marketing website pages if no user is logged in
  if (!user) {
    // Marketing page - About
    if (currentPage === 'about') {
      return <AboutPage />;
    }

    // Marketing page - Features
    if (currentPage === 'features') {
      return <FeaturesPage />;
    }

    // Marketing page - Services
    if (currentPage === 'services') {
      return <ServicesPage />;
    }

    // Marketing page - Registration
    if (currentPage === 'registration') {
      return <RegistrationPage />;
    }

    // Marketing page - Login
    if (currentPage === 'login') {
      return <LoginPage onLogin={handleLogin} />;
    }

    // Marketing page - Home (default)
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

  // Normalize to lowercase to match strict comparisons
  const userRole = user.role_name.toLowerCase();


  if (loading) {
    return <div className="flex min-h-screen justify-center items-center">Loading...</div>;
  }
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
          onOpenNotifications={handleOpenNotifications}
        />
      )}
      {userRole === 'student' && studentView === 'attendanceHistory' && (
        <StudentAttendanceHistory
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
          onOpenNotifications={handleOpenNotifications}
        />
      )}
      {userRole === 'student' && studentView === 'timetable' && (
        <StudentTimetable
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
          onOpenNotifications={handleOpenNotifications}
        />
      )}
      {userRole === 'student' && studentView === 'profile' && (
        <StudentProfile
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
          onOpenNotifications={handleOpenNotifications}
        />
      )}
      {userRole === 'student' && studentView === 'progress' && (
        <StudentProgressTracker
          onLogout={handleLogout}
          onBack={handleBackToStudentDashboard}
          onNavigateToProfile={handleNavigateToStudentProfile}
          onOpenNotifications={handleOpenNotifications}
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
          onNavigateToProfile={handleNavigateToProfile}
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
          onNavigateToManageCustomGoals={handleNavigateToManageCustomGoals}
          onNavigateToBiometricProfile={handleNavigateToBiometricProfile}
          onNavigateToAttendanceRecords={handleNavigateToAdminAttendanceRecords}
          onNavigateToReports={handleNavigateToAdminReports}
          onNavigateToProfile={handleNavigateToAdminProfile}
          onNavigateToManageModules={handleNavigateToManageModules}
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
          showToast={showToast}
        />
      )}
      {userRole === 'admin' && adminView === 'manageUserProfile' && (
        <ManageUserProfile
          onLogout={handleLogout}
          onBack={handleBackToAdminDashboard}
          onNavigateToCreateCustomGoal={handleNavigateToCreateCustomGoalFromManageGoals}
          onNavigateToUpdateUserProfile={handleNavigateToUpdateUserProfile}
          userGoals={userGoals}
          userProfiles={userProfiles}
        />
      )}
      {userRole === 'admin' && adminView === 'manageCustomGoals' && (
        <ManageCustomGoals
          onBack={handleBackToAdminDashboard}
          onCreateGoal={handleUpdateUserGoal}
          onUpdateGoal={handleUpdateUserGoal}
          onDeleteGoal={handleDeleteUserGoal}
          showToast={showToast}
          userGoals={userGoals}
          userProfiles={userProfiles}
          goalMetadata={goalMetadata}
          loading={isLoadingStudents}
        />
      )}
      {userRole === 'admin' && adminView === 'manageModules' && (
        <ManageModules
          onBack={handleBackToAdminDashboard}
          onLogout={handleLogout}
          onNavigateToProfile={handleNavigateToAdminProfile}
          onNavigateToCreateModule={handleNavigateToCreateModule}
          onNavigateToUpdateModule={handleNavigateToUpdateModule}
          refreshTrigger={moduleRefreshTrigger}
        />
      )}
      {userRole === 'admin' && adminView === 'createModule' && (
        <CreateModule
          onBack={() => {
            setModuleRefreshTrigger(prev => prev + 1);
            setAdminView('manageModules');
          }}
          onLogout={handleLogout}
          onNavigateToProfile={handleNavigateToAdminProfile}
        />
      )}

      {userRole === 'admin' && adminView === 'updateModule' && moduleToUpdate && (
        <UpdateModule
          moduleData={moduleToUpdate}
          onBack={() => {
            setModuleRefreshTrigger(prev => prev + 1);
            setAdminView('manageModules');
            setModuleToUpdate(null);
          }}
          onLogout={handleLogout}
          onNavigateToProfile={handleNavigateToAdminProfile}
        />
      )}
      {userRole === 'admin' && adminView === 'updateUserProfile' && selectedBiometricUserData && (
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
      {userRole === 'admin' && adminView === 'createCustomGoal' && selectedCustomGoalUserData && (
        <CreateCustomGoal
          onLogout={handleLogout}
          onBack={handleBackFromCustomGoal}
          userData={selectedCustomGoalUserData}
          onCreateGoal={handleUpdateUserGoal}
          showToast={showToast}
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
          showToast={showToast}
        />
      )}
      {userRole === 'admin' && adminView === 'attendanceRecords' && (
        <AdminAttendanceRecords
          onLogout={handleLogout}
          onBack={handleBackToAdminDashboard}
          onNavigateToProfile={handleNavigateToAdminProfile}
          onNavigateToManualOverride={handleNavigateToManualOverride}
          attendanceRecords={attendanceRecords}
          updateAttendanceRecord={updateAttendanceRecord}
          refreshTrigger={attendanceRefreshTrigger}
        />
      )}
      {userRole === 'admin' && adminView === 'manualOverride' && selectedStudentData && (
        <ManualOverride
          onLogout={handleLogout}
          onBack={handleBackToAttendanceRecords}
          studentData={selectedStudentData}
          showToast={showToast}
          updateAttendanceRecord={updateAttendanceRecord}
        />
      )}
      {userRole === 'admin' && adminView === 'adminReports' && (
        <AdminAttendanceReports
          onNavigateToProfile={handleNavigateToAdminProfile}
          onLogout={handleLogout}
          onBack={handleBackToAdminDashboard} />
      )}
      {userRole === 'admin' && adminView === 'viewAdminProfile' && (
        <ViewAdminProfile
          onLogout={handleLogout}
          onBack={handleBackToAdminDashboard}
          onUpdateProfile={handleNavigateToUpdateAdminProfile}
          onSave={handleSaveAdminProfile}
          adminData={adminProfileData}
        />
      )}
      {userRole === 'admin' && adminView === 'updateAdminProfile' && (
        <UpdateAdminProfile
          onLogout={handleLogout}
          onBack={handleBackToViewAdminProfile}
          onSave={handleSaveAdminProfile}
          adminData={adminProfileData}
        />
      )}
      {userRole === 'pmanager' && platformManagerView === 'dashboard' && (
        <PlatformManagerDashboard
          onLogout={handleLogout}
          onNavigateToInstitutionsProfile={handleNavigateToInstitutionsProfile}
        />
      )}
      {userRole === 'pmanager' && platformManagerView === 'manageInstitutions' && (
        <ManageInstitutionsProfile
          onLogout={handleLogout}
          onBack={handleBackToPlatformManagerDashboard}
          onCreateProfile={handleNavigateToCreateProfile}
          onViewProfile={handleNavigateToViewInstitution}
        />
      )}
      {userRole === 'pmanager' && platformManagerView === 'viewInstitution' && selectedInstitutionData && (
        <ViewInstitutionProfile
          onLogout={handleLogout}
          onBack={handleBackToManageInstitutions}
          onEditProfile={handleNavigateToEditInstitution}
          institutionData={selectedInstitutionData}
        />
      )}
      {userRole === 'pmanager' && platformManagerView === 'updateInstitution' && selectedInstitutionData && (
        <UpdateInstitutionProfile
          onLogout={handleLogout}
          onBack={handleBackToViewInstitution}
          institutionData={selectedInstitutionData}
        />
      )}
      {userRole === 'pmanager' && platformManagerView === 'createInstitution' && (
        <CreateInstitutionProfile
          onLogout={handleLogout}
          onBack={handleBackToManageInstitutions}
          onCreate={handleCreateInstitution}
        />
      )}
      <Toast message={toastMessage} onClose={hideToast} />
      <NotificationAlerts
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        alerts={notificationAlerts}
        onDismissAlert={handleDismissAlert}
      />
    </div>
  );
}