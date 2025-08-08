import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  FileText, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface PurchaseRecord {
  id: number;
  request_type: string;
  costcenter: string;
  pic: string;
  item_type: string;
  items: string;
  supplier: string;
  brand?: string;
  qty: number;
  unit_price: string; // API returns as string
  pr_date?: string;
  pr_no?: string;
  po_date?: string;
  po_no?: string;
  do_date?: string;
  do_no?: string;
  inv_date?: string;
  inv_no?: string;
  grn_date?: string;
  grn_no?: string;
}

interface PurchaseSummaryProps {
  purchases: PurchaseRecord[];
}

const PurchaseSummary: React.FC<PurchaseSummaryProps> = ({ purchases }) => {
  const stats = useMemo(() => {
    const total = purchases.length;
    const totalValue = purchases.reduce((sum, p) => sum + (p.qty * parseFloat(p.unit_price)), 0);
    
    // Calculate status counts
    const pending = purchases.filter(p => !p.pr_date).length;
    const ordered = purchases.filter(p => p.po_date && !p.do_date).length;
    const delivered = purchases.filter(p => p.do_date && !p.inv_date).length;
    const invoiced = purchases.filter(p => p.inv_date && !p.grn_date).length;
    const completed = purchases.filter(p => p.grn_date).length;
    
    // Request type breakdown
    const capex = purchases.filter(p => p.request_type === 'CAPEX').length;
    const opex = purchases.filter(p => p.request_type === 'OPEX').length;
    const services = purchases.filter(p => p.request_type === 'SERVICES').length;
    
    // Average values
    const avgValue = total > 0 ? totalValue / total : 0;
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = purchases.filter(p => 
      p.pr_date && new Date(p.pr_date) >= thirtyDaysAgo
    ).length;
    
    return {
      total,
      totalValue,
      pending,
      ordered,
      delivered,
      invoiced,
      completed,
      capex,
      opex,
      services,
      avgValue,
      recentRequests
    };
  }, [purchases]);

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Purchases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          <ShoppingCart className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-gray-600">
            {stats.recentRequests} in last 30 days
          </p>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">RM {stats.totalValue.toLocaleString()}</div>
          <p className="text-xs text-gray-600">
            Avg: RM {stats.avgValue.toFixed(0)}
          </p>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <p className="text-xs text-gray-600">
            {stats.completed} of {stats.total} completed
          </p>
        </CardContent>
      </Card>

      {/* Pending Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total - stats.completed}</div>
          <p className="text-xs text-gray-600">
            Require attention
          </p>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Process Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Requested</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.pending}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.total > 0 ? ((stats.pending / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Ordered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.ordered}</span>
                <Badge variant="default" className="text-xs">
                  {stats.total > 0 ? ((stats.ordered / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Delivered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.delivered}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Invoiced</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.invoiced}</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.total > 0 ? ((stats.invoiced / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.completed}</span>
                <Badge variant="default" className="text-xs bg-green-600">
                  {completionRate}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Type Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Request Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">CAPEX</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.capex}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.total > 0 ? ((stats.capex / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">OPEX</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.opex}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.total > 0 ? ((stats.opex / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm">SERVICES</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{stats.services}</span>
                <Badge variant="outline" className="text-xs">
                  {stats.total > 0 ? ((stats.services / stats.total) * 100).toFixed(0) : 0}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseSummary;
