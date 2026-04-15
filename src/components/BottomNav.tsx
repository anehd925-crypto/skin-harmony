import { Home, ScanLine, User, HeartPulse } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// 홈 / 스캔 / 내피부(루틴+일기+보관함 통합) / 프로필
const navItems = [
  { icon: Home,       label: '홈',    path: '/' },
  { icon: ScanLine,   label: '스캔',  path: '/scan', center: true },
  { icon: HeartPulse, label: '내피부', path: '/myskin' },
  { icon: User,       label: '프로필', path: '/profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/scan') {
      return location.pathname.startsWith('/scan') || location.pathname === '/analyze';
    }
    if (path === '/myskin') {
      return ['/myskin', '/routine', '/diary', '/cabinet', '/timeline'].some(p =>
        location.pathname === p || location.pathname.startsWith(p),
      );
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass border-t border-white/40 shadow-up">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {navItems.map(({ icon: Icon, label, path, center }) => {
            const active = isActive(path);

            if (center) {
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-1 -mt-6 press"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-primary transition-all duration-200 ${
                    active ? 'gradient-primary scale-105' : 'gradient-primary opacity-90'
                  }`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-[10px] font-semibold mt-0.5 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-150 press ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150 ${
                  active ? 'bg-primary/10' : ''
                }`}>
                  <Icon className={`h-[19px] w-[19px] transition-all ${active ? 'stroke-[2.2px]' : 'stroke-[1.8px]'}`} />
                </div>
                <span className={`text-[10px] font-medium transition-all ${active ? 'font-semibold' : ''}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
