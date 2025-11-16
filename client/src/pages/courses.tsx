import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, DollarSign, CheckCircle2, XCircle, Calendar } from "lucide-react";
import type { Course, CourseEnrollment, Payment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

interface CourseWithEnrollment extends Course {
  enrollment?: CourseEnrollment;
  payment?: Payment;
  progress?: number;
  completedTopics?: number;
  totalTopics?: number;
  scheduleCount: number;
}

export default function Courses() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: courses, isLoading } = useQuery<CourseWithEnrollment[]>({
    queryKey: ["/api/courses"],
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("POST", `/api/courses/${courseId}/enroll`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: "Enrolled Successfully",
        description: "You have been enrolled in the course",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Enrollment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const enrolledCourses = courses?.filter((c) => c.enrollment) || [];
  const availableCourses = courses?.filter((c) => !c.enrollment && c.isActive) || [];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-courses">
          My Courses
        </h1>
        <p className="text-muted-foreground">
          Manage your enrolled courses and explore new programs
        </p>
      </div>

      {enrolledCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Enrolled Courses</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <Card key={course.id} className="hover-elevate" data-testid={`card-course-${course.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-base">{course.name}</CardTitle>
                    {course.enrollment?.completedAt ? (
                      <Badge variant="default" className="bg-green-600 text-white flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex-shrink-0">In Progress</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {course.category && (
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{course.category}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground" data-testid={`text-schedule-count-${course.id}`}>
                      {course.scheduleCount} {course.scheduleCount === 1 ? 'session' : 'sessions'} scheduled
                    </span>
                  </div>
                  {course.progress !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  )}
                  {course.payment && (
                    <div className="flex items-center gap-2 text-sm">
                      {course.payment.status === "paid" ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Payment Confirmed</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-amber-600">Payment Pending</span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="default" className="w-full" asChild data-testid={`button-view-course-${course.id}`}>
                    <a href={`/courses/${course.id}`}>View Course</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {availableCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {availableCourses.map((course) => (
              <Card key={course.id} className="hover-elevate" data-testid={`card-available-course-${course.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{course.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.category && (
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{course.category}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground" data-testid={`text-schedule-count-available-${course.id}`}>
                      {course.scheduleCount} {course.scheduleCount === 1 ? 'session' : 'sessions'} scheduled
                    </span>
                  </div>
                  {course.price && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">${parseFloat(course.price).toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => enrollMutation.mutate(course.id)}
                    disabled={enrollMutation.isPending}
                    data-testid={`button-enroll-${course.id}`}
                  >
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {enrolledCourses.length === 0 && availableCourses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No courses available</p>
            <p className="text-sm text-muted-foreground">Check back later for new courses</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
