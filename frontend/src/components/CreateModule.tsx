import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getManageUsers, createModule } from "../services/api";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { cn } from "../lib/utils";

interface LecturerData {
  uuid: string;
  name: string;
  email: string;
  role: string;
  studentNum: string;
  status: string;
}

interface CreateModuleProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onSave?: (moduleData: any) => void;
}

// Module ID validation function
const validateModuleID = (moduleID: string): { isValid: boolean; error: string } => {
  // Check if empty
  if (!moduleID.trim()) {
    return { isValid: false, error: "Module ID is required" };
  }

  // Check if it's a positive integer
  const numericValue = parseInt(moduleID.trim());
  if (isNaN(numericValue) || !Number.isInteger(numericValue) || numericValue <= 0) {
    return { isValid: false, error: "Module ID must be a positive integer (e.g., 1, 2, 3)" };
  }

  // Check if it's not too large (reasonable limit)
  if (numericValue > 999999) {
    return { isValid: false, error: "Module ID must be less than 1,000,000" };
  }

  // Check if it doesn't start with zero (if more than one digit)
  if (moduleID.length > 1 && moduleID.startsWith('0')) {
    return { isValid: false, error: "Module ID cannot start with zero" };
  }

  return { isValid: true, error: "" };
};

export function CreateModule({
  onLogout,
  onBack,
  onNavigateToProfile,
  onSave,
}: CreateModuleProps) {
  const [formData, setFormData] = useState({
    moduleCode: "",
    moduleName: "",
    startDate: "",
    endDate: "",
    tutorialGroupsCount: 1,
    lecturerIDs: [] as string[],
    courseIDs: [] as number[],
  });

  const [lecturers, setLecturers] = useState<LecturerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (!token) {
          console.warn("No token found");
          setLoading(false);
          return;
        }
        const response = await getManageUsers(token, "", "Lecturer", "");

        if (Array.isArray(response)) {
          setLecturers(response);
        }
        else if (response && typeof response === 'object' && 'users' in response) {
          setLecturers(response.users);
        } else {
          console.error("API returned unexpected format:", response);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Real-time validation for moduleID
    if (field === 'moduleID' && typeof value === 'string') {
      const validation = validateModuleID(value);
      if (!validation.isValid) {
        setErrors(prev => ({ ...prev, moduleID: validation.error }));
      } else {
        setErrors(prev => ({ ...prev, moduleID: "" }));
      }
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: "" }));
      }
    }
  };
  const toggleLecturer = (lecturerId: string) => {
    const current = [...formData.lecturerIDs];
    const index = current.indexOf(lecturerId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(lecturerId);
    }
    handleInputChange("lecturerIDs", current);
  };
  const handleSave = async () => {
    // Validate required fields
    if (formData.lecturerIDs.length === 0) {
      alert("Please assign at least one lecturer.");
      return;
    }
    const requiredFields = [
      { field: 'moduleCode', label: 'Module Code' },
      { field: 'moduleName', label: 'Module Name' },
      { field: 'startDate', label: 'Start Date' },
      { field: 'endDate', label: 'End Date' },
    ];

    const missingFields = requiredFields.filter(({ field }) => {
      if (field === 'lecturerIDs') return formData.lecturerIDs.length === 0;
      return !formData[field as keyof typeof formData]?.toString().trim();
    });
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

    // Validate tutorial groups count
    if (!formData.tutorialGroupsCount || formData.tutorialGroupsCount < 1 || formData.tutorialGroupsCount > 10) {
      alert("Number of tutorial groups must be between 1 and 10");
      return;
    }

    setSaving(true);
    try {
      if (!token) {
        return;
      }

      // Call the API to create the module
      const result = await createModule(token, {
        moduleName: formData.moduleName,
        moduleCode: formData.moduleCode,
        startDate: formData.startDate,
        endDate: formData.endDate,
        lecturerIDs: formData.lecturerIDs,
        tutorialGroupsCount: formData.tutorialGroupsCount
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
      alert("Failed to create module.  Please try again.");
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

            {/* Tutorial Groups Count */}
            <div className="space-y-2">
              <Label htmlFor="tutorialGroupsCount">Number of Tutorial Groups</Label>
              <Input
                id="tutorialGroupsCount"
                type="number"
                min="1"
                max="10"
                placeholder="Enter number of tutorial groups (1-10)"
                value={formData.tutorialGroupsCount}
                onChange={(e) => handleInputChange("tutorialGroupsCount", parseInt(e.target.value))}
                className={errors.tutorialGroupsCount ? "border-red-500" : ""}
              />
              {errors.tutorialGroupsCount && (
                <p className="text-red-500 text-sm">{errors.tutorialGroupsCount}</p>
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
              <Label>Assign Lecturers</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between h-auto min-h-10 px-3",
                      errors.lecturerIDs ? "border-red-500" : ""
                    )}
                  >
                    <div className="flex flex-wrap gap-1">
                      {formData.lecturerIDs.length > 0 ? (
                        formData.lecturerIDs.map((id) => {
                          const lecturer = lecturers.find((l) => l.uuid === id);
                          return (
                            <Badge key={id} variant="secondary" className="mr-1 py-1">
                              {lecturer?.name}
                              <button
                                className="ml-1 ring-offset-background rounded-full outline-none"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent opening popover
                                  toggleLecturer(id);
                                }}
                              >
                                <X className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-muted-foreground">Select lecturers...</span>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }} align="start" side="bottom" sideOffset={4}>
                  <Command className="w-full border-none shadow-none">
                    <CommandInput placeholder="Search lecturer..." />
                    <CommandList className="w-full">
                      <CommandEmpty>No lecturer found.</CommandEmpty>
                      <CommandGroup>
                        {lecturers.map((lecturer) => (
                          <CommandItem
                            key={lecturer.uuid}
                            value={`${lecturer.name} ${lecturer.email}`}
                            onSelect={() => toggleLecturer(lecturer.uuid)}
                            className="w-full"
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                formData.lecturerIDs.includes(lecturer.uuid)
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}
                            >
                              <Check className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">{lecturer.name} - {lecturer.email}</span>
                              {/* studentNum actually represents their Specialization for the Lecturer's case */}
                              <span className="text-xs text-muted-foreground">{lecturer.studentNum}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.lecturerIDs && (
                <p className="text-red-500 text-sm">{errors.lecturerIDs}</p>
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