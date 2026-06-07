import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue, useInView, animate, useMotionValueEvent, AnimatePresence } from 'motion/react';

const uspDetails: Record<string, { title: string, detail: string }> = {
  'L1': {
    title: "Unique & Novel Content — Built for Today's World",
    detail: "Most EI programmes recycle decades-old theory. Ours doesn't. BeyondEQ 3.0 is built on continuously updated content that integrates the latest in neuroscience and evidence-based behavioral systems— relevant, current, and designed for the challenges you face right now."
  },
  'L2': {
    title: "A Delivery Model Like No Other",
    detail: "We don't believe in one-size-fits-all training. Our proprietary Hendecagon Approach is the world's only 11-point EI delivery framework — combining need assessment, progressive coaching, multi-channel support, and community access into one seamless, end-to-end journey."
  },
  'L3': {
    title: "150+ Activities Mapped to Skills & Competencies",
    detail: "Every concept we teach is backed by doing, not just listening. With over 150 experiential activities — each precisely mapped to a specific skill or competency in our CMM — participants don't just understand EI. They live it."
  },
  'R1': {
    title: "India's First Emotional Maturity Model (EMM)",
    detail: "We built what didn't exist. BeyondEQ's Emotional Maturity Model is India's first structured, multi-level framework for measuring and developing EQ — mapping individuals across 6 maturity levels (Aware, Observant, Responsive, Proactive, Architect, and Inception), 75+ competencies, and 80+ skills with scientific precision."
  },
  'R2': {
    title: "55,000+ Lives Impacted Across India",
    detail: "Seven years. Eight states. Every sector. From government schools in Odisha to corporate boardrooms — BeyondEQ's impact is documented, verified, and growing every single day."
  },
  'R3': {
    title: "An ROI-Supported Model — EI That Pays for Itself",
    detail: "We don't ask you to take EI on faith. Our built-in ROI model tracks real business outcomes — reduced attrition, higher productivity, fewer conflicts, and measurable performance gains — giving leadership the hard numbers to justify every rupee invested."
  }
};

const STATIC_NODES = [
  { 
    id: 'L1', 
    title: 'Unique & Novel Content', 
    body: "Updated EI content for today's neuroscience, psychology & real-world challenges.", 
    stat: 'Unique Content'
  },
  { 
    id: 'R1', 
    title: "India's First EMM", 
    body: "India's first structured Emotional Maturity Model — scientific & measurable.", 
    stat: 'Measurable Model'
  },
  { 
    id: 'L2', 
    title: 'A Delivery Model Like No Other', 
    body: 'The only 11-point EI delivery framework in the world— nothing left to chance.', 
    stat: 'Delivery Model'
  },
  { 
    id: 'R2', 
    title: '55,000+ Lives Impacted', 
    body: '55,000+ individuals trained across 8 states', 
    stat: 'Proven Impact'
  },
  { 
    id: 'L3', 
    title: '150+ Activities Mapped', 
    body: '150+ experiential activities — each mapped to a specific skill or competency.', 
    stat: 'Experiential'
  },
  { 
    id: 'R3', 
    title: 'An ROI-Supported Model', 
    body: 'ROI tracking — real business outcomes, real numbers.', 
    stat: 'ROI Supported'
  }
];

function Counter({ value, suffix = "", isAtEnd }: { value: number; suffix?: string; isAtEnd: boolean }) {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef(null);

  useEffect(() => {
    let controls: any;
    if (isAtEnd) {
      controls = animate(0, value, {
        duration: 2.0,
        ease: "easeOut",
        onUpdate: (latest) => setDisplay(Math.floor(latest)),
      });
    }
    return () => controls?.stop();
  }, [isAtEnd, value]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Home() {
  const { scrollYProgress } = useScroll();
  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });

  const [isAtEnd, setIsAtEnd] = React.useState(false);
  const [activePair, setActivePair] = React.useState(0);
  const [activeMobileNode, setActiveMobileNode] = React.useState<string | null>(null);

  useMotionValueEvent(smoothScrollProgress, "change", (v) => {
    // Desktop Pair Logic
    if (v >= 0.3 && v < 0.5) setActivePair(1);
    else if (v >= 0.5 && v < 0.7) setActivePair(2);
    else if (v >= 0.7 && v < 0.94) setActivePair(3);
    else setActivePair(0);

    // Mobile Individual Logic
    if (v >= 0.3 && v < 0.4) setActiveMobileNode('L1');
    else if (v >= 0.4 && v < 0.5) setActiveMobileNode('R1');
    else if (v >= 0.5 && v < 0.6) setActiveMobileNode('L2');
    else if (v >= 0.6 && v < 0.7) setActiveMobileNode('R2');
    else if (v >= 0.7 && v < 0.8) setActiveMobileNode('L3');
    else if (v >= 0.8 && v < 0.94) setActiveMobileNode('R3');
    else setActiveMobileNode(null);

    if (v >= 0.94) {
      setIsAtEnd(true);
    } else if (v < 0.8) {
      setIsAtEnd(false);
    }
  });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothMouseX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const [isDesktop, setIsDesktop] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const check = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsMobile(window.innerWidth < 1024);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      mouseX.set((clientX / innerWidth) - 0.5);
      mouseY.set((clientY / innerHeight) - 0.5);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const scrollYMobile = useTransform(smoothScrollProgress, [0, 1], ["50vh", "-50vh"]);
  const scrollYDesktop = useTransform(smoothScrollProgress, [0, 1], ["75vh", "-75vh"]);
  const scrollY = isDesktop ? scrollYDesktop : scrollYMobile;
  
  const textOpacity = useTransform(smoothScrollProgress, [0, 0.2], [1, 0]);
  const textY = useTransform(smoothScrollProgress, [0, 0.2], [0, -150]);

  const sideContentOpacity = useTransform(smoothScrollProgress, [0.2, 0.35], [0, 1]);
  const sideContentY = useTransform(smoothScrollProgress, [0.2, 0.35], [100, 0]);

  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  
  const shiftX = useTransform(smoothMouseX, [-0.5, 0.5], [30, -30]);
  const shiftY = useTransform(smoothMouseY, [-0.5, 0.5], [20, -20]);

  const introX = useTransform(smoothMouseX, [-0.5, 0.5], [-5, 5]);
  const introY = useTransform(smoothMouseY, [-0.5, 0.5], [-2, 2]);
  const brandX = useTransform(smoothMouseX, [-0.5, 0.5], [-15, 15]);
  const brandY = useTransform(smoothMouseY, [-0.5, 0.5], [-10, 10]);
  const arsenalX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  const arsenalY = useTransform(smoothMouseY, [-0.5, 0.5], [-5, 5]);

  const leftColX = useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]);
  const rightColX = useTransform(smoothMouseX, [-0.5, 0.5], [20, -20]);

  const leftConnectorX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  const leftConnectorY = useTransform(smoothMouseY, [-0.5, 0.5], [-5, 5]);
  const rightConnectorX = useTransform(smoothMouseX, [-0.5, 0.5], [10, -10]);
  const rightConnectorY = useTransform(smoothMouseY, [-0.5, 0.5], [5, -5]);

  const leftNodeX = useTransform(smoothMouseX, [-0.5, 0.5], [-2, 2]);
  const leftNodeY = useTransform(smoothMouseY, [-0.5, 0.5], [-1, 1]);
  const rightNodeX = useTransform(smoothMouseX, [-0.5, 0.5], [2, -2]);
  const rightNodeY = useTransform(smoothMouseY, [-0.5, 0.5], [1, -1]);

  const pair1Opacity = useTransform(smoothScrollProgress, [0.3, 0.4, 0.5], [0, 1, 0]);
  const pair1Y = useTransform(smoothScrollProgress, [0.3, 0.4, 0.5], [50, 0, -50]);
  const pair2Opacity = useTransform(smoothScrollProgress, [0.5, 0.6, 0.7], [0, 1, 0]);
  const pair2Y = useTransform(smoothScrollProgress, [0.5, 0.6, 0.7], [50, 0, -50]);
  const pair3Opacity = useTransform(smoothScrollProgress, [0.7, 0.8, 0.9], [0, 1, 0]);
  const pair3Y = useTransform(smoothScrollProgress, [0.7, 0.8, 0.9], [50, 0, -50]);

  const connector1Opacity = useTransform(smoothScrollProgress, [0.3, 0.4, 0.5], [0, 0.4, 0]);
  const connector2Opacity = useTransform(smoothScrollProgress, [0.5, 0.6, 0.7], [0, 0.4, 0]);
  const connector3Opacity = useTransform(smoothScrollProgress, [0.7, 0.8, 0.9], [0, 0.4, 0]);

  const m1Opacity = useTransform(smoothScrollProgress, [0.3, 0.35, 0.4], [0, 1, 0]);
  const m1Y = useTransform(smoothScrollProgress, [0.3, 0.35, 0.4], [30, 0, -30]);
  const m2Opacity = useTransform(smoothScrollProgress, [0.4, 0.45, 0.5], [0, 1, 0]);
  const m2Y = useTransform(smoothScrollProgress, [0.4, 0.45, 0.5], [30, 0, -30]);
  const m3Opacity = useTransform(smoothScrollProgress, [0.5, 0.55, 0.6], [0, 1, 0]);
  const m3Y = useTransform(smoothScrollProgress, [0.5, 0.55, 0.6], [30, 0, -30]);
  const m4Opacity = useTransform(smoothScrollProgress, [0.6, 0.65, 0.7], [0, 1, 0]);
  const m4Y = useTransform(smoothScrollProgress, [0.6, 0.65, 0.7], [30, 0, -30]);
  const m5Opacity = useTransform(smoothScrollProgress, [0.7, 0.75, 0.8], [0, 1, 0]);
  const m5Y = useTransform(smoothScrollProgress, [0.7, 0.75, 0.8], [30, 0, -30]);
  const m6Opacity = useTransform(smoothScrollProgress, [0.8, 0.85, 0.9], [0, 1, 0]);
  const m6Y = useTransform(smoothScrollProgress, [0.8, 0.85, 0.9], [30, 0, -30]);

  const [selectedUSP, setSelectedUSP] = React.useState<string | null>(null);

  const nodes = STATIC_NODES.map(node => {
    let desktopOpacity, desktopY, mobileOpacity, mobileY;
    if (node.id === 'L1' || node.id === 'R1') {
      desktopOpacity = pair1Opacity; desktopY = pair1Y;
      mobileOpacity = node.id === 'L1' ? m1Opacity : m2Opacity;
      mobileY = node.id === 'L1' ? m1Y : m2Y;
    } else if (node.id === 'L2' || node.id === 'R2') {
      desktopOpacity = pair2Opacity; desktopY = pair2Y;
      mobileOpacity = node.id === 'L2' ? m3Opacity : m4Opacity;
      mobileY = node.id === 'L2' ? m3Y : m4Y;
    } else {
      desktopOpacity = pair3Opacity; desktopY = pair3Y;
      mobileOpacity = node.id === 'L3' ? m5Opacity : m6Opacity;
      mobileY = node.id === 'L3' ? m5Y : m6Y;
    }
    
    // We derive which pair this node belongs to for pointer-events logic
    const pairOpacity = (node.id === 'L1' || node.id === 'R1') ? pair1Opacity : 
                        (node.id === 'L2' || node.id === 'R2') ? pair2Opacity : 
                        pair3Opacity;

    return { ...node, desktopOpacity, desktopY, mobileOpacity, mobileY, pairOpacity };
  });

  const reachOpacity = useTransform(smoothScrollProgress, [0.88, 0.95], [0, 1]);
  const reachY = useTransform(smoothScrollProgress, [0.88, 0.95], [100, 0]);

  const quoteOpacity = useTransform(smoothScrollProgress, [0.07, 0.18, 0.27, 0.32], [0, 1, 1, 0]);
  const quoteY = useTransform(smoothScrollProgress, [0.07, 0.18], [100, 0]);

  const reachData = [
    { label: 'SCHOOLS', count: 135, height: '20%' },
    { label: 'MASTER TRAINERS', count: 350, height: '40%' },
    { label: 'TEACHERS / FACILITATORS', count: 650, height: '55%' },
    { label: 'STUDENTS', count: 2100, height: '75%' },
    { label: 'INDIVIDUALS', count: 55000, suffix: '+', height: '100%' }
  ];

  return (
    <div className="relative">
      <div className="h-[600vh] w-full pointer-events-none" />

      {/* Detail Popup Modal */}
      <AnimatePresence>
        {selectedUSP && uspDetails[selectedUSP] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md"
            onClick={() => setSelectedUSP(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#104C64]" />
              <button 
                onClick={() => setSelectedUSP(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="mb-8">
                <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-4 block">Detailed Insight</span>
                <h3 className="text-2xl md:text-4xl font-black text-black leading-tight mb-6">
                  {uspDetails[selectedUSP].title}
                </h3>
                <div className="w-12 h-1 bg-[#41B1C2] mb-8 rounded-full" />
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-normal">
                  {uspDetails[selectedUSP].detail}
                </p>
              </div>

              <button 
                onClick={() => setSelectedUSP(null)}
                className="w-full py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-bold uppercase tracking-[0.4em] text-sm rounded-full shadow-lg shadow-[#104C64]/20 transition-all"
              >
                Close View
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* What We Do Button with flanking info */}
      <motion.div
        style={{ opacity: reachOpacity, y: reachY }}
        className="fixed top-0 bottom-[110px] md:bottom-[130px] left-0 right-0 flex items-center justify-center z-20 pointer-events-none px-6"
      >
        <div className="flex items-center justify-center gap-x-6 md:gap-x-12 lg:gap-x-20 w-fit max-w-[95vw]">
          {/* Left Side */}
          <div className="hidden sm:flex flex-col items-end text-right max-w-[160px] md:max-w-[280px]">
            <span className="text-[8px] md:text-[10px] font-black text-[#104C64] uppercase tracking-[0.3em] mb-1">Get Access</span>
            <p className="text-xs md:text-xl font-bold text-black italic leading-tight">
              Register to gain access to
            </p>
          </div>

          {/* Center Button */}
          <Link 
            to="/register"
            className="pointer-events-auto px-6 py-4 md:px-10 md:py-5 bg-[#104C64] hover:bg-[#41B1C2] text-white font-black uppercase tracking-[0.4em] text-[9px] md:text-xs rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            Register Now
          </Link>

          {/* Right Side */}
          <div className="hidden sm:flex flex-col items-start gap-1 md:gap-2 max-w-[200px] md:max-w-[400px]">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="font-mono text-[8px] md:text-xs font-black text-[#41B1C2] bg-[#41B1C2]/10 px-1 py-0.5 md:px-1.5 md:py-0.5 rounded">1</span>
              <span className="text-[8px] md:text-[11px] font-bold text-black uppercase tracking-wider">India's first EMM on EI</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="font-mono text-[8px] md:text-xs font-black text-[#41B1C2] bg-[#41B1C2]/10 px-1 py-0.5 md:px-1.5 md:py-0.5 rounded">2</span>
              <span className="text-[8px] md:text-[11px] font-bold text-black uppercase tracking-wider">India's first Bias Codex</span>
            </div>
            <div className="flex items-start gap-1.5 md:gap-2">
              <span className="font-mono text-[8px] md:text-xs font-black text-[#41B1C2] bg-[#41B1C2]/10 px-1 py-0.5 md:px-1.5 md:py-0.5 rounded mt-0.5">3</span>
              <span className="text-[8px] md:text-[11px] font-bold text-black tracking-wide leading-tight">
                Novel Assessments, Interactive Pinwheel <br />and much more
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Our Reach Impact Counter */}
      <motion.div 
        style={{ opacity: reachOpacity, y: reachY }}
        className="fixed bottom-28 left-1/2 -translate-x-1/2 z-20 w-full max-w-4xl px-4 pointer-events-none"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 border-gray-200/50 rounded-[32px] p-3 md:p-4 shadow-2xl pointer-events-auto">
          <h2 className="text-xs md:text-sm font-black text-[#104C64] uppercase tracking-[0.4em] mb-1 text-center">Our Reach</h2>
          <div className="flex items-end justify-between gap-1 md:gap-4 h-[92px]">
            {reachData.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center group">
                <motion.div 
                  initial={{ height: 0 }}
                  whileInView={{ height: item.height }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="w-full bg-[#41B1C2] hover:bg-[#389EB1] transition-colors relative rounded-t-sm md:rounded-t-md shadow-sm"
                >
                  <div className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 text-sm md:text-2xl font-black text-[#104C64] whitespace-nowrap">
                    <Counter value={item.count} suffix={item.suffix} isAtEnd={isAtEnd} />
                  </div>
                </motion.div>
                <div className="mt-1 text-[7px] md:text-[10px] font-black text-black uppercase tracking-widest text-center leading-tight h-6 flex items-center">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="fixed inset-0 flex items-center justify-center z-0 pointer-events-none perspective-[1000px]">
        <div className="relative w-full max-w-xl h-full flex items-center justify-center">
          <motion.div
            style={{ y: scrollY, x: shiftX, translateY: shiftY, rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="absolute w-full flex flex-col items-center pointer-events-none scale-75 md:scale-100"
          >
            <div className="relative w-full flex flex-col items-center">
              <div className="w-full h-[200vh] relative flex flex-col items-center">
                 <img src="/hero.png" alt="Brain to Heart" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div 
        style={{ opacity: textOpacity, y: textY }}
        className="fixed inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none px-6"
      >
        <div className="flex flex-col items-center -mt-32 md:-mt-0">
          <motion.p
            className="text-[10px] md:text-sm uppercase tracking-[0.6em] font-bold mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] text-center text-black"
            style={{ x: introX, y: introY }}
          >
            Introducing
          </motion.p>
          <motion.h2 className="font-sans text-[10vw] md:text-[11vw] leading-none font-bold tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] text-center" style={{ x: brandX, y: brandY }}>
            <span className="text-black">Beyond</span><span className="text-white lg:text-[#104C64]">EQ</span><span className="text-black"> 3.0</span>
          </motion.h2>
        </div>
        <motion.div className="mt-48 md:mt-8 px-6 md:px-8 py-3 bg-white/10 backdrop-blur-md border border-white/40 border-gray-200/50 rounded-full shadow-[0_4px_4px_rgba(0,0,0,0.15)] flex items-center justify-center" style={{ x: arsenalX, y: arsenalY }}>
          <p className="text-[10px] md:text-base uppercase tracking-[0.6em] font-bold text-center text-black">Your Success Arsenal</p>
        </motion.div>
      </motion.div>

      <motion.div 
        style={{ opacity: quoteOpacity, y: quoteY }}
        className="fixed inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none px-6"
      >
        <motion.div 
          className="text-sm md:text-3xl font-normal text-black text-center whitespace-normal md:whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] italic flex flex-col md:flex-row items-center justify-center gap-y-2 md:gap-y-0 gap-x-16 md:gap-x-64"
          style={{ x: arsenalX, y: arsenalY }}
        >
          <div className="flex items-center gap-x-2 md:gap-x-4">
            Because <span className="font-black text-4xl md:text-7xl text-[#41B1C2] drop-shadow-[0_0_20px_rgba(65,177,194,0.6)]">80%</span> of your
          </div>
          <div className="flex items-center gap-x-2 md:gap-x-4">
            success comes from your <span className="font-black text-4xl md:text-7xl text-[#41B1C2] drop-shadow-[0_0_20px_rgba(65,177,194,0.6)]">EQ</span>
          </div>
        </motion.div>
      </motion.div>

      {isDesktop ? (
        <motion.div style={{ opacity: sideContentOpacity, y: sideContentY }} className="fixed inset-0 z-10 pointer-events-none flex flex-row items-center justify-between px-12">
          <div className="relative w-[420px] h-[500px] flex items-center justify-center">
            {nodes.filter(n => n.id.startsWith('L')).map((node) => (
              <motion.div 
                key={node.id} 
                onClick={() => setSelectedUSP(node.id)}
                style={{ 
                  x: leftColX, 
                  y: node.desktopY, 
                  opacity: node.desktopOpacity, 
                  position: 'absolute',
                  pointerEvents: (activePair === 1 && node.id === 'L1') || 
                                 (activePair === 2 && node.id === 'L2') || 
                                 (activePair === 3 && node.id === 'L3') ? 'auto' : 'none'
                }} 
                className="w-full p-12 bg-white/10 backdrop-blur-md border border-white/40 border-gray-200/50 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-white/20 transition-colors group"
              >
                <h3 className="text-2xl uppercase tracking-tight font-bold text-black mb-6 text-left group-hover:text-[#104C64] transition-colors">{node.title}</h3>
                <p className="text-lg text-black/80 leading-relaxed mb-8 text-left">{node.body}</p>
                <div className="pt-6 border-t border-black/10 flex justify-between items-center">
                  <p className="text-sm font-bold text-black uppercase tracking-[0.3em] text-left">{node.stat}</p>
                  <div className="px-4 py-2 bg-[#104C64] text-white text-[9px] font-black uppercase tracking-widest rounded-full group-hover:bg-[#41B1C2] transition-colors shadow-sm">
                    Know More
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="relative w-[420px] h-[500px] flex items-center justify-center">
            {nodes.filter(n => n.id.startsWith('R')).map((node) => (
              <motion.div 
                key={node.id} 
                onClick={() => setSelectedUSP(node.id)}
                style={{ 
                  x: rightColX, 
                  y: node.desktopY, 
                  opacity: node.desktopOpacity, 
                  position: 'absolute',
                  pointerEvents: (activePair === 1 && node.id === 'R1') || 
                                 (activePair === 2 && node.id === 'R2') || 
                                 (activePair === 3 && node.id === 'R3') ? 'auto' : 'none'
                }} 
                className="w-full p-12 bg-white/10 backdrop-blur-md border border-white/40 border-gray-200/50 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-white/20 transition-colors group"
              >
                <h3 className="text-2xl uppercase tracking-tight font-bold text-black mb-6 text-left group-hover:text-[#104C64] transition-colors">{node.title}</h3>
                <p className="text-lg text-black/80 leading-relaxed mb-8 text-left">{node.body}</p>
                <div className="pt-6 border-t border-black/10 flex justify-between items-center">
                  <p className="text-sm font-bold text-black uppercase tracking-[0.3em] text-left">{node.stat}</p>
                  <div className="px-4 py-2 bg-[#104C64] text-white text-[9px] font-black uppercase tracking-widest rounded-full group-hover:bg-[#41B1C2] transition-colors shadow-sm">
                    Know More
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : isMobile ? (
        <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center px-6">
          {nodes.map((node) => {
            const isActive = activeMobileNode === node.id;
            return (
              <motion.div 
                key={node.id} 
                onClick={() => setSelectedUSP(node.id)}
                style={{ 
                  position: 'absolute',
                  pointerEvents: isActive ? 'auto' : 'none'
                }} 
                animate={{
                  opacity: isActive ? 1 : 0,
                  y: isActive ? 0 : 15,
                  scale: isActive ? 1 : 0.96
                }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="w-full max-w-[340px] min-h-[370px] sm:min-h-[420px] p-5 sm:p-8 py-8 sm:py-16 bg-white/15 backdrop-blur-md border border-white/40 border-gray-200/50 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex flex-col justify-between cursor-pointer active:scale-95 transition-transform"
              >
                <div>
                  <h3 className="text-lg sm:text-xl uppercase tracking-[0.2em] font-bold text-black mb-4 sm:mb-8 text-center leading-tight">{node.title}</h3>
                  <p className="text-xs sm:text-sm text-black/80 leading-relaxed text-center px-1 sm:px-2">{node.body}</p>
                </div>
                <div className="pt-4 sm:pt-6 border-t border-black/10 flex flex-col items-center gap-3 sm:gap-4">
                  <p className="text-[9px] sm:text-[10px] font-bold text-black uppercase tracking-[0.3em] text-center">{node.stat}</p>
                  <div className="px-6 py-2.5 sm:px-8 sm:py-3 bg-[#41B1C2] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-full animate-pulse shadow-lg ring-4 ring-[#41B1C2]/20">
                    Know More
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : null}

      {(isDesktop || isMobile) && (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 1920 1080">
          {isDesktop && (
            <>
              {[
                { id: 'L1', yBox: 540, yPlug: 540, opacity: connector1Opacity },{ id: 'L2', yBox: 540, yPlug: 540, opacity: connector2Opacity },{ id: 'L3', yBox: 540, yPlug: 540, opacity: connector3Opacity }
              ].map((conn) => (
                <React.Fragment key={conn.id}>
                  <motion.path d={`M 468 ${conn.yBox} L 508 ${conn.yBox} C 540 ${conn.yBox}, 660 ${conn.yPlug}, 800 ${conn.yPlug}`} style={{ opacity: conn.opacity, x: leftConnectorX, y: leftConnectorY, strokeWidth: 1 }} fill="none" stroke="#000000" />
                  <motion.circle cx="800" cy={conn.yPlug} r="4" fill="#000000" style={{ opacity: conn.opacity, x: leftNodeX, y: leftNodeY }} />
                </React.Fragment>
              ))}
              {[
                { id: 'R1', yBox: 540, yPlug: 540, opacity: connector1Opacity },{ id: 'R2', yBox: 540, yPlug: 540, opacity: connector2Opacity },{ id: 'R3', yBox: 540, yPlug: 540, opacity: connector3Opacity }
              ].map((conn) => (
                <React.Fragment key={conn.id}>
                  <motion.path d={`M 1452 ${conn.yBox} L 1412 ${conn.yBox} C 1380 ${conn.yBox}, 1260 ${conn.yPlug}, 1120 ${conn.yPlug}`} style={{ opacity: conn.opacity, x: rightConnectorX, y: rightConnectorY, strokeWidth: 1 }} fill="none" stroke="#000000" />
                  <motion.circle cx="1120" cy={conn.yPlug} r="4" fill="#000000" style={{ opacity: conn.opacity, x: rightNodeX, y: rightNodeY }} />
                </React.Fragment>
              ))}
            </>
          )}
          {isMobile && nodes.map((node) => <motion.line key={`m-conn-${node.id}`} x1="960" y1="440" x2="960" y2="500" stroke="#000000" strokeWidth="1" style={{ opacity: activeMobileNode === node.id ? 0.4 : 0 }} />)}
        </svg>
      )}
    </div>
  );
}
