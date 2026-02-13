import { SetStateAction, useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
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
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getUsers } from "../services/api";
interface ManageUserProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToCreateCustomGoal: (userData: {
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  }) => void;
  onNavigateToUpdateUserProfile: (userData: {
    uuid: string;
    name: string;
    role: string;
  }) => void;
  userGoals: Record<string, number | null>;
  userProfiles: Record<string, {
    userId: string;
    name: string;
    role: string;
    status: string;
    email: string;
    dateOfBirth: string;
    contactNumber: string;
    address: string;
    enrollmentDate: string;
    associatedModules: string;
    biometricStatus: string;
    biometricLastUpdated: string;
  }>;
}

export function ManageUserProfile({
  onLogout,
  onBack,
  onNavigateToUpdateUserProfile,
  userProfiles,
  onNavigateToProfile
}: ManageUserProfileProps) {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 30;
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!token) return;
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsers(token);
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);
  const filteredProfiles = users.filter((profile) => {
    const matchesSearch =
      profile.name.toLowerCase().includes(search.toLowerCase()) ||
      profile.userID?.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "all" ||
      profile.role.toLowerCase() === roleFilter.toLowerCase();
    const status = profile.active ? "active" : "inactive";
    const matchesStatus =
      statusFilter === "all" || status === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProfiles = filteredProfiles.slice(startIndex, endIndex);


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
  const handleManageProfile = (userId: string) => {
    const detailedProfile = userProfiles[userId];

    onNavigateToUpdateUserProfile({
      uuid: userId,
      name: detailedProfile?.name || "",
      role: detailedProfile?.role || ""
    });
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
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-12"
                />
              </div>

              {/* Role Filter */}
              <div className="w-full md:w-48">
                <Select
                  value={roleFilter}
                  onValueChange={(value: SetStateAction<string>) => {
                    setRoleFilter(value);
                    setCurrentPage(1);
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
                  onValueChange={(value: SetStateAction<string>) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
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
                  <TableHead className="w-[200px]">User ID</TableHead>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Current Goals</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    {/* colSpan={6} makes the cell stretch across all 6 columns */}
                    <TableCell colSpan={6} className="text-center py-20 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-gray-500 font-medium">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : currentProfiles.length > 0 ? (
                  currentProfiles.map((profile) => {
                    const isStudent = profile.role.toLowerCase() === "student";
                    const displayGoal = isStudent && profile.attendanceMinimum != null
                      ? `${profile.attendanceMinimum}%`
                      : "N/A";
                    const isActive = profile.active === true;
                    return (
                      <TableRow key={profile.userID}>
                        {/* User ID Column */}
                        <TableCell className="align-middle text-sm">
                          {profile.userID}
                        </TableCell>

                        {/* Name Column */}
                        <TableCell className="align-middle">{profile.name}</TableCell>

                        {/* Role Column */}
                        <TableCell className="align-middle">{profile.role}</TableCell>

                        {/* Status Column */}
                        <TableCell className="align-middle">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                            }`}>
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>

                        {/* Current Goals Column (RE-IMPLEMENTED) */}
                        <TableCell className="align-middle">
                          {displayGoal}
                        </TableCell>

                        {/* Actions Column */}
                        <TableCell className="text-right align-middle">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageProfile(profile.userID)}
                          >
                            Manage Profile
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-gray-500">No users found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex items-center justify-center gap-4 py-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}