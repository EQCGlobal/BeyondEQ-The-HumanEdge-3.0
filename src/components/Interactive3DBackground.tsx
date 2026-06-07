import React, { useEffect, useRef, useState } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Tetrahedron {
  baseX: number; // Fraction of width (-0.5 to 0.5)
  baseY: number; // Absolute document pixels
  baseZ: number; // Depth (-100 to 100)
  size: number;
  rx: number;
  ry: number;
  rz: number;
  spinSpeedX: number;
  spinSpeedY: number;
  spinSpeedZ: number;
  floatPhase: number;
  floatSpeed: number;
  floatRange: number;
}

interface NeuralNode {
  baseX: number; // Fraction of width
  baseY: number; // Absolute document pixels
  baseZ: number;
  vx: number; // Velocity x
  vy: number; // Velocity y
  vz: number; // Velocity z
  size: number;
}

interface Interactive3DBackgroundProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function Interactive3DBackground({ containerRef }: Interactive3DBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mouse coordinates with spring smoothing
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Scroll position state
  const scrollRef = useRef({ scrollTop: 0, scrollHeight: 1, clientHeight: 1 });

  // Theme interpolation factors
  const themeFactorRef = useRef(0); // 0 = light mode, 1 = dark mode

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -0.5 to 0.5
      mouseRef.current.targetX = (e.clientX / window.innerWidth) - 0.5;
      mouseRef.current.targetY = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Track scroll from containerRef
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      scrollRef.current.scrollTop = el.scrollTop;
      scrollRef.current.scrollHeight = el.scrollHeight;
      scrollRef.current.clientHeight = el.clientHeight;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // ResizeObserver to track container heights accurately
    const ro = new ResizeObserver(() => {
      handleScroll();
    });
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial stable seed values for 3D elements
    const tetrahedrons: Tetrahedron[] = [
      {
        baseX: 0.32,  // Right-aligned major tetrahedron in Hero (Science of Human Output)
        baseY: 280,   
        baseZ: 40,
        size: 75,
        rx: 0.4, ry: 1.2, rz: 0.2,
        spinSpeedX: 0.007, spinSpeedY: 0.009, spinSpeedZ: 0.004,
        floatPhase: 0, floatSpeed: 0.0015, floatRange: 18
      },
      {
        baseX: -0.35, // Left-aligned mid-sized tetrahedron in Hero (Science of Human Output)
        baseY: 460,   
        baseZ: -30,
        size: 55,
        rx: 1.2, ry: 0.3, rz: 0.8,
        spinSpeedX: -0.006, spinSpeedY: 0.008, spinSpeedZ: 0.005,
        floatPhase: Math.PI / 4, floatSpeed: 0.0013, floatRange: 22
      },
      {
        baseX: 0.18,  // Centre-right smaller, deep z-space tetrahedron in Hero (Science of Human Output)
        baseY: 580,   
        baseZ: -80,
        size: 42,
        rx: 0.7, ry: 1.6, rz: 1.1,
        spinSpeedX: 0.008, spinSpeedY: -0.005, spinSpeedZ: 0.009,
        floatPhase: Math.PI * 0.8, floatSpeed: 0.002, floatRange: 15
      },
      {
        baseX: -0.38, // near left
        baseY: 1350, // Manifesto section left float overlay
        baseZ: -20,
        size: 65,
        rx: 1.1, ry: 0.4, rz: 0.9,
        spinSpeedX: -0.008, spinSpeedY: 0.006, spinSpeedZ: 0.011,
        floatPhase: Math.PI / 3, floatSpeed: 0.001, floatRange: 25
      },
      {
        baseX: 0.36,  // near right
        baseY: 2300, // Timeline section right float overlay
        baseZ: 10,
        size: 55,
        rx: 0.2, ry: 0.9, rz: 1.5,
        spinSpeedX: 0.005, spinSpeedY: -0.012, spinSpeedZ: 0.006,
        floatPhase: Math.PI * 1.2, floatSpeed: 0.0018, floatRange: 15
      },
      {
        baseX: -0.34, // near left
        baseY: 3200, // Founder section left float overlay
        baseZ: 60,
        size: 80,
        rx: 1.7, ry: 0.2, rz: 0.5,
        spinSpeedX: 0.009, spinSpeedY: 0.005, spinSpeedZ: -0.007,
        floatPhase: Math.PI / 2, floatSpeed: 0.0012, floatRange: 30
      },
      {
        baseX: 0.3,   // near right
        baseY: 4200, // Footer / CTA section float overlay
        baseZ: -10,
        size: 70,
        rx: 0.5, ry: 0.5, rz: 0.5,
        spinSpeedX: -0.011, spinSpeedY: 0.008, spinSpeedZ: 0.005,
        floatPhase: Math.PI * 0.7, floatSpeed: 0.0014, floatRange: 22
      }
    ];

    // Build some elegant random floating neural nodes
    const nodes: NeuralNode[] = Array.from({ length: 42 }).map((_, idx) => {
      // Create a vertical distribution spanning the page
      const sectionOffset = (idx / 42) * 5000;
      return {
        baseX: (Math.random() - 0.5) * 0.9, // Spread across screen width
        baseY: sectionOffset + (Math.random() - 0.5) * 350,
        baseZ: (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1.5
      };
    });

    const checkIsDarkAtCenter = (): boolean => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      if (typeof document === 'undefined') return false;
      const element = document.elementFromPoint(centerX, centerY);
      if (!element) return false;

      let cur: any = element;
      while (cur && cur !== document.body) {
        if (cur.id === 'about-section-hero' || cur.id === 'about-section-stats' || cur.id === 'join-network-mastercard') {
          return true;
        }
        if (cur.classList && (
          cur.classList.contains('bg-[#104C64]') || 
          cur.classList.contains('bg-stone-900') || 
          (cur.classList.contains('text-white') && cur.classList.contains('bg-[#104C64]'))
        )) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    };

    // Math function to rotate point3D
    const rotate3D = (p: Point3D, rx: number, ry: number, rz: number): Point3D => {
      // Rotation X
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const y1 = p.y * cosX - p.z * sinX;
      const z1 = p.y * sinX + p.z * cosX;

      // Rotation Y
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const x2 = p.x * cosY + z1 * sinY;
      const z2 = -p.x * sinY + z1 * cosY;

      // Rotation Z
      const cosZ = Math.cos(rz);
      const sinZ = Math.sin(rz);
      const x3 = x2 * cosZ - y1 * sinZ;
      const y3 = x2 * sinZ + y1 * cosZ;

      return { x: x3, y: y3, z: z2 };
    };

    // Render loop
    const tick = () => {
      if (!canvas || !ctx) return;

      const { width, height } = canvas;
      const scrollTop = scrollRef.current.scrollTop;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // Spring-decay interpolation on mouse position to create a silky ease inertia
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      // Dynamically detect theme palette to blend nodes seamlessly
      const isDark = checkIsDarkAtCenter();
      themeFactorRef.current += ((isDark ? 1 : 0) - themeFactorRef.current) * 0.05;
      const themeVal = themeFactorRef.current;

      // Base Palette coordinates
      // Light Mode: rgb(16, 76, 100) (#104C64)
      // Dark Mode: rgb(65, 177, 194) (#41B1C2)
      const r = Math.round(16 + (65 - 16) * themeVal);
      const g = Math.round(76 + (177 - 76) * themeVal);
      const b = Math.round(100 + (194 - 100) * themeVal);

      const colorActive = `rgb(${r}, ${g}, ${b})`;
      const getAlphaColor = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

      // Rotative tilt angles based on cursor coordinates (Parallax Tilt Camera Matrix)
      const camRotY = mouse.x * 0.7; // Tilt horizontal
      const camRotX = -mouse.y * 0.7; // Tilt vertical

      // Camera coordinates & lens focus
      const d = 500; // Camera distance lens focal

      // 1. PROJECT & DRAW FLOATING NEURAL NODES
      const projectedNodes: { px: number; py: number; pz: number; col: string; z: number; size: number }[] = [];

      nodes.forEach((n) => {
        // Drifting animation updates
        n.baseX += n.vx * 0.001;
        n.baseY += n.vy * 0.2;
        n.baseZ += n.vz * 0.2;

        // Visual loop boundaries (contain within horizontal limits)
        if (Math.abs(n.baseX) > 0.45) n.vx *= -1;
        if (Math.abs(n.baseZ) > 150) n.vz *= -1;

        // Viewport coordinate conversions
        const screenX = n.baseX * width;
        const screenY = n.baseY - scrollTop; // Real scrolled coordinate

        // Skip rendering nodes completely out of sight plus generous margins
        if (screenY < -200 || screenY > height + 200) return;

        // Core 3D Point
        const rawPt: Point3D = { x: screenX, y: screenY - (height / 2), z: n.baseZ };

        // Apply World Cursor Camera Rotation tilt
        const rotPt = rotate3D(rawPt, camRotX, camRotY, 0);

        // Center projection
        const finalZ = rotPt.z + d;
        if (finalZ <= 50) return; // behind focal plane clipping

        const zoomScale = d / finalZ;
        const projX = rotPt.x * zoomScale + (width / 2);
        const projY = rotPt.y * zoomScale + (height / 2);

        projectedNodes.push({
          px: projX,
          py: projY,
          pz: finalZ,
          col: getAlphaColor(Math.max(0.08, Math.min(0.85, (1.2 - (finalZ / 700))))),
          z: finalZ,
          size: n.size * zoomScale
        });
      });

      // Connections between neural nodes
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projectedNodes.length; i++) {
        const n1 = projectedNodes[i];
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n2 = projectedNodes[j];
          // Calculate screen distance
          const dx = n1.px - n2.px;
          const dy = n1.py - n2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Web connection threshold
          if (dist < 110) {
            const opacity = (1 - dist / 110) * 0.15 * Math.min(1, (1.2 - (n1.z / 700)));
            ctx.strokeStyle = getAlphaColor(opacity);
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.stroke();
          }
        }
      }

      // Draw node points
      projectedNodes.forEach((n) => {
        ctx.fillStyle = n.col;
        ctx.beginPath();
        ctx.arc(n.px, n.py, n.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. PROJECT & DRAW INTERACTIVE 3D TETRAHEDRONS
      tetrahedrons.forEach((t) => {
        // Spin dynamics
        t.rx += t.spinSpeedX;
        t.ry += t.spinSpeedY;
        t.rz += t.spinSpeedZ;

        // Floating dynamic offset
        const currentPhase = (animationFrameCount * t.floatSpeed) + t.floatPhase;
        const floatY = Math.sin(currentPhase) * t.floatRange;

        // Center point conversions mapping document coordinates to screen
        const screenX = t.baseX * width;
        const screenY = (t.baseY + floatY) - scrollTop;

        // Skip if off screen with nice margins
        if (screenY < -300 || screenY > height + 300) return;

        // Bounded 3D points vertices of a Tetrahedron centered at centroid (0,0,0)
        // Sunny's Triangle Pyramid of Tetrahedron Theory
        const rawVertices: Point3D[] = [
          { x: 0, y: -t.size, z: 0 }, // Top vertex
          { x: -t.size * 0.86, y: t.size * 0.45, z: -t.size * 0.5 }, // Left base
          { x: t.size * 0.86, y: t.size * 0.45, z: -t.size * 0.5 }, // Right base
          { x: 0, y: t.size * 0.45, z: t.size } // Forward base node
        ];

        // First rotate vertices around local centroid index (local transform)
        const locallyRotated = rawVertices.map(v => rotate3D(v, t.rx, t.ry, t.rz));

        // Position locally rotated points in 3D world space relative to screen offset
        const worldPoints = locallyRotated.map(v => ({
          x: v.x + screenX,
          y: v.y + screenY - (height / 2),
          z: v.z + t.baseZ
        }));

        // Secondly apply the Global camera parallax tilt
        const cameraTransform = worldPoints.map(v => rotate3D(v, camRotX, camRotY, 0));

        // Project with perspective
        const projectedVertices = cameraTransform.map(v => {
          const depthZ = v.z + d;
          const scale = d / Math.max(10, depthZ);
          return {
            x: v.x * scale + (width / 2),
            y: v.y * scale + (height / 2),
            z: depthZ
          };
        });

        // Interactive mouse connection check (draw connections from mouse to vertices of close tetrahedrons)
        const mx = mouse.targetX * width + (width / 2); // mouse target cursor absolute position
        const my = mouse.targetY * height + (height / 2);

        // Center vertex screen projection coordinate helper
        let averageTx = 0;
        let averageTy = 0;
        projectedVertices.forEach(v => {
          averageTx += v.x;
          averageTy += v.y;
        });
        averageTx /= 4;
        averageTy /= 4;

        // Distance from cursor to tetrahedron centroid
        const mouseToTetraDist = Math.sqrt((mx - averageTx) ** 2 + (my - averageTy) ** 2);
        const attractionActive = mouseToTetraDist < 250;

        // Draw connections from cursor dynamically
        if (attractionActive) {
          projectedVertices.forEach((v) => {
            const depthFactor = Math.min(1, Math.max(0.1, 1 - (v.z / 900)));
            const connectionAlpha = (1 - (mouseToTetraDist / 250)) * 0.28 * depthFactor;
            ctx.strokeStyle = getAlphaColor(connectionAlpha);
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(v.x, v.y);
            ctx.stroke();
          });
        }

        // Face definition arrays (indexes of vertices 0, 1, 2, 3)
        // 4 triangular faces
        const faces = [
          [0, 1, 2], // back/under face
          [0, 2, 3], // right face
          [0, 3, 1], // left face
          [1, 3, 2]  // bottom face
        ];

        // Draw transparent shaded faces (back-to-front sorting can be neglected because of high transparency)
        faces.forEach((face) => {
          const p1 = projectedVertices[face[0]];
          const p2 = projectedVertices[face[1]];
          const p3 = projectedVertices[face[2]];

          // Shade intensity based on depth to emphasize 3D layout
          const averageZ = (p1.z + p2.z + p3.z) / 3;
          const depthAlpha = Math.max(0.04, Math.min(0.35, (0.16 * (500 / averageZ))));

          ctx.fillStyle = getAlphaColor(depthAlpha);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.fill();
        });

        // Draw solid wireframes edges
        const edges = [
          [0, 1], [0, 2], [0, 3],
          [1, 2], [2, 3], [3, 1]
        ];

        edges.forEach((edge) => {
          const p1 = projectedVertices[edge[0]];
          const p2 = projectedVertices[edge[1]];

          // Wireframe thickness and alpha fade in deep z space
          const averageZ = (p1.z + p2.z) / 2;
          const distFactor = Math.max(0.12, Math.min(0.85, (450 / averageZ)));

          ctx.strokeStyle = getAlphaColor(distFactor * 0.70);
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        });

        // Draw glowing vertex points as nodes
        projectedVertices.forEach((v) => {
          const depthFactor = Math.max(0.2, Math.min(1.0, (500 / v.z)));
          ctx.fillStyle = colorActive;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 5.5 * depthFactor, 0, Math.PI * 2);
          ctx.fill();

          // Vertex ring highlight
          ctx.strokeStyle = getAlphaColor(0.40 * depthFactor);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 9.5 * depthFactor, 0, Math.PI * 2);
          ctx.stroke();
        });
      });

      animationFrameCount++;
      animFrameId = requestAnimationFrame(tick);
    };

    let animationFrameCount = 0;
    tick();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[1] w-screen h-screen pointer-events-none bg-transparent"
      id="about-interactive-3d-background-canvas"
    />
  );
}
