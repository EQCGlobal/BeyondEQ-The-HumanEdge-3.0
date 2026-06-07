import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Compass, Shield, Award, Users, ArrowRight, ArrowLeft, RefreshCw, Check, Sparkles, 
  HelpCircle, Eye, AlertTriangle, Book, Send, CheckCircle, Plus, Trash2, ShieldAlert
} from 'lucide-react';
import { SKILLS, calculateThreeSixtyResults, EMM_THRESHOLDS } from '../lib/threeSixtySkills';

// Forced choice scenarios for standard Self-Discovery
const scenarios = [
  {
    badge: "Situation 1 of 8",
    context: "A colleague contradicts something you said in a meeting. They are wrong — and three people in the room know it. Your manager is present.",
    stem: "You have two options. Choose the one that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Correct them directly and clearly in the room now. The record needs to be set straight — especially with your manager present.",
        cost: "The colleague feels publicly embarrassed. The relationship takes a hit. You prioritise accuracy over harmony in this moment.",
        scores: { SR: 2, CN: 2, RA: 1, IP: 1 },
        tags: ["conflict", "status", "directness"]
      },
      {
        label: "Option B",
        text: "Let it go in the room. Address it privately afterward — protecting the relationship matters more than winning this moment.",
        cost: "Others in the room may read your silence as concession. Your manager leaves with an inaccurate picture. The record stays uncorrected.",
        scores: { SR: 3, RA: 3, CN: 3, IP: 2 },
        tags: ["conflict", "relationship", "patience"]
      }
    ],
    tags: ["conflict", "relationship", "patience"]
  },
  {
    badge: "Situation 2 of 8",
    context: "You have spotted a flaw in a plan your senior leader championed. Raising it now means being the person who publicly questions their judgment. Staying quiet means the flaw likely surfaces later — at which point you knew and said nothing.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Raise it now — privately, directly, before it goes further. You accept the political risk of being seen as a critic.",
        cost: "You become the person who challenges the leader's thinking. Whether that lands well depends entirely on their character — and you don't yet know how they'll take it.",
        scores: { SR: 3, C: 3, CI: 2, ST: 2 },
        tags: ["courage", "authority", "risk"]
      },
      {
        label: "Option B",
        text: "Hold your feedback until a better moment, or let it run. Maybe they'll spot it themselves, or it can be refined in execution later.",
        cost: "The project progresses with a defect. If it fails, you bear the silent weight of having known. You prioritize political safety.",
        scores: { SR: 2, C: 1, CI: 3, ST: 1 },
        tags: ["safety", "harmony", "caution"]
      }
    ],
    tags: ["courage", "authority", "caution"]
  },
  {
    badge: "Situation 3 of 8",
    context: "A project you led has failed to hit its main target. Your team worked hard, but key mistakes were made. In a review meeting, your manager asks what happened.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Take direct, undivided responsibility as leader. The targets were mine; the mistakes happened under my watch.",
        cost: "Your team is shielded, but your personal record takes a clean hit. Your manager notes your failure to execute.",
        scores: { SR: 3, C: 3, RA: 3, ST: 2 },
        tags: ["accountability", "leadership", "risk"]
      },
      {
        label: "Option B",
        text: "Explain the contextual factors — supply blockages, changing mandates, and specific team handoffs that went wrong.",
        cost: "It can sound like excuse-making. The team feels the subtle distribution of blame. You dilute your personal accountability.",
        scores: { SR: 2, C: 2, RA: 1, ST: 3 },
        tags: ["context", "defense", "explanation"]
      }
    ],
    tags: ["accountability", "leadership", "explanation"]
  },
  {
    badge: "Situation 4 of 8",
    context: "An employee on another team is blocking your team's progress by failing to deliver critical data. They are known to be defensive and easily stressed.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Go direct to their manager. Your team's timeline is at stake; you don't have time to navigate their sensitivities.",
        cost: "You get the data faster, but you ruin the relationship with that employee permanently. They view you as a political threat.",
        scores: { SR: 1, CN: 1, RA: 1, IP: 2 },
        tags: ["directness", "escalation", "urgency"]
      },
      {
        label: "Option B",
        text: "Sit down with them first. Acknowledge their workload, explain your team's pressure, and try to find a collaborative workaround.",
        cost: "It takes significant emotional energy and time. They might still get defensive. Your timeline slips further while you play diplomat.",
        scores: { SR: 3, CN: 3, RA: 3, IP: 3 },
        tags: ["diplomacy", "empathy", "patience"]
      }
    ],
    tags: ["directness", "escalation", "diplomacy"]
  },
  {
    badge: "Situation 5 of 8",
    context: "Your direct report is presenting to senior leadership. They struggle halfway through — losing their thread, looking visibly panicked.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Step in immediately. Take over the narrative, answer the leaders' questions, and guide the meeting to a safe finish.",
        cost: "The direct report's confidence is severely damaged. They feel rescued but publicly diminished. The leadership notes they couldn't hold the room.",
        scores: { SR: 2, RA: 1, IP: 2, CN: 2 },
        tags: ["control", "rescue", "urgency"]
      },
      {
        label: "Option B",
        text: "Stay completely silent. Give them space to struggle, recover, and finish on their own terms — even if it gets uncomfortable.",
        cost: "The meeting could derail. Leadership might view the panicky draft as representative of your entire team's capability. It hurts in real-time.",
        scores: { SR: 3, RA: 3, CN: 2, IP: 3 },
        tags: ["trust", "patience", "empowerment"]
      }
    ],
    tags: ["control", "trust", "empowerment"]
  },
  {
    badge: "Situation 6 of 8",
    context: "You are in a negotiation. The other party makes an aggressive, highly unreasonable demand, accompanied by a borderline offensive remark.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Call it out instantly. Clear boundaries must be set; you refuse to tolerate unprofessional antics.",
        cost: "The temperature in the room spikes. The negotiation could break down entirely. You risk derailment over boundary enforcement.",
        scores: { SR: 1, C: 3, CN: 2, IP: 1 },
        tags: ["boundaries", "directness", "courage"]
      },
      {
        label: "Option B",
        text: "Let the remark pass. Absorb the tension, ignore the emotional hook, and calmly restate your objective counter-proposal.",
        cost: "They may think their leverage tactics are working or that you are passive. You carry the internal stress of suppressing your response.",
        scores: { SR: 3, C: 2, CN: 3, IP: 3 },
        tags: ["control", "strategy", "composure"]
      }
    ],
    tags: ["boundaries", "control", "composure"]
  },
  {
    badge: "Situation 7 of 8",
    context: "A key peer is consistently under-delivering. It is affecting your division's metrics. Your manager notices the dip, but has not yet identified this peer as the bottleneck.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "Name the peer as the bottleneck when your manager asks. You protect your division; the truth must be visible.",
        cost: "The peer views you as a political backstabber. Peer trust is broken. You prioritize organizational transparency over peer alliances.",
        scores: { SR: 2, C: 3, RA: 1, ST: 2 },
        tags: ["transparency", "protection", "directness"]
      },
      {
        label: "Option B",
        text: "Protect the peer for now. Absorb the hit on your metric, and use it as leverage to have a difficult direct conversation with them privately.",
        cost: "You carry the performance blame. Your manager questions your division's capabilities. The peer might still fail to deliver.",
        scores: { SR: 3, C: 2, RA: 3, CN: 2 },
        tags: ["protection", "trust", "diplomacy"]
      }
    ],
    tags: ["transparency", "protection", "trust"]
  },
  {
    badge: "Situation 8 of 8",
    context: "Your team is passionately divided over a strategic direction. The arguments are growing circular and hostile. There is no clear consensus.",
    stem: "Choose the option that most honestly reflects what you would do.",
    choices: [
      {
        label: "Option A",
        text: "End the debate. Make the executive decision yourself, outline the route, and demand alignment immediately.",
        cost: "Some team members feel steamrolled and unheard. Passive resistance could develop in execution. You prioritize velocity.",
        scores: { SR: 2, CN: 2, IP: 2, ST: 3 },
        tags: ["direction", "authority", "velocity"]
      },
      {
        label: "Option B",
        text: "Expose the division. Force the team to argue the *opposing* teams' points of view in a structured debate until alignment emerges.",
        cost: "It is laborious, frustrating, and consumes another half-day. Velocity drops. The team might remain stubborn.",
        scores: { SR: 3, CN: 3, RA: 3, IP: 3 },
        tags: ["alignment", "consensus", "harmony"]
      }
    ],
    tags: ["direction", "alignment", "velocity"]
  }
];

// Profile observation patterns matcher
const patternDefinitions = [
  {
    id: "outcome-anchor",
    title: "Outcome Anchor (Velocity Focus)",
    body: "You consistently prioritize project velocity, accountability boundaries and clear-cut goals when navigating interpersonal complexity.",
    note: "Your primary instinct is to de-risk delivery, occasionally sacrificing relationship harmony to resolve operational blocks quickly.",
    test: (resp: any[]) => {
      const positiveCount = resp.filter(r => r.choice === 0 && ['conflict', 'accountability', 'directness'].some(tag => r.tags.includes(tag))).length;
      return positiveCount >= 2;
    }
  },
  {
    id: "relationship-anchor",
    title: "Relationship Anchor (Diplomatic Focus)",
    body: "You prioritize diplomatic alliances, psychological safety and mutual respect when handling friction.",
    note: "You are willing to play the long game, absorbing minor near-term project hitches to preserve trust with colleagues.",
    test: (resp: any[]) => {
      const positiveCount = resp.filter(r => r.choice === 1 && ['conflict', 'relationship', 'diplomacy'].some(tag => r.tags.includes(tag))).length;
      return positiveCount >= 2;
    }
  },
  {
    id: "transparent-operator",
    title: "Transparent Operator (Direct Truth)",
    body: "You have a high threshold for raising politically risky issues and direct contradictions publicly.",
    note: "Colleagues know exactly where you stand, but you must monitor whether your candor occasionally activates their defenses prematurely.",
    test: (resp: any[]) => {
      const positiveCount = resp.filter(r => r.choice === 0 && ['courage', 'boundaries', 'transparency'].some(tag => r.tags.includes(tag))).length;
      return positiveCount >= 2;
    }
  },
  {
    id: "contextual-discloser",
    title: "Contextual Discloser (Political Containment)",
    body: "You strategically contain information, prioritizing political safety and private alignment.",
    note: "You minimize friction with leadership and peers, but must ensure that vital operational truths don't remain hidden to protect feelings.",
    test: (resp: any[]) => {
      const positiveCount = resp.filter(r => r.choice === 1 && ['safety', 'protection', 'caution'].some(tag => r.tags.includes(tag))).length;
      return positiveCount >= 2;
    }
  },
  {
    id: "strategic-patience",
    title: "Strategic Composure (Long-term Regulator)",
    body: "You possess significant capacity to absorb tactical provocations, aggressive remarks, and temporary failures without firing reactive counter-blasts.",
    note: "Your strategic wait buffers de-escalate tension, but ensure you also actively communicate boundaries so composure is not misread as compliance.",
    test: (resp: any[]) => {
      const positiveCount = resp.filter(r => r.choice === 1 && ['control', 'composure', 'trust'].some(tag => r.tags.includes(tag))).length;
      return positiveCount >= 2;
    }
  }
];

export default function Assessment() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if this is the 360 assessment flow
  const isFrom360 = location.state?.from360 || location.state?.type === '360';

  // Redirect if logged out
  React.useEffect(() => {
    if (!user) {
      navigate('/register');
    }
  }, [user, navigate]);

  // Assessment flow stages: 'welcome', 'questions', 'processing', 'observations', 'framework', 'success'
  const [stage, setStage] = useState<'welcome' | 'questions' | 'processing' | 'observations' | 'framework' | 'success'>(() => {
    if (location.state?.stage) return location.state.stage;
    return 'welcome';
  });

  // Standard scenario index & responses
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);

  // 360-specific state variables
  const [tsAnswers, setTsAnswers] = useState<Record<string, number>>({});
  const [tsImpacts, setTsImpacts] = useState<Record<string, number>>({});
  const [tsSectionIdx, setTsSectionIdx] = useState(0);

  // Loading animation step tracking
  const [activeStep, setActiveStep] = useState(0);
  const [savingState, setSavingState] = useState(false);

  // Automatically scroll to the top of the viewport when changing pages, questions or sections
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollContainer = document.getElementById('assessment-main-container') || document.body;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [stage, currentIdx, tsSectionIdx]);

  if (!user || !profile) return null;

  const handleStart = () => {
    if (isFrom360) {
      setTsAnswers({});
      setTsImpacts({});
      setTsSectionIdx(0);
    } else {
      setResponses([]);
      setCurrentIdx(0);
      setSelectedChoiceIdx(null);
    }
    setStage('questions');
  };

  // STANDARD ASSESSMENT ACTIONS
  const handleSelectChoice = (idx: number) => {
    setSelectedChoiceIdx(idx);
  };

  const handleNextQuestion = () => {
    if (selectedChoiceIdx === null) return;

    const s = scenarios[currentIdx];
    const originalChoice = s.choices[selectedChoiceIdx];

    const updatedResponses = [
      ...responses,
      {
        scenario: currentIdx,
        choice: selectedChoiceIdx,
        tags: originalChoice.tags || s.tags,
        scores: originalChoice.scores,
        label: originalChoice.label,
        text: originalChoice.text
      }
    ];

    setResponses(updatedResponses);
    setSelectedChoiceIdx(null);

    if (currentIdx < scenarios.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Start processing screen
      setStage('processing');
      setActiveStep(0);
      const timers = [
        setTimeout(() => setActiveStep(1), 600),
        setTimeout(() => setActiveStep(2), 1200),
        setTimeout(() => setActiveStep(3), 1800),
        setTimeout(() => setStage('observations'), 2600)
      ];
      return () => timers.forEach(t => clearTimeout(t));
    }
  };

  // Compute calculated observations for standard flow
  const getCalculatedObservations = () => {
    let matched: any[] = patternDefinitions.filter(pd => pd.test(responses));
    const ids = matched.map(m => m.id);
    if (ids.includes('outcome-anchor') && ids.includes('relationship-anchor')) {
      const outCount = responses.filter(r => r.choice === 0 && ['conflict', 'accountability', 'recognition', 'directness'].some(t => (r.tags || []).includes(t))).length;
      const relCount = responses.filter(r => r.choice === 1 && ['conflict', 'relationship', 'empathy', 'integrity'].some(t => (r.tags || []).includes(t))).length;
      if (outCount >= relCount) {
        matched = matched.filter(m => m.id !== 'relationship-anchor');
      } else {
        matched = matched.filter(m => m.id !== 'outcome-anchor');
      }
    }
    if (ids.includes('transparent-operator') && ids.includes('contextual-discloser')) {
      matched = matched.filter(m => m.id !== 'contextual-discloser');
    }
    if (ids.includes('strategic-patience') && ids.includes('moves-toward-difficulty')) {
      const patCount = responses.filter(r => r.choice === 1 && ['patience', 'strategy', 'caution'].some(t => (r.tags || []).includes(t))).length;
      const actCount = responses.filter(r => r.choice === 0 && ['courage', 'directness', 'escalation', 'accountability'].some(t => (r.tags || []).includes(t))).length;
      if (patCount >= actCount) {
        matched = matched.filter(m => m.id !== 'moves-toward-difficulty');
      } else {
        matched = matched.filter(m => m.id !== 'strategic-patience');
      }
    }

    if (matched.length < 3) {
      const totals: Record<string, number> = { SR: 0, CI: 0, P: 0, RA: 0, ST: 0, IP: 0 };
      responses.forEach(r => {
        Object.entries(r.scores).forEach(([k, v]) => {
          if (totals[k] !== undefined) {
            totals[k] += v as number;
          }
        });
      });
      const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      if (sortedTotals.length > 0) {
        let fallbackObs = patternDefinitions.find(pd => pd.id === 'outcome-anchor');
        if (sortedTotals[0][0] === 'SR' || sortedTotals[0][0] === 'P') {
          fallbackObs = patternDefinitions.find(pd => pd.id === 'strategic-patience');
        } else if (sortedTotals[0][0] === 'RA') {
          fallbackObs = patternDefinitions.find(pd => pd.id === 'relationship-anchor');
        }
        if (fallbackObs && !matched.some(m => m.id === fallbackObs!.id)) {
          matched.push(fallbackObs);
        }
      }
    }

    return matched;
  };

  const getCMMLevel = () => {
    let scoreSum = 0;
    responses.forEach(r => {
      scoreSum += Object.values(r.scores).reduce((a: number, b: any) => a + b, 0) as number;
    });
    if (scoreSum > 74) return 4;
    if (scoreSum > 54) return 3;
    return 2;
  };

  const calculateDetailedScores = () => {
    const scores = { SR: 40, CI: 40, RA: 40, ST: 40, C: 40, CN: 40, IP: 40 };
    responses.forEach(r => {
      Object.entries(r.scores).forEach(([key, val]: [string, any]) => {
        if (key in scores) {
          (scores as any)[key] = Math.min(100, (scores as any)[key] + (val * 6));
        }
      });
    });
    return scores;
  };

  const handleCompleteSelfDiscovery = async () => {
    setSavingState(true);
    try {
      const computedObs = getCalculatedObservations();
      const levelResult = getCMMLevel();
      const detailedScores = calculateDetailedScores();

      const userDocRef = doc(db, 'users', user.uid);
      try {
        const updatePayload: any = {
          selfDiscoveryCompleted: true,
          selfDiscoveryAnswers: responses.map(r => r.choice),
          selfDiscoveryScores: detailedScores,
          selfDiscoveryLevel: levelResult,
          selfDiscoveryObservations: computedObs.map(o => ({
            title: o.title,
            body: o.body,
            note: o.note
          })),
          tier: 'premium',
          cmmLevel: levelResult,
          updatedAt: serverTimestamp(),
          assessmentScores: {
            selfAwareness: detailedScores.CI,
            selfRegulation: detailedScores.SR,
            motivation: detailedScores.ST,
            empathy: Math.round((detailedScores.RA + detailedScores.CI) / 2),
            socialSkills: Math.round(((detailedScores.IP || 40) + detailedScores.CN) / 2)
          }
        };

        await updateDoc(userDocRef, updatePayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        return;
      }
      setStage('success');
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit and save results: " + err.message);
    } finally {
      setSavingState(false);
    }
  };

  // 360-FLOW DIAGNOSTICS ASSESSMENT ACTIONS
  const handleRateStatement = (stmtId: string, rating: number) => {
    setTsAnswers(prev => ({ ...prev, [stmtId]: rating }));
  };

  const handleRateImpact = (skillKey: string, impact: number) => {
    setTsImpacts(prev => ({ ...prev, [skillKey]: impact }));
  };

  const activeSkill360 = SKILLS[tsSectionIdx];
  const allStatementsAnswered = activeSkill360?.statements.every(stmt => tsAnswers[stmt.id] !== undefined);
  const impactAnswered = tsImpacts[activeSkill360?.key] !== undefined;
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
      // Trigger loader screen for 360 complete
      setStage('processing');
      setActiveStep(0);
      
      const stepTimers = [
        setTimeout(() => setActiveStep(1), 600),
        setTimeout(() => setActiveStep(2), 1250),
        setTimeout(() => setActiveStep(3), 1900),
        setTimeout(async () => {
          // Perform FireStore writes and save
          await handleSaveThreeSixtyAnswers();
        }, 2600)
      ];
      return () => stepTimers.forEach(t => clearTimeout(t));
    }
  };

  const handleSaveThreeSixtyAnswers = async () => {
    setSavingState(true);
    try {
      // Calculate overall self EMM results with 0 completed observers
      const initialSelfResults = calculateThreeSixtyResults(tsAnswers, tsImpacts, []);
      const overallEMMLevel = initialSelfResults.overallLevel;

      const userDocRef = doc(db, 'users', user.uid);
      const updatePayload: any = {
        threeSixtySelfCompleted: true,
        threeSixtySelfAnswers: tsAnswers,
        threeSixtySelfImpacts: tsImpacts,
        cmmLevel: overallEMMLevel, // Set initially achieved level!
        tier: 'premium',          // Unlock premium 360 powers
        updatedAt: serverTimestamp()
      };

      await updateDoc(userDocRef, updatePayload);
      setStage('success');
    } catch (err: any) {
      console.error(err);
      alert("Could not commit 360 self assessment answers: " + err.message);
    } finally {
      setSavingState(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 md:py-20 px-4 md:px-8 relative overflow-hidden flex items-center justify-center font-sans selection:bg-[#41B1C2] selection:text-white">
      {/* Background aesthetics */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#41B1C2]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#104C64]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full z-10">
        
        {/* STAGE 1: WELCOME SCREEN */}
        {stage === 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {isFrom360 ? (
              /* --- RENDER 360 WELCOME --- */
              <div className="p-8 md:p-14 bg-white border border-stone-200 rounded-[40px] shadow-2xl relative overflow-hidden space-y-8">
                <div className="space-y-3 col-span-2 text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">
                    BEYONDEQ · PHASE 1 DIAGNOSTIC
                  </span>
                  <h1 className="text-3xl md:text-5xl font-black text-[#104C64] uppercase tracking-tighter italic">
                    360° Relational <span className="font-serif not-italic font-normal text-[#41B1C2] lowercase">self-assessment</span>
                  </h1>
                </div>

                <div className="h-[1px] bg-stone-200" />

                <div className="space-y-5 text-sm text-stone-600 leading-relaxed font-sans">
                  <p>
                    Welcome to the specialized diagnostics engine. This phase is designed to establish an objective, stress-tested baseline across **15 capability dimensions** prior to inviting observers.
                  </p>
                  <p className="p-5 bg-[#104C64]/5 border border-[#104C64]/10 rounded-2xl flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#104C64] shrink-0 mt-0.5" />
                    <span>
                      <strong>Objective Scoring Rule:</strong> Rate yourself on what peers or stakeholders would <em>consistently observe</em>. Answer honestly based on behaviors, not internal intentions or your absolute best days.
                    </span>
                  </p>
                  <p>
                    <strong>How it works:</strong> You will complete 15 quick section sheets (one for each skill category containing 4-5 statements). You will rate statements on a 4-point scale and answer one long-range impact evaluation. Fulfilling this self-assessment unlocks the peer/observer nomination tools immediately.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center">
                  <button
                    onClick={handleStart}
                    className="w-full sm:w-auto px-8 py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-widest text-[10px] rounded-xl cursor-pointer shadow-md shadow-[#104C64]/15 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    Begin Diagnostic Self-Assessment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link 
                    to="/dashboard"
                    className="text-[10px] font-black uppercase tracking-wide text-stone-450 hover:text-stone-800 transition-colors"
                  >
                    Cancel & Return
                  </Link>
                </div>
              </div>
            ) : (
              /* --- RENDER ORIGINAL SELF-DISCOVERY WELCOME --- */
              <div className="p-8 md:p-14 bg-white border border-stone-200 rounded-[40px] shadow-2xl relative overflow-hidden space-y-8">
                <div className="space-y-3 col-span-2 text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">
                    BEYONDEQ · SIGNATURE MATRIX
                  </span>
                  <h1 className="text-3xl md:text-4xl font-black text-[#104C64] uppercase tracking-tighter italic">
                    Take Self Discovery <span className="font-serif not-italic font-normal text-[#41B1C2] lowercase">scenario questionnaire</span>
                  </h1>
                </div>

                <div className="h-[1px] bg-stone-200" />

                <div className="space-y-5 text-sm text-stone-600 leading-relaxed font-sans">
                  <p>
                    Rather than traditional self-assessment checkboxes, our **HumanEdge scenario engine** utilizes forced-choice situations. It simulates common administrative and behavioral pressure points to determine your actual, stress-tested emotional intelligence habits.
                  </p>
                  <p className="p-4 bg-amber-50 text-amber-850 rounded-2xl flex items-start gap-3 border border-amber-250/55 text-xs">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Forced Choice Rule:</strong> There are no 'perfect' choices inside. Both choices carry real-world penalties. Choose the option that genuinely reflects what you are most likely to do under immediate workspace pressure.
                    </span>
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-4 items-center">
                  <button
                    onClick={handleStart}
                    className="w-full sm:w-auto px-8 py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-widest text-[10px] rounded-xl cursor-pointer shadow-md shadow-[#104C64]/15 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    Start Scenario Experience
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <Link 
                    to="/dashboard"
                    className="text-[10px] font-black uppercase tracking-wide text-stone-450 hover:text-stone-800 transition-colors"
                  >
                    Cancel & Return
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* STAGE 2: QUESTION SCREEN */}
        {stage === 'questions' && (
          isFrom360 ? (
            /* --- RENDER 360 SKILLS SHEETS INDEX --- */
            <motion.div
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

              {/* Central skill card container */}
              <div className="bg-white border border-stone-200 p-8 md:p-12 rounded-[40px] shadow-xl space-y-6">
                <div className="space-y-1.5 border-b border-stone-100 pb-4">
                  <span className="text-[9px] bg-stone-100 font-bold px-2.5 py-0.5 rounded text-stone-500 uppercase tracking-widest">
                    Tier {activeSkill360.tier} — Diagnostic Index
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-[#104C64] uppercase tracking-wide leading-tight">
                    {activeSkill360.name}
                  </h3>
                  <p className="text-xs text-stone-400 italic">
                    Rating guidelines: Rate yourself honestly based on real-world actions, not intentions.
                  </p>
                </div>

                {/* List of statements inside active skill */}
                <div className="space-y-6 pt-2">
                  {activeSkill360.statements.map((stmt, sIdx) => {
                    const currentRating = tsAnswers[stmt.id];
                    return (
                      <div key={stmt.id} className="space-y-3 pb-5 border-b border-stone-100 last:border-0 last:pb-0">
                        <div className="flex items-start gap-2 text-stone-900 font-sans text-xs font-semibold leading-relaxed">
                          <span className="text-[#41B1C2] font-mono leading-none font-black text-[13px] mr-1">{sIdx + 1}.</span>
                          <span>{stmt.self}</span>
                        </div>

                        {/* 4-point + N/A Options Buttons */}
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
                              className={`py-3 text-[10.5px] uppercase tracking-wider font-extrabold border rounded-xl transition-all cursor-pointer select-none text-center ${
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

                {/* Section impact qualifier */}
                <div className="p-6 bg-stone-55 border border-stone-150 rounded-2xl space-y-4 pt-5 select-none">
                  <div className="space-y-1">
                    <span className="text-[8.5px] text-[#41B1C2] font-black uppercase tracking-widest block font-mono">Organizational Impact Qualifier</span>
                    <p className="text-xs text-stone-800 font-bold leading-normal">
                      What is the systemic, long-term operational impact of this capability inside your organization?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-sans">
                    {[
                      { val: 1, label: "Low Impact" },
                      { val: 2, label: "Moderate Impact" },
                      { val: 3, label: "Critical Impact" },
                      { val: 4, label: "Systemic Scale" }
                    ].map(opt => {
                      const currentImpact = tsImpacts[activeSkill360.key];
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => handleRateImpact(activeSkill360.key, opt.val)}
                          className={`py-2.5 text-[9.5px] uppercase tracking-wider font-bold border rounded-lg transition-all cursor-pointer text-center ${
                            currentImpact === opt.val
                              ? 'bg-[#41B1C2] border-[#41B1C2] text-white shadow-md shadow-[#41B1C2]/15'
                              : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-800'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions nav */}
                <div className="pt-4 border-t border-stone-100 flex justify-between items-center font-sans">
                  <button
                    onClick={handlePrevSection}
                    disabled={tsSectionIdx === 0}
                    className="flex items-center gap-1.5 px-5 py-3 text-[10px] font-black uppercase tracking-wide border border-stone-200 text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Previous Section
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
                    {tsSectionIdx === SKILLS.length - 1 ? 'Submit Assessment' : 'Next Section'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* --- RENDER ORIGINAL SELF-DISCOVERY SCENARIO QUESTS --- */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#41B1C2] bg-white border border-stone-200 px-3.5 py-1.5 rounded-full select-none">
                  {scenarios[currentIdx].badge}
                </span>
                <span className="text-[10px] font-black font-mono text-stone-450 select-none">
                  {Math.round(((currentIdx + 1) / scenarios.length) * 100)}% Complete
                </span>
              </div>

              {/* Scenario card */}
              <div className="bg-white border border-stone-200 p-8 md:p-12 rounded-[40px] shadow-xl space-y-6">
                <p className="text-stone-800 text-[13.5px] leading-relaxed font-sans font-medium text-left">
                  {scenarios[currentIdx].context}
                </p>

                <div className="h-[1px] bg-stone-100" />

                <div className="space-y-4">
                  <span className="text-[9px] text-[#41B1C2] font-black uppercase tracking-[0.25em] block">{scenarios[currentIdx].stem}</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scenarios[currentIdx].choices.map((choice, cidx) => (
                      <button
                        key={cidx}
                        onClick={() => handleSelectChoice(cidx)}
                        className={`p-6 border text-left rounded-3xl transition-all cursor-pointer relative font-sans space-y-3 select-none flex flex-col justify-between ${
                          selectedChoiceIdx === cidx 
                            ? 'bg-[#104C64]/5 border-[#104C64] shadow-md' 
                            : 'bg-stone-50/40 hover:bg-stone-50 border-stone-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded ${
                            selectedChoiceIdx === cidx ? 'bg-[#104C64] text-white' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {choice.label}
                          </span>
                          <p className="text-xs text-stone-800 font-bold leading-relaxed">{choice.text}</p>
                        </div>
                        <div className="border-t border-stone-200/50 pt-2 text-[10px] text-stone-400 italic font-normal leading-normal">
                          <strong>Penalty:</strong> {choice.cost}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions bar */}
                <div className="pt-4 border-t border-stone-100 flex justify-end font-sans">
                  <button
                    onClick={handleNextQuestion}
                    disabled={selectedChoiceIdx === null}
                    className={`flex items-center gap-1.5 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-white shadow-md ${
                      selectedChoiceIdx !== null 
                        ? 'bg-[#104C64] hover:bg-[#0D3E52] shadow-[#104C64]/10 hover:-translate-y-0.5 active:translate-y-0' 
                        : 'bg-stone-200 border-stone-200 text-stone-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    Confirm & Proceed
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        )}

        {/* STAGE 3: LOADING TRANSITION SCREEN */}
        {stage === 'processing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center space-y-12"
          >
            <div className="space-y-4 font-sans">
              <h2 className="text-2xl md:text-3xl font-black text-[#104C64] uppercase tracking-tight italic">
                Reading your operational patterns
                <span className="animate-pulse text-[#41B1C2]">...</span>
              </h2>
              <p className="text-xs text-stone-500 uppercase tracking-widest font-black">Establishing diagnostic parameters</p>
            </div>

            <div className="max-w-md mx-auto bg-white border border-stone-200/80 p-8 rounded-[36px] shadow-lg shadow-stone-200/35 space-y-4 text-left font-sans">
              {[
                isFrom360 ? "Parsing 15 skill sectors" : "Mapping decision priorities",
                isFrom360 ? "Aggregating self inputs" : "Identifying tradeoff patterns",
                isFrom360 ? "Calculating threshold metrics" : "Surfacing thinking tendencies",
                isFrom360 ? "Fusing capability definitions" : "Preparing core observations"
              ].map((step, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-4 transition-all duration-300 ${
                    activeStep >= idx ? 'opacity-100 text-stone-900 font-bold' : 'opacity-20 text-stone-400'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
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

        {/* STAGE 4: PATTERN OBSERVATIONS */}
        {stage === 'observations' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2 select-none">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2]">Synchrony Compiled</span>
              <h2 className="text-2xl md:text-3xl font-black text-stone-900 uppercase italic tracking-tight">Your Behavioral Tendencies</h2>
            </div>

            <div className="space-y-6">
              {getCalculatedObservations().map((ob, oidx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: oidx * 0.15 }}
                  key={ob.id}
                  className="bg-white border border-stone-200 p-8 rounded-[36px] shadow-lg shadow-stone-200/30 text-left font-sans space-y-3"
                >
                  <div className="flex justify-between items-center items-start">
                    <span className="text-stone-900 text-sm font-black uppercase tracking-wide leading-tight">{ob.title}</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{ob.body}</p>
                  <p className="text-[10.5px] bg-[#104C64]/5 border border-[#104C64]/10 rounded-xl p-3.5 text-stone-550 leading-normal">
                    💡 <strong>Observation Note:</strong> {ob.note}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="pt-4 flex justify-center">
              <button
                onClick={() => setStage('framework')}
                className="px-8 py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-widest text-[10px] rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2"
              >
                Explore HumanEdge EQ Maturity Scale
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STAGE 5: THE HUMANEDGE FRAMEWORK */}
        {stage === 'framework' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 animate-fadeIn"
          >
            <div className="text-center space-y-2 select-none">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2]">Capability Levels</span>
              <h2 className="text-2xl md:text-3xl font-black text-stone-900 uppercase italic tracking-tight">Emotional Intelligence Maturity (CMM)</h2>
            </div>

            <div className="bg-white border border-stone-200 p-8 rounded-[40px] shadow-xl text-left font-sans space-y-6">
              <p className="text-stone-600 text-xs leading-relaxed max-w-xl font-normal">
                BeyondEQ maps your behavioral sync patterns against our 6-stage <strong>Capability Maturity Model (CMM)</strong>. This measures how reliably your emotional composure, decision courage and contextual empathy hold under professional and social stressors:
              </p>

              <div className="space-y-4">
                {[
                  { num: 1, name: "Level 1: Aware", tag: "Pattern Tracking", desc: "Recognizes behavioral motifs but operates with standard blind spots." },
                  { num: 2, name: "Level 2: Observant", tag: "Fast Recognition", desc: "Quickly decodes peer energy, though responses remain occasionally reactive." },
                  { num: 3, name: "Level 3: Responsive", tag: "Strategic Composure", desc: "Successfully regulates instincts to prioritize long-term systemic alignment." },
                  { num: 4, name: "Level 4: Proactive", tag: "Interpersonal Shaping", desc: "Anticipates conflict loops and neutralizes boardroom friction before it solidifies." },
                  { num: 5, name: "Level 5: Architect", tag: "Ecosystem Designer", desc: "Systematically designs collaborative and high-trust workspaces without relying on raw authority." },
                  { num: 6, name: "Level 6: Inception", tag: "Resonant Mind Apex", desc: "Cultivates organizational conditions where peers lock in alignment autonomously." }
                ].map(level => {
                  const isCurrent = level.num === getCMMLevel();
                  return (
                    <div 
                      key={level.num} 
                      className={`p-4 border rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-all ${
                        isCurrent 
                          ? 'bg-[#104C64]/5 border-[#104C64] shadow-sm' 
                          : 'bg-stone-50/40 border-stone-200/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-900 text-xs uppercase font-extrabold">{level.name}</strong>
                          <span className="text-[8px] font-black text-[#41B1C2] border border-[#41B1C2]/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-mono bg-white">{level.tag}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-normal leading-relaxed">{level.desc}</p>
                      </div>

                      {isCurrent && (
                        <span className="bg-[#104C64] text-white text-[8.5px] font-black uppercase tracking-widest px-3 py-1 rounded-full shrink-0">
                          Your Initial level
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end font-sans">
                <button
                  type="button"
                  onClick={handleCompleteSelfDiscovery}
                  disabled={savingState}
                  className="px-6 py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:translate-y-0"
                >
                  {savingState ? 'Saving baseline...' : 'Confirm Diagnostics & Unlock Dashboard'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 7: SUCCESS COMPLETION SCREEN */}
        {stage === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 bg-white border border-stone-200 rounded-[40px] space-y-8 shadow-2xl shadow-stone-200/50"
          >
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-250 shadow-md shadow-emerald-500/[0.04]">
                <CheckCircle className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-stone-900 uppercase italic tracking-tighter">
                You are <span className="text-[#104C64] font-serif not-italic font-normal lowercase">ready.</span>
              </h2>
              <p className="text-xs text-emerald-700 bg-emerald-50 py-1.5 px-4 rounded-full inline-block uppercase font-bold tracking-widest font-sans">Diagnostic calculations completed</p>
            </div>

            <div className="h-[1px] bg-stone-200" />

            <div className="space-y-6 text-sm leading-relaxed font-sans text-stone-600">
              <div className="p-6 bg-stone-50 border border-stone-200/70 border-l-[#41B1C2] border-l-4 rounded-3xl space-y-1 shadow-sm shadow-stone-100/50">
                <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">
                  {isFrom360 ? "Self-Assessment Complete" : "Scoring Sync Complete"}
                </h4>
                <p className="text-xs text-stone-600">
                  {isFrom360
                    ? "Congratulations! You have successfully completed the 360° individual reflection diagnostic. Your baseline results are compiled. Now, unlock your matrix completely by inviting professional observers."
                    : "Your self-discovery results have been committed to your central profile. You can now view your Emotional Maturity baseline on your personal tracker dashboard!"}
                </p>
              </div>

              <div className="p-6 bg-emerald-50/50 border border-emerald-200/80 rounded-3xl text-left font-sans text-xs text-stone-600">
                <span className="font-bold text-emerald-800 uppercase tracking-widest block text-[10px] mb-1">✓ Core Baseline Synced</span>
                {isFrom360
                  ? "You have unlocked the observer invitation and manual code sync pipeline. Nominate your managers, direct reports, or peers on the dashboard."
                  : "You have successfully completed your self-discovery assessment experience. Your profile parameters and Emotional Maturity Metrics are now unlocked and active on your dashboard tracking tool."}
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link
                to="/dashboard"
                state={{ activeAssessment: "threeSixty" }}
                className="px-8 py-4 bg-[#104C64] hover:bg-[#155e7a] text-white font-bold uppercase tracking-widest text-[10px] rounded-xl text-center w-full sm:w-auto transition-all shadow-md shadow-[#104C64]/10 hover:-translate-y-0.5"
              >
                {isFrom360 ? "Invite Observers Now" : "Go to Dashboard"}
              </Link>
              <button
                onClick={handleStart}
                className="px-8 py-4 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 font-bold uppercase tracking-widest text-[10px] rounded-xl text-center w-full sm:w-auto transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake Assessment
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
