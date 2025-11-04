import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingCalendar from '@/components/BookingCalendar';
import BookingForm from '@/components/BookingForm';
import BookingDashboard from '@/components/BookingDashboard';
import WorkReportForm from '@/components/WorkReportForm';
import { DataImporter } from '@/components/DataImporter';
import { BookingWorkReportIntegration } from '@/components/BookingWorkReportIntegration';
import SheetsIntegration from '@/components/SheetsIntegration';
import { runDatabaseMigrationUpdate } from '@/utils/runMigrationUpdate';
import { AuthProvider } from '@/hooks/useAuth';
import { 
  Calendar, 
  Plus, 
  List, 
  FileText,
  Upload,
  ArrowRight,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Link,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-primary">AFC APPS</h1>
          <p className="text-muted-foreground">Sistem Manajemen Booking & Laporan Kerja AC</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Kalender</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Daftar Booking</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Laporan Kerja</span>
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">Integrasi</span>
            </TabsTrigger>
            <TabsTrigger value="sheets" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              <span className="hidden sm:inline">Google Sheets</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Kalender Booking & Jadwal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookingCalendar />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="dashboard" className="space-y-6">
            <BookingDashboard />
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            <WorkReportForm />
          </TabsContent>

          <TabsContent value="integration" className="space-y-6">
            <BookingWorkReportIntegration />
          </TabsContent>

          <TabsContent value="sheets" className="space-y-6">
            <SheetsIntegration />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
