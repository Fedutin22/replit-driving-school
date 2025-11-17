import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import type { Course } from "@shared/schema";

type EnrolledStudent = {
  enrollment: {
    id: string;
    courseId: string;
    studentId: string;
    enrolledAt: string;
    completedAt: string | null;
    isActive: boolean;
  };
  student: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  testProgress: Array<{
    assessmentId: string;
    assessmentName: string;
    topicName: string;
    attempts: number;
    passed: boolean;
    bestScore: number | null;
    lastAttemptDate: Date | null;
  }>;
};

interface EnrolledStudentsProps {
  course: Course;
  open: boolean;
  onClose: () => void;
}

export function EnrolledStudents({ course, open, onClose }: EnrolledStudentsProps) {
  const { data: students, isLoading } = useQuery<EnrolledStudent[]>({
    queryKey: [`/api/admin/courses/${course.id}/enrolled-students`],
    enabled: open,
  });

  const getStudentName = (student: EnrolledStudent["student"]) => {
    if (student.firstName || student.lastName) {
      return `${student.firstName || ""} ${student.lastName || ""}`.trim();
    }
    return student.email || "Unknown Student";
  };

  const getOverallProgress = (progress: EnrolledStudent["testProgress"]) => {
    if (progress.length === 0) return { total: 0, passed: 0, percentage: 0 };
    const passed = progress.filter(p => p.passed).length;
    const total = progress.length;
    const percentage = Math.round((passed / total) * 100);
    return { total, passed, percentage };
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Enrolled Students - {course.name}</DialogTitle>
          <DialogDescription>
            View student enrollment status and test progress
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-8rem)]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : !students || students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mb-4 opacity-50" />
              <p>No students enrolled in this course yet.</p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {students.map((student) => {
                const progress = getOverallProgress(student.testProgress);
                const studentName = getStudentName(student.student);

                return (
                  <Card key={student.enrollment.id} data-testid={`card-student-${student.student.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span data-testid={`text-student-name-${student.student.id}`}>
                              {studentName}
                            </span>
                          </CardTitle>
                          {student.student.email && (
                            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-student-email-${student.student.id}`}>
                              {student.student.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {student.enrollment.completedAt ? (
                            <Badge data-testid={`badge-completed-${student.student.id}`}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid={`badge-in-progress-${student.student.id}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Enrolled</p>
                          <p className="text-sm font-medium" data-testid={`text-enrolled-date-${student.student.id}`}>
                            {new Date(student.enrollment.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Overall Progress</p>
                          <p className="text-sm font-semibold" data-testid={`text-progress-${student.student.id}`}>
                            {progress.passed} / {progress.total} Tests ({progress.percentage}%)
                          </p>
                        </div>
                        {student.enrollment.completedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Completed</p>
                            <p className="text-sm font-medium" data-testid={`text-completed-date-${student.student.id}`}>
                              {new Date(student.enrollment.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-3">Test Progress</h4>
                        {student.testProgress.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No assessments available for this course.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {student.testProgress.map((test) => (
                              <div
                                key={test.assessmentId}
                                className="flex items-center justify-between gap-4 p-3 rounded-md border"
                                data-testid={`test-progress-${student.student.id}-${test.assessmentId}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {test.passed ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <p className="text-sm font-medium truncate" title={test.assessmentName}>
                                      {test.assessmentName}
                                    </p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Topic: {test.topicName}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Attempts</p>
                                    <p className="text-sm font-semibold" data-testid={`text-attempts-${student.student.id}-${test.assessmentId}`}>
                                      {test.attempts}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Best Score</p>
                                    <p className="text-sm font-semibold" data-testid={`text-best-score-${student.student.id}-${test.assessmentId}`}>
                                      {test.bestScore !== null ? `${test.bestScore}%` : "-"}
                                    </p>
                                  </div>
                                  {test.passed && (
                                    <Badge variant="default">
                                      Passed
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
