import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Clock, Users } from 'lucide-react';

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'beranda',
      label: 'Beranda',
      icon: Home,
      path: '/'
    },
    {
      id: 'daftar-affiliasi',
      label: 'Daftar Affiliasi',
      icon: Users,
      path: '/affiliate-list'
    },
    {
      id: 'jadwal-shalat',
      label: 'Jadwal Shalat',
      icon: Clock,
      path: '/jadwal-shalat'
    }
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 hidden md:block">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center p-2 relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className="mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
