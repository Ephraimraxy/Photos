import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Content, type Purchase } from "@shared/schema";
import { BarChart3, Image, Video, DollarSign, Users, TrendingUp } from "lucide-react";

export default function StatisticsSection() {
  const { data: content, isLoading: contentLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  if (contentLoading || purchasesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Statistics</h2>
          <p className="text-muted-foreground">
            Overview of your content and sales performance
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalContent = content?.length || 0;
  const imageCount = content?.filter(c => c.type === 'image').length || 0;
  const videoCount = content?.filter(c => c.type === 'video').length || 0;
  const totalPurchases = purchases?.length || 0;
  const completedPurchases = purchases?.filter(p => p.status === 'completed').length || 0;
  const totalRevenue = purchases?.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.totalAmount, 0) || 0;
  const pendingPurchases = purchases?.filter(p => p.status === 'pending').length || 0;

  const stats = [
    {
      title: "Total Content",
      value: totalContent,
      description: `${imageCount} images, ${videoCount} videos`,
      icon: BarChart3,
      color: "text-blue-600",
    },
    {
      title: "Total Revenue",
      value: `₦${totalRevenue.toLocaleString()}`,
      description: "From completed purchases",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Completed Orders",
      value: completedPurchases,
      description: `${totalPurchases} total orders`,
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Pending Orders",
      value: pendingPurchases,
      description: "Awaiting payment",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Statistics</h2>
        <p className="text-muted-foreground">
          Overview of your content and sales performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Distribution</CardTitle>
            <CardDescription>Breakdown by content type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-blue-600" />
                  <span>Images</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{imageCount}</span>
                  <Badge variant="outline">
                    {totalContent > 0 ? Math.round((imageCount / totalContent) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-red-600" />
                  <span>Videos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{videoCount}</span>
                  <Badge variant="outline">
                    {totalContent > 0 ? Math.round((videoCount / totalContent) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Current order status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Completed</span>
                <Badge variant="default">{completedPurchases}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Pending</span>
                <Badge variant="secondary">{pendingPurchases}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Failed</span>
                <Badge variant="destructive">
                  {purchases?.filter(p => p.status === 'failed').length || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
