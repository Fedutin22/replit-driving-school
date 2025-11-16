import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, Award, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface DashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  upcomingSessions: number;
  testsPassed: number;
  testsTotal: number;
  certificates: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    date: string;
  }>;
}

export default function Home() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Courses",
      value: stats?.enrolledCourses || 0,
      icon: BookOpen,
      description: "Currently enrolled",
      color: "text-blue-600",
    },
    {
      title: "Upcoming Sessions",
      value: stats?.upcomingSessions || 0,
      icon: Calendar,
      description: "This week",
      color: "text-green-600",
    },
    {
      title: "Tests Passed",
      value: `${stats?.testsPassed || 0}/${stats?.testsTotal || 0}`,
      icon: CheckCircle2,
      description: "Success rate",
      color: "text-primary",
    },
    {
      title: "Certificates",
      value: stats?.certificates || 0,
      icon: Award,
      description: "Earned",
      color: "text-amber-600",
    },
  ];

  const completionPercentage = stats?.enrolledCourses 
    ? Math.round(((stats?.completedCourses || 0) / stats.enrolledCourses) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-welcome">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your learning journey
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover-elevate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Course Completion</span>
                <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats?.completedCourses || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(stats?.enrolledCourses || 0) - (stats?.completedCourses || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.type}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate active-elevate-2">
          <CardHeader>
            <CardTitle className="text-base">Explore Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse available courses and enroll in new programs
            </p>
            <Button asChild variant="default" className="w-full" data-testid="button-explore-courses">
              <Link href="/courses">View Courses</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate active-elevate-2">
          <CardHeader>
            <CardTitle className="text-base">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Check your schedule and register for classes
            </p>
            <Button asChild variant="default" className="w-full" data-testid="button-view-schedule">
              <Link href="/schedule">View Schedule</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate active-elevate-2">
          <CardHeader>
            <CardTitle className="text-base">Take Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Complete assessments and track your performance
            </p>
            <Button asChild variant="default" className="w-full" data-testid="button-view-tests">
              <Link href="/tests">View Tests</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
