import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Brain, Target, Compass, BarChart3, Rocket, Users, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function WhatWeDo() {
  const [activeOffer, setActiveOffer] = useState<string | null>(null);
  const navigate = useNavigate();

  const approach = [
    {
      title: "BeyondEQ 3.0 Methodology",
      desc: "Our framework isn't static. It's an evolving blend of Neuroscience and cutting-edge behavioral methodologies designed for the modern chaos.",
      icon: <Brain className="w-6 h-6" />
    },
    {
      title: "The Emotional Maturity Model",
      desc: "India's first structured roadmap for measuring EQ across 6 distinct levels—Aware, Observant, Responsive, Proactive, Architect, and Inception—covering 75+ competencies and 80+ skills with scientific precision.",
      icon: <Target className="w-6 h-6" />
    }
  ];

  const offers = [
    {
      id: "enterprise",
      title: "Enterprise Transformation",
      shortDesc: "Comprehensive 12-month cultural integration.",
      fullDesc: "The ultimate solution for organizations seeking systemic change. This involves our proprietary Hendecagon Approach — a world-first 11-point delivery framework that leaves nothing to chance, from deep-dive audits to ROI tracking.",
      features: ["Hendecagon Framework", "Custom culture SOPs", "ROI Accountability", "Continuous CMM Mapping"],
      icon: <ShieldCheck className="w-6 h-6" />
    },
    {
      id: "workshops",
      title: "Masterclasses & Retreats",
      shortDesc: "High-impact experiential learning sessions.",
      fullDesc: "Immersive experiences using over 150 experiential activities mapped to specific skills. Designed to break patterns and build lasting emotional resilience in compact, powerful sessions.",
      features: ["150+ Experiential Activities", "Neuro-learning tools", "Peer-based feedback", "Actionable roadmaps"],
      icon: <Users className="w-6 h-6" />
    },
    {
      id: "certification",
      title: "Certified Practitioner Paths",
      shortDesc: "Professional grade EI certification.",
      fullDesc: "Progressive levels of mastery from Beginner to practitioner Master. Built for leaders who want to lead with depth and clarity.",
      features: ["Lifetime Resource Access", "Global Benchmarking", "Progressive Assessments", "Expert Mentorship"],
      icon: <Rocket className="w-6 h-6" />
    },
    {
      id: "tailor_workshops",
      title: "Tailor Made Workshops",
      shortDesc: "Customized developmental architectures.",
      fullDesc: "We design custom-architected learning experiences and workshops engineered specifically for your organization's unique cultural dynamics, interpersonal friction points, and leadership requirements.",
      features: ["Custom Action Blueprints", "Interactive Case Studies", "Friction Regulation", "Pattern Interruption"],
      icon: <Zap className="w-6 h-6" />
    },
    {
      id: "social_projects",
      title: "Social Projects",
      shortDesc: "Systemic community-facing initiatives.",
      fullDesc: "Engaging and impactful social projects applying emotional maturity principles to wider community environments to cultivate shared alignment, civic responsibility, and collective progress.",
      features: ["Social Impact Focus", "Experiential Labs", "Collective Action", "Civic Growth Roadmap"],
      icon: <Compass className="w-6 h-6" />
    }
  ];

  const benefits = [
    { val: "Up to 21%", label: "Increase in Profitability", desc: "Teams with high average EQ outperform targets consistently." },
    { val: "Up to 24%", label: "Reduction in Turnover", desc: "Better managed emotions lead to higher employee retention." },
    { val: "Up to 17%", label: "Higher Productivity", desc: "Clarity and focus result from superior emotional regulation." }
  ];

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-auto overflow-x-hidden font-sans selection:bg-[#41B1C2] selection:text-white md:[mask-image:linear-gradient(to_bottom,transparent_0,transparent_80px,black_140px)] md:[-webkit-mask-image:linear-gradient(to_bottom,transparent_0,transparent_80px,black_140px)]"
    >
      <div className="bg-white min-h-full">
        {/* 1. Cinematic Hero & Video Centerpiece */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background / Centerpiece */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] relative pointer-events-none">
            <video
              src="/tetrahedron_2.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-contain opacity-40 mix-blend-multiply scale-[1.2]"
            />
          </div>
        </div>

        {/* Hero Text Overlay */}
        <div className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-9xl font-black text-[#104C64] uppercase tracking-tighter italic leading-none mb-4">
              Our <span className="text-[#41B1C2]">DNA</span>
            </h1>
            <p className="text-[10px] md:text-sm font-bold uppercase tracking-[0.6em] text-gray-600 mb-12">The Science of Human Potential</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="max-w-xl mx-auto"
          >
            <p className="text-lg md:text-xl text-black/60 font-medium leading-relaxed italic">
              "We don't teach theory. We build the architecture for emotional maturity through neuro-validated frameworks."
            </p>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <motion.div 
            animate={{ 
              boxShadow: [
                "0 0 0px rgba(65, 177, 194, 0)", 
                "-20px 0 25px rgba(65, 177, 194, 0.8), 20px 0 25px rgba(65, 177, 194, 0.8)", 
                "0 0 0px rgba(65, 177, 194, 0)"
              ],
              scaleX: [1, 2.5, 1]
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-12 bg-gradient-to-b from-[#104C64]/0 via-[#104C64] to-[#104C64]/0" 
          />
          <span className="text-[8px] font-bold text-[#104C64] uppercase tracking-[0.4em]">Scroll</span>
        </div>
      </section>

      {/* 2. Approach & USPs */}
      <section className="py-16 px-6 md:px-12 bg-white relative z-20 overflow-hidden">
        {/* Subtle Background Text - Adjusted for better contrast/legibility */}
        <div className="absolute top-0 left-0 w-full text-center text-[#104C64]/[0.02] text-[25vw] font-black uppercase tracking-tighter select-none pointer-events-none italic -translate-y-1/4">
          DNA
        </div>

        <div className="max-w-7xl mx-auto relative lg:flex gap-16 items-start">
          {/* Left Column: The Narrative */}
          <div className="lg:w-[38%] mb-20 lg:mb-0">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="sticky top-32"
            >
              <div className="flex items-center gap-4 mb-8">
                <span className="w-12 h-px bg-[#41B1C2]" />
                <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em]">The DNA of BeyondEQ</span>
              </div>
              
              <h2 className="text-3xl md:text-6xl font-black text-[#104C64] uppercase tracking-tighter italic leading-[0.85] mb-12">
                A Radical <br />
                Departure <br />
                From <br />
                Tradition.
              </h2>

              <div className="space-y-6 text-xl text-black/60 font-medium italic leading-relaxed max-w-lg">
                <p>
                  Most Emotional Intelligence programs are relics—built on theories from the 1990s that haven't evolved to meet the complexities of a hyper-connected world.
                </p>
                <p>
                  At BeyondEQ, we've rebuilt EI from the ground up. Our approach is <span className="text-[#104C64] font-bold">architectural</span>. We build the cognitive infrastructure required to sustain maturity under pressure.
                </p>
              </div>

              <div className="mt-16 flex gap-12">
                <div>
                  <p className="text-4xl font-black text-[#104C64] italic mb-1">3.0</p>
                  <p className="text-[8px] font-bold text-[#41B1C2] uppercase tracking-widest">Version Control</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-[#104C64] italic mb-1">PRO</p>
                  <p className="text-[8px] font-bold text-[#41B1C2] uppercase tracking-widest">Grade Standards</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: The USPs */}
          <div className="lg:w-[62%] space-y-6 lg:pt-16">
            {approach.map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="group relative h-auto min-h-[200px] p-6 md:p-8 rounded-[32px] bg-gray-50/50 backdrop-blur-sm border border-gray-100 shadow-xl shadow-[#104C64]/5 hover:bg-white hover:shadow-[0_30px_60px_-15px_rgba(16,76,100,0.12)] transition-all duration-700 flex flex-col justify-between"
              >
                <div className="absolute top-6 right-8 text-4xl md:text-5xl font-black text-black/[0.03] italic transition-colors select-none">
                  0{idx + 1}
                </div>
                
                <div>
                  <div className="w-12 h-12 rounded-[16px] bg-[#41B1C2] flex items-center justify-center text-white mb-4 [&_svg]:w-5 [&_svg]:h-5 group-hover:rotate-[15deg] transition-transform duration-500 shadow-lg shadow-[#41B1C2]/20">
                    {item.icon}
                  </div>
                  
                  <h3 className="text-lg md:text-xl font-black text-black uppercase tracking-widest mb-2 italic">{item.title}</h3>
                  <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-[0.15em] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Redesigned BeyondEQ Difference as a Wide Rectangle */}
        <div className="max-w-7xl mx-auto mt-8">
          <div
            className="p-8 md:p-12 rounded-[50px] bg-[#104C64] text-white overflow-hidden relative group cursor-default shadow-2xl shadow-[#104C64]/30 flex flex-col md:flex-row items-center gap-8"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#41B1C2]/10 rounded-full blur-3xl -mr-48 -mt-48 transition-transform duration-1000 group-hover:scale-150" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#41B1C2]/10 rounded-full blur-2xl -ml-32 -mb-32 transition-transform duration-1000 group-hover:scale-150" />
            
            <div className="relative z-10 md:w-1/3">
              <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.4em] mb-2 block">Unique Positioning</span>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-[0.85]">
                The <span className="text-[#41B1C2]">BeyondEQ</span> <br /> 
                Difference.
              </h3>
            </div>
            
            <div className="relative z-10 md:w-2/3 md:border-l border-white/10 md:pl-10">
              <p className="text-base md:text-lg font-medium italic tracking-wide leading-relaxed opacity-90">
                We are the only organization in India providing a structured Emotional Maturity Roadmap that maps progress across 6 distinct levels of human evolution—Aware, Observant, Responsive, Proactive, Architect, and Inception. Our methodology ensures that growth is not accidental, but engineered.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Mission & Vision - Minimalist Redesign */}
      <section className="py-12 px-6 md:px-12 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-gray-100">
            {/* Vision Plate */}
            <div className="bg-white py-8 lg:pr-24 flex flex-col group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex-1"
              >
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#41B1C2]" />
                  <span className="text-[12px] font-black text-[#104C64] uppercase tracking-[0.5em]">The Vision</span>
                </div>
                
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-black leading-[0.9] mb-12">
                  Human <br />
                  <span className="text-[#41B1C2] transition-colors duration-700">Flourishing</span> <br />
                  Simplified.
                </h2>
                
                <p className="text-lg text-black/40 font-medium italic leading-relaxed max-w-sm">
                  A world where Emotional Intelligence is the foundational infrastructure for human evolution—measurable, accessible, and vital.
                </p>
              </motion.div>
            </div>

            {/* Mission Plate */}
            <div className="bg-white py-8 lg:pl-24 flex flex-col group">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex-1"
              >
                <div className="flex items-center gap-3 mb-12">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#104C64]" />
                  <span className="text-[12px] font-black text-[#104C64] uppercase tracking-[0.5em]">The Mission</span>
                </div>
                
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-black leading-[0.9] mb-12">
                  Logic <br />
                  <span className="text-[#41B1C2] transition-colors duration-700">Engineering</span> <br />
                  Empathy.
                </h2>
                
                <p className="text-lg text-black/40 font-medium italic leading-relaxed max-w-sm">
                  Translating complex neuroscience into surgical frameworks that empower leaders to build cultures of clarity and resilience.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. What We Offer - The Transformation Blueprint */}
      <section className="py-16 px-6 md:px-12 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em] mb-4 block">Our Solutions</span>
            <h2 className="text-4xl md:text-7xl font-black text-[#104C64] uppercase tracking-tighter italic">The Blueprint for Transformation.</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  onClick={() => setActiveOffer(activeOffer === offer.id ? null : offer.id)}
                  className={`w-full text-left p-8 rounded-[40px] transition-all duration-300 group flex items-center justify-between border ${
                    activeOffer === offer.id 
                    ? 'bg-white border-[#104C64] shadow-xl ring-1 ring-[#104C64]/10' 
                    : 'bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-2xl transition-colors ${activeOffer === offer.id ? 'bg-[#104C64] text-white' : 'bg-white text-gray-400 group-hover:text-black'}`}>
                      {offer.icon}
                    </div>
                    <div>
                      <h3 className="font-black text-black uppercase tracking-widest italic">{offer.title}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{offer.shortDesc}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 transition-transform ${activeOffer === offer.id ? 'rotate-90 text-[#104C64]' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>

            <div className="min-h-[500px]">
              <AnimatePresence mode="wait">
                {activeOffer ? (
                  <motion.div
                    key={activeOffer}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-12 rounded-[60px] bg-[#104C64]/5 border border-[#104C64]/10 h-full flex flex-col"
                  >
                    {offers.find(o => o.id === activeOffer)?.fullDesc && (
                      <>
                        <h4 className="text-2xl font-black text-[#104C64] uppercase tracking-tight italic mb-6">
                          {offers.find(o => o.id === activeOffer)?.title}
                        </h4>
                        <p className="text-lg text-black/70 font-medium italic leading-relaxed mb-10">
                          {offers.find(o => o.id === activeOffer)?.fullDesc}
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-auto">
                          {offers.find(o => o.id === activeOffer)?.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-black/5">
                              <div className="w-2 h-2 rounded-full bg-[#41B1C2]" />
                              <span className="text-[10px] font-bold text-black uppercase tracking-widest">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 rounded-[60px] border-2 border-dashed border-gray-100">
                    <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
                    <p className="text-sm font-bold text-gray-300 uppercase tracking-[0.3em]">Select a solution to explore depth.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Why EQ? Proven Benefits */}
      <section className="py-12 px-6 md:px-12 bg-gray-50 overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-4">The Impact</h2>
            <h3 className="text-4xl md:text-5xl font-black text-black uppercase tracking-tighter italic">Why EQ Matters.</h3>
            <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-xs">Proven data. Measurable success.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {benefits.map((benefit, i) => (
              <div key={i} className="p-12 bg-white rounded-[60px] border border-gray-100 shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform duration-500">
                <div className="text-[#104C64] mb-4">
                  <span className="text-sm md:text-base font-black uppercase tracking-[0.4em] block mb-2">Up to</span>
                  <div className="text-6xl md:text-8xl font-black italic tracking-tighter">{benefit.val.replace("Up to ", "")}</div>
                </div>
                <h4 className="text-lg font-black text-black uppercase tracking-tight italic mb-3">{benefit.label}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer-like closer */}
      <section className="pt-16 pb-36 md:pb-44 px-6 text-center flex flex-col items-center justify-center">
        <h3 className="text-[10px] font-black text-[#104C64] uppercase tracking-[1em] mb-8">Ready to evolve?</h3>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/contact', { state: { scrollToForm: true } })}
          className="px-16 py-8 bg-[#104C64] text-white font-black uppercase tracking-[0.4em] text-xs rounded-full shadow-2xl shadow-[#104C64]/30"
        >
          Begin The Journey
        </motion.button>
      </section>
    </div>
    </div>
  );
}
