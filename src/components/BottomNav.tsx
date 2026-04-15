import { Home, ScanLine, Layers, BookOpen, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { icon: Home,      label: '홈',    path: '/' },
  { icon: Layers,    label: '루틴',  path: '/routine' },
  { icon: ScanLine,  label: '스캔',  path: '/scan', center: true },
  { icon: BookOpen,  label: '기록',  path: '/history' },
  { icon: User,      label: '프로필', path: '/profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path, center }) => {
          const isActive = path === '/scan'
            ? location.pathname.startsWith('/scan') || location.pathname === '/analyze'
            : location.pathname === path;
          if (center) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-0.5 px-2 -mt-5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${isActive ? 'bg-primary scale-110 shadow-primary' : 'bg-primary/90 shadow-lg'}`}>
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
              </button>
            );
          }
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
