import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

export type ScreenData = { brand: string; subtitle: string; projects: { title: string; category: string; text: string }[] };
export type Colors = { background: string; surface: string; primary: string; accent: string; text: string };
type Props = { progress: MutableRefObject<number>; screen: ScreenData; colors: Colors; scale: number; speed: number; mouse: boolean; particles: number; active: boolean };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const seg = (p: number, a: number, b: number) => { const t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines: number) {
  let line = "", n = 0;
  for (const w of text.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y + n * lh); n++; line = w; if (n >= maxLines) return; } else line = t;
  }
  if (line && n < maxLines) ctx.fillText(line, x, y + n * lh);
}

function drawScreen(c: HTMLCanvasElement, s: ScreenData, idx: number, col: Colors) {
  const ctx = c.getContext("2d")!;
  const W = c.width, H = c.height;
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-heading") || "sans-serif";
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, col.background); g.addColorStop(1, col.surface);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.15, 0, W * 0.85, H * 0.15, W * 0.55);
  glow.addColorStop(0, `${col.primary}66`); glow.addColorStop(1, `${col.primary}00`);
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c2, i) => { ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(40 + i * 32, 34, 9, 0, 7); ctx.fill(); });
  ctx.fillStyle = `${col.text}1a`; ctx.beginPath(); ctx.roundRect(170, 14, 440, 40, 20); ctx.fill();
  ctx.fillStyle = `${col.text}99`; ctx.font = "22px sans-serif";
  ctx.fillText(`${s.brand.toLowerCase().replace(/[^a-z0-9]+/g, "")}.dev`, 196, 42);
  if (idx < 0) {
    ctx.fillStyle = col.accent; ctx.font = "600 28px sans-serif"; ctx.fillText(s.subtitle.toUpperCase(), 80, 330);
    ctx.fillStyle = col.text; ctx.font = `700 96px ${font}, sans-serif`; wrap(ctx, s.brand, 80, 440, W - 160, 104, 2);
    return;
  }
  const p = s.projects[idx];
  ctx.fillStyle = col.accent; ctx.font = "600 26px sans-serif";
  ctx.fillText(`${String(idx + 1).padStart(2, "0")} / ${String(s.projects.length).padStart(2, "0")}`, 80, 190);
  ctx.fillStyle = `${col.text}99`; ctx.font = "30px sans-serif"; ctx.fillText(p.category, 80, 245);
  ctx.fillStyle = col.text; ctx.font = `700 78px ${font}, sans-serif`; wrap(ctx, p.title, 80, 345, W - 160, 88, 2);
  ctx.fillStyle = `${col.text}b3`; ctx.font = "32px sans-serif"; wrap(ctx, p.text, 80, 530, W - 360, 44, 3);
  ctx.fillStyle = col.accent; ctx.font = "600 30px sans-serif"; ctx.fillText("View case study  →", 80, 730);
  s.projects.forEach((_, i) => { ctx.fillStyle = i === idx ? col.accent : `${col.text}33`; ctx.beginPath(); ctx.roundRect(W - 80 - (s.projects.length - i) * 44, 716, 32, 8, 4); ctx.fill(); });
}

function makeKeyboard() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 704;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#a9afbb"; ctx.fillRect(0, 0, 1024, 704);
  ctx.fillStyle = "#12141a"; ctx.beginPath(); ctx.roundRect(60, 44, 904, 390, 24); ctx.fill();
  const cols = 14, rows = 5, kw = (904 - 40) / cols, kh = (390 - 40) / rows;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    ctx.fillStyle = "#262a33"; ctx.beginPath(); ctx.roundRect(80 + k * kw + 2, 64 + r * kh + 2, kw - 4, kh - 4, 7); ctx.fill();
  }
  ctx.fillStyle = "#b4bac5"; ctx.strokeStyle = "#7f8693"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(352, 476, 320, 190, 18); ctx.fill(); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function makeShadow() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function Particles({ count, color, speed }: { count: number; color: string; speed: number }) {
  const ref = useRef<THREE.Points>(null!);
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 7, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
      a[i * 3] = r * Math.sin(p) * Math.cos(t); a[i * 3 + 1] = r * Math.sin(p) * Math.sin(t); a[i * 3 + 2] = r * Math.cos(p);
    }
    return a;
  }, [count]);
  useFrame((_, d) => { ref.current.rotation.y += d * 0.02 * speed; });
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial size={0.025} color={color} transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

const A = [0, 2.6, 6.8], tA = [0, 0.2, 0], B = [0, 2.0, 5.4], tB = [0, 0.8, -0.6], C = [0, 1.2, 2.3], tC = [0, 1.08, -1.39];

function Laptop({ progress, screen, colors, scale, speed, mouse }: Omit<Props, "particles" | "active">) {
  const root = useRef<THREE.Group>(null!);
  const lid = useRef<THREE.Group>(null!);
  const last = useRef(-2);
  const look = useRef(new THREE.Vector3(0, 0.2, 0));
  const want = useMemo(() => new THREE.Vector3(), []);
  const wantLook = useMemo(() => new THREE.Vector3(), []);
  const canvas = useMemo(() => { const c = document.createElement("canvas"); c.width = 1280; c.height = 800; return c; }, []);
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, [canvas]);
  const keys = useMemo(makeKeyboard, []);
  const shadow = useMemo(makeShadow, []);

  useEffect(() => { last.current = -2; }, [screen, colors]);
  useEffect(() => () => { tex.dispose(); keys.dispose(); shadow.dispose(); }, [tex, keys, shadow]);

  useFrame((s, d) => {
    const p = progress.current;
    const k = Math.max(speed, 0.2);
    const aspect = s.size.width / s.size.height;
    lid.current.rotation.x = -seg(p, 0.02, 0.32) * 1.86;

    const n = screen.projects.length;
    const idx = n && p > 0.5 ? Math.min(n - 1, Math.floor(((p - 0.5) / 0.5) * n)) : -1;
    if (idx !== last.current) { last.current = idx; drawScreen(canvas, screen, idx, colors); tex.needsUpdate = true; }

    const calm = 1 - seg(p, 0, 0.5);
    const mx = mouse ? s.pointer.x : 0, my = mouse ? s.pointer.y : 0;
    const r = root.current;
    r.rotation.y = THREE.MathUtils.damp(r.rotation.y, (-0.55 + mx * 0.25) * calm, 3 * k, d);
    r.rotation.x = THREE.MathUtils.damp(r.rotation.x, -my * 0.06 * calm, 3 * k, d);
    r.position.x = THREE.MathUtils.damp(r.position.x, aspect > 1.2 ? 1.4 * (1 - seg(p, 0.1, 0.55)) : 0, 3, d);
    r.position.y = Math.sin(s.clock.elapsedTime * 0.8 * k) * 0.04 * calm;

    const t1 = seg(p, 0, 0.35), t2 = seg(p, 0.35, 0.7);
    const pos = mix(mix(A, B, t1), C, t2), tgt = mix(mix(tA, tB, t1), tC, t2);
    const fit = Math.min(2.2, Math.max(1, 1.5 / aspect));
    want.set(tgt[0] + (pos[0] - tgt[0]) * fit, tgt[1] + (pos[1] - tgt[1]) * fit, tgt[2] + (pos[2] - tgt[2]) * fit);
    wantLook.set(tgt[0], tgt[1], tgt[2]);
    const f = 1 - Math.exp(-6 * d);
    s.camera.position.lerp(want, f);
    look.current.lerp(wantLook, f);
    s.camera.lookAt(look.current);
  });

  const metal = <meshStandardMaterial color="#b9bec9" metalness={0.9} roughness={0.3} />;
  return (
    <group ref={root} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.062, 0.2]}><planeGeometry args={[7, 5]} /><meshBasicMaterial map={shadow} transparent opacity={0.55} depthWrite={false} /></mesh>
      <mesh><boxGeometry args={[3.2, 0.12, 2.2]} />{metal}</mesh>
      <mesh position={[0, 0.0605, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 2.2]} /><meshStandardMaterial map={keys} roughness={0.6} metalness={0.2} /></mesh>
      <group ref={lid} position={[0, 0.07, -1.1]}>
        <mesh position={[0, 0.03, 1.05]}><boxGeometry args={[3.2, 0.06, 2.1]} />{metal}</mesh>
        <mesh position={[0, -0.002, 1.05]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[3.1, 2.0]} /><meshBasicMaterial color="#05060a" /></mesh>
        <mesh position={[0, -0.004, 1.05]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[2.94, 1.84]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
        <mesh position={[0, 0.0605, 1.05]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.15, 32]} /><meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={0.45} /></mesh>
      </group>
    </group>
  );
}

export default function Scene3D(p: Props) {
  return (
    <Canvas camera={{ position: [0, 2.6, 6.8], fov: 40, near: 0.5, far: 60 }} dpr={[1, 1.75]} frameloop={p.active ? "always" : "never"} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2.5} position={[0, 5, -5]} scale={[10, 4, 1]} />
        <Lightformer intensity={1.5} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer intensity={1.5} position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>
      <Laptop progress={p.progress} screen={p.screen} colors={p.colors} scale={p.scale} speed={p.speed} mouse={p.mouse} />
      {p.particles > 0 && <Particles count={p.particles} color={p.colors.accent} speed={p.speed} />}
    </Canvas>
  );
}
