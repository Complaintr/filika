"use client";

import { useEffect, useRef } from "react";
import styles from "../../app/landing.module.css";

// Comprehensive high-fidelity world landmass polygon coordinates [longitude, latitude]
const WORLD_LANDMASSES: Array<[number, number][]> = [
  // Eurasia & North Africa connected continental landmass
  [
    [-9.5, 38.7],
    [-9.0, 43.0],
    [-1.8, 43.4],
    [-4.8, 48.4],
    [1.8, 50.9],
    [8.5, 54.5],
    [9.8, 57.7],
    [10.5, 54.5],
    [19.0, 54.4],
    [24.0, 56.8],
    [28.0, 59.8],
    [30.2, 59.9],
    [32.0, 65.0],
    [40.0, 67.0],
    [44.0, 68.5],
    [60.0, 69.5],
    [75.0, 72.0],
    [86.0, 73.5],
    [104.0, 77.5],
    [115.0, 74.0],
    [130.0, 72.0],
    [140.0, 74.0],
    [160.0, 70.0],
    [170.0, 66.5],
    [180.0, 65.5],
    [170.0, 60.0],
    [160.0, 55.0],
    [156.0, 51.0],
    [143.0, 49.0],
    [135.0, 46.0],
    [131.0, 43.0],
    [129.5, 41.0],
    [126.0, 39.0],
    [127.0, 35.0],
    [129.0, 35.5],
    [129.0, 37.5],
    [125.0, 38.0],
    [122.0, 39.5],
    [118.0, 39.0],
    [121.5, 31.5],
    [119.5, 25.0],
    [113.5, 22.0],
    [108.5, 19.5],
    [109.0, 13.5],
    [105.0, 10.0],
    [101.0, 6.0],
    [103.8, 1.3],
    [100.0, 7.5],
    [98.0, 12.0],
    [92.5, 20.5],
    [89.0, 22.0],
    [80.0, 16.0],
    [77.5, 8.5],
    [73.0, 19.0],
    [67.0, 24.5],
    [62.0, 25.5],
    [56.5, 26.0],
    [59.0, 22.5],
    [54.0, 17.0],
    [45.0, 12.5],
    [43.5, 12.5],
    [36.0, 22.0],
    [32.5, 29.5],
    [34.5, 31.5],
    [36.0, 36.5],
    [30.0, 36.5],
    [27.0, 38.0],
    [23.5, 38.0],
    [20.0, 39.8],
    [16.0, 41.0],
    [12.5, 42.0],
    [15.5, 38.0],
    [12.0, 44.0],
    [13.5, 45.8],
    [9.0, 43.8],
    [3.5, 43.4],
    [0.0, 40.0],
    [-2.0, 36.7],
    [-5.5, 36.0],
    [-8.0, 37.0],
    [-9.5, 38.7],
  ],
  // Scandinavia
  [
    [5.0, 59.0],
    [5.5, 62.0],
    [12.0, 66.0],
    [15.0, 68.5],
    [26.0, 71.0],
    [31.0, 70.0],
    [30.0, 65.0],
    [25.0, 65.0],
    [21.0, 60.5],
    [18.0, 59.0],
    [13.0, 55.5],
    [10.0, 58.0],
    [5.0, 59.0],
  ],
  // Great Britain & Ireland
  [
    [-5.0, 50.0],
    [-0.5, 51.0],
    [1.5, 52.5],
    [0.0, 54.5],
    [-2.0, 57.0],
    [-4.0, 58.5],
    [-6.0, 56.5],
    [-4.5, 53.5],
    [-5.0, 50.0],
  ],
  [
    [-10.0, 51.5],
    [-6.0, 52.0],
    [-6.0, 54.0],
    [-8.0, 55.0],
    [-10.5, 54.0],
    [-10.0, 51.5],
  ],
  // Japan (Honshu, Hokkaido, Kyushu)
  [
    [131.0, 31.5],
    [131.5, 34.0],
    [135.0, 34.5],
    [139.0, 35.5],
    [141.5, 38.5],
    [141.0, 41.5],
    [140.0, 40.0],
    [136.5, 36.5],
    [133.0, 35.5],
    [131.0, 31.5],
  ],
  [
    [140.0, 42.0],
    [144.0, 44.0],
    [145.5, 43.5],
    [142.0, 42.0],
    [140.0, 42.0],
  ],
  // Africa
  [
    [-5.5, 36.0],
    [10.5, 37.0],
    [11.5, 33.0],
    [15.0, 32.5],
    [20.0, 32.0],
    [25.0, 31.5],
    [32.0, 31.5],
    [34.0, 27.5],
    [38.5, 18.0],
    [43.0, 12.5],
    [51.0, 10.5],
    [49.0, 4.0],
    [41.0, -2.0],
    [39.0, -5.0],
    [40.5, -15.0],
    [35.5, -24.0],
    [32.0, -28.0],
    [28.0, -32.5],
    [18.5, -34.5],
    [15.0, -28.0],
    [12.0, -17.0],
    [9.0, 1.0],
    [4.5, 4.5],
    [-4.0, 5.0],
    [-7.5, 4.5],
    [-13.0, 9.0],
    [-17.0, 14.5],
    [-16.0, 21.0],
    [-10.0, 28.0],
    [-6.0, 35.0],
    [-5.5, 36.0],
  ],
  // Madagascar
  [
    [49.5, -12.5],
    [50.5, -16.0],
    [47.5, -25.0],
    [44.0, -25.5],
    [44.0, -18.0],
    [49.5, -12.5],
  ],
  // North America
  [
    [-168.0, 66.0],
    [-162.0, 71.0],
    [-140.0, 70.0],
    [-125.0, 70.0],
    [-105.0, 69.0],
    [-85.0, 68.0],
    [-80.0, 62.0],
    [-65.0, 58.0],
    [-55.0, 52.0],
    [-60.0, 46.0],
    [-66.0, 44.0],
    [-71.0, 42.0],
    [-74.0, 40.5],
    [-76.0, 36.0],
    [-80.0, 32.0],
    [-80.5, 25.5],
    [-82.5, 28.0],
    [-89.0, 30.0],
    [-97.0, 26.0],
    [-97.5, 20.0],
    [-90.0, 19.0],
    [-87.0, 14.0],
    [-79.5, 9.0],
    [-83.0, 8.5],
    [-92.0, 14.5],
    [-105.0, 20.0],
    [-110.0, 24.0],
    [-117.0, 32.5],
    [-122.0, 37.5],
    [-124.5, 43.0],
    [-125.0, 49.0],
    [-131.0, 54.5],
    [-136.0, 58.5],
    [-150.0, 60.0],
    [-160.0, 56.0],
    [-165.0, 60.0],
    [-168.0, 66.0],
  ],
  // Greenland
  [
    [-45.0, 60.0],
    [-35.0, 66.0],
    [-20.0, 72.0],
    [-20.0, 80.0],
    [-40.0, 83.5],
    [-55.0, 80.0],
    [-55.0, 70.0],
    [-50.0, 64.0],
    [-45.0, 60.0],
  ],
  // South America
  [
    [-75.0, 11.0],
    [-62.0, 10.0],
    [-50.0, 0.0],
    [-35.0, -5.0],
    [-38.0, -13.0],
    [-42.0, -22.5],
    [-50.0, -30.0],
    [-58.0, -38.0],
    [-65.0, -45.0],
    [-68.0, -54.0],
    [-75.0, -50.0],
    [-73.0, -40.0],
    [-71.0, -30.0],
    [-77.0, -10.0],
    [-81.0, -5.0],
    [-79.0, 2.0],
    [-77.0, 8.0],
    [-75.0, 11.0],
  ],
  // Australia
  [
    [114.0, -22.0],
    [122.0, -18.0],
    [131.0, -12.0],
    [136.0, -12.0],
    [142.0, -11.0],
    [153.5, -28.0],
    [150.0, -36.0],
    [144.0, -38.5],
    [137.0, -35.0],
    [128.0, -32.0],
    [115.0, -34.0],
    [113.0, -26.0],
    [114.0, -22.0],
  ],
  // New Zealand
  [
    [173.0, -35.0],
    [178.0, -38.0],
    [175.0, -41.5],
    [172.0, -41.0],
    [173.0, -35.0],
  ],
  [
    [168.0, -46.5],
    [171.0, -43.5],
    [174.0, -41.5],
    [169.0, -44.0],
    [168.0, -46.5],
  ],
  // Indonesia & Philippines Islands
  [
    [95.5, 5.5],
    [106.0, -6.0],
    [105.0, -5.0],
    [98.0, 3.0],
    [95.5, 5.5],
  ],
  [
    [109.0, 1.0],
    [117.0, 4.0],
    [119.0, -3.5],
    [111.0, -2.5],
    [109.0, 1.0],
  ],
  [
    [120.0, 14.0],
    [125.0, 12.0],
    [126.0, 7.0],
    [122.0, 7.0],
    [120.0, 14.0],
  ],
];

// Inner country border dividers [ [lon, lat], [lon, lat] ]
const COUNTRY_BORDERS: Array<[number, number][]> = [
  // Europe & Mediterranean dividers
  [
    [-1.8, 43.4],
    [3.0, 42.5],
  ],
  [
    [2.5, 51.0],
    [6.0, 49.5],
    [7.5, 47.5],
  ],
  [
    [8.0, 45.8],
    [13.0, 46.5],
  ],
  [
    [14.0, 54.0],
    [15.0, 50.0],
    [17.0, 48.0],
  ],
  [
    [22.0, 44.0],
    [28.0, 41.5],
    [26.0, 38.0],
  ],
  [
    [30.0, 60.0],
    [30.0, 50.0],
    [35.0, 46.0],
  ], // Eastern Europe / Finland / Belarus border
  [
    [36.0, 36.5],
    [44.0, 37.0],
    [48.0, 38.0],
  ],
  // Central & East Asia dividers
  [
    [50.0, 45.0],
    [70.0, 48.0],
    [82.0, 46.0],
  ], // Kazakhstan-Russia border
  [
    [60.0, 38.0],
    [68.0, 40.0],
    [75.0, 39.0],
  ], // Central Asia / Uzbekistan / Tajikistan
  [
    [60.0, 30.0],
    [75.0, 35.0],
    [88.0, 27.5],
    [97.0, 28.0],
  ], // Pakistan / India / Himalaya border
  [
    [84.0, 28.0],
    [88.0, 28.0],
  ], // Nepal
  [
    [89.0, 27.0],
    [92.0, 27.0],
  ], // Bhutan
  [
    [90.0, 50.0],
    [105.0, 50.0],
    [118.0, 48.0],
    [115.0, 44.0],
    [100.0, 42.0],
    [90.0, 50.0],
  ], // Mongolia loop
  [
    [124.0, 40.0],
    [129.0, 42.0],
  ], // China-North Korea
  [
    [126.0, 38.0],
    [128.5, 38.5],
  ], // DMZ (Korea)
  // Americas dividers
  [
    [-123.0, 49.0],
    [-95.0, 49.0],
    [-75.0, 45.0],
  ], // US-Canada
  [
    [-117.0, 32.5],
    [-106.0, 31.8],
    [-97.0, 26.0],
  ], // US-Mexico
  [
    [-75.0, 8.0],
    [-70.0, 0.0],
    [-60.0, -10.0],
    [-55.0, -22.0],
  ], // South America interior
  // Africa dividers
  [
    [-10.0, 27.0],
    [10.0, 25.0],
    [25.0, 22.0],
  ],
  [
    [10.0, 5.0],
    [30.0, 5.0],
  ],
];

// Visitor / Agent avatar markers spanning across all continents
interface AvatarPin {
  id: string;
  avatar: string;
  lat: number;
  lng: number;
  color: string;
}

const AVATAR_PINS: AvatarPin[] = [
  {
    id: "pin-seoul",
    avatar: "👩‍💼",
    lat: 37.5665,
    lng: 126.978,
    color: "#009fe3",
  },
  {
    id: "pin-tokyo",
    avatar: "🧑‍💻",
    lat: 35.6762,
    lng: 139.6503,
    color: "#6366f1",
  },
  {
    id: "pin-london",
    avatar: "👨‍🔬",
    lat: 51.5074,
    lng: -0.1278,
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
    id: "pin-berlin",
    avatar: "🤖",
    lat: 52.52,
    lng: 13.405,
    color: "#0ea5e9",
  },
  {
    id: "pin-istanbul",
    avatar: "👩‍💻",
    lat: 41.0082,
    lng: 28.9784,
    color: "#009fe3",
  },
  {
    id: "pin-ny",
    avatar: "🧑‍🎨",
    lat: 40.7128,
    lng: -74.006,
    color: "#0284c7",
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
  {
    id: "pin-singapore",
    avatar: "🧑‍💼",
    lat: 1.3521,
    lng: 103.8198,
    color: "#10b981",
  },
];

// Region / Sea text labels
interface GlobeLabel {
  text: string;
  lat: number;
  lng: number;
  isSea?: boolean;
}

const GLOBE_LABELS: GlobeLabel[] = [
  { text: "Russia", lat: 60.0, lng: 95.0 },
  { text: "China", lat: 34.0, lng: 104.0 },
  { text: "Mongolia", lat: 46.5, lng: 105.0 },
  { text: "Kazakhstan", lat: 48.0, lng: 66.0 },
  { text: "Uzbekistan", lat: 42.0, lng: 63.0 },
  { text: "Tajikistan", lat: 39.0, lng: 70.0 },
  { text: "Pakistan", lat: 30.0, lng: 70.0 },
  { text: "Nepal", lat: 28.0, lng: 84.0 },
  { text: "Bhutan", lat: 27.5, lng: 90.0 },
  { text: "Bangladesh", lat: 24.0, lng: 90.0 },
  { text: "Finland", lat: 63.0, lng: 27.0 },
  { text: "Belarus", lat: 54.0, lng: 27.0 },
  { text: "Japan", lat: 36.5, lng: 142.0 },
  { text: "South Korea", lat: 36.0, lng: 125.5 },
  { text: "North Korea", lat: 39.5, lng: 126.0 },
  { text: "Europe", lat: 49.0, lng: 15.0 },
  { text: "North America", lat: 44.0, lng: -100.0 },
  { text: "South America", lat: -15.0, lng: -55.0 },
  { text: "Africa", lat: 10.0, lng: 20.0 },
  { text: "Australia", lat: -25.0, lng: 135.0 },
  { text: "Sea of Okhotsk", lat: 54.0, lng: 150.0, isSea: true },
  { text: "East China Sea", lat: 28.0, lng: 126.0, isSea: true },
  { text: "Laptev Sea", lat: 75.0, lng: 128.0, isSea: true },
  { text: "Chukchi Sea", lat: 69.0, lng: 175.0, isSea: true },
  { text: "Pacific Ocean", lat: 20.0, lng: 165.0, isSea: true },
  { text: "Atlantic Ocean", lat: 25.0, lng: -40.0, isSea: true },
];

export function WorldGlobeDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Rotation angles: rotY = longitude rotation (yaw), rotX = tilt (pitch)
  const rotYRef = useRef(140);
  const rotXRef = useRef(20); // ~20 degrees tilt down looking at curved horizon
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

    // 3D Orthographic Spherical Projection
    const project = (
      lng: number,
      lat: number,
      cx: number,
      cy: number,
      R: number,
      rotYRad: number,
      rotXRad: number,
    ): { x: number; y: number; z: number; visible: boolean } => {
      const phi = toRad(lat);
      const lambda = toRad(lng);

      // Point on unit sphere
      const x0 = Math.cos(phi) * Math.sin(lambda);
      const y0 = Math.sin(phi);
      const z0 = Math.cos(phi) * Math.cos(lambda);

      // Rotate around Y-axis by rotY
      const x1 = x0 * Math.cos(rotYRad) - z0 * Math.sin(rotYRad);
      const y1 = y0;
      const z1 = x0 * Math.sin(rotYRad) + z0 * Math.cos(rotYRad);

      // Rotate around X-axis by rotX (tilt)
      const x2 = x1;
      const y2 = y1 * Math.cos(rotXRad) - z1 * Math.sin(rotXRad);
      const z2 = y1 * Math.sin(rotXRad) + z1 * Math.cos(rotXRad);

      const screenX = cx + x2 * R;
      const screenY = cy - y2 * R;

      return {
        x: screenX,
        y: screenY,
        z: z2,
        visible: z2 > 0,
      };
    };

    const render = (time: number) => {
      const dt = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.1) : 0.016;
      lastTimeRef.current = time;

      // Active continuous smooth planetary orbit rotation (~18 deg/sec like getopen.so)
      if (!isDraggingRef.current) {
        rotYRef.current += 18 * dt;
        if (rotYRef.current >= 360) {
          rotYRef.current -= 360;
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

      // Globe Geometry: Edge-to-edge curved sphere horizon rising right to the top
      const R = Math.max(width * 0.94, height * 0.94, 290);
      const cx = width / 2;
      const cy = R + 18; // Sphere apex reaches y = 18px giving room for soft top glow

      const rotYRad = toRad(rotYRef.current);
      const rotXRad = toRad(rotXRef.current);

      // 1. Atmosphere Rim Glow (soft luminous sky halo above the curved horizon)
      const glowGrad = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.25);
      if (isDark) {
        glowGrad.addColorStop(0, "rgba(56, 189, 248, 0.4)");
        glowGrad.addColorStop(0.3, "rgba(0, 159, 227, 0.18)");
        glowGrad.addColorStop(0.7, "rgba(0, 159, 227, 0.05)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        glowGrad.addColorStop(0, "rgba(90, 190, 255, 0.6)");
        glowGrad.addColorStop(0.3, "rgba(140, 215, 255, 0.3)");
        glowGrad.addColorStop(0.65, "rgba(180, 230, 255, 0.1)");
        glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      }

      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 2. Globe Sphere (Clipping Mask)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // 3. Ocean Base with 3D Spherical Light Gradient (getopen.so styling)
      const oceanGrad = ctx.createRadialGradient(
        cx - R * 0.28,
        cy - R * 0.35,
        R * 0.1,
        cx,
        cy,
        R * 1.02,
      );

      if (isDark) {
        oceanGrad.addColorStop(0, "#193556");
        oceanGrad.addColorStop(0.5, "#0f233c");
        oceanGrad.addColorStop(1, "#091728");
      } else {
        oceanGrad.addColorStop(0, "#8ed4fa");
        oceanGrad.addColorStop(0.5, "#79bef8");
        oceanGrad.addColorStop(1, "#5cb0f4");
      }

      ctx.fillStyle = oceanGrad;
      ctx.fillRect(cx - R - 4, cy - R - 4, R * 2 + 8, R * 2 + 8);

      // 4. Subtle Graticule Lines (Latitude / Longitude)
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 0.8;

      // Latitude circles
      const latSteps = [-60, -30, 0, 30, 60];
      for (const lat of latSteps) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 6) {
          const p = project(lng, lat, cx, cy, R, rotYRad, rotXRad);
          if (p.visible) {
            if (first) {
              ctx.moveTo(p.x, p.y);
              first = false;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Longitude meridians
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 4) {
          const p = project(lng, lat, cx, cy, R, rotYRad, rotXRad);
          if (p.visible) {
            if (first) {
              ctx.moveTo(p.x, p.y);
              first = false;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // 5. Continents / Landmass Polygons (getopen.so pastel styling: #daf5db)
      ctx.fillStyle = isDark ? "#1d3a58" : "#daf5db";
      ctx.strokeStyle = isDark ? "#28527c" : "#c2e8c4";
      ctx.lineWidth = 0.9;

      for (const polygon of WORLD_LANDMASSES) {
        ctx.beginPath();
        let anyVisible = false;
        let started = false;

        for (const point of polygon) {
          const [lng, lat] = point;
          const p = project(lng, lat, cx, cy, R, rotYRad, rotXRad);

          if (p.visible) {
            anyVisible = true;
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else if (started) {
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const edgeX = cx + (dx / dist) * R;
              const edgeY = cy + (dy / dist) * R;
              ctx.lineTo(edgeX, edgeY);
            }
            started = false;
          }
        }

        if (anyVisible) {
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      // 6. Country Divider Borders (delicate coral lines like getopen.so)
      ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.45)" : "rgba(240, 165, 155, 0.75)";
      ctx.lineWidth = 0.85;

      for (const line of COUNTRY_BORDERS) {
        ctx.beginPath();
        let started = false;
        for (const point of line) {
          const [lng, lat] = point;
          const p = project(lng, lat, cx, cy, R, rotYRad, rotXRad);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 7. Geographic Text Labels (Cities, Countries, Seas)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const item of GLOBE_LABELS) {
        const p = project(item.lng, item.lat, cx, cy, R, rotYRad, rotXRad);
        if (p.visible && p.z > 0.1) {
          const alpha = Math.min(1, (p.z - 0.1) * 2.4);
          ctx.font = item.isSea
            ? "italic 500 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            : "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

          if (isDark) {
            ctx.fillStyle = item.isSea
              ? `rgba(125, 211, 252, ${alpha * 0.75})`
              : `rgba(224, 242, 254, ${alpha * 0.88})`;
          } else {
            ctx.fillStyle = item.isSea
              ? `rgba(32, 108, 172, ${alpha * 0.75})`
              : `rgba(45, 75, 55, ${alpha * 0.88})`;
          }
          ctx.fillText(item.text, p.x, p.y);
        }
      }

      // 8. 3D Spherical Edge Shadow (Atmospheric Depth)
      const edgeShadow = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R);
      edgeShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
      edgeShadow.addColorStop(0.85, "rgba(0, 70, 140, 0.08)");
      edgeShadow.addColorStop(1, "rgba(0, 45, 100, 0.22)");

      ctx.fillStyle = edgeShadow;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      ctx.restore(); // end clip

      // 9. Render Floating Avatar Pins with Pulse Animation
      const pulsePhase = (time % 1800) / 1800; // 0 to 1

      for (const pin of AVATAR_PINS) {
        const p = project(pin.lng, pin.lat, cx, cy, R, rotYRad, rotXRad);

        if (p.visible && p.z > 0.04) {
          const depthScale = 0.75 + p.z * 0.35;
          const alpha = Math.min(1, (p.z - 0.04) * 3);

          const stalkHeight = 22 * depthScale;
          const avatarSize = 26 * depthScale;
          const avatarX = p.x;
          const avatarY = p.y - stalkHeight;

          ctx.save();
          ctx.globalAlpha = alpha;

          // Ground Anchor Dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 * depthScale, 0, Math.PI * 2);
          ctx.fillStyle = pin.color;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.5 * depthScale, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = 1.2 * depthScale;
          ctx.stroke();

          // Connecting Stalk Line
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(avatarX, avatarY + avatarSize / 2);
          ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.7)" : "rgba(0, 159, 227, 0.7)";
          ctx.lineWidth = 1.4 * depthScale;
          ctx.stroke();

          // Expanding Pulse Ring around Avatar
          const pulseRadius = avatarSize / 2 + 3 + pulsePhase * (14 * depthScale);
          const pulseAlpha = Math.max(0, (1 - pulsePhase) * 0.75 * alpha);

          ctx.beginPath();
          ctx.arc(avatarX, avatarY, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isDark
            ? `rgba(56, 189, 248, ${pulseAlpha})`
            : `rgba(0, 159, 227, ${pulseAlpha})`;
          ctx.lineWidth = 2 * depthScale;
          ctx.stroke();

          // Avatar Badge Bubble Shadow
          ctx.shadowColor = isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 40, 100, 0.22)";
          ctx.shadowBlur = 8 * depthScale;
          ctx.shadowOffsetY = 3 * depthScale;

          // Outer White/Glow Border Circle
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#1e293b" : "#ffffff";
          ctx.fill();

          // Glowing Border Ring
          ctx.lineWidth = 2 * depthScale;
          ctx.strokeStyle = isDark ? "#38bdf8" : "#009fe3";
          ctx.stroke();

          // Inner Avatar Circle Background
          ctx.shadowColor = "transparent";
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarSize / 2 - 2 * depthScale, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? "linear-gradient(135deg, #334155, #1e293b)"
            : "linear-gradient(135deg, #e0f2fe, #bae6fd)";
          ctx.fill();

          // Avatar Emoji / Graphic
          ctx.font = `${14 * depthScale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
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

    // Mouse / Touch Drag Handlers for Interactive Rotation
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
      rotXRef.current = Math.max(5, Math.min(65, dragStartRot.current.x - dy * 0.3));
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
      rotXRef.current = Math.max(5, Math.min(65, dragStartRot.current.x - dy * 0.3));
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
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
      aria-label="Interactive 3D real-time globe showing autonomous WebMCP agents discovering issues globally"
      className={styles.globeContainer}
      role="img"
    >
      <canvas ref={canvasRef} className={styles.globeCanvas} />
    </div>
  );
}
