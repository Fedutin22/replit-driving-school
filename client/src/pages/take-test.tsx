import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TestInstance } from "@shared/schema";

interface Question {
  id: string;
  questionText: string;
  type: "single_choice" | "multiple_choice";
  choices: Array<{ label: string }>; // No isCorrect flag - kept server-side only
  orderIndex: number;
}

interface TestStartResponse {
  testInstance: TestInstance;
  questions: Question[];
  timeLimit: number | null; // Time limit in minutes
}

export default function TakeTest() {
  const { testId, assessmentId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [testData, setTestData] = useState<TestStartResponse | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null); // Time remaining in seconds (for display)
  const timeRemainingRef = useRef<number | null>(null); // Ref to hold current time remaining
  const hasAutoSubmitted = useRef(false); // Prevent multiple auto-submissions
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Hold the interval reference

  // Start the test on mount
  useEffect(() => {
    const id = testId || assessmentId;
    if (id) {
      const endpoint = testId 
        ? `/api/tests/${testId}/start`
        : `/api/assessments/${assessmentId}/start`;
        
      apiRequest("POST", endpoint)
        .then((res) => res.json())
        .then((data: TestStartResponse) => {
          setTestData(data);
          setIsStarting(false);
        })
        .catch((error) => {
          console.error("Failed to start test:", error);
          setIsStarting(false);
        });
    }
  }, [testId, assessmentId]);

  // Timer effect - runs once when testData is loaded
  useEffect(() => {
    if (!testData || !testData.timeLimit || timerRef.current) return;

    // Initialize time remaining
    const initialTime = testData.timeLimit * 60; // Convert minutes to seconds
    timeRemainingRef.current = initialTime;
    setTimeRemaining(initialTime);

    // Start countdown interval (runs once per test)
    timerRef.current = setInterval(() => {
      if (timeRemainingRef.current === null || timeRemainingRef.current <= 0) {
        return;
      }

      timeRemainingRef.current -= 1;
      setTimeRemaining(timeRemainingRef.current);

      // Auto-submit when time reaches zero
      if (timeRemainingRef.current === 0 && !hasAutoSubmitted.current && !submitMutation.isPending) {
        hasAutoSubmitted.current = true;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        toast({
          title: "Time's Up!",
          description: "The test is being automatically submitted.",
          variant: "destructive",
        });
        submitMutation.mutate();
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [testData]);

  // Submit test mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!testData) throw new Error("No test data");
      const res = await apiRequest("POST", `/api/test-instances/${testData.testInstance.id}/submit`, { answers });
      const result: any = await res.json();
      return result;
    },
    onSuccess: (result: any) => {
      // Clear timer on successful submission
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      toast({
        title: "Test Submitted",
        description: result.passed
          ? `Congratulations! You scored ${result.percentage}%`
          : `You scored ${result.percentage}%. The passing score is 70%.`,
      });
      if (testData) {
        setLocation(`/test-results/${testData.testInstance.id}`);
      }
    },
    onError: () => {
      // Don't clear timer on error - allow student to retry
      toast({
        title: "Error",
        description: "Failed to submit test. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isStarting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground">Loading test...</div>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground">Failed to load test</div>
        </div>
      </div>
    );
  }

  const { questions } = testData;

  // Format time remaining as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Check if test has no questions
  if (!questions || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This test has no questions. Please contact your instructor or administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  const handleSingleChoice = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleMultipleChoice = (questionId: string, value: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, value] };
      } else {
        return { ...prev, [questionId]: current.filter((v: string) => v !== value) };
      }
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (answeredCount < questions.length) {
      const confirmed = window.confirm(
        `You have answered ${answeredCount} out of ${questions.length} questions. Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Progress Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold" data-testid="text-test-title">Test in Progress</h1>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div 
                  className={`flex items-center gap-2 font-medium ${
                    timeRemaining < 300 ? 'text-destructive' : 'text-foreground'
                  }`}
                  data-testid="text-time-remaining"
                >
                  <Clock className="h-4 w-4" />
                  {formatTime(timeRemaining)}
                </div>
              )}
              <div className="text-sm text-muted-foreground" data-testid="text-progress">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
          <div className="text-sm text-muted-foreground" data-testid="text-answered-count">
            Answered: {answeredCount}/{questions.length}
          </div>
        </div>

        {/* Question Card */}
        <Card data-testid={`card-question-${currentQuestion.id}`}>
          <CardHeader>
            <CardTitle className="text-lg" data-testid={`text-question-${currentQuestion.id}`}>
              {currentQuestion.questionText}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.type === "single_choice" ? (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleSingleChoice(currentQuestion.id, value)}
                data-testid={`radio-group-${currentQuestion.id}`}
              >
                {currentQuestion.choices.map((choice: { label: string }, index: number) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2"
                    data-testid={`radio-option-${currentQuestion.id}-${index}`}
                  >
                    <RadioGroupItem value={choice.label} id={`choice-${index}`} />
                    <Label htmlFor={`choice-${index}`} className="cursor-pointer flex-1">
                      {choice.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2" data-testid={`checkbox-group-${currentQuestion.id}`}>
                {currentQuestion.choices.map((choice: { label: string }, index: number) => {
                  const currentAnswers = answers[currentQuestion.id] || [];
                  const isChecked = currentAnswers.includes(choice.label);
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-2"
                      data-testid={`checkbox-option-${currentQuestion.id}-${index}`}
                    >
                      <Checkbox
                        id={`choice-${index}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleMultipleChoice(currentQuestion.id, choice.label, checked as boolean)
                        }
                      />
                      <Label htmlFor={`choice-${index}`} className="cursor-pointer flex-1">
                        {choice.label}
                      </Label>
                    </div>
                  );
                })}
                <p className="text-sm text-muted-foreground mt-2">
                  Select all that apply
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              data-testid="button-previous-question"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                data-testid="button-submit-test"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Test"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                data-testid="button-next-question"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Answer Status Alert */}
        {!answers[currentQuestion.id] && (
          <Alert data-testid="alert-unanswered">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This question has not been answered yet
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
