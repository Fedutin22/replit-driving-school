import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Award, TrendingUp, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TestInstance } from "@shared/schema";

interface Question {
  id: string;
  questionText: string;
  type: "single_choice" | "multiple_choice";
  choices: Array<{ label: string; isCorrect: boolean }>; // Server provides full data in results
}

interface TestInstanceWithData extends TestInstance {
  questionsData: Question[];
  answersData: Record<string, any>;
}

export default function TestResults() {
  const { instanceId } = useParams();
  const [, setLocation] = useLocation();

  const { data: testInstance, isLoading } = useQuery<TestInstanceWithData>({
    queryKey: ['/api/test-instances', instanceId],
    enabled: !!instanceId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground">Loading results...</div>
        </div>
      </div>
    );
  }

  if (!testInstance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground">Test results not found</div>
        </div>
      </div>
    );
  }

  const questions = testInstance.questionsData || [];
  const answers = testInstance.answersData || {};
  const percentage = testInstance.percentage || 0;
  const passed = testInstance.passed;
  const score = testInstance.score || 0;
  const totalQuestions = questions.length;

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/courses')}
            data-testid="button-back-to-courses"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold" data-testid="text-results-title">Test Results</h1>
        </div>

        {/* Results Summary */}
        <Card data-testid="card-results-summary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl" data-testid="text-score-percentage">
                  {percentage}%
                </CardTitle>
                <CardDescription>
                  {score} out of {totalQuestions} correct
                </CardDescription>
              </div>
              <div>
                {passed ? (
                  <div className="flex items-center gap-2 text-green-600" data-testid="badge-passed">
                    <CheckCircle2 className="h-8 w-8" />
                    <span className="text-lg font-semibold">Passed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive" data-testid="badge-failed">
                    <XCircle className="h-8 w-8" />
                    <span className="text-lg font-semibold">Not Passed</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={percentage} className="h-3" data-testid="progress-score" />
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center" data-testid="stat-correct">
              <div className="text-3xl font-bold text-green-600">{score}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="text-center" data-testid="stat-incorrect">
              <div className="text-3xl font-bold text-destructive">{totalQuestions - score}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
            <div className="text-center" data-testid="stat-total">
              <div className="text-3xl font-bold">{totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>Review your answers and see the correct solutions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => {
              const studentAnswer = answers[question.id];
              const correctChoices = question.choices
                .filter((c) => c.isCorrect)
                .map((c) => c.label);

              let isCorrect = false;
              if (question.type === "single_choice") {
                isCorrect = studentAnswer && correctChoices.includes(studentAnswer);
              } else if (question.type === "multiple_choice") {
                const studentChoices = studentAnswer || [];
                isCorrect =
                  correctChoices.length === studentChoices.length &&
                  correctChoices.every((c) => studentChoices.includes(c));
              }

              return (
                <Card
                  key={question.id}
                  className={isCorrect ? "border-green-500/50" : "border-destructive/50"}
                  data-testid={`card-review-question-${question.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" data-testid={`badge-question-number-${question.id}`}>
                            Question {index + 1}
                          </Badge>
                          {isCorrect ? (
                            <Badge variant="default" className="bg-green-600" data-testid={`badge-correct-${question.id}`}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge variant="destructive" data-testid={`badge-incorrect-${question.id}`}>
                              <XCircle className="h-3 w-3 mr-1" />
                              Incorrect
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-base font-semibold text-foreground" data-testid={`text-review-question-${question.id}`}>
                          {question.questionText}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-2">Your Answer:</div>
                      <div className="text-sm" data-testid={`text-student-answer-${question.id}`}>
                        {question.type === "single_choice" ? (
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {studentAnswer || "Not answered"}
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {studentAnswer && studentAnswer.length > 0 ? (
                              studentAnswer.map((ans: string, i: number) => (
                                <Badge key={i} variant={isCorrect ? "default" : "destructive"}>
                                  {ans}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="destructive">Not answered</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isCorrect && (
                      <div>
                        <div className="text-sm font-medium mb-2">Correct Answer:</div>
                        <div className="text-sm flex flex-wrap gap-2" data-testid={`text-correct-answer-${question.id}`}>
                          {correctChoices.map((choice, i) => (
                            <Badge key={i} variant="default" className="bg-green-600">
                              {choice}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => setLocation('/courses')}
            data-testid="button-return-to-courses"
          >
            Return to My Courses
          </Button>
        </div>
      </div>
    </div>
  );
}
