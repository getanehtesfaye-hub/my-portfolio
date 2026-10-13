import { useEffect, useRef } from "react";
import { useSite } from "../SiteContext";

/** 3D tilt that follows the pointer, with a moving glare. Disabled for reduced motion / touch / animations off. */
export function useTilt<T extends HTMLElement>(max = 10) {
  const ref = useRef<T>(null);
  const { motion } = useSite();
  useEffect(() => {
    const el = ref.current;
    if (!el || !motion || !window.matchMedia("(hover:hover)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${((0.5 - y) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((x - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      });
    };
    const enter = () => el.classList.add("tilting");
    const leave = () => {
      cancelAnimationFrame(raf);
      el.classList.remove("tilting");
      el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", move); el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("pointermove", move); el.removeEventListener("pointerenter", enter); el.removeEventListener("pointerleave", leave); };
  }, [motion, max]);
  return ref;
}
