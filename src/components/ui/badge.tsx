import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        /* BeautyLens 성분 전용 */
        beneficial:
          "border-transparent bg-beneficial text-beneficial-foreground",
        caution:
          "border-transparent bg-caution text-caution-foreground",
        harmful:
          "border-transparent bg-harmful text-harmful-foreground",
        /* 채도 낮은 배경 버전 */
        "beneficial-soft":
          "border-transparent bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300",
        "caution-soft":
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        "harmful-soft":
          "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
