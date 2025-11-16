import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, CheckCircle2, Calendar } from "lucide-react";
import type { Certificate } from "@shared/schema";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface CertificateWithCourse extends Certificate {
  courseName?: string;
  studentName?: string;
}

export default function Certificates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: certificates, isLoading } = useQuery<CertificateWithCourse[]>({
    queryKey: ["/api/certificates"],
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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

  const validCertificates = certificates?.filter((c) => !c.revokedAt) || [];
  const revokedCertificates = certificates?.filter((c) => c.revokedAt) || [];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-certificates">
          Certificates
        </h1>
        <p className="text-muted-foreground">
          View and download your earned certificates
        </p>
      </div>

      {validCertificates.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">My Certificates</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {validCertificates.map((certificate) => (
              <Card key={certificate.id} className="hover-elevate" data-testid={`card-certificate-${certificate.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                    <Badge variant="default" className="bg-green-600 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{certificate.courseName || "Course Certificate"}</CardTitle>
                  <CardDescription>
                    Certificate #{certificate.certificateNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Issued {format(new Date(certificate.issuedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Certificate Number</p>
                    <p className="text-sm font-mono font-medium" data-testid={`text-cert-number-${certificate.id}`}>
                      {certificate.certificateNumber}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="default" className="flex-1" asChild data-testid={`button-view-${certificate.id}`}>
                    <a href={`/certificates/${certificate.id}`}>View</a>
                  </Button>
                  <Button variant="outline" size="icon" asChild data-testid={`button-download-${certificate.id}`}>
                    <a href={`/api/certificates/${certificate.id}/download`} download>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {revokedCertificates.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Revoked Certificates</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {revokedCertificates.map((certificate) => (
              <Card key={certificate.id} className="opacity-60" data-testid={`card-revoked-certificate-${certificate.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground flex-shrink-0">
                      <Award className="h-6 w-6" />
                    </div>
                    <Badge variant="destructive">Revoked</Badge>
                  </div>
                  <CardTitle className="text-base">{certificate.courseName || "Course Certificate"}</CardTitle>
                  <CardDescription>
                    Certificate #{certificate.certificateNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Revoked {certificate.revokedAt && format(new Date(certificate.revokedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {certificate.revokedReason && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-muted-foreground mb-1">Reason</p>
                      <p className="text-sm">{certificate.revokedReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {certificates?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No certificates yet</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Complete your courses and pass required tests to earn certificates
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
