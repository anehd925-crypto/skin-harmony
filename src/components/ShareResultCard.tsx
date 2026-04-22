import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";

interface ShareResultCardProps {
  productName: string;
  productBrand?: string;
  skinFitScore?: number;
  skinFitLabel?: string;
  overallGrade: "good" | "moderate" | "bad";
  safeCount: number;
  cautionCount: number;
  dangerCount: number;
  skinType?: string;
}

/* v2 Forest Olive 브랜드 토큰 */
const BRAND   = "#235B41";
const BENEFI  = "#3d8e64";
const CAUTION = "#d89b2a";
const HARMFUL = "#c14a3a";
const SAND    = "#fdfcf9";
const INK_900 = "#1c1814";
const INK_500 = "#8a7f74";

function getGradeInfo(grade: string) {
  switch (grade) {
    case "good":     return { label: "안전",  color: BENEFI  };
    case "moderate": return { label: "보통",  color: CAUTION };
    case "bad":      return { label: "주의",  color: HARMFUL };
    default:         return { label: "분석됨", color: INK_500 };
  }
}

function getScoreColor(score: number) {
  if (score >= 70) return BENEFI;
  if (score >= 40) return CAUTION;
  return HARMFUL;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

export function ShareResultCard({
  productName,
  productBrand,
  skinFitScore,
  skinFitLabel,
  overallGrade,
  safeCount,
  cautionCount,
  dangerCount,
  skinType,
}: ShareResultCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCard = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error("canvas not found"));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas context not found"));

      const W = 600, H = 600;
      canvas.width = W;
      canvas.height = H;

      const gradeInfo  = getGradeInfo(overallGrade);
      const scoreColor = skinFitScore != null ? getScoreColor(skinFitScore) : INK_500;
      const font       = "'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";

      // 배경 (Sand)
      ctx.fillStyle = SAND;
      ctx.fillRect(0, 0, W, H);

      // 헤더 바 (Forest Olive)
      ctx.fillStyle = BRAND;
      ctx.fillRect(0, 0, W, 72);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold 20px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText("BeautyLens 전성분 분석 결과", W / 2, 44);

      // 제품명
      const displayName = productName.length > 22 ? productName.slice(0, 22) + "…" : productName;
      ctx.fillStyle = INK_900;
      ctx.font = `bold 22px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(displayName, W / 2, 128);

      // 브랜드명
      const brandY = 154;
      if (productBrand) {
        ctx.fillStyle = INK_500;
        ctx.font = `16px ${font}`;
        ctx.fillText(productBrand, W / 2, brandY);
      }

      // 종합 등급 뱃지
      const badgeY = productBrand ? 190 : 170;
      ctx.fillStyle = gradeInfo.color + "22";
      roundRect(ctx, W / 2 - 70, badgeY, 140, 36, 18);
      ctx.fillStyle = gradeInfo.color;
      ctx.font = `bold 17px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText(`종합 등급: ${gradeInfo.label}`, W / 2, badgeY + 24);

      // 피부 적합도 점수
      if (skinFitScore != null) {
        const scoreY = badgeY + 60;
        ctx.fillStyle = scoreColor;
        ctx.font = `bold 60px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText(`${skinFitScore}점`, W / 2, scoreY + 56);

        ctx.fillStyle = INK_500;
        ctx.font = `15px ${font}`;
        ctx.fillText(`내 피부 적합도${skinType ? ` (${skinType})` : ""}`, W / 2, scoreY + 80);

        if (skinFitLabel) {
          ctx.fillStyle = scoreColor;
          ctx.font = `bold 14px ${font}`;
          ctx.fillText(`[ ${skinFitLabel} ]`, W / 2, scoreY + 100);
        }
      }

      // 성분 카운트 박스 3개
      const countY = 406;
      const boxW   = 158;
      const boxes  = [
        { label: "유익", count: safeCount,    color: BENEFI,  x: 58  },
        { label: "주의", count: cautionCount, color: CAUTION, x: 222 },
        { label: "위험", count: dangerCount,  color: HARMFUL, x: 386 },
      ];
      for (const box of boxes) {
        ctx.fillStyle = box.color + "18";
        roundRect(ctx, box.x, countY, boxW, 72, 12);
        ctx.fillStyle = box.color;
        ctx.font = `bold 30px ${font}`;
        ctx.textAlign = "center";
        ctx.fillText(`${box.count}개`, box.x + boxW / 2, countY + 40);
        ctx.fillStyle = INK_500;
        ctx.font = `13px ${font}`;
        ctx.fillText(box.label, box.x + boxW / 2, countY + 62);
      }

      // 하단 CTA (Sand + Forest Olive)
      ctx.fillStyle = "#f3ebd4";
      ctx.fillRect(0, 506, W, 94);
      ctx.fillStyle = INK_500;
      ctx.font = `15px ${font}`;
      ctx.textAlign = "center";
      ctx.fillText("내 피부에 맞는 화장품 성분을 분석해보세요", W / 2, 538);
      ctx.fillStyle = BRAND;
      ctx.font = `bold 17px ${font}`;
      ctx.fillText("BeautyLens (beautylens.app) →", W / 2, 573);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob 생성 실패"))),
        "image/png"
      );
    });
  }, [productName, productBrand, skinFitScore, skinFitLabel, overallGrade, safeCount, cautionCount, dangerCount, skinType]);

  const handleShare = async () => {
    try {
      const blob = await drawCard();
      const file = new File([blob], "beautylens-analysis.png", { type: "image/png" });
      const shareUrl = `https://beautylens.app?utm_source=share&utm_medium=card&utm_campaign=analysis`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "BeautyLens 성분 분석 결과",
          text: `${productName} 성분 분석 | ${shareUrl}`,
          files: [file],
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "BeautyLens 성분 분석 결과",
          text: `${productName} 성분 분석 결과를 확인해보세요!`,
          url: shareUrl,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "beautylens-analysis.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // 사용자 취소 시 무시
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await drawCard();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "beautylens-analysis.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("이미지 저장 실패:", err);
    }
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="flex items-center gap-1.5 flex-1 border-primary/30 text-primary hover:bg-primary/5"
        >
          <Share2 className="w-3.5 h-3.5" />
          결과 공유하기
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-muted-foreground"
        >
          <Download className="w-3.5 h-3.5" />
          저장
        </Button>
      </div>
    </>
  );
}
