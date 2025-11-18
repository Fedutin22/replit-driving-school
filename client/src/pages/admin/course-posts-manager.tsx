import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import type { Post, Topic, Course } from "@shared/schema";

interface CoursePostsManagerProps {
  courseId: string;
}

type TopicWithPosts = Topic & { posts: Post[] };
type CourseContent = { course: Course; topics: TopicWithPosts[]; };

export function CoursePostsManager({ courseId }: CoursePostsManagerProps) {
  const { data: courseContent, isLoading } = useQuery<CourseContent>({
    queryKey: [`/api/courses/${courseId}/content`],
  });

  const topics = courseContent?.topics;
  const allPosts = topics?.flatMap(topic => 
    topic.posts.map(post => ({
      ...post,
      topicName: topic.name,
      topicOrder: topic.orderIndex,
    }))
  ) || [];

  const sortedPosts = allPosts.sort((a, b) => {
    if (a.topicOrder !== b.topicOrder) return a.topicOrder - b.topicOrder;
    return a.orderIndex - b.orderIndex;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading posts...
        </CardContent>
      </Card>
    );
  }

  if (sortedPosts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No posts yet</p>
          <p className="text-sm text-muted-foreground">
            Create topics and add posts through the Topics tab
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">All Posts</h3>
          <p className="text-sm text-muted-foreground">
            {sortedPosts.length} post{sortedPosts.length !== 1 ? "s" : ""} across {topics?.length || 0} topic{topics?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedPosts.map((post) => (
          <Card key={post.id} data-testid={`card-post-${post.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{post.title}</CardTitle>
                  <CardDescription className="mt-1">
                    Topic: {post.topicName}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {post.content && (
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
