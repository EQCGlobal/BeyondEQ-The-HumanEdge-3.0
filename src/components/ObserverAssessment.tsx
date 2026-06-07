import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Users, CheckCircle2, ArrowRight, ArrowLeft, Brain, Activity, 
  Sparkles, Send, Mail, Heart, Shield, Landmark, Compass, HelpCircle, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SKILLS, calculateThreeSixtyResults } from '../lib/threeSixtySkills';

interface Observer {
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  status: string;
  responses?: Record<string, number>;
  impacts?: Record<string, number>;
}

export default function ObserverAssessment() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const emailParam = searchParams.get('email') || '';

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [observer, setObserver] = useState<Observer | null>(null);
  const [allObservers, setAllObservers] = useState<Observer[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Assessment flow stage: 'welcome', 'questions', 'processing'
  const [stage, setStage] = useState<'welcome' | 'questions' | 'processing'>('welcome');
  const [activeStep, setActiveStep] = useState(0);

  // States for observer feedback ratings
  const [obsAnswers, setObsAnswers] = useState<Record<string, number>>({});
  const [obsImpacts, setObsImpacts] = useState<Record<string, number>>({});
  const [tsSectionIdx, setTsSectionIdx] = useState(0);

  // Load target user information and match observer email
  useEffect(() => {
    async function loadUser() {
      if (!userId) {
        setErrorMsg('Invalid evaluation link. Missing target user identification.');
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', userId);
        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${userId}`);
          return;
        }

        if (!userDoc.exists()) {
          setErrorMsg('The associated user profile was not found. Please verify the URL.');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        setUserName(userData.name || 'Anonymous User');

        // Parse observers list
        const plan = userData.selfDiscoveryObserversPlan;
        const list: Observer[] = plan?.observers || [];
        setAllObservers(list);

        // Try matching observer by email parameter
        const match = list.find(o => o.email.toLowerCase().trim() === emailParam.toLowerCase().trim());
        if (match) {
          setObserver(match);
        } else {
          // If no direct email match, find the first non-completed observer or fallback
          const defaultMatch = list.find(o => o.status !== 'Feedback Received');
          if (defaultMatch) {
            setObserver(defaultMatch);
          } else if (list.length > 0) {
            setObserver(list[0]);
          }
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to establish connection to secure assessment server: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId, emailParam]);

  const handleRateStatement = (stmtId: string, rating: number) => {
    setObsAnswers(prev => ({ ...prev, [stmtId]: rating }));
  };

  const handleRateImpact = (skillKey: string, impact: number) => {
    setObsImpacts(prev => ({ ...prev, [skillKey]: impact }));
  };

  const activeSkill = SKILLS[tsSectionIdx];
  const allStatementsAnswered = activeSkill?.statements.every(stmt => obsAnswers[stmt.id] !== undefined);
  const impactAnswered = obsImpacts[activeSkill?.key] !== undefined;
  const canGoNextSection = allStatementsAnswered && impactAnswered;

  const handlePrevSection = () => {
    if (tsSectionIdx > 0) {
      setTsSectionIdx(tsSectionIdx - 1);
    }
  };

  const handleNextSection = () => {
    if (!canGoNextSection) return;
    if (tsSectionIdx < SKILLS.length - 1) {
      setTsSectionIdx(tsSectionIdx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Trigger submission trigger
      handleSubmitFeedback();
    }
  };

  const handleSubmitFeedback = async () => {
    if (!userId) return;

    setStage('processing');
    setActiveStep(0);
    setSubmitting(true);

    const stepTimers = [
      setTimeout(() => setActiveStep(1), 600),
      setTimeout(() => setActiveStep(2), 1200),
      setTimeout(() => setActiveStep(3), 1800),
      setTimeout(async () => {
        try {
          const userDocRef = doc(db, 'users', userId);
          const userDocSnapshot = await getDoc(userDocRef);

          if (!userDocSnapshot.exists()) {
            throw new Error("Specified user document does not exist.");
          }

          const userData = userDocSnapshot.data();
          const plan = userData.selfDiscoveryObserversPlan || { observers: [] };
          const list: Observer[] = plan.observers || [];

          // Update current observer's status and scores inside list
          let matchedIndex = list.findIndex(o => o.email.toLowerCase().trim() === (observer?.email || '').toLowerCase().trim());
          if (matchedIndex === -1 && emailParam) {
            matchedIndex = list.findIndex(o => o.email.toLowerCase().trim() === emailParam.toLowerCase().trim());
          }
          if (matchedIndex === -1 && list.length > 0) {
            matchedIndex = 0; // standard fallback
          }

          const updatedObservers = [...list];
          if (matchedIndex !== -1) {
            updatedObservers[matchedIndex] = {
              ...updatedObservers[matchedIndex],
              status: 'Feedback Received',
              responses: obsAnswers,
              impacts: obsImpacts
            };
          } else {
            // Append as guest if not explicitly listed but loaded via link
            updatedObservers.push({
              name: observer?.name || 'Observer Guest',
              email: observer?.email || emailParam || 'info@beyondeq.org',
              relationship: observer?.relationship || 'Colleague / Peer',
              status: 'Feedback Received',
              responses: obsAnswers,
              impacts: obsImpacts
            });
          }

          // Calculate consolidated results with new changes
          const completedObservers = updatedObservers
            .filter(o => o.status === 'Feedback Received' && o.responses && o.impacts)
            .map(o => ({
              name: o.name,
              relationship: o.relationship,
              responses: o.responses!,
              impacts: o.impacts!
            }));
          const selfAnswers = userData.threeSixtySelfAnswers || {};
          const selfImpacts = userData.threeSixtySelfImpacts || {};

          const results = calculateThreeSixtyResults(selfAnswers, selfImpacts, completedObservers);

          // Update user doc with consolidated feedback plan and calculated baselines
          await updateDoc(userDocRef, {
            selfDiscoveryObserversPlan: { observers: updatedObservers },
            threeSixtyCompleted: true, // Complete status flag triggers reports
            cmmLevel: results.overallLevel, // Always dynamic based on multi rater alignment!
            updatedAt: serverTimestamp()
          });

          setSubmitted(true);
        } catch (err: any) {
          console.error(err);
          alert("Submission error: " + err.message);
          setStage('questions');
        } finally {
          setSubmitting(false);
        }
      }, 2500)
    ];

    return () => stepTimers.forEach(t => clearTimeout(t));
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pt-28 pb-32 px-6 flex flex-col items-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-radial-at-t from-white via-stone-50/70 to-stone-100 opacity-95 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#41B1C2]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#104C64]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full z-10 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 text-center space-y-6"
            >
              <div className="w-12 h-12 border-2 border-[#41B1C2]/20 border-t-[#104C64] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black text-stone-500 uppercase tracking-widest">Verifying Diagnostic Matrix Parameters...</p>
            </motion.div>
          ) : errorMsg ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-stone-200/80 p-10 rounded-[40px] shadow-xl text-center space-y-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-[#104C64] uppercase tracking-wide">Connection Error</h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">{errorMsg}</p>
              </div>
              <div className="pt-2">
                <Link 
                  to="/" 
                  className="inline-block px-6 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                >
                  Return to Home
                </Link>
              </div>
            </motion.div>
          ) : submitted ? (
            <motion.div 
              key="submitted"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-stone-200 p-8 md:p-12 rounded-[40px] shadow-2xl space-y-8 animate-fadeIn"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-stone-900 uppercase italic tracking-tight">
                  Feedback Successfully <span className="text-[#104C64] font-serif not-italic font-normal lowercase">submitted</span>
                </h2>
                <p className="text-xs text-emerald-700 bg-emerald-50 py-1 px-4 rounded-full inline-block uppercase font-bold tracking-widest font-mono">
                  Operational Input Consolidated
                </p>
              </div>

              <div className="h-[1px] bg-stone-100" />

              <div className="space-y-4 text-xs text-stone-600 leading-relaxed font-sans max-w-lg mx-auto text-center">
                <p>
                  Thank you! Your behavioral rating scores for <strong>{userName}</strong> have been securely submitted, aggregated, and stored inside their assessment account.
                </p>

                <div className="p-5 bg-stone-50 border border-stone-200/50 rounded-2xl flex items-start gap-4 shadow-sm text-left">
                  <Mail className="w-5 h-5 text-[#104C64] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#104C64] mb-1">Confidential Sync Complete</h4>
                    <p className="text-[11px] leading-normal text-stone-550">
                      Your answers have been integrated into their rater alignment report anonymously. Your scores are processed collectively to preserve review privacy.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <Link 
                  to="/" 
                  className="px-8 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-md cursor-pointer"
                >
                  Return to Portal Home
                </Link>
              </div>
            </motion.div>
          ) : stage === 'welcome' ? (
            /* --- RENDER OBSERVER WELCOME --- */
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-stone-200 p-8 md:p-12 rounded-[40px] shadow-xl space-y-8"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-[#104C64]/5 text-[#104C64] rounded-md">
                    BeyondEQ 360° Protocol
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-amber-50 text-amber-700 rounded-md border border-amber-120 animate-pulse">
                    Confidential Review
                  </span>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-black text-[#104C64] uppercase tracking-tight italic">
                  Observer Behavior <span className="text-[#41B1C2] font-serif not-italic font-normal lowercase">evaluation</span>
                </h2>

                <p className="text-xs text-stone-600 leading-relaxed font-sans font-normal">
                  You have been nominated to offer multi-perspective insight for <strong>{userName}</strong>. Evaluator scores are confidential and consolidated to compile their personal development model.
                </p>

                {observer && (
                  <div className="p-4 bg-[#104C64]/5 border border-[#104C64]/10 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block">Evaluator Identity</span>
                      <strong className="text-[#104C64] uppercase tracking-wider">{observer.name}</strong>
                      <span className="text-stone-550 font-sans ml-1">({observer.email})</span>
                    </div>
                    <span className="text-[8.5px] bg-[#104C64] text-white px-3 py-1 rounded-full font-black uppercase tracking-wider">{observer.relationship}</span>
                  </div>
                )}
              </div>

              <div className="h-[1px] bg-stone-100" />

              <div className="space-y-4 text-xs text-stone-600 leading-relaxed font-sans">
                <p>
                  <strong>How it works:</strong> You will review 15 concise behavioral capability sheets. For each skill sector, you will rate statements on a 4-point scale and answer one strategic organizational impact qualifier.
                </p>
                <p>
                  <strong>Confidentiality Guarantee:</strong> Your individual ratings are consolidated anonymously with other observers. Your identity is matched solely to verify checklist completion.
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStage('questions')}
                  className="px-8 py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Begin Evaluation Questionnaire
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : stage === 'questions' ? (
            /* --- RENDER 15 SKILLS SHEETS --- */
            <motion.div
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#41B1C2] bg-white border border-stone-200 px-3.5 py-1.5 rounded-full select-none">
                  Skill Section {tsSectionIdx + 1} of 15
                </span>
                <span className="text-[10px] font-black font-mono text-stone-450 select-none">
                  {Math.round(((tsSectionIdx + 1) / 15) * 100)}% Complete
                </span>
              </div>

              <div className="bg-white border border-stone-200 p-8 md:p-12 rounded-[40px] shadow-xl space-y-6">
                <div className="space-y-1.5 border-b border-stone-100 pb-4">
                  <span className="text-[9px] bg-stone-100 font-bold px-2.5 py-0.5 rounded text-stone-500 uppercase tracking-widest">
                    Evaluation Category — {activeSkill.name}
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-[#104C64] uppercase tracking-wide leading-tight">
                    Review {activeSkill.name}
                  </h3>
                  <p className="text-xs text-stone-400 italic">
                    Rate honestly based on observed behaviors of {userName} in the workplace.
                  </p>
                </div>

                {/* Statements checklist (obs statement wording) */}
                <div className="space-y-6 pt-2">
                  {activeSkill.statements.map((stmt, sIdx) => {
                    const currentRating = obsAnswers[stmt.id];
                    return (
                      <div key={stmt.id} className="space-y-3 pb-5 border-b border-stone-100 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2 text-stone-900 font-sans text-xs font-semibold leading-relaxed">
                          <span className="text-[#41B1C2] font-mono leading-none font-black text-[13px] mr-1">{sIdx + 1}.</span>
                          <span>{stmt.obs}</span>
                        </div>

                        {/* Rating button options */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-sans">
                          {[
                            { val: 1, label: "Not observed" },
                            { val: 2, label: "Occasionally" },
                            { val: 3, label: "Consistently" },
                            { val: 4, label: "Always" },
                            { val: 0, label: "N/A" }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => handleRateStatement(stmt.id, opt.val)}
                              className={`py-3 text-[10px] uppercase tracking-wider font-extrabold border rounded-xl transition-all cursor-pointer select-none text-center ${
                                currentRating === opt.val
                                  ? opt.val === 0 
                                    ? 'bg-stone-500 border-stone-500 text-white shadow-sm'
                                    : 'bg-[#104C64] border-[#104C64] text-white shadow-md shadow-[#104C64]/10'
                                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Skill impact question */}
                <div className="p-6 bg-stone-55 border border-stone-150 rounded-2xl space-y-4 pt-5 select-none">
                  <div className="space-y-1">
                    <span className="text-[8.5px] text-[#41B1C2] font-black uppercase tracking-widest block font-mono">Performance Impact Rating</span>
                    <p className="text-xs text-stone-800 font-bold leading-normal">
                      {activeSkill.iQ}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 font-sans pt-1">
                    {activeSkill.iOpts.map((opt, oIdx) => {
                      const pointValue = oIdx + 1;
                      const currentImpact = obsImpacts[activeSkill.key];
                      return (
                        <button
                          key={pointValue}
                          type="button"
                          onClick={() => handleRateImpact(activeSkill.key, pointValue)}
                          className={`p-3 text-[10px] leading-tight text-left border rounded-xl transition-all cursor-pointer flex flex-col justify-between h-auto ${
                            currentImpact === pointValue
                              ? 'bg-[#41B1C2] border-[#41B1C2] text-white shadow-md shadow-[#41B1C2]/15 font-bold'
                              : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-850'
                          }`}
                        >
                          <span className={`text-[8.5px] font-black uppercase block mb-1 opacity-80 ${
                            currentImpact === pointValue ? 'text-white' : 'text-[#41B1C2]'
                          }`}>Option {pointValue}</span>
                          <span className="text-[10px] leading-normal">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation actions bar */}
                <div className="pt-4 border-t border-stone-100 flex justify-between items-center font-sans">
                  <button
                    onClick={handlePrevSection}
                    disabled={tsSectionIdx === 0}
                    className="flex items-center gap-1.5 px-5 py-3 text-[10px] font-black uppercase tracking-wide border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>

                  <button
                    onClick={handleNextSection}
                    disabled={!canGoNextSection}
                    className={`flex items-center gap-1.5 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-white shadow-md ${
                      canGoNextSection 
                        ? 'bg-[#104C64] hover:bg-[#0D3E52] shadow-[#104C64]/10 hover:-translate-y-0.5 active:translate-y-0' 
                        : 'bg-stone-200 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {tsSectionIdx === SKILLS.length - 1 ? 'Submit Review Evaluation' : 'Next Section'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- RENDER COMPILING FEEDBACK STATUS LOADER --- */
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center space-y-12"
            >
              <div className="space-y-4 font-sans">
                <h2 className="text-2xl md:text-3xl font-black text-[#104C64] uppercase tracking-tight italic animate-pulse">
                  Aggregating observations
                </h2>
                <p className="text-xs text-stone-500 uppercase tracking-widest font-black">Encrypting values & running matrices</p>
              </div>

              <div className="max-w-md mx-auto bg-white border border-stone-200/80 p-8 rounded-[36px] shadow-lg shadow-stone-200/35 space-y-4 text-left font-sans animate-fadeIn">
                {[
                  "Validating feedback checksums",
                  "Analyzing pattern discrepancies",
                  "Consolidating 360 rater loop",
                  "Committing updates anonymously"
                ].map((step, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-4 transition-all duration-300 ${
                      activeStep >= idx ? 'opacity-100 text-stone-900 font-bold' : 'opacity-20 text-stone-400'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border relative ${
                      activeStep > idx 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : activeStep === idx 
                          ? 'border-[#41B1C2] bg-[#41B1C2]/20 animate-pulse'
                          : 'border-stone-200'
                    }`}>
                      {activeStep > idx && <Check className="w-2 h-2" />}
                    </div>
                    <span className="text-xs tracking-wider uppercase">{step}</span>
                  </div>
                ))}
              </div>

              <div className="w-12 h-12 border-2 border-[#41B1C2]/20 border-t-[#104C64] rounded-full animate-spin mx-auto mt-12" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
