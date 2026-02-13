import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getAdminModuleList, getManageUsers, updateLesson, getTutorialGroupsForModule } from "../services/api";
import { LessonData } from "../types/adminlesson";

interface TutorialGroup {
  tutorialGroupsID: number;
  groupName: string;
  studentCount: number;
}

interface ModuleData {
  moduleID: string;
  moduleCode: string;
  moduleName: string;
  startDate: string;
  endDate: string;
  lecturerName?: string;
}

interface UpdateLessonProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onSave?: (lessonData: any) => void;
  lessonData: LessonData;
}

export function UpdateLesson({
  onBack,
  onNavigateToProfile,
  onSave,
  lessonData,
}: UpdateLessonProps) {
  const [formData, setFormData] = useState({
    lessonID: lessonData.lessonID || "",
    moduleCode: lessonData.moduleCode || "",
    lecturerID: "", // Will be populated from backend
    lessonType: lessonData.lessonType || "",
    tutorialGroupName: "", // Will be populated for practical lessons
    startDateTime: lessonData.startDateTime ? lessonData.startDateTime.slice(0, 16) : "",
    endDateTime: lessonData.endDateTime ? lessonData.endDateTime.slice(0, 16) : "",
    building: lessonData.building || "",
    room: lessonData.room || "",
  });

  const [modules, setModules] = useState<ModuleData[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token) {
          return;
        }

        // Fetch modules
        const moduleData = await getAdminModuleList(token);
        await getManageUsers(token, "", "Lecturer", "");

        setModules(moduleData || []);

        // If lesson is practical, fetch tutorial groups to get the group name
        if (lessonData.lessonType === 'Practical') {
          try {
            const moduleInfo = moduleData?.find((m: ModuleData) => m.moduleCode === lessonData.moduleCode);
            if (moduleInfo) {
              const tutorialGroupsData = await getTutorialGroupsForModule(moduleInfo.moduleID, token);

              // Find and set the tutorial group name
              if (lessonData.tutorialGroupID && tutorialGroupsData) {
                const currentGroup = tutorialGroupsData.find((g: TutorialGroup) =>
                  g.tutorialGroupsID === parseInt(lessonData.tutorialGroupID || "0") ||
                  g.tutorialGroupsID.toString() === lessonData.tutorialGroupID
                );
                if (currentGroup) {
                  setFormData(prev => ({ ...prev, tutorialGroupName: currentGroup.groupName }));
                } else {
                  setFormData(prev => ({ ...prev, tutorialGroupName: 'Not assigned' }));
                }
              } else {
                setFormData(prev => ({ ...prev, tutorialGroupName: 'Not assigned' }));
              }
            } else {
              setFormData(prev => ({ ...prev, tutorialGroupName: 'Module not found' }));
            }
          } catch (error) {
            console.error('Error fetching tutorial groups:', error);
            setFormData(prev => ({ ...prev, tutorialGroupName: 'Error loading group' }));
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [token]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSave = async () => {
    // Validate required fields (only editable fields)
    const requiredFields = [
      { field: 'startDateTime', label: 'Start Date & Time' },
      { field: 'endDateTime', label: 'End Date & Time' },
      { field: 'building', label: 'Building' },
      { field: 'room', label: 'Room' }
    ];

    const missingFields = requiredFields.filter(({ field }) =>
      !formData[field as keyof typeof formData]?.toString().trim()
    );

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(({ label }) => label).join(', ');
      alert(`Missing data cannot be saved. Please fill in: ${missingLabels}`);
      return;
    }

    // Validate time range
    if (formData.startDateTime && formData.endDateTime) {
      if (new Date(formData.startDateTime) >= new Date(formData.endDateTime)) {
        alert("End time must be after start time");
        return;
      }
    }

    setSaving(true);
    try {
      if (!token) {
        alert("Authentication error. Please login again.");
        return;
      }

      // Call the API to update the lesson (only send editable fields)
      const updateData = {
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        building: formData.building,
        room: formData.room
      };

      console.log("Sending update data:", updateData);
      const result = await updateLesson(formData.lessonID, updateData, token);

      console.log("Lesson updated successfully:", result);
      alert("Lesson updated successfully!");

      // Call the onSave callback if provided
      if (onSave) {
        onSave(result);
      }

      // Navigate back to manage lessons
      onBack();
    } catch (error) {
      console.error('Error updating lesson:', error);
      alert("Failed to update lesson. Please try again.");
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
          Back to Manage Lessons
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Update Lesson</h1>
          <p className="text-gray-600 mt-1">Modify the lesson details and update assignment</p>
        </div>

        {/* Update Lesson Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Lesson Details</CardTitle>
            <CardDescription>
              Update the lesson information including schedule and location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Lesson ID (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="lessonID">Lesson ID</Label>
              <Input
                id="lessonID"
                type="text"
                value={formData.lessonID}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500">Lesson ID cannot be changed</p>
            </div>

            {/* Module Selection (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Input
                id="module"
                value={`${formData.moduleCode} - ${modules.find(m => m.moduleCode === formData.moduleCode)?.moduleName || ''}`}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500">Module cannot be changed</p>
            </div>

            {/* Lecturer Selection (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="lecturer">Lecturer</Label>
              <Input
                id="lecturer"
                value={lessonData.lecturerName || 'Loading...'}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500">Lecturer cannot be changed</p>
            </div>

            {/* Lesson Type (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="lessonType">Lesson Type</Label>
              <Input
                id="lessonType"
                value={formData.lessonType}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500">Lesson type cannot be changed</p>
            </div>

            {/* Tutorial Group (Read-only, only for Practical lessons) */}
            {formData.lessonType === 'Practical' && (
              <div className="space-y-2">
                <Label htmlFor="tutorialGroup">Tutorial Group</Label>
                <Input
                  id="tutorialGroup"
                  value={formData.tutorialGroupName || 'Not assigned'}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
                <p className="text-sm text-gray-500">Tutorial group cannot be changed</p>
              </div>
            )}

            {/* Date and Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date & Time */}
              <div className="space-y-2">
                <Label htmlFor="startDateTime">Start Date & Time</Label>
                <div className="relative">
                  <Input
                    id="startDateTime"
                    type="datetime-local"
                    value={formData.startDateTime}
                    onChange={(e) => handleInputChange("startDateTime", e.target.value)}
                    className={errors.startDateTime ? "border-red-500" : ""}
                  />
                </div>
                {errors.startDateTime && (
                  <p className="text-red-500 text-sm">{errors.startDateTime}</p>
                )}
              </div>

              {/* End Date & Time */}
              <div className="space-y-2">
                <Label htmlFor="endDateTime">End Date & Time</Label>
                <div className="relative">
                  <Input
                    id="endDateTime"
                    type="datetime-local"
                    value={formData.endDateTime}
                    onChange={(e) => handleInputChange("endDateTime", e.target.value)}
                    className={errors.endDateTime ? "border-red-500" : ""}
                  />
                </div>
                {errors.endDateTime && (
                  <p className="text-red-500 text-sm">{errors.endDateTime}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Building */}
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  placeholder="Enter building (e.g., A, B, C)"
                  value={formData.building}
                  onChange={(e) => handleInputChange("building", e.target.value)}
                  className={errors.building ? "border-red-500" : ""}
                />
                {errors.building && (
                  <p className="text-red-500 text-sm">{errors.building}</p>
                )}
              </div>

              {/* Room */}
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input
                  id="room"
                  placeholder="Enter room number (e.g., 101, Lab1)"
                  value={formData.room}
                  onChange={(e) => handleInputChange("room", e.target.value)}
                  className={errors.room ? "border-red-500" : ""}
                />
                {errors.room && (
                  <p className="text-red-500 text-sm">{errors.room}</p>
                )}
              </div>
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
                {saving ? "Updating..." : "Update Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}