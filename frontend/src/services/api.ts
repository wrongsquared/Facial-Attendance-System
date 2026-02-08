
import { Course, CreateUserPayload, UpdateProfilePayload, UpdateUserPayload, UserAccDetails, UserDetails, UserListItem } from "../types/adminInnards";
import { LoginCredentials, AuthResponse, ProfileUpdateData } from "../types/auth";
import { AttendanceLogFilters, AttendanceLogResponse } from "../types/lecturerinnards";


const API_URL = process.env.API_URL; // The FASTAPI URL

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

export const fetchProtected = async (endpoint: string, token: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`, // Returns the Access Token
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized");
    throw new Error("Request failed");
  }
  if (response.status === 204) {
    return {};
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
const sendUpdate = async (endpoint: string, token: string, data: any) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }
  return await response.json();
};

const sendCreate = async (endpoint: string, token: string, data: any) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Failed to create resource");
  }
  return await response.json();
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

export const getStudentProgress = async (token: string) => {
  return await fetchProtected("/student/progress/quarterly", token);
}

export const getFullAttendanceHistory = async (token: string) => {
  return await fetchProtected("/student/history/all", token);
};

export const getTimetableRange = async (token: string, start: string, end: string) => {
  // We use URLSearchParams to safely encode the dates
  const params = new URLSearchParams({
    start_date: start,
    end_date: end
  });
  return await fetchProtected(`/student/timetable/range?${params.toString()}`, token);
};

export const getStudentFullProfile = async (token: string) => {
  return await fetchProtected("/student/my-profile", token);
};

export const getNotifications = async (token: string) => {
  return await fetchProtected("/student/notifications", token);
};
export const markNotificationRead = async (id: number, token: string) => {
  return await fetchProtected(`/notifications/${id}/read`, token, {
    method: "PATCH"
  });
};
export const updateStudentProfile = async (token: string, data: ProfileUpdateData) => {
  return await sendUpdate("/student/profile/update", token, data);
};

//Student Routes End
//Lecturer Routes Begin

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

export const getrecentSessionslog = async (token: string) => {
  return await fetchProtected("/lecturer/dashboard/recent-sessions-log", token);
}

export const getLecturerFullProfile = async (token: string) => {
  return await fetchProtected('/lecturer/my-profile', token);
};


export const getLecDailyTimetable = async (token: string, dateStr: string) => {
  return await fetchProtected(`/lecturer/timetable/daily?date_str=${dateStr}`, token);
}
export const getLecWeeklyTimetable = async (token: string, startDateStr: string) => {
  return await fetchProtected(`/lecturer/timetable/weekly?start_date_str=${startDateStr}`, token);
}

export const getLecturerMonthlyTimetable = async (token: string, year: number, month: number) => {
  return await fetchProtected(`/lecturer/timetable/monthly?year=${year}&month=${month}`, token);
};

export const getAttendanceLog = async (token: string, filters: AttendanceLogFilters): Promise<AttendanceLogResponse> => {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.append("search_term", filters.searchTerm);
  if (filters.moduleCode && filters.moduleCode !== "All") params.append("module_code", filters.moduleCode);
  if (filters.status && filters.status !== "All") params.append("status", filters.status);
  if (filters.date) params.append("date", filters.date);


  const limit = filters.limit || 10;
  const offset = ((filters.page || 1) - 1) * limit;
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());
  const response = await fetchProtected(`/lecturer/attendance-log?${params.toString()}`, token);
  return response as AttendanceLogResponse;
}


export const updateLecturerProfile = async (token: string, data: ProfileUpdateData) => {
  console.log(data);
  return await sendUpdate("/lecturer/profile/update", token, data);
};

export const getLecturerModuleList = async (token: string) => {
  return await fetchProtected("/lecturer/modules", token);
};
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

export const getAdminModuleList = async (token: string) => {
  return await fetchProtected("/admin/modules", token);
};

export const createModule = async (token: string, moduleData: any) => {
  return await sendCreate("/admin/modules", token, moduleData);
};

export const createLesson = async (token: string, lessonData: any) => {
  return await sendCreate("/admin/lessons", token, lessonData);
};

export const updateLesson = async (lessonId: string, lessonData: any, token: string) => {
  return await sendUpdate(`/admin/lessons/${lessonId}`, token, lessonData);
};

export const getAdminLessonList = async (token: string, dateFrom?: string, dateTo?: string) => {
  let url = "/admin/lessons";
  const params = new URLSearchParams();

  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  return await fetchProtected(url, token);
};

export const testAdminAccess = async (token: string) => {
  return await fetchProtected("/admin/test", token);
};

export const deleteLesson = async (lessonId: string, token: string) => {
  const response = await fetch(`http://localhost:8000/admin/lessons/${lessonId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Failed to delete lesson');
  }

  return await response.json();
};

export const getAdminAttendanceLog = async (token: string, filters: AttendanceLogFilters): Promise<AttendanceLogResponse> => {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.append("search_term", filters.searchTerm);
  if (filters.moduleCode && filters.moduleCode !== "All") params.append("module_code", filters.moduleCode);
  if (filters.status && filters.status !== "All") params.append("status", filters.status);
  if (filters.date) params.append("date", filters.date);

  const limit = filters.limit || 10;
  const offset = ((filters.page || 1) - 1) * limit;
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());

  const response = await fetchProtected(`/admin/attendance-log?${params.toString()}`, token);
  return response as AttendanceLogResponse;
};

export const getManageUsers = async (
  token: string,
  search: string,
  role: string,
  status: string
) => {
  const params = new URLSearchParams();
  if (search) params.append("search_term", search);
  if (role) params.append("role_filter", role);       // Map role -> role_filter
  if (status) params.append("status_filter", status); // Map status -> status_filter

  return await fetchProtected(`/admin/users/manage?${params.toString()}`, token);
};

export const getStudentsForCustomGoals = async (
  token: string,
  search: string,
  status: string
) => {
  const params = new URLSearchParams();
  if (search) params.append("search_term", search);
  if (status && status !== "All Status") params.append("status_filter", status);

  return await fetchProtected(`/admin/users/manage/custom-goals?${params.toString()}`, token);
};

// services/api.ts
export const updateAdminProfile = async (
  token: string,
  payload: {
    contactNumber: string;
    address: string;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactNumber: string;
  }
) => {
  const res = await fetch(`${API_URL}/admin/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to update admin profile");
  }

  return res.json();
};

export const updateAttendanceRecord = async (
  token: string,
  payload: {
    user_id: string;
    date: string;
    new_status: string;
    reason?: string;
    admin_notes?: string;
    lesson_id?: number;
  }
) => {
  console.log("API call - updateAttendanceRecord:", {
    url: `${API_URL}/admin/attendance/update`,
    payload,
    token: token ? "present" : "missing"
  });

  const res = await fetch(`${API_URL}/admin/attendance/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  console.log("API response status:", res.status, res.statusText);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API error response:", errorText);
    throw new Error(`Failed to update attendance record: ${res.status} ${errorText}`);
  }

  const result = await res.json();
  return result;
};
export const deleteUser = async (userId: string, token: string) => {
  return await fetchProtected(`/admin/users/${userId}`, token, {
    method: "DELETE",
  });
};

export const deleteModule = async (moduleId: string, token: string) => {
  return await fetchProtected(`/admin/modules/${moduleId}`, token, {
    method: "DELETE",
  });
}

export const updateModule = async (moduleId: string, moduleData: any, token: string) => {
  const response = await fetch(`${API_URL}/admin/modules/${moduleId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(moduleData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Update module error:", errorText);
    throw new Error(`Failed to update module: ${response.status} ${errorText}`);
  }
  return await response;
};
export const getUserDetails = async (userUUID: string, token: string): Promise<UserDetails> => {
  const response = await fetchProtected(`/admin/users/${userUUID}`, token);

  return response;
};
export const getUserAccDetails = async (userUUID: string, token: string): Promise<UserAccDetails> => {
  const response = await fetchProtected(`/admin/usersProf/${userUUID}`, token);

  return response;
};

export const updateUserProfile = async (userUUID: string, payload: UpdateProfilePayload, token: string) => {
  return await fetchProtected(`/admin/usersProf/${userUUID}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
export const createUser = async (data: CreateUserPayload, token: string) => {
  return await fetchProtected("/admin/users/create", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
};
export const getCampusCourses = async (token: string): Promise<Course[]> => {
  const data = await fetchProtected("/admin/campus-courses", token);

  return data;
};

export const createCourse = async (token: string, courseData: any) => {
  return await sendCreate("/admin/courses", token, courseData);
};

export const deleteCourse = async (courseId: number, token: string) => {
  return await fetchProtected(`/admin/courses/${courseId}`, token, {
    method: "DELETE",
  });
};

export const updateCourse = async (courseId: number, courseData: any, token: string) => {
  return await fetchProtected(`/admin/courses/${courseId}`, token, {
    method: "PUT",
    body: JSON.stringify(courseData),
  });
};
export const updateUser = async (userUUID: string, payload: UpdateUserPayload, token: string) => {
  return await fetchProtected(
    `/admin/users/${userUUID}`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
};
export const getUsers = async (token: string): Promise<UserListItem[]> => {
  return await fetchProtected("/admin/users/manageProfileDisplay", token);
};
//Admin Routes end

//Platform Manager Routes start
export const getPlatforManagerDashboard = async (token: string) => {
  return await fetchProtected('/platform-manager/dashboard', token)
}
//Platform Manager Routes end