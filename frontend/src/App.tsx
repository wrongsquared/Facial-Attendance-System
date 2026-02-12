import './index.css';
import { useEffect, useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './cont/AuthContext';
import {
  loginUser,
  getNotifications,
  updateAttendanceRecord as updateAttendanceRecordAPI, getStudentsForCustomGoals
} from './services/api';
import { LoginCredentials } from './types/auth';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { LecturerDashboard } from './components/LecturerDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PlatformManagerDashboard } from './components/PlatformManagerDashboard';
import { ManageInstitutionsProfile } from './components/ManageInstitutionsProfile';
import { AttendanceReports } from './components/AttendanceReports';
import { UpdateProfile } from './components/UpdateProfile';
import { LecturerTimetable } from './components/LecturerTimetable';
import { LecturerAttendanceRecords } from './components/LecturerAttendanceRecords';
import { ManageUserAccounts } from './components/ManageUserAccounts';
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
import { EnrollStudent } from './components/EnrollStudent';
import { ManageLessons } from './components/ManageLessons';
import { CreateLesson } from './components/CreateLesson';
import { UpdateLesson } from './components/UpdateLesson';
import { ManageCourses } from './components/ManageCourses';
import { CreateCourse } from './components/CreateCourse';
import { UpdateCourse } from './components/UpdateCourse';
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
import { NotificationAlerts } from "./components/NotificationAlerts";
import { ManageUserProfile } from './components/ManageUserProfile';
import { AdminAttendanceRecords, AttendanceRecord } from './components/AdminAttendanceRecords';
import { UpdateAdminProfile } from './components/UpdateAdminProfile';
import { ViewAdminProfile } from './components/ViewAdminProfile';
import { AdminAttendanceReports } from './components/AdminAttendanceReports';
import { ManageCustomGoals } from './components/ManageCustomGoals';
import { CreateCustomGoal } from './components/CreateCustomGoal';
import { AdminUpdateUserProfile } from './components/AdminUpdateUserProfile';
import { ManualOverride } from './components/ManualOverride';


const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, token, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen justify-center items-center">Loading...</div>;
  if (!token || !user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role_name.toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
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

function AppContent() {
  const { user, login, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationAlerts, setNotificationAlerts] = useState<any[]>([]);

  const [selectedInstitutionData, setSelectedInstitutionData] = useState<any>(null);
  const [moduleToUpdate, setModuleToUpdate] = useState<any>(null);
  const [moduleToEnroll, setModuleToEnroll] = useState<any>(null);
  const [selectedStudentData, setSelectedStudentData] = useState<{
    userId: string;
    studentName: string;
    date: string;
    status: string;
    lessonId: number;
  } | null>(null);
  const showToast = (msg: string) => setToastMessage(msg);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [attendanceRefreshTrigger, setAttendanceRefreshTrigger] = useState(0);
  const [userGoals, setUserGoals] = useState<Record<string, number | null>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const [goalMetadata, setGoalMetadata] = useState<Record<string, any>>({});
  const [lessonRefreshTrigger, setLessonRefreshTrigger] = useState<number>(0);
  const [courseRefreshTrigger, setCourseRefreshTrigger] = useState<number>(0);
  const [lessonToUpdate, setLessonToUpdate] = useState<any>(null);
  const [courseToUpdate, setCourseToUpdate] = useState<any>(null);
  const [selectedCustomGoalUserData, setSelectedCustomGoalUserData] = useState<{
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  } | null>(null);
  const [adminProfileData, setAdminProfileData] = useState({
    name: "",
    email: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyRelationship: "",
    emergencyContactNumber: "",
  });

  const handleSaveAdminProfile = (profileData: any) => {
    setAdminProfileData(profileData);
    showToast('Profile updated successfully!');
    navigate('/admin/profile'); // Navigate back to the view page
  };
  const [selectedBiometricUserData, setSelectedBiometricUserData] = useState<{
    userId: string;
    name: string;
    role: string;
  } | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<{
    uuid: string;
    name: string;
    role: string;
    status: string;
  } | null>(null);
  const updateAttendanceRecord = async (
    userId: string,
    date: string,
    newStatus: string,
    reason?: string,
    adminNotes?: string,
    lessonId?: number
  ) => {
    try {
      if (!token) throw new Error("No authentication token available");

      await updateAttendanceRecordAPI(token, {
        user_id: userId,
        date: date,
        new_status: newStatus,
        reason: reason,
        admin_notes: adminNotes,
        lesson_id: lessonId
      });

      setAttendanceRecords(prev =>
        prev.map(record =>
          record.userId === userId && record.date === date
            ? { ...record, status: newStatus }
            : record
        )
      );
      setAttendanceRefreshTrigger(prev => prev + 1);

    } catch (error) {
      console.error("Failed to update attendance record:", error);
      throw error;
    }
  };
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  const handleUpdateUserProfile = (userId: string, profileData: any) => {
    setUserProfiles(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...profileData,
        userId,
      }
    }));
    showToast("Profile updated successfully");
  };
  const handleLogin = async (creds: any) => {
    try {
      const data = await loginUser(creds);
      login(data);
      // Redirect based on role
      const role = data.role_name.toLowerCase();
      if (role === 'student') navigate('/student');
      else if (role === 'lecturer') navigate('/lecturer');
      else if (role === 'admin') navigate('/admin');
      else if (role === 'pmanager') navigate('/pmanager');
    } catch (err: any) {
      alert(err.message || "Login failed");
    }
  };
  const handleUpdateUserGoal = async (userId: string, goal: number) => {
    try {
      if (!token) return;

      // 1. Call the API (ensure updateStudentAttendanceMinimum is imported)
      await updateStudentAttendanceMinimum(token, userId, goal);

      // 2. Update the local goals list
      setUserGoals(prev => ({
        ...prev,
        [userId]: goal
      }));

      // 3. Update metadata (to show who set the goal and when)
      const now = new Date();
      const dateTime = now.toLocaleString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      setGoalMetadata(prev => ({
        ...prev,
        [userId]: {
          lastUpdated: dateTime,
          setBy: user?.name || "Admin"
        }
      }));

      showToast(`Goal set to ${goal}% successfully`);
    } catch (error) {
      console.error('Failed to update goal:', error);
      showToast('Failed to update goal. Please try again.');
    }
  };

  const handleDeleteUserGoal = async (userId: string) => {
    try {
      if (!token) return;

      // 1. Call the API (ensure deleteStudentAttendanceMinimum is imported)
      await deleteStudentAttendanceMinimum(token, userId);

      // 2. Clear the local state
      setUserGoals(prev => ({
        ...prev,
        [userId]: null
      }));

      // 3. Remove metadata
      setGoalMetadata(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      showToast('Goal removed successfully');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      showToast('Failed to remove goal.');
    }
  };

  // Load students data for custom goals management
  useEffect(() => {
    const loadStudentsForCustomGoals = async () => {
      if (!token || !user || user.role_name.toLowerCase() !== 'admin') return;

      try {
        setIsLoadingStudents(true);
        const studentsData = await getStudentsForCustomGoals(token, "", "");

        // Transform the data into userProfiles and userGoals format
        const profilesMap: Record<string, any> = {};
        const goalsMap: Record<string, number | null> = {};

        studentsData.forEach((student: any) => {
          profilesMap[student.uuid] = {
            userId: student.uuid,
            name: student.name,
            role: student.role,
            status: student.status,
            email: '', // Not provided by the API
            dateOfBirth: '',
            contactNumber: '',
            address: '',
            enrollmentDate: '',
            associatedModules: '',
            biometricStatus: '',
            biometricLastUpdated: ''
          };
          goalsMap[student.uuid] = student.attendanceMinimum || null;
        });

        setUserProfiles(profilesMap);
        setUserGoals(goalsMap);
      } catch (error) {
        console.error('Failed to load students for custom goals:', error);
        showToast('Failed to load students data');
      } finally {
        setIsLoadingStudents(false);
      }
    };

    loadStudentsForCustomGoals();
  }, [token, user]);

  return (
    <div className="flex flex-col min-h-screen">
      <Routes>
        <Route path="/" element={!token ? <LandingPage /> : <Navigate to={`/${user?.role_name.toLowerCase()}`} />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/registration" element={<RegistrationPage />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />

        {/* --- STUDENT ROUTES --- */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard
            onLogout={handleLogout}
            onNavigateToAttendanceHistory={() => navigate('/student/history')}
            onNavigateToTimetable={() => navigate('/student/timetable')}
            onNavigateToProfile={() => navigate('/student/profile')}
            onNavigateToProgress={() => navigate('/student/progress')}
            onOpenNotifications={() => setIsNotificationOpen(true)} />
        </ProtectedRoute>} />
        <Route path="/student/history" element={<ProtectedRoute allowedRoles={['student']}>
          <StudentAttendanceHistory
            onLogout={handleLogout}
            onBack={() => navigate('/student')}
            onNavigateToProfile={() => navigate('/student/profile')}
            onOpenNotifications={() => setIsNotificationOpen(true)} />
        </ProtectedRoute>} />
        <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}>
          <StudentTimetable
            onLogout={handleLogout}
            onBack={() => navigate('/student')}
            onNavigateToProfile={() => navigate('/student/profile')}
            onOpenNotifications={() => setIsNotificationOpen(true)} />
        </ProtectedRoute>} />
        <Route path="/student/progress" element={<ProtectedRoute allowedRoles={['student']}>
          <StudentProgressTracker
            onLogout={handleLogout}
            onBack={() => navigate('/student')}
            onNavigateToProfile={() => navigate('/student/profile')}
            onOpenNotifications={() => setIsNotificationOpen(true)} />
        </ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile onLogout={handleLogout} onBack={() => navigate('/student')} onNavigateToProfile={() => navigate('/student/profile')} onOpenNotifications={() => setIsNotificationOpen(true)} /></ProtectedRoute>} />
        {/* Lecturer Routes */}
        <Route path="/lecturer" element={<ProtectedRoute allowedRoles={['lecturer']}>
          <LecturerDashboard
            onLogout={handleLogout}
            onNavigateToReports={() => navigate('/lecturer/reports')}
            onNavigateToProfile={() => navigate('/lecturer/profile')}
            onNavigateToTimetable={() => navigate('/lecturer/timetable')}
            onNavigateToRecords={() => navigate('/lecturer/records')} />
        </ProtectedRoute>} />
        <Route path="/lecturer/reports" element={<ProtectedRoute allowedRoles={['lecturer']}>
          <AttendanceReports
            onLogout={handleLogout}
            onBack={() => navigate('/lecturer')}
            onNavigateToProfile={() => navigate('/lecturer/profile')} />
        </ProtectedRoute>} />
        <Route path="/lecturer/profile" element={<ProtectedRoute allowedRoles={['lecturer']}>
          <UpdateProfile
            onLogout={handleLogout}
            onBack={() => navigate('/lecturer')}
            onNavigateToProfile={() => navigate('/lecturer/profile')} />
        </ProtectedRoute>} />
        <Route path="/lecturer/timetable" element={<ProtectedRoute allowedRoles={['lecturer']}>
          <LecturerTimetable
            onLogout={handleLogout}
            onBack={() => navigate('/lecturer')}
            onNavigateToProfile={() => navigate('/lecturer/profile')} />
        </ProtectedRoute>} />
        <Route path="/lecturer/records" element={<ProtectedRoute allowedRoles={['lecturer']}>
          <LecturerAttendanceRecords
            onLogout={handleLogout}
            onBack={() => navigate('/lecturer')}
            onNavigateToProfile={() => navigate('/lecturer/profile')}
          />
        </ProtectedRoute>
        }
        />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard
            onLogout={handleLogout}
            onNavigateToManageUsers={() => navigate('/admin/users')}
            onNavigateToManageModules={() => navigate('/admin/modules')}
            onNavigateToManageLessons={() => navigate('/admin/lessons')}
            onNavigateToManageUserProfile={() => navigate('/admin/user-profiles')}
            onNavigateToManageCustomGoals={() => navigate('/admin/goals')}
            onNavigateToBiometricProfile={() => navigate('/admin/biometrics')}
            onNavigateToManageCourses={() => navigate('/admin/courses')}
            onNavigateToAttendanceRecords={() => navigate('/admin/records')}
            onNavigateToReports={() => navigate('/admin/reports')}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}>
          <ManageUserAccounts
            onLogout={handleLogout}
            onBack={() => navigate('/admin')}
            onCreateUser={() => navigate('/admin/users/create')}
            onUpdateUser={(data) => { setSelectedUserData(data); navigate('/admin/users/update'); }}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}>
          <CreateUser
            onLogout={handleLogout}
            onBack={() => navigate('/admin/users')}
            onCreateSuccess={() => navigate('/admin/users')}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/users/update" element={<ProtectedRoute allowedRoles={['admin']}>
          {selectedUserData ? (
            <UpdateUser
              userData={selectedUserData}
              onLogout={handleLogout}
              onBack={() => navigate('/admin/users')}
              onUpdateSuccess={() => navigate('/admin/users')}
              onNavigateToProfile={() => navigate('/admin/profile')}
              showToast={showToast}
            />
          ) : (
            <Navigate to="/admin/users" replace />
          )}
        </ProtectedRoute>
        }
        />

        <Route path="/admin/records" element={<ProtectedRoute allowedRoles={['admin']}>
          <AdminAttendanceRecords onLogout={handleLogout} onBack={() => navigate('/admin')}
            onNavigateToProfile={() => navigate('/admin/profile')}
            onNavigateToManualOverride={(data) => { setSelectedStudentData(data); navigate('/admin/records/override'); }}
            attendanceRecords={attendanceRecords}
            updateAttendanceRecord={updateAttendanceRecord}
            refreshTrigger={attendanceRefreshTrigger} />
        </ProtectedRoute>} />

        <Route path="/admin/records/override" element={<ProtectedRoute allowedRoles={['admin']}>
          {selectedStudentData ? (
            <ManualOverride
              onLogout={handleLogout}
              onBack={() => navigate('/admin/records')}
              studentData={selectedStudentData}
              showToast={showToast}
              updateAttendanceRecord={updateAttendanceRecord}
            />
          ) : (
            /* If someone refreshes and the state is gone, redirect them back */
            <Navigate to="/admin/records" replace />
          )}
        </ProtectedRoute>
        }
        />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}>
          <AdminAttendanceReports
            onNavigateToProfile={() => navigate('/admin/profile')}
            onLogout={handleLogout}
            onBack={() => navigate('/admin')} />
        </ProtectedRoute>} />
        <Route path="/admin/user-profiles" element={<ProtectedRoute allowedRoles={['admin']}>
          <ManageUserProfile
            onLogout={handleLogout}
            onBack={() => navigate('/admin')}
            onNavigateToCreateCustomGoal={(data) => { setSelectedCustomGoalUserData(data); navigate('/admin/goals/create'); }}
            onNavigateToUpdateUserProfile={(data) => { setSelectedBiometricUserData({ userId: data.uuid, name: data.name, role: data.role }); navigate('/admin/user-profiles/update'); }}
            userGoals={userGoals}
            userProfiles={userProfiles} />
        </ProtectedRoute>} />
        <Route path="/admin/user-profiles/update" element={<ProtectedRoute allowedRoles={['admin']}>
          {selectedBiometricUserData ? (
            <AdminUpdateUserProfile
              onLogout={handleLogout}
              onBack={() => navigate('/admin/user-profiles')}
              onNavigateToBiometricProfile={() => navigate('/admin/biometrics')}
              userData={{
                uuid: selectedBiometricUserData.userId,
                name: selectedBiometricUserData.name,
                role: selectedBiometricUserData.role
              }}
              userProfileData={userProfiles[selectedBiometricUserData.userId]}
              onUpdateProfile={handleUpdateUserProfile}
              showToast={showToast} />
          ) : (
            <Navigate to="/admin/user-profiles" replace />
          )}
        </ProtectedRoute>} />

        <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}>
          <CreateUser
            onLogout={handleLogout}
            onBack={() => navigate('/admin/users')}
            onCreateSuccess={() => navigate('/admin/users')}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/users/update" element={<ProtectedRoute allowedRoles={['admin']}>
          {selectedBiometricUserData ? (
            <AdminUpdateUserProfile
              onLogout={handleLogout}
              onBack={() => navigate('/admin/user-profiles')}
              onNavigateToBiometricProfile={() => navigate('/admin/biometrics')}
              userData={{
                uuid: selectedBiometricUserData.userId,
                name: selectedBiometricUserData.name,
                role: selectedBiometricUserData.role
              }}
              userProfileData={userProfiles[selectedBiometricUserData.userId]}
              onUpdateProfile={handleUpdateUserProfile}
              showToast={showToast}
            />
          ) : (
            <Navigate to="/admin/user-profiles" replace />
          )}
        </ProtectedRoute>} />
        <Route path="/admin/lessons" element={<ProtectedRoute allowedRoles={['admin']}>
          <ManageLessons
            onBack={() => navigate('/admin')}
            onLogout={handleLogout}
            onNavigateToProfile={() => navigate('/admin/profile')}
            onNavigateToCreateLesson={() => navigate('/admin/lessons/create')}
            onNavigateToUpdateLesson={(data) => { setLessonToUpdate(data); navigate('/admin/lessons/update'); }}
            refreshTrigger={lessonRefreshTrigger} />
        </ProtectedRoute>} />
        <Route path="/admin/lessons/create" element={<ProtectedRoute allowedRoles={['admin']}>
          <CreateLesson
            onBack={() => {
              setLessonRefreshTrigger(prev => prev + 1);
              navigate('/admin/lessons')
            }}
            onLogout={handleLogout}

            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/lessons/update" element={<ProtectedRoute allowedRoles={['admin']}>
          <UpdateLesson
            lessonData={lessonToUpdate}
            onBack={() => {
              setLessonRefreshTrigger(prev => prev + 1);
              setLessonToUpdate(null);
              navigate('/admin/lessons')
            }}
            onLogout={handleLogout}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />

        <Route path="/admin/courses" element={<ProtectedRoute allowedRoles={['admin']}>
          <ManageCourses onBack={() => navigate('/admin')}
            onLogout={handleLogout}
            onNavigateToProfile={() => navigate('/admin/profile')}
            onNavigateToCreateCourse={() => navigate('/admin/courses/create')}
            onNavigateToUpdateCourse={(data) => { setCourseToUpdate(data); navigate('/admin/courses/update'); }}
            refreshTrigger={courseRefreshTrigger} />
        </ProtectedRoute>} />
        <Route path="/admin/courses/create" element={<ProtectedRoute allowedRoles={['admin']}>
          <CreateCourse
            onBack={() => navigate('/admin/courses')}
            onLogout={handleLogout}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/courses/update" element={<ProtectedRoute allowedRoles={['admin']}>
          <UpdateCourse
            courseData={courseToUpdate}
            onBack={() => navigate('/admin/courses')}
            onLogout={handleLogout}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/modules" element={<ProtectedRoute allowedRoles={['admin']}>
          <ManageModules
            onBack={() => navigate('/admin')}
            onNavigateToProfile={() => navigate('/admin/profile')}
            onNavigateToCreateModule={() => navigate('/admin/modules/create')}
            onNavigateToUpdateModule={(data) => { setModuleToUpdate(data); navigate('/admin/modules/update'); }}
            onNavigateToEnrollStudent={(data) => { setModuleToEnroll(data); navigate('/admin/modules/enroll'); }} />
        </ProtectedRoute>} />
        <Route path="/admin/modules/create" element={<ProtectedRoute allowedRoles={['admin']}>
          <CreateModule
            onLogout={handleLogout}
            onBack={() => navigate('/admin/modules')}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/modules/update" element={<ProtectedRoute allowedRoles={['admin']}>
          <UpdateModule
            moduleData={moduleToUpdate}
            onBack={() => navigate('/admin/modules')}
            onNavigateToProfile={() => navigate('/admin/profile')} />
        </ProtectedRoute>} />
        <Route path="/admin/modules/enroll" element={<ProtectedRoute allowedRoles={['admin']}>
          {moduleToEnroll ? (
            <EnrollStudent
              moduleData={moduleToEnroll}
              onBack={() => navigate('/admin/modules')}
              onNavigateToProfile={() => navigate('/admin/profile')} />
          ) : (
            <Navigate to="/admin/modules" replace />
          )}
        </ProtectedRoute>} />
        <Route path="/admin/goals" element={<ProtectedRoute allowedRoles={['admin']}>
          <ManageCustomGoals
            onBack={() => navigate('/admin')}
            onNavigateToProfile={() => navigate('/admin/profile')}
            onCreateGoal={handleUpdateUserGoal}
            onUpdateGoal={handleUpdateUserGoal}
            onDeleteGoal={handleDeleteUserGoal}
            showToast={showToast}
            userGoals={userGoals}
            userProfiles={userProfiles}
            goalMetadata={goalMetadata}
            loading={isLoadingStudents} />
        </ProtectedRoute>} />
        <Route path="/admin/goals/create" element={<ProtectedRoute allowedRoles={['admin']}>
          {selectedCustomGoalUserData ? (
            <CreateCustomGoal
              onLogout={handleLogout}
              onBack={() => navigate('/admin/goals')}
              userData={selectedCustomGoalUserData}
              onCreateGoal={handleUpdateUserGoal}
              showToast={showToast}
            />
          ) : (
            <Navigate to="/admin/goals" replace />
          )}
        </ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute allowedRoles={['admin']}>
          <ViewAdminProfile
            onBack={() => navigate('/admin')}
            onNavigateToProfile={() => navigate('/admin/profile/update')}
            {...({
              onSave: handleSaveAdminProfile,
              adminData: adminProfileData
            } as any)}
          />
        </ProtectedRoute>} />
        <Route path="/admin/profile/update" element={<ProtectedRoute allowedRoles={['admin']}>
          <UpdateAdminProfile
            onLogout={handleLogout}
            onBack={() => navigate('/admin/profile')}
            onSave={handleSaveAdminProfile}
            adminData={adminProfileData} />
        </ProtectedRoute>} />


        <Route path="/pmanager" element={<ProtectedRoute allowedRoles={['pmanager']}>
          <PlatformManagerDashboard onLogout={handleLogout}
            onNavigateToInstitutionsProfile={() => navigate('/pmanager/institutions')} />
        </ProtectedRoute>} />
        <Route path="/pmanager/institutions" element={<ProtectedRoute allowedRoles={['pmanager']}>
          <ManageInstitutionsProfile
            onLogout={handleLogout}
            onBack={() => navigate('/pmanager')}
            onCreateProfile={() => navigate('/pmanager/institutions/create')}
            onViewProfile={(data) => { setSelectedInstitutionData(data); navigate('/pmanager/institutions/view'); }} />
        </ProtectedRoute>} />


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      <NotificationAlerts
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        alerts={notificationAlerts}
        onDismissAlert={(id) => setNotificationAlerts(prev => prev.filter(a => a.id !== id))}
      />
    </div>
  );
}

// Simple wrapper for your Landing Page
function LandingPage() {
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