import { useState } from "react";
import { ArrowLeft} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { createCourse } from "../services/api";

interface CreateCourseProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
  onSave?: (courseData: any) => void;
}

export function CreateCourse({
  onBack,
  onLogout,
  onNavigateToProfile,
  onSave,
}: CreateCourseProps) {
  const [formData, setFormData] = useState({
    courseCode: "",
    courseName: "",
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { token } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.courseCode.trim()) {
      newErrors.courseCode = "Course Code is required";
    }

    if (!formData.courseName.trim()) {
      newErrors.courseName = "Course Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = [
      { field: 'courseCode', label: 'Course Code' },
      { field: 'courseName', label: 'Course Name' }
    ];

    const missingFields = requiredFields.filter(({ field }) =>
      !formData[field as keyof typeof formData]?.toString().trim()
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(({ label }) => label).join(', ');
      alert(`Missing data cannot be saved. Please fill in: ${missingLabels}`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (!token) {
        alert("Authentication error. Please login again.");
        return;
      }

      // Call the API to create the course
      const result = await createCourse(token, {
        courseCode: formData.courseCode,
        courseName: formData.courseName
      });

      console.log("Course created successfully:", result);
      alert("Course created successfully!");

      // Call the onSave callback if provided
      if (onSave) {
        onSave(result);
      }

      // Navigate back to manage courses
      onBack();
    } catch (error) {
      console.error('Error creating course:', error);
      alert("Failed to create course. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Manage Courses
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
          <p className="text-gray-600 mt-1">Fill in the details to create a new academic course</p>
        </div>

        {/* Create Course Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              Enter the course information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Course Code */}
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code</Label>
              <Input
                id="courseCode"
                placeholder="Enter course code (e.g., DCOM, DBIS, DNET)"
                value={formData.courseCode}
                onChange={(e) => handleInputChange("courseCode", e.target.value)}
                className={errors.courseCode ? "border-red-500" : ""}
              />
              {errors.courseCode && (
                <p className="text-red-500 text-sm">{errors.courseCode}</p>
              )}
            </div>

            {/* Course Name */}
            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name</Label>
              <Input
                id="courseName"
                placeholder="Enter course name (e.g., Diploma in Computer Science)"
                value={formData.courseName}
                onChange={(e) => handleInputChange("courseName", e.target.value)}
                className={errors.courseName ? "border-red-500" : ""}
              />
              {errors.courseName && (
                <p className="text-red-500 text-sm">{errors.courseName}</p>
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
                {saving ? "Creating..." : "Create Course"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}