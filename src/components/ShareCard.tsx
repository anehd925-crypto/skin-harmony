import { useRef, useState } from 'react';
import { Share2, Download, X, Loader2, Sparkles } from 'lucide-react';

interface ShareCardProps {
  title: string;
  subtitle?: string;
  score?: number;
  grade?: 'good' | 'moderate' | 'bad';
  highlights?: string[];
  onClose: () => void;
}

const gradeInfo = {
  good:     { label: '안전', color: 'text-beneficial', bg: 'bg-beneficial/10' },
  moderate: { label: '보통', color: 'text-caution',    bg: 'bg-caution/10' },
  bad:      { label: '주의', color: 'text-harmful',    bg: 'bg-harmful/10' },
};

const ShareCard = ({ title, subtitle, score, grade, highlights = [], onClose }: ShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
    } catch {
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;

    const file = new File([blob], 'beautylens-result.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `BeautyLens - ${title}`,
        text: subtitle ?? '내 피부에 맞는 화장품을 분석해보세요',
        files: [file],
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'beautylens-result.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beautylens-result.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const g = grade ? gradeInfo[grade] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">

        {/* 공유 카드 */}
        <div ref={cardRef} className="rounded-2xl bg-card p-6 shadow-float overflow-hidden border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-brand-700" />
            <span className="font-display text-xs font-semibold text-brand-700 tracking-wide">BeautyLens</span>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>}

          {score !== undefined && (
            <div className="flex items-end gap-1 mb-4">
              <span className="font-numeric text-4xl font-bold text-foreground">{score}</span>
              <span className="font-numeric text-sm text-muted-foreground mb-1">/100</span>
              {g && (
                <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${g.bg} ${g.color}`}>
                  {g.label}
                </span>
              )}
            </div>
          )}

          {highlights.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="text-primary mt-0.5 font-bold">{i + 1}</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">beautylens.app</span>
            <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3.5 text-sm font-semibold text-white shadow-brand active:scale-[0.97] transition-all"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            공유하기
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border shadow-card active:scale-[0.97] transition-all"
          >
            <Download className="h-4 w-4 text-foreground" />
          </button>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-card border border-border shadow-card active:scale-[0.97] transition-all"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;
