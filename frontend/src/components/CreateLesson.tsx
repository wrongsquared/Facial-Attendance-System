import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getAdminModuleList, createLesson, getManageUsers, getTutorialGroupsForModule } from "../services/api";

interface LecturerData {
  uuid: string;
  name: string;
  email: string;
  role: string;
  studentNum: string;
  status: string;
}

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

interface CreateLessonProps {
  onBack: () => void;
  onLogout?: () => void;
  onNavigateToProfile?: () => void;
  onSave?: (lessonData: any) => void;
}

export function CreateLesson({
  onBack,
  onLogout,
  onNavigateToProfile,
  onSave,
}: CreateLessonProps) {
  const [formData, setFormData] = useState({
    moduleCode: "",
    lecturerID: "",
    lessonType: "",
    tutorialGroupID: "",
    startDateTime: "",
    endDateTime: "",
    building: "",
    room: "",
  });

  const [modules, setModules] = useState<ModuleData[]>([]);
  const [lecturers, setLecturers] = useState<LecturerData[]>([]);
  const [tutorialGroups, setTutorialGroups] = useState<TutorialGroup[]>([]);
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

        // Fetch both modules and lecturers in parallel
        const [moduleData, lecturerData] = await Promise.all([
          getAdminModuleList(token),
          getManageUsers(token, "", "Lecturer", "")
        ]);

        setModules(moduleData || []);
        setLecturers(lecturerData || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Fetch tutorial groups when module is selected
  useEffect(() => {
    const fetchTutorialGroups = async () => {
      if (formData.moduleCode && token) {
        try {
          const moduleData = modules.find(m => m.moduleCode === formData.moduleCode);
          if (moduleData) {
            const tutorialGroupsData = await getTutorialGroupsForModule(moduleData.moduleID, token);
            setTutorialGroups(tutorialGroupsData || []);
          }
        } catch (error) {
          console.error('Error fetching tutorial groups:', error);
          setTutorialGroups([]);
        }
      } else {
        setTutorialGroups([]);
      }
    };

    fetchTutorialGroups();
  }, [formData.moduleCode, token, modules]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Clear tutorial group when lesson type changes to Lecture
      if (field === 'lessonType' && value === 'Lecture') {
        updated.tutorialGroupID = '';
      }
      // Clear tutorial group when module changes
      if (field === 'moduleCode') {
        updated.tutorialGroupID = '';
      }
      return updated;
    });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.moduleCode.trim()) {
      newErrors.moduleCode = "Module is required";
    }

    if (!formData.lecturerID.trim()) {
      newErrors.lecturerID = "Lecturer is required";
    }

    if (!formData.lessonType.trim()) {
      newErrors.lessonType = "Lesson Type is required";
    }

    if (formData.lessonType === 'Practical' && !formData.tutorialGroupID.trim()) {
      newErrors.tutorialGroupID = "Tutorial Group is required for Practical lessons";
    }

    if (!formData.startDateTime) {
      newErrors.startDateTime = "Start Date & Time is required";
    }

    if (!formData.endDateTime) {
      newErrors.endDateTime = "End Date & Time is required";
    }

    if (!formData.building.trim()) {
      newErrors.building = "Building is required";
    }

    if (!formData.room.trim()) {
      newErrors.room = "Room is required";
    }

    // Validate date range
    if (formData.startDateTime && formData.endDateTime) {
      if (new Date(formData.startDateTime) >= new Date(formData.endDateTime)) {
        newErrors.endDateTime = "End time must be after start time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = [
      { field: 'moduleCode', label: 'Module' },
      { field: 'lecturerID', label: 'Lecturer' },
      { field: 'lessonType', label: 'Lesson Type' },
      { field: 'startDateTime', label: 'Start Date & Time' },
      { field: 'endDateTime', label: 'End Date & Time' },
      { field: 'building', label: 'Building' },
      { field: 'room', label: 'Room' }
    ];

    // Add tutorial group as required for practical lessons
    if (formData.lessonType === 'Practical') {
      requiredFields.push({ field: 'tutorialGroupID', label: 'Tutorial Group' });
    }

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

      // Call the API to create the lesson
      const lessonRequest = {
        moduleCode: formData.moduleCode,
        lecturerID: formData.lecturerID,
        lessonType: formData.lessonType,
        tutorialGroupID: formData.lessonType === 'Practical' ? formData.tutorialGroupID : null,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        building: formData.building,
        room: formData.room
      };

      const result = await createLesson(token, lessonRequest);

      console.log("Lesson created successfully:", result);
      alert("Lesson created successfully!");

      // Call the onSave callback if provided
      if (onSave) {
        onSave(result);
      }

      // Navigate back to manage lessons
      onBack();
    } catch (error) {
      console.error('Error creating lesson:', error);
      alert("Failed to create lesson. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const lessonTypes = [
    "Lecture",
    "Practical"
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">Create New Lesson</h1>
          <p className="text-gray-600 mt-1">Fill in the details to schedule a new lesson</p>
        </div>

        {/* Create Lesson Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Lesson Details</CardTitle>
            <CardDescription>
              Enter the lesson information including schedule and location
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Module Selection */}
            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Select value={formData.moduleCode} onValueChange={(value: string) => handleInputChange("moduleCode", value)}>
                <SelectTrigger className={errors.moduleCode ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.moduleCode} value={module.moduleCode}>
                      <div className="flex flex-col">
                        <span className="font-medium">{module.moduleCode} - {module.moduleName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.moduleCode && (
                <p className="text-red-500 text-sm">{errors.moduleCode}</p>
              )}
            </div>

            {/* Lecturer Selection */}
            <div className="space-y-2">
              <Label htmlFor="lecturer">Lecturer</Label>
              <Select value={formData.lecturerID} onValueChange={(value: string) => handleInputChange("lecturerID", value)}>
                <SelectTrigger className={errors.lecturerID ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select a lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((lecturer) => (
                    <SelectItem key={lecturer.uuid} value={lecturer.uuid}>
                      <div className="flex flex-col">
                        <span className="font-medium">{lecturer.name} - {lecturer.email}</span>
                        {lecturer.studentNum !== "-" && (
                          <span className="text-xs text-gray-500">Specialist: {lecturer.studentNum}</span>
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

            {/* Lesson Type */}
            <div className="space-y-2">
              <Label htmlFor="lessonType">Lesson Type</Label>
              <Select value={formData.lessonType} onValueChange={(value: string) => handleInputChange("lessonType", value)}>
                <SelectTrigger className={errors.lessonType ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select lesson type" />
                </SelectTrigger>
                <SelectContent>
                  {lessonTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.lessonType && (
                <p className="text-red-500 text-sm">{errors.lessonType}</p>
              )}
            </div>

            {/* Tutorial Group (Only for Practical lessons) */}
            {formData.lessonType === 'Practical' && (
              <div className="space-y-2">
                <Label htmlFor="tutorialGroup">Tutorial Group</Label>
                <Select value={formData.tutorialGroupID} onValueChange={(value: string) => handleInputChange("tutorialGroupID", value)}>
                  <SelectTrigger className={errors.tutorialGroupID ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a tutorial group" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutorialGroups.map((group) => (
                      <SelectItem key={group.tutorialGroupsID} value={group.tutorialGroupsID.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{group.groupName}</span>
                          <span className="text-xs text-gray-500">{group.studentCount} student{group.studentCount !== 1 ? 's' : ''} enrolled</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tutorialGroupID && (
                  <p className="text-red-500 text-sm">{errors.tutorialGroupID}</p>
                )}
                {tutorialGroups.length === 0 && formData.moduleCode && (
                  <p className="text-amber-600 text-sm">No tutorial groups found for this module.</p>
                )}
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
                {saving ? "Creating..." : "Create Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}