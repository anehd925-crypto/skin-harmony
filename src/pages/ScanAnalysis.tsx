import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, ImagePlus, RefreshCw, Scan, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomNav from '@/components/BottomNav';

type OcrStatus = 'idle' | 'capturing' | 'processing' | 'done' | 'error';

const ScanAnalysis = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<OcrStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const startCamera = async () => {
    setErrorMsg('');
    setStatus('capturing');
    setCapturedImage(null);
    setExtractedText('');

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

  const captureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
    setStatus('processing');
    setProgress(0);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('kor', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(dataUrl);
      await worker.terminate();

      const raw = data.text || '';
      const cleaned = cleanIngredientText(raw);

      if (cleaned.length < 10) {
        setStatus('error');
        setErrorMsg('성분 텍스트를 인식하지 못했습니다. 더 밝은 환경에서 다시 시도하거나 수동으로 입력해주세요.');
        return;
      }

      setExtractedText(cleaned);
      setStatus('done');
    } catch {
      setStatus('error');
      setErrorMsg('OCR 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setProgress(0);
    setCapturedImage(null);
    setExtractedText('');
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setCapturedImage(dataUrl);

      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('kor', 1, {
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        const { data } = await worker.recognize(dataUrl);
        await worker.terminate();

        const raw = data.text || '';
        const cleaned = cleanIngredientText(raw);

        if (cleaned.length < 10) {
          setStatus('error');
          setErrorMsg('성분 텍스트를 인식하지 못했습니다. 더 밝은 환경에서 촬영하거나 다른 이미지를 사용해주세요.');
          return;
        }

        setExtractedText(cleaned);
        setStatus('done');
      } catch {
        setStatus('error');
        setErrorMsg('이미지 처리 중 오류가 발생했습니다.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    navigate('/analyze', { state: { prefilledIngredients: extractedText, fromScan: true } });
  };

  const handleReset = () => {
    setStatus('idle');
    setCapturedImage(null);
    setExtractedText('');
    setErrorMsg('');
    setProgress(0);
    stopCamera();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <button onClick={() => navigate('/scan')} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">성분 스캔</h1>
      </div>

      <div className="flex-1 space-y-4 px-5 py-5">
        {/* 안내 배너 */}
        {status === 'idle' && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground mb-1">전성분 표시를 카메라로 찍어주세요</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              제품 뒷면의 전성분 표시를 선명하게 촬영하거나 갤러리에서 사진을 선택하면 자동으로 성분을 인식합니다.
            </p>
          </div>
        )}

        {/* 카메라 뷰 */}
        {status === 'capturing' && cameraActive && (
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            {/* 스캔 가이드 오버레이 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/2 border-2 border-white/70 rounded-xl">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-xl" />
              </div>
            </div>
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
              전성분 텍스트가 가이드 안에 오도록 맞춰주세요
            </p>
          </div>
        )}

        {/* 캡처된 이미지 미리보기 */}
        {capturedImage && (
          <div className="overflow-hidden rounded-2xl bg-black aspect-[4/3]">
            <img src={capturedImage} alt="captured" className="w-full h-full object-cover" />
          </div>
        )}

        {/* OCR 처리 중 */}
        {status === 'processing' && (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
            <div className="flex justify-center">
              <Scan className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-foreground">성분을 인식하는 중...</p>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* 오류 */}
        {status === 'error' && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{errorMsg}</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleReset} className="w-full rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 시도
            </Button>
          </div>
        )}

        {/* OCR 완료 - 인식된 텍스트 */}
        {status === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold text-foreground">성분 인식 완료</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">인식된 성분 텍스트</p>
              <textarea
                className="w-full text-xs text-foreground bg-transparent resize-none leading-relaxed focus:outline-none min-h-[120px]"
                value={extractedText}
                onChange={e => setExtractedText(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                잘못 인식된 내용은 직접 수정할 수 있어요
              </p>
            </div>
            <Button onClick={handleAnalyze} className="w-full rounded-xl gradient-brand text-primary-foreground shadow-primary">
              성분 분석하기
            </Button>
            <Button variant="outline" onClick={handleReset} className="w-full rounded-xl">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />다시 촬영
            </Button>
          </div>
        )}

        {/* 초기/카메라 미작동 상태 액션 버튼 */}
        {(status === 'idle' || (status === 'capturing' && !cameraActive)) && (
          <div className="space-y-3">
            <Button onClick={startCamera} className="w-full rounded-xl gradient-brand text-primary-foreground h-14">
              <Camera className="h-5 w-5 mr-2" />
              카메라로 촬영
            </Button>

            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <div className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card h-14 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                <ImagePlus className="h-5 w-5" />
                갤러리에서 선택
              </div>
            </label>
          </div>
        )}

        {/* 카메라 활성 상태 촬영 버튼 */}
        {status === 'capturing' && cameraActive && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1 rounded-xl">
              취소
            </Button>
            <Button onClick={captureAndOcr} className="flex-1 rounded-xl gradient-brand text-primary-foreground h-12">
              <Camera className="h-4 w-4 mr-2" />
              촬영
            </Button>
          </div>
        )}

        {/* 팁 */}
        {status === 'idle' && (
          <div className="rounded-xl border border-border bg-card/50 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">촬영 팁</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• 밝은 환경에서 흔들림 없이 촬영하세요</li>
              <li>• 전성분 텍스트 전체가 화면에 들어오도록 하세요</li>
              <li>• 빛 반사가 없는 각도로 촬영하면 인식률이 높아집니다</li>
            </ul>
          </div>
        )}
      </div>

      {/* 숨겨진 캔버스 (캡처용) */}
      <canvas ref={canvasRef} className="hidden" />

      <BottomNav />
    </div>
  );
};

/**
 * OCR 결과에서 화장품 성분 텍스트만 추출
 * 줄바꿈, 특수문자 정리 후 성분 목록 형식으로 변환
 */
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
