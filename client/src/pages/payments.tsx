import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2, Clock, XCircle, DollarSign } from "lucide-react";
import type { Payment } from "@shared/schema";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface PaymentWithCourse extends Payment {
  courseName?: string;
}

export default function Payments() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: payments, isLoading } = useQuery<PaymentWithCourse[]>({
    queryKey: ["/api/payments"],
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
        <div className="space-y-4">
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

  const paidPayments = payments?.filter((p) => p.status === "paid") || [];
  const pendingPayments = payments?.filter((p) => p.status === "pending") || [];
  const failedPayments = payments?.filter((p) => p.status === "failed") || [];

  const totalPaid = paidPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="heading-payments">
          Payments
        </h1>
        <p className="text-muted-foreground">
          View and manage your course payments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-total-paid">
              ${totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{paidPayments.length} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="stat-pending-payments">
              {pendingPayments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-failed-payments">
              {failedPayments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {pendingPayments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Payments</h2>
          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <Card key={payment.id} className="border-amber-600/50" data-testid={`card-pending-payment-${payment.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1">{payment.courseName || "Course Payment"}</CardTitle>
                      <CardDescription>
                        Created {format(new Date(payment.createdAt), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-amber-600/20 text-amber-600 flex-shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-lg font-bold">${parseFloat(payment.amount).toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="default" className="w-full" asChild data-testid={`button-pay-${payment.id}`}>
                    <a href={`/payments/${payment.id}/checkout`}>Complete Payment</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {failedPayments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Failed Payments</h2>
          <div className="space-y-4">
            {failedPayments.map((payment) => (
              <Card key={payment.id} className="border-destructive/50" data-testid={`card-failed-payment-${payment.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-1">{payment.courseName || "Course Payment"}</CardTitle>
                      <CardDescription>
                        Failed on {format(new Date(payment.updatedAt), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant="destructive" className="flex-shrink-0">
                      <XCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="text-lg font-bold">${parseFloat(payment.amount).toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="default" className="w-full" asChild data-testid={`button-retry-${payment.id}`}>
                    <a href={`/payments/${payment.id}/checkout`}>Retry Payment</a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {paidPayments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          <div className="space-y-3">
            {paidPayments.map((payment) => (
              <Card key={payment.id} className="hover-elevate" data-testid={`card-paid-payment-${payment.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-600/10 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{payment.courseName || "Course Payment"}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.paidAt && format(new Date(payment.paidAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${parseFloat(payment.amount).toFixed(2)}</p>
                      <Badge variant="default" className="bg-green-600 text-white text-xs mt-1">
                        Paid
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!payments || payments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No payments yet</p>
            <p className="text-sm text-muted-foreground">Your payment history will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
