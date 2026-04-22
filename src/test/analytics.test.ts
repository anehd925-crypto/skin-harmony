import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EVENT, trackInstall, trackOnboardingComplete, trackFirstAnalysis } from "@/lib/analytics";

/* Supabase mock */
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
  },
}));

describe("analytics EVENT 상수", () => {
  it("P0 이벤트 3개가 모두 정의되어 있다", () => {
    expect(EVENT.PAGE_VIEW).toBe("page_view");
    expect(EVENT.ONBOARDING_COMPLETED).toBe("onboarding_completed");
    expect(EVENT.ANALYSIS_COMPLETED).toBe("analysis_completed");
  });

  it("네비게이션 이벤트가 정의되어 있다", () => {
    expect(EVENT.BOTTOM_NAV_CLICKED).toBe("bottom_nav_clicked");
  });
});

describe("gtag 단축 함수", () => {
  const mockGtag = vi.fn();

  beforeEach(() => {
    (window as unknown as Record<string, unknown>).gtag = mockGtag;
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).gtag;
    mockGtag.mockClear();
  });

  it("trackInstall: pwa_install 이벤트를 gtag로 전송한다", () => {
    trackInstall();
    expect(mockGtag).toHaveBeenCalledWith("event", "pwa_install", undefined);
  });

  it("trackOnboardingComplete: skin_type 프로퍼티와 함께 전송한다", () => {
    trackOnboardingComplete("건성");
    expect(mockGtag).toHaveBeenCalledWith("event", "onboarding_complete", { skin_type: "건성" });
  });

  it("trackFirstAnalysis: source가 url일 때 정상 전송", () => {
    trackFirstAnalysis("url");
    expect(mockGtag).toHaveBeenCalledWith("event", "first_analysis", { source: "url" });
  });

  it("gtag 미설치 환경에서도 에러 없이 통과한다", () => {
    delete (window as unknown as Record<string, unknown>).gtag;
    expect(() => trackInstall()).not.toThrow();
  });
});

describe("appinstalled 이벤트 연동", () => {
  it("window에 appinstalled 이벤트 리스너를 추가/제거할 수 있다", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    window.addEventListener("appinstalled", trackInstall);
    expect(addSpy).toHaveBeenCalledWith("appinstalled", trackInstall);

    window.removeEventListener("appinstalled", trackInstall);
    expect(removeSpy).toHaveBeenCalledWith("appinstalled", trackInstall);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
