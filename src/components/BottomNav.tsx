import { Home, ScanLine, User, HeartPulse } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { track, EVENT } from '@/lib/analytics';

const navItems = [
  { icon: Home,       label: '홈',    path: '/' },
  { icon: ScanLine,   label: '스캔',  path: '/scan' },
  { icon: HeartPulse, label: '내피부', path: '/myskin' },
  { icon: User,       label: '프로필', path: '/profile' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === '/scan') {
      return location.pathname.startsWith('/scan') || location.pathname === '/analyze'
        || location.pathname === '/scan-ocr' || location.pathname === '/compare-ai';
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
      <div className="border-t border-border bg-white/95 backdrop-blur-md shadow-up">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-safe">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => { track(EVENT.BOTTOM_NAV_CLICKED, { path, label }); navigate(path); }}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-all duration-150 press ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-150 ${
                  active ? 'bg-primary/10' : ''
                }`}>
                  <Icon className={`h-5 w-5 transition-all ${active ? 'stroke-[2.2px] text-primary' : 'stroke-[1.6px]'}`} />
                </div>
                <span className={`text-xs transition-all ${active ? 'font-bold text-primary' : 'font-medium'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
