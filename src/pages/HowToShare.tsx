import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Share2, Smartphone } from 'lucide-react';

const steps = {
  coupang: [
    { step: 1, text: '쿠팡 앱에서 화장품 상품 페이지로 이동' },
    { step: 2, text: '상단 또는 하단의 공유하기(↑) 버튼 탭' },
    { step: 3, text: '공유 메뉴에서 "BeautyLens" 선택' },
    { step: 4, text: '자동으로 전성분 분석이 시작돼요' },
  ],
  oliveyoung: [
    { step: 1, text: '올리브영 앱에서 화장품 상품 페이지로 이동' },
    { step: 2, text: '상단의 공유하기(↑) 버튼 탭' },
    { step: 3, text: '공유 메뉴에서 "BeautyLens" 선택' },
    { step: 4, text: '자동으로 전성분 분석이 시작돼요' },
  ],
};

const HowToShare = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="gradient-primary px-5 pb-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-primary-foreground/80">
          <ChevronLeft className="h-4 w-4" />뒤로
        </button>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary-foreground" />
          <h1 className="text-lg font-bold text-primary-foreground">공유로 바로 분석하기</h1>
        </div>
        <p className="mt-1 text-sm text-primary-foreground/80">
          쿠팡·올리브영 앱에서 공유하면 전성분을 바로 분석해드려요
        </p>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {/* 안내 배너 */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
          <Smartphone className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">BeautyLens 앱 설치 필요</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              공유 기능을 사용하려면 BeautyLens가 기기에 설치되어 있어야 합니다.
              웹 브라우저에서도 URL을 직접 붙여넣어 사용할 수 있어요.
            </p>
          </div>
        </div>

        {/* 쿠팡 안내 */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-orange-600">쿠팡에서 공유하기</p>
          </div>
          <div className="p-4 space-y-3">
            {steps.coupang.map(({ step, text }) => (
              <div key={step} className="flex gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">{step}</span>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 올리브영 안내 */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-green-600">올리브영에서 공유하기</p>
          </div>
          <div className="p-4 space-y-3">
            {steps.oliveyoung.map(({ step, text }) => (
              <div key={step} className="flex gap-3">
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-600">{step}</span>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* URL 직접 입력 안내 */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">URL 직접 붙여넣기</p>
          <p className="text-xs text-muted-foreground">
            공유 기능 대신 쿠팡·올리브영 상품 URL을 복사해서
            전성분 분석 페이지의 "URL 입력" 탭에 붙여넣어도 됩니다.
          </p>
          <button
            onClick={() => navigate('/analyze')}
            className="mt-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            전성분 분석 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToShare;
