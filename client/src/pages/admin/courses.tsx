import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, BookOpen, Filter, ChevronRight } from "lucide-react";
import type { Course, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";

const courseSchema = z.object({
  name: z.string().min(1, "Course name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.string().optional(),
});

type CourseForm = z.infer<typeof courseSchema>;
type CourseWithCounts = Course & { 
  scheduleCount: number; 
  topicCount: number; 
  postCount: number;
  studentCount: number;
  passedCount: number;
  instructorIds: string[];
};

export default function AdminCourses() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");

  const { data: courses, isLoading } = useQuery<CourseWithCounts[]>({
    queryKey: ["/api/admin/courses"],
  });

  const { data: instructors } = useQuery<User[]>({
    queryKey: ["/api/instructors"],
  });

  const form = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      price: "",
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: CourseForm) => {
      if (editingCourse) {
        await apiRequest("PATCH", `/api/admin/courses/${editingCourse.id}`, data);
      } else {
        await apiRequest("POST", "/api/admin/courses", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      setIsDialogOpen(false);
      setEditingCourse(null);
      form.reset();
      toast({
        title: editingCourse ? "Course Updated" : "Course Created",
        description: `Course has been ${editingCourse ? "updated" : "created"} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      form.reset({
        name: course.name,
        description: course.description || "",
        category: course.category || "",
        price: course.price || "",
      });
    } else {
      setEditingCourse(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: CourseForm) => {
    createOrUpdateMutation.mutate(data);
  };

  // Filter courses by instructor
  const filteredCourses = courses?.filter((course) => {
    if (selectedInstructor === "all") return true;
    return course.instructorIds.includes(selectedInstructor);
  });

  // Get unique instructors from courses
  const instructorsList = instructors?.filter((u) => u.role === "instructor") || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Course Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage courses for your driving school
          </p>
        </div>
        <div className="flex items-center gap-2">
          {instructorsList.length > 0 && (
            <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
              <SelectTrigger className="w-[200px]" data-testid="select-instructor-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Instructors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-all-instructors">All Instructors</SelectItem>
                {instructorsList.map((instructor) => (
                  <SelectItem 
                    key={instructor.id} 
                    value={instructor.id}
                    data-testid={`option-instructor-${instructor.id}`}
                  >
                    {instructor.firstName} {instructor.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} data-testid="button-create-course">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
                <DialogDescription>
                  {editingCourse ? "Update course details" : "Add a new course to your driving school"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-course-name" placeholder="e.g., Basic Driving Course" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            data-testid="input-course-description"
                            placeholder="Describe the course content and objectives..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input data-testid="input-course-category" placeholder="e.g., Beginner" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input data-testid="input-course-price" type="number" step="0.01" placeholder="299.99" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createOrUpdateMutation.isPending}
                      data-testid="button-save-course"
                    >
                      {createOrUpdateMutation.isPending ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            All Courses ({filteredCourses?.length || 0})
          </h2>
        </div>
        
        {!filteredCourses || filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {selectedInstructor === "all" 
                    ? "No courses yet. Create your first course to get started." 
                    : "No courses found for the selected instructor."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead className="text-center">Topics</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Passed</TableHead>
                  <TableHead className="text-center">Sessions</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow 
                    key={course.id} 
                    className="hover-elevate cursor-pointer"
                    data-testid={`row-course-${course.id}`}
                  >
                    <TableCell>
                      <Link href={`/admin/courses/${course.id}`}>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium" data-testid={`text-name-${course.id}`}>
                            {course.name}
                          </span>
                          {course.description && (
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {course.description}
                            </span>
                          )}
                          {course.category && (
                            <Badge variant="outline" className="w-fit" data-testid={`badge-category-${course.id}`}>
                              {course.category}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-topics-${course.id}`}>
                      <Badge variant="secondary">{course.topicCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-students-${course.id}`}>
                      <Badge variant="secondary">{course.studentCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-passed-${course.id}`}>
                      <Badge variant="secondary">{course.passedCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-sessions-${course.id}`}>
                      <Badge variant="secondary">{course.scheduleCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={course.isActive ? "default" : "secondary"} 
                        data-testid={`badge-status-${course.id}`}
                      >
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenDialog(course);
                          }}
                          data-testid={`button-edit-course-${course.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/courses/${course.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-view-course-${course.id}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
