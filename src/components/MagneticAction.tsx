import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { isFineDesktopViewport, prefersReducedMotion } from "../lib/scrollEngine";

export interface MagneticActionProps {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticAction({
  children,
  strength = 3.5,
  className = "inline-block",
}: MagneticActionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 320, damping: 24, mass: 0.4 });
  const y = useSpring(rawY, { stiffness: 320, damping: 24, mass: 0.4 });

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion() || !isFineDesktopViewport()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const normX = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    const normY = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    rawX.set(normX * strength);
    rawY.set(normY * strength);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}
