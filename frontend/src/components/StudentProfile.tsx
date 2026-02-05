import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  ArrowLeft,
  Lock,
  ChevronLeft,
  ChevronRight,
  User,
  Camera,
  Upload,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { Navbar } from "./Navbar";
import { useAuth } from "../cont/AuthContext";
import { StudentProfileData } from "../types/studentinnards";
import { getStudentFullProfile, updateStudentProfile } from "../services/api";
import { ProfileUpdateData } from "../types/auth";

interface StudentProfileProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigateToProfile: () => void;
  onOpenNotifications: () => void;
}

export function StudentProfile({
  onNavigateToProfile,
  onBack,
  onOpenNotifications
}: StudentProfileProps) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Biometric enrollment state - true if enrolled, false if not
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(true);

  // Biometric dialog state
  const [showBiometricDialog, setShowBiometricDialog] = useState(false);
  const [showUpdateBiometricDialog, setShowUpdateBiometricDialog] = useState(false);
  const [showDeleteBiometricDialog, setShowDeleteBiometricDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock face images - in a real app, these would be fetched from the backend
  const faceImages = [
    { id: 1, label: "Front View" },
    { id: 2, label: "Left Profile" },
    { id: 3, label: "Right Profile" },
  ];

  const [saving, setSaving] = useState(false);

  // Validation error state
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Form State
  const [formData, setFormData] = useState<StudentProfileData>({
    name: "",
    email: "",
    studentNum: "",
    contactNumber: "",
    address: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: ""
  });

  // Validation function
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Personal Information validation
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = "Contact number is required";
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.contactNumber)) {
      errors.contactNumber = "Please enter a valid contact number";
    }

    if (!formData.address.trim()) {
      errors.address = "Address is required";
    }

    // Emergency Contact validation
    if (!formData.emergencyContactName.trim()) {
      errors.emergencyContactName = "Emergency contact name is required";
    }

    if (!formData.emergencyContactRelationship.trim()) {
      errors.emergencyContactRelationship = "Relationship is required";
    }

    if (!formData.emergencyContactNumber.trim()) {
      errors.emergencyContactNumber = "Emergency contact number is required";
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.emergencyContactNumber)) {
      errors.emergencyContactNumber = "Please enter a valid contact number";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!token || !user) return;

    // Validate form before saving
    if (!validateForm()) {
      return;
    }

    setSaving(true); // Disable button while saving

    // Prepare Data (Only send what is editable)
    const payload: ProfileUpdateData = {
      name: formData.name,
      email: formData.email,
      contactNumber: formData.contactNumber || "",
      address: formData.address || "",
      emergencyContactName: formData.emergencyContactName || "",
      emergencyContactRelationship: formData.emergencyContactRelationship || "",
      emergencyContactNumber: formData.emergencyContactNumber || ""
    };
    try {
      await updateStudentProfile(token, payload);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
      setIsEditMode(false);
    }
  };
  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const data = await getStudentFullProfile(token);
        // Populate Form
        // We use || "" to ensure inputs don't become uncontrolled if value is null
        setFormData({
          name: data.name || "",
          email: data.email || "",
          studentNum: data.studentNum || "",
          contactNumber: data.contactNumber || "",
          address: data.address || "",
          emergencyContactName: data.emergencyContactName || "",
          emergencyContactRelationship: data.emergencyContactRelationship || "",
          emergencyContactNumber: data.emergencyContactNumber || ""
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);
  // Handle Input Changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[id]) {
      setValidationErrors((prev) => ({
        ...prev,
        [id]: ""
      }));
    }
  };


  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Personal Information
  const handleCancel = () => {
    setIsEditMode(false);
    setValidationErrors({});
  };

  const handleUpdateProfile = () => {
    setIsEditMode(true);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? faceImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === faceImages.length - 1 ? 0 : prev + 1
    );
  };

  const startCamera = () => {
    setCameraError(null);

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera not supported in this browser. Please use file upload instead.');
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play();
        }
        streamRef.current = stream;
        setIsCameraActive(true);
      })
      .catch((err) => {
        // Suppress console error in development/preview environments
        if (err.name === 'NotFoundError') {
          setCameraError('No camera found. Please use file upload instead.');
        } else if (err.name === 'NotAllowedError') {
          setCameraError('Camera access denied. Please enable camera permissions.');
        } else {
          setCameraError('Unable to access camera. Please use file upload instead.');
        }
      });
  };

  const stopCamera = () => {
    const stream = streamRef.current;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        console.log('Captured photo:', dataURL);
        setPhotoCaptured(true);
        stopCamera();
      }
    }
  };

  // Cleanup camera when dialogs close
  useEffect(() => {
    if (!showUpdateBiometricDialog && !showEnrollDialog) {
      stopCamera();
      setPhotoCaptured(false);
    }
  }, [showUpdateBiometricDialog, showEnrollDialog]);

  if (loading) return <div className="p-10 text-center">Loading profile...</div>;
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar title="Student Profile" onNavigateToProfile={onNavigateToProfile} onOpenNotifications={onOpenNotifications} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">View Profile</h2>
          <p className="text-gray-600">
            {isEditMode
              ? "Update your personal information and emergency contacts"
              : "View your personal information and emergency contacts"}
          </p>
        </div>

        {/* Profile Form */}
        <div className="max-w-3xl">
          {/* Biometric Enrollment Profile */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Biometric Enrollment Profile</CardTitle>
              <CardDescription>
                Manage biometric data for attendance verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Face Recognition</span>
                  <span className={`font-semibold ${isBiometricEnrolled ? 'text-green-600' : 'text-red-600'}`}>
                    {isBiometricEnrolled ? 'Enrolled' : 'Not Enrolled'}
                  </span>
                </div>

                {isBiometricEnrolled ? (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      Last updated on 28 October 2025
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Your biometric data is currently being used for automated attendance
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowBiometricDialog(true)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowUpdateBiometricDialog(true)}
                      >
                        Update
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => setShowDeleteBiometricDialog(true)}
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Enroll your face profile to enable touchless attendance tracking on campus.
                    </p>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => setShowEnrollDialog(true)}
                    >
                      Take Photo
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 rounded-lg">
                <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  Biometric data is encrypted and stored securely according to university privacy policy. It is solely used for identity verification.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name:</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  className="h-12"
                  disabled // Shouldn't be allowed to change
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID:</Label>
                <Input
                  id="studentId"
                  type="text"
                  value={formData.studentNum}
                  className="h-12"
                  disabled // Shouldn't be allowed to change
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email:</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-12"
                  disabled // Shouldn't be allowed to change
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number: <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className={`h-12 ${validationErrors.contactNumber ? 'border-red-500' : ''}`}
                  disabled={!isEditMode}
                />
                {validationErrors.contactNumber && (
                  <p className="text-sm text-red-500">{validationErrors.contactNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address: <span className="text-red-500">*</span></Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className={`h-12 ${validationErrors.address ? 'border-red-500' : ''}`}
                  disabled={!isEditMode}
                />
                {validationErrors.address && (
                  <p className="text-sm text-red-500">{validationErrors.address}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>
                Provide emergency contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">
                  Contact Name: <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emergencyContactName"
                  type="text"
                  onChange={handleChange}
                  value={formData.emergencyContactName}
                  className={`h-12 ${validationErrors.emergencyContactName ? 'border-red-500' : ''}`}
                  disabled={!isEditMode}
                />
                {validationErrors.emergencyContactName && (
                  <p className="text-sm text-red-500">{validationErrors.emergencyContactName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">
                  Relationship: <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emergencyContactRelationship"
                  type="text"
                  onChange={handleChange}
                  value={formData.emergencyContactRelationship}
                  className={`h-12 ${validationErrors.emergencyContactRelationship ? 'border-red-500' : ''}`}
                  disabled={!isEditMode}
                />
                {validationErrors.emergencyContactRelationship && (
                  <p className="text-sm text-red-500">{validationErrors.emergencyContactRelationship}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactNumber">
                  Contact Number: <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="emergencyContactNumber"
                  type="tel"
                  onChange={handleChange}
                  value={formData.emergencyContactNumber}
                  className={`h-12 ${validationErrors.emergencyContactNumber ? 'border-red-500' : ''}`}
                  disabled={!isEditMode}
                />
                {validationErrors.emergencyContactNumber && (
                  <p className="text-sm text-red-500">{validationErrors.emergencyContactNumber}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {isEditMode ? (
            <div className="flex items-center justify-center gap-6 mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handleCancel}
                className="w-40"
              >
                Cancel
              </Button>

              <Button
                size="lg"
                onClick={handleSave}
                disabled={saving}
                className="w-40 bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center mt-6">
              <Button
                size="lg"
                onClick={handleUpdateProfile}
                className="w-48 bg-blue-600 text-white hover:bg-blue-700"
              >
                Update Profile
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* View Biometric Profile Dialog */}
      <Dialog open={showBiometricDialog} onOpenChange={setShowBiometricDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">View Biometric Profile</DialogTitle>
            <DialogDescription>
              View your enrolled biometric face data and verification images
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">User ID:</p>
                <p className="font-semibold">{formData.studentNum}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date Enrolled:</p>
                <p className="font-semibold">28/10/2025 10:30 AM</p>
              </div>
            </div>

            {/* Face Image Box */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="flex items-center justify-center gap-4">
                {/* Left Arrow */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousImage}
                  className="h-12 w-12"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>

                {/* Student Face Placeholder */}
                <div className="flex flex-col items-center gap-4">
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="h-32 w-32 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {faceImages[currentImageIndex].label}
                  </p>
                  <p className="text-xs text-gray-500">
                    Image {currentImageIndex + 1} of {faceImages.length}
                  </p>
                </div>

                {/* Right Arrow */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextImage}
                  className="h-12 w-12"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Biometric Profile Dialog */}
      <Dialog open={showUpdateBiometricDialog} onOpenChange={setShowUpdateBiometricDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Update Biometric Profile</DialogTitle>
            <DialogDescription>
              Capture a new photo to update your biometric profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">User ID:</p>
                <p className="font-semibold">{formData.studentNum}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated:</p>
                <p className="font-semibold">28/10/2025 10:30 AM</p>
              </div>
            </div>

            {/* Camera Preview Box */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                {cameraError ? (
                  <>
                    <div className="text-center">
                      <Camera className="h-24 w-24 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600 mb-4">{cameraError}</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('File uploaded:', file);
                          alert('Photo uploaded successfully!');
                          setPhotoCaptured(true);
                          setCameraError(null);
                        }
                      }}
                    />
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </>
                ) : isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      autoPlay
                      playsInline
                    />
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={capturePhoto}
                    >
                      Take Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Camera className="h-24 w-24 text-gray-400" />
                    <p className="text-gray-600">Camera preview will appear here</p>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={startCamera}
                    >
                      Start Camera
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpdateBiometricDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  alert('Biometric profile updated successfully!');
                  setShowUpdateBiometricDialog(false);
                }}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Biometric Profile Dialog */}
      <Dialog open={showDeleteBiometricDialog} onOpenChange={setShowDeleteBiometricDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Delete Biometric Profile</DialogTitle>
            <DialogDescription>
              Confirm deletion of your biometric data
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-center text-gray-700">
              This will remove the stored biometric data for:
            </p>
            <p className="text-center font-semibold mt-2">
              User: {formData.name} (User ID: {formData.studentNum})
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteBiometricDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                setIsBiometricEnrolled(false);
                alert('Biometric profile deleted');
                setShowDeleteBiometricDialog(false);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Biometric Profile Dialog */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Enroll Biometric Profile</DialogTitle>
            <DialogDescription>
              Capture a new photo to enroll your biometric profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">User ID:</p>
                <p className="font-semibold">{formData.studentNum}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated:</p>
                <p className="font-semibold">28/10/2025 10:30 AM</p>
              </div>
            </div>

            {/* Camera Preview Box */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                {cameraError ? (
                  <>
                    <div className="text-center">
                      <Camera className="h-24 w-24 text-red-400 mx-auto mb-4" />
                      <p className="text-red-600 mb-4">{cameraError}</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('File uploaded:', file);
                          alert('Photo uploaded successfully!');
                          setPhotoCaptured(true);
                          setCameraError(null);
                        }
                      }}
                    />
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                  </>
                ) : isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full"
                      autoPlay
                      playsInline
                    />
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={capturePhoto}
                    >
                      Take Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <Camera className="h-24 w-24 text-gray-400" />
                    <p className="text-gray-600">Camera preview will appear here</p>
                    <Button
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      onClick={startCamera}
                    >
                      Start Camera
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEnrollDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setIsBiometricEnrolled(true);
                  alert('Face photo captured successfully!');
                  setShowEnrollDialog(false);
                }}
              >
                Enroll
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}