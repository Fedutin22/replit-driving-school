import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle2, GraduationCap } from "lucide-react";
import type { User, CourseEnrollment, Course } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";

type EnrollmentWithDetails = CourseEnrollment & { course: Course; student: User };

export default function AdminEnrollments() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: enrollments, isLoading } = useQuery<EnrollmentWithDetails[]>({
    queryKey: ["/api/admin/enrollments"],
  });

  const filteredEnrollments = enrollments?.filter((enrollment) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      enrollment.student.firstName?.toLowerCase().includes(searchLower) ||
      enrollment.student.lastName?.toLowerCase().includes(searchLower) ||
      enrollment.student.email?.toLowerCase().includes(searchLower) ||
      enrollment.course.name.toLowerCase().includes(searchLower) ||
      enrollment.course.category?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-enrollments">
            Course Enrollments
          </h1>
          <p className="text-muted-foreground">
            Track student progress and enrollment status across all courses
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, email, or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-enrollments"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments && filteredEnrollments.length > 0 ? (
                filteredEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id} data-testid={`row-enrollment-${enrollment.id}`}>
                    <TableCell className="font-medium">
                      {enrollment.student.firstName} {enrollment.student.lastName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {enrollment.student.email}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/courses/${enrollment.course.id}`} data-testid={`link-course-${enrollment.id}`}>
                        <div className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1 -mx-2 -my-1">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-primary underline-offset-4 hover:underline">{enrollment.course.name}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{enrollment.course.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {enrollment.completedAt ? (
                        <Badge variant="default" className="bg-green-600" data-testid={`badge-completed-${enrollment.id}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : enrollment.isActive ? (
                        <Badge variant="secondary" data-testid={`badge-active-${enrollment.id}`}>In Progress</Badge>
                      ) : (
                        <Badge variant="outline" data-testid={`badge-inactive-${enrollment.id}`}>Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-enrolled-date-${enrollment.id}`}>
                      {format(new Date(enrollment.enrolledAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-completed-date-${enrollment.id}`}>
                      {enrollment.completedAt
                        ? format(new Date(enrollment.completedAt), "MMM d, yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No enrollments found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
