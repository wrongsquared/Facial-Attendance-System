import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getManageUsers, updateModule, getTutorialGroupsForModule } from "../services/api";
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

interface TutorialGroup {
  tutorialGroupsID: number;
  groupName: string;
  studentCount: number;
}

interface ModuleData {
  moduleID: string;
  moduleCode: string;
  moduleName: string;
  startDate: string | null;
  endDate: string | null;
  lecMod?: Array<{ lecturerID: string; lecModID: number }>;
}

interface UpdateModuleProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onSave?: (moduleData: any) => void;
  moduleData: ModuleData;
}

export function UpdateModule({
  onBack,
  onNavigateToProfile,
  onSave,
  moduleData,
}: UpdateModuleProps) {
  const [formData, setFormData] = useState({
    moduleID: moduleData.moduleID || "",
    moduleCode: moduleData.moduleCode || "",
    moduleName: moduleData.moduleName || "",
    startDate: moduleData.startDate ? moduleData.startDate.slice(0, 16) : "",
    endDate: moduleData.endDate ? moduleData.endDate.slice(0, 16) : "",
    lecturerIDs: (moduleData as any).lecMod
      ? (moduleData as any).lecMod.map((lm: any) => String(lm.lecturerID))
      : [] as string[],
    courseIDs: [] as number[]
  });

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

        const [lecturerData, tutorialGroupsData] = await Promise.all([
          getManageUsers(token, "", "Lecturer", ""),
          getTutorialGroupsForModule(moduleData.moduleID, token)
        ]);

        setLecturers(lecturerData);
        setTutorialGroups(tutorialGroupsData);
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
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
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

      // Call the API to update the module
      const updateData = {
        moduleName: formData.moduleName,
        moduleCode: formData.moduleCode,
        startDate: formData.startDate,
        endDate: formData.endDate,
        lecturerIDs: formData.lecturerIDs || null
      };
      const result = await updateModule(moduleData.moduleID, updateData, token);

      if (onSave) {
        onSave(result);
      }

      onBack();
    } catch (error) {
      console.error('Error updating module:', error);
      alert("Failed to update module. Please try again.");
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
          <h1 className="text-3xl font-bold text-gray-900">Update Module</h1>
          <p className="text-gray-600 mt-1">Modify the module details and lecturer assignment</p>
        </div>

        {/* Update Module Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
            <CardDescription>
              Update the module information and reassign lecturer if needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Module ID (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="moduleID">Module ID</Label>
              {loading ? (
                <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
              ) : (
                <>
                  <Input
                    id="moduleID"
                    type="text"
                    value={formData.moduleID}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-sm text-gray-500">Module ID cannot be changed</p>
                </>
              )}
            </div>

            {/* Module Code */}
            <div className="space-y-2">
              <Label htmlFor="moduleCode">Module Code</Label>
              {loading ? (
                <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Module Name */}
            <div className="space-y-2">
              <Label htmlFor="moduleName">Module Name</Label>
              {loading ? (
                <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Tutorial Groups (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="tutorialGroups">Number of Tutorial Groups</Label>
              {loading ? (
                <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
              ) : (
                <Input
                  id="tutorialGroups"
                  value={tutorialGroups.length || 0}
                  disabled
                  className="bg-gray-100 text-gray-600"
                />
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                {loading ? (
                  <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                ) : (
                  <div className="relative">
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange("startDate", e.target.value)}
                      className={errors.startDate ? "border-red-500" : ""}
                    />
                  </div>
                )}
                {errors.startDate && (
                  <p className="text-red-500 text-sm">{errors.startDate}</p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                {loading ? (
                  <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
                ) : (
                  <div className="relative">
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange("endDate", e.target.value)}
                      className={errors.endDate ? "border-red-500" : ""}
                    />
                  </div>
                )}
                {errors.endDate && (
                  <p className="text-red-500 text-sm">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Lecturer Assignment */}
            <div className="space-y-2">
              <Label>Assign Lecturers</Label>
              {loading ? (
                <div className="animate-hard-pulse h-10 bg-gray-300 rounded w-full"></div>
              ) : (
                <>
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
                            formData.lecturerIDs.map((id: string) => {
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
                </>
              )}
            </div>

            {/* Action Buttons */}
            {!loading && (
              <div className="flex items-center gap-4 pt-4">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Cancel
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  {saving ? "Updating..." : "Update Module"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}