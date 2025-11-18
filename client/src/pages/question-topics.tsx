import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, Search, Edit2, Trash2, ChevronRight, Home } from "lucide-react";
import type { QuestionCategory, QuestionTopic } from "@shared/schema";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "wouter";

export default function QuestionTopics() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<QuestionTopic | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: category } = useQuery<QuestionCategory>({
    queryKey: [`/api/question-categories/${categoryId}`],
    enabled: !!categoryId,
  });

  const { data: topics, isLoading } = useQuery<QuestionTopic[]>({
    queryKey: [`/api/question-categories/${categoryId}/topics`],
    enabled: !!categoryId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/question-topics", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/question-categories/${categoryId}/topics`] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Topic Created",
        description: "The question topic has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      await apiRequest("PATCH", `/api/question-topics/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/question-categories/${categoryId}/topics`] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Topic Updated",
        description: "The question topic has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/question-topics/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/question-categories/${categoryId}/topics`] });
      toast({
        title: "Topic Deleted",
        description: "The question topic has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingTopic(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (topic: QuestionTopic) => {
    setEditingTopic(topic);
    setName(topic.name);
    setDescription(topic.description || "");
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Topic name is required",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name,
      description,
      categoryId,
      orderIndex: editingTopic?.orderIndex || 0,
    };

    if (editingTopic) {
      updateMutation.mutate({ id: editingTopic.id, updates: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredTopics = topics?.filter((t) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-6 w-96 mb-4" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb data-testid="breadcrumb-topics">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/question-categories">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/question-categories">Question Bank</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{category?.name || "..."}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-question-topics">
            {category?.name}
          </h1>
          <p className="text-muted-foreground">
            {category?.description || "Browse topics in this category"}
          </p>
        </div>
        <Button onClick={openCreateDialog} data-testid="button-create-topic">
          <Plus className="h-4 w-4 mr-2" />
          Add Topic
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-topics"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTopics && filteredTopics.length > 0 ? (
          filteredTopics.map((topic) => (
            <Card key={topic.id} className="hover-elevate" data-testid={`card-topic-${topic.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{topic.name}</CardTitle>
                    </div>
                    {topic.description && (
                      <CardDescription className="line-clamp-2">
                        {topic.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/questions/${topic.id}`}>
                    <Button variant="outline" size="sm" data-testid={`button-view-questions-${topic.id}`}>
                      View Questions
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(topic)}
                      data-testid={`button-edit-topic-${topic.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this topic?")) {
                          deleteMutation.mutate(topic.id);
                        }
                      }}
                      data-testid={`button-delete-topic-${topic.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No topics found</p>
              <p className="text-sm text-muted-foreground">Create a topic to organize questions</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-topic-form">
          <DialogHeader>
            <DialogTitle>{editingTopic ? "Edit Topic" : "Create Topic"}</DialogTitle>
            <DialogDescription>
              {editingTopic ? "Update the topic details" : "Add a new topic to organize questions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter topic name..."
                data-testid="input-topic-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter topic description..."
                rows={3}
                data-testid="input-topic-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsDialogOpen(false);
              }}
              data-testid="button-cancel-topic"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-topic"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingTopic
                ? "Update Topic"
                : "Create Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
