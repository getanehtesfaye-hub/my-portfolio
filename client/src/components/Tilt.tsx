import { useRef, type PointerEvent, type ReactNode } from "react";
import { useSite } from "../SiteContext";
import "../tilt.css";

// Wraps one child. The child tilts toward the pointer (mouse or finger), lifts, and gets a soft light.
export default function Tilt({ children, max = 12 }: { children: ReactNode; max?: number }) {
  const { motion } = useSite();
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  if (!motion) return <div className="tilt-static">{children}</div>;

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.classList.add("hot");
      el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(0)}%`);
      el.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(0)}%`);
    });
  };
  const leave = () => {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    el.classList.remove("hot");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className="tilt" onPointerMove={move} onPointerDown={move} onPointerLeave={leave} onPointerCancel={leave}
      onPointerUp={(e) => { if (e.pointerType === "touch") setTimeout(leave, 450); }}>
      {children}
    </div>
  );
}
