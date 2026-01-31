import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getManageUsers, createModule, getCampusCourses } from "../services/api";

interface LecturerData {
  uuid: string;
  name: string;
  email: string;
  role: string;
  studentNum: string;
  status: string;
}

interface Course {
  courseID: number;
  courseCode: string;
  courseName?: string;
}

interface CreateModuleProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onSave?: (moduleData: any) => void;
}

export function CreateModule({
  onBack,
  onNavigateToProfile,
  onSave,
}: CreateModuleProps) {
  const [formData, setFormData] = useState({
    moduleID: "",
    moduleCode: "",
    moduleName: "",
    startDate: "",
    endDate: "",
    lecturerID: "",
    courseIDs: [] as number[]
  });

  const [lecturers, setLecturers] = useState<LecturerData[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        // Get lecturers and courses in parallel
        const [lecturerData, courseData] = await Promise.all([
          getManageUsers(token, "", "Lecturer", ""),
          getCampusCourses(token)
        ]);

        console.log('Lecturer data fetched:', lecturerData);
        console.log('Course data fetched:', courseData);

        setLecturers(lecturerData);
        setCourses(courseData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleInputChange = (field: string, value: string | number[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = [
      { field: 'moduleCode', label: 'Module Code' },
      { field: 'moduleName', label: 'Module Name' },
      { field: 'startDate', label: 'Start Date' },
      { field: 'endDate', label: 'End Date' },
      { field: 'lecturerID', label: 'Lecturer' }
    ];

    const missingFields = requiredFields.filter(({ field }) =>
      !formData[field as keyof typeof formData]?.toString().trim()
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(({ label }) => label).join(', ');
      alert(`Missing data cannot be saved. Please fill in: ${missingLabels}`);
      return;
    }

    // Validate date range
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        alert("End date must be after start date");
        return;
      }
    }

    setSaving(true);
    try {
      if (!token) {
        alert("Authentication error. Please login again.");
        return;
      }

      // Call the API to create the module
      const result = await createModule(token, {
        moduleName: formData.moduleName,
        moduleCode: formData.moduleCode,
        startDate: formData.startDate,
        endDate: formData.endDate,
        lecturerID: formData.lecturerID
      });

      console.log("Module created successfully:", result);
      alert("Module created successfully!");

      // Call the onSave callback if provided
      if (onSave) {
        onSave(result);
      }

      // Navigate back to manage modules
      onBack();
    } catch (error) {
      console.error('Error creating module:', error);
      alert("Failed to create module. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage Modules
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Module</h1>
          <p className="text-gray-600 mt-1">Fill in the details to create a new academic module</p>
        </div>

        {/* Create Module Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
            <CardDescription>
              Enter the module information and assign a lecturer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Module ID */}
            <div className="space-y-2">
              <Label htmlFor="moduleID">Module ID</Label>
              <Input
                id="moduleID"
                type="text"
                placeholder="Enter module ID (e.g., 1, 2, 3...)"
                value={formData.moduleID}
                onChange={(e) => handleInputChange("moduleID", e.target.value)}
                className={errors.moduleID ? "border-red-500" : ""}
              />
              {errors.moduleID && (
                <p className="text-red-500 text-sm">{errors.moduleID}</p>
              )}
            </div>

            {/* Module Code */}
            <div className="space-y-2">
              <Label htmlFor="moduleCode">Module Code</Label>
              <Input
                id="moduleCode"
                placeholder="Enter module code (e.g., CSIT100)"
                value={formData.moduleCode}
                onChange={(e) => handleInputChange("moduleCode", e.target.value)}
                className={errors.moduleCode ? "border-red-500" : ""}
              />
              {errors.moduleCode && (
                <p className="text-red-500 text-sm">{errors.moduleCode}</p>
              )}
            </div>

            {/* Module Name */}
            <div className="space-y-2">
              <Label htmlFor="moduleName">Module Name</Label>
              <Input
                id="moduleName"
                placeholder="Enter module name (e.g., Introduction to Computer Science)"
                value={formData.moduleName}
                onChange={(e) => handleInputChange("moduleName", e.target.value)}
                className={errors.moduleName ? "border-red-500" : ""}
              />
              {errors.moduleName && (
                <p className="text-red-500 text-sm">{errors.moduleName}</p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                <div className="relative">
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    className={errors.startDate ? "border-red-500" : ""}
                  />
                </div>
                {errors.startDate && (
                  <p className="text-red-500 text-sm">{errors.startDate}</p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange("endDate", e.target.value)}
                    className={errors.endDate ? "border-red-500" : ""}
                  />
                </div>
                {errors.endDate && (
                  <p className="text-red-500 text-sm">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Lecturer Assignment */}
            <div className="space-y-2">
              <Label htmlFor="lecturer">Assign Lecturer</Label>
              <Select value={formData.lecturerID} onValueChange={(value: string) => handleInputChange("lecturerID", value)}>
                <SelectTrigger className={errors.lecturerID ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((lecturer) => (
                    <SelectItem key={lecturer.uuid} value={lecturer.uuid}>
                      <div className="flex flex-col">
                        <span className="font-medium">{lecturer.name} - {lecturer.email} </span>
                        {lecturer.studentNum !== "-" && (
                          <span className="text-xs ">Specialist: {lecturer.studentNum}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lecturerID && (
                <p className="text-red-500 text-sm">{errors.lecturerID}</p>
              )}
            </div>

            {/* Course Assignment */}
            <div className="space-y-2">
              <Label htmlFor="courses">Assign to Courses</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {courses.map((course) => (
                  <div key={course.courseID} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`course-${course.courseID}`}
                      checked={formData.courseIDs.includes(course.courseID)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        const newCourseIDs = isChecked
                          ? [...formData.courseIDs, course.courseID]
                          : formData.courseIDs.filter(id => id !== course.courseID);
                        handleInputChange("courseIDs", newCourseIDs);
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`course-${course.courseID}`} className="text-sm flex-1 cursor-pointer">
                      <span className="font-medium">{course.courseCode}</span> - {course.courseName}
                    </label>
                  </div>
                ))}
                {courses.length === 0 && (
                  <p className="text-gray-500 text-sm">No courses available</p>
                )}
              </div>
              {errors.courseIDs && (
                <p className="text-red-500 text-sm">{errors.courseIDs}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button variant="outline" onClick={onBack} className="flex-1">
                Cancel
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                {saving ? "Creating..." : "Create Module"}
              </Button>


            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}