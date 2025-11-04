import { useAuth } from '@/hooks/useAuth';
import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User } from 'lucide-react';

const WorkReportForm = lazy(() => import('@/components/WorkReportForm'));

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold afc-gradient bg-clip-text text-transparent">
                AFC Apps
              </h1>
              {profile && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{profile.full_name}</span>
                  <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
                    {profile.role}
                  </span>
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Card className="afc-card bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl text-primary">
                Selamat Datang di AFC Apps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Sistem manajemen laporan kerja untuk teknisi AC. 
                Isi form di bawah untuk membuat laporan kerja baru.
              </p>
            </CardContent>
          </Card>
        </div>

        <Suspense fallback={<div className="text-center py-4">Loading form...</div>}>
          <WorkReportForm />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
