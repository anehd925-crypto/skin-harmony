import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ChevronLeft, ImagePlus, RefreshCw, Scan, AlertCircle, CheckCircle, Package, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';

type ScanMode = 'ingredient' | 'product';   // 성분표 OCR  vs  제품 전면 AI 인식
type OcrStatus = 'idle' | 'capturing' | 'processing' | 'done' | 'error';

interface RecognizedProduct {
  name: string;
  brand: string;
  category: string;
  step: string;
  is_morning: boolean;
  is_evening: boolean;
  note: string;
  confidence: 'high' | 'medium' | 'low';
}

const ScanAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 진입 시 모드 결정 (location.state로 전달 가능)
  const initMode: ScanMode = (location.state as { scanMode?: ScanMode } | null)?.scanMode ?? 'ingredient';

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [scanMode, setScanMode] = useState<ScanMode>(initMode);
  const [status, setStatus] = useState<OcrStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // 성분 스캔용
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);

  // 제품 인식용
  const [recognizedProduct, setRecognizedProduct] = useState<RecognizedProduct | null>(null);

  const [cameraActive, setCameraActive] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setErrorMsg('');
    setStatus('capturing');
    setCapturedImage(null);
    setExtractedText('');
    setRecognizedProduct(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setStatus('error');
      setErrorMsg('카메라에 접근할 수 없습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
    }
  };

  // ── 이미지 캡처 공통 ─────────────────────────────────────────────────────────
  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.92);
  };

  // ── 성분표 OCR ───────────────────────────────────────────────────────────────
  const captureAndOcr = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;
    setCapturedImage(dataUrl);
    stopCamera();
    setStatus('processing');
    setProgress(0);
    await runOcr(dataUrl);
  };

  const runOcr = async (dataUrl: string) => {
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('kor', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(dataUrl);
      await worker.terminate();
      const cleaned = cleanIngredientText(data.text || '');
      if (cleaned.length < 10) {
        setStatus('error');
        setErrorMsg('성분 텍스트를 인식하지 못했습니다. 더 밝은 환경에서 다시 시도해주세요.');
        return;
      }
      setExtractedText(cleaned);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMsg('OCR 처리 중 오류가 발생했습니다.');
    }
  };

  // ── 제품 전면 AI 인식 ─────────────────────────────────────────────────────────
  const captureAndRecognizeProduct = async () => {
    const dataUrl = captureFrame();
    if (!dataUrl) return;
    setCapturedImage(dataUrl);
    stopCamera();
    setStatus('processing');
    await recognizeProduct(dataUrl);
  };

  const recognizeProduct = async (dataUrl: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('product-search', {
        body: { imageBase64: dataUrl },
      });
      if (error || !data?.product) {
        setStatus('error');
        setErrorMsg('제품을 인식하지 못했습니다. 제품 라벨이 잘 보이게 다시 촬영해주세요.');
        return;
      }
      setRecognizedProduct(data.product as RecognizedProduct);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMsg('AI 인식 중 오류가 발생했습니다.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('processing');
    setProgress(0);
    setCapturedImage(null);
    setExtractedText('');
    setRecognizedProduct(null);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        setStatus('error');
        setErrorMsg('이미지 읽기에 실패했어요. 다른 사진으로 시도해주세요.');
        return;
      }
      setCapturedImage(dataUrl);
      if (scanMode === 'ingredient') {
        await runOcr(dataUrl);
      } else {
        await recognizeProduct(dataUrl);
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setErrorMsg('이미지 파일을 읽지 못했어요. 권한 또는 파일 상태를 확인해주세요.');
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setStatus('idle');
    setCapturedImage(null);
    setExtractedText('');
    setRecognizedProduct(null);
    setErrorMsg('');
    setProgress(0);
    stopCamera();
  };

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    handleReset();
  };

  const confidenceLabel = { high: '높음', medium: '보통', low: '낮음' };
  const confidenceColor = { high: 'text-green-600 bg-green-50', medium: 'text-yellow-600 bg-yellow-50', low: 'text-red-600 bg-red-50' };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/scan')} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold flex-1">카메라 스캔</h1>
      </div>

      {/* 모드 탭 */}
      <div className="flex gap-1.5 bg-muted mx-4 mt-4 p-1 rounded-xl">
        <button
          onClick={() => handleModeChange('ingredient')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all ${
            scanMode === 'ingredient' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Scan className="h-3.5 w-3.5" />
          성분표 스캔
        </button>
        <button
          onClick={() => handleModeChange('product')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all ${
            scanMode === 'product' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          제품 인식
        </button>
      </div>

      <div className="flex-1 space-y-4 px-4 py-4">

        {/* 안내 배너 */}
        {status === 'idle' && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            {scanMode === 'ingredient' ? (
              <>
                <p className="text-sm font-bold text-foreground mb-1">전성분표를 스캔하세요</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  제품 뒷면 전성분 텍스트를 가이드 안에 맞춰 촬영하면 AI가 자동으로 성분을 분석합니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground mb-1">제품 전면을 촬영하세요</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  화장품 용기나 패키지 전면을 찍으면 AI가 제품명·브랜드·카테고리를 자동으로 인식해 보관함에 추가합니다.
                </p>
              </>
            )}
          </div>
        )}

        {/* 카메라 뷰 */}
        {status === 'capturing' && cameraActive && (
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/2 border border-white/60 rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-xl" />
              </div>
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
              {scanMode === 'ingredient' ? '전성분 텍스트를 가이드 안에 맞춰주세요' : '제품 전면이 가이드 안에 오도록 맞춰주세요'}
            </p>
          </div>
        )}

        {/* 촬영된 이미지 미리보기 */}
        {capturedImage && (
          <div className="overflow-hidden rounded-2xl bg-black aspect-[4/3]">
            <img src={capturedImage} alt="captured" className="w-full h-full object-cover" />
          </div>
        )}

        {/* 처리 중 */}
        {status === 'processing' && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            {scanMode === 'ingredient' ? (
              <>
                <Scan className="h-8 w-8 text-primary animate-pulse mx-auto" />
                <p className="text-sm font-semibold">성분을 인식하는 중...</p>
                <div className="w-full bg-border rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="text-sm font-semibold">AI가 제품을 인식하는 중...</p>
                <p className="text-xs text-muted-foreground">제품명과 브랜드를 찾고 있어요</p>
              </>
            )}
          </div>
        )}

        {/* 오류 */}
        {status === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleReset} className="w-full rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 시도
            </Button>
          </div>
        )}

        {/* ── 성분 스캔 완료 ── */}
        {status === 'done' && scanMode === 'ingredient' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-sm font-bold text-foreground">성분 인식 완료</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">인식된 성분 텍스트</p>
              <textarea
                className="w-full text-xs text-foreground bg-transparent resize-none leading-relaxed focus:outline-none min-h-[100px]"
                value={extractedText}
                onChange={e => setExtractedText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">잘못 인식된 내용은 직접 수정할 수 있어요</p>
            </div>
            <Button
              onClick={() => navigate('/analyze', { state: { prefilledIngredients: extractedText, fromScan: true } })}
              className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary"
            >
              성분 분석하기
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 촬영
            </Button>
          </div>
        )}

        {/* ── 제품 인식 완료 ── */}
        {status === 'done' && scanMode === 'product' && recognizedProduct && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold text-foreground">제품 인식 완료</p>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                confidenceColor[recognizedProduct.confidence ?? 'medium']
              }`}>
                인식 신뢰도 {confidenceLabel[recognizedProduct.confidence ?? 'medium']}
              </span>
            </div>

            {/* 인식된 제품 카드 */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{recognizedProduct.name || '인식된 제품'}</p>
                  <p className="text-xs text-muted-foreground">{recognizedProduct.brand}</p>
                  {recognizedProduct.note && (
                    <p className="text-xs text-primary/70 mt-1">{recognizedProduct.note}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-background px-3 py-2">
                  <p className="text-muted-foreground text-xs mb-0.5">카테고리</p>
                  <p className="font-semibold text-foreground">{recognizedProduct.category}</p>
                </div>
                <div className="rounded-xl bg-background px-3 py-2">
                  <p className="text-muted-foreground text-xs mb-0.5">사용 단계</p>
                  <p className="font-semibold text-foreground">{recognizedProduct.step}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {recognizedProduct.is_morning && (
                  <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full font-semibold">☀️ 아침</span>
                )}
                {recognizedProduct.is_evening && (
                  <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full font-semibold">🌙 저녁</span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">인식 내용이 다르면 아래에서 수정 후 추가할 수 있어요</p>
            </div>

            <Button
              onClick={() => navigate('/cabinet', { state: { prefill: recognizedProduct } })}
              className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary"
            >
              <Package className="h-4 w-4 mr-2" />
              보관함에 추가하기
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 촬영
            </Button>
          </div>
        )}

        {/* 초기 / 카메라 미작동 상태 */}
        {(status === 'idle' || (status === 'capturing' && !cameraActive)) && (
          <div className="space-y-3">
            <Button onClick={startCamera} className="w-full rounded-xl gradient-primary text-primary-foreground h-14">
              <Camera className="h-5 w-5 mr-2" />
              카메라로 촬영
            </Button>
            <label className="cursor-pointer block">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <div className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card h-14 text-sm font-semibold text-muted-foreground hover:border-primary/50 transition-colors">
                <ImagePlus className="h-5 w-5" />
                갤러리에서 선택
              </div>
            </label>
          </div>
        )}

        {/* 카메라 활성 촬영 버튼 */}
        {status === 'capturing' && cameraActive && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1 rounded-xl">취소</Button>
            <Button
              onClick={scanMode === 'ingredient' ? captureAndOcr : captureAndRecognizeProduct}
              className="flex-1 rounded-xl gradient-primary text-primary-foreground h-12"
            >
              <Camera className="h-4 w-4 mr-2" />촬영
            </Button>
          </div>
        )}

        {/* 팁 */}
        {status === 'idle' && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5">
            <p className="text-xs font-bold text-muted-foreground">촬영 팁</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {scanMode === 'ingredient' ? (
                <>
                  <li>• 밝은 환경에서 흔들림 없이 촬영하세요</li>
                  <li>• 전성분 텍스트 전체가 화면에 들어오도록 하세요</li>
                  <li>• 빛 반사가 없는 각도가 인식률이 높아요</li>
                </>
              ) : (
                <>
                  <li>• 제품 이름과 브랜드가 잘 보이도록 촬영하세요</li>
                  <li>• 용기 전면 또는 패키지 정면을 찍어주세요</li>
                  <li>• 인식률이 낮으면 보관함에서 직접 수정 가능해요</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <BottomNav />
    </div>
  );
};

function cleanIngredientText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ', ')
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ(),.\-/]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/(,\s*){2,}/g, ', ')
    .trim();
}

export default ScanAnalysis;
