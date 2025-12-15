

const API_URL = "http://127.0.0.1:8000"; // Your FastAPI URL

// 1. Match your Pydantic "UserLogin" schema
export interface LoginCredentials {
  email: string;
  password: string;
}

// 2. Match your Pydantic "TokenResponse" schema
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

// 4. A Generic "Fetch with Token" helper
// Use this for /me, /students, etc.
export const fetchProtected = async (endpoint: string, token: string) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // <--- The Key to the Castle
    },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    throw new Error("Request failed");
  }

  return response.json();
};

// Example: Fetch Student's specific profile with course details
export const getStudentProfile = async (token: string) =>{
  return await fetchProtected('/my-profile', token);
}
// Example: Fetch Attendance History
export const getAttendance = async (token: string) => {
  return await fetchProtected("/attendance/me-profile", token);
};

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