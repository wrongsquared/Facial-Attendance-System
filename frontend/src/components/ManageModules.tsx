import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, ArrowLeft, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { getAdminModuleList, deleteModule } from "../services/api";

interface ModuleData {
  moduleID: string;
  moduleCode: string;
  moduleName: string;
  startDate: string | null;
  endDate: string | null;
  lecturerID?: string | null;
}

interface ManageModulesProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToCreateModule?: () => void;
  onNavigateToUpdateModule?: (moduleData: ModuleData) => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

export function ManageModules({
  onBack,
  onNavigateToProfile,
  onNavigateToCreateModule,
  onNavigateToUpdateModule,
  refreshTrigger,
}: ManageModulesProps) {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 30;
  const [moduleToDelete, setModuleToDelete] = useState<ModuleData | null>(null);

  const { token } = useAuth();

  useEffect(() => {
    const fetchModules = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          setLoading(false);
          return;
        }

        console.log("Fetching modules...");
        const data = await getAdminModuleList(token);
        console.log("Modules data received:", data);
        setModules(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching modules:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch modules');
        setLoading(false);
      }
    };

    fetchModules();
  }, [token, refreshTrigger]); // Add refreshTrigger to dependency array

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, moduleFilter]);

  // Filter modules based on search and module filter
  const filteredModules = modules.filter(module => {
    const matchesSearch = module.moduleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.moduleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === "all" || module.moduleCode === moduleFilter;

    return matchesSearch && matchesModule;
  });

  // Pagination
  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedModules = filteredModules.slice(startIndex, startIndex + itemsPerPage);

  const handleAddModule = () => {
    if (onNavigateToCreateModule) {
      onNavigateToCreateModule();
    }
  };

  const handleEditModule = (moduleId: string) => {
    const module = modules.find(m => m.moduleID === moduleId);
    if (module && onNavigateToUpdateModule) {
      onNavigateToUpdateModule(module);
    }
  };

  const handleDeleteClick = (moduleId: string) => {
    const module = modules.find(m => m.moduleID === moduleId);
    if (module) {
      setModuleToDelete(module);
    }
  };

  const confirmDelete = async () => {
    if (!moduleToDelete || !token) return;


    try {
      await deleteModule(moduleToDelete.moduleID, token);

      // Remove the module from local state
      setModules(prevModules =>
        prevModules.filter(module => module.moduleID !== moduleToDelete.moduleID)
      );

      // Close dialog and reset state
      setModuleToDelete(null);

    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module. Please try again.');
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
          Back to Dashboard
        </Button>

        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Modules</h1>
          <p className="text-gray-600 mt-1">Create, edit, and manage academic modules</p>
        </div>

        {/* Modules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Modules</CardTitle>
            <CardDescription>
              Create, edit, and manage academic modules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filter Header */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by module code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Module Filter */}
              <div className="w-48">
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {modules.map(module => (
                      <SelectItem key={module.moduleID} value={module.moduleCode}>
                        {module.moduleCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add New Module Button */}
              <Button onClick={handleAddModule} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Module
              </Button>
            </div>

            {/* Modules Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Module Code</TableHead>
                    <TableHead className="text-center">Module Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-gray-500 py-8"
                      >
                        Loading modules...
                      </TableCell>
                    </TableRow>
                  ) : paginatedModules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No modules found matching your search criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedModules.map((module) => (
                      <TableRow key={module.moduleID}>
                        <TableCell className="font-medium text-center">{module.moduleCode}</TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium">{module.moduleName}</div>
                        </TableCell>
                        <TableCell>{module.startDate ? new Date(module.startDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>{module.endDate ? new Date(module.endDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditModule(module.moduleID)}
                            >
                              Update
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(module.moduleID)}
                                >
                                  Delete
                                </Button>
                              </AlertDialogTrigger>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-black">
                                    Delete Module
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-black">
                                    Are you sure you want to delete <strong>"{moduleToDelete?.moduleName} ({moduleToDelete?.moduleCode})"</strong>
                                  </AlertDialogDescription>
                                  <AlertDialogDescription className="text-black">
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter className="flex flex-row justify-center items-center gap-4 sm:justify-center">
                                  <AlertDialogCancel onClick={() => setModuleToDelete(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={confirmDelete}
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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