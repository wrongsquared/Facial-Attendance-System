import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowLeft,
  Search,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
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
import { toast } from "sonner";
import { useAuth } from "../cont/AuthContext";
import { Navbar } from "./Navbar";

interface ManageInstitutionsProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onCreateProfile: () => void;
  onViewProfile: (institutionData: { institutionId: string; institutionName: string }) => void;
}

interface InstitutionData {
  campusID: number;
  campusName: string;
  campusAddress: string;
  created_at: string;
}

export function ManageInstitutionsProfile({
  onLogout,
  onBack,
  onCreateProfile,
  onViewProfile,
}: ManageInstitutionsProfileProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // CHANGED: Initialized to empty string to allow placeholder to show
  const [sortOption, setSortOption] = useState<string>("");
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
        setInstitutions(data);
      } catch (err) {
        console.error("Error while fetching:", err);
        toast.error("Failed to load institutions");
      }
    };
    fetchAllInstitutions();
  }, [token]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const processedInstitutions = institutions
    .filter((institution) => {
      const matchesSearch =
        institution.campusName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        institution.campusID.toString().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      // If no sort option is selected, sort by ID (default)
      if (!sortOption) {
        return a.campusID - b.campusID;
      }

      switch (sortOption) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc":
          return a.campusName.localeCompare(b.campusName);
        case "name_desc":
          return b.campusName.localeCompare(a.campusName);
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(processedInstitutions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentInstitutions = processedInstitutions.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleDeleteInstitution = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/platform-manager/campus/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setInstitutions((prev) =>
          prev.filter((inst) => String(inst.campusID) !== String(id))
        );
        toast.success("Institution profile deleted successfully!");
      } else {
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
      <Navbar title="Platform Manager Portal" />

      <main className="container mx-auto px-4 py-8 flex-1">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Manage Campus Profile</CardTitle>
            <CardDescription>View and manage all campus profiles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search Campus by Name or ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-10 w-full"
                />
              </div>

              <div className="w-full md:w-[180px]">
                {/* 
                   Select Value is set to sortOption. 
                   Since sortOption is initially "", the placeholder below will be displayed.
                */}
                <Select value={sortOption} onValueChange={(v: string) => { setSortOption(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      {/* Placeholder "Sort By" shows when value is empty */}
                      <SelectValue placeholder="Sort By" className="font-bold"
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest Joined</SelectItem>
                    <SelectItem value="oldest">Oldest Joined</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={onCreateProfile} className="bg-blue-600 hover:bg-blue-700">
                Add Campus
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Campus Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentInstitutions.length > 0 ? (
                    currentInstitutions.map((institution) => (
                      <TableRow key={institution.campusID}>
                        <TableCell className="text-gray-600 font-medium">
                          #{institution.campusID}
                        </TableCell>
                        <TableCell className="font-medium">
                          {institution.campusName}
                          {new Date().getTime() - new Date(institution.created_at).getTime() < 7 * 24 * 60 * 60 * 1000}
                        </TableCell>
                        <TableCell className="truncate max-w-[200px]" title={institution.campusAddress}>
                          {institution.campusAddress}
                        </TableCell>
                        <TableCell>{formatDate(institution.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => onViewProfile({ institutionId: institution.campusID.toString(), institutionName: institution.campusName })}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent >
                                <AlertDialogHeader className="flex flex-col items-center text-center">
                                  <AlertDialogTitle>Delete Campus Profile</AlertDialogTitle>
                                  <AlertDialogDescription className="text-center">
                                    Are you sure you want to delete <strong>{institution.campusName}</strong>?<br />
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="sm:justify-center justify-center flex gap-4">
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInstitution(institution.campusID)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No Campus profiles found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {processedInstitutions.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}