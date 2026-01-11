import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, CheckCircle, Package, FileText } from 'lucide-react';

interface PurchaseCardProps {
  purchase: any;
  onEdit: () => void;
  onView?: () => void;
  onDelete?: () => void;
}

// Format number for RM display: thousand separators + 2 decimals
const fmtRM = (value: number) => {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Determine asset registration status: undelivered / unregistered / handed over
const getAssetStatus = (purchase: any): 'undelivered' | 'unregistered' | 'registered' => {
  const assetRegistry = String((purchase as any).asset_registry || '').toLowerCase();
  const hasDeliveries = Array.isArray(purchase.deliveries) && purchase.deliveries.length > 0;
  if (assetRegistry === 'completed') return 'registered';
  if (hasDeliveries) return 'unregistered';
  return 'undelivered';
};

const getStatusConfig = (status: 'undelivered' | 'unregistered' | 'registered') => {
  const configs = {
    undelivered: {
      label: 'Undelivered',
      className: 'ring-1 ring-red-400 text-red-600 bg-red-50'
    },
    unregistered: {
      label: 'Unregistered',
      className: 'ring-1 ring-amber-500 text-amber-700 bg-amber-50'
    },
    registered: {
      label: 'Handed Over',
      className: 'bg-green-600 text-white'
    }
  };
  return configs[status] || configs.unregistered;
};

const PurchaseCard: React.FC<PurchaseCardProps> = ({ purchase, onView, onEdit, onDelete }) => {
  const status = getAssetStatus(purchase as any);
  const statusConfig = getStatusConfig(status);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold line-clamp-2">
              {purchase.description || purchase.items}
            </CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>#{purchase.id}</span>
              <span>•</span>
              <span>{typeof purchase.supplier === 'string' ? purchase.supplier : (purchase.supplier?.name || '')}</span>
            </div>
          </div>
          <Badge className={`shrink-0 whitespace-nowrap ${statusConfig.className}`}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Cost Center</p>
            <p className="font-medium">{purchase.request?.costcenter?.name || (typeof purchase.costcenter === 'string' ? purchase.costcenter : (purchase.costcenter?.name || ''))}</p>
          </div>
          <div>
            <p className="text-gray-600">Type</p>
            <Badge variant="outline" className="text-xs">
              {purchase.request?.request_type || purchase.request_type}
            </Badge>
          </div>
          <div>
            <p className="text-gray-600">Quantity</p>
            <p className="font-medium">{purchase.qty}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Amount</p>
            <p className="font-bold text-green-600">
              {(() => {
                const total = Number(purchase.total_price ?? NaN);
                if (Number.isFinite(total)) return `RM ${fmtRM(total)}`;
                return `RM ${fmtRM((purchase.qty || 0) * (Number(purchase.unit_price) || 0))}`;
              })()}
            </p>
          </div>
        </div>

        {/* Process Status */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Process Status</p>
          <div className="flex items-center gap-2">
            {['undelivered', 'unregistered', 'registered'].map((step, idx) => {
              const order = ['undelivered', 'unregistered', 'registered'] as const;
              const currentIndex = order.indexOf(status as any);
              const stepIndex = order.indexOf(step as any);
              const baseDot = 'w-8 h-8 rounded-full flex items-center justify-center';
              const baseLine = 'flex-1 h-1 rounded-full';

              let colorDot = 'bg-gray-200 text-gray-400';
              if (step === 'undelivered') {
                colorDot = currentIndex === 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white';
              } else if (step === 'unregistered') {
                colorDot = currentIndex === 2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400';
              } else if (step === 'registered') {
                colorDot = currentIndex === 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400';
              }

              const icon = step === 'registered'
                ? <CheckCircle className="w-4 h-4" />
                : step === 'unregistered'
                  ? <FileText className="w-4 h-4" />
                  : <Package className="w-4 h-4" />;

              const lineActive = currentIndex > stepIndex;

              return (
                <React.Fragment key={step}>
                  {idx > 0 && <div className={`${baseLine} ${lineActive ? 'bg-green-300' : 'bg-gray-200'}`} />}
                  <div className={`${baseDot} ${colorDot}`}>
                    {icon}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Reference Numbers */}
        {(purchase.pr_no || purchase.po_no || purchase.do_no ||
          purchase.inv_no || purchase.grn_no) && (
            <div className="text-xs text-gray-600 space-y-1">
              {purchase.pr_no && <p>PR: {purchase.pr_no}</p>}
              {purchase.po_no && <p>PO: {purchase.po_no}</p>}
              {purchase.do_no && <p>DO: {purchase.do_no}</p>}
              {purchase.inv_no && <p>Registered: {purchase.inv_no}</p>}
              {purchase.grn_no && <p>GRN: {purchase.grn_no}</p>}
            </div>
          )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={onEdit} className="flex-1">
            Edit
          </Button>
          {onView && (
            <Button size="sm" variant="outline" onClick={onView}>
              View
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="outline" onClick={onDelete} className="text-red-600 hover:text-red-700">
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PurchaseCard;
