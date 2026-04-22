import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (클래스 병합 유틸)", () => {
  it("단일 클래스 그대로 반환", () => {
    expect(cn("text-sm")).toBe("text-sm");
  });

  it("여러 클래스를 공백으로 병합", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("Tailwind 충돌 시 마지막 값 우선 (twMerge)", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-brand-700")).toBe("bg-brand-700");
  });

  it("falsy 값 무시", () => {
    expect(cn("text-sm", false && "hidden", undefined, null as never)).toBe("text-sm");
  });

  it("조건부 클래스", () => {
    const active = true;
    expect(cn("border", active && "border-brand-700")).toBe("border border-brand-700");
  });
});
