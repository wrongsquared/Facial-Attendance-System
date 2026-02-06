import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { CreateCustomGoalModal } from "./CreateCustomGoalModal";
import { UpdateCustomGoalModal } from "./UpdateCustomGoalModal";
import { DeleteCustomGoalModal } from "./DeleteCustomGoalModal";
import { Navbar } from "./Navbar";

interface ManageCustomGoalsProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onCreateGoal: (userId: string, goal: number) => void;
  onUpdateGoal: (userId: string, goal: number) => void;
  onDeleteGoal: (userId: string, userName: string) => void;
  showToast: (message: string) => void;
  loading?: boolean;
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
  goalMetadata: Record<string, {
    lastUpdated: string;
    setBy: string;
  }>;
}

export function ManageCustomGoals({
  onBack,
  onNavigateToProfile,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  showToast,
  loading = false,
  userGoals,
  userProfiles,
  goalMetadata,
}: ManageCustomGoalsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    name: string;
    role: string;
    currentGoal: number | null;
  } | null>(null);
  const itemsPerPage = 30;

  // Filter users based on search and filters
  const filteredUsers = Object.values(userProfiles).filter((user) => {
    const matchesSearch =
      user.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || user.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesGoal =
      goalFilter === "all" ||
      (goalFilter === "set" && userGoals[user.userId] !== null) ||
      (goalFilter === "not-set" && userGoals[user.userId] === null);

    return matchesSearch && matchesStatus && matchesGoal;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

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

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "inactive":
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  const handleCreateGoal = (userId: string, goal: number) => {
    onCreateGoal(userId, goal);
    setCreateModalOpen(false);
  };

  const handleUpdateGoal = (userId: string, goal: number) => {
    onUpdateGoal(userId, goal);
    setUpdateModalOpen(false);
  };

  const handleDeleteGoal = (userId: string, userName: string) => {
    onDeleteGoal(userId, userName);
    setDeleteModalOpen(false);
  };

  const openCreateModal = (user: { userId: string; name: string; role: string }) => {
    setSelectedUser({
      userId: user.userId,
      name: user.name,
      role: user.role,
      currentGoal: userGoals[user.userId],
    });
    setCreateModalOpen(true);
  };

  const openUpdateModal = (user: { userId: string; name: string; role: string }) => {
    setSelectedUser({
      userId: user.userId,
      name: user.name,
      role: user.role,
      currentGoal: userGoals[user.userId],
    });
    setUpdateModalOpen(true);
  };

  const openDeleteModal = (user: { userId: string; name: string; role: string }) => {
    setSelectedUser({
      userId: user.userId,
      name: user.name,
      role: user.role,
      currentGoal: userGoals[user.userId],
    });
    setDeleteModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Navbar title="Admin Portal" onNavigateToProfile={onNavigateToProfile} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Manage Custom Goals</CardTitle>
            <CardDescription>
              Create, update custom attendance goals for users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter Header */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by User ID or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Current Goals Filter */}
              <div className="w-48">
                <Select value={goalFilter} onValueChange={setGoalFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Current goals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Goals</SelectItem>
                    <SelectItem value="set">Goals Set</SelectItem>
                    <SelectItem value="not-set">Goals Not Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Goals</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-500 py-8"
                      >
                        Loading records...
                      </TableCell>
                    </TableRow>
                  ) : currentUsers.length > 0 ? (
                    currentUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>{user.userId}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {userGoals[user.userId] ? `${userGoals[user.userId]}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {userGoals[user.userId] !== null ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openUpdateModal({
                                      userId: user.userId,
                                      name: user.name,
                                      role: user.role,
                                    })
                                  }
                                >
                                  Manage Goals
                                </Button>

                                {/* <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openDeleteModal({
                                      userId: user.userId,
                                      name: user.name,
                                      role: user.role,
                                    })
                                  }
                                >
                                  Delete Goals
                                </Button> */}
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openCreateModal({
                                    userId: user.userId,
                                    name: user.name,
                                    role: user.role,
                                  })
                                }
                              >
                                Create Goals
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

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

      {/* Create Custom Goal Modal */}
      {selectedUser && (
        <CreateCustomGoalModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          userData={selectedUser}
          onCreateGoal={handleCreateGoal}
          showToast={showToast}
        />
      )}

      {/* Update Custom Goal Modal */}
      {selectedUser && (
        <UpdateCustomGoalModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          userData={selectedUser}
          goalMetadata={goalMetadata[selectedUser.userId] || {
            lastUpdated: "N/A",
            setBy: "Admin User",
          }}
          onUpdateGoal={handleUpdateGoal}
          showToast={showToast}
        />
      )}

      {/* Delete Custom Goal Modal */}
      {selectedUser && (
        <DeleteCustomGoalModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          userData={selectedUser}
          onDeleteGoal={handleDeleteGoal}
          showToast={showToast}
        />
      )}
    </div>
  );
}