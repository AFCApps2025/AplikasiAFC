import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import SimpleLogin from './components/SimpleLogin';
import NotificationProvider from './components/NotificationProvider';
import BottomNavigation from './components/BottomNavigation';

// Lazy load components for better performance
const SimpleBookingDashboard = lazy(() => import('./components/SimpleBookingDashboard'));
const ScheduledBookings = lazy(() => import('./components/ScheduledBookings'));
const BookingCalendar = lazy(() => import('./components/BookingCalendar'));
const WorkReportForm = lazy(() => import('./components/WorkReportFormSimple'));
const WorkReportApproval = lazy(() => import('./components/WorkReportApproval'));
const OrderHistoryNew = lazy(() => import('./components/OrderHistoryNew'));
const DetailOrder = lazy(() => import('./components/DetailOrder'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const CustomerHistory = lazy(() => import('./components/CustomerHistory'));
const BrandHistory = lazy(() => import('./components/BrandHistory'));
const TechnicianDashboard = lazy(() => import('./components/TechnicianDashboard'));
const JadwalShalatPage = lazy(() => import('./components/JadwalShalatPage'));
const AffiliateList = lazy(() => import('./components/AffiliateList'));
import { Calendar, Home, FileText, History, Users, ClipboardList, CalendarClock, Settings, LogOut, Package, Menu, X, Bell, CheckCircle, BarChart3 } from "lucide-react";
import { notificationService } from './utils/notifications';

// Optimize React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Memuat...</p>
    </div>
  </div>
);

const Navigation = ({ currentUser, onLogout }: { currentUser: any; onLogout: () => void }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('soundEnabled') !== 'false';
  });

  // Update localStorage when notification settings change
  useEffect(() => {
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
    notificationService.setEnabled(notificationsEnabled);
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', soundEnabled.toString());
    notificationService.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);
  
  const handleLogout = () => {
    onLogout();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navigationItems = [
    ...(currentUser?.role !== 'helper' 
      ? [{ path: '/', icon: ClipboardList, label: 'Dashboard' }] 
      : []
    ),
    { path: '/scheduled', icon: CalendarClock, label: 'Jadwal' },
    { path: '/calendar', icon: Calendar, label: 'Kalender' },
    ...(currentUser?.role !== 'teknisi' && currentUser?.role !== 'helper'
      ? [{ path: '/work-report', icon: FileText, label: 'Laporan' }] 
      : []
    ),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'teknisi' || currentUser?.role === 'helper'
      ? [{ path: '/technician-dashboard', icon: BarChart3, label: 'Dashboard Teknisi dan Helper' }]
      : []
    ),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'manager' 
      ? [{ path: '/work-report-approval', icon: CheckCircle, label: 'Persetujuan Laporan' }] 
      : []
    ),
    ...(currentUser?.role !== 'teknisi' && currentUser?.role !== 'helper'
      ? [{ path: '/detail-order', icon: Package, label: 'Detail Order' }] 
      : []
    ),
    ...(currentUser?.role !== 'helper'
      ? [{ path: '/order-history', icon: History, label: 'Riwayat Laporan' }]
      : []
    ),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'manager'
      ? [{ path: '/affiliate-list', icon: Users, label: 'Daftar Affiliasi' }]
      : []
    )
  ];
  
  return (
    <>
      {/* Top Header - Fixed */}
      <header className="bg-gradient-to-r from-green-600 to-orange-500 shadow-lg border-b border-green-700 fixed top-0 left-0 right-0 z-50">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={toggleMenu}
                className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-white truncate" style={{ fontFamily: 'Lilita One, cursive' }}>
                  <span className="hidden sm:inline">Aqsha Fresh & Cool</span>
                  <span className="sm:hidden">AFC</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* User Role Badge */}
              <div className="px-2 py-1 bg-white bg-opacity-20 rounded-md">
                <span className="text-xs font-medium text-white capitalize">
                  {currentUser?.role === 'admin' ? 'Administrator' : 
                   currentUser?.role === 'manager' ? currentUser?.name || 'Manager' :
                   currentUser?.role === 'teknisi' ? currentUser?.name || 'Teknisi' : 
                   currentUser?.role === 'helper' ? currentUser?.name || 'Helper' :
                   currentUser?.role || 'User'}
                </span>
              </div>
              
              {currentUser?.role === 'admin' && (
                <Link to="/admin" className="px-2 py-1 text-xs sm:text-sm border border-white/30 text-white rounded-md hover:bg-white/20 flex items-center gap-1">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <button onClick={handleLogout} className="px-2 py-1 text-xs sm:text-sm border border-white/30 text-white rounded-md hover:bg-white/20 flex items-center gap-1">
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hamburger Menu Dropdown */}
        {isMenuOpen && (
          <>
            {/* Enhanced Backdrop with Blur - Click to Close */}
            <div 
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-all duration-300 cursor-pointer"
              onClick={closeMenu}
              style={{
                animation: 'fadeIn 0.3s ease-out'
              }}
            ></div>
            
            {/* Glass Morphism Menu Content - Full Screen */}
            <div 
              className="fixed inset-0 z-50 flex items-start justify-center pt-4 p-4"
              style={{
                animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              <div className="w-full max-w-md h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="backdrop-blur-xl bg-white/80 border border-white/20 shadow-2xl rounded-2xl overflow-hidden relative h-full flex flex-col"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {/* Close Button */}
                  <button
                    onClick={closeMenu}
                    className="absolute top-1 right-4 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 group z-10 flex items-center justify-center"
                    style={{
                      backdropFilter: 'blur(10px)',
                      width: '28px',
                      height: '28px'
                    }}
                  >
                    <X className="h-4 w-4 text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
                  </button>

                  <nav className="pt-12 pb-6 flex-1 overflow-y-auto">
                    {navigationItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={closeMenu}
                          className={`group flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02] hover:translate-x-2 ${
                            isActive 
                              ? 'text-green-600 bg-gradient-to-r from-green-50/80 to-transparent border-r-4 border-green-500' 
                              : 'text-gray-700 hover:text-green-600 hover:bg-gradient-to-r hover:from-green-50/50 hover:to-transparent'
                          }`}
                          style={{
                            animation: `slideInStagger 0.5s ease-out ${index * 0.1}s both`,
                            backdropFilter: isActive ? 'blur(10px)' : 'none'
                          }}
                        >
                          <div className={`p-1.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                            isActive ? 'bg-green-100 shadow-lg shadow-green-200/50' : 'bg-gray-100/50 group-hover:bg-green-100/70 group-hover:shadow-md'
                          }`}>
                            <Icon className={`h-4 w-4 transition-all duration-300 ${
                              isActive ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600'
                            }`} />
                          </div>
                          <span className="font-semibold tracking-wide">{item.label}</span>
                          {isActive && (
                            <div 
                              className="ml-auto w-2 h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg"
                              style={{
                                animation: 'pulse 2s infinite, glow 2s ease-in-out infinite alternate'
                              }}
                            ></div>
                          )}
                          <div className={`absolute inset-0 bg-gradient-to-r from-green-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl ${
                            isActive ? 'animate-shimmer' : ''
                          }`}></div>
                        </Link>
                      );
                    })}
                    
                    {/* Enhanced Divider */}
                    <div className="mx-6 my-4 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent"></div>
                    
                    {/* Notification Controls */}
                    <div className="p-4 space-y-2">
                      <div className="mb-4 pb-4 border-b border-gray-200/50">
                        <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Bell className="h-4 w-4 text-orange-500" />
                          Pengaturan Notifikasi
                        </h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium text-sm">Notifikasi</span>
                            <button
                              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                                notificationsEnabled 
                                  ? 'bg-orange-500 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {notificationsEnabled ? 'ON' : 'OFF'}
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 font-medium text-sm">Suara</span>
                            <button
                              onClick={() => setSoundEnabled(!soundEnabled)}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                                soundEnabled 
                                  ? 'bg-orange-500 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {soundEnabled ? 'ON' : 'OFF'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Divider */}
                    <div className="mx-6 my-2 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent"></div>
                    
                    {/* Admin Link (if admin) */}
                    {currentUser?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={closeMenu}
                        className={`group flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02] hover:translate-x-2 ${
                          location.pathname === '/admin'
                            ? 'text-orange-600 bg-gradient-to-r from-orange-50/80 to-transparent border-r-4 border-orange-500'
                            : 'text-gray-700 hover:text-orange-600 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent'
                        }`}
                        style={{
                          animation: `slideInStagger 0.5s ease-out ${navigationItems.length * 0.1}s both`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${
                            location.pathname === '/admin'
                              ? 'bg-orange-100 shadow-lg shadow-orange-200/50'
                              : 'bg-gray-100/50 group-hover:bg-orange-100/70 group-hover:shadow-md'
                          }`}>
                            <Settings className={`h-4 w-4 transition-all duration-300 ${
                              location.pathname === '/admin' ? 'text-orange-600' : 'text-gray-500 group-hover:text-orange-600'
                            }`} />
                          </div>
                          <span className="font-semibold tracking-wide">Admin Panel</span>
                        </div>
                        {location.pathname === '/admin' && (
                          <div 
                            className="w-2 h-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full shadow-lg"
                            style={{
                              animation: 'pulse 2s infinite, glow 2s ease-in-out infinite alternate'
                            }}
                          ></div>
                        )}
                      </Link>
                    )}
                    
                    {/* Enhanced Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="group flex items-center justify-between px-4 py-3 text-sm font-medium text-red-600 hover:bg-gradient-to-r hover:from-red-50/50 hover:to-transparent transition-all duration-300 w-full text-left hover:scale-[1.02] hover:translate-x-2"
                      style={{
                        animation: `slideInStagger 0.5s ease-out ${(navigationItems.length + (currentUser?.role === 'admin' ? 1 : 0)) * 0.1}s both`
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-xl bg-red-100/50 group-hover:bg-red-100/70 group-hover:shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                          <LogOut className="h-4 w-4 text-red-500 transition-all duration-300" />
                        </div>
                        <span className="font-semibold tracking-wide">Keluar</span>
                      </div>
                    </button>
                  </nav>
                </div>
              </div>
            </div>

            {/* Custom Styles */}
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              
              @keyframes slideDown {
                from { 
                  opacity: 0;
                  transform: translateY(-20px) scale(0.95);
                }
                to { 
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
              
              @keyframes slideInStagger {
                from {
                  opacity: 0;
                  transform: translateX(-30px);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
              
              @keyframes glow {
                from {
                  box-shadow: 0 0 5px rgba(34, 197, 94, 0.5);
                }
                to {
                  box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.4);
                }
              }
              
              @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
            `}</style>
          </>
        )}
      </header>

    </>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('lastActivity', Date.now().toString());
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('lastActivity');
  };

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    const lastActivity = localStorage.getItem('lastActivity');
    
    if (savedUser && lastActivity) {
      const timeDiff = Date.now() - parseInt(lastActivity);
      const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
      
      if (timeDiff < sixHours) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('lastActivity');
        }
      } else {
        // Auto logout after 6 hours
        localStorage.removeItem('currentUser');
        localStorage.removeItem('lastActivity');
      }
    }
  }, []);

  // Update activity on user interaction
  useEffect(() => {
    const updateActivity = () => {
      if (currentUser) {
        localStorage.setItem('lastActivity', Date.now().toString());
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [currentUser]);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (currentUser) {
      // Request notification permission
      notificationService.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
          // Start monitoring for new bookings
          notificationService.startBookingMonitor();
        }
      });
    }
  }, [currentUser]);

  // Check for auto-logout every minute
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeDiff = Date.now() - parseInt(lastActivity);
        const sixHours = 6 * 60 * 60 * 1000;
        
        if (timeDiff >= sixHours) {
          setCurrentUser(null);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('lastActivity');
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) {
    return (
      <>
        <SimpleLogin onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <Router basename="/AplikasiAFC" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
            <Navigation currentUser={currentUser} onLogout={handleLogout} />
            <main className="pt-20 pb-20 px-2 sm:px-4 w-full min-h-screen" style={{ paddingTop: '80px' }}>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                {currentUser?.role !== 'helper' && (
                  <Route path="/" element={<SimpleBookingDashboard />} />
                )}
                {currentUser?.role === 'helper' && (
                  <Route path="/" element={<Navigate to="/scheduled" replace />} />
                )}
                <Route path="/scheduled" element={<ScheduledBookings />} />
                <Route path="/calendar" element={<BookingCalendar />} />
                <Route path="/work-report" element={<WorkReportForm />} />
                <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <Route path="/work-report-approval" element={<WorkReportApproval />} />
                )}
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <Route path="/detail-order" element={<DetailOrder />} />
                )}
                {currentUser?.role !== 'helper' && (
                  <Route path="/order-history" element={<OrderHistoryNew />} />
                )}
                <Route path="/customer-history/:phoneNumber" element={<CustomerHistory />} />
                <Route path="/customer-history/:phoneNumber/brand/:brandName" element={<BrandHistory />} />
                {currentUser?.role === 'admin' && (
                  <Route path="/admin" element={<AdminPanel />} />
                )}
                <Route path="/jadwal-shalat" element={<JadwalShalatPage />} />
                {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                  <Route path="/affiliate-list" element={<AffiliateList />} />
                )}
                </Routes>
              </Suspense>
            </main>
            <BottomNavigation />
          </div>
        </Router>
        <Toaster />
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
