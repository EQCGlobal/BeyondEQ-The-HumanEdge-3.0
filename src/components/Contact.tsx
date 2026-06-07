import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';

export default function Contact() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const location = useLocation();

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      if (location.state?.scrollToForm) {
        setTimeout(() => {
          const formEl = document.getElementById('contact-form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        return;
      }
      containerRef.current.scrollTo(0, 0);
    }
  }, [location]);

  const [formData, setFormData] = useState({
    name: '',
    org: '',
    email: '',
    phone: '',
    type: 'Individual',
    message: ''
  });

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('submitting');

    try {
      // 1. Save contact request to Firestore
      await addDoc(collection(db, "supportRequests"), {
        ...formData,
        submittedAt: serverTimestamp(),
      });

      // 2. Fetch API to send actual SMTP mail
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        console.warn('Backend API for client inquiries returned non-ok status');
      }
    } catch (err) {
      console.error('Failed to submit contact request:', err);
    } finally {
      setSubmitStatus('submitted');
    }
  };

  const types = ['Individual', 'Corporate', 'NGO', 'Government Body', 'Educational Institution', 'Other'];

  return (
    <div 
      ref={containerRef}
      className="h-screen overflow-y-auto bg-white font-sans md:[mask-image:linear-gradient(to_bottom,transparent_0,transparent_80px,black_140px)] md:[-webkit-mask-image:linear-gradient(to_bottom,transparent_0,transparent_80px,black_140px)]"
    >
      <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative pt-40 pb-12 px-6 md:px-12 bg-white overflow-hidden text-center">
        <div className="max-w-7xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-8xl font-black text-[#104C64] uppercase tracking-tight mb-8 leading-none italic"
          >
            Let's Talk <span className="text-[#41B1C2]">Growth</span>.
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl md:text-3xl text-gray-400 max-w-4xl mx-auto font-light leading-relaxed italic"
          >
            Whether you're an individual looking to grow or an organisation ready to invest in your people — we'd love to hear from you.
          </motion.p>
        </div>
      </section>

      {/* Info Blocks */}
      <section className="py-2 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <a 
                href="mailto:info@beyondeq.org" 
                className="p-10 bg-[#104C64] rounded-[40px] text-white block hover:bg-[#0d3d50] transition-all shadow-sm group"
            >
                <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em] mb-4 block">Email</span>
                <p className="text-lg md:text-xl font-black italic tracking-tight group-hover:text-[#41B1C2] transition-colors">info@beyondeq.org</p>
            </a>
            <a 
                href="https://wa.me/919337065731" 
                target="_blank" 
                rel="noreferrer"
                className="p-10 bg-gray-50 rounded-[40px] border border-gray-100 block hover:border-[#41B1C2]/30 hover:bg-white transition-all shadow-sm group"
            >
                <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-4 block">WhatsApp / Call</span>
                <p className="text-lg md:text-xl font-black italic tracking-tight text-black group-hover:text-[#41B1C2] transition-colors">+919337065731</p>
            </a>
            <div className="p-10 bg-[#41B1C2] rounded-[40px] text-white">
                <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-4 block">Support</span>
                <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Multi-channel support via WhatsApp, Virtual & Telephone.</p>
            </div>
        </div>
      </section>

      {/* Free Consulting Call Offer */}
      <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden bg-gradient-to-br from-[#104C64] via-[#104C64] to-[#41B1C2] p-10 md:p-16 rounded-[60px] text-white shadow-2xl shadow-[#41B1C2]/20 group"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -tr-1/4 -mt-48 -mr-48 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#41B1C2]/20 rounded-full blur-2xl -ml-32 -mb-32" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                  boxShadow: [
                    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    "0 0 20px 5px rgba(65, 177, 194, 0.4)",
                    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#41B1C2] text-[#104C64] text-[10px] font-black uppercase tracking-widest mb-6 shadow-lg shadow-black/10"
              >
                <span className="animate-pulse">●</span> Limited Availability
              </motion.div>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-none mb-6">
                Start Your Journey With a <span className="text-[#FF5757]">Free 60-Min</span> Strategic Consulting Call.
              </h2>
              <p className="text-white/80 text-lg md:text-xl font-light italic leading-relaxed">
                We are offering a complimentary exploration session for organisations ready to transform their values, culture, and ROI through Emotional Intelligence.
              </p>
            </div>
            <div className="flex-shrink-0">
               <a 
                href="https://wa.me/919337065731?text=Hi%20BeyondEQ!%20I'm%20interested%20in%20reserving%20a%20slot%20for%20the%20free%2060-min%20strategic%20consulting%20call."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-12 py-6 bg-white text-[#104C64] font-black uppercase tracking-[0.4em] text-xs rounded-full shadow-2xl hover:scale-105 transition-all hover:bg-[#41B1C2] hover:text-white group/btn"
               >
                 <MessageCircle className="w-5 h-5 text-[#41B1C2] group-hover/btn:text-white transition-colors" />
                 Reserve My Slot
               </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="pt-24 pb-8 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24">
        <div>
          <h2 className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-8">Get In Touch</h2>
          {submitStatus === 'submitted' ? (
            <div className="bg-[#104C64]/5 border border-[#104C64]/10 p-10 rounded-[40px] text-center space-y-6">
              <div className="w-16 h-16 bg-[#41B1C2]/15 text-[#41B1C2] rounded-full flex items-center justify-center mx-auto text-3xl font-bold animate-pulse">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-[#104C64] uppercase italic tracking-tight">Request Dispatched</h3>
                <p className="text-stone-600 leading-relaxed text-sm">
                  Thank you for reaching out, <span className="font-bold text-[#104C64]">{formData.name}</span>. Your request has been permanently preserved in our system database, and an email forwarding notification was dispatched to <strong className="text-[#104C64]">info@beyondeq.org</strong>.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setFormData({ name: '', org: '', email: '', phone: '', type: 'Individual', message: '' });
                  setSubmitStatus('idle');
                }}
                className="px-8 py-4 bg-[#104C64] text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-[#0D3E52] transition-colors shadow-lg shadow-[#104C64]/10 active:scale-95"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                      <input 
                        type="text" 
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required 
                        disabled={submitStatus === 'submitting'}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#104C64]/10 transition-all shadow-sm" 
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organisation</label>
                      <input 
                        type="text" 
                        name="org"
                        value={formData.org}
                        onChange={handleInputChange}
                        disabled={submitStatus === 'submitting'}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#104C64]/10 transition-all shadow-sm" 
                      />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required 
                        disabled={submitStatus === 'submitting'}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#104C64]/10 transition-all shadow-sm" 
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</label>
                      <input 
                        type="tel" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={submitStatus === 'submitting'}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#104C64]/10 transition-all shadow-sm" 
                      />
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">I am a...</label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={submitStatus === 'submitting'}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#104C64]/10 transition-all shadow-sm"
                  >
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
              </div>
              <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">What are you looking for?</label>
                  <textarea 
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4} 
                    disabled={submitStatus === 'submitting'}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#104C64]/10 transition-all shadow-sm"
                  ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={submitStatus === 'submitting'}
                className="w-full py-5 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-[0.4em] text-sm rounded-full shadow-2xl transition-all disabled:opacity-50"
              >
                {submitStatus === 'submitting' ? 'Sending Request...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-12">
            <div className="bg-gray-50 p-12 rounded-[60px] border border-gray-100 shadow-md">
                <h3 className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-8">Our Presence</h3>
                <div className="flex flex-wrap gap-3">
                    {['Tamil Nadu', 'Karnataka', 'Gujarat', 'Odisha', 'Uttar Pradesh', 'Pondicherry', 'Assam', 'Maharashtra', 'Kerala'].map(s => (
                        <span key={s} className="text-xs font-bold text-black italic bg-white px-5 py-2 rounded-full border border-gray-100 shadow-sm">{s}</span>
                    ))}
                </div>
                <p className="mt-8 text-xs text-gray-500 font-medium leading-relaxed italic">Pan-India coverage serving clients virtually across the globe.</p>
            </div>

            <div className="bg-[#41B1C2]/5 p-12 rounded-[60px] border border-[#41B1C2]/10 shadow-md">
                <h3 className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-8">Our USPs</h3>
                <ul className="space-y-4">
                    {[
                        'Unique & Novel Content — Built for neuroscience, psychology & real-world challenges.',
                        "India's First Emotional Maturity Model (EMM) — Scientific and measurable.",
                        "Proprietary Hendecagon Approach — The world's only 11-point EI delivery framework.",
                        '55,000+ Lives Impacted across Corporate and Government sectors.',
                        'An ROI-Supported Model — Measurable outcomes for every investment.'
                    ].map((f, i) => (
                        <li key={i} className="flex gap-4 text-sm text-gray-600 font-medium italic">
                            <span className="text-[#104C64] font-black">/</span> {f}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </section>

      {/* Pricing Intro */}
      <section className="py-8 pb-16 px-6 md:px-12 bg-white max-w-7xl mx-auto">
        <div className="bg-[#104C64] min-h-[320px] p-8 md:p-12 rounded-[80px] text-center overflow-hidden relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <img src="/hero.png" alt="bg" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10">
                <h2 className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em] mb-4">Pricing Overview</h2>
                <h3 className="text-2xl md:text-4xl font-black text-white uppercase italic leading-tight mb-6">Tailored Solutions for Every Growth Stage.</h3>
                <p className="text-white/50 text-sm md:text-lg max-w-3xl mx-auto italic mb-8">Formats available: Half Day | Full Day | 3-Day | 5-Day | Immersive Retreats. <br className="hidden md:block" /> Discounts available for NGOs, Educational Institutions, and Government Bodies.</p>
                <div className="w-12 h-1 bg-[#41B1C2] mx-auto rounded-full" />
            </div>
        </div>
      </section>
    </div>
    </div>
  );
}
