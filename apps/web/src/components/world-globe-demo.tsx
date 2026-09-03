"use client";

import { useEffect, useRef } from "react";
import styles from "../../app/landing.module.css";
import worldGeo from "../data/world-geo.json";

// 1:1 Natural Earth Landmasses and Country Borders data
interface WorldGeoData {
  land: Array<Array<Array<[number, number]>>>;
  borders: Array<Array<[number, number]>>;
}

const geoData = worldGeo as WorldGeoData;
const GLOBE_RADIUS_SCALE = 0.4;

// Visitor / Agent avatar markers across regions
interface AvatarPin {
  id: string;
  avatar: string;
  lat: number;
  lng: number;
  color: string;
}

const AVATAR_PINS: AvatarPin[] = [
  {
    id: "pin-istanbul",
    avatar: "👩‍💻",
    lat: 41.0082,
    lng: 28.9784,
    color: "#009fe3",
  },
  {
    id: "pin-london",
    avatar: "👨‍🔬",
    lat: 51.5074,
    lng: -0.1278,
    color: "#0284c7",
  },
  {
    id: "pin-berlin",
    avatar: "🤖",
    lat: 52.52,
    lng: 13.405,
    color: "#0ea5e9",
  },
  {
    id: "pin-ny",
    avatar: "🧑‍🎨",
    lat: 40.7128,
    lng: -74.006,
    color: "#0284c7",
  },
  {
    id: "pin-sf",
    avatar: "👩‍🚀",
    lat: 37.7749,
    lng: -122.4194,
    color: "#8b5cf6",
  },
  {
    id: "pin-tokyo",
    avatar: "🧑‍💻",
    lat: 35.6762,
    lng: 139.6503,
    color: "#6366f1",
  },
  {
    id: "pin-seoul",
    avatar: "👩‍💼",
    lat: 37.5665,
    lng: 126.978,
    color: "#009fe3",
  },
  {
    id: "pin-singapore",
    avatar: "🧑‍💼",
    lat: 1.3521,
    lng: 103.8198,
    color: "#10b981",
  },
  {
    id: "pin-sydney",
    avatar: "🏄‍♀️",
    lat: -33.8688,
    lng: 151.2093,
    color: "#06b6d4",
  },
  {
    id: "pin-sp",
    avatar: "👩‍🏫",
    lat: -23.5505,
    lng: -46.6333,
    color: "#8b5cf6",
  },
];

// Curated geographic labels (positioned cleanly without overlap)
interface GlobeLabel {
  text: string;
  lat: number;
  lng: number;
  isSea?: boolean;
}

const GLOBE_LABELS: GlobeLabel[] = [
  { text: "Turkey", lat: 39.0, lng: 35.0 },
  { text: "Europe", lat: 50.0, lng: 14.0 },
  { text: "Mediterranean", lat: 33.5, lng: 18.0, isSea: true },
  { text: "United States", lat: 39.0, lng: -98.0 },
  { text: "South America", lat: -15.0, lng: -55.0 },
  { text: "Africa", lat: 7.0, lng: 22.0 },
  { text: "Asia", lat: 48.0, lng: 92.0 },
  { text: "Japan", lat: 36.5, lng: 138.0 },
  { text: "Australia", lat: -25.0, lng: 134.0 },
  { text: "Atlantic Ocean", lat: 24.0, lng: -38.0, isSea: true },
  { text: "Pacific Ocean", lat: 18.0, lng: 165.0, isSea: true },
  { text: "Indian Ocean", lat: -18.0, lng: 75.0, isSea: true },
];

export function WorldGlobeDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initial angle centered on Turkey (lon: 35°E, lat: 39°N) with 22° downward perspective
  const rotYRef = useRef(-32); // Centers Turkey, Mediterranean & Europe
  const rotXRef = useRef(22); // 22 degrees tilt down looking at Northern Hemisphere
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartRot = useRef({ y: 0, x: 0 });
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    // 3D Spherical Orthographic Projection Math
    const project3D = (
      lng: number,
      lat: number,
      yawDeg: number,
      pitchDeg: number,
    ): [number, number, number] => {
      const phi = toRad(lat);
      const lambda = toRad(lng);
      const rotYRad = toRad(yawDeg);
      const rotXRad = toRad(pitchDeg);

      const x0 = Math.cos(phi) * Math.sin(lambda);
      const y0 = Math.sin(phi);
      const z0 = Math.cos(phi) * Math.cos(lambda);

      // Rotate around Y-axis (Yaw)
      const x1 = x0 * Math.cos(rotYRad) + z0 * Math.sin(rotYRad);
      const y1 = y0;
      const z1 = -x0 * Math.sin(rotYRad) + z0 * Math.cos(rotYRad);

      // Rotate around X-axis (Pitch)
      const x2 = x1;
      const y2 = y1 * Math.cos(rotXRad) - z1 * Math.sin(rotXRad);
      const z2 = y1 * Math.sin(rotXRad) + z1 * Math.cos(rotXRad);

      return [x2, y2, z2];
    };

    // Sutherland-Hodgman spherical hemisphere polygon clipping (z >= 0)
    const clipPolygonRing = (
      ring: Array<[number, number]>,
      yaw: number,
      pitch: number,
    ): Array<[number, number, number]> => {
      const v3d: Array<[number, number, number]> = [];
      for (const p of ring) {
        if (p && typeof p[0] === "number" && typeof p[1] === "number") {
          v3d.push(project3D(p[0], p[1], yaw, pitch));
        }
      }
      if (v3d.length < 3) return [];

      const clipped: Array<[number, number, number]> = [];
      const n = v3d.length;

      for (let i = 0; i < n; i++) {
        const a = v3d[i];
        const nextIdx = (i + 1) % n;
        const b = v3d[nextIdx];
        if (!a || !b) continue;

        const aVis = a[2] >= 0;
        const bVis = b[2] >= 0;

        if (aVis && bVis) {
          clipped.push(b);
        } else if (aVis && !bVis) {
          const denom = a[2] - b[2];
          const t = denom !== 0 ? a[2] / denom : 0;
          const x = (1 - t) * a[0] + t * b[0];
          const y = (1 - t) * a[1] + t * b[1];
          const len = Math.hypot(x, y) || 1;
          clipped.push([x / len, y / len, 0]);
        } else if (!aVis && bVis) {
          const denom = b[2] - a[2];
          const t = denom !== 0 ? -a[2] / denom : 0;
          const x = (1 - t) * a[0] + t * b[0];
          const y = (1 - t) * a[1] + t * b[1];
          const len = Math.hypot(x, y) || 1;
          clipped.push([x / len, y / len, 0]);
          clipped.push(b);
        }
      }

      if (clipped.length < 3) return [];

      // Interpolate along the curved horizon arc between any consecutive horizon points (z = 0)
      const smoothed: Array<[number, number, number]> = [];
      const lenClipped = clipped.length;
      for (let i = 0; i < lenClipped; i++) {
        const p1 = clipped[i];
        const nextPIdx = (i + 1) % lenClipped;
        const p2 = clipped[nextPIdx];
        if (!p1 || !p2) continue;

        smoothed.push(p1);

        if (
          Math.abs(p1[2]) < 0.001 &&
          Math.abs(p2[2]) < 0.001 &&
          Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) > 0.08
        ) {
          const angle1 = Math.atan2(p1[1], p1[0]);
          const angle2 = Math.atan2(p2[1], p2[0]);
          let diff = angle2 - angle1;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;

          const steps = Math.min(8, Math.max(1, Math.ceil(Math.abs(diff) / 0.25)));
          for (let s = 1; s < steps; s++) {
            const ang = angle1 + (diff * s) / steps;
            smoothed.push([Math.cos(ang), Math.sin(ang), 0]);
          }
        }
      }

      return smoothed;
    };

    // Draw clipped 3D line string on canvas with horizon intersection clipping
    const drawClippedLine = (
      points: Array<[number, number]>,
      yaw: number,
      pitch: number,
      cx: number,
      cy: number,
      R: number,
    ) => {
      if (points.length < 2) return;
      let prev3D: [number, number, number] | null = null;

      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (!pt || typeof pt[0] !== "number" || typeof pt[1] !== "number") continue;

        const curr3D = project3D(pt[0], pt[1], yaw, pitch);

        if (prev3D) {
          const prevVis = prev3D[2] >= 0;
          const currVis = curr3D[2] >= 0;

          if (prevVis && currVis) {
            ctx.lineTo(cx + curr3D[0] * R, cy - curr3D[1] * R);
          } else if (prevVis && !currVis) {
            const denom = prev3D[2] - curr3D[2];
            const t = denom !== 0 ? prev3D[2] / denom : 0;
            const x = (1 - t) * prev3D[0] + t * curr3D[0];
            const y = (1 - t) * prev3D[1] + t * curr3D[1];
            const len = Math.hypot(x, y) || 1;
            ctx.lineTo(cx + (x / len) * R, cy - (y / len) * R);
          } else if (!prevVis && currVis) {
            const denom = curr3D[2] - prev3D[2];
            const t = denom !== 0 ? -prev3D[2] / denom : 0;
            const x = (1 - t) * prev3D[0] + t * curr3D[0];
            const y = (1 - t) * prev3D[1] + t * curr3D[1];
            const len = Math.hypot(x, y) || 1;
            ctx.moveTo(cx + (x / len) * R, cy - (y / len) * R);
            ctx.lineTo(cx + curr3D[0] * R, cy - curr3D[1] * R);
          }
        } else if (curr3D[2] >= 0) {
          ctx.moveTo(cx + curr3D[0] * R, cy - curr3D[1] * R);
        }

        prev3D = curr3D;
      }
    };

    const render = (time: number) => {
      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.1) : 0.016;
      lastTimeRef.current = time;

      // Smooth continuous planetary rotation (~11 deg/sec)
      if (!isDraggingRef.current) {
        rotYRef.current -= 11 * dt;
        if (rotYRef.current <= -360) {
          rotYRef.current += 360;
        }
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Check dark mode
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";

      // Perfectly framed globe geometry:
      // High visibility for mid-latitudes (Turkey 39°N, Europe, Mediterranean, Americas, Asia)
      const R = Math.min(width * GLOBE_RADIUS_SCALE, height * GLOBE_RADIUS_SCALE, 160);
      const cx = width / 2;
      const cy = height * 0.48;

      const yaw = rotYRef.current;
      const pitch = rotXRef.current;

      // 1. Atmosphere Rim Halo (soft luminous planetary glow)
      const glowGrad = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.34);
      if (isDark) {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
        glowGrad.addColorStop(0.35, "rgba(0, 159, 227, 0.16)");
        glowGrad.addColorStop(0.7, "rgba(0, 159, 227, 0.04)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(90, 190, 255, 0.55)");
        glowGrad.addColorStop(0.35, "rgba(140, 215, 255, 0.25)");
        glowGrad.addColorStop(0.7, "rgba(180, 230, 255, 0.08)");
        glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      }

      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.34, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. Globe Sphere (Clipping Mask)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // 3. Ocean Base with 3D Spherical Light Gradient
      const oceanGrad = ctx.createRadialGradient(
        cx - R * 0.3,
        cy - R * 0.35,
        R * 0.05,
        cx,
        cy,
        R * 1.05,
      );

      if (isDark) {
        oceanGrad.addColorStop(0, "#1d3d63");
        oceanGrad.addColorStop(0.45, "#0f233c");
        oceanGrad.addColorStop(1, "#081626");
      } else {
        oceanGrad.addColorStop(0, "#8ed4fa");
        oceanGrad.addColorStop(0.45, "#74bef8");
        oceanGrad.addColorStop(1, "#4da6f2");
      }

      ctx.fillStyle = oceanGrad;
      ctx.fillRect(cx - R - 2, cy - R - 2, R * 2 + 4, R * 2 + 4);

      // 4. Subtle Graticule Lines (Parallels & Meridians)
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.24)";
      ctx.lineWidth = 0.65;
      ctx.beginPath();

      // Parallels (Latitudes)
      for (let lat = -60; lat <= 60; lat += 30) {
        const line: Array<[number, number]> = [];
        for (let lng = -180; lng <= 180; lng += 8) {
          line.push([lng, lat]);
        }
        drawClippedLine(line, yaw, pitch, cx, cy, R);
      }

      // Meridians (Longitudes)
      for (let lng = -180; lng < 180; lng += 30) {
        const line: Array<[number, number]> = [];
        for (let lat = -80; lat <= 80; lat += 5) {
          line.push([lng, lat]);
        }
        drawClippedLine(line, yaw, pitch, cx, cy, R);
      }
      ctx.stroke();

      // 5. Authentic 1:1 Continents & Landmasses (Natural Earth data)
      ctx.fillStyle = isDark ? "#1e3b5c" : "#daf5db";
      ctx.strokeStyle = isDark ? "#2a5480" : "#bfe8c2";
      ctx.lineWidth = 0.9;

      ctx.beginPath();
      for (const poly of geoData.land) {
        for (const ring of poly) {
          const clipped = clipPolygonRing(ring, yaw, pitch);
          const first = clipped[0];
          if (clipped.length >= 3 && first) {
            ctx.moveTo(cx + first[0] * R, cy - first[1] * R);
            for (let i = 1; i < clipped.length; i++) {
              const pt = clipped[i];
              if (pt) {
                ctx.lineTo(cx + pt[0] * R, cy - pt[1] * R);
              }
            }
            ctx.closePath();
          }
        }
      }
      ctx.fill();
      ctx.stroke();

      // 6. Authentic 1:1 Country Borders (Warm coral lines in light mode, cyan in dark mode)
      ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.48)" : "rgba(240, 115, 105, 0.85)";
      ctx.lineWidth = 0.85;

      ctx.beginPath();
      for (const borderLine of geoData.borders) {
        drawClippedLine(borderLine, yaw, pitch, cx, cy, R);
      }
      ctx.stroke();

      // 7. Geographic Text Labels (Fades in when facing camera, no overlaps)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const item of GLOBE_LABELS) {
        const p3d = project3D(item.lng, item.lat, yaw, pitch);
        if (p3d[2] > 0.2) {
          const px = cx + p3d[0] * R;
          const py = cy - p3d[1] * R;
          const alpha = Math.min(1, (p3d[2] - 0.2) * 2.8);
          ctx.font = item.isSea
            ? "italic 500 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            : "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

          if (isDark) {
            ctx.fillStyle = item.isSea
              ? `rgba(125, 211, 252, ${alpha * 0.8})`
              : `rgba(224, 242, 254, ${alpha * 0.92})`;
          } else {
            ctx.fillStyle = item.isSea
              ? `rgba(24, 98, 160, ${alpha * 0.8})`
              : `rgba(38, 68, 48, ${alpha * 0.92})`;
          }
          ctx.fillText(item.text, px, py);
        }
      }

      // 8. 3D Spherical Edge Vignette (Atmospheric Depth & Horizon Shading)
      const edgeShadow = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
      edgeShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
      edgeShadow.addColorStop(0.82, "rgba(0, 60, 120, 0.1)");
      edgeShadow.addColorStop(1, "rgba(0, 35, 80, 0.28)");

      ctx.fillStyle = edgeShadow;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      ctx.restore(); // end clip

      // 9. Floating Agent Avatar Pins with Animated Pulse
      const pulsePhase = (time % 1800) / 1800; // 0 to 1

      for (const pin of AVATAR_PINS) {
        const p3d = project3D(pin.lng, pin.lat, yaw, pitch);

        if (p3d[2] > 0.05) {
          const depthScale = 0.75 + p3d[2] * 0.35;
          const alpha = Math.min(1, (p3d[2] - 0.05) * 3.2);

          const stalkHeight = 22 * depthScale;
          const avatarSize = 25 * depthScale;
          const pinX = cx + p3d[0] * R;
          const pinY = cy - p3d[1] * R;
          const avatarX = pinX;
          const avatarY = pinY - stalkHeight;

          ctx.save();
          ctx.globalAlpha = alpha;

          // Ground Anchor Dot
          ctx.beginPath();
          ctx.arc(pinX, pinY, 3 * depthScale, 0, Math.PI * 2);
          ctx.fillStyle = pin.color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pinX, pinY, 4.5 * depthScale, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = 1.2 * depthScale;
          ctx.stroke();

          // Connecting Stalk Line
          ctx.beginPath();
          ctx.moveTo(pinX, pinY);
          ctx.lineTo(avatarX, avatarY + avatarSize / 2);
          ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.7)" : "rgba(0, 159, 227, 0.7)";
          ctx.lineWidth = 1.3 * depthScale;
          ctx.stroke();

          // Expanding Pulse Ring around Avatar
          const pulseRadius = avatarSize / 2 + 3 + pulsePhase * (13 * depthScale);
          const pulseAlpha = Math.max(0, (1 - pulsePhase) * 0.75 * alpha);

          ctx.beginPath();
          ctx.arc(avatarX, avatarY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isDark
            ? `rgba(56, 189, 248, ${pulseAlpha})`
            : `rgba(0, 159, 227, ${pulseAlpha})`;
          ctx.lineWidth = 1.8 * depthScale;
          ctx.stroke();

          // Avatar Badge Shadow
          ctx.shadowColor = isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 40, 100, 0.22)";
          ctx.shadowBlur = 7 * depthScale;
          ctx.shadowOffsetY = 2.5 * depthScale;

          // Outer White/Dark Circle
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
          ctx.fill();

          // Outer Ring
          ctx.lineWidth = 1.8 * depthScale;
          ctx.strokeStyle = isDark ? "#38bdf8" : "#009fe3";
          ctx.stroke();

          // Inner Avatar Circle Background
          ctx.shadowColor = "transparent";
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarSize / 2 - 2 * depthScale, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#283b54" : "#e0f2fe";
          ctx.fill();

          // Avatar Emoji
          ctx.font = `${13 * depthScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(pin.avatar, avatarX, avatarY + 1 * depthScale);

          ctx.restore();
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Mouse / Touch Drag Handlers for Interactive Planetary Exploration
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      dragStartRot.current = { y: rotYRef.current, x: rotXRef.current };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;

      rotYRef.current = dragStartRot.current.y + dx * 0.45;
      rotXRef.current = Math.max(-30, Math.min(75, dragStartRot.current.x + dy * 0.35));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        isDraggingRef.current = true;
        dragStartPos.current = { x: touch.clientX, y: touch.clientY };
        dragStartRot.current = { y: rotYRef.current, x: rotXRef.current };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!isDraggingRef.current || !touch) return;
      const dx = touch.clientX - dragStartPos.current.x;
      const dy = touch.clientY - dragStartPos.current.y;

      rotYRef.current = dragStartRot.current.y + dx * 0.45;
      rotXRef.current = Math.max(-30, Math.min(75, dragStartRot.current.x + dy * 0.35));
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      container.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      window.addEventListener("touchmove", handleTouchMove, {
        passive: true,
      });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        container.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-label="Interactive 3D real-time globe showing WebMCP feedback connections across regions"
      className={styles.globeContainer}
      role="img"
    >
      <canvas ref={canvasRef} className={styles.globeCanvas} />
    </div>
  );
}
