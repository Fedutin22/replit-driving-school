import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, GraduationCap, ArrowLeft } from "lucide-react";
import type { Course, Topic, Post, TestTemplate, TopicAssessment } from "@shared/schema";

interface TopicWithContent extends Topic {
  posts: Post[];
  assessments: TopicAssessment[];
}

interface CourseWithContent {
  course: Course;
  topics: TopicWithContent[];
  tests: TestTemplate[];
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const [, setLocation] = useLocation();

  const { data: courseData, isLoading } = useQuery<CourseWithContent>({
    queryKey: ['/api/courses', courseId],
    enabled: !!courseId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground">Loading course content...</div>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-muted-foreground">Course not found</div>
        </div>
      </div>
    );
  }

  const { course, topics, tests } = courseData;

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold" data-testid="text-course-name">{course.name}</h1>
            {course.description && (
              <p className="text-muted-foreground mt-2" data-testid="text-course-description">
                {course.description}
              </p>
            )}
          </div>
        </div>

        {/* Course Curriculum */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Course Curriculum</CardTitle>
            </div>
            <CardDescription>
              Study the course materials and complete the topics in order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No topics available yet
              </p>
            ) : (
              <Accordion type="multiple" className="w-full" data-testid="accordion-topics">
                {topics.map((topic, topicIndex) => (
                  <AccordionItem key={topic.id} value={topic.id} data-testid={`accordion-item-topic-${topic.id}`}>
                    <AccordionTrigger data-testid={`button-toggle-topic-${topic.id}`}>
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <Badge variant="secondary" data-testid={`badge-topic-number-${topic.id}`}>
                          {topicIndex + 1}
                        </Badge>
                        <div className="flex-1">
                          <div className="font-semibold" data-testid={`text-topic-name-${topic.id}`}>
                            {topic.name}
                          </div>
                          {topic.description && (
                            <div className="text-sm text-muted-foreground">
                              {topic.description}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" data-testid={`badge-topic-type-${topic.id}`}>
                          {topic.type}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 py-4">
                        {topic.posts.length === 0 && topic.assessments.length === 0 ? (
                          <p className="text-muted-foreground text-sm py-4 px-4">
                            No content available for this topic yet
                          </p>
                        ) : (
                          <>
                            {topic.posts.length > 0 && (
                              <div className="space-y-4">
                                {topic.posts.map((post, postIndex) => (
                                  <Card key={post.id} data-testid={`card-post-${post.id}`}>
                                    <CardHeader>
                                      <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base" data-testid={`text-post-title-${post.id}`}>
                                          {postIndex + 1}. {post.title}
                                        </CardTitle>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      <div
                                        className="prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: post.content }}
                                        data-testid={`text-post-content-${post.id}`}
                                      />
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                            
                            {topic.assessments.length > 0 && (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2 px-4">
                                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold">Topic Assessments</h4>
                                </div>
                                {topic.assessments.map((assessment) => (
                                  <Card key={assessment.id} data-testid={`card-assessment-${assessment.id}`}>
                                    <CardHeader>
                                      <div className="flex items-center gap-2 justify-between">
                                        <div className="flex items-center gap-2">
                                          <CardTitle className="text-base" data-testid={`text-assessment-name-${assessment.id}`}>
                                            {assessment.name}
                                          </CardTitle>
                                          {assessment.isRequired && (
                                            <Badge variant="default" data-testid={`badge-required-${assessment.id}`}>
                                              Required
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      {assessment.description && (
                                        <CardDescription data-testid={`text-assessment-description-${assessment.id}`}>
                                          {assessment.description}
                                        </CardDescription>
                                      )}
                                    </CardHeader>
                                    <CardContent className="flex items-center justify-between gap-4">
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Passing Score:</span>
                                          <Badge variant="secondary" data-testid={`badge-passing-percentage-${assessment.id}`}>
                                            {assessment.passingPercentage}%
                                          </Badge>
                                        </div>
                                        {assessment.mode === 'random' && assessment.questionCount && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Questions:</span>
                                            <span data-testid={`text-question-count-${assessment.id}`}>{assessment.questionCount}</span>
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        onClick={() => setLocation(`/assessments/${assessment.id}/take`)}
                                        data-testid={`button-start-assessment-${assessment.id}`}
                                      >
                                        Start Assessment
                                      </Button>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Course Tests */}
        {tests.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                <CardTitle>Course Assessments</CardTitle>
              </div>
              <CardDescription>
                Complete these tests to demonstrate your knowledge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tests.map((test) => (
                  <Card key={test.id} data-testid={`card-test-${test.id}`}>
                    <CardHeader>
                      <CardTitle className="text-base" data-testid={`text-test-name-${test.id}`}>
                        {test.name}
                      </CardTitle>
                      {test.description && (
                        <CardDescription data-testid={`text-test-description-${test.id}`}>
                          {test.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Passing Score:</span>
                          <Badge variant="secondary" data-testid={`badge-passing-percentage-${test.id}`}>
                            {test.passingPercentage}%
                          </Badge>
                        </div>
                        {test.mode === 'random' && test.questionCount && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Questions:</span>
                            <span data-testid={`text-question-count-${test.id}`}>{test.questionCount}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => setLocation(`/tests/${test.id}/take`)}
                        data-testid={`button-start-test-${test.id}`}
                      >
                        Start Test
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
