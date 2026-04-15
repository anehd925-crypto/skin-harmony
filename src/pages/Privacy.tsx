import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold">개인정보 처리방침</h1>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-6 text-sm leading-relaxed text-foreground">
        <p className="text-xs text-muted-foreground">최종 개정일: 2026년 4월 10일</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">1. 개인정보 처리 목적</h2>
          <p className="text-muted-foreground">
            BeautyLens(이하 '서비스')는 다음 목적으로 개인정보를 처리합니다. 처리한 개인정보는 다음 목적 이외의 용도로는 사용되지 않으며, 이용 목적이 변경될 경우에는 사전동의를 구합니다.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li>회원 가입 및 본인 확인</li>
            <li>맞춤형 화장품 성분 분석 서비스 제공</li>
            <li>할인 알림 및 푸시 알림 발송</li>
            <li>서비스 이용 기록 관리</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">2. 처리하는 개인정보 항목</h2>
          <div className="rounded-xl border border-border p-4 space-y-2 text-muted-foreground">
            <p className="font-medium text-foreground">필수 항목</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>이메일 주소</li>
              <li>비밀번호 (암호화 저장)</li>
              <li>서비스 이용 기록 (성분 분석 결과)</li>
            </ul>
            <p className="font-medium text-foreground mt-3">선택 항목</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>피부 타입, 피부 고민, 알레르기 성분 등 피부 프로필 정보</li>
              <li>닉네임</li>
              <li>푸시 알림 구독 정보 (기기 토큰)</li>
            </ul>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">3. 개인정보 보유 및 이용 기간</h2>
          <p className="text-muted-foreground">
            회원 탈퇴 시까지 보유합니다. 단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">4. 개인정보 제3자 제공</h2>
          <p className="text-muted-foreground">
            서비스는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 아래의 경우에는 예외로 합니다.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">5. 개인정보 처리 위탁</h2>
          <div className="rounded-xl border border-border p-4 text-muted-foreground">
            <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
            <div className="mt-2 space-y-1">
              <p>• <strong className="text-foreground">Supabase Inc.</strong> – 데이터베이스 및 인증 서비스 운영</p>
              <p>• <strong className="text-foreground">Google LLC</strong> – Google 소셜 로그인 서비스 (Google OAuth 2.0)</p>
              <p>• <strong className="text-foreground">Groq Inc.</strong> – AI 성분 분석 처리</p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">6. 이용자의 권리</h2>
          <p className="text-muted-foreground">
            이용자는 언제든지 등록된 자신의 개인정보를 조회하거나 수정할 수 있으며, 개인정보 삭제(회원 탈퇴)를 요청할 수 있습니다. 개인정보 관련 문의는 아래 연락처로 하시기 바랍니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">7. 개인정보 보호책임자</h2>
          <div className="rounded-xl border border-border p-4 text-muted-foreground">
            <p>이메일: <span className="text-primary">support@beautylens.app</span></p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">8. 쿠키 사용</h2>
          <p className="text-muted-foreground">
            서비스는 로그인 상태 유지, 서비스 이용 분석을 위해 브라우저 로컬스토리지 및 세션스토리지를 사용합니다. 브라우저 설정을 통해 저장소 사용을 거부할 수 있으나, 이 경우 서비스 이용에 일부 제한이 있을 수 있습니다.
          </p>
        </section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground">
          본 방침은 2026년 4월 10일부터 시행됩니다.
        </div>
      </div>
    </div>
  );
};

export default Privacy;
