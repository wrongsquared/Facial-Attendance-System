import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  BookOpen,
  LogOut,
  ArrowLeft,
  Bell,
  Settings,
  Search,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface ManageBiometricProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToCreateBiometric: (userData: {
    userId: string;
    name: string;
    role: string;
  }) => void;
  onNavigateToUpdateBiometric: (userData: {
    userId: string;
    name: string;
    role: string;
  }) => void;
}

interface BiometricProfile {
  userId: string;
  name: string;
  role: string;
  biometricStatus: string;
  lastUpdated: string;
  hasBiometric: boolean;
}

export function ManageBiometricProfile({
  onLogout,
  onBack,
  onNavigateToCreateBiometric,
  onNavigateToUpdateBiometric,
}: ManageBiometricProfileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [userToDelete, setUserToDelete] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const itemsPerPage = 10;

  // Mock data for biometric profiles
  const allProfiles: BiometricProfile[] = [
    {
      userId: "S001",
      name: "John Doe",
      role: "Student",
      biometricStatus: "Active",
      lastUpdated: "2025-12-05",
      hasBiometric: true,
    },
    {
      userId: "S002",
      name: "Jane Smith",
      role: "Student",
      biometricStatus: "Active",
      lastUpdated: "2025-12-03",
      hasBiometric: true,
    },
    {
      userId: "S003",
      name: "Michael Brown",
      role: "Student",
      biometricStatus: "Not Registered",
      lastUpdated: "N/A",
      hasBiometric: false,
    },
    {
      userId: "L001",
      name: "Dr. Sarah Johnson",
      role: "Lecturer",
      biometricStatus: "Active",
      lastUpdated: "2025-12-01",
      hasBiometric: true,
    },
    {
      userId: "L002",
      name: "Prof. David Lee",
      role: "Lecturer",
      biometricStatus: "Inactive",
      lastUpdated: "2025-11-15",
      hasBiometric: true,
    },
    {
      userId: "L003",
      name: "Dr. Emily Chen",
      role: "Lecturer",
      biometricStatus: "Not Registered",
      lastUpdated: "N/A",
      hasBiometric: false,
    },
    {
      userId: "A001",
      name: "Admin User",
      role: "Admin",
      biometricStatus: "Active",
      lastUpdated: "2025-12-07",
      hasBiometric: true,
    },
    {
      userId: "S004",
      name: "Alice Wilson",
      role: "Student",
      biometricStatus: "Active",
      lastUpdated: "2025-12-04",
      hasBiometric: true,
    },
    {
      userId: "S005",
      name: "Robert Taylor",
      role: "Student",
      biometricStatus: "Not Registered",
      lastUpdated: "N/A",
      hasBiometric: false,
    },
    {
      userId: "S006",
      name: "Emma Davis",
      role: "Student",
      biometricStatus: "Inactive",
      lastUpdated: "2025-11-28",
      hasBiometric: true,
    },
    {
      userId: "L004",
      name: "Dr. James Anderson",
      role: "Lecturer",
      biometricStatus: "Active",
      lastUpdated: "2025-12-02",
      hasBiometric: true,
    },
    {
      userId: "S007",
      name: "Olivia Martinez",
      role: "Student",
      biometricStatus: "Not Registered",
      lastUpdated: "N/A",
      hasBiometric: false,
    },
  ];

  // Filter profiles based on search query and role
  const filteredProfiles = allProfiles.filter((profile) => {
    const matchesSearch =
      profile.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" || profile.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const indexOfLastProfile = currentPage * itemsPerPage;
  const indexOfFirstProfile = indexOfLastProfile - itemsPerPage;
  const currentProfiles = filteredProfiles.slice(
    indexOfFirstProfile,
    indexOfLastProfile
  );

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleView = (userId: string, name: string, role: string) => {
    // Navigate to update biometric profile page
    onNavigateToUpdateBiometric({ userId, name, role });
  };

  const handleDelete = (userId: string, name: string) => {
    // Mock delete functionality
    setUserToDelete({ userId, name });
  };

  const handleCreate = (userId: string, name: string, role: string) => {
    // Navigate to create biometric profile page
    onNavigateToCreateBiometric({ userId, name, role });
  };

  const confirmDelete = () => {
    if (userToDelete) {
      alert(`Delete biometric profile for ${userToDelete.name} (${userToDelete.userId})`);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setUserToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl">Attendify</h1>
              <p className="text-sm text-gray-600">Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">System Administrator</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onLogout}>
                    Log out
                  </AlertDialogAction>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Manage Biometric Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Biometric Profile</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Header */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by User ID or Name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Role Dropdown */}
              <div className="w-full md:w-48">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Lecturer">Lecturer</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* User Profiles Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">User ID</TableHead>
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead className="w-[100px]">Role</TableHead>
                    <TableHead className="w-[150px]">Biometric Status</TableHead>
                    <TableHead className="w-[150px]">Last Updated</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentProfiles.length > 0 ? (
                    currentProfiles.map((profile) => (
                      <TableRow key={profile.userId}>
                        <TableCell className="align-middle">{profile.userId}</TableCell>
                        <TableCell className="align-middle">{profile.name}</TableCell>
                        <TableCell className="align-middle">{profile.role}</TableCell>
                        <TableCell className="align-middle">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              profile.biometricStatus === "Active"
                                ? "bg-green-100 text-green-800"
                                : profile.biometricStatus === "Inactive"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {profile.biometricStatus}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle">{profile.lastUpdated}</TableCell>
                        <TableCell className="text-right align-middle">
                          <div className="flex items-center justify-end gap-2">
                            {profile.hasBiometric ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleView(profile.userId, profile.name, profile.role)
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Manage
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDelete(profile.userId, profile.name)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCreate(profile.userId, profile.name, profile.role)
                                }
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-gray-500">
                          No profiles found matching your criteria
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredProfiles.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstProfile + 1} to{" "}
                  {Math.min(indexOfLastProfile, filteredProfiles.length)} of{" "}
                  {filteredProfiles.length} profiles
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center px-4">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-600">
          &copy; 2025 University of Wollongong
        </div>
      </footer>

      {/* Delete Confirmation Dialog */}
      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(open: any) => !open && cancelDelete()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Biometric Profile</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the stored biometric data for User: {userToDelete.name} (User ID: {userToDelete.userId})
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}