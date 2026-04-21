import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { ChevronLeft, Moon, User, Bell, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { } = useAuth();
  const { profile } = useUser();
  const { toast } = useToast();

  const isDark = theme === "dark";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "정말로 서비스를 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
    );
    if (confirmed) {
      toast({
        title: "고객센터에 문의해주세요",
        description: "계정 삭제는 고객센터를 통해 처리됩니다.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 h-14 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="뒤로가기"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">설정</h1>
      </header>

      <main className="px-4 pt-6 space-y-6">
        {/* 섹션 1: 외관 */}
        <section className="rounded-xl border border-border bg-card shadow-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            외관
          </p>
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">다크 모드</p>
                <p className="text-xs text-muted-foreground">어두운 화면으로 전환합니다</p>
              </div>
            </div>
            <Switch
              checked={isDark}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="다크 모드 전환"
            />
          </div>
        </section>

        {/* 섹션 2: 내 피부 프로필 */}
        <section className="rounded-xl border border-border bg-card shadow-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            내 피부 프로필
          </p>
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">피부 타입</p>
                <p className="text-xs text-muted-foreground">현재 등록된 피부 정보</p>
              </div>
            </div>
            <span className="text-sm font-medium text-foreground">
              {profile.skinType ?? "미등록"}
            </span>
          </div>
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/onboarding")}
            >
              프로필 재설정
            </Button>
          </div>
        </section>

        {/* 섹션 3: 알림 */}
        <section className="rounded-xl border border-border bg-card shadow-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            알림
          </p>
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                푸시 알림은 브라우저 설정에서 관리됩니다
              </p>
            </div>
          </div>
        </section>

        {/* 섹션 4: 계정 */}
        <section className="rounded-xl border border-border bg-card shadow-card p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            계정
          </p>
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">로그아웃</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-foreground"
            >
              로그아웃
            </Button>
          </div>
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-harmful" />
              <span className="text-sm font-medium text-harmful">서비스 탈퇴</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAccount}
              className="text-harmful hover:text-harmful hover:bg-harmful/10"
            >
              탈퇴
            </Button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
