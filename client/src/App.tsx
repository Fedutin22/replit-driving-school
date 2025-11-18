import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import Home from "@/pages/home";
import Courses from "@/pages/courses";
import CourseDetail from "@/pages/course-detail";
import Tests from "@/pages/tests";
import TakeTest from "@/pages/take-test";
import TestResults from "@/pages/test-results";
import SchedulePage from "@/pages/schedule";
import Payments from "@/pages/payments";
import Certificates from "@/pages/certificates";
import Questions from "@/pages/questions";
import QuestionCategories from "@/pages/question-categories";
import QuestionTopics from "@/pages/question-topics";
import InstructorAttendance from "@/pages/instructor/attendance";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminEnrollments from "@/pages/admin/enrollments";
import AdminCourses from "@/pages/admin/courses";
import AdminTestTemplates from "@/pages/admin/test-templates";
import AdminQuestions from "@/pages/admin/questions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/courses" component={Courses} />
          <Route path="/courses/:courseId" component={CourseDetail} />
          <Route path="/tests" component={Tests} />
          <Route path="/tests/:testId/take" component={TakeTest} />
          <Route path="/assessments/:assessmentId/take" component={TakeTest} />
          <Route path="/test-results/:instanceId" component={TestResults} />
          <Route path="/schedule" component={SchedulePage} />
          <Route path="/payments" component={Payments} />
          <Route path="/certificates" component={Certificates} />
          <Route path="/question-categories" component={QuestionCategories} />
          <Route path="/question-topics/:categoryId" component={QuestionTopics} />
          <Route path="/questions/:topicId" component={Questions} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/enrollments" component={AdminEnrollments} />
          <Route path="/admin/courses" component={AdminCourses} />
          <Route path="/admin/test-templates" component={AdminTestTemplates} />
          <Route path="/admin/questions" component={AdminQuestions} />
          <Route path="/admin/schedule" component={SchedulePage} />
          <Route path="/instructor/schedule" component={SchedulePage} />
          <Route path="/instructor/attendance" component={InstructorAttendance} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      {isAuthenticated ? (
        <SidebarProvider style={sidebarStyle}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b border-border bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <Button variant="ghost" size="sm" asChild data-testid="button-logout">
                  <a href="/api/logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </a>
                </Button>
              </header>
              <main className="flex-1 overflow-auto bg-background">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
      ) : (
        <Router />
      )}
      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
