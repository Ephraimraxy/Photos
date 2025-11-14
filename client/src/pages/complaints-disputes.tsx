import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Search, CheckCircle2, XCircle, Clock, Copy, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TransactionData {
  purchaseId: string;
  trackingCode: string;
  reference: string;
  status: "completed" | "pending" | "failed";
  paystackStatus: string;
  message: string;
  downloadExpired: boolean;
  totalAmount: number;
  createdAt: string;
  userName: string;
}

export default function ComplaintsDisputes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [searchId, setSearchId] = useState("");

  const lookupMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", "/api/transaction/lookup", { transactionId: id });
      return await response.json();
    },
    onSuccess: (data: TransactionData) => {
      setTransactionId(data.reference);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Transaction ID not found";
      toast({
        title: "Transaction Not Found",
        description: errorMessage.includes("not found") 
          ? "This transaction ID does not exist in our system. Please check and try again."
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const { data: transactionData, isLoading, refetch } = lookupMutation.data 
    ? { data: lookupMutation.data as TransactionData, isLoading: false, refetch: () => lookupMutation.mutate(transactionId) }
    : { data: null, isLoading: false, refetch: () => {} };

  const handleSearch = () => {
    if (!searchId.trim()) {
      toast({
        title: "Transaction ID Required",
        description: "Please enter a transaction ID",
        variant: "destructive",
      });
      return;
    }
    lookupMutation.mutate(searchId.trim());
  };

  const copyTransactionId = () => {
    if (transactionData?.reference) {
      navigator.clipboard.writeText(transactionData.reference);
      toast({
        title: "Copied!",
        description: "Transaction ID copied to clipboard",
      });
    }
  };

  const getStatusIcon = () => {
    if (!transactionData) return null;
    switch (transactionData.status) {
      case "completed":
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case "pending":
        return <Clock className="w-12 h-12 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-12 h-12 text-red-500" />;
      default:
        return <AlertCircle className="w-12 h-12 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!transactionData) return null;
    switch (transactionData.status) {
      case "completed":
        return <Badge className="bg-green-500">Payment Successful</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">Payment Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Payment Failed</Badge>;
      default:
        return <Badge>Unknown Status</Badge>;
    }
  };

  const handleDownload = () => {
    if (transactionData?.purchaseId) {
      setLocation(`/purchase/${transactionData.purchaseId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold font-display">
                Complaints & Disputes
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Card>
          <CardHeader>
            <CardTitle>Check Transaction Status</CardTitle>
            <CardDescription>
              Enter your transaction ID to check the status of your payment. 
              The system will automatically check with the payment gateway for the latest status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID</Label>
              <div className="flex gap-2">
                <Input
                  id="transaction-id"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter transaction ID (e.g., DOCUEDIT-...)"
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Button
                  onClick={handleSearch}
                  disabled={lookupMutation.isPending || !searchId.trim()}
                >
                  <Search className="w-4 h-4 mr-2" />
                  {lookupMutation.isPending ? "Checking..." : "Check Status"}
                </Button>
              </div>
            </div>

            {/* Results */}
            {lookupMutation.isPending && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted animate-pulse rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Checking transaction status...</p>
              </div>
            )}

            {transactionData && !lookupMutation.isPending && (
              <div className="space-y-6">
                {/* Status Card */}
                <Card className={transactionData.status === "completed" 
                  ? "border-green-500/20 bg-green-500/5" 
                  : transactionData.status === "pending"
                  ? "border-yellow-500/20 bg-yellow-500/5"
                  : "border-red-500/20 bg-red-500/5"
                }>
                  <CardContent className="py-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {getStatusIcon()}
                      <div className="space-y-2">
                        {getStatusBadge()}
                        <h2 className="text-xl font-semibold">
                          {transactionData.message}
                        </h2>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transaction Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Transaction ID
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={transactionData.reference}
                          readOnly
                          className="flex-1 px-3 py-2 text-lg font-mono font-bold uppercase text-center bg-accent border border-border rounded-md tracking-wider"
                        />
                        <Button
                          onClick={copyTransactionId}
                          size="icon"
                          variant="outline"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {transactionData.trackingCode && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Tracking Code
                        </label>
                        <p className="px-3 py-2 text-lg font-mono font-bold uppercase bg-accent border border-border rounded-md">
                          {transactionData.trackingCode}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Amount</label>
                        <p className="text-lg font-semibold">₦{transactionData.totalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date</label>
                        <p className="text-lg">
                          {new Date(transactionData.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                {transactionData.status === "completed" && (
                  <div className="space-y-2">
                    {transactionData.downloadExpired ? (
                      <Card className="border-yellow-500/20 bg-yellow-500/5">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-2 text-yellow-600">
                            <AlertCircle className="w-5 h-5" />
                            <p className="font-medium">Download period has expired (24 hours)</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Button
                        onClick={handleDownload}
                        className="w-full h-12 text-base"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download All Items
                      </Button>
                    )}
                  </div>
                )}

                {transactionData.status === "pending" && (
                  <Card className="border-yellow-500/20 bg-yellow-500/5">
                    <CardContent className="py-4">
                      <p className="text-sm text-muted-foreground">
                        Your payment is still being processed. Please check back later or refresh this page to see the updated status.
                      </p>
                      <Button
                        onClick={() => refetch()}
                        variant="outline"
                        className="mt-4"
                      >
                        Refresh Status
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {transactionData.status === "failed" && (
                  <Card className="border-red-500/20 bg-red-500/5">
                    <CardContent className="py-4">
                      <p className="text-sm text-muted-foreground">
                        This transaction failed. If you believe this is an error, please contact support with your transaction ID.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

