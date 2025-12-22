import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value: number;
  indicatorColor?: string;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorColor, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className ?? ""}`}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full transition-all"
      style={{
        transform: `translateX(-${100 - value}%)`,
        backgroundColor: indicatorColor ?? "#2563eb",
      }}
    />
  </ProgressPrimitive.Root>
));

Progress.displayName = "Progress";

export { Progress };