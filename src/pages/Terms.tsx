import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">이용약관</h1>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-6 text-sm leading-relaxed text-foreground">
        <p className="text-xs text-muted-foreground">최종 개정일: 2026년 4월 10일</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제1조 (목적)</h2>
          <p className="text-muted-foreground">
            이 약관은 BeautyLens(이하 '서비스')가 제공하는 화장품 성분 분석 서비스 이용에 관한 조건과 절차, 이용자와 서비스 간의 권리, 의무 및 책임사항을 규정하는 것을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제2조 (정의)</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li>① '서비스'란 BeautyLens가 제공하는 화장품 전성분 AI 분석 서비스를 말합니다.</li>
            <li>② '이용자'란 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li>③ '회원'이란 서비스에 가입하여 이용자 ID를 부여받은 자를 말합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제3조 (약관의 효력 및 변경)</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li>① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>② 서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 사전 공지 후 효력이 발생합니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제4조 (서비스 이용)</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li>① 서비스는 화장품 전성분 분석 정보를 AI 기술을 통해 제공하며, 이는 참고 정보로서의 성격을 가집니다.</li>
            <li>② 서비스에서 제공하는 성분 분석 결과는 의학적 진단이나 처방을 대체하지 않습니다.</li>
            <li>③ 피부 트러블, 알레르기 등 민감한 피부 문제는 반드시 전문의와 상담하시기 바랍니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제5조 (이용자의 의무)</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li>① 이용자는 다음 행위를 해서는 안 됩니다.</li>
            <li className="pl-4">- 타인의 정보를 도용하는 행위</li>
            <li className="pl-4">- 서비스의 정상적인 운영을 방해하는 행위</li>
            <li className="pl-4">- 서비스에서 허용되지 않은 방법으로 정보를 수집하는 행위</li>
            <li className="pl-4">- 허위 정보를 입력하거나 다른 이용자에게 피해를 주는 행위</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제6조 (서비스 제공의 제한)</h2>
          <p className="text-muted-foreground">
            서비스는 다음 각 호에 해당하는 경우 서비스 제공을 일시적으로 중단하거나 제한할 수 있습니다.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li>시스템 점검, 교체 및 고장 수리 시</li>
            <li>천재지변 등 불가항력적 사유가 있는 경우</li>
            <li>전기통신사업자가 전기통신 서비스를 중단한 경우</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제7조 (면책 조항)</h2>
          <ul className="space-y-1 text-muted-foreground">
            <li>① 서비스는 AI 분석 결과의 정확성을 보증하지 않으며, 이로 인한 피해에 대해 책임을 지지 않습니다.</li>
            <li>② 이용자가 게시한 정보, 자료, 사실의 신뢰도 및 정확성에 관해서는 이용자가 책임을 집니다.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제8조 (회원 탈퇴 및 자격 상실)</h2>
          <p className="text-muted-foreground">
            회원은 언제든지 서비스 내 프로필 설정에서 탈퇴를 신청할 수 있습니다. 탈퇴 시 회원의 개인정보 및 서비스 이용 기록은 삭제됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">제9조 (준거법 및 재판관할)</h2>
          <p className="text-muted-foreground">
            이 약관 및 서비스 이용과 관련한 분쟁에 대해서는 대한민국 법률을 적용합니다.
          </p>
        </section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          본 약관은 2026년 4월 10일부터 시행됩니다.
        </div>
      </div>
    </div>
  );
};

export default Terms;
