import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Interactive3DBackground from './Interactive3DBackground';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Brain, 
  Award, 
  ShieldCheck, 
  Compass, 
  Users, 
  ArrowUpRight, 
  Check, 
  Quote, 
  Globe, 
  Landmark, 
  GraduationCap, 
  Heart, 
  Calendar, 
  Zap,  
  Sparkles,
  Search,
  CheckCircle2,
  Users2,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

export default function About() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [showTrainerForm, setShowTrainerForm] = React.useState(false);
  const [formSubmitStatus, setFormSubmitStatus] = React.useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [trainerFormData, setTrainerFormData] = React.useState({
    fullName: '',
    email: '',
    role: 'Practitioner',
    experience: '2-5 years',
    motivation: '',
    agreed: false
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTrainerFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setTrainerFormData(prev => ({ ...prev, [name]: checked }));
    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const submitTrainerForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!trainerFormData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!trainerFormData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(trainerFormData.email)) {
      errors.email = 'Email address is invalid';
    }
    if (!trainerFormData.motivation.trim()) {
      errors.motivation = 'Please share your motivation';
    }
    if (!trainerFormData.agreed) {
      errors.agreed = 'You must agree to the network ethical standards';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitStatus('submitting');
    try {
      // 1. Store application request in Firestore
      await addDoc(collection(db, "trainerApplications"), {
        ...trainerFormData,
        submittedAt: serverTimestamp(),
      });

      // 2. Transmit notification request to backend API to attempt real email delivery to info@beyondeq.org
      const response = await fetch("/api/submit-trainer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trainerFormData),
      });

      if (!response.ok) {
        console.warn("Backend mail notification returned non-ok status");
      }
    } catch (err) {
      console.error("Failed to submit trainer application:", err);
    } finally {
      setFormSubmitStatus('submitted');
    }
  };

  const resetTrainerForm = () => {
    setTrainerFormData({
      fullName: '',
      email: '',
      role: 'Practitioner',
      experience: '2-5 years',
      motivation: '',
      agreed: false
    });
    setFormErrors({});
    setFormSubmitStatus('idle');
  };

  const [hoveredMilestone, setHoveredMilestone] = React.useState<number | null>(null);
  const [avatarError, setAvatarError] = React.useState(false);
  const [avatarLoaded, setAvatarLoaded] = React.useState(false);
  const [selectedStat, setSelectedStat] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (containerRef.current) containerRef.current.scrollTo(0, 0);
  }, []);

  const milestones = [
    { year: '2018', text: 'Formation of BeyondEQ — content design begins (EI + Neuroscience + Behavioral Sciences)' },
    { year: '2019', text: 'Full framework and delivery mechanism developed' },
    { year: '2020–21', text: 'Testing and design refinement — validating proof of concept' },
    { year: '2022', text: 'BeyondEQ 2.0 — redesigned approach and tools' },
    { year: '2023', text: 'Widespread acknowledgement by clients; 2X growth' },
    { year: '2024', text: 'Continued expansion and increased awareness' },
    { year: '2025', text: 'BeyondEQ 3.0 — a new and more powerful model launched' },
    { year: '2026', text: 'Scaling impact nationally and internationally' },
  ];

  const stats = [
    { label: 'Individuals Trained', value: '55k+', icon: Users, description: 'Empowered with human-centric roadmap strategies.' },
    { label: 'Master Trainers', value: '350+', icon: Award, description: 'Certified professionals acting as catalysts.' },
    { label: 'Schools Impacted', value: '135', icon: GraduationCap, description: 'Fostering developmental EQ in student communities.' },
    { label: 'Principals Reached', value: '195', icon: Compass, description: 'Enabling proactive education leadership models.' },
    { label: 'NGO Partners', value: '130+', icon: Landmark, description: 'Strengthening community trust and core delivery.' },
    { label: 'Years of Impact', value: '7+', icon: Calendar, description: 'Of sustained research, evolution, and field success.' },
  ];

  const statsDetails = [
    {
      title: "Individuals Trained",
      value: "55,240 Total",
      phrase: "Deep systemic transformation metric across diverse sectors.",
      breakdown: [
        { name: "Student Communities", val: "35,120", pct: 64 },
        { name: "Academic Educators", val: "12,450", pct: 23 },
        { name: "Corporate Professionals", val: "7,670", pct: 13 },
      ],
      insight: "Our cognitive roadmap focuses on deep habituation instead of superficial knowledge."
    },
    {
      title: "Certified Master Trainers",
      value: "350+ Leaders",
      phrase: "Force multipliers facilitating the BeyondEQ curriculum.",
      breakdown: [
        { name: "Senior Coach Mentors", val: "85", pct: 24 },
        { name: "Active Practitioners", val: "165", pct: 47 },
        { name: "Associate Facilitators", val: "100", pct: 29 },
      ],
      insight: "Cultivating leadership coaches to scale localized counseling and behavioral programs."
    },
    {
      title: "Educational School Impact",
      value: "135 Schools",
      phrase: "Injecting modern emotional intelligence frameworks into academic ecosystems.",
      breakdown: [
        { name: "Secondary & High Schools", val: "78", pct: 58 },
        { name: "Primary & Junior Schools", val: "38", pct: 28 },
        { name: "Vocational Colleges", val: "19", pct: 14 },
      ],
      insight: "Replacing traditional discipline systems with self-reflective behavioral models."
    },
    {
      title: "Principal Leadership Outreach",
      value: "195 Principals",
      phrase: "Equipping school administrative heads to govern under high stress.",
      breakdown: [
        { name: "Urban Academic Heads", val: "112", pct: 57 },
        { name: "District & Rural Leaders", val: "53", pct: 27 },
        { name: "Board Trustees & Advisors", val: "30", pct: 16 },
      ],
      insight: "Helping leaders prevent administrator burnout while managing massive institutional changes."
    },
    {
      title: "NGO & Community Allies",
      value: "130+ Allies",
      phrase: "Partnering to deploy localized programs in remote tier-2 and tier-3 sectors.",
      breakdown: [
        { name: "Youth Guidance Alliances", val: "62", pct: 46 },
        { name: "Rural Socio-Ecological Hubs", val: "45", pct: 34 },
        { name: "Self-Help Groups & Forums", val: "27", pct: 20 },
      ],
      insight: "Lowering barriers to mental-emotional support structure setups for marginalized groups."
    },
    {
      title: "Years of Active Impact",
      value: "7+ Years",
      phrase: "Continuous validation and delivery optimization since 2018.",
      breakdown: [
        { name: "Phase 1: Research (2018-20)", val: "2 Years", pct: 28 },
        { name: "Phase 2: Live Practice (2021-23)", val: "3 Years", pct: 43 },
        { name: "Phase 3: Scale (2024-Pres)", val: "2 Years", pct: 29 },
      ],
      insight: "Our model evolved into 3.0 via deep research loops across global academic research papers."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 80, damping: 15 } 
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-auto overflow-x-hidden bg-stone-100/30 font-sans text-stone-900 selection:bg-[#41B1C2] selection:text-white relative"
      id="about-view-root"
    >
      {/* Dynamic 3D floating and rotating tetrahedron neural backdrop */}
      <Interactive3DBackground containerRef={containerRef} />

      <div className="min-h-full pb-1 relative z-10 pointer-events-none">
        
        {/* 1. Impact Hero */}
        <section className="relative pt-48 pb-32 px-6 md:px-12 bg-[#104C64]/85 backdrop-blur-[2px] overflow-hidden pointer-events-auto" id="about-section-hero">
          <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none">
            <img src="/hero.png" alt="geometric pattern" className="w-full h-full object-cover scale-105" />
          </div>
          {/* Glowing artistic ambient spheres */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#41B1C2]/20 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] rounded-full bg-black/30 blur-[150px] pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-10"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-3">
                <span className="text-xs font-black tracking-[0.5em] text-[#41B1C2] uppercase bg-[#41B1C2]/15 px-5 py-2.5 rounded-full border border-[#41B1C2]/20 backdrop-blur-md shadow-lg shadow-[#41B1C2]/15">
                  EST. 2018
                </span>
                <span className="h-[1px] w-12 bg-[#41B1C2]/40" />
                <span className="text-[9px] font-bold text-white/55 tracking-widest uppercase">Pioneering EQ Architecture</span>
              </motion.div>

              <motion.h1 
                variants={itemVariants}
                className="text-5xl sm:text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85] italic font-sans"
              >
                The Science of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#41B1C2] via-[#41B1C2] to-white/70">
                  Human Output.
                </span>
              </motion.h1>

              <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-t border-white/10 pt-10 mt-6">
                <p className="text-lg md:text-2xl text-white/85 max-w-3xl font-light leading-relaxed border-l-4 border-[#41B1C2] pl-8">
                  BeyondEQ is India's pioneering Emotional Intelligence organisation — engineering the psychological infrastructure for modern success.
                </p>
                <div className="shrink-0 flex items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md shadow-2xl shadow-black/25">
                  <div className="w-12 h-12 rounded-2xl bg-[#41B1C2]/20 flex items-center justify-center">
                    <Brain className="text-[#41B1C2] w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-white font-black uppercase text-[10px] tracking-wider leading-none">EI + AI Strategy</h5>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-1">Ready for the future</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 2. Manifesto / Who We Are */}
        <section className="py-20 md:py-24 px-6 md:px-12 bg-white/45 backdrop-blur-[2px] relative overflow-hidden pointer-events-auto" id="about-section-manifesto">
          <div className="absolute left-0 bottom-0 w-96 h-96 bg-[#104C64]/[0.01] rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center">
            
            {/* Left Narrative */}
            <div className="lg:col-span-5 space-y-8">
              <div className="inline-flex items-center gap-4">
                <span className="w-8 h-[2px] bg-[#104C64]" />
                <span className="text-xs font-black text-[#104C64] uppercase tracking-[0.5em]">Our DNA</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-stone-900 uppercase tracking-tighter leading-none italic">
                Engineering Success <span className="text-[#104C64]">Frameworks</span>.
              </h2>
              <div className="space-y-6 text-lg text-stone-600 leading-relaxed font-normal">
                <p>
                  BeyondEQ was founded in 2019 on one core, evidence-backed belief:{' '}
                  <span className="text-black font-black bg-[#41B1C2]/10 px-2 py-0.5 rounded-md border-b-2 border-[#41B1C2]/30 not-italic">
                    80% of your success in life is driven by EQ — not IQ.
                  </span>
                </p>
                <p className="font-light italic">
                  We are a professional training and coaching organisation dedicated to making Emotional Intelligence accessible, practical, and measurable for everyone.
                </p>
              </div>
            </div>

            {/* Right Card Panel */}
            <div className="lg:col-span-7">
              <motion.div 
                whileHover={{ y: -6 }}
                className="p-10 md:p-14 bg-stone-50 rounded-[50px] border border-stone-200/60 shadow-2xl shadow-stone-900/[0.03] relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#41B1C2]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full border border-[#104C64]/5 flex items-center justify-center opacity-40">
                  <Sparkles className="w-5 h-5 text-[#104C64]" />
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-[#104C64] uppercase tracking-tighter italic mb-6 leading-tight">
                  Beyond Theory. <br />
                  <span className="text-stone-900 border-b border-[#41B1C2] pb-1">Beyond EQ 3.0.</span>
                </h3>
                
                <p className="text-stone-500 leading-relaxed text-base mb-8">
                  Our approach maps individual behavioral progress across the structured dimensions of the Emotional Maturity Model, transforming raw emotional reflexes into tailored responses and systemic, authority-free alignment.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3. The Shift (Visual Comparison Card Dashboard) */}
        <section className="py-8 md:py-12 px-6 md:px-12 bg-stone-100/40 backdrop-blur-sm relative overflow-hidden pointer-events-auto" id="about-section-shift">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 space-y-2">
              <span className="text-[11px] font-black text-[#104C64] uppercase tracking-[0.6em] bg-white border border-[#104C64]/10 px-4 py-1.5 rounded-full inline-block shadow-md shadow-[#104C64]/5">
                The Redefinition
              </span>
              <h2 className="text-3xl md:text-5xl font-black text-stone-900 uppercase tracking-tighter italic leading-none pt-1">
                Modern <span className="text-[#104C64]">vs</span> Traditional.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="comparison-panels-grid">
              {[
                { 
                  old: 'Focused on managing emotions', 
                  new: 'Redefines EI as a tool for achieving meaningful success',
                  highlight: 'Performance Driven'
                },
                { 
                  old: 'A tool for mental health', 
                  new: 'A tool for success — grounded in neuroscience and psychoanalysis',
                  highlight: 'Neuroscience Backed'
                },
                { 
                  old: 'Core framework over 25 years old', 
                  new: "Adapted for today's world — bias correction, cultural context, future EQ challenges",
                  highlight: 'Future-Proof Model'
                },
                { 
                  old: 'Theory-heavy content', 
                  new: '150+ mapped experiential activities across multiple formats',
                  highlight: 'Active Practice'
                },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="bg-white rounded-[32px] border border-stone-200/60 overflow-hidden shadow-xl shadow-stone-900/10 hover:shadow-2xl hover:shadow-[#104C64]/15 flex flex-col hover:border-[#41B1C2]/30 transition-all duration-300 group"
                >
                  <div className="bg-stone-50 border-b border-stone-100 py-4 px-6 flex justify-between items-center">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Parameter {i + 1}</span>
                    <span className="text-[10px] font-black bg-[#41B1C2]/10 text-[#104C64] uppercase tracking-widest px-3 py-1 rounded-full">{item.highlight}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 h-full">
                    {/* Left - Traditional */}
                    <div className="p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-stone-100 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
                        Traditional Models
                      </span>
                      <p className="text-stone-500 font-medium text-xs sm:text-sm line-through decoration-red-500 decoration-2">
                        {item.old}
                      </p>
                    </div>
                    {/* Right - BeyondEQ */}
                    <div className="p-6 sm:p-8 bg-[#104C64]/[0.01] flex flex-col justify-center group-hover:bg-[#41B1C2]/[0.02] transition-colors duration-300">
                      <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.15em] mb-2 flex items-center gap-1.5 italic">
                        <Check className="w-3.5 h-3.5 text-[#41B1C2] stroke-[3]" />
                        BeyondEQ 3.0
                      </span>
                      <p className="text-[#104C64] font-black italic text-xs sm:text-sm md:text-base leading-snug">
                        {item.new}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <span className="inline-flex items-center gap-2 text-stone-400 font-bold uppercase tracking-widest text-[9px] bg-white px-5 py-2 rounded-full border border-stone-200/50">
                <ShieldCheck className="w-3.5 h-3.5 text-[#41B1C2]" />
                Proprietary <span className="text-[#104C64] font-black">Hendecagon Approach</span> — 11-Point Delivery Framework for Lasting ROI.
              </span>
            </div>
          </div>
        </section>

        {/* 4. Timeline Redesign (Premium Horizontal Card Rail - Non Scrolling) */}
        <section className="py-16 md:py-20 px-6 md:px-12 bg-white/45 backdrop-blur-[2px] pointer-events-auto" id="about-section-evolution">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
              <div className="max-w-2xl space-y-4">
                <span className="text-xs font-black text-[#104C64] uppercase tracking-[0.5em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#104C64]" />
                  Our Evolution
                </span>
                <h3 className="text-4xl md:text-5xl font-black text-stone-900 italic uppercase tracking-tighter leading-none">
                  A Timeline of <br />
                  <span className="text-[#41B1C2]">Strategic Impact.</span>
                </h3>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-3 bg-stone-50 border border-stone-200/80 px-5 py-3 rounded-2xl">
                  <div className="w-2 h-2 rounded-full bg-[#41B1C2]" />
                  <p className="text-stone-400 font-black uppercase tracking-widest text-[9px]">Sustained growth path</p>
                </div>
              </div>
            </div>

            {/* Desktop Simple Horizontal Timeline (Fits on one screen width without scrolling) */}
            <div className="hidden md:block relative py-12" id="about-timeline-desktop">
              {/* Connection Line */}
              <div className="absolute top-[68px] left-[6.25%] right-[6.25%] h-[2px] bg-[#104C64]/10" />
              
              <div className="grid grid-cols-8 gap-2 relative z-10">
                {milestones.map((m, i) => {
                  const isHovered = hoveredMilestone === i;
                  return (
                    <div 
                      key={i} 
                      className="flex flex-col items-center text-center select-none cursor-pointer"
                      onMouseEnter={() => setHoveredMilestone(i)}
                      onMouseLeave={() => setHoveredMilestone(null)}
                    >
                      {/* Circle Node */}
                      <motion.div 
                        initial={false}
                        animate={{
                          scale: isHovered ? 1.25 : 1,
                          backgroundColor: isHovered ? "#41B1C2" : "#ffffff",
                          borderColor: isHovered ? "#41B1C2" : "#e6e5e3",
                          boxShadow: isHovered ? "0 25px 50px -12px rgba(65, 177, 194, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-[40px] h-[40px] rounded-full border flex items-center justify-center mb-6 relative z-10"
                      >
                        <motion.div 
                          initial={false}
                          animate={{
                            scale: isHovered ? 1.25 : 1,
                            backgroundColor: isHovered ? "#ffffff" : "#104C64"
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="w-2.5 h-2.5 rounded-full" 
                        />
                      </motion.div>
                      
                      {/* Texts with hover styling - zoomed, translated upwards and highlighted */}
                      <motion.div 
                        initial={false}
                        animate={{
                          scale: isHovered ? 1.15 : 1,
                          y: isHovered ? -8 : 0
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="space-y-2 origin-top"
                      >
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] block transition-colors duration-200 ${isHovered ? "text-[#41B1C2]" : "text-[#104C64]"}`}>{m.year}</span>
                        <p className={`text-[9px] font-bold uppercase tracking-[0.03em] leading-relaxed max-w-[125px] mx-auto transition-colors duration-200 ${isHovered ? "text-stone-950 font-black" : "text-stone-500"}`}>
                          {m.text}
                        </p>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Stacked Timeline */}
            <div className="block md:hidden space-y-8" id="about-timeline-mobile">
              {milestones.map((m, i) => {
                const isHovered = hoveredMilestone === i;
                return (
                  <div 
                    key={i} 
                    className="flex gap-5 items-start cursor-pointer"
                    onMouseEnter={() => setHoveredMilestone(i)}
                    onMouseLeave={() => setHoveredMilestone(null)}
                    onTouchStart={() => setHoveredMilestone(i)}
                    onTouchEnd={() => setHoveredMilestone(null)}
                  >
                    <div className="flex flex-col items-center shrink-0">
                      <motion.div 
                        initial={false}
                        animate={{
                          scale: isHovered ? 1.15 : 1,
                          backgroundColor: isHovered ? "#41B1C2" : "#ffffff",
                          borderColor: isHovered ? "#41B1C2" : "#e6e5e3",
                          boxShadow: isHovered ? "0 10px 15px -3px rgba(65, 177, 194, 0.4)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-8 h-8 rounded-full border flex items-center justify-center z-10 shadow-sm"
                      >
                        <motion.div 
                          initial={false}
                          animate={{
                            scale: isHovered ? 1.25 : 1,
                            backgroundColor: isHovered ? "#ffffff" : "#104C64"
                          }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                          className="w-2 h-2 rounded-full" 
                        />
                      </motion.div>
                      {i < milestones.length - 1 && <div className="w-[2px] h-14 bg-stone-100 mt-2" />}
                    </div>
                    <motion.div 
                      initial={false}
                      animate={{
                        scale: isHovered ? 1.05 : 1,
                        x: isHovered ? 6 : 0
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="pt-1 origin-left"
                    >
                      <span className={`text-xs font-black uppercase tracking-[0.2em] transition-colors duration-200 ${isHovered ? "text-[#41B1C2]" : "text-[#104C64]"}`}>{m.year}</span>
                      <p className={`text-[11px] font-bold uppercase tracking-widest leading-relaxed mt-1.5 transition-colors duration-200 ${isHovered ? "text-stone-950 font-black" : "text-stone-500"}`}>{m.text}</p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Founder Spotlight */}
        <section className="py-20 md:py-24 px-6 md:px-12 bg-stone-50/70 backdrop-blur-sm border-t border-stone-200/40 relative pointer-events-auto" id="about-section-founder">
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#41B1C2]/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Visual Avatar Element */}
            <div className="relative group mx-auto lg:mx-0 w-full max-w-xs sm:max-w-[320px] lg:col-span-4">
              <div className="absolute inset-0 bg-[#41B1C2]/15 rounded-[56px] translate-x-3 translate-y-3 -z-10 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform duration-500" />
              <div className="aspect-[4/5] bg-stone-900 rounded-[48px] overflow-hidden shadow-2xl relative">
                <img 
                  src="/sunny1.png" 
                  alt="Sunny Rodgers" 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-0 ${avatarLoaded && !avatarError ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setAvatarLoaded(true)}
                  onError={() => setAvatarError(true)}
                  referrerPolicy="no-referrer"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 z-10" />
                
                {/* Fallback Graphic Pattern representing human development & EQ loops */}
                {(!avatarLoaded || avatarError) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#104C64] to-teal-950 p-6 z-0">
                    {/* Glowing circles overlapping */}
                    <div className="relative w-36 h-36">
                      <div className="absolute top-0 left-0 w-28 h-28 rounded-full border border-white/10 mix-blend-screen scale-110 animate-pulse duration-[6s]" />
                      <div className="absolute bottom-0 right-0 w-28 h-28 rounded-full border border-teal-400/10 mix-blend-screen scale-95 animate-pulse duration-[4s]" />
                      <div className="absolute inset-0 m-auto w-18 h-18 rounded-full bg-[#41B1C2]/10 backdrop-blur-sm flex items-center justify-center border border-[#41B1C2]/30">
                        <span className="text-white font-black text-2xl italic tracking-widest">SR</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <div className="w-10 h-1 bg-[#41B1C2] mx-auto rounded-full mb-3" />
                      <span className="text-[10px] font-black uppercase text-white/50 tracking-[0.4em] block">BeyondEQ Founder</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Narrational Copy */}
            <div className="space-y-10 lg:col-span-8">
              <div className="space-y-4">
                <span className="text-xs font-black text-[#104C64] uppercase tracking-[0.5em] flex items-center gap-2">
                  <span className="w-6 h-[1.5px] bg-[#104C64]" /> Founder & CEO
                </span>
                <h3 className="text-4xl md:text-6xl font-black text-stone-900 leading-none uppercase italic tracking-tighter">
                  Sunny Rodgers
                </h3>
                <p className="text-xs font-black text-[#41B1C2] uppercase tracking-[0.4em]">
                  BeyondEQ 3.0 Master Coach
                </p>
              </div>
              
              <div className="space-y-6 text-lg text-stone-600 font-normal leading-relaxed italic border-l-2 border-stone-200 pl-6">
                <p>
                  Sunny Rodgers is a visionary leader with over 20 years of experience in human behavior and performance optimization. He has redefined how organisations understand and apply emotional intelligence.
                </p>
                <p className="not-italic text-stone-900 font-medium">
                  Creator of the <span className="text-[#104C64] font-black border-b border-[#41B1C2]/40">HumanEdge 3.0 Model</span>, his work focuses on applying Emotional Intelligence as a tool for success.
                </p>
              </div>

              <div className="pt-8 border-t border-stone-200/60">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Recognitions & Accolades</p>
                <div className="flex flex-wrap gap-3">
                  {['Indian Achiever 2025', 'LinkedIn Voice 2025', 'Top Icon of India 2025'].map(award => (
                    <span 
                      key={award} 
                      className="px-5 py-2.5 bg-stone-900 hover:bg-[#104C64] text-white text-[8px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg transition-colors cursor-default"
                    >
                      {award}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Stats Bento Grid (Thin-bordered design cards with subtle background lighting) */}
        <section className="pt-12 pb-20 md:pt-16 md:pb-28 px-6 md:px-12 bg-[#104C64]/85 backdrop-blur-[2px] relative overflow-hidden pointer-events-auto" id="about-section-stats">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#41B1C2]/15 rounded-full blur-[110px] pointer-events-none" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-10 max-w-xl mx-auto">
              <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em] bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full mb-3 inline-block">
                Sustained Performance Metric
              </span>
              <h3 className="text-2xl text-white font-black italic tracking-tighter uppercase">Our Track Record.</h3>
              <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mt-1.5">A baseline of structured and measurable results</p>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="stats-bento-panels">
              {stats.map((s, i) => {
                const IconComp = s.icon;
                return (
                  <div 
                    key={i} 
                    className="bg-white/5 border border-white/10 rounded-[24px] p-6 transition-colors duration-300 relative overflow-hidden text-left select-none outline-none"
                  >
                    <div className="absolute top-[-10px] right-[-10px] w-20 h-20 bg-white/5 rounded-full blur-xl" />
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#41B1C2]">
                        <IconComp className="w-4 h-4" />
                      </div>
                    </div>
 
                    <div className="space-y-1.5">
                      <div className="text-3xl md:text-3xl font-black text-white italic tracking-tighter leading-none flex items-baseline gap-1">
                        {s.value}
                      </div>
                      <h4 className="text-[11px] font-black text-[#41B1C2] uppercase tracking-[0.2em]">{s.label}</h4>
                      <p className="text-white/55 text-[12.5px] font-medium leading-relaxed pt-1.5">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 7. Our Primary Beneficiaries */}
        <section className="pt-20 pb-10 md:pt-24 md:pb-12 px-6 md:px-12 bg-white/45 backdrop-blur-[2px] pointer-events-auto" id="about-section-audiences">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14 space-y-4">
              <span className="text-xs font-black text-[#104C64] uppercase tracking-[0.5em] bg-stone-50 border border-stone-200/60 px-5 py-2.5 rounded-full inline-block">
                Ecosystem of Success
              </span>
              <h3 className="text-4xl md:text-6xl font-black text-stone-900 italic uppercase tracking-tighter leading-none pt-2">
                Our Primary Beneficiaries.
              </h3>
              <p className="text-sm md:text-base text-stone-500 font-medium tracking-wide">
                — However, everybody needs EQ —
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="audiences-deck-grid">
              {[
                { 
                  title: 'Corporates', 
                  body: 'Enabling adaptive leadership and team performance.', 
                  metric: 'Enterprise',
                  bg: 'bg-stone-50 border-stone-200 hover:bg-[#104C64] hover:border-[#104C64]', 
                  titleColor: 'text-[#104C64] group-hover:text-white',
                  bodyColor: 'text-stone-600 group-hover:text-white/85',
                  metricColor: 'text-stone-400 group-hover:text-white/60',
                  numberColor: 'text-stone-300 group-hover:text-white/40',
                  arrowColor: 'text-[#41B1C2] group-hover:text-white',
                  footerColor: 'text-stone-400 group-hover:text-white/70'
                },
                { 
                  title: 'Govt Bodies', 
                  body: 'Driving higher performance and productive cultures.', 
                  metric: 'Nationwide',
                  bg: 'bg-stone-50 border-stone-200 hover:bg-[#41B1C2] hover:border-[#41B1C2]', 
                  titleColor: 'text-[#104C64] group-hover:text-stone-950',
                  bodyColor: 'text-stone-600 group-hover:text-stone-900/90',
                  metricColor: 'text-stone-400 group-hover:text-stone-900/60',
                  numberColor: 'text-stone-300 group-hover:text-stone-900/40',
                  arrowColor: 'text-[#104C64] group-hover:text-stone-950',
                  footerColor: 'text-stone-400 group-hover:text-stone-900/70'
                },
                { 
                  title: 'NGO Partners', 
                  body: 'Enhancing stakeholder trust and team resilience.', 
                  metric: 'Community',
                  bg: 'bg-stone-50 border-stone-200 hover:bg-[#104C64] hover:border-[#104C64]', 
                  titleColor: 'text-[#104C64] group-hover:text-white',
                  bodyColor: 'text-stone-600 group-hover:text-white/85',
                  metricColor: 'text-stone-400 group-hover:text-white/60',
                  numberColor: 'text-stone-300 group-hover:text-white/40',
                  arrowColor: 'text-[#41B1C2] group-hover:text-white',
                  footerColor: 'text-stone-400 group-hover:text-white/70'
                },
                { 
                  title: 'Education', 
                  body: 'Improving learning outcomes and stress management.', 
                  metric: 'Student Roots',
                  bg: 'bg-stone-50 border-stone-200 hover:bg-[#41B1C2] hover:border-[#41B1C2]', 
                  titleColor: 'text-[#104C64] group-hover:text-stone-950',
                  bodyColor: 'text-stone-600 group-hover:text-stone-900/90',
                  metricColor: 'text-stone-400 group-hover:text-stone-900/60',
                  numberColor: 'text-stone-300 group-hover:text-stone-900/40',
                  arrowColor: 'text-[#104C64] group-hover:text-stone-950',
                  footerColor: 'text-stone-400 group-hover:text-stone-900/70'
                },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={`p-10 rounded-[45px] border shadow-lg shadow-stone-200/30 hover:shadow-2xl hover:shadow-stone-900/[0.08] hover:-translate-y-2 transition-all duration-305 flex flex-col justify-between group ${item.bg}`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-8">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${item.metricColor}`}>{item.metric}</span>
                      <span className={`text-[14px] font-bold ${item.numberColor}`}>0{i+1}</span>
                    </div>
                    <h4 className={`text-2xl font-black italic uppercase tracking-tight mb-4 transition-colors ${item.titleColor}`}>
                      {item.title}
                    </h4>
                    <p className={`font-medium italic text-sm leading-relaxed transition-colors ${item.bodyColor}`}>
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* 9. Voices of Impact (Testimonials and reviews editorial block) */}
        <section className="pt-2 pb-6 md:pt-4 md:pb-8 px-6 md:px-12 bg-white/45 backdrop-blur-[2px] pointer-events-auto" id="about-section-testimonials">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 space-y-4">
              <span className="text-xs font-black text-[#104C64] uppercase tracking-[0.6em] bg-stone-50 border border-stone-200/60 px-5 py-2 rounded-full inline-block">
                Validating Growth
              </span>
              <h3 className="text-3xl md:text-5xl font-black text-stone-900 italic uppercase tracking-tighter pt-2">
                Voices of Impact.
              </h3>
            </div>

            <div className="relative max-w-4xl mx-auto" id="testimonials-dynamic-waterfall">
              <div className="overflow-hidden p-1.5 rounded-[40px] bg-white border border-stone-200/40 shadow-xl shadow-stone-900/[0.04]">
                <div 
                  className="flex transition-transform duration-500 ease-in-out" 
                  style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                >
                  {[
                    { q: "Being a young person, he displays far ahead of his matured understanding of human behaviour. His deep understanding of EI significantly enhanced our team dynamics.", a: "Ms. Pranati Patro, Govt. of Odisha" },
                    { q: "In just one and a half hours, he managed to create a profound impact on me. It has undoubtedly made a 100% positive impact on my life.", a: "Manish Purani, Employment & Training, Gujarat" },
                    { q: "The Beyond EQ team has been exceptional, delivering impactful training that has added immense value to our scholars.", a: "Avinash Khemka, Amulya Jeevan" },
                    { q: "The webinar was an eye-opener. The facilitator's approach was inclusive and insightful.", a: "Mohammed Shahid, Learning Links" },
                    { q: "The workshops helped me understand myself better. I feel empowered and confident.", a: "Zola Zareen, PwC" },
                    { q: "Sunny has skillfully facilitated an excellent workshop on how to use emotional intelligence in coaching.", a: "Salma Atiq, Piramal Foundation" },
                  ].map((t, idx) => (
                    <div key={idx} className="w-full shrink-0 px-6 py-8 md:py-10 md:px-12 flex flex-col justify-between min-h-[220px] relative select-none">
                      <div className="absolute top-6 right-10 w-10 h-10 rounded-full flex items-center justify-center opacity-10">
                        <Quote className="w-8 h-8 text-[#104C64]" />
                      </div>
                      
                      <p className="text-stone-700 font-medium italic leading-relaxed text-sm md:text-base text-center mb-6 max-w-2xl mx-auto relative z-10">
                        "{t.q}"
                      </p>
                      
                      <div className="text-[10px] md:text-xs font-black text-[#104C64] uppercase tracking-[0.2em] text-center border-t border-stone-200/40 pt-4 max-w-xs mx-auto w-full z-10">
                        {t.a}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mt-8 max-w-xs mx-auto">
                <button
                  onClick={() => setActiveIndex((prev) => (prev - 1 + 6) % 6)}
                  className="w-12 h-12 rounded-full border border-stone-200 hover:border-[#104C64] flex items-center justify-center text-stone-600 hover:text-[#104C64] transition-all bg-white hover:bg-stone-50 cursor-pointer shadow-sm active:scale-95"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Dots Indicators */}
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeIndex === idx ? 'w-6 bg-[#104C64]' : 'w-2 bg-stone-200 hover:bg-stone-300'
                      }`}
                      aria-label={`Go to testimonial ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setActiveIndex((prev) => (prev + 1) % 6)}
                  className="w-12 h-12 rounded-full border border-stone-200 hover:border-[#104C64] flex items-center justify-center text-stone-600 hover:text-[#104C64] transition-all bg-white hover:bg-stone-50 cursor-pointer shadow-sm active:scale-95"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 10. Join The Network (Spectacular Dark Teal CTA Card) */}
        <section className="pt-2 pb-12 px-6 md:px-12 bg-white/45 backdrop-blur-[2px] pointer-events-auto" id="about-section-cta">
          <div className="max-w-7xl mx-auto">
            <motion.div 
               whileHover={{ scale: 0.993 }}
               className="bg-[#104C64] py-12 px-8 sm:px-14 md:py-16 md:px-20 rounded-[48px] text-center relative overflow-hidden group shadow-2xl shadow-[#104C64]/25"
               id="join-network-mastercard"
            >
              {/* Complex backdrop design */}
              <div className="absolute inset-0 bg-[url('/hero.png')] opacity-[0.05] blur-[1px] scale-150 rotate-6 pointer-events-none" />
              <div className="absolute top-[-50%] left-[-20%] w-[600px] h-[600px] rounded-full bg-[#41B1C2]/15 blur-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-[6s]" />

              <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                <span className="text-[11px] font-black text-[#41B1C2] uppercase tracking-[0.5em] bg-white/5 border border-white/10 px-4 py-2 rounded-full inline-block italic">
                  The Global Network
                </span>
                
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white italic uppercase tracking-tighter leading-[0.95]">
                  Join Our <br />
                  <span className="text-[#41B1C2] underline decoration-white/20 underline-offset-4">Network.</span>
                </h2>
                
                <p className="text-sm md:text-base text-white/60 italic leading-relaxed max-w-xl mx-auto">
                  Are you an EI practitioner, trainer, or counsellor passionate about human development? Let's scale impact together.
                </p>
                
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <button 
                    onClick={() => { setShowTrainerForm(true); resetTrainerForm(); }}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-[#41B1C2] hover:bg-[#41B1C2]/90 text-white font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    Trainer's Program <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                  </button>
                  
                  <div className="text-center sm:text-left">
                    <span className="text-[8px] text-white/35 font-bold uppercase tracking-[0.3em] block">Direct Inquiry</span>
                    <a href="mailto:info@beyondeq.org" className="text-white hover:text-[#41B1C2] text-xs font-black uppercase tracking-wider transition-colors">
                      info@beyondeq.org
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

      </div>

      {/* Modern High-Fidelity Form Modal for the BeyondEQ 3.0 Trainers Program */}
      <AnimatePresence>
        {showTrainerForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-md pointer-events-auto overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl bg-stone-900 border border-stone-800/80 rounded-[32px] text-white shadow-2xl overflow-hidden my-4"
              id="trainer-program-form-container"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative light glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#41B1C2]/10 rounded-full blur-[90px] pointer-events-none" />
              <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-[#104C64]/20 rounded-full blur-[100px] pointer-events-none" />

              {/* Close Button */}
              <button 
                onClick={() => setShowTrainerForm(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-white transition-all hover:rotate-90 cursor-pointer z-20"
                aria-label="Close form"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 sm:p-10 max-h-[85vh] overflow-y-auto relative z-10 custom-scrollbar">
                
                {formSubmitStatus !== 'submitted' ? (
                  <form onSubmit={submitTrainerForm} className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.4em] italic">
                        BeyondEQ 3.0
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white leading-tight">
                        BeyondEQ 3.0 Trainer's Program
                      </h3>
                      <p className="text-xs sm:text-sm text-stone-400 italic">
                        Align with the next era of development. Empower individuals, teams, and schools with certified emotional intelligence methodology.
                      </p>
                    </div>

                    <div className="border-t border-stone-800/60 pt-6 space-y-5">
                      
                      {/* Name input */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={trainerFormData.fullName}
                          onChange={handleFormInputChange}
                          placeholder="e.g. Dr. Alana Sterling"
                          className={`w-full px-4 py-3 bg-stone-950/80 border ${formErrors.fullName ? 'border-red-500/80 focus:border-red-500' : 'border-stone-800 focus:border-[#41B1C2]'} text-stone-100 rounded-xl outline-none text-xs sm:text-sm transition-all focus:ring-1 focus:ring-[#41B1C2]/15`}
                        />
                        {formErrors.fullName && (
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{formErrors.fullName}</p>
                        )}
                      </div>

                      {/* Email Input */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={trainerFormData.email}
                          onChange={handleFormInputChange}
                          placeholder="e.g. alana@practice.org"
                          className={`w-full px-4 py-3 bg-stone-950/80 border ${formErrors.email ? 'border-red-500/80 focus:border-red-500' : 'border-stone-800 focus:border-[#41B1C2]'} text-stone-100 rounded-xl outline-none text-xs sm:text-sm transition-all focus:ring-1 focus:ring-[#41B1C2]/15`}
                        />
                        {formErrors.email && (
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{formErrors.email}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        
                        {/* Selector Role */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                            Professional Role
                          </label>
                          <select
                            name="role"
                            value={trainerFormData.role}
                            onChange={handleFormInputChange}
                            className="w-full px-4 py-3 bg-stone-950/80 border border-stone-800 focus:border-[#41B1C2] text-stone-200 rounded-xl outline-none text-xs sm:text-sm transition-all cursor-pointer"
                          >
                            <option value="Practitioner">EI Practitioner</option>
                            <option value="Counsellor">Psychotherapist/Counsellor</option>
                            <option value="Executive Coach">Executive/Business Coach</option>
                            <option value="Educator">Academic/School Leader</option>
                            <option value="NGO Catalyst">NGO/Community Activist</option>
                            <option value="Other">Other Specialist</option>
                          </select>
                        </div>

                        {/* Experience Selector */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                            Active Experience
                          </label>
                          <select
                            name="experience"
                            value={trainerFormData.experience}
                            onChange={handleFormInputChange}
                            className="w-full px-4 py-3 bg-stone-950/80 border border-stone-800 focus:border-[#41B1C2] text-stone-200 rounded-xl outline-none text-xs sm:text-sm transition-all cursor-pointer"
                          >
                            <option value="Under 2 years">Under 2 years</option>
                            <option value="2-5 years">2 to 5 years</option>
                            <option value="5-10 years">5 to 10 years</option>
                            <option value="10+ years">10+ active years</option>
                          </select>
                        </div>

                      </div>

                      {/* Motivation Textarea */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                          Your Mission & Motivation
                        </label>
                        <textarea
                          name="motivation"
                          rows={3}
                          value={trainerFormData.motivation}
                          onChange={handleFormInputChange}
                          placeholder="How do you plan to scale the BeyondEQ 3.0 frameworks in your region or target market?"
                          className={`w-full px-4 py-3 bg-stone-950/80 border ${formErrors.motivation ? 'border-red-500/80 focus:border-red-500' : 'border-stone-800 focus:border-[#41B1C2]'} text-stone-100 rounded-xl outline-none text-xs sm:text-sm transition-all focus:ring-1 focus:ring-[#41B1C2]/15 resize-none`}
                        />
                        {formErrors.motivation && (
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{formErrors.motivation}</p>
                        )}
                      </div>

                      {/* Terms Acceptance Toggle */}
                      <div className="space-y-2">
                        <label className="inline-flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="agreed"
                            checked={trainerFormData.agreed}
                            onChange={handleCheckboxChange}
                            className={`mt-1 h-4 w-4 bg-stone-950 border ${formErrors.agreed ? 'border-red-500' : 'border-stone-800'} text-[#41B1C2] focus:ring-[#41B1C2]/20 rounded transition-all cursor-pointer`}
                          />
                          <span className="text-xs text-stone-400 leading-normal italic">
                            I verify that my clinical/professional background complies with national accreditation guidelines, and I agree to uphold BeyondEQ 3.0 quality standards.
                          </span>
                        </label>
                        {formErrors.agreed && (
                          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mt-1">{formErrors.agreed}</p>
                        )}
                      </div>

                    </div>

                    {/* Actions Row */}
                    <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-4 border-t border-stone-800/60">
                      <button
                        type="button"
                        onClick={() => setShowTrainerForm(false)}
                        className="w-full sm:w-auto px-6 py-3 bg-stone-800 hover:bg-stone-850 text-stone-300 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formSubmitStatus === 'submitting'}
                        className="w-full sm:w-auto px-8 py-3 bg-[#41B1C2] hover:bg-[#41B1C2]/90 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-xl shadow-lg transition-all hover:scale-103 cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        {formSubmitStatus === 'submitting' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Validating Application...
                          </>
                        ) : (
                          <>Submit Application</>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center space-y-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#41B1C2]/10 border border-[#41B1C2]/35 flex items-center justify-center mx-auto shadow-xl shadow-[#41B1C2]/5">
                      <CheckCircle2 className="w-8 h-8 text-[#41B1C2] animate-bounce" />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-2xl font-black italic uppercase tracking-tight text-white">
                        Application Transmitted
                      </h4>
                      <p className="text-sm text-stone-300 max-w-md mx-auto italic leading-relaxed">
                        Thank you, <span className="text-[#41B1C2] font-semibold not-italic">{trainerFormData.fullName}</span>. Your application to join the <span className="text-white font-semibold">BeyondEQ 3.0 Trainers Program</span> has been logged under verification badge <span className="font-mono text-xs text-[#41B1C2]">BEQ-30-{(1000 + Math.floor(Math.random() * 9000))}</span>.
                      </p>
                      <p className="text-xs text-stone-400 max-w-sm mx-auto italic leading-relaxed">
                        Our regional credentials committee reviews submittals weekly. An invitation will be dispatched to your address (<span className="text-stone-300">{trainerFormData.email}</span>) upon authorization.
                      </p>
                    </div>

                    <div className="pt-6 border-t border-stone-800/40">
                      <button
                        onClick={() => {
                          setShowTrainerForm(false);
                          resetTrainerForm();
                        }}
                        className="px-8 py-3 bg-[#41B1C2] hover:bg-[#41B1C2]/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
                      >
                        Return To Home
                      </button>
                    </div>
                  </motion.div>
                )}
                
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
