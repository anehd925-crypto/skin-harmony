import { Home, Compass, ScanLine, Clock, HeartPulse } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { track, EVENT } from '@/lib/analytics';

type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  center?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { icon: Home,      label: '홈',    path: '/' },
  { icon: Compass,   label: '제품찾기',  path: '/explore' },
  { icon: ScanLine,  label: '스캔',     path: '/scan', center: true },
  { icon: Clock,     label: '분석기록', path: '/history' },
  { icon: HeartPulse, label: '내리포트', path: '/myskin' },
];

const isActivePath = (path: string, pathname: string): boolean => {
  if (path === '/scan') {
    return (
      pathname.startsWith('/scan') ||
      ['/analyze', '/scan-ocr', '/compare-ai'].includes(pathname) ||
      pathname.startsWith('/product/')
    );
  }
  if (path === '/myskin') {
    return ['/myskin', '/diary', '/cabinet', '/timeline', '/blacklist', '/skin-solution', '/chat'].some(
      p => pathname === p || pathname.startsWith(p + '/'),
    );
  }
  if (path === '/history') {
    return pathname === '/history';
  }
  return pathname === path;
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNav = (path: string, label: string) => {
    track(EVENT.BOTTOM_NAV_CLICKED, { path, label });
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/95 backdrop-blur-md border-t border-border">
        <div className="mx-auto flex max-w-md items-end justify-around px-1 pb-safe">
          {NAV_ITEMS.map(({ icon: Icon, label, path, center }) => {
            const active = isActivePath(path, location.pathname);

            if (center) {
              return (
                <div key={path} className="relative flex flex-col items-center pb-2">
                  <button
                    onClick={() => handleNav(path, label)}
                    aria-label={label}
                    className={cn(
                      '-mt-6 flex h-14 w-14 items-center justify-center rounded-full shadow-brand transition-all duration-base ease-brand active:scale-95',
                      active
                        ? 'bg-brand-600 text-white'
                        : 'bg-brand-700 text-white hover:bg-brand-600',
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                  <span
                    className={cn(
                      'mt-1 text-xs transition-colors',
                      active ? 'font-bold text-brand-700' : 'font-medium text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={path}
                onClick={() => handleNav(path, label)}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-end gap-0.5 py-3 min-h-[56px] transition-all duration-base ease-brand',
                  active ? 'text-brand-700' : 'text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                    active && 'bg-brand-50',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-all',
                      active ? 'stroke-[2.2px]' : 'stroke-[1.6px]',
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-xs transition-all',
                    active ? 'font-bold' : 'font-medium',
                  )}
                >
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-brand-700" />
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
