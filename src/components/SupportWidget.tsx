import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LifeBuoy, X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function SupportWidget() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('bug_report');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // The widget is only accessible POST user login as requested
  if (!user) return null;

  // Sync profile/auth email & name defaults when modal is opened
  const handleOpen = () => {
    setName(profile?.name || user.displayName || '');
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSubmitStatus('idle');
    setMessage('');
    setErrorMessage('');
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'bug_report': return 'Report a Bug';
      case 'technical_issue': return 'Technical Issue';
      case 'account_billing': return 'Account / Billing';
      case 'enterprise_seats': return 'Corporate Seats / Onboarding';
      case 'general_feedback': return 'General Feedback';
      default: return 'Other Need';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !name.trim()) return;

    setSubmitStatus('submitting');
    setErrorMessage('');

    const payload = {
      name: name,
      org: profile?.company || "Individual User Profile",
      email: user.email || "anonymous-user@beyondeq.org",
      phone: profile?.phone || "N/A",
      type: `AppSupport: ${getCategoryLabel(category)}`,
      message: message,
      userId: user.uid,
      category: category,
    };

    try {
      // 1. Stash support request ticket in Firestore collection
      await addDoc(collection(db, "supportRequests"), {
        ...payload,
        submittedAt: serverTimestamp(),
      });
    } catch (dbErr: any) {
      console.error("Failed to persist support ticket inside Firestore:", dbErr);
      try {
        handleFirestoreError(dbErr, OperationType.CREATE, "supportRequests");
      } catch (formattedErr: any) {
        setErrorMessage("Database synchronization error encountered. Our team is investigating.");
        setSubmitStatus('error');
        return;
      }
    }

    try {
      // 2. Dispatch SMTP email alert via identical API mechanism in server.ts
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn('SMTP Relay server returned non-ok status for internal support alert');
      }
    } catch (netErr: any) {
      console.error("Failed to forward SMTP alert to support team:", netErr);
      // We don't fail the whole user flow if SMTP was down since database copy succeeded!
    }

    setSubmitStatus('submitted');
  };

  return (
    <>
      {/* Floating Support Button Trigger */}
      <motion.button
        id="floating-support-btn"
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.6, ease: "easeOut" }}
        onClick={handleOpen}
        className={`fixed z-40 border border-white/15 cursor-pointer font-extrabold uppercase rounded-full bg-[#104C64] text-white hover:bg-[#0D3E52] hover:shadow-[0_8px_30px_rgba(65,177,194,0.4)] active:scale-95 transition-all duration-300 ${
          isDashboard
            ? 'flex items-center justify-center top-4 right-4 p-2.5 shadow-[0_4px_12px_rgba(16,76,100,0.25)] md:top-auto md:bottom-8 md:right-8 md:px-5 md:py-3.5 md:text-[10px] md:tracking-[0.2em] md:gap-2 md:shadow-[0_6px_20px_rgba(16,76,100,0.3)]'
            : 'hidden md:flex md:items-center md:justify-center md:bottom-8 md:right-8 md:px-5 md:py-3.5 md:text-[10px] md:tracking-[0.2em] md:gap-2 md:shadow-[0_6px_20px_rgba(16,76,100,0.3)]'
        }`}
      >
        <LifeBuoy className="w-4 h-4 md:w-4 md:h-4 text-[#41B1C2] animate-spin-slow stroke-[2.5]" />
        <span className="hidden md:inline">Support</span>
      </motion.button>

      {/* Support Dialog Modal Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white rounded-[32px] md:rounded-[40px] border border-stone-100 shadow-2xl max-w-lg w-full relative overflow-hidden"
            >
              {/* Corner decorative glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#41B1C2]/10 rounded-full blur-2xl -tr-1/4" />
              
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-full transition-all z-10 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="p-8 md:p-10">
                {submitStatus === 'submitted' ? (
                  // Success Mode View
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6 space-y-6"
                  >
                    <div className="w-16 h-16 bg-[#41B1C2]/15 text-[#41B1C2] rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black text-[#104C64] uppercase italic tracking-tight">
                        Ticket Registered
                      </h3>
                      <p className="text-stone-600 text-sm leading-relaxed">
                        Thank you, <strong className="text-[#104C64]">{name}</strong>. Your inquiry has been securely stored in our diagnostic database and a notification was dispatched directly to the BeyondEQ systems.
                      </p>
                      <p className="text-stone-400 text-xs italic">
                        Our engineering team typically reviews core dashboard tickets within 2 to 4 business hours.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-8 py-3.5 bg-[#104C64] text-white hover:bg-[#0D3E52] text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-colors duration-200 outline-none w-full md:w-auto"
                    >
                      Acknowledge & Close
                    </button>
                  </motion.div>
                ) : (
                  // Form Submission View
                  <div className="space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#104C64]/5 border border-[#104C64]/10 text-[#104C64] text-[9px] font-black uppercase tracking-widest rounded-full mb-3">
                        <span className="w-1.5 h-1.5 bg-[#41B1C2] rounded-full animate-ping" />
                        BeyondEQ Support Portal
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black text-[#104C64] uppercase italic tracking-tight leading-none">
                        How can we assist?
                      </h2>
                      <p className="text-gray-400 text-xs mt-2 italic">
                        Report platform issues, request scoring recalculations, or seek assistance from our development team.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {errorMessage && (
                        <div className="flex gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs items-start leading-relaxed">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 stroke-[2.5]" />
                          <p>{errorMessage}</p>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                          Select Inquiry Category
                        </label>
                        <select
                          name="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          disabled={submitStatus === 'submitting'}
                          className="w-full p-3.5 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#104C64]/10 text-stone-700 text-sm focus:outline-none transition-all cursor-pointer font-bold italic"
                        >
                          <option value="bug_report">Report a Bug / Platform Glitch</option>
                          <option value="technical_issue">Technical Issues (Access, PDFs, etc.)</option>
                          <option value="account_billing">Account Upgrades & Pricing</option>
                          <option value="enterprise_seats">Corporate Seat Allocation Help</option>
                          <option value="general_feedback">General Inquiry / Strategic Assistance</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={submitStatus === 'submitting'}
                            className="w-full p-3.5 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#104C64]/10 text-stone-800 text-sm focus:outline-none transition-all font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                            Registered Email (Secure)
                          </label>
                          <input
                            type="email"
                            disabled
                            value={user.email || ''}
                            className="w-full p-3.5 bg-stone-100/70 border-none rounded-xl text-stone-500 text-sm outline-none cursor-not-allowed font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                          Explain issues or report needs detail
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Please provide full details, including any diagnostic errors or feature requests..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          disabled={submitStatus === 'submitting'}
                          className="w-full p-3.5 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-[#104C64]/10 text-stone-800 text-sm focus:outline-none transition-all resize-none placeholder-stone-400/80 leading-relaxed font-medium"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={submitStatus === 'submitting' || !message.trim() || !name.trim()}
                          className="w-full py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#104C64]/10 cursor-pointer active:scale-95 duration-200"
                        >
                          {submitStatus === 'submitting' ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                              <span>Dispatching Ticket...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-[#41B1C2] stroke-[2.5]" />
                              <span>Submit Support Ticket</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
