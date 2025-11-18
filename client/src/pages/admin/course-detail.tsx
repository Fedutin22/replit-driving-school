import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, Calendar, ClipboardCheck, Users, GraduationCap } from "lucide-react";
import type { Course } from "@shared/schema";
import { CourseContentManager } from "./course-content-manager.tsx";
import { ScheduleManager } from "./schedule-manager.tsx";
import { EnrolledStudents } from "./enrolled-students.tsx";
import { CoursePostsManager } from "./course-posts-manager.tsx";
import { CourseAssessmentsManager } from "./course-assessments-manager.tsx";

type CourseWithCounts = Course & { 
  scheduleCount: number; 
  topicCount: number; 
  postCount: number;
  studentCount: number;
  passedCount: number;
  instructorIds: string[];
};

export default function AdminCourseDetail() {
  const [, params] = useRoute("/admin/courses/:id");
  const courseId = params?.id;
  const [activeTab, setActiveTab] = useState("topics");

  const { data: courses, isLoading } = useQuery<CourseWithCounts[]>({
    queryKey: ["/api/admin/courses"],
  });

  const course = courses?.find(c => c.id === courseId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Course not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/courses">Courses</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{course.name}</h1>
              <Badge variant={course.isActive ? "default" : "secondary"}>
                {course.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
            )}
            {course.category && (
              <Badge variant="outline" className="mt-2">{course.category}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Topics
              </CardDescription>
              <CardTitle className="text-2xl">{course.topicCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Posts
              </CardDescription>
              <CardTitle className="text-2xl">{course.postCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students
              </CardDescription>
              <CardTitle className="text-2xl">{course.studentCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Passed
              </CardDescription>
              <CardTitle className="text-2xl">{course.passedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sessions
              </CardDescription>
              <CardTitle className="text-2xl">{course.scheduleCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="topics" data-testid="tab-topics">
              <BookOpen className="h-4 w-4 mr-2" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-posts">
              <FileText className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="assessments" data-testid="tab-assessments">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Assessments
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="students" data-testid="tab-students">
              <Users className="h-4 w-4 mr-2" />
              Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="mt-6">
            <CourseContentManager course={course} open={true} onClose={() => {}} />
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <CoursePostsManager courseId={course.id} />
          </TabsContent>

          <TabsContent value="assessments" className="mt-6">
            <CourseAssessmentsManager courseId={course.id} />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <ScheduleManager course={course} open={true} onClose={() => {}} />
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            <EnrolledStudents course={course} open={true} onClose={() => {}} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
