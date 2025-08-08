import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Package, 
  DollarSign, 
  Truck,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
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

interface PurchaseCardProps {
  purchase: PurchaseRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Get status based on available data
const getStatusType = (purchase: PurchaseRecord): string => {
  if (purchase.grn_date && purchase.grn_no) return 'completed';
  if (purchase.inv_date && purchase.inv_no) return 'invoiced';
  if (purchase.do_date && purchase.do_no) return 'delivered';
  if (purchase.po_date && purchase.po_no) return 'ordered';
  if (purchase.pr_date && purchase.pr_no) return 'requested';
  return 'draft';
};

const getPurchaseStatus = (purchase: PurchaseRecord): string => {
  return getStatusType(purchase);
};

const getStatusConfig = (status: string) => {
  const configs = {
    requested: {
      label: 'Requested',
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    ordered: {
      label: 'Ordered',
      variant: 'default' as const,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    delivered: {
      label: 'Delivered',
      variant: 'outline' as const,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    invoiced: {
      label: 'Invoiced',
      variant: 'secondary' as const,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    completed: {
      label: 'Completed',
      variant: 'default' as const,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  };
  
  return configs[status as keyof typeof configs] || configs.requested;
};

const PurchaseCard: React.FC<PurchaseCardProps> = ({ purchase, onView, onEdit, onDelete }) => {
  const status = getPurchaseStatus(purchase);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold line-clamp-2">
              {purchase.items}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>#{purchase.id}</span>
              <span>•</span>
              <span>{purchase.supplier}</span>
            </div>
          </div>
          <Badge variant={statusConfig.variant} className="shrink-0">
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Cost Center</p>
            <p className="font-medium">{purchase.costcenter}</p>
          </div>
          <div>
            <p className="text-gray-600">Type</p>
            <Badge variant="outline" className="text-xs">
              {purchase.request_type}
            </Badge>
          </div>
          <div>
            <p className="text-gray-600">Quantity</p>
            <p className="font-medium">{purchase.qty}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Amount</p>
            <p className="font-bold text-green-600">
              RM {(purchase.qty * parseFloat(purchase.unit_price)).toFixed(2)}
            </p>
          </div>
        </div>
        
        {/* Process Timeline */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Process Status</p>
          <div className="flex items-center space-x-2">
            {/* Request */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              purchase.pr_date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div className={`flex-1 h-1 ${
              purchase.po_date ? 'bg-green-300' : 'bg-gray-200'
            }`} />
            
            {/* Purchase Order */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              purchase.po_date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Package className="w-4 h-4" />
            </div>
            <div className={`flex-1 h-1 ${
              purchase.do_date ? 'bg-green-300' : 'bg-gray-200'
            }`} />
            
            {/* Delivery */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              purchase.do_date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Truck className="w-4 h-4" />
            </div>
            <div className={`flex-1 h-1 ${
              purchase.inv_date ? 'bg-green-300' : 'bg-gray-200'
            }`} />
            
            {/* Invoice */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              purchase.inv_date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <FileText className="w-4 h-4" />
            </div>
            <div className={`flex-1 h-1 ${
              purchase.grn_date ? 'bg-green-300' : 'bg-gray-200'
            }`} />
            
            {/* GRN */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              purchase.grn_date ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
        
        {/* Reference Numbers */}
        {(purchase.pr_no || purchase.po_no || purchase.do_no || 
          purchase.inv_no || purchase.grn_no) && (
          <div className="text-xs text-gray-600 space-y-1">
            {purchase.pr_no && <p>PR: {purchase.pr_no}</p>}
            {purchase.po_no && <p>PO: {purchase.po_no}</p>}
            {purchase.do_no && <p>DO: {purchase.do_no}</p>}
            {purchase.inv_no && <p>INV: {purchase.inv_no}</p>}
            {purchase.grn_no && <p>GRN: {purchase.grn_no}</p>}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onView} className="flex-1">
            View Details
          </Button>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700">
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseCard;
