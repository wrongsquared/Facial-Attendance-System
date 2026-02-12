import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { AlertTriangle, XCircle } from "lucide-react";
import { NotificationItem } from "../types/studentinnards";
import { useAuth } from "../cont/AuthContext";


interface NotificationAlertsProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: NotificationItem[];
  onDismissAlert: (id: number) => void;
}

export function NotificationAlerts({
  isOpen,
  onClose,
  alerts,
  onDismissAlert,
}: NotificationAlertsProps) {
  const { user } = useAuth();
  const handleCloseAlert = (index: number) => {
    console.log(`Close alert at index ${index}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notification Alerts</DialogTitle>
          <DialogDescription>Manage and respond to attendance alerts.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No notifications at this time.
            </div>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.notificationID} className="border-l-4 border-l-red-500">
                <CardContent className="pt-6">
                  {alert.type === "not_recorded" ? (
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg mb-4">Attendance Not Recorded</h3>

                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Student ID:</p>
                              <p className="font-medium">{user?.studentNum}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Student Name:</p>
                              <p className="font-medium">{user?.name}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Module:</p>
                              <p className="font-medium">
                                {alert.meta_data?.module_code} - {alert.meta_data?.module_name}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Date:</p>
                              <p className="font-medium">{alert.meta_data?.date}</p>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Attendance Status:</p>
                              <p className="font-medium text-red-600">{alert.type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Attendance Method:</p>
                              <p className="font-medium">Facial Detection</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Timestamp:</p>
                              <p className="font-medium">{new Date(alert.createdAt).toLocaleDateString()}</p>
                            </div>

                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center pt-4 border-t">
                        <Button onClick={() => handleCloseAlert(alert.notificationID)} variant="outline">
                          Close
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 mb-4">
                        <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg mb-4">Attendance Below Threshold</h3>

                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Student ID:</p>
                              <p className="font-medium">{user?.studentNum}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Student Name:</p>
                              <p className="font-medium">{user?.name}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Module:</p>
                              <p className="font-medium">{alert.meta_data?.module_code} - {alert.meta_data?.module_name}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Date:</p>
                              <p className="font-medium">{alert.meta_data?.date}</p>
                            </div>

                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Attendance Status:</p>
                              <p className="font-medium text-orange-600">{alert.type}</p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Current Attendance:</p>
                              <p className="font-medium">
                                {alert.meta_data?.current_pct}% (Threshold: {alert.meta_data?.threshold}%)
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Recent Sessions Missed:</p>
                              <p className="font-medium">
                                {alert.meta_data?.missed_count} of last {alert.meta_data?.total_expected}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600">Warning:</p>
                              <p className="font-medium">You are at risk of not meeting the minimum attendance requirement.</p>
                            </div>

                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center pt-4 border-t">
                        <Button onClick={() => onDismissAlert(alert.notificationID)} variant="outline">
                          Close
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}