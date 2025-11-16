import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import type { TestInstance, TestTemplate } from "@shared/schema";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

interface TestWithTemplate extends TestInstance {
  template?: TestTemplate;
}

interface AvailableTest extends TestTemplate {
  courseName?: string;
  canTake: boolean;
}

export default function Tests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: testResults, isLoading: resultsLoading } = useQuery<TestWithTemplate[]>({
    queryKey: ["/api/tests/results"],
  });

  const { data: availableTests, isLoading: availableLoading } = useQuery<AvailableTest[]>({
    queryKey: ["/api/tests/available"],
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

  const isLoading = resultsLoading || availableLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
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

  const completedTests = testResults?.filter((t) => t.submittedAt) || [];
  const pendingTests = testResults?.filter((t) => !t.submittedAt) || [];

  const passedCount = completedTests.filter((t) => t.passed).length;
  const failedCount = completedTests.filter((t) => !t.passed).length;
  const avgScore =
    completedTests.length > 0
      ? Math.round(
          completedTests.reduce((sum, t) => sum + (t.percentage || 0), 0) / completedTests.length
        )
      : 0;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-tests">
          Tests & Assessments
        </h1>
        <p className="text-muted-foreground">
          Take tests and track your performance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Passed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-tests-passed">{passedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-tests-failed">{failedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-score">{avgScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {availableTests && availableTests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Tests</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {availableTests.map((test) => (
              <Card key={test.id} className="hover-elevate" data-testid={`card-available-test-${test.id}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span>{test.name}</span>
                    {test.courseName && (
                      <Badge variant="secondary" className="flex-shrink-0 text-xs">{test.courseName}</Badge>
                    )}
                  </CardTitle>
                  {test.description && (
                    <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <FileQuestion className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {test.mode === "random"
                        ? `${test.questionCount} random questions`
                        : "Selected questions"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Pass at {test.passingPercentage}%
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={!test.canTake}
                    asChild={test.canTake}
                    data-testid={`button-start-test-${test.id}`}
                  >
                    {test.canTake ? (
                      <a href={`/tests/${test.id}/take`}>Start Test</a>
                    ) : (
                      <span>Not Available</span>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingTests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">In Progress</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingTests.map((test) => (
              <Card key={test.id} className="border-amber-600/50" data-testid={`card-pending-test-${test.id}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    {test.template?.name || "Test"}
                  </CardTitle>
                  <CardDescription>
                    Started {format(new Date(test.startedAt), "MMM d, yyyy 'at' h:mm a")}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="default" className="w-full" asChild data-testid={`button-continue-test-${test.id}`}>
                    <a href={`/tests/instance/${test.id}`}>Continue Test</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completedTests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Test History</h2>
          <div className="space-y-3">
            {completedTests.map((test) => (
              <Card key={test.id} className="hover-elevate" data-testid={`card-result-${test.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{test.template?.name || "Test"}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(test.submittedAt!), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{test.percentage}%</p>
                        <p className="text-xs text-muted-foreground">{test.score} points</p>
                      </div>
                      {test.passed ? (
                        <Badge variant="default" className="bg-green-600 text-white">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!availableTests?.length && !pendingTests.length && !completedTests.length && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No tests available</p>
            <p className="text-sm text-muted-foreground">Complete course enrollment to access tests</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
