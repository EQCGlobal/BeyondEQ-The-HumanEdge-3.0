import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Tag, 
  Clock, 
  Calendar, 
  BookOpen, 
  Bookmark, 
  BookmarkCheck, 
  Share2, 
  X, 
  ArrowRight, 
  Sparkles, 
  ChevronRight, 
  Heart, 
  MessageSquare,
  Send,
  AlertCircle,
  ThumbsUp,
  CheckCircle2,
  Mail
} from 'lucide-react';
import Interactive3DBackground from './Interactive3DBackground';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getInstantOrigin } from '../lib/origin';

const fallbackCopyToClipboard = (text: string): boolean => {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback clipboard copy failed:", err);
    return false;
  }
};

const safeCopyToClipboard = (text: string): boolean => {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      const p = navigator.clipboard.writeText(text);
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          console.warn("Async clipboard write failed, trying fallback:", err);
          fallbackCopyToClipboard(text);
        });
      }
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, trying fallback:", err);
  }
  return fallbackCopyToClipboard(text);
};

interface BlogPost {
  id: string;
  title: string;
  category: 'Leadership' | 'Safety' | 'Cognitive Biases' | 'Psychology' | 'Diagnostics';
  excerpt: string;
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
    avatarInitials: string;
    bgClass: string;
  };
  content: {
    introduction: string;
    sections: {
      heading: string;
      body: string;
      quote?: string;
    }[];
    conclusion: string;
  };
  featured?: boolean;
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: "anatomy-high-safety-workspaces",
    title: "The Anatomy of High-Safety Workspaces: Overcoming Default Defensive Listening",
    category: "Safety",
    excerpt: "Why default defensive mechanisms stall corporate output and how high trust ecosystems foster active, non-judgmental listening frameworks.",
    readTime: "7 min read",
    date: "June 02, 2026",
    featured: true,
    author: {
      name: "Siddharth Mehta",
      role: "Lead Culture Advisor",
      avatarInitials: "SM",
      bgClass: "bg-teal-550"
    },
    content: {
      introduction: "In most high-velocity corporate cultures, listening is not active—it is strategic. Team members do not listen to comprehend; they listen to defend, evaluate, or position. This subconscious dynamic, deeply rooted in the primal evolutionary brain, constitutes the single greatest biological block to team psychological safety. Overcoming this requires understanding 'Defensive Listening' and transitioning into non-judgmental, collaborative cognitive alignment.",
      sections: [
        {
          heading: "The Physiology of Defensive Listening",
          body: "When an employee receives feedback or hears an alternative proposal, their amygdala often interprets the difference as intellectual territory infringement. Blood flow diverts from the prefrontal cortex—where creative problem-solving takes place—to basic survival zones. The immediate response is defensive: justifying actions, finding fault in the peer's logic, or shutting down verbally while maintaining internal resentment.",
          quote: "True psychological safety is not the absence of constructive friction; it is the absolute elimination of interpersonal threat."
        },
        {
          heading: "The Five Stages of Listening Maturity",
          body: "At BeyondEQ, we map the listening habits of senior leadership to establish where a team falls on the psychological safety matrix: \n1. Defensive (Position preservation and confirmation bias)\n2. Passive (Silent compliance, lacking emotional commitment)\n3. Critical (Listening strictly for conceptual errors or weak links)\n4. Empathetic (Tracking emotional undercurrents and unvoiced constraints)\n5. Generative (The creative synthesis of dual perspectives into a superior third path)"
        },
        {
          heading: "Dismantling the Threat Landscape",
          body: "To build a generative tier workspace, leaders must intentionally rewrite high-stakes meetings. Start by declaring 'Friction Thresholds'—separating debate on ideas from performance assessments. Make it explicit that ideas are shared test models to be collectively inspected, rather than personal extensions of the designer's competence.",
          quote: "When a team no longer needs to spend energy protecting their personal status, they redirect 100% of their computational cognitive capacity to the problem."
        }
      ],
      conclusion: "Transitioning a company from a default defensive environment to a high-safety generative matrix does not happen overnight. It is a rigorous, deliberate practice of pattern-interruption, utilizing micro-reflections and psychological alignment audits to slowly make vulnerability the structural standard."
    }
  },
  {
    id: "diagnostic-trust-deficits",
    title: "How Strategic Diagnostic Models Uncover Latent Corporate Trust Deficits",
    category: "Diagnostics",
    excerpt: "Most internal surveys fail because they verify symptoms, not the core architecture of trust. Aligning EQ measurement to the Capability Maturity Model.",
    readTime: "5 min read",
    date: "May 28, 2026",
    author: {
      name: "Dr. Ananya Roy",
      role: "Head of Psychometrics",
      avatarInitials: "AR",
      bgClass: "bg-amber-600"
    },
    content: {
      introduction: "When human resources teams try to resolve alignment friction, they usually launch an anonymous annual survey. The results are almost always predictable: surface-level feedback about kitchen supplies or general work hours, while the silent, corrosive trust deficits operating between departments remain completely untouched. Standard diagnostics fail because they measure static sentiment, rather than multi-layered behavioral maturity.",
      sections: [
        {
          heading: "Sentiment vs. Systemic Competence",
          body: "Sentiment is volatile; it is affected by immediate stresses like quarterly reviews or weather patterns. Systematic trust, however, is a sequence of predictive variables: capability, structural integrity, and consistency. To measure trust, we cannot ask 'Do you trust your manager?' We must evaluate behavioral benchmarks in peer-to-peer observer cycles.",
          quote: "A survey answers what people think you want to hear. A multi-layered assessment tracks how people behave when the stakes are high."
        },
        {
          heading: "CMM Mapping of Interpersonal Networks",
          body: "Aligning with our standard Capability Maturity Model (CMM) for Emotional Intelligence, trust deficits are mapped across 5 operational performance bands. For instance, at Level 1 (Aware), trust is sporadic and purely transaction-based. At Level 4 (Proactive), trust is structural, guarded by common accountability guidelines and feedback feedback loops, neutralizing bias before it affects critical outputs."
        }
      ],
      conclusion: "By transitioning from simplistic internal surveys to a comprehensive multi-rater system where leaders, peers, and reporting lines participate under psychometrically sound frameworks, corporate entities finally shine a light onto the latent structural deficits that slow execution."
    }
  },
  {
    id: "observer-paradox-360-feedbacks",
    title: "The Observer Paradox in Performance Multi-Raters (360° EQ)",
    category: "Psychology",
    excerpt: "How cognitive biases skew employee multi-rater feedback, and the mathematical corrections needed to isolate actual behavioral capabilities.",
    readTime: "6 min read",
    date: "May 20, 2026",
    author: {
      name: "Sunny Dev",
      role: "Lead Platform Engineer",
      avatarInitials: "SD",
      bgClass: "bg-blue-600"
    },
    content: {
      introduction: "The 360-degree review is considered the global gold standard for corporate leadership evaluation. However, the system contains an inherent fatal flaw which physicists call the 'Observer Paradox': the act of observing and evaluating a colleague changes both the context of interaction and introduces massive, systematic observer biases.",
      sections: [
        {
          heading: "The Five Core Biases Poluting Feedback",
          body: "Without rigorous algorithmic normalization, multi-rater metrics are often little more than a reflection of systemic office politics: \n1. Halo/Horns Effect: A single outstanding success or mistake colors all unrelated competencies.\n2. Leniency Bias: Evaluators giving high scores to maintain comfortable social dynamics.\n3. Recency Bias: Over-weighting the candidate's last two weeks while disregarding historical patterns.\n4. Central Tendency: The psychological comfort of selecting middle values to avoid conflict.\n5. Affinity Bias: Awarding structurally higher ranks to peers with matching temperaments or backgrounds.",
          quote: "Uncalibrated 360 evaluations do not measure employee competency; they measure the social popularity of the candidate."
        },
        {
          heading: "Algorithmic Friction Dampening",
          body: "BeyondEQ corrects for the observer paradox by processing input lines through custom structural normalization rules. We assess evaluator reliability, weight metrics based on proximity and duration of peer collaboration, and identify outlier scores that don't match the general observation consensus. This isolates real behavioral capability from contextual interference."
        }
      ],
      conclusion: "When organizations employ psychometrically structured evaluations that explicitly control for systematic observer biases, they unlock authentic, actionable executive tracking metrics that build real capability."
    }
  },
  {
    id: "three-second-stimulus-gap",
    title: "Stress Resiliency and the 3-Second Stimulus-Response Gap",
    category: "Leadership",
    excerpt: "Unpacking the neurobiology of micro-reflections: How inserting three seconds of conscious pause overrides amygdala hijacking under high stakes.",
    readTime: "4 min read",
    date: "May 15, 2026",
    author: {
      name: "Siddharth Mehta",
      role: "Lead Culture Advisor",
      avatarInitials: "SM",
      bgClass: "bg-teal-555"
    },
    content: {
      introduction: "Between stimulus and response, there is a space. In that space lies our power to choose our response. In our response lies our growth and our freedom. Victor Frankl's timeless wisdom is now fully validated by modern functional neuroimaging. In high-frequency, high-pressure leadership scenarios, that 'space' is often under three seconds long.",
      sections: [
        {
          heading: "The Amygdala Hijack Timeline",
          body: "When you receive an aggressive email or a surprise setback in a board meeting, the sensory signal reaches your thalamus first. Crucially, the signal routes to the amygdala—the brain's emergency fire alarm—several milliseconds faster than to the prefrontal cortex—the thinking brain. Before you can intellectually register what's happening, you have started reactively typing a defensive reply or shouting an objection.",
          quote: "The leader who cannot govern their own three-second reaction window will inevitably be governed by those who can."
        },
        {
          heading: "The Micro-Reflection Intervention",
          body: "By training leaders in micro-reflections—the rapid, 3-second self-assessment of trigger, precise emotion, and underlying driver—we physically slow down the stress loop. This micro-intervention allows neural activity to flow from the emotional reactive centres to the cognitive hubs, preventing destructive behavior before it starts."
        }
      ],
      conclusion: "Integrating micro-reflection exercises as an automatic, daily somatic trigger restores executive choice, letting leaders model emotional composure in the face of hyper-complex turbulence."
    }
  },
  {
    id: "unseen-corporate-debt",
    title: "Unseen Corporate Debt: Cognitive Biases Sabotaging High Stakes Ventures",
    category: "Cognitive Biases",
    excerpt: "How loss aversion, conformity pressure, and confirmation bias build up a silent architectural debt that kills innovation inside legacy enterprise giants.",
    readTime: "8 min read",
    date: "May 09, 2026",
    author: {
      name: "Dr. Ananya Roy",
      role: "Head of Psychometrics",
      avatarInitials: "AR",
      bgClass: "bg-rose-600"
    },
    content: {
      introduction: "Financial debt is clearly accounted for on balance sheets. Technical debt is mapped Out in engineering sprints. Yet, the most dangerous form of systemic friction-'Cognitive Debt'-remains invisible. Cognitive debt is the accumulated cost of unexamined biases, protective social behaviors, and delayed critical decisions that clog enterprise execution.",
      sections: [
        {
          heading: "The Triad of Executive Deadlock",
          body: "Three classic cognitive biases interact at the executive level to construct cognitive debt: \n1. Loss Aversion: Over-prioritizing the protection of existing revenue at the expense of necessary innovation.\n2. Conformity Pressure (Groupthink): The gradual elimination of critical dissenting voices under the guise of 'team unity' or alignment.\n3. Escalation of Commitment: Pouring millions into failing legacy architectures simply because 'too much is already invested to back out now.'",
          quote: "Innovative plans do not fail from a lack of technical expertise; they fail because dissent is treated as disloyalty."
        },
        {
          heading: "Deleveraging Cognitive Debt",
          body: "Paying down this debt requires introducing cognitive disrupters. Teams must establish 'Devil's Advocate' guidelines, run pre-mortems where the objective is to model why a project will collapse in twelve months, and utilize blind decision-making surveys to gather pure data unpolluted by hierarchical pressure frameworks."
        }
      ],
      conclusion: "By running structural friction diagnostics to map and address corporate cognitive debt in its early stages, executive networks preserve their organizational agility and keep executing to peak capacity."
    }
  }
];

export default function Blog() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [onlyShowBookmarked, setOnlyShowBookmarked] = useState<boolean>(false);

  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Load bookmarks from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('beyondeq_blog_bookmarks');
      if (saved) {
        setBookmarkedIds(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not read blog bookmarks from localStorage", e);
    }
  }, []);

  // Update scroll reading progress bar inside the modal
  const handleModalScroll = () => {
    if (modalBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = modalBodyRef.current;
      const totalScrollable = scrollHeight - clientHeight;
      if (totalScrollable > 0) {
        const percentage = (scrollTop / totalScrollable) * 100;
        setReadingProgress(percentage);
      } else {
        setReadingProgress(0);
      }
    }
  };

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setBookmarkedIds(prev => {
      const updated = prev.includes(id) 
        ? prev.filter(bId => bId !== id) 
        : [...prev, id];
      localStorage.setItem('beyondeq_blog_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSubscribeNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    
    // Simple verification
    if (!/\S+@\S+\.\S+/.test(newsletterEmail)) {
      setNewsletterStatus('error');
      setNewsletterMsg('Please enter a valid email address.');
      return;
    }

    setNewsletterStatus('submitting');
    try {
      // Add subscription to Firestore
      await addDoc(collection(db, "newsletterSubscriptions"), {
        email: newsletterEmail.trim().toLowerCase(),
        source: "blog_page",
        createdAt: serverTimestamp()
      });

      setNewsletterStatus('submitted');
      setNewsletterMsg('Success! You are subscribed to our cognitive research newsletter.');
      setNewsletterEmail('');
    } catch (error: any) {
      console.error("Failed to subscribe email:", error);
      setNewsletterStatus('error');
      setNewsletterMsg('We are experiencing some network friction. Please try again.');
      handleFirestoreError(error, OperationType.CREATE, "newsletterSubscriptions");
    }
  };

  const categories = ['All', 'Leadership', 'Safety', 'Cognitive Biases', 'Psychology', 'Diagnostics'];

  // Filter posts based on Category, Search query, and Bookmarked filter
  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBookmark = !onlyShowBookmarked || bookmarkedIds.includes(post.id);
    return matchesCategory && matchesSearch && matchesBookmark;
  });

  const featuredPost = BLOG_POSTS.find(post => post.featured);

  return (
    <div 
      ref={containerRef}
      className="relative bg-white h-screen overflow-y-auto text-stone-900 font-sans pb-32 pt-28 selection:bg-[#41B1C2] selection:text-white" 
      id="blog-page-root"
    >
      {/* Immersive 3D/Neural background lines to match the high-safety system aesthetic */}
      <Interactive3DBackground containerRef={containerRef} />

      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full" id="blog-header-section">
        <div className="border-b border-stone-200 pb-10 mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-2 text-[#104C64] font-black uppercase text-[10px] tracking-[0.4em] mb-4"
          >
            <Sparkles className="w-4 h-4 text-[#104C64]" />
            Cognitive Insights & Research
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-[#104C64] uppercase tracking-tight max-w-3xl leading-[1.1]"
          >
            The BeyondEQ Chronicles
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-sm md:text-base text-stone-550 font-sans mt-3 max-w-2xl leading-relaxed"
          >
            Deep dive into industrial psychology, cognitive bias matrices, and leadership capability maturity structures designed for high stakes executive networks.
          </motion.p>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 pb-8 border-b border-stone-200/60 mb-10" id="blog-controls">
          {/* Categories Tab Pill Selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setOnlyShowBookmarked(false);
                }}
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat && !onlyShowBookmarked
                    ? 'bg-[#104C64] text-white border-[#104C64] shadow-md shadow-[#104C64]/10'
                    : 'bg-white hover:bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-350'
                }`}
              >
                {cat}
              </button>
            ))}

            {bookmarkedIds.length > 0 && (
              <button
                onClick={() => {
                  setOnlyShowBookmarked(true);
                  setSelectedCategory('All');
                }}
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  onlyShowBookmarked
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/10'
                    : 'bg-white hover:bg-stone-50 text-emerald-650 border-[#41B1C2]/30 hover:border-[#41B1C2]'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                Bookmarked ({bookmarkedIds.length})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, theme or category..."
              className="w-full bg-stone-50 border border-stone-200 hover:border-stone-350 focus:border-[#104C64] focus:bg-white rounded-full pl-11 pr-5 py-3 text-xs placeholder:text-stone-400 focus:outline-none transition-all font-sans"
              id="blog-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-450 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Regular Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="blog-grid-posts">
          <AnimatePresence mode="popLayout">
            {filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                onClick={() => setActivePost(post)}
                className="bg-white border hover:bg-[#104C64]/[0.01] border-stone-200 hover:border-[#104C64]/30 rounded-[32px] p-6 flex flex-col justify-between gap-6 hover:shadow-lg transition-all duration-400 cursor-pointer card-id hover:scale-[1.01]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-gradient-to-r from-stone-50 to-stone-100 text-stone-600 text-[8.5px] font-black uppercase tracking-widest rounded-full border border-stone-200">
                      {post.category}
                    </span>
                    <span className="text-[9px] text-stone-400 font-semibold font-sans flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-350" />
                      {post.readTime}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight line-clamp-2 leading-snug hover:text-[#0D3E52] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-stone-550 font-sans leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${post.author.bgClass} flex items-center justify-center text-white text-[10px] font-black`}>
                      {post.author.avatarInitials}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-[#104C64]">{post.author.name}</h4>
                      <p className="text-[8px] uppercase tracking-wider text-stone-400 font-bold">{post.author.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleBookmark(post.id, e)}
                      className="p-2.5 bg-stone-50 hover:bg-white rounded-full border border-stone-200 hover:border-stone-400 text-stone-500 transition-all shadow-sm"
                      title="Bookmark Article"
                    >
                      {bookmarkedIds.includes(post.id) ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-[#104C64]/70 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredPosts.length === 0 && (
            <div className="col-span-full py-16 text-center text-stone-550 space-y-4" id="empty-results">
              <AlertCircle className="w-12 h-12 text-stone-300 mx-auto" />
              <div>
                <p className="text-base font-bold text-[#104C64]">No Research Pieces Found</p>
                <p className="text-xs text-stone-400 font-sans mt-1">Try resetting your keyword filters or choose another diagnostic category.</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setOnlyShowBookmarked(false);
                }}
                className="px-5 py-2.5 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[9px] font-black uppercase tracking-widest rounded-full cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>

        {/* Newsletter subscription panel */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-20 bg-gradient-to-br from-[#104C64] to-[#0D3E52] rounded-[48px] p-8 md:p-12 text-white border border-white/20 shadow-xl overflow-hidden relative"
          id="newsletter-container"
        >
          {/* Subtle design element */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
            <Mail className="w-64 h-64 text-white" />
          </div>

          <div className="max-w-3xl relative z-10 space-y-6">
            <span className="px-3.5 py-1.5 bg-white/10 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-white/20 inline-block">
              INTELLIGENCE BRIEFING
            </span>
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white leading-tight">
              Get Periodic Assessments & Applied Behavioral Insights Direct To Your Inbox
            </h3>
            <p className="text-xs md:text-sm text-stone-200/80 leading-relaxed font-sans max-w-xl">
              We send monthly deep dives on emotional maturity models, system diagnostic case studies, and corporate psychological alignment frameworks. Strictly professional. No sales pitch.
            </p>

            <form onSubmit={handleSubscribeNewsletter} className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your professional email address..."
                  disabled={newsletterStatus === 'submitting'}
                  className="w-full bg-white/10 placeholder:text-stone-300 text-stone-100 text-xs border border-white/20 focus:border-white focus:bg-white/15 rounded-2xl px-4 py-3.5 focus:outline-none transition-all font-sans"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={newsletterStatus === 'submitting'}
                className="px-6 py-3.5 bg-white text-[#104C64] hover:bg-stone-50 disabled:bg-stone-200 disabled:text-stone-400 font-black uppercase text-[10px] tracking-widest rounded-2xl cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {newsletterStatus === 'submitting' ? 'Subscribing...' : 'Subscribe'}
                <Send className="w-3 h-3 text-[#104C64]" />
              </button>
            </form>

            {newsletterStatus === 'submitted' && (
              <p className="text-xs text-teal-300 font-bold flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-4 h-4 text-teal-300" />
                {newsletterMsg}
              </p>
            )}

            {newsletterStatus === 'error' && (
              <p className="text-xs text-rose-300 font-bold flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-4 h-4 text-rose-300" />
                {newsletterMsg}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Advanced Full Screen Immersive Reading Experience Modal */}
      <AnimatePresence>
        {activePost && (
          <div className="fixed inset-0 z-150 flex items-stretch justify-end p-0 overflow-hidden" id="reading-pane-overlay">
            {/* Modal backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePost(null)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
              id="reading-pane-backdrop"
            />

            {/* Reading Drawer container right aligned */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 120 }}
              className="relative w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full z-10"
              id="reading-pane-body"
            >
              {/* Top sticky action panel */}
              <div className="px-6 md:px-10 py-5 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0 select-none">
                <button
                  onClick={() => setActivePost(null)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-stone-550 hover:text-stone-800 transition-colors"
                >
                  <X className="w-4 h-4 text-stone-550" />
                  Close
                </button>

                <div className="flex items-center gap-3">
                  {/* Bookmark State in Sticky Banner */}
                  <button
                    onClick={() => toggleBookmark(activePost.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-stone-50 hover:bg-stone-100 rounded-full border border-stone-200 text-stone-605 transition-all text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {bookmarkedIds.includes(activePost.id) ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Bookmarked</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-stone-500" />
                        <span>Bookmark</span>
                      </>
                    )}
                  </button>

                  {/* Share button (Copies simple simulation alert) */}
                  <button
                    onClick={() => {
                      safeCopyToClipboard(`${getInstantOrigin()}/blog#${activePost.id}`);
                      alert("Article link copied to clipboard!");
                    }}
                    className="p-2 bg-stone-50 hover:bg-stone-100 rounded-full border border-stone-200 hover:border-stone-450 text-stone-600 transition-all cursor-pointer"
                    title="Copy Article Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar representer */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#41B1C2] to-[#104C64] transition-all duration-100" style={{ width: `${readingProgress}%` }} />
              </div>

              {/* Scrollable Reading Content container */}
              <div 
                ref={modalBodyRef}
                onScroll={handleModalScroll}
                className="flex-1 overflow-y-auto px-6 md:px-12 py-10 md:py-16 space-y-10 focus:outline-none"
                id="reading-pane-content"
              >
                {/* Header Information */}
                <div className="space-y-6 border-b border-stone-200 pb-10">
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 bg-[#104C64]/5 text-[#104C64] text-[9.5px] font-black uppercase tracking-widest rounded-full border border-[#104C64]/20">
                      {activePost.category}
                    </span>
                    <span className="text-[10px] text-stone-500 font-semibold font-sans flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {activePost.date}
                    </span>
                    <span className="text-[10px] text-stone-500 font-semibold font-sans flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {activePost.readTime}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-4.5xl font-black text-[#104C64] leading-[1.125] uppercase tracking-tight font-sans">
                    {activePost.title}
                  </h2>

                  {/* Author profile block */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className={`w-12 h-12 rounded-full ${activePost.author.bgClass} flex items-center justify-center text-white text-sm font-black`}>
                      {activePost.author.avatarInitials}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#104C64]">{activePost.author.name}</h4>
                      <p className="text-[10px] uppercase tracking-wider text-stone-550 font-bold">{activePost.author.role}</p>
                    </div>
                  </div>
                </div>

                {/* Main Article Body Text, fully formatted with premium typography */}
                <div className="text-stone-850 font-serif text-lg leading-relaxed space-y-8 select-text">
                  <p className="font-sans text-stone-550 italic leading-relaxed text-sm md:text-base border-l-4 border-[#104C64] pl-5 py-2 select-text">
                    {activePost.content.introduction}
                  </p>

                  {/* Sections loop */}
                  {activePost.content.sections.map((section, sidx) => (
                    <div key={sidx} className="space-y-4">
                      <h3 className="font-sans font-black text-xl md:text-2xl text-[#104C64] uppercase tracking-tight pt-6 select-text">
                        {section.heading}
                      </h3>
                      
                      {/* Formatted Paragraphs */}
                      <div className="space-y-4 font-serif text-lg leading-relaxed select-text">
                        {section.body.split('\n').map((paragraph, pidx) => (
                          <p key={pidx} className="select-text">
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {section.quote && (
                        <div className="my-8 py-6 px-8 bg-stone-50 rounded-2xl border-l-4 border-[#41B1C2] italic text-stone-700 text-lg font-serif">
                          "{section.quote}"
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Conclusion */}
                  <div className="space-y-4 pt-6">
                    <h3 className="font-sans font-black text-lg text-[#104C64] uppercase tracking-widest select-text">
                      Strategic Conclusion
                    </h3>
                    <p className="select-text">
                      {activePost.content.conclusion}
                    </p>
                  </div>
                </div>

                {/* Footer Sign-off section */}
                <div className="border-t border-stone-200/80 pt-10 mt-16 space-y-8 text-center select-none">
                  <div className="max-w-md mx-auto space-y-3">
                    <p className="text-xs text-stone-500 font-sans">
                      This research article was published by the executive research team at BeyondEQ. We deploy peer evaluations, system interventions, and diagnostic tooling programs across corporations internationally.
                    </p>
                  </div>

                  <div className="flex justify-center gap-4 py-4">
                    <button
                      onClick={() => {
                        toggleBookmark(activePost.id);
                      }}
                      className="px-6 py-3 bg-[#104C64] text-white hover:bg-[#0D3E52] font-black uppercase text-[10px] tracking-widest rounded-full transition-colors cursor-pointer"
                    >
                      {bookmarkedIds.includes(activePost.id) ? 'Remove Bookmark' : 'Add to Bookmarks'}
                    </button>
                    <button
                      onClick={() => setActivePost(null)}
                      className="px-6 py-3 border border-stone-200 hover:border-stone-400 font-black uppercase text-[10px] tracking-widest text-stone-600 rounded-full transition-colors cursor-pointer"
                    >
                      Close article
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
