

const API_URL = "http://127.0.0.1:8000"; // The FASTAPI URL

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role_id: number;
  role_name: string;
}

// 3. The Login Function
export const loginUser = async (creds: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(creds),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Login failed");
  }

  return response.json();
};

// Use this for /me, /students, etc.
export const fetchProtected = async (endpoint: string, token: string) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // Returns the Access Token
    },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    throw new Error("Request failed");
  }

  return response.json();
};

// Logout Function
export const logoutUser = async (token: string) => {
  // We don't really care about the response data, just the status
  await fetch(`${API_URL}/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
};


//Student Dashboard begin
export const getStudentProfile = async (token: string) =>{
  return await fetchProtected('/student/my-profile', token);
}

export interface lessonInfo {
    lessonID: number;
    lessonType: string;
    start_time: string; 
    end_time: string;
    location: string;
}

export const getStudentTimetable = async (token: string) => {
    return await fetchProtected("/student/timetable", token);
};

export interface OverallLessonsStat {
  total_lessons: number;
  attended_lessons: number;
  percentage: number;
}

export const getOverallLessons = async (token: string) => {
  return await fetchProtected("/student/overrall", token);
};

export interface TodaysLessons{
    lessonID: number;
    ModuleCode: string;
    ModuleName: string;
    lessonType: string;
    start_time: Date;
    end_time: Date;
    location: string;
    }

export const getTodaysLessons = async( token:string) => {
  return await fetchProtected("/student/todayslesson", token);
}

export interface ModuleStat {
  subject: string;
  attended: number;
  total: number;
  percentage: number;
}

export const getStatsByModule = async (token: string) => {
  return await fetchProtected("/student/stats/by-module", token);
};

export interface AttendanceRecord {
  lessonID: number;
  subject: string;
  date: string; // ISO String from backend
  status: "present" | "absent";
}

export const getRecentHistory = async (token: string) => {
  return await fetchProtected("/student/history/recent", token);
};

export interface WeeklyLesson {
  lessonID: number;
  module_code: string;
  module_name: string;
  lesson_type: string;
  start_time: string; // ISO String from backend
  end_time: string;   // ISO String from backend
  location: string; 
}

export const getWeeklyTimetable = async (token: string) => {
  return await fetchProtected("/student/timetable/weekly", token);
};

//Student Routes End
//Lecturer Routes Begin

export const getLecturerProfile = async (token: string) =>{
  return await fetchProtected('/lecturer/my-profile', token);
}

export interface totalModuleTaught {
  total_modules: number;
}

export const getLecturerModulesCount = async(token: string) =>{
  return await fetchProtected("/lecturer/dashboard/summary", token);
}

export interface timetableEntry {
    module_code: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    location: string;
}

export const getLecturertimetable = async(token: string) =>{
  return await fetchProtected("/lecturer/dashboard/timetable", token);
}

export interface avgatt {
  Average_attendance: number; //Float is still number in typescript
}

export const getavgatt = async(token:string) =>{
  return await fetchProtected("/lecturer/dashboard/average-attendance", token);
}


export interface ClassesToday{
    module_code: string;
    module_name: string;
    time_range: string;
    location: string;
    status: 'Completed'| 'Pending'| 'Live';
    present_count: number;
    total_enrolled: number;
    attendance_display: string;
}


export const getClassesToday = async(token:string) =>{
  return await fetchProtected("/lecturer/dashboard/classes-today",token);
}

export interface CourseOverview{
   module_code: string;
   module_name: string;
   overall_attendance_rate: number;
   students_enrolled: number;
}

export const getCourseOverview = async(token:string) =>{
  return await fetchProtected("/lecturer/dashboard/my-courses-overview",token);
}

export interface recentSessionsrecord{
  Recent_sessions_record: number
}

export const getrecentSessionsrecord = async(token:string) =>{
  return await fetchProtected("/lecturer/dashboard/recent-sessions-card",token);
}

export interface recentSessionsLog{
  subject: string;
  date: string;    
  time: string;         
  attended: number;     
  total:number;        
  percentage: number;   
}

    
export const getrecentSessionslog = async(token:string) =>{
  return await fetchProtected("/lecturer/dashboard/recent-sessions-log",token);
}

//Lecturer Routes End
//Admin Routes Begin

export const getAdminProfile = async (token: string) =>{
  return await fetchProtected('/lecturer/my-profile', token);
}
export interface AdminStats { //Sent by H, Admin
  attendanceRate: number;
  attendanceRateChange: number;
  monthlyAbsences: number;
  monthlyAbsencesChange: number;
  activeUsers: number;
  activeUsersChange: number;
  records: number;
  recordsChange: number;
}

export const getAdminDashboardStats = async (token: string) => {
  return await fetchProtected("/admin/my-profile", token);
};

//Admin Routes end