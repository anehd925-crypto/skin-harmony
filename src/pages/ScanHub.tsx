import { useNavigate } from 'react-router-dom';
import { Camera, Link2, PenLine, ChevronRight, ScanLine } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const ScanHub = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pb-24">
      {/* 헤더 */}
      <div className="gradient-brand px-5 pb-8 pt-12">
        <div className="flex items-center gap-2 mb-1">
          <ScanLine className="h-5 w-5 text-primary-foreground" />
          <span className="text-lg font-bold text-primary-foreground">성분 분석</span>
        </div>
        <p className="text-sm text-primary-foreground/80">
          원하는 방법으로 제품 성분을 분석하세요
        </p>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">

        {/* 카메라 스캔 — 메인 카드 */}
        <button
          onClick={() => navigate('/scan-ocr')}
          className="w-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-5 text-left shadow-card hover:shadow-soft transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow">
              <Camera className="h-7 w-7" />
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-foreground">카메라로 스캔</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                제품 뒷면의 전성분표를 카메라로 찍으면<br />AI가 자동으로 성분을 인식하고 분석합니다
              </p>
              <span className="mt-2 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                추천 · 빠르고 간편해요
              </span>
            </div>
          </div>
        </button>

        {/* URL 입력 */}
        <button
          onClick={() => navigate('/analyze', { state: { initialMode: 'url' } })}
          className="w-full rounded-2xl border border-border bg-card p-5 text-left shadow-card hover:shadow-soft transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Link2 className="h-6 w-6" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">URL로 분석</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                올리브영, 쿠팡 등 쇼핑몰 제품 페이지 주소를<br />붙여넣으면 자동으로 성분을 가져옵니다
              </p>
            </div>
          </div>
        </button>

        {/* 직접 입력 */}
        <button
          onClick={() => navigate('/analyze', { state: { initialMode: 'text' } })}
          className="w-full rounded-2xl border border-border bg-card p-5 text-left shadow-card hover:shadow-soft transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <PenLine className="h-6 w-6" />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">직접 입력</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                제품 성분표를 직접 텍스트로 입력해서<br />분석할 수 있습니다
              </p>
            </div>
          </div>
        </button>

        {/* 안내 메모 */}
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 분석 결과는 AI 기반 참고 정보이며 의학적 진단을 대체하지 않습니다.
            개인 피부 상태에 따라 반응이 다를 수 있어요.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ScanHub;
