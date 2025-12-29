import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import {
  BookOpen,
  LogOut,
  Bell,
  Settings,
  ArrowLeft,
  Search,
  Eye,
  Trash2,
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
import { Badge } from "./ui/badge";
import { toast } from "sonner";

interface ManageInstitutionsProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onCreateProfile: () => void;
  onViewProfile: (institutionData: { institutionId: string; institutionName: string }) => void;
  onUpdateInstitution: (updatedData: {
    institutionId: string;
    institutionName: string;
    status: "Active" | "Inactive";
  }) => void;
}

// Mock data for institutions
const institutionsData = [
  {
    id: "INS001",
    name: "University of Wollongong",
    status: "Active",
  },
  {
    id: "INS002",
    name: "University of Sydney",
    status: "Active",
  },
  {
    id: "INS003",
    name: "University of New South Wales",
    status: "Active",
  },
  {
    id: "INS004",
    name: "Monash University",
    status: "Active",
  },
  {
    id: "INS005",
    name: "University of Melbourne",
    status: "Inactive",
  },
  {
    id: "INS006",
    name: "Australian National University",
    status: "Active",
  },
  {
    id: "INS007",
    name: "University of Queensland",
    status: "Active",
  },
  {
    id: "INS008",
    name: "University of Western Australia",
    status: "Active",
  },
  {
    id: "INS009",
    name: "University of Adelaide",
    status: "Inactive",
  },
  {
    id: "INS010",
    name: "Macquarie University",
    status: "Active",
  },
  {
    id: "INS011",
    name: "Queensland University of Technology",
    status: "Active",
  },
  {
    id: "INS012",
    name: "University of Technology Sydney",
    status: "Active",
  },
  {
    id: "INS013",
    name: "RMIT University",
    status: "Inactive",
  },
  {
    id: "INS014",
    name: "Curtin University",
    status: "Active",
  },
  {
    id: "INS015",
    name: "Deakin University",
    status: "Active",
  },
];

export function ManageInstitutionsProfile({
  onLogout,
  onBack,
  onCreateProfile,
  onViewProfile,
}: ManageInstitutionsProfileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [institutions, setInstitutions] = useState(institutionsData);
  const itemsPerPage = 10;

  // Filter institutions based on search and status
  const filteredInstitutions = institutions.filter((institution) => {
    const matchesSearch = institution.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      institution.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || institution.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredInstitutions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInstitutions = filteredInstitutions.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Handle delete institution
  const handleDeleteInstitution = (id: string) => {
    setInstitutions(institutions.filter((inst) => inst.id !== id));
    toast.success("Institution profile deleted successfully!");
  };

  // Handle view profile
  const handleViewProfile = (institution: typeof institutionsData[0]) => {
    onViewProfile({ institutionId: institution.id, institutionName: institution.name });
  };

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
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
              <p className="text-sm text-gray-600">Platform Manager Portal</p>
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
                <AvatarFallback>PM</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p>Platform Manager</p>
                <p className="text-sm text-gray-600">System Manager</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Manage Institutions Profile</CardTitle>
            <CardDescription>
              View and manage all institution profiles in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Bar, Status Filter, and Create Button */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by institution name or ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={handleStatusChange}>
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

              {/* Create Profile Button */}
              <Button onClick={onCreateProfile} className="w-full md:w-auto">
                Create Profile
              </Button>
            </div>

            {/* Institutions Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID No.</TableHead>
                    <TableHead>Institution Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInstitutions.length > 0 ? (
                    currentInstitutions.map((institution) => (
                      <TableRow key={institution.id}>
                        <TableCell>{institution.id}</TableCell>
                        <TableCell>{institution.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              institution.status === "Active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {institution.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProfile(institution)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Profile
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete Profile
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Institution Profile
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this profile "{institution.id}"?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex justify-center items-center gap-4">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteInstitution(institution.id)
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500 py-8"
                      >
                        No institutions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredInstitutions.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
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