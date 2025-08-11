'use client';
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Car, Phone, Zap, Wrench } from 'lucide-react';

// Import dashboard components
import FuelDash from './fuel-dash';
import TelcoDash from './telco-dash';
import UtilityDash from './utility-dash';
import MaintenanceDash from './maintenance-dash';

const BillingDashboard = () => {
  const [activeTab, setActiveTab] = useState('fuel');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Billing Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Comprehensive billing analytics and reports across all service categories
        </p>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex h-auto min-w-max w-full md:w-full">
            <TabsTrigger value="fuel" className="flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 flex-shrink-0">
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Fuel Dashboard</span>
              <span className="sm:hidden">Fuel</span>
            </TabsTrigger>
            <TabsTrigger value="telco" className="flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 flex-shrink-0">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Telco Dashboard</span>
              <span className="sm:hidden">Telco</span>
            </TabsTrigger>
            <TabsTrigger value="utility" className="flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 flex-shrink-0">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Utility Dashboard</span>
              <span className="sm:hidden">Utility</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 flex-shrink-0">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance Dashboard</span>
              <span className="sm:hidden">Maintenance</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Fuel Dashboard Tab */}
        <TabsContent value="fuel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Fuel Consumption Analytics
              </CardTitle>
              <CardDescription>
                Monitor fuel consumption trends, costs, and vehicle performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FuelDash />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telco Dashboard Tab */}
        <TabsContent value="telco" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Telecommunications Analytics
              </CardTitle>
              <CardDescription>
                Track telecommunications expenses, usage patterns, and provider performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelcoDash />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utility Dashboard Tab */}
        <TabsContent value="utility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Utility Billing Analytics
              </CardTitle>
              <CardDescription>
                Analyze utility consumption, costs, and service provider trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UtilityDash />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Dashboard Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Vehicle Maintenance Analytics
              </CardTitle>
              <CardDescription>
                Track vehicle maintenance expenses, service schedules, and fleet performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceDash />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Dashboard data is updated in real-time and reflects the most current billing information
          </p>
          <p>
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BillingDashboard;
