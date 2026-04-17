import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { track, EVENT } from "@/lib/analytics";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 프로덕션에서 콘솔 노이즈를 만들지 않고 분석 이벤트로만 남긴다.
    void track(EVENT.PAGE_VIEW, { not_found: true, pathname: location.pathname });
    if (import.meta.env.DEV) {
      console.warn("[NotFound] unknown route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-foreground">페이지를 찾을 수 없어요</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          주소가 바뀌었거나 삭제된 페이지일 수 있습니다.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground hover:bg-neutral-50"
          >
            이전으로
          </button>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
