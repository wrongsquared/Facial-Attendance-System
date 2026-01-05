import { useState, useEffect } from "react";
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
import { useAuth } from "../cont/AuthContext";

interface ManageInstitutionsProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onCreateProfile: () => void;
  onViewProfile: (institutionData: { institutionId: string; institutionName: string }) => void;
}

interface InstitutionData {
  universityID: number;
  universityName: string;
  subscriptionDate: string;
  isActive: boolean;
}

export function ManageInstitutionsProfile({
  onLogout,
  onBack,
  onCreateProfile,
  onViewProfile,
}: ManageInstitutionsProfileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [institutions, setInstitutions] = useState<InstitutionData[]>([]);
  const itemsPerPage = 10;

  const { token } = useAuth();

  useEffect(() => {
    const fetchAllInstitutions = async () => {
      try {
        const response = await fetch("http://localhost:8000/platform-manager/institutions", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        const data: InstitutionData[] = await response.json();

        // FIX: Sort Latest (2026) to Earliest (2021)
        const sortedData = [...data].sort((a, b) => {
          return new Date(b.subscriptionDate).getTime() - new Date(a.subscriptionDate).getTime();
        });

        setInstitutions(sortedData);
      } catch (err) {
        console.error("Error while fetching:", err);
      }
    };
    fetchAllInstitutions();
  }, [token]);

  // Date Formatter: "3 Aug 2022"
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const filteredInstitutions = institutions.filter((institution) => {
    const matchesSearch =
      institution.universityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      institution.universityID.toString().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? institution.isActive : !institution.isActive);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInstitutions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentInstitutions = filteredInstitutions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleDeleteInstitution = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/platform-manager/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // Ensure token is available from useAuth()
        },
      });

      if (response.ok) {
        // 1. Update the local state to remove the item from the UI
        setInstitutions((prev) =>
          prev.filter((inst) => String(inst.universityID) !== String(id))
        );

        // 2. Show success message
        toast.success("Institution profile deleted successfully!");
      } else {
        // Handle server-side errors (e.g., 404 or 401)
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to delete the institution.");
      }
    } catch (err) {
      console.error("Error while deleting:", err);
      toast.error("An error occurred while trying to delete the profile.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><BookOpen className="h-6 w-6 text-white" /></div>
            <div>
              <h1 className="text-2xl">Attendify</h1>
              <p className="text-sm text-gray-600">Platform Manager Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar><AvatarFallback>PM</AvatarFallback></Avatar>
              <div className="hidden md:block">
                <p className="font-medium">Platform Manager</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Manage Institutions Account</CardTitle>
            <CardDescription>View and manage all institution accounts in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search institutions..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={onCreateProfile}>Create Account</Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Updated Header to "No." */}
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Institution Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInstitutions.length > 0 ? (
                    currentInstitutions.map((institution, index) => (
                      <TableRow key={institution.universityID}>
                        {/* 1. Calculates Row Number: 1, 2, 3... */}
                        <TableCell className="text-gray-600 font-medium">
                           #{institution.universityID}
                        </TableCell>
                        <TableCell className="font-medium">{institution.universityName}</TableCell>
                        <TableCell>
                          <Badge variant={institution.isActive ? "default" : "secondary"}>
                            {institution.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        {/* 2. Date Column right-aligned and formatted */}
                        <TableCell className="text-center whitespace-nowrap">
                          {formatDate(institution.subscriptionDate)}
                        </TableCell>
                        {/* 3. Action Column centered */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => onViewProfile({ institutionId: institution.universityID.toString(), institutionName: institution.universityName })}>
                              <Eye className="h-4 w-4 mr-1" /> View Account
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete Account
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Institution Account</AlertDialogTitle>
                                  <AlertDialogDescription>Are you sure you want to delete "{institution.universityName}"?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex justify-center gap-4">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInstitution(institution.universityID)} className="bg-red-600">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No institutions found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredInstitutions.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => handlePageChange(page)} className="w-10">{page}</Button>
                ))}
                <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}