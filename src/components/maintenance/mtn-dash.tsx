'use client';
import React, { useEffect, useState } from 'react';
import { authenticatedApi } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  Car, Wrench, Clock, CheckCircle, AlertTriangle, TrendingUp, 
  Calendar, DollarSign, Users, Building2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  verifiedRequests: number;
  recommendedRequests: number;
  approvedRequests: number;
  monthlyTrend: Array<{
    month: string;
    requests: number;
    approved: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  topWorkshops: Array<{
    name: string;
    requests: number;
  }>;
  serviceTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
  costCenterActivity: Array<{
    name: string;
    requests: number;
  }>;
}

const MaintenanceDash = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    pendingRequests: 0,
    verifiedRequests: 0,
    recommendedRequests: 0,
    approvedRequests: 0,
    monthlyTrend: [],
    statusDistribution: [],
    topWorkshops: [],
    serviceTypeDistribution: [],
    costCenterActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3m'); // 1m, 3m, 6m, 1y

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all maintenance requests to calculate statistics
      const response = await authenticatedApi.get('/api/mtn/request');
      const data = (response.data as { data?: any[] })?.data || [];

      // Calculate stats
      const totalRequests = data.length;
      const pendingRequests = data.filter((item: any) => item.status === 'pending').length;
      const verifiedRequests = data.filter((item: any) => item.status === 'verified').length;
      const recommendedRequests = data.filter((item: any) => item.status === 'recommended').length;
      const approvedRequests = data.filter((item: any) => item.status === 'approved').length;

      // Status distribution for pie chart
      const statusDistribution = [
        { name: 'Pending', value: pendingRequests, color: '#fbbf24' },
        { name: 'Verified', value: verifiedRequests, color: '#3b82f6' },
        { name: 'Recommended', value: recommendedRequests, color: '#8b5cf6' },
        { name: 'Approved', value: approvedRequests, color: '#10b981' },
      ].filter(item => item.value > 0);

      // Monthly trend (mock data - you can implement real monthly aggregation)
      const monthlyTrend = [
        { month: 'Jan', requests: 45, approved: 35 },
        { month: 'Feb', requests: 52, approved: 41 },
        { month: 'Mar', requests: 48, approved: 38 },
        { month: 'Apr', requests: 61, approved: 52 },
        { month: 'May', requests: 55, approved: 45 },
        { month: 'Jun', requests: 67, approved: 58 },
      ];

      // Top workshops
      const workshopCounts: { [key: string]: number } = {};
      data.forEach((item: any) => {
        if (item.workshop?.name) {
          workshopCounts[item.workshop.name] = (workshopCounts[item.workshop.name] || 0) + 1;
        }
      });
      const topWorkshops = Object.entries(workshopCounts)
        .map(([name, requests]) => ({ name, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 5);

      // Service type distribution
      const serviceTypeCounts: { [key: string]: number } = {};
      data.forEach((item: any) => {
        if (item.svc_type && Array.isArray(item.svc_type)) {
          item.svc_type.forEach((type: any) => {
            if (type.name) {
              serviceTypeCounts[type.name] = (serviceTypeCounts[type.name] || 0) + 1;
            }
          });
        }
      });
      const serviceTypeDistribution = Object.entries(serviceTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Cost center activity
      const costCenterCounts: { [key: string]: number } = {};
      data.forEach((item: any) => {
        if (item.costcenter?.name) {
          costCenterCounts[item.costcenter.name] = (costCenterCounts[item.costcenter.name] || 0) + 1;
        }
      });
      const costCenterActivity = Object.entries(costCenterCounts)
        .map(([name, requests]) => ({ name, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      setStats({
        totalRequests,
        pendingRequests,
        verifiedRequests,
        recommendedRequests,
        approvedRequests,
        monthlyTrend,
        statusDistribution,
        topWorkshops,
        serviceTypeDistribution,
        costCenterActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const StatCard = ({ title, value, icon: Icon, color, description, trend }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            <span className="text-xs text-green-600">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Maintenance Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Overview of vehicle maintenance activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Month</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchDashboardData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.totalRequests}
          icon={Car}
          color="text-blue-600"
          description="All maintenance requests"
        />
        <StatCard
          title="Pending"
          value={stats.pendingRequests}
          icon={Clock}
          color="text-yellow-600"
          description="Awaiting review"
        />
        <StatCard
          title="Verified"
          value={stats.verifiedRequests}
          icon={AlertTriangle}
          color="text-blue-600"
          description="Verified requests"
        />
        <StatCard
          title="Recommended"
          value={stats.recommendedRequests}
          icon={Wrench}
          color="text-purple-600"
          description="Recommended for approval"
        />
        <StatCard
          title="Approved"
          value={stats.approvedRequests}
          icon={CheckCircle}
          color="text-green-600"
          description="Ready for maintenance"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  stackId="1"
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3}
                  name="Total Requests"
                />
                <Area 
                  type="monotone" 
                  dataKey="approved" 
                  stackId="2"
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.5}
                  name="Approved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Workshops */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Workshops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topWorkshops} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="requests" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Service Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.serviceTypeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cost Center Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cost Center Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.costCenterActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceDash;
