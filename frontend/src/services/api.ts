
import { LoginCredentials, AuthResponse } from "../types/auth";
import { lessonInfo, TodaysLessons, AttendanceRecord, WeeklyLesson } from "../types/studentdash";
import { ClassesToday, CourseOverview, timetableEntry } from "../types/lecturerdash";
import { AdminStats, CourseAttention, UserManagementItem } from "../types/admindash";


const API_URL = "http://127.0.0.1:8000"; // The FASTAPI URL



// The Login Function
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
export const getStudentProfile = async (token: string) => {
  return await fetchProtected('/student/my-profile', token);
}

export const getStudentTimetable = async (token: string) => {
  return await fetchProtected("/student/timetable", token);
};



export const getOverallLessons = async (token: string) => {
  return await fetchProtected("/student/overrall", token);
};



export const getTodaysLessons = async (token: string) => {
  return await fetchProtected("/student/todayslesson", token);
}



export const getStatsByModule = async (token: string) => {
  return await fetchProtected("/student/stats/by-module", token);
};



export const getRecentHistory = async (token: string) => {
  return await fetchProtected("/student/history/recent", token);
};


export const getWeeklyTimetable = async (token: string) => {
  return await fetchProtected("/student/timetable/weekly", token);
};

//Student Routes End
//Lecturer Routes Begin

export const getLecturerProfile = async (token: string) => {
  return await fetchProtected('/lecturer/my-profile', token);
}



export const getLecturerModulesCount = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/summary", token);
}



export const getLecturertimetable = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/timetable", token);
}



export const getavgatt = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/average-attendance", token);
}




export const getClassesToday = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/classes-today", token);
}


export const getCourseOverview = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/my-courses-overview", token);
}



export const getrecentSessionsrecord = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/recent-sessions-card", token);
}



export const getrecentSessionslog = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/recent-sessions-log", token);
}

//Lecturer Routes End
//Admin Routes Begin

export const getAdminProfile = async (token: string) => {
  return await fetchProtected('/admin/my-profile', token);
}


export const getAdminStats = async (token: string) => {
  return await fetchProtected("/admin/stats", token);
};



export const getCoursesRequiringAttention = async (token: string) => {
  return await fetchProtected("/admin/courses/attention", token);
};



export const getRecentUsers = async (token: string) => {
  return await fetchProtected("/admin/users/recent", token);
};
//Admin Routes end

//Platform Manager Routes start
export const getPlatforManagerDashboard = async (token: string) => {
  return await fetchProtected('/platform-manager/dashboard', token)
}
//Platform Manager Routes end