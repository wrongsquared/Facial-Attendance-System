import { useState } from "react";
import {
  Card,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import {
  BookOpen,
  LogOut,
  Bell,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
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

interface ManageUserProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToCreateCustomGoal: (userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  }) => void;
  onNavigateToUpdateUserProfile: (userData: {
    userId: string;
    name: string;
    role: string;
  }) => void;
}

type UserProfile = {
  userId: string;
  name: string;
  role: string;
  status: string;
  currentGoals: string;
};

// Mock user profile data
const allUserProfiles: UserProfile[] = [
  {
    userId: "7891011",
    name: "John Smith",
    role: "Student",
    status: "Active",
    currentGoals: "85%",
  },
  {
    userId: "7891012",
    name: "Emma Johnson",
    role: "Student",
    status: "Active",
    currentGoals: "90%",
  },
  {
    userId: "7891013",
    name: "Michael Brown",
    role: "Student",
    status: "Inactive",
    currentGoals: "80%",
  },
  {
    userId: "L001",
    name: "Dr. Rachel Wong",
    role: "Lecturer",
    status: "Active",
    currentGoals: "N/A",
  },
  {
    userId: "L002",
    name: "Prof. David Chen",
    role: "Lecturer",
    status: "Active",
    currentGoals: "N/A",
  },
  {
    userId: "7891014",
    name: "Sarah Williams",
    role: "Student",
    status: "Active",
    currentGoals: "85%",
  },
  {
    userId: "7891015",
    name: "James Davis",
    role: "Student",
    status: "Active",
    currentGoals: "75%",
  },
  {
    userId: "A001",
    name: "Admin User",
    role: "Admin",
    status: "Active",
    currentGoals: "N/A",
  },
  {
    userId: "7891016",
    name: "Lisa Anderson",
    role: "Student",
    status: "Inactive",
    currentGoals: "90%",
  },
  {
    userId: "L003",
    name: "Dr. Maria Garcia",
    role: "Lecturer",
    status: "Active",
    currentGoals: "N/A",
  },
  {
    userId: "7891017",
    name: "Robert Taylor",
    role: "Student",
    status: "Active",
    currentGoals: "80%",
  },
  {
    userId: "7891018",
    name: "Jennifer Martinez",
    role: "Student",
    status: "Active",
    currentGoals: "85%",
  },
];

const PROFILES_PER_PAGE = 8;

export function ManageUserProfile({
  onLogout,
  onBack,
  onNavigateToCreateCustomGoal,
  onNavigateToUpdateUserProfile,
}: ManageUserProfileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter profiles based on search and filters
  const filteredProfiles = allUserProfiles.filter((profile) => {
    const matchesSearch =
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.userId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      profile.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      profile.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProfiles.length / PROFILES_PER_PAGE);
  const startIndex = (currentPage - 1) * PROFILES_PER_PAGE;
  const endIndex = startIndex + PROFILES_PER_PAGE;
  const currentProfiles = filteredProfiles.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleEditGoal = (userId: string, currentGoal: string) => {
    // Find the user profile
    const userProfile = allUserProfiles.find(profile => profile.userId === userId);
    if (userProfile) {
      // Convert currentGoal to number or null
      const goalValue = currentGoal === "N/A" ? null : parseInt(currentGoal);
      onNavigateToCreateCustomGoal({
        userId: userProfile.userId,
        name: userProfile.name,
        role: userProfile.role,
        currentGoal: goalValue,
      });
    }
  };

  const handleManageProfile = (userId: string, name: string, role: string) => {
    // Mock manage profile functionality
    onNavigateToUpdateUserProfile({
      userId: userId,
      name: name,
      role: role,
    });
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
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Admin User</p>
                <p className="text-sm text-gray-600">Administrator</p>
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

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Manage User Profile</h2>
          <p className="text-gray-600">
            View and manage user profile information and goals
          </p>
        </div>

        {/* Filter Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or user ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleFilterChange();
                  }}
                  className="pl-10 h-12"
                />
              </div>

              {/* Role Filter */}
              <div className="w-full md:w-48">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="lecturer">Lecturer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    handleFilterChange();
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Profiles Table */}
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">User ID</TableHead>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Current Goals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                            profile.status === "Active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {profile.status}
                        </span>
                      </TableCell>
                      <TableCell className="align-middle">{profile.currentGoals}</TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleEditGoal(
                                profile.userId,
                                profile.currentGoals
                              )
                            }
                            disabled={profile.currentGoals === "N/A"}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage Goal
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleManageProfile(profile.userId, profile.name, profile.role)
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Manage Profile
                          </Button>
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

            {/* Pagination */}
            {filteredProfiles.length > 0 && (
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}