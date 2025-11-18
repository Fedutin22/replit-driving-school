import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, Hash } from "lucide-react";
import type { TopicAssessment, Topic, Course } from "@shared/schema";

interface CourseAssessmentsManagerProps {
  courseId: string;
}

type TopicWithAssessments = Topic & { assessments: TopicAssessment[] };
type CourseContent = { course: Course; topics: TopicWithAssessments[]; };

export function CourseAssessmentsManager({ courseId }: CourseAssessmentsManagerProps) {
  const { data: courseContent, isLoading } = useQuery<CourseContent>({
    queryKey: [`/api/courses/${courseId}/content`],
  });

  const topics = courseContent?.topics;
  const allAssessments = topics?.flatMap(topic => 
    topic.assessments.map(assessment => ({
      ...assessment,
      topicName: topic.name,
      topicOrder: topic.orderIndex,
    }))
  ) || [];

  const sortedAssessments = allAssessments.sort((a, b) => {
    if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
    return a.orderIndex - b.orderIndex;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading assessments...
        </CardContent>
      </Card>
    );
  }

  if (sortedAssessments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No assessments yet</p>
          <p className="text-sm text-muted-foreground">
            Create topics and add assessments through the Topics tab
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">All Assessments</h3>
          <p className="text-sm text-muted-foreground">
            {sortedAssessments.length} assessment{sortedAssessments.length !== 1 ? "s" : ""} across {topics?.length || 0} topic{topics?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedAssessments.map((assessment) => (
          <Card key={assessment.id} data-testid={`card-assessment-${assessment.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{assessment.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Topic: {assessment.topicName}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {assessment.mode === 'random' ? 'Random Questions' : 
                     assessment.mode === 'manual' ? 'Manual Questions' : 'Template Linked'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Max Attempts</p>
                    <p className="text-sm font-medium">{assessment.maxAttempts || 3}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time Limit</p>
                    <p className="text-sm font-medium">
                      {assessment.timeLimit ? `${assessment.timeLimit} min` : 'No limit'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
