import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Radar as RadarComponent, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { Users, Share2, Copy, CheckCircle2, ChevronRight, Compass, Shield, BookOpen, UserCheck, Sparkles, HelpCircle, Lock, Mail, ChevronDown, Calendar, Clock, PlayCircle, Plus, Trash2, History, ClipboardList, PenTool, CheckSquare, Square, Heart, Brain, Activity, Flame, X, CreditCard, Smartphone, Building2, ShieldAlert, Download, ArrowRight, ArrowDown, Tag, Printer } from 'lucide-react';
import MoodTracker from './MoodTracker';
import { doc, updateDoc, serverTimestamp, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, getDoc, setDoc, increment, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import DiagnosticReport from './DiagnosticReport';
import { calculateThreeSixtyResults } from '../lib/threeSixtySkills';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getInstantOrigin } from '../lib/origin';

// --- FILE LEVEL HELPERS FOR HTML2CANVAS MODERN COLOR SPACE FIX ---
let canvasContextForConversion: CanvasRenderingContext2D | null = null;
try {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvasContextForConversion = canvas.getContext('2d');
} catch (e) {
  console.warn("Could not create canvas context for color normalization:", e);
}

function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  const hRad = (h * Math.PI) / 180;
  const a_lab = c * Math.cos(hRad);
  const b_lab = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const m_ = l - 0.1055613458 * a_lab - 0.0638541747 * b_lab;
  const s_ = l - 0.0894841775 * a_lab - 1.2914855414 * b_lab;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSRGB = (val: number) => {
    if (val <= 0.0031308) {
      return 12.92 * val;
    } else {
      return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
    }
  };

  const r = Math.max(0, Math.min(255, Math.round(toSRGB(r_lin) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(toSRGB(g_lin) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(toSRGB(b_lin) * 255)));

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function oklabToRgb(l: number, a_lab: number, b_lab: number, a: number = 1): string {
  const l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
  const m_ = l - 0.1055613458 * a_lab - 0.0638541747 * b_lab;
  const s_ = l - 0.0894841775 * a_lab - 1.2914855414 * b_lab;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSRGB = (val: number) => {
    if (val <= 0.0031308) {
      return 12.92 * val;
    } else {
      return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
    }
  };

  const r = Math.max(0, Math.min(255, Math.round(toSRGB(r_lin) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(toSRGB(g_lin) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(toSRGB(b_lin) * 255)));

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function parseOklch(str: string): { l: number, c: number, h: number, a: number } | null {
  const match = str.match(/oklch\(([^)]+)\)/i);
  if (!match) return null;
  
  const inner = match[1].trim();
  const normalized = inner.replace(/[,/]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = normalized.split(' ');
  if (parts.length < 3) return null;

  const parsePercentOrNum = (val: string, maxVal: number = 1): number => {
    const clean = val.trim();
    if (clean.endsWith('%')) {
      return (parseFloat(clean) / 100) * maxVal;
    }
    return parseFloat(clean);
  };

  let l = parsePercentOrNum(parts[0], 1);
  let c = parsePercentOrNum(parts[1], 0.4);
  
  let hVal = parts[2].trim();
  let h = 0;
  if (hVal.endsWith('deg')) {
    h = parseFloat(hVal);
  } else if (hVal.endsWith('rad')) {
    h = (parseFloat(hVal) * 180) / Math.PI;
  } else if (hVal.endsWith('turn')) {
    h = parseFloat(hVal) * 360;
  } else {
    h = parseFloat(hVal);
  }
  if (isNaN(h)) h = 0;

  let a = 1;
  if (parts.length >= 4) {
    a = parsePercentOrNum(parts[3], 1);
  }
  if (isNaN(a)) a = 1;

  return { l, c, h, a };
}

function parseOklab(str: string): { l: number, a_lab: number, b_lab: number, a: number } | null {
  const match = str.match(/oklab\(([^)]+)\)/i);
  if (!match) return null;
  const inner = match[1].trim();
  const normalized = inner.replace(/[,/]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = normalized.split(' ');
  if (parts.length < 3) return null;

  const parsePercentOrNum = (val: string, maxVal: number = 1): number => {
    const clean = val.trim();
    if (clean.endsWith('%')) {
      return (parseFloat(clean) / 100) * maxVal;
    }
    return parseFloat(clean);
  };

  let l = parsePercentOrNum(parts[0], 1);
  let a_lab = parsePercentOrNum(parts[1], 0.4);
  let b_lab = parsePercentOrNum(parts[2], 0.4);

  let a = 1;
  if (parts.length >= 4) {
    a = parsePercentOrNum(parts[3], 1);
  }
  if (isNaN(a)) a = 1;

  return { l, a_lab, b_lab, a };
}

function normalizeColorToRgb(colorStr: string): string {
  if (!colorStr) return colorStr;
  const trimmed = colorStr.trim().toLowerCase();

  if (trimmed.startsWith('oklch')) {
    const parsed = parseOklch(trimmed);
    if (parsed) {
      return oklchToRgb(parsed.l, parsed.c, parsed.h, parsed.a);
    }
  }

  if (trimmed.startsWith('oklab')) {
    const parsed = parseOklab(trimmed);
    if (parsed) {
      return oklabToRgb(parsed.l, parsed.a_lab, parsed.b_lab, parsed.a);
    }
  }

  if (canvasContextForConversion) {
    try {
      canvasContextForConversion.fillStyle = colorStr;
      const normalized = canvasContextForConversion.fillStyle;
      if (normalized && !normalized.includes('oklch') && !normalized.includes('oklab') && !normalized.includes('hwb') && !normalized.includes('lab') && !normalized.includes('lch') && !normalized.includes('color(')) {
        return normalized;
      }
    } catch (e) {}
  }

  if (trimmed.includes('stone') || trimmed.includes('slate') || trimmed.includes('#f') || trimmed.includes('neutral') || trimmed.includes('white') || trimmed.includes('zinc')) {
    return 'rgb(248, 250, 252)';
  }
  if (trimmed.includes('rose') || trimmed.includes('red') || trimmed.includes('gating')) {
    return 'rgb(254, 242, 242)';
  }
  if (trimmed.includes('blue') || trimmed.includes('deflation')) {
    return 'rgb(239, 246, 255)';
  }
  if (trimmed.includes('emerald') || trimmed.includes('green') || trimmed.includes('aligned')) {
    return 'rgb(240, 253, 244)';
  }
  if (trimmed.includes('purple') || trimmed.includes('split')) {
    return 'rgb(250, 245, 255)';
  }
  if (trimmed.includes('orange') || trimmed.includes('yellow') || trimmed.includes('amber')) {
    return 'rgb(255, 247, 237)';
  }

  let alpha = 1;
  const alphaMatch = colorStr.match(/\/[:\s]*([\d.]+)/);
  if (alphaMatch && alphaMatch[1]) {
    alpha = parseFloat(alphaMatch[1]);
  }
  if (alpha < 1) {
    return `rgba(240, 241, 242, ${alpha})`;
  }
  return 'rgb(250, 251, 252)';
}

function replaceColorsInString(cssValue: string): string {
  if (!cssValue) return cssValue;
  if (!cssValue.includes('oklch') && !cssValue.includes('oklab') && !cssValue.includes('hwb') && !cssValue.includes('lab') && !cssValue.includes('lch') && !cssValue.includes('color(')) {
    return cssValue;
  }
  
  const colorRegex = /(oklch|oklab|hwb|lab|lch|color)\((?:[^()]+|\([^()]*\))*\)/g;
  return cssValue.replace(colorRegex, (match) => {
    return normalizeColorToRgb(match);
  });
}

const colorProperties = [
  'color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'outlineColor', 'stroke', 'fill', 'stopColor', 'floodColor', 'lightingColor', 'boxShadow', 'textShadow'
];

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

const EnterpriseProgressTracker = ({ 
  profile, 
  activeAssessment, 
  setActiveAssessment 
}: { 
  profile: any; 
  activeAssessment: string; 
  setActiveAssessment: (val: string) => void; 
}) => {
  const completedCount = [
    profile?.enterpriseAssessmentsCompleted?.['1'],
    profile?.enterpriseAssessmentsCompleted?.['2'],
    profile?.enterpriseAssessmentsCompleted?.['3'],
    profile?.enterpriseAssessmentsCompleted?.['4']
  ].filter(Boolean).length;

  const percentage = completedCount * 25;

  const steps = [
    { id: '1', key: 'entValuesAudit', name: 'Values Audit Alignment', desc: 'Lived vs Stated parameters' },
    { id: '2', key: 'entCultureMap', name: 'Cultural Mapping', desc: 'Hidden networks & friction nodes' },
    { id: '3', key: 'entPerformanceLink', name: 'Performance Linkage', desc: 'Adaptive capacity correlates' },
    { id: '4', key: 'entEqDriver', name: 'Corporate EQ Drivers', desc: 'Underlying regulation indicators' },
  ];

  return (
    <div className="bg-white p-8 md:p-10 rounded-[35px] shadow-sm border border-gray-100 space-y-6">
      <div className="space-y-1.5 text-left">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">Corporate Diagnostic Matrix</span>
        <h3 className="text-sm font-black text-[#104C64] uppercase tracking-tight">Enterprise Progress Tracker</h3>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-stone-400">
          <span>Overall Alignment Compile</span>
          <span className="font-mono text-[#104C64] font-bold">{percentage}% Complete</span>
        </div>
        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-[#104C64] rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${percentage}%` }} 
          />
        </div>
      </div>

      {/* Diagnostics List */}
      <div className="space-y-2.5 text-left">
        {steps.map((st) => {
          const isCompleted = !!profile?.enterpriseAssessmentsCompleted?.[st.id];
          const isActive = activeAssessment === st.key;

          return (
            <button
              key={st.id}
              onClick={() => setActiveAssessment(st.key)}
              className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between text-left cursor-pointer group ${
                isActive 
                  ? 'bg-[#104C64]/5 border-[#104C64]/30 shadow-sm' 
                  : 'bg-stone-50 border-stone-200/50 hover:bg-stone-100/40 hover:border-stone-300'
              }`}
            >
              <div className="space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isActive ? 'text-[#104C64]' : 'text-stone-400'}`}>
                  0{st.id}. {st.name}
                </span>
                <span className="text-[11px] text-stone-550 block font-normal leading-tight">{st.desc}</span>
              </div>

              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold uppercase px-2.5 py-1 rounded-full border border-emerald-100">
                    ✓ Compiled
                  </span>
                ) : (
                  <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold uppercase px-2.5 py-1 rounded-full border border-amber-100">
                    Pending
                  </span>
                )}
                <ChevronRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${isActive ? 'text-[#104C64]' : 'text-stone-400'}`} />
              </div>
            </button>
          );
        })}

        {/* Master Report Row */}
        <button
          onClick={() => setActiveAssessment('entUnifiedReport')}
          className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between text-left cursor-pointer group ${
            activeAssessment === 'entUnifiedReport'
              ? 'bg-amber-500/5 border-amber-500/30 shadow-sm'
              : 'bg-amber-50/50 border-amber-200/30 hover:bg-amber-100/20'
          }`}
        >
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
              Unified Intelligence Blueprint
            </span>
            <span className="text-[11px] text-stone-550 block font-normal leading-tight">Consolidated printable board-level synthesis</span>
          </div>

          <div className="flex items-center gap-2">
            {completedCount === 4 ? (
              <span className="text-[9px] bg-amber-500 text-white font-extrabold uppercase px-2.5 py-1 rounded-full">
                Unlocked
              </span>
            ) : (
              <span className="text-[9px] bg-[#104C64]/5 text-[#104C64] font-extrabold uppercase px-2.5 py-1 rounded-full border border-[#104C64]/10">
                Awaiting
              </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-amber-600 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGapDetailsExpanded, setIsGapDetailsExpanded] = useState(false);
  const [isStreaksExpanded, setIsStreaksExpanded] = useState(false);
  const [enterpriseAnswers, setEnterpriseAnswers] = useState<Record<string, string>>({});
  const [enterpriseCurrentStep, setEnterpriseCurrentStep] = useState<number>(0);
  const [isEnterpriseCheckoutOpen, setIsEnterpriseCheckoutOpen] = useState(false);
  const [isCorporatePaying, setIsCorporatePaying] = useState(false);
  const [enterpriseInvites, setEnterpriseInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [newInviteName, setNewInviteName] = useState('');
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [isEnterpriseInviteModalOpen, setIsEnterpriseInviteModalOpen] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [enterpriseInviteName, setEnterpriseInviteName] = useState('');
  const [enterpriseInviteEmail, setEnterpriseInviteEmail] = useState('');
  const [enterpriseInviteRole, setEnterpriseInviteRole] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [enterpriseInviteError, setEnterpriseInviteError] = useState<string | null>(null);
  const [enterpriseInviteSuccess, setEnterpriseInviteSuccess] = useState<boolean>(false);
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<string>('');
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [teamMembersData, setTeamMembersData] = useState<any[]>([]);
  const [loadingTeamData, setLoadingTeamData] = useState(false);
  const [forceUnlockConsolidation, setForceUnlockConsolidation] = useState(false);
  const [consolidationRoleFilter, setConsolidationRoleFilter] = useState<'all' | 'above' | 'below'>('all');
  const [expandedConsolidationDims, setExpandedConsolidationDims] = useState<Record<string, boolean>>({});
  const [selectedScatterDim, setSelectedScatterDim] = useState<string>('va_overall');
  const [isPrintIframeWarnOpen, setIsPrintIframeWarnOpen] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async (filename: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn("Element not found for PDF download:", elementId);
      return;
    }

    setDownloadingPDF(true);
    
    // Modern Tailwind utilizes modern color spaces (like oklch or oklab) which html2canvas fails to parse and crashes on.
    // 1. We sanitize style tags temporarily.
    // 2. We hook window.getComputedStyle temporarily during rendering.
    const sanitizeOklchStylesheets = async (targetEl: HTMLElement) => {
      const styleElements = Array.from(document.querySelectorAll('style'));
      const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      
      const originalStyles = new Map<HTMLStyleElement, string>();
      const disabledLinks: { linkEl: HTMLLinkElement; tempStyleEl: HTMLStyleElement }[] = [];
      const elementsWithInlineStyles: { el: HTMLElement; originalStyle: string }[] = [];

      // A. Sanitize standard `<style>` elements
      styleElements.forEach((styleEl) => {
        try {
          const cssText = styleEl.textContent || styleEl.innerHTML;
          if (cssText && (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('hwb') || cssText.includes('lab') || cssText.includes('lch') || cssText.includes('color('))) {
            originalStyles.set(styleEl, cssText);
            styleEl.textContent = replaceColorsInString(cssText);
          }
        } catch (e) {
          console.warn("Could not sanitize stylesheet:", e);
        }
      });

      // B. Sanitize local `<link>` CSS references by fetching, modifying and replacing with inlines
      for (let i = 0; i < linkElements.length; i++) {
        const linkEl = linkElements[i];
        try {
          const href = linkEl.href;
          if (href && (href.startsWith('/') || href.startsWith(getInstantOrigin()))) {
            const response = await fetch(href);
            if (response.ok) {
              const cssText = await response.text();
              if (cssText && (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('hwb') || cssText.includes('lab') || cssText.includes('lch') || cssText.includes('color('))) {
                const sanitized = replaceColorsInString(cssText);
                
                const tempStyleEl = document.createElement('style');
                tempStyleEl.setAttribute('id', `temp-sanitized-style-${i}`);
                tempStyleEl.textContent = sanitized;
                document.head.appendChild(tempStyleEl);
                
                linkEl.disabled = true;
                disabledLinks.push({ linkEl, tempStyleEl });
              }
            }
          }
        } catch (e) {
          console.warn("Could not process and sanitize linked stylesheet:", linkEl.href, e);
        }
      }

      // C. Sanitize inline rules of the target and descendants
      if (targetEl) {
        const allDescendants = Array.from(targetEl.querySelectorAll('*')) as HTMLElement[];
        allDescendants.push(targetEl);
        allDescendants.forEach((el) => {
          try {
            if (el.getAttribute && el.getAttribute('style')) {
              const inlineStyle = el.getAttribute('style');
              if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('hwb') || inlineStyle.includes('lab') || inlineStyle.includes('lch') || inlineStyle.includes('color('))) {
                elementsWithInlineStyles.push({ el, originalStyle: inlineStyle });
                el.setAttribute('style', replaceColorsInString(inlineStyle));
              }
            }
          } catch (e) {
            console.warn("Could not sanitize inline style on element:", el, e);
          }
        });
      }

      // D. Setup our CSSStyleDeclaration.prototype and window.getComputedStyle override!
      const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
      CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
        const val = originalGetPropertyValue.call(this, property);
        if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color('))) {
          return replaceColorsInString(val);
        }
        return val;
      };

      const originalGetters: { [key: string]: any } = {};
      
      colorProperties.forEach(prop => {
        const desc = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, prop);
        if (desc && desc.get) {
          originalGetters[prop] = desc.get;
          Object.defineProperty(CSSStyleDeclaration.prototype, prop, {
            get() {
              const val = desc.get!.call(this);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color('))) {
                return replaceColorsInString(val);
              }
              return val;
            },
            configurable: true
          });
        }
      });

      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function(elt, pseudoElt) {
        const style = originalGetComputedStyle.call(window, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (typeof (target as any)[prop] === 'function') {
              if (prop === 'getPropertyValue') {
                return function(key: string) {
                  const rawVal = target.getPropertyValue(key);
                  if (rawVal && (rawVal.includes('oklch') || rawVal.includes('oklab') || rawVal.includes('hwb') || rawVal.includes('lab') || rawVal.includes('lch') || rawVal.includes('color('))) {
                    return replaceColorsInString(rawVal);
                  }
                  return rawVal;
                };
              }
              return (target as any)[prop].bind(target);
            }
            const val = typeof (target as any)[prop] === 'object' ? (target as any)[prop] : Reflect.get(target, prop, target);
            if (typeof val === 'string') {
              if (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color(')) {
                return replaceColorsInString(val);
              }
              return val;
            }
            return val;
          }
        });
      };

      return () => {
        // Restore standard `<style>` elements
        originalStyles.forEach((cssText, styleEl) => {
          try {
            styleEl.textContent = cssText;
          } catch (e) {
            console.warn("Could not restore stylesheet:", e);
          }
        });

        // Re-enable original `<link>` elements and clean up temporary tags
        disabledLinks.forEach(({ linkEl, tempStyleEl }) => {
          try {
            linkEl.disabled = false;
            if (tempStyleEl.parentNode) {
              tempStyleEl.parentNode.removeChild(tempStyleEl);
            }
          } catch (e) {
            console.warn("Could not restore linked stylesheet:", e);
          }
        });

        // Restore inline styles
        elementsWithInlineStyles.forEach(({ el, originalStyle }) => {
          try {
            el.setAttribute('style', originalStyle);
          } catch (e) {
            console.warn("Could not restore inline style on element:", el, e);
          }
        });

        // Tear down our CSSStyleDeclaration.prototype overrides
        CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
        
        colorProperties.forEach(prop => {
          if (originalGetters[prop]) {
            Object.defineProperty(CSSStyleDeclaration.prototype, prop, {
              get: originalGetters[prop],
              configurable: true
            });
          }
        });

        // Tear down our window.getComputedStyle override
        window.getComputedStyle = originalGetComputedStyle;
      };
    };

    let restoreStyles = () => {};
    try {
      restoreStyles = await sanitizeOklchStylesheets(element);
    } catch (e) {
      console.warn("Failed to sanitize stylesheets/computed styles:", e);
    }

    try {
      const originalStyle = element.style.height;
      const originalOverflow = element.style.overflow;
      const originalWidth = element.style.width;
      
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            if (clonedWindow.CSSStyleDeclaration && clonedWindow.CSSStyleDeclaration.prototype) {
              // Overwrite getPropertyValue inside iframe
              const origIframeGetPropVal = clonedWindow.CSSStyleDeclaration.prototype.getPropertyValue;
              clonedWindow.CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
                const val = origIframeGetPropVal.call(this, property);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color('))) {
                  return replaceColorsInString(val);
                }
                return val;
              };
              
              // Overwrite color property descriptors on clonedWindow’s CSSStyleDeclaration.prototype
              colorProperties.forEach(prop => {
                const desc = Object.getOwnPropertyDescriptor(clonedWindow.CSSStyleDeclaration.prototype, prop);
                if (desc && desc.get) {
                  Object.defineProperty(clonedWindow.CSSStyleDeclaration.prototype, prop, {
                    get() {
                      const val = desc.get!.call(this);
                      if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color('))) {
                        return replaceColorsInString(val);
                      }
                      return val;
                    },
                    configurable: true
                  });
                }
              });
            }

            // Also proxy the window.getComputedStyle inside the cloned Window
            const originalIframeGetComputedStyle = clonedWindow.getComputedStyle;
            clonedWindow.getComputedStyle = function(elt, pseudoElt) {
              const style = originalIframeGetComputedStyle.call(clonedWindow, elt, pseudoElt);
              return new Proxy(style, {
                get(target, prop) {
                  if (typeof (target as any)[prop] === 'function') {
                    if (prop === 'getPropertyValue') {
                      return function(key: string) {
                        const rawVal = target.getPropertyValue(key);
                        if (rawVal && (rawVal.includes('oklch') || rawVal.includes('oklab') || rawVal.includes('hwb') || rawVal.includes('lab') || rawVal.includes('lch') || rawVal.includes('color('))) {
                          return replaceColorsInString(rawVal);
                        }
                        return rawVal;
                      };
                    }
                    return (target as any)[prop].bind(target);
                  }
                  const val = typeof (target as any)[prop] === 'object' ? (target as any)[prop] : Reflect.get(target, prop, target);
                  if (typeof val === 'string') {
                    if (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color(')) {
                      return replaceColorsInString(val);
                    }
                    return val;
                  }
                  return val;
                }
              });
            };

            // Sanitize all inline styles on target element and descendants in clonedDoc
            const allClonedDescendants = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
            allClonedDescendants.forEach((el) => {
              try {
                if (el.getAttribute && el.getAttribute('style')) {
                  const inlineStyle = el.getAttribute('style');
                  if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('oklab') || inlineStyle.includes('hwb') || inlineStyle.includes('lab') || inlineStyle.includes('lch') || inlineStyle.includes('color('))) {
                    el.setAttribute('style', replaceColorsInString(inlineStyle));
                  }
                }
              } catch (e) {
                console.warn("Could not sanitize cloned inline style:", el, e);
              }
            });

            // Sanitize all cloned style tags inside the cloned document
            const clonedStyles = Array.from(clonedDoc.querySelectorAll('style'));
            clonedStyles.forEach((styleEl) => {
              try {
                const cssText = styleEl.textContent || styleEl.innerHTML;
                if (cssText && (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('hwb') || cssText.includes('lab') || cssText.includes('lch') || cssText.includes('color('))) {
                  styleEl.textContent = replaceColorsInString(cssText);
                }
              } catch (e) {
                console.warn("Could not sanitize cloned style element:", e);
              }
            });
          }
        }
      });

      element.style.height = originalStyle;
      element.style.overflow = originalOverflow;
      element.style.width = originalWidth;

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const docPdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      docPdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        docPdf.addPage();
        docPdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      docPdf.save(filename);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      alert(`⚠️ PDF Download Generation Timeout or Sandbox Prevention:\n\nIf you are on the AI Studio preview window, please use the "Open in new tab" icon at the top right of the application to bypass browser sandboxing restrictions.\n\nError details: ${err?.message || err}`);
    } finally {
      restoreStyles();
      setDownloadingPDF(false);
    }
  };

  const handlePrintReport = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (document.getElementById("ent-unified-report-container")) {
      handleDownloadPDF("BeyondEQ_Unified_Strategic_Report.pdf", "ent-unified-report-container");
    } else if (document.getElementById("ent-multirater-consolidation-container")) {
      handleDownloadPDF("BeyondEQ_Frontline_Consolidation_Report.pdf", "ent-multirater-consolidation-container");
    } else {
      alert("Preparing report content for download. Please ensure the report module is fully visible.");
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const adminUid = profile?.enterpriseInvitedBy || user.uid;
    if (!adminUid) return;

    const invitesRef = collection(db, 'users', adminUid, 'organizationInvites');
    
    setLoadingTeamData(true);
    const unsubscribeInvites = onSnapshot(invitesRef, async (snapshot) => {
      const invites = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      try {
        const promises = invites
          .filter((invite: any) => invite.uid)
          .map(async (invite: any) => {
            const uDoc = await getDoc(doc(db, 'users', invite.uid));
            if (uDoc.exists()) {
              return {
                ...invite,
                ...uDoc.data()
              };
            }
            return invite;
          });

        const adminDoc = await getDoc(doc(db, 'users', adminUid));
        const adminData = adminDoc.exists() ? adminDoc.data() : null;

        const members = await Promise.all(promises);
        
        const pendingMembers = invites
          .filter((invite: any) => !invite.uid && invite.status !== 'claimed')
          .map((invite: any) => ({
            id: invite.id,
            name: invite.name,
            email: invite.email,
            role: invite.designation || 'Teammate',
            roleKey: 'below',
            status: 'pending',
            enterpriseAssessmentsCompleted: {},
            isPrimary: false,
            isPendingSlot: true
          }));
        
        const fullTeam = [];
        if (adminData) {
          fullTeam.push({
            uid: adminUid,
            name: adminData.name || 'Primary Admin',
            role: adminData.designation || 'Senior Leadership',
            roleKey: 'above',
            enterpriseAssessmentsCompleted: adminData.enterpriseAssessmentsCompleted || {},
            enterpriseAnswers_1: adminData.enterpriseAnswers_1 || null,
            enterpriseAnswers_2: adminData.enterpriseAnswers_2 || null,
            enterpriseAnswers_3: adminData.enterpriseAnswers_3 || null,
            enterpriseAnswers_4: adminData.enterpriseAnswers_4 || null,
            isPrimary: true
          });
        }

        members.forEach((m: any, idx) => {
          let role = m.designation || 'Teammate';
          let roleKey = 'below';
          if (role.toLowerCase().includes('director') || role.toLowerCase().includes('executive') || role.toLowerCase().includes('lead') || role.toLowerCase().includes('chief') || role.toLowerCase().includes('head')) {
            roleKey = 'above';
          } else if (role.toLowerCase().includes('manager')) {
            roleKey = 'above';
          } else if (idx % 2 === 1) {
            roleKey = 'below';
          }

          fullTeam.push({
            uid: m.uid,
            name: m.name || m.email?.split('@')[0] || `Colleague ${idx + 1}`,
            role: role,
            roleKey: roleKey,
            theme: m.company || 'Corporate Teammate',
            enterpriseAssessmentsCompleted: m.enterpriseAssessmentsCompleted || {},
            enterpriseAnswers_1: m.enterpriseAnswers_1 || null,
            enterpriseAnswers_2: m.enterpriseAnswers_2 || null,
            enterpriseAnswers_3: m.enterpriseAnswers_3 || null,
            enterpriseAnswers_4: m.enterpriseAnswers_4 || null,
            isPrimary: false
          });
        });

        pendingMembers.forEach((m: any) => {
          let role = m.role || 'Teammate';
          let roleKey = 'below';
          if (role.toLowerCase().includes('director') || role.toLowerCase().includes('executive') || role.toLowerCase().includes('lead') || role.toLowerCase().includes('chief') || role.toLowerCase().includes('head')) {
            roleKey = 'above';
          } else if (role.toLowerCase().includes('manager')) {
            roleKey = 'above';
          }

          fullTeam.push({
            id: m.id,
            name: m.name,
            email: m.email,
            role: role,
            roleKey: roleKey,
            status: 'pending',
            enterpriseAssessmentsCompleted: {},
            isPrimary: false,
            isPendingSlot: true
          });
        });

        setTeamMembersData(fullTeam);
      } catch (err) {
        console.error("Error fetching team data in listener:", err);
      } finally {
        setLoadingTeamData(false);
      }
    }, (err) => {
      console.error("Error subscribing to team invites:", err);
      setLoadingTeamData(false);
    });

    return () => unsubscribeInvites();
  }, [user, profile?.enterpriseInvitedBy]);

  const completedTeammatesCount = teamMembersData.filter(m => {
    return !!m.enterpriseAssessmentsCompleted?.['1'] && 
           !!m.enterpriseAssessmentsCompleted?.['2'] && 
           !!m.enterpriseAssessmentsCompleted?.['3'] && 
           !!m.enterpriseAssessmentsCompleted?.['4'];
  }).length;

  const isConsolidationUnlocked = completedTeammatesCount >= 5 || (profile as any)?.hasAdminMasterAccess === true;

  const getDimensionScores = (dimId: string, roleFilter: string) => {
    let members = teamMembersData;
    if (roleFilter !== 'all') {
      members = teamMembersData.filter(m => m.roleKey === roleFilter);
    }
    
    const fallbacks: Record<string, { above: number, below: number }> = {
      'va_overall': { above: 4.5, below: 2.2 },
      'va_leadership': { above: 4.8, below: 2.5 },
      'va_culture': { above: 4.2, below: 1.8 },
      'va_accountability': { above: 4.6, below: 2.0 },
      'cm_thriving': { above: 4.4, below: 2.3 },
      'cm_weakening': { above: 1.9, below: 4.4 },
      'cm_invisible': { above: 2.2, below: 4.1 },
      'cm_protected': { above: 2.1, below: 3.9 },
      'pl_overall': { above: 4.6, below: 2.4 },
      'pl_people': { above: 4.2, below: 2.1 },
      'pl_decisions': { above: 4.5, below: 2.2 },
      'eq_emm': { above: 4.3, below: 2.3 }
    };

    let sum = 0;
    let count = 0;

    members.forEach(m => {
      let ans_1 = m.enterpriseAnswers_1 || null;
      let ans_2 = m.enterpriseAnswers_2 || null;
      let ans_3 = m.enterpriseAnswers_3 || null;
      let ans_4 = m.enterpriseAnswers_4 || null;

      let score = null;
      
      if (dimId === 'va_overall' && ans_1) {
        score = ans_1.reduce((a: number, b: number) => a + b, 0) / 5;
      } else if (dimId === 'va_leadership' && ans_1) {
        score = (ans_1[0] + ans_1[1]) / 2;
      } else if (dimId === 'va_culture' && ans_1) {
        score = ans_1[2];
      } else if (dimId === 'va_accountability' && ans_1) {
        score = ans_1[3];
      } else if (dimId === 'cm_thriving' && ans_2) {
        score = ans_2[0];
      } else if (dimId === 'cm_weakening' && ans_2) {
        score = ans_2[1];
      } else if (dimId === 'cm_invisible' && ans_2) {
        score = ans_2[2];
      } else if (dimId === 'cm_protected' && ans_2) {
        score = ans_2[3];
      } else if (dimId === 'pl_overall' && ans_3) {
        score = ans_3.reduce((a: number, b: number) => a + b, 0) / 5;
      } else if (dimId === 'pl_people' && ans_3) {
        score = ans_3[1];
      } else if (dimId === 'pl_decisions' && ans_3) {
        score = ans_3[2];
      } else if (dimId === 'eq_emm' && ans_4) {
        score = ans_4.reduce((a: number, b: number) => a + b, 0) / 5;
      }

      if (score !== null) {
        sum += score;
        count++;
      }
    });

    if (count > 0) {
      return parseFloat((sum / count).toFixed(1));
    }

    const fb = fallbacks[dimId] || { above: 4.0, below: 2.5 };
    if (roleFilter === 'above') return fb.above;
    if (roleFilter === 'below') return fb.below;
    return parseFloat(((fb.above + fb.below) / 2).toFixed(1));
  };

  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    const friendsRef = collection(db, 'users', user.uid, 'friends');
    const unsubscribe = onSnapshot(friendsRef, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setFriends(docs);
      setLoadingFriends(false);
    }, (err) => {
      console.error("Error subscribing to friends list:", err);
      setLoadingFriends(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !profile || !friends || friends.length === 0) return;
    
    const activeSynergy = friends.find(f => (f.streak || 0) >= 30);
    if (activeSynergy) {
      const currentTier = (profile as any)?.tier || 'free';
      const alreadyPromo = (profile as any)?.premiumPromoActive === true;
      
      if (currentTier !== 'premium' || !alreadyPromo) {
        const userDocRef = doc(db, 'users', user.uid);
        updateDoc(userDocRef, {
          tier: 'premium',
          premiumPromoActive: true,
          streakPromoActivatedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }).then(() => {
          setStreakPromoFriendName(activeSynergy.friendName);
          setIsStreakPromoSuccessOpen(true);
        }).catch((err) => {
          console.error("Error activating 30-day streak free premium promotion:", err);
        });
      }
    }
  }, [user, profile, friends]);

  useEffect(() => {
    const handlePendingFriendship = async () => {
      if (!user || !profile) return;
      const pendingInvitedBy = localStorage.getItem('pending_invitedBy');
      if (!pendingInvitedBy) return;

      if (pendingInvitedBy === user.uid) {
        localStorage.removeItem('pending_invitedBy');
        return;
      }

      if (loadingFriends) return;
      
      const alreadyFriends = friends.some(f => f.friendId === pendingInvitedBy);
      if (alreadyFriends) {
        localStorage.removeItem('pending_invitedBy');
        return;
      }

      try {
        const inviterDocRef = doc(db, 'users', pendingInvitedBy);
        const inviterSnap = await getDoc(inviterDocRef);
        if (inviterSnap.exists()) {
          const inviterData = inviterSnap.data();
          const inviterName = inviterData?.name || 'BeyondEQ Member';
          const inviterEmail = inviterData?.email || 'info@beyondeq.org';

          // 1. Create friend doc under inviter's friends collection
          await setDoc(doc(db, 'users', pendingInvitedBy, 'friends', user.uid), {
            friendId: user.uid,
            friendName: profile.name || user.displayName || 'BeyondEQ Partner',
            friendEmail: user.email || '',
            streak: 1,
            lastActive: serverTimestamp(),
            createdAt: serverTimestamp()
          });

          // 2. Create friend doc under our own friends collection
          await setDoc(doc(db, 'users', user.uid, 'friends', pendingInvitedBy), {
            friendId: pendingInvitedBy,
            friendName: inviterName,
            friendEmail: inviterEmail,
            streak: 1,
            lastActive: serverTimestamp(),
            createdAt: serverTimestamp()
          });

          console.log("Successfully established mutual EQ streak connection!");
        }
      } catch (err) {
        console.error("Error establishing pending friendship connection on dashboard:", err);
      } finally {
        localStorage.removeItem('pending_invitedBy');
      }
    };

    handlePendingFriendship();
  }, [user, profile, friends, loadingFriends]);

  useEffect(() => {
    const handlePendingEnterpriseInvite = async () => {
      if (!user || !profile) return;
      const pendingEnterpriseInvitedBy = localStorage.getItem('pending_enterprise_invitedBy');
      if (!pendingEnterpriseInvitedBy) return;

      if (pendingEnterpriseInvitedBy === user.uid) {
        localStorage.removeItem('pending_enterprise_invitedBy');
        localStorage.removeItem('pending_enterprise_email');
        localStorage.removeItem('pending_enterprise_name');
        localStorage.removeItem('pending_enterprise_designation');
        return;
      }

      try {
        const inviterDocRef = doc(db, 'users', pendingEnterpriseInvitedBy);
        const inviterSnap = await getDoc(inviterDocRef);
        
        let companyName = 'Enterprise Team';
        let companyLocation = '';
        if (inviterSnap.exists()) {
          companyName = inviterSnap.data()?.company || 'Enterprise Team';
          companyLocation = inviterSnap.data()?.location || '';
        }

        const savedEmail = localStorage.getItem('pending_enterprise_email') || user.email || '';
        const savedName = localStorage.getItem('pending_enterprise_name') || profile.name || user.displayName || 'Enterprise Member';
        const savedDesignation = localStorage.getItem('pending_enterprise_designation') || (profile as any).designation || 'Team Member';

        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          userType: 'enterprise',
          enterpriseInvitedBy: pendingEnterpriseInvitedBy,
          company: companyName,
          location: companyLocation,
          designation: savedDesignation,
          email: savedEmail,
          enterpriseAssessmentsCompleted: (profile as any).enterpriseAssessmentsCompleted || {
            1: false,
            2: false,
            3: false,
            4: false
          }
        }, { merge: true });

        // Update inviter's organization invite state
        const orgInviteRef = doc(db, 'users', pendingEnterpriseInvitedBy, 'organizationInvites', user.uid);
        await setDoc(orgInviteRef, {
          uid: user.uid,
          name: savedName,
          email: savedEmail.toLowerCase(),
          designation: savedDesignation,
          status: 'registered',
          registeredAt: serverTimestamp()
        }, { merge: true });

        console.log("Successfully synced enterprise workspaces and assessments linkage on dashboard!");
      } catch (err) {
        console.error("Error setting up pending enterprise linkage on dashboard:", err);
      } finally {
        localStorage.removeItem('pending_enterprise_invitedBy');
        localStorage.removeItem('pending_enterprise_email');
        localStorage.removeItem('pending_enterprise_name');
        localStorage.removeItem('pending_enterprise_designation');
      }
    };

    handlePendingEnterpriseInvite();
  }, [user, profile]);

  useEffect(() => {
    if (!user || profile?.userType !== 'enterprise') return;
    setLoadingInvites(true);
    const invitesRef = collection(db, 'users', user.uid, 'organizationInvites');
    const unsubscribe = onSnapshot(invitesRef, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setEnterpriseInvites(docs);
      setLoadingInvites(false);
    }, (err) => {
      console.error("Error subscribing to enterprise invites:", err);
      setLoadingInvites(false);
    });
    return () => unsubscribe();
  }, [user, profile]);

  const handleAddEnterpriseInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!newInviteName || !newInviteEmail) {
      alert("Please enter both Name and Email ID.");
      return;
    }
    if (enterpriseInvites.length >= 5) {
      alert("Enterprise Tier invitation cap is strictly set to 5 members.");
      return;
    }
    const cleanEmail = newInviteEmail.trim().toLowerCase();

    // Verify official email
    const isOfficialEmail = (email: string) => {
      const genericDomains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
        'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'live.com',
        'msn.com', 'yandex.com', 'gmx.com'
      ];
      const domain = email.trim().split('@')[1]?.toLowerCase();
      if (!domain) return false;
      return !genericDomains.includes(domain);
    };

    if (!isOfficialEmail(cleanEmail)) {
      alert("Public email providers like Gmail, Yahoo or Hotmail are restricted for corporate team members. Please enter your colleague's official workplace email.");
      return;
    }

    // Verify same domain
    const teammateDomain = cleanEmail.split('@')[1]?.toLowerCase() || '';
    const inviterDomain = (user.email || '').trim().split('@')[1]?.toLowerCase() || '';
    
    if (inviterDomain && teammateDomain !== inviterDomain) {
      alert(`Domain restriction: Collaborators must belong to your organization's domain. Please invite using an email ending with '@${inviterDomain}'.`);
      return;
    }
    
    // Check if email already invited
    if (enterpriseInvites.some(invite => invite.email === cleanEmail)) {
      alert("This email has already been allocated an invite space.");
      return;
    }

    setIsInviting(true);
    try {
      const inviteId = doc(collection(db, 'users', user.uid, 'organizationInvites')).id;
      await setDoc(doc(db, 'users', user.uid, 'organizationInvites', inviteId), {
        id: inviteId,
        name: newInviteName,
        email: cleanEmail,
        status: 'pending',
        invitedAt: serverTimestamp()
      });
      setNewInviteName('');
      setNewInviteEmail('');
      alert(`Outstanding! Onboarding slot allocated for ${newInviteName}. Copy their custom team link below to onboard them.`);
    } catch (err: any) {
      console.error("Error creating team invite:", err);
      alert("Error creating invite: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleOpenEnterpriseInviteModal = (seatIndex: number) => {
    setSelectedSeatIndex(seatIndex);
    setEnterpriseInviteName('');
    setEnterpriseInviteEmail('');
    setEnterpriseInviteRole('');
    setEnterpriseInviteError(null);
    setEnterpriseInviteSuccess(false);
    setNewlyCreatedLink('');
    setIsEnterpriseInviteModalOpen(true);
  };

  const handleConfirmEnterpriseSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setEnterpriseInviteError(null);

    if (!enterpriseInviteName.trim() || !enterpriseInviteEmail.trim() || !enterpriseInviteRole.trim()) {
      setEnterpriseInviteError("Please enter Name, Email, and Designation.");
      return;
    }
    // We count overall members (either registered or pending)
    if (teamMembersData.length >= 5) {
      setEnterpriseInviteError("Enterprise Tier invitation cap is strictly set to 5 members.");
      return;
    }
    const cleanEmail = enterpriseInviteEmail.trim().toLowerCase();

    const genericDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
      'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'live.com',
      'msn.com', 'yandex.com', 'gmx.com'
    ];

    // Verify official email
    const isOfficialEmail = (email: string) => {
      const domain = email.trim().split('@')[1]?.toLowerCase();
      if (!domain) return false;
      return !genericDomains.includes(domain);
    };

    if (!isOfficialEmail(cleanEmail)) {
      setEnterpriseInviteError("Public email providers like Gmail, Yahoo or Hotmail are restricted for corporate team members. Please enter your colleague's official workplace email.");
      return;
    }

    // Verify same domain
    const teammateDomain = cleanEmail.split('@')[1]?.toLowerCase() || '';
    const inviterDomain = (user.email || '').trim().split('@')[1]?.toLowerCase() || '';
    const isInviterOnPublicDomain = genericDomains.includes(inviterDomain);
    
    if (inviterDomain && !isInviterOnPublicDomain && teammateDomain !== inviterDomain) {
      setEnterpriseInviteError(`Domain restriction: Collaborators must belong to your organization's domain. Please invite using an email ending with '@${inviterDomain}'.`);
      return;
    }
    
    // Check if email already invited
    const isAlreadyInvited = teamMembersData.some(m => m.email?.toLowerCase() === cleanEmail);
    if (isAlreadyInvited) {
      setEnterpriseInviteError("This email has already been allocated an invite space.");
      return;
    }

    setIsInviting(true);
    try {
      const inviteId = doc(collection(db, 'users', user.uid, 'organizationInvites')).id;
      await setDoc(doc(db, 'users', user.uid, 'organizationInvites', inviteId), {
        id: inviteId,
        name: enterpriseInviteName.trim(),
        email: cleanEmail,
        designation: enterpriseInviteRole.trim(),
        status: 'pending',
        invitedAt: serverTimestamp()
      });
      
      const teammateDomain = cleanEmail.split('@')[1]?.toLowerCase() || '';
      const inviterDomain = (user.email || '').trim().split('@')[1]?.toLowerCase() || '';
      const isSameDomain = teammateDomain === inviterDomain;

      const isOfficialEmail = (email: string) => {
        const genericDomains = [
          'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
          'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'live.com',
          'msn.com', 'yandex.com', 'gmx.com'
        ];
        const domain = email.trim().split('@')[1]?.toLowerCase();
        if (!domain) return false;
        return !genericDomains.includes(domain);
      };

      const isSameAndOfficial = isSameDomain && teammateDomain && isOfficialEmail(cleanEmail);

      const customLink = isSameAndOfficial
        ? `${getInstantOrigin()}/instant-assessment?adminId=${user.uid}&inviteId=${inviteId}`
        : `${getInstantOrigin()}/register?enterpriseInvitedBy=${user.uid}&email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(enterpriseInviteName.trim())}&designation=${encodeURIComponent(enterpriseInviteRole.trim())}`;
      safeCopyToClipboard(customLink);
      setNewlyCreatedLink(customLink);

      // Trigger the backend email invitation outbox
      try {
        await fetch('/api/invite-corporate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            colleagueEmail: cleanEmail,
            colleagueName: enterpriseInviteName.trim(),
            colleagueRole: enterpriseInviteRole.trim(),
            adminName: profile?.name || user.displayName || user.email || 'Your Administrator',
            adminUid: user.uid,
            seatIndex: selectedSeatIndex,
            origin: getInstantOrigin(),
            inviteId: inviteId,
            isSameDomain: isSameAndOfficial
          })
        });
      } catch (emailErr) {
        console.error("Email dispatch failed:", emailErr);
      }

      setEnterpriseInviteSuccess(true);
    } catch (err: any) {
      console.error("Error creating team invite:", err);
      setEnterpriseInviteError("Error creating invite: " + err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveEnterpriseInvite = async (inviteId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'organizationInvites', inviteId));
    } catch (err: any) {
      console.error("Error removing invite:", err);
    }
  };

  const handleNudgeStreak = async (friendId: string) => {
    if (!user || !profile) return;
    try {
      const myFriendDocRef = doc(db, 'users', user.uid, 'friends', friendId);
      const theirFriendDocRef = doc(db, 'users', friendId, 'friends', user.uid);
      
      const friendData = friends.find(f => f.friendId === friendId);
      const currentStreak = friendData?.streak || 1;
      const nextStreak = currentStreak + 1;
      
      await updateDoc(myFriendDocRef, {
        streak: nextStreak,
        lastActive: serverTimestamp()
      });

      await updateDoc(theirFriendDocRef, {
        streak: nextStreak,
        lastActive: serverTimestamp()
      });

      alert(`Whoosh! You advanced your joint EQ streak with ${friendData?.friendName || 'your partner'} to ${nextStreak} Days! 🔥 Keep the momentum stable.`);
    } catch (err: any) {
      console.error("Error nudging streak:", err);
      alert("Error nudging streak: " + err.message);
    }
  };
  const [showSuccessToast, setShowSuccessToast] = useState(!!location.state?.showSuccessBanner);

  // Default selection state. Detect based on what they've finished
  const isIntroCompleted = !!(
    profile?.introPhilosophyCompleted &&
    profile?.introTemplateCompleted &&
    profile?.introTutorialCompleted
  );
  const isSelfDiscoveryCompleted = !!(profile as any)?.selfDiscoveryCompleted;
  const isThreeSixtySelfCompleted = !!(profile as any)?.threeSixtySelfCompleted;
  const isFoundationCompleted = !!profile?.assessmentScores;
  const isThreeSixtyCompleted = !!(profile as any)?.threeSixtyCompleted;
  
  const userTier = (profile as any)?.tier || 'free';
  const isEnterprise = profile?.userType === 'enterprise' || !!profile?.enterpriseInvitedBy;
  const completedAuditsCount = Object.entries(profile?.enterpriseAssessmentsCompleted || {})
    .filter(([key, val]) => (key === '1' || key === '2' || key === '3' || key === '4') && val)
    .length;
  const [isPremiumSuccessModalOpen, setIsPremiumSuccessModalOpen] = useState(false);
  const [isStreakPromoSuccessOpen, setIsStreakPromoSuccessOpen] = useState(false);
  const [streakPromoFriendName, setStreakPromoFriendName] = useState('');
  const [isTool5SuccessModalOpen, setIsTool5SuccessModalOpen] = useState(false);

  // Razorpay integration local state
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [cardNo, setCardNo] = useState('4111 2222 3333 4444');
  const [cardEx, setCardEx] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('777');
  const [cardName, setCardName] = useState(profile?.name || '');
  const [upiId, setUpiId] = useState('sunnydev30@oksbi');
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Promo Code local states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isPromoExpanded, setIsPromoExpanded] = useState(false);
  const [isPromoVerifying, setIsPromoVerifying] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  // Helper loader for Razorpay Checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgradeToPremium = async () => {
    if (!user) return;
    setIsUpgradeModalOpen(true);
  };

  const handleProcessEnterprisePayment = async () => {
    if (!user) return;
    setIsCorporatePaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Payment checkout script. Please check your connectivity.");
      }

      // Create internal checkout order
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: 'enterprise' }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create order on server.");
      }

      const { order } = data;

      // Initialize Razorpay payment overlay
      const rzpOptions = {
        key: "rzp_live_Sv8BcGVD9eIBQT", // Provided Live Key ID
        amount: order.amount,
        currency: order.currency,
        name: "BeyondEQ Enterprise Activation",
        description: "Unified Executive Insights Activation Package",
        order_id: order.id,
        handler: async function (paymentResponse: any) {
          try {
            // Verify signature back on server
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // Upgrade user's tier inside Firestore
              const userDocRef = doc(db, 'users', user.uid);
              await updateDoc(userDocRef, {
                tier: 'premium',
                updatedAt: serverTimestamp()
              });
              setIsEnterpriseCheckoutOpen(false);
              setIsPremiumSuccessModalOpen(true);
            } else {
              alert("Payment verification mismatch: " + (verifyData.error || "Authorization declined."));
            }
          } catch (verifyErr: any) {
            console.error("Verification processing failed:", verifyErr);
            alert("Error verifying payment signature: " + (verifyErr.message || "Request timed out."));
          } finally {
            setIsCorporatePaying(false);
          }
        },
        prefill: {
          name: profile?.name || user.displayName || cardName || "",
          email: user.email || "",
          method: paymentMethod,
          vpa: paymentMethod === 'upi' ? upiId : undefined,
          bank: paymentMethod === 'netbanking' ? selectedBank : undefined,
        },
        theme: {
          color: "#104C64",
        },
        modal: {
          ondismiss: function () {
            setIsCorporatePaying(false);
          }
        }
      };

      const razorpayInstance = new (window as any).Razorpay(rzpOptions);
      razorpayInstance.open();

    } catch (err: any) {
      console.error("RazorPay enterprise transaction sequence error:", err);
      alert(err.message || "An unexpected error occurred while loading payment checkout.");
      setIsCorporatePaying(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!user) return;
    setIsPaymentProcessing(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay Payment checkout script. Please check your connectivity.");
      }

      // Create internal checkout order
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create order on server.");
      }

      const { order } = data;

      // Initialize Razorpay payment overlay
      const rzpOptions = {
        key: "rzp_live_Sv8BcGVD9eIBQT", // Provided Live Key ID
        amount: order.amount,
        currency: order.currency,
        name: "BeyondEQ Premium",
        description: selectedPlan === "annual" ? "Annual Premium Protocol (20% Discount)" : "Monthly Premium Protocol Subscription",
        order_id: order.id,
        handler: async function (paymentResponse: any) {
          try {
            // Verify signature back on server
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              // Upgrade user's tier inside Firestore
              const userDocRef = doc(db, 'users', user.uid);
              await updateDoc(userDocRef, {
                tier: 'premium',
                updatedAt: serverTimestamp()
              });
              setIsUpgradeModalOpen(false);
              setIsPremiumSuccessModalOpen(true);
            } else {
              alert("Payment verification mismatch: " + (verifyData.error || "Authorization declined."));
            }
          } catch (verifyErr: any) {
            console.error("Verification processing failed:", verifyErr);
            alert("Error verifying payment signature: " + (verifyErr.message || "Request timed out."));
          } finally {
            setIsPaymentProcessing(false);
          }
        },
        prefill: {
          name: profile?.name || user.displayName || cardName || "",
          email: user.email || "",
          method: paymentMethod,
          vpa: paymentMethod === 'upi' ? upiId : undefined,
          bank: paymentMethod === 'netbanking' ? selectedBank : undefined,
        },
        theme: {
          color: "#104C64",
        },
        modal: {
          ondismiss: function () {
            setIsPaymentProcessing(false);
          }
        }
      };

      const razorpayInstance = new (window as any).Razorpay(rzpOptions);
      razorpayInstance.open();

    } catch (err: any) {
      console.error("RazorPay transaction sequence error:", err);
      alert(err.message || "An unexpected error occurred while loading payment checkout.");
      setIsPaymentProcessing(false);
    }
  };

  const handleVerifyPromoCode = async () => {
    if (!user) return;
    const trimmed = promoCodeInput.trim().toUpperCase();
    if (!trimmed) {
      setPromoError("Please enter a promotional code.");
      return;
    }

    setIsPromoVerifying(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const codeRef = doc(db, 'promoCodes', trimmed);
      let codeSnap = await getDoc(codeRef);

      const allowedCodes = [
        'TEAM_EQ_1', 'TEAM_EQ_2', 'TEAM_EQ_3', 'TEAM_EQ_4', 'TEAM_EQ_5',
        'TEST_PREMIUM_2026', 'TEST_CODE_5', 'FREE_TOOL5_55', 'SPECIAL_TEST_CODE',
        'TEST10', 'IPN40M', 'ADMIN1'
      ];

      // Bootstrapping the code dynamically in Firestore if it is an allowed code and doesn't exist yet
      if (!codeSnap.exists()) {
        if (allowedCodes.includes(trimmed)) {
          const isTeamCode = trimmed.startsWith('TEAM');
          let maxUses = 5;
          if (trimmed === 'TEST10') {
            maxUses = 10;
          } else if (trimmed === 'IPN40M') {
            maxUses = 40;
          } else if (trimmed === 'FREE_TOOL5_55') {
            maxUses = 55;
          } else if (trimmed === 'ADMIN1') {
            maxUses = 100;
          }
          await setDoc(codeRef, {
            code: trimmed,
            type: trimmed === 'ADMIN1' ? 'testing' : (isTeamCode ? 'team' : 'testing'),
            maxUses: maxUses,
            usedCount: 0,
            usersRedeemed: [],
            createdAt: serverTimestamp()
          });
          codeSnap = await getDoc(codeRef);
        } else {
          setPromoError("Invalid promotional code.");
          setIsPromoVerifying(false);
          return;
        }
      }

      const codeData = codeSnap.data();
      if (!codeData) {
        setPromoError("Could not retrieve promotional code details.");
        setIsPromoVerifying(false);
        return;
      }

      // 1. Check if user already redeemed, and check if user document is out of sync
      const alreadyRedeemedInCode = codeData.usersRedeemed && codeData.usersRedeemed.includes(user.uid);
      const isTool5Code = (trimmed === 'TEST_CODE_5' || trimmed === 'FREE_TOOL5_55' || trimmed === 'IPN40M');
      
      let userNeedsUpdate = false;
      if (isTool5Code) {
        if (!profile?.hasFreeTool5Access) {
          userNeedsUpdate = true;
        }
      } else if (trimmed === 'ADMIN1') {
        if (userTier !== 'premium' || !(profile as any)?.hasPremiumPromoActive || !(profile as any)?.hasAdminMasterAccess) {
          userNeedsUpdate = true;
        }
      } else {
        if (userTier !== 'premium' || !(profile as any)?.hasPremiumPromoActive) {
          userNeedsUpdate = true;
        }
      }

      if (alreadyRedeemedInCode && !userNeedsUpdate) {
        setPromoError("You have already redeemed this promotional code!");
        setIsPromoVerifying(false);
        return;
      }

      let maxUses = codeData.maxUses || 5;
      if (trimmed === 'TEST10') {
        maxUses = 10;
      } else if (trimmed === 'IPN40M') {
        maxUses = 40;
      } else if (trimmed === 'FREE_TOOL5_55') {
        maxUses = 55;
      } else if (trimmed === 'ADMIN1') {
        maxUses = 100;
      }

      // 2. Check if reached max uses (only if not already registered in code)
      if (!alreadyRedeemedInCode && codeData.usedCount >= maxUses) {
        setPromoError(`This promotional code has reached its maximum usage limit of ${maxUses}.`);
        setIsPromoVerifying(false);
        return;
      }

      // 3. Redeem!
      // Atomically update promo code document ONLY if we haven't already registered
      if (!alreadyRedeemedInCode) {
        await updateDoc(codeRef, {
          usedCount: increment(1),
          usersRedeemed: arrayUnion(user.uid),
          updatedAt: serverTimestamp()
        });
      }

      const userDocRef = doc(db, 'users', user.uid);
      if (trimmed === 'TEST_CODE_5' || trimmed === 'FREE_TOOL5_55' || trimmed === 'IPN40M') {
        // Unlock Assessment 5 for free but NOT the premium tier
        await updateDoc(userDocRef, {
          hasFreeTool5Access: true,
          updatedAt: serverTimestamp()
        });
        setPromoSuccess(`Success! Code ${trimmed} applied. Free Access to Assessment 5 (Unified Toolkit Report) is now active!`);
        
        setTimeout(() => {
          setIsUpgradeModalOpen(false);
          setIsEnterpriseCheckoutOpen(false);
          setIsPromoModalOpen(false);
          setIsTool5SuccessModalOpen(true);
          // Reset states
          setPromoCodeInput('');
          setPromoSuccess(null);
          setIsPromoExpanded(false);
        }, 1500);
      } else if (trimmed === 'ADMIN1') {
        // Upgrade user's tier inside Firestore to premium and register premium promo active with full admin master access
        await updateDoc(userDocRef, {
          tier: 'premium',
          hasPremiumPromoActive: true,
          hasFreeTool5Access: true,
          hasAdminMasterAccess: true,
          premiumPromoActive: false, // ensure no locks on comparative gaps
          updatedAt: serverTimestamp()
        });
        setPromoSuccess(`Success! Code ${trimmed} applied. Unlimited Full Access to All Tools unlocked successfully!`);
        
        setTimeout(() => {
          setIsUpgradeModalOpen(false);
          setIsEnterpriseCheckoutOpen(false);
          setIsPromoModalOpen(false);
          setIsPremiumSuccessModalOpen(true);
          // Reset states
          setPromoCodeInput('');
          setPromoSuccess(null);
          setIsPromoExpanded(false);
        }, 1500);
      } else {
        // Upgrade user's tier inside Firestore to premium and register premium promo active
        await updateDoc(userDocRef, {
          tier: 'premium',
          hasPremiumPromoActive: true,
          updatedAt: serverTimestamp()
        });
        setPromoSuccess(`Success! Code ${trimmed} applied. Welcome to BeyondEQ Premium!`);
        
        setTimeout(() => {
          setIsUpgradeModalOpen(false);
          setIsEnterpriseCheckoutOpen(false);
          setIsPromoModalOpen(false);
          setIsPremiumSuccessModalOpen(true);
          // Reset states
          setPromoCodeInput('');
          setPromoSuccess(null);
          setIsPromoExpanded(false);
        }, 1500);
      }

    } catch (err: any) {
      console.error("Error applying promotional code:", err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `promoCodes`);
      } catch (logErr: any) {
        setPromoError("Access error: " + (err.message || err));
      }
    } finally {
      setIsPromoVerifying(false);
    }
  };

  const [activeAssessment, setActiveAssessment] = useState<string>(() => {
    if (location.state?.activeAssessment) return location.state.activeAssessment;
    return 'instructions';
  });
  const [isEditingObservers, setIsEditingObservers] = useState(false);
  const [inviteObserversLater, setInviteObserversLater] = useState<boolean>(() => {
    return !!location.state?.inviteLater;
  });
  const [dashboardObserversList, setDashboardObserversList] = useState<Array<{ name: string; email: string; phone: string; relationship: string; status?: string }>>([
    { name: '', email: '', phone: '', relationship: '', status: 'Sent' }
  ]);

  useEffect(() => {
    const existing = (profile as any)?.selfDiscoveryObserversPlan?.observers;
    if (existing && Array.isArray(existing) && existing.length > 0) {
      setDashboardObserversList(existing);
    } else {
      setDashboardObserversList([{ name: '', email: '', phone: '', relationship: '', status: 'Sent' }]);
    }
  }, [profile]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [simulatedSecurityValue, setSimulatedSecurityValue] = useState<number>(70);
  const [simulatedIntegrityValue, setSimulatedIntegrityValue] = useState<number>(65);
  const [checklistActiveTasks, setChecklistActiveTasks] = useState<string[]>(['task-1-1', 'task-2-1']);

  useEffect(() => {
    if (activeAssessment === '' && profile) {
      setActiveAssessment('instructions');
    }
  }, [profile, activeAssessment]);

  // Scroll to top whenever the active assessment view or tab shifts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollContainer = document.getElementById('dashboard-main-content') || document.querySelector('.main-content-scroll') || document.body;
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [activeAssessment]);

  const toggleOnboardingMilestone = async (field: 'introPhilosophyCompleted' | 'introTemplateCompleted' | 'introTutorialCompleted') => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const currentValue = !!profile?.[field];
      await updateDoc(userDocRef, {
        [field]: !currentValue,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error("Error updating onboarding milestone:", err);
    }
  };

  // NEW: Daily EQ Reflection states
  const [reflections, setReflections] = useState<any[]>([]);
  const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedReflection, setSelectedReflection] = useState<any>(null);
  const [reflectionStep, setReflectionStep] = useState(0);
  const [reflectionFeedback, setReflectionFeedback] = useState<string | null>(null);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);
  const [reflectionSearchQuery, setReflectionSearchQuery] = useState('');
  const [intensityFilter, setIntensityFilter] = useState('ALL');
  const [historyModalTab, setHistoryModalTab] = useState<'entries' | 'analytics'>('entries');

  const initialReflectionState = {
    situation: '',
    reaction: '',
    intensity: 3, // Rating (1-5) matching Low to High colors
    trigger: '' as 'internal' | 'external' | '',
    whoInvolved: '',
    physicalSymptoms: [] as string[],
    customSymptom: '',
    thoughts: '',
    outcome: '',
    differently: '',
  };
  const [newReflection, setNewReflection] = useState(initialReflectionState);

  const analyticsData = React.useMemo(() => {
    const total = reflections.length;
    if (total === 0) return null;

    const micro = reflections.filter((item: any) => item.isMicroReflection);
    const deep = reflections.filter((item: any) => !item.isMicroReflection);

    // Calculate Average Intensity
    const intensList = reflections.filter((item: any) => typeof item.intensity === 'number');
    const avgIntensity = intensList.length > 0
      ? Number((intensList.reduce((acc: number, item: any) => acc + item.intensity, 0) / intensList.length).toFixed(1))
      : 3.0;

    // Count precise emotions (look at preciseEmotion or reaction)
    const emotionCounts: Record<string, number> = {};
    reflections.forEach((item: any) => {
      const rawEm = item.preciseEmotion || item.reaction;
      if (!rawEm) return;
      const cleanEm = rawEm.trim().split(/[\s,]+/)[0];
      if (cleanEm && cleanEm.length > 1) {
        const emLower = cleanEm.charAt(0).toUpperCase() + cleanEm.slice(1).toLowerCase();
        emotionCounts[emLower] = (emotionCounts[emLower] || 0) + 1;
      }
    });

    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const uniqueEmotionsCount = Object.keys(emotionCounts).length;
    let emotionalGranularity = "Expanding";
    if (uniqueEmotionsCount >= 6) emotionalGranularity = "Superior";
    else if (uniqueEmotionsCount >= 3) emotionalGranularity = "Optimal";

    // Count dynamic trigger keywords
    const triggerWordsCounts: Record<string, number> = {};
    const stopWords = new Set([
      "the", "a", "an", "is", "in", "of", "at", "by", "for", "with", "on", "to", "my", "or", "and", "from", "that", "this", "it", "i", "was", "me", "he", "she", "they", "we", "had", "have", "has", "but", "not", "so", "as", "about", "your", "his", "her", "their", "our", "you", "been", "were", "when", "how", "what", "who", "out", "did", "doing", "just", "very", "than", "then", "them", "some", "more", "like", "other", "there"
    ]);

    reflections.forEach((item: any) => {
      const text = (item.situation || item.triggerText || '').toLowerCase();
      const words = text.split(/[\s,.\-!?()"/]+/);
      words.forEach(w => {
        const clean = w.trim().replace(/[^a-z]/g, '');
        if (clean && clean.length > 3 && !stopWords.has(clean)) {
          triggerWordsCounts[clean] = (triggerWordsCounts[clean] || 0) + 1;
        }
      });
    });

    const topTriggerWords = Object.entries(triggerWordsCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Trigger proximity helper
    let internalCount = 0;
    let externalCount = 0;
    reflections.forEach((item: any) => {
      if (item.trigger === 'internal') {
        internalCount++;
      } else if (item.trigger === 'external') {
        externalCount++;
      } else {
        // heuristic fallback
        const text = (item.situation || item.triggerText || '').toLowerCase();
        if (text.includes("meeting") || text.includes("colleague") || text.includes("boss") || text.includes("email") || text.includes("feedback") || text.includes("interrupted") || text.includes("called") || text.includes("asked") || text.includes("said") || text.includes("manager") || text.includes("client")) {
          externalCount++;
        } else {
          internalCount++;
        }
      }
    });

    const totalTriggersDetermined = internalCount + externalCount || 1;
    const pctInternal = Math.round((internalCount / totalTriggersDetermined) * 100);
    const pctExternal = Math.round((externalCount / totalTriggersDetermined) * 105); // simple safe scaling or standard rounding

    // Count physical symptoms
    const somaticCounts: Record<string, number> = {};
    reflections.forEach((item: any) => {
      if (Array.isArray(item.physicalSymptoms)) {
        item.physicalSymptoms.forEach((symptom: string) => {
          somaticCounts[symptom] = (somaticCounts[symptom] || 0) + 1;
        });
      }
      if (item.customSymptom && item.customSymptom.trim()) {
        const customS = item.customSymptom.trim();
        const cleanS = customS.charAt(0).toUpperCase() + customS.slice(1).toLowerCase();
        somaticCounts[cleanS] = (somaticCounts[cleanS] || 0) + 1;
      }
    });

    const topSomaticSymptoms = Object.entries(somaticCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      microCount: micro.length,
      deepCount: deep.length,
      avgIntensity,
      topEmotions,
      uniqueEmotionsCount,
      emotionalGranularity,
      topTriggerWords,
      pctInternal: Math.min(100, pctInternal),
      pctExternal: Math.min(100, 100 - Math.min(100, pctInternal)), // guarantee 100% split
      topSomaticSymptoms
    };
  }, [reflections]);

  // NEW: Micro-Reflection (3-Second Pause Stimulus-Response Gap Training) states
  const [isMicroRefModalOpen, setIsMicroRefModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [microTriggerText, setMicroTriggerText] = useState('');
  const [microPreciseEmotion, setMicroPreciseEmotion] = useState('');
  const [activeEmotionCategory, setActiveEmotionCategory] = useState<'worth' | 'control' | 'inclusion'>('worth');
  const [microChosenAction, setMicroChosenAction] = useState('');
  const [microPauseSecondsLeft, setMicroPauseSecondsLeft] = useState(3);
  const [isMicroRefSubmitting, setIsMicroRefSubmitting] = useState(false);
  const [microRefFeedback, setMicroRefFeedback] = useState<string | null>(null);

  const moodTrackerData = React.useMemo(() => {
    try {
      const saved = sessionStorage.getItem('eq-mood-tracker-data');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }, [activeAssessment, isMicroRefModalOpen, isReflectionModalOpen]);

  // Countdown timer for 3-second Stimulus-Response gap
  useEffect(() => {
    let intervalId: any;
    if (isMicroRefModalOpen) {
      setMicroPauseSecondsLeft(3);
      intervalId = setInterval(() => {
        setMicroPauseSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isMicroRefModalOpen]);

  // Sync reflections from Firebase
  useEffect(() => {
    if (!user) return;
    const reflectionsPath = `users/${user.uid}/reflections`;
    const reflectionsRef = collection(db, 'users', user.uid, 'reflections');
    const q = query(reflectionsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setReflections(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, reflectionsPath);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveReflection = async () => {
    if (!user) return;
    if (!newReflection.situation.trim()) {
      alert("Please describe the situation to start your reflection exercise.");
      return;
    }
    const reflectionsPath = `users/${user.uid}/reflections`;
    setIsSubmittingReflection(true);
    try {
      const reflectionsRef = collection(db, 'users', user.uid, 'reflections');
      await addDoc(reflectionsRef, {
        ...newReflection,
        createdAt: serverTimestamp(),
      });
      
      setReflectionFeedback("Excellent journaling! Your emotional intelligence intelligence loop is locked.");
      setTimeout(() => {
        setReflectionFeedback(null);
        setIsReflectionModalOpen(false);
        setNewReflection(initialReflectionState);
        setReflectionStep(0);
      }, 2500);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, reflectionsPath);
    } finally {
      setIsSubmittingReflection(false);
    }
  };

  const handleSaveMicroReflection = async () => {
    if (!user) return;
    if (!microTriggerText.trim()) {
      alert("Please enter what triggered this interaction.");
      return;
    }
    if (!microPreciseEmotion.trim()) {
      alert("Please select or type a precise emotion word.");
      return;
    }
    if (!microChosenAction.trim()) {
      alert("Please specify what you chose to do next.");
      return;
    }
    if (microPauseSecondsLeft > 0) {
      alert("Please take at least 3 seconds to pause and regulate yourself before logging.");
      return;
    }

    const reflectionsPath = `users/${user.uid}/reflections`;
    setIsMicroRefSubmitting(true);
    try {
      const reflectionsRef = collection(db, 'users', user.uid, 'reflections');
      await addDoc(reflectionsRef, {
        isMicroReflection: true,
        situation: microTriggerText, // Storing in situation so the generic list can read it
        triggerText: microTriggerText,
        preciseEmotion: microPreciseEmotion,
        chosenAction: microChosenAction,
        createdAt: serverTimestamp(),
      });
      
      setMicroRefFeedback("Regulation Gap Locked! Your 3-second conscious pause has been logged.");
      setTimeout(() => {
        setMicroRefFeedback(null);
        setIsMicroRefModalOpen(false);
        setMicroTriggerText('');
        setMicroPreciseEmotion('');
        setMicroChosenAction('');
      }, 2500);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, reflectionsPath);
    } finally {
      setIsMicroRefSubmitting(false);
    }
  };

  const handleDeleteReflection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this reflection entry from your journal?");
    if (!confirmDelete) return;

    const reflectionDocPath = `users/${user.uid}/reflections/${id}`;
    try {
      const docRef = doc(db, 'users', user.uid, 'reflections', id);
      await deleteDoc(docRef);
      if (selectedReflection?.id === id) {
        setSelectedReflection(null);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, reflectionDocPath);
    }
  };

  const [activeDropdown, setActiveDropdown] = useState<'assessments' | 'sessions' | 'assignments' | 'reflections' | null>(null);
  const [selectedSessionModal, setSelectedSessionModal] = useState<any | null>(null);

  // Scroll popups/modals to the top when they are constructed or toggled open
  useEffect(() => {
    if (isInviteModalOpen || isPremiumSuccessModalOpen || isTool5SuccessModalOpen || isUpgradeModalOpen || isReflectionModalOpen || isHistoryModalOpen || isMicroRefModalOpen || isPromoModalOpen || isEnterpriseInviteModalOpen) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        const modalScrollables = document.querySelectorAll('.overflow-y-auto, [class*="overflow-y-auto"]');
        modalScrollables.forEach((el) => {
          el.scrollTop = 0;
        });
      }, 50);
    }
  }, [
    isInviteModalOpen,
    isPremiumSuccessModalOpen,
    isTool5SuccessModalOpen,
    isUpgradeModalOpen,
    isReflectionModalOpen,
    isHistoryModalOpen,
    isMicroRefModalOpen,
    isPromoModalOpen,
    isEnterpriseInviteModalOpen
  ]);

  const assessmentsList = isEnterprise
    ? [
        {
          id: 'entValuesAudit',
          name: 'Assessment 1: Values Audit',
          shortName: '1. Values Audit',
          status: profile?.enterpriseAssessmentsCompleted?.['1'] ? 'completed' : 'pending',
          description: 'A structured diagnostic to identify the gap between what your organisation claims to stand for — and what it actually does.',
          isLaunched: true,
          stepId: '1'
        },
        {
          id: 'entCultureMap',
          name: 'Assessment 2: Culture Map',
          shortName: '2. Culture Map',
          status: profile?.enterpriseAssessmentsCompleted?.['2'] ? 'completed' : 'pending',
          description: "A diagnostic to surface what is truly alive in your organisation's culture — what is thriving, what is quietly dying.",
          isLaunched: true,
          stepId: '2'
        },
        {
          id: 'entPerformanceLink',
          name: 'Assessment 3: Performance Link',
          shortName: '3. Performance Link',
          status: profile?.enterpriseAssessmentsCompleted?.['3'] ? 'completed' : 'pending',
          description: "A diagnostic that maps how your organisation's values and culture directly drive — or undermine — performance.",
          isLaunched: true,
          stepId: '3'
        },
        {
          id: 'entEqDriver',
          name: 'Assessment 4: EQ Driver',
          shortName: '4. EQ Driver',
          status: profile?.enterpriseAssessmentsCompleted?.['4'] ? 'completed' : 'pending',
          description: 'A diagnostic that identifies which of the 15 HumanEdge skills — if developed — would most directly close the gaps.',
          isLaunched: true,
          stepId: '4'
        },
        {
          id: 'entUnifiedReport',
          name: 'Assessment 5: Unified Toolkit',
          shortName: '5. Unified Toolkit',
          status: completedAuditsCount === 4 ? 'completed' : 'locked',
          description: 'Consolidated report with deeper insights (Unified Toolkit of all 4 prior tools).',
          isLaunched: true,
          stepId: '5'
        },
        {
          id: 'entMultiRaterConsolidation',
          name: 'Assessment 6: Multi-Rater Consolidation',
          shortName: '6. Multi-Rater Consolidation',
          status: isConsolidationUnlocked ? 'completed' : 'locked',
          description: 'Consolidated team diagnostics and split maps combining up to 5 members.',
          isLaunched: true,
          stepId: '6'
        }
      ]
    : [
        {
          id: 'selfDiscovery',
          name: 'HumanEdge 3.0 (Self Discovery)',
          shortName: 'HumanEdge 3.0 (Self Discovery)',
          status: isSelfDiscoveryCompleted ? 'completed' : 'pending',
          description: 'In-depth assessment of the 7 vital leadership emotional parameters.',
          isLaunched: true,
        },
        {
          id: 'threeSixty',
          name: 'BeyondEQ 360° Diagnostic Matrix',
          shortName: 'BeyondEQ 360° Diagnostic Matrix',
          status: isThreeSixtyCompleted ? 'completed' : 'pending',
          description: 'Consolidated multidimensional feedback loop from colleagues, bosses, and mentors.',
          isLaunched: true,
        },
        {
          id: 'overallSelf',
          name: 'Overall Self View & Live Report',
          shortName: '🎯 Live Overall Self Report',
          status: 'live',
          description: 'Consolidated report aggregating diagnostic baselines, 360 Matrices, mood patterns, and mindful pause logs.',
          isLaunched: true,
        },
        {
          id: 'cognitive',
          name: 'Cognitive Empathy Index',
          shortName: 'Cognitive Empathy Index (Upcoming)',
          status: 'upcoming',
          description: 'Measures high-speed conversational reading of non-verbal cues.',
          isLaunched: false,
          launchDate: 'Q4 2026',
        },
        {
          id: 'resiliency',
          name: 'Relational Resiliency Audit',
          shortName: 'Relational Resiliency Audit (Upcoming)',
          status: 'upcoming',
          description: 'Examines crisis recovery response and group stress absorption speed.',
          isLaunched: false,
          launchDate: 'Q4 2026',
        }
      ];

  const sessionsList = [
    {
      id: 'session-2',
      title: 'Neuroscience of Empathy & Subconscious Cues (Upcoming)',
      date: 'YTD',
      status: 'upcoming',
      description: 'Advanced neuro-cognitive workshop on cortical empathy mapping, reading sub-conscious non-verbal responses.',
      attended: false,
      isUpcoming: true,
      isLaunched: false,
    },
    {
      id: 'session-3',
      title: 'Decisive High-Pressure Leadership Workshop (Upcoming)',
      date: 'YTD',
      status: 'upcoming',
      description: 'Simulating state room conflict, cortisol suppression techniques, and critical team communication.',
      attended: false,
      isUpcoming: true,
      isLaunched: false,
    },
    {
      id: 'session-4',
      title: 'Strategic Conflict Navigation (Upcoming)',
      date: 'YTD',
      status: 'upcoming',
      description: 'A deep-dive on resolving team bias clusters, de-escalating boards, and setting relational equilibrium.',
      attended: false,
      isUpcoming: true,
      isLaunched: false,
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-[#104C64] font-bold uppercase tracking-[0.4em]">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/register" replace />;
  }

  const handleCopy = () => {
    if (!user) return;
    const inviteLink = `${getInstantOrigin()}/register?invitedBy=${user.uid}`;
    safeCopyToClipboard(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateThreeSixty = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const plan = (profile as any).selfDiscoveryObserversPlan || { observers: [] };
      const list = plan.observers || [];
      const updatedObservers = list.map((o: any) => ({
        ...o,
        status: 'Feedback Received',
        scores: { SR: 82, CI: 76, RA: 85, ST: 80, C: 74, CN: 88, IP: 81 }
      }));
      await updateDoc(userDocRef, {
        threeSixtyCompleted: true,
        selfDiscoveryObserversPlan: { observers: updatedObservers },
        threeSixtyScores: {
          SR: 82,
          CI: 76,
          RA: 85,
          ST: 80,
          C: 74,
          CN: 88,
          IP: 81
        },
        cmmLevel: 4,
        updatedAt: serverTimestamp()
      });
      alert("Outstanding! Dynamic simulator has consolidated observer metrics. Your BeyondEQ 360° Diagnostic Matrix and CMM Level are now officially unlocked!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to compile 360 simulation: " + err.message);
    }
  };

  const handleSaveDashboardObservers = async () => {
    if (!user) return;
    const isEmailValid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    for (let i = 0; i < dashboardObserversList.length; i++) {
      const obs = dashboardObserversList[i];
      if (!obs.name.trim()) {
        alert(`Please enter a name for Observer #${i + 1}`);
        return;
      }
      if (!obs.email.trim() || !isEmailValid(obs.email)) {
        alert(`Please enter a valid email for Observer #${i + 1}`);
        return;
      }
      if (!obs.relationship) {
        alert(`Please select a relationship for Observer #${i + 1}`);
        return;
      }
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        selfDiscoveryObserversPlan: {
          observers: dashboardObserversList.map(o => ({
            name: o.name.trim(),
            email: o.email.trim(),
            phone: o.phone ? o.phone.trim() : '',
            relationship: o.relationship,
            status: o.status || 'Sent'
          }))
        },
        updatedAt: serverTimestamp()
      });

      // Dispatch invitations via API
      let smtpConfigured = true;
      let someEmailsFailed = false;
      let emailErrorDetails: string[] = [];

      try {
        await Promise.all(
          dashboardObserversList.map(async (obs) => {
            if (obs.email && obs.email.trim()) {
              try {
                const response = await fetch('/api/invite-observer', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    observerEmail: obs.email.trim(),
                    observerName: obs.name.trim(),
                    observerRelationship: obs.relationship,
                    userName: profile?.name || user.displayName || 'BeyondEQ User',
                    userId: user.uid,
                    userType: profile?.userType || 'individual',
                    origin: getInstantOrigin()
                  })
                });

                if (response.ok) {
                  const resData = await response.json();
                  if (resData.configured === false) {
                    smtpConfigured = false;
                  } else if (resData.sent === false) {
                    someEmailsFailed = true;
                    emailErrorDetails.push(`${obs.name} (${obs.email}): ${resData.error || resData.message || "Unknown SMTP delivery error"}`);
                  }
                } else {
                  const errData = await response.json().catch(() => ({}));
                  someEmailsFailed = true;
                  emailErrorDetails.push(`${obs.name} (${obs.email}): Server responded with error - ${errData.error || "Status " + response.status}`);
                }
              } catch (fetchErr: any) {
                someEmailsFailed = true;
                emailErrorDetails.push(`${obs.name} (${obs.email}): Network connection failed`);
              }
            }
          })
        );
      } catch (mailErr: any) {
        console.warn("Outbound invite execution warned:", mailErr);
      }

      if (!smtpConfigured) {
        alert("✉️ Persistent SMTP Relay Active:\n\nFallback credentials have successfully dispatched the automated observer invitation emails!");
      } else if (someEmailsFailed) {
        alert(`✉️ Outbound SMTP Relay Error:\n\nWe successfully saved your list, but we encountered issues transmitting the invitation email(s) via your configured SMTP host:\n\n${emailErrorDetails.join('\n')}\n\nTo move forward immediately, please copy your observer's unique assessment link(s) directly from your Dashboard and share them manually via Slack, Teams, or email!`);
      } else {
        alert("Success! Invitations have been successfully dispatched to your listed observers.");
      }

      setIsEditingObservers(false);
      setInviteObserversLater(false);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save observers: " + err.message);
    }
  };



  // 2. Data mapping for HumanEdge 3.0 (Self Discovery)
  const selfDiscoveryScores = isSelfDiscoveryCompleted ? [
    { subject: 'Self Composure (SR)', A: (profile as any).selfDiscoveryScores?.SR || 40, fullMark: 100 },
    { subject: 'Contextual Reading (CI)', A: (profile as any).selfDiscoveryScores?.CI || 40, fullMark: 100 },
    { subject: 'Relationship Design (RA)', A: (profile as any).selfDiscoveryScores?.RA || 40, fullMark: 100 },
    { subject: 'Strategic Thinking (ST)', A: (profile as any).selfDiscoveryScores?.ST || 40, fullMark: 100 },
    { subject: 'Decision Courage (C)', A: (profile as any).selfDiscoveryScores?.C || 40, fullMark: 100 },
    { subject: 'Conflict Navigation (CN)', A: (profile as any).selfDiscoveryScores?.CN || 40, fullMark: 100 },
    { subject: 'Influence Potential (IP)', A: (profile as any).selfDiscoveryScores?.IP || 40, fullMark: 100 },
  ] : [
    { subject: 'Self Composure', A: 0, fullMark: 100 },
    { subject: 'Contextual Reading', A: 0, fullMark: 100 },
    { subject: 'Relationship Design', A: 0, fullMark: 100 },
    { subject: 'Strategic Thinking', A: 0, fullMark: 100 },
    { subject: 'Decision Courage', A: 0, fullMark: 100 },
    { subject: 'Conflict Navigation', A: 0, fullMark: 100 },
    { subject: 'Influence Potential', A: 0, fullMark: 100 },
  ];

  // 3. Data mapping for BeyondEQ 360° Diagnostic
  const selfResultsArray = (() => {
    if (!profile) return [];
    try {
      const selfAnswers = (profile as any).threeSixtySelfAnswers || {};
      const selfImpacts = (profile as any).threeSixtySelfImpacts || {};
      if (Object.keys(selfAnswers).length === 0) return [];
      return calculateThreeSixtyResults(selfAnswers, selfImpacts, []).skillResults || [];
    } catch (e) {
      console.warn("Error pre-calculating local in-progress self 360 scores:", e);
      return [];
    }
  })();

  const threeSixtyScores = isThreeSixtyCompleted ? [
    { subject: 'Self Composure (SR)', A: (profile as any).threeSixtyScores?.SR || 78, fullMark: 100 },
    { subject: 'Contextual Reading (CI)', A: (profile as any).threeSixtyScores?.CI || 84, fullMark: 100 },
    { subject: 'Relationship Design (RA)', A: (profile as any).threeSixtyScores?.RA || 81, fullMark: 100 },
    { subject: 'Strategic Thinking (ST)', A: (profile as any).threeSixtyScores?.ST || 72, fullMark: 100 },
    { subject: 'Decision Courage (C)', A: (profile as any).threeSixtyScores?.C || 88, fullMark: 100 },
    { subject: 'Conflict Navigation (CN)', A: (profile as any).threeSixtyScores?.CN || 79, fullMark: 100 },
    { subject: 'Influence Potential (IP)', A: (profile as any).threeSixtyScores?.IP || 82, fullMark: 100 },
  ] : isThreeSixtySelfCompleted && selfResultsArray.length > 0 ? [
    { subject: 'Self Composure (SR)', A: selfResultsArray.find(r => r.skill.key === 'SR')?.pct || 40, fullMark: 100 },
    { subject: 'Contextual Reading (CI)', A: selfResultsArray.find(r => r.skill.key === 'CI')?.pct || 40, fullMark: 100 },
    { subject: 'Relationship Design (RA)', A: selfResultsArray.find(r => r.skill.key === 'RA')?.pct || 40, fullMark: 100 },
    { subject: 'Strategic Thinking (ST)', A: selfResultsArray.find(r => r.skill.key === 'ST')?.pct || 40, fullMark: 100 },
    { subject: 'Decision Courage (C)', A: selfResultsArray.find(r => r.skill.key === 'C')?.pct || 40, fullMark: 100 },
    { subject: 'Conflict Navigation (CN)', A: selfResultsArray.find(r => r.skill.key === 'CN')?.pct || 40, fullMark: 100 },
    { subject: 'Influence Potential (IP)', A: selfResultsArray.find(r => r.skill.key === 'IP')?.pct || 40, fullMark: 100 },
  ] : [
    { subject: 'Self Composure', A: 0, fullMark: 100 },
    { subject: 'Contextual Reading', A: 0, fullMark: 100 },
    { subject: 'Relationship Design', A: 0, fullMark: 100 },
    { subject: 'Strategic Thinking', A: 0, fullMark: 100 },
    { subject: 'Decision Courage', A: 0, fullMark: 100 },
    { subject: 'Conflict Navigation', A: 0, fullMark: 100 },
    { subject: 'Influence Potential', A: 0, fullMark: 100 },
  ];

  const entValuesAuditScores = [
    { subject: 'Leadership Behaviour', A: 85, fullMark: 100 },
    { subject: 'Psychological Safety', A: 80, fullMark: 100 },
    { subject: 'Accountability & Follow-Through', A: 75, fullMark: 100 },
    { subject: 'Communication & Transparency', A: 85, fullMark: 100 },
    { subject: 'Inclusion & Voice', A: 80, fullMark: 100 },
    { subject: 'Resource Decisions', A: 75, fullMark: 100 },
  ];

  const entCultureMapScores = [
    { subject: 'Thriving Network', A: 80, fullMark: 100 },
    { subject: 'Weakening Gaps', A: 70, fullMark: 100 },
    { subject: 'Invisible Norms', A: 85, fullMark: 100 },
    { subject: 'Protected Assets', A: 75, fullMark: 100 },
    { subject: 'Emotional Composure', A: 80, fullMark: 100 },
  ];

  const entPerformanceLinkScores = [
    { subject: 'Mission Delivery', A: 85, fullMark: 100 },
    { subject: 'People Performance', A: 80, fullMark: 100 },
    { subject: 'Decision Quality', A: 75, fullMark: 100 },
    { subject: 'Sustainability', A: 85, fullMark: 100 },
    { subject: 'Adaptive Capacity', A: 80, fullMark: 100 },
  ];

  const entEqDriverScores = [
    { subject: 'Listening Depth', A: 85, fullMark: 100 },
    { subject: 'Self Regulation', A: 80, fullMark: 100 },
    { subject: 'Conflict Navigation', A: 75, fullMark: 100 },
    { subject: 'Pattern Recognition', A: 85, fullMark: 100 },
    { subject: 'Strategic Thinking', A: 90, fullMark: 100 },
  ];

  const entUnifiedReportScores = [
    { subject: 'Executive IQ', A: 95, fullMark: 100 },
    { subject: 'Emotional Composure', A: 90, fullMark: 100 },
    { subject: 'Strategic Empathy', A: 92, fullMark: 100 },
    { subject: 'Relationship Design', A: 94, fullMark: 100 },
    { subject: 'Operational Alignment', A: 88, fullMark: 100 },
  ];

  const scoresData = isEnterprise
    ? activeAssessment === 'entValuesAudit'
      ? entValuesAuditScores
      : activeAssessment === 'entCultureMap'
        ? entCultureMapScores
        : activeAssessment === 'entPerformanceLink'
          ? entPerformanceLinkScores
          : activeAssessment === 'entEqDriver'
            ? entEqDriverScores
            : activeAssessment === 'entUnifiedReport'
              ? entUnifiedReportScores
              : []
    : activeAssessment === 'selfDiscovery'
      ? selfDiscoveryScores
      : threeSixtyScores;

  const isCurrentSelectionCompleted = isEnterprise
    ? activeAssessment === 'entValuesAudit'
      ? !!profile?.enterpriseAssessmentsCompleted?.['1']
      : activeAssessment === 'entCultureMap'
        ? !!profile?.enterpriseAssessmentsCompleted?.['2']
        : activeAssessment === 'entPerformanceLink'
          ? !!profile?.enterpriseAssessmentsCompleted?.['3']
          : activeAssessment === 'entEqDriver'
            ? !!profile?.enterpriseAssessmentsCompleted?.['4']
            : activeAssessment === 'entUnifiedReport'
              ? completedAuditsCount === 4
              : false
    : activeAssessment === 'selfDiscovery'
      ? isSelfDiscoveryCompleted
      : (activeAssessment === 'threeSixty' ? (isThreeSixtyCompleted || isThreeSixtySelfCompleted) : false);

  const handleSubmitEnterpriseAssessment = async (stepId: string) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const currentCompleted = profile?.enterpriseAssessmentsCompleted || {};
      const updatedCompleted = {
        ...currentCompleted,
        [stepId]: true
      };

      // Gather current questions' responses (we have activeAssessment as current step)
      const answersList = [];
      const questionsCount = 5;
      for (let i = 0; i < questionsCount; i++) {
        const val = enterpriseAnswers[`${activeAssessment}_${i}`] || '3'; // default to middle rating 3
        answersList.push(Number(val));
      }

      await updateDoc(userDocRef, {
        enterpriseAssessmentsCompleted: updatedCompleted,
        [`enterpriseAnswers_${stepId}`]: answersList,
        updatedAt: serverTimestamp()
      });

      // Synchronize update with admin's organizationInvites collection to trigger real-time updates of the onboarding dashboard
      if (profile?.enterpriseInvitedBy) {
        try {
          const inviteRef = doc(db, 'users', profile.enterpriseInvitedBy, 'organizationInvites', user.uid);
          await setDoc(inviteRef, {
            enterpriseAssessmentsCompleted: updatedCompleted,
            [`enterpriseAnswers_${stepId}`]: answersList,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (inviteErr) {
          console.error("Error synchronizing assessment completion to admin organizationInvites:", inviteErr);
        }
      }

      alert(`Assessment ${stepId} Core corporate audit responses logged successfully! Your diagnostic matrix has been updated.`);
      setEnterpriseAnswers({}); // Reset answers
    } catch (err: any) {
      console.error("Error submitting corporate assessment:", err);
      alert("Error submitting audit: " + err.message);
    }
  };

  const assignments = profile?.assignments || [
    { id: '1', title: 'Emotional Regulation Basics', completed: isFoundationCompleted },
    { id: '2', title: 'Empathy in Leadership', completed: false },
    { id: '3', title: 'Social Cues Analysis', completed: isFoundationCompleted },
  ];

  const toggleAssignmentState = async (assignmentId: string) => {
    if (!user) return;
    const userDocPath = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updatedAssignments = assignments.map(as => {
        if (as.id === assignmentId) {
          return { ...as, completed: !as.completed };
        }
        return as;
      });
      await updateDoc(userDocRef, {
        assignments: updatedAssignments,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, userDocPath);
    }
  };

  const sessions = profile?.sessions || [
    { id: '1', title: 'Intro to EQ 3.0', date: '2024-05-10', attended: isFoundationCompleted },
    { id: '2', title: 'Advanced Social Skills', date: '2024-05-15', attended: isFoundationCompleted },
    { id: '3', title: 'Motivation & Resilience', date: '2024-05-20', attended: false },
  ];

  // Selected EMM Level
  const currentEMMLevel = activeAssessment === 'selfDiscovery' 
    ? ((profile as any).selfDiscoveryLevel || 0)
    : (profile?.cmmLevel || 3);

  const displayedObservations = (profile as any).selfDiscoveryObservations || [];
  const draftedObserversList = (profile as any).selfDiscoveryObserversPlan || null;

  const getObserversList = () => {
    if (!draftedObserversList) return [];
    if (Array.isArray(draftedObserversList.observers)) {
      return draftedObserversList.observers;
    }
    // Backward compatibility for old schema
    const legacy: any[] = [];
    if (draftedObserversList.above1) legacy.push({ name: draftedObserversList.above1, relationship: 'Manager / Board (Above)', email: '-', status: 'Sent' });
    if (draftedObserversList.above2) legacy.push({ name: draftedObserversList.above2, relationship: 'Manager / Board (Above)', email: '-', status: 'Sent' });
    if (draftedObserversList.peer1) legacy.push({ name: draftedObserversList.peer1, relationship: 'Colleague (Peer)', email: '-', status: 'Sent' });
    if (draftedObserversList.peer2) legacy.push({ name: draftedObserversList.peer2, relationship: 'Colleague (Peer)', email: '-', status: 'Sent' });
    if (draftedObserversList.peer3) legacy.push({ name: draftedObserversList.peer3, relationship: 'Colleague (Peer)', email: '-', status: 'Sent' });
    if (draftedObserversList.below1) legacy.push({ name: draftedObserversList.below1, relationship: 'Report (Below)', email: '-', status: 'Sent' });
    if (draftedObserversList.below2) legacy.push({ name: draftedObserversList.below2, relationship: 'Report (Below)', email: '-', status: 'Sent' });
    if (draftedObserversList.personal1) legacy.push({ name: draftedObserversList.personal1, relationship: 'Trusted Mentor / Personal Advisor', email: '-', status: 'Sent' });
    return legacy;
  };

  const observersToDisplay = getObserversList();

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-24 px-6 md:px-12 flex flex-col items-center">
      <div className="max-w-7xl w-full space-y-12">

        <AnimatePresence>
          {showSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-emerald-50 border border-emerald-200/60 p-6 rounded-[30px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-emerald-950/[0.03] relative z-20"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100/70 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#104C64] uppercase tracking-wider mb-1">Assessment Complete</h4>
                  <p className="text-stone-600 font-sans text-xs leading-normal max-w-xl">
                    Outstanding! Your HumanEdge 3.0 Self Discovery answers have been compiled. Next, click on the <span className="font-bold">360° Diagnostic</span> tab below to set up and invite your observers to rate your capabilities!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer self-stretch sm:self-auto text-center"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {profile?.enterpriseInvitedBy && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#104C64]/5 border border-[#104C64]/20 p-6 md:p-8 rounded-[40px] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#41B1C2]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="p-3.5 bg-amber-500/10 text-amber-700 rounded-2xl border border-amber-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-stone-500 font-extrabold uppercase tracking-[0.2em] block">
                  Enterprise Account Notice
                </span>
                <p className="text-[#104C64] font-sans text-xs font-black tracking-wide leading-relaxed">
                  For personal assessment tools, register with your personal email.
                </p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Header Section */}
        {isEnterprise ? (
          <>
            <div className="bg-gradient-to-br from-[#104C64] to-[#0D3E52] p-8 md:p-12 rounded-[40px] text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-8 border border-[#104C64]/30">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[9px] bg-[#c4a882] text-black font-black uppercase tracking-[0.2em] px-3.5 py-1 rounded-full border border-white/10 shadow-sm">
                    Enterprise Partner Portal
                  </span>
                  <span className="text-[9px] bg-white/10 text-white font-bold uppercase tracking-[0.25em] px-3.5 py-1 rounded-full">
                    {userTier === 'premium' ? 'Premium Suite Active' : 'Standard Suite'}
                  </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight font-sans">
                  Welcome, <span className="italic">{profile?.name || user.email?.split('@')[0]}</span>
                </h1>
                <p className="text-xs text-gray-300 font-semibold tracking-wide flex flex-wrap items-center gap-1.5 uppercase">
                  <span className="text-white font-black">{profile?.designation || 'Executive'}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-[#41B1C2] font-black">{profile?.company || 'Enterprise Partner'}</span>
                  <span className="text-gray-400">•</span>
                  <span>{profile?.location || 'Global Office'}</span>
                </p>
                <div className="pt-2">
                  <p className="text-xs text-stone-350 leading-relaxed font-sans max-w-2xl">
                    {userTier === 'premium'
                      ? "Welcome to your elite leadership cockpit. Your Unified intelligence matrix has been unlocked and drafted directly into Assessment 5 below."
                      : profile?.enterpriseInvitedBy
                        ? "Complete Assessments 1 through 4 to automatically draft your Assessment 5 Comprehensive Unified Executive Insight Report."
                        : "Complete Assessments 1 through 4 to automatically draft your Assessment 5 Comprehensive Unified Executive Insight Report."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end shrink-0">
                <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl flex flex-col items-center sm:items-start shrink-0 w-full sm:w-auto">
                  <span className="text-[9px] font-black text-[#41B1C2] uppercase tracking-[0.3em] mb-1">
                    Active Audits
                  </span>
                  <span className="text-3xl font-black italic text-white font-sans">
                    {(() => {
                      const actualCompletedAudits = Object.entries(profile?.enterpriseAssessmentsCompleted || {})
                        .filter(([key, val]) => (key === '1' || key === '2' || key === '3' || key === '4') && val)
                        .length;
                      return `${actualCompletedAudits} / 4`;
                    })()}
                  </span>
                </div>

                {userTier === 'premium' ? (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="bg-[#c4a882]/10 border border-[#c4a882]/30 px-6 py-4 rounded-3xl flex items-center gap-3 text-[#c4a882] justify-center">
                      <CheckCircle2 className="w-5 h-5 text-[#c4a882]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Premium Active</span>
                    </div>
                    <button 
                      onClick={() => {
                        setPromoError(null);
                        setPromoSuccess(null);
                        setPromoCodeInput('');
                        setIsPromoModalOpen(true);
                      }}
                      className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/20"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Redeem Promo
                    </button>
                  </div>
                ) : profile?.enterpriseInvitedBy ? (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="bg-[#41B1C2]/10 border border-[#41B1C2]/30 px-6 py-4 rounded-3xl flex items-center gap-3 text-[#41B1C2] justify-center">
                      <Users className="w-5 h-5 text-[#41B1C2]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Co-Worker Access</span>
                    </div>
                    <button 
                      onClick={() => {
                        setPromoError(null);
                        setPromoSuccess(null);
                        setPromoCodeInput('');
                        setIsPromoModalOpen(true);
                      }}
                      className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/20"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Redeem Promo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setIsEnterpriseCheckoutOpen(true)}
                      className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-655 hover:from-amber-600 hover:to-amber-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-400/20 active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Unlock Premium
                    </button>
                    <button 
                      onClick={() => {
                        setPromoError(null);
                        setPromoSuccess(null);
                        setPromoCodeInput('');
                        setIsPromoModalOpen(true);
                      }}
                      className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/20"
                    >
                      <Tag className="w-3.5 h-3.5 text-stone-350" />
                      Redeem Code
                    </button>
                  </div>
                )}
              </div>
            </div>


          </>
        ) : (
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-5xl font-black text-[#104C64] uppercase tracking-tight">
                  Hello, <span className="italic">{(profile?.name || user.email?.split('@')[0])?.split(' ')[0]}</span>
                </h1>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${
                  userTier === 'premium' 
                    ? 'bg-[#104C64] text-white border-[#104C64]/60 shadow-md' 
                    : 'bg-stone-100 text-stone-600 border-stone-200 shadow-sm'
                }`}>
                  {userTier === 'premium' 
                    ? ((profile as any)?.premiumPromoActive ? '★ Premium (Streak Active!) ⚡' : '★ Premium Tier') 
                    : 'Free Tier'}
                </span>

                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 flex items-center gap-1.5 shadow-sm ${
                  isThreeSixtyCompleted && userTier === 'premium' && (profile as any)?.premiumPromoActive !== true
                    ? 'bg-[#104C64]/10 text-[#104C64] border-[#104C64]/20'
                    : 'bg-stone-50 text-stone-400 border-stone-200'
                }`} title={
                  (userTier === 'premium' && (profile as any)?.premiumPromoActive !== true) 
                    ? "Complete 360 assessment to unlock CMM level" 
                    : "Requires Paid Premium Subscription"
                }>
                  {isThreeSixtyCompleted && userTier === 'premium' && (profile as any)?.premiumPromoActive !== true ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-[#104C64]" />
                      <span>CMM: LVL {profile?.cmmLevel || 4}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span>CMM: {
                        (profile as any)?.premiumPromoActive === true 
                          ? '360° Exclusive' 
                          : userTier === 'premium' ? 'Locked with 360' : 'Premium Required'
                      }</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[#104C64]/70 text-xs shadow-custom-inner">
                Your Emotional Intelligence Journey
              </p>
              {userTier === 'free' && (
                <div className="pt-2 animate-fadeIn">
                  <p className="text-[11.5px] text-stone-500 font-semibold flex items-center gap-2 max-w-2xl leading-normal">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                    <span>Looking for more advanced tools? Upgrade to Premium to instantly unlock the complete 360° Matrix observer responses, custom Coaching Assignments, and our Reflective Intelligence Gym helper.</span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto justify-end">
              {userTier === 'free' && (
                <button 
                  onClick={handleUpgradeToPremium}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-lg transition-all cursor-pointer shadow-amber-500/10 flex items-center justify-center gap-2 border border-amber-400/35 hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Upgrade to Premium
                </button>
              )}

              <button 
                onClick={() => {
                  setPromoError(null);
                  setPromoSuccess(null);
                  setPromoCodeInput('');
                  setIsPromoModalOpen(true);
                }}
                className="w-full sm:w-auto px-6 py-4 bg-white hover:bg-stone-50 text-[#104C64] border border-[#104C64]/20 hover:border-[#104C64]/45 font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <Tag className="w-3.5 h-3.5 text-[#104C64]" />
                Redeem Promo
              </button>
              
              <Link 
                to="/assessment"
                className="px-8 py-4 bg-[#c4a882] hover:bg-[#b0946e] text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-lg transition-all w-full sm:w-auto text-center"
              >
                {isSelfDiscoveryCompleted ? 'Retake Self Discovery' : 'Take Self Discovery'}
              </Link>
              
              <Link 
                to="/bias-codex"
                className="px-8 py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-lg transition-all italic w-full sm:w-auto text-center"
              >
                The Bias Codex
              </Link>
            </div>
          </div>
        )}

        {/* Executive Reports Dedicated Downloads Quick Hub */}
        {isEnterprise && (
          <div className="w-full max-w-5xl mx-auto mb-6 bg-stone-50 border border-stone-200/80 p-5 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-sm animate-fadeIn" id="executive-reports-downloads-toolbar">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-2xl bg-[#104C64]/10 border border-[#104C64]/15 flex items-center justify-center text-[#104C64] shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block font-mono">DELIVERABLES GATEWAY</span>
                <h4 className="text-[11px] font-black uppercase text-stone-800 tracking-wide font-sans">Executive Reports</h4>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:ml-auto">
              {/* Report 5 button */}
              {(() => {
                const isAdminMaster = (profile as any)?.hasAdminMasterAccess === true;
                const hasTool5Access = userTier === 'premium' || (profile as any)?.hasFreeTool5Access === true || isAdminMaster;
                const isReport5Unlocked = (completedAuditsCount === 4 || isAdminMaster) && hasTool5Access;
                const isReport5WaitingUpgrade = completedAuditsCount === 4 && !hasTool5Access;
                
                return (
                  <button
                    onClick={() => {
                      if (isReport5Unlocked) {
                        setActiveAssessment('entUnifiedReport');
                      } else if (isReport5WaitingUpgrade) {
                        setIsEnterpriseCheckoutOpen(true);
                      } else {
                        alert(`Assessment 5 is locked. Please complete all 4 Core Audits first (${completedAuditsCount} of 4 complete).`);
                      }
                    }}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[9.5px]/none font-black uppercase tracking-wider flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      isReport5Unlocked
                        ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/10'
                        : isReport5WaitingUpgrade
                          ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 shadow-sm animate-pulse'
                          : 'bg-stone-100 border-stone-200 text-stone-400 hover:bg-stone-150'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Report 5: {isReport5Unlocked ? 'Download Unified Report' : isReport5WaitingUpgrade ? 'Unlock Unified Report (Free with Promo/Premium)' : 'Unified Report (Locked)'}
                  </button>
                );
              })()}

              {/* Report 6 button */}
              {(() => {
                const isAdminMaster = (profile as any)?.hasAdminMasterAccess === true;
                const hasPremiumPromoActive = (profile as any)?.hasPremiumPromoActive === true || isAdminMaster;
                const isReport6Unlocked = (isConsolidationUnlocked || isAdminMaster) && (userTier === 'premium' || isAdminMaster) && hasPremiumPromoActive;
                const isReport6WaitingUpgrade = (isConsolidationUnlocked || isAdminMaster) && !((userTier === 'premium' || isAdminMaster) && hasPremiumPromoActive);
                
                return (
                  <button
                    onClick={() => {
                      if (isReport6Unlocked) {
                        setActiveAssessment('entMultiRaterConsolidation');
                      } else if (isReport6WaitingUpgrade) {
                        if (userTier === 'premium' && !hasPremiumPromoActive) {
                          alert("Assessment 6 is a premium feature accessible only with a premium free promo code. Please redeem your premium promo code in the checkout section.");
                        }
                        setIsEnterpriseCheckoutOpen(true);
                      } else {
                        alert(`Assessment 6 is locked. Requires all 5 co-worker matrices to be completed (currently ${completedTeammatesCount} of 5 completed).`);
                      }
                    }}
                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[9.5px]/none font-black uppercase tracking-wider flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                      isReport6Unlocked
                        ? 'bg-[#104C64] border-[#104C64] text-white hover:bg-[#0D3E52] shadow-sm shadow-[#104C64]/10'
                        : isReport6WaitingUpgrade
                          ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600 shadow-sm animate-pulse'
                          : 'bg-stone-100 border-stone-200 text-stone-400 hover:bg-stone-150'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Report 6: {isReport6Unlocked ? 'Download Team Split Report' : isReport6WaitingUpgrade ? 'Unlock Split Report (Premium)' : 'Consolidation Report (Locked)'}
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* Dynamic Selector Toggle Tabs / Dropdowns Toolbar */}
        <div 
          id="dynamic-dropdowns-toolbar" 
          className={`grid gap-4 w-full mx-auto relative z-30 ${
            isEnterprise 
              ? 'grid-cols-1 max-w-md' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl'
          }`}
        >
          
          {/* 1. Assessments Dropdown Button */}
          <div className="relative w-full" id="assessments-dropdown-container">
            <button
               id="assessments-dropdown-btn"
              onClick={() => {
                setActiveDropdown(activeDropdown === 'assessments' ? null : 'assessments');
              }}
              className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-stone-50 text-[#104C64] border border-stone-200/80 rounded-2xl shadow-sm transition-all text-[11px] font-black uppercase tracking-wider cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#104C64]" />
                Assessments
              </span>
              <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${activeDropdown === 'assessments' ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {activeDropdown === 'assessments' && (
                <>
                  {/* Overlay to catch clicks outside dropdown */}
                  <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                  
                  <motion.div
                    id="assessments-popup-menu"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden z-20 flex flex-col divide-y divide-stone-100 max-h-[380px] overflow-y-auto"
                  >
                    <div className="bg-stone-50/50 px-4 py-2.5 text-[9px] font-black text-stone-450 uppercase tracking-widest border-b border-stone-150">
                      Select Assessment to Lock Matrix View
                    </div>
                    <button
                      onClick={() => {
                        setActiveAssessment('instructions');
                        setActiveDropdown(null);
                      }}
                      className={`w-full text-left p-4 hover:bg-stone-50 transition-all flex flex-col text-stone-700 font-sans cursor-pointer group ${
                        activeAssessment === 'instructions' ? 'bg-[#104C64]/5 hover:bg-[#104C64]/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${activeAssessment === 'instructions' ? 'text-[#104C64]' : 'text-stone-800'}`}>
                          0. Instructions & FAQs
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5" /> Guide
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 font-medium leading-relaxed font-sans block max-w-sm">
                        Read instructions, progressive process flow map, and core diagnostic FAQs.
                      </p>
                    </button>
                    {assessmentsList.map((item) => {
                      const isActive = activeAssessment === item.id;
                      const isAdminMaster = (profile as any)?.hasAdminMasterAccess === true;
                      const hasTool5Access = userTier === 'premium' || (profile as any)?.hasFreeTool5Access === true || isAdminMaster;
                      const hasPremiumPromoActive = (profile as any)?.hasPremiumPromoActive === true || isAdminMaster;
                      
                      const handleDropdownItemClick = () => {
                        if (item.id === 'entUnifiedReport') {
                          const isDone = (completedAuditsCount === 4 || isAdminMaster) && hasTool5Access;
                          const isDoneButFree = completedAuditsCount === 4 && !hasTool5Access && !isAdminMaster;
                          if (isDone) {
                            setActiveAssessment(item.id);
                          } else if (isDoneButFree) {
                            setIsEnterpriseCheckoutOpen(true);
                          } else {
                            alert(`Assessment 5 is locked. Complete all 4 Core Audits first (${completedAuditsCount}/4 done).`);
                          }
                        } else if (item.id === 'entMultiRaterConsolidation') {
                          const isDone = (isConsolidationUnlocked || isAdminMaster) && (userTier === 'premium' || isAdminMaster) && hasPremiumPromoActive;
                          const isDoneButFree = (isConsolidationUnlocked || isAdminMaster) && !((userTier === 'premium' || isAdminMaster) && hasPremiumPromoActive) && !isAdminMaster;
                          if (isDone) {
                            setActiveAssessment(item.id);
                          } else if (isDoneButFree) {
                            if (userTier === 'premium' && !hasPremiumPromoActive) {
                              alert("Assessment 6 is a premium feature accessible only with a premium free promo code. Please redeem your premium promo code in the checkout section.");
                            }
                            setIsEnterpriseCheckoutOpen(true);
                          } else {
                            alert(`Assessment 6 is locked. Requires all 5 co-worker matrices to be completed (currently ${completedTeammatesCount} of 5 completed).`);
                          }
                        } else {
                          setActiveAssessment(item.id);
                        }
                        setActiveDropdown(null);
                      };

                      return (
                        <button
                          key={item.id}
                          id={`assessment-item-${item.id}`}
                          onClick={handleDropdownItemClick}
                          className={`w-full text-left p-4 hover:bg-stone-50 transition-all flex flex-col text-stone-700 font-sans cursor-pointer group ${
                            isActive ? 'bg-[#104C64]/5 hover:bg-[#104C64]/10' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className={`text-[11px] font-black uppercase tracking-wider ${isActive ? 'text-[#104C64]' : 'text-stone-800'}`}>
                              {item.shortName}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              item.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : item.status === 'upcoming'
                                  ? 'bg-[#c4a882]/10 text-[#c4a882] border border-[#c4a882]/20'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500 font-medium leading-relaxed font-sans block max-w-sm">
                            {item.description}
                          </p>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {!isEnterprise && (
            <>
              {/* 2. Sessions Dropdown Button */}
              <div className="relative w-full" id="sessions-dropdown-container">
                <button
                  id="sessions-dropdown-btn"
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'sessions' ? null : 'sessions');
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-stone-50 text-[#104C64] border border-stone-200/80 rounded-2xl shadow-sm transition-all text-[11px] font-black uppercase tracking-wider cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#104C64]" />
                    Sessions
                  </span>
                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${activeDropdown === 'sessions' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'sessions' && (
                    <>
                      {/* Overlay to catch clicks outside dropdown */}
                      <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                      
                      <motion.div
                        id="sessions-popup-menu"
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden z-20 flex flex-col divide-y divide-stone-100 max-h-[380px] overflow-y-auto shadow-2xl"
                      >
                        <div className="bg-stone-50/50 px-4 py-2.5 text-[9px] font-black text-stone-450 uppercase tracking-widest border-b border-stone-150">
                          Explore Educational and Collaborative Cohorts
                        </div>
                        {sessionsList.map((item) => (
                          <button
                            key={item.id}
                            id={`session-item-${item.id}`}
                            onClick={() => {
                              setSelectedSessionModal(item);
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left p-4 hover:bg-stone-50 transition-all flex flex-col text-stone-700 font-sans cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="text-[11px] font-black text-stone-800 uppercase tracking-wider block truncate max-w-[200px]">
                                {item.title}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                                 item.status === 'completed'
                                   ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                   : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              }`}>
                                {item.status === 'completed' ? 'attended' : 'upcoming / not launched'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between w-full mt-0.5">
                              <span className="text-[9px] font-mono text-stone-400 font-medium">
                                {item.date}
                              </span>
                              <span className="text-[9px] text-[#104C64] hover:underline font-bold uppercase tracking-wider">
                                View details
                              </span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* 3. NEW: Assignments Dropdown Button */}
              <div className="relative w-full" id="assignments-dropdown-container">
                <button
                  id="assignments-dropdown-btn"
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'assignments' ? null : 'assignments');
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-stone-50 text-[#104C64] border border-stone-200/80 rounded-2xl shadow-sm transition-all text-[11px] font-black uppercase tracking-wider cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#104C64]" />
                    Assignments
                  </span>
                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${activeDropdown === 'assignments' ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {activeDropdown === 'assignments' && (
                    <>
                      {/* Overlay to catch clicks outside dropdown */}
                      <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                      
                      <motion.div
                        id="assignments-popup-menu"
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden z-20 flex flex-col divide-y divide-stone-100 max-h-[380px] overflow-y-auto shadow-2xl"
                      >
                        <div className="bg-stone-50/50 px-4 py-2.5 text-[9px] font-black text-stone-450 uppercase tracking-widest border-b border-stone-150 flex items-center justify-between">
                          <span>Coaching Assignments</span>
                          <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded uppercase">Premium Offer</span>
                        </div>
                        {userTier === 'free' ? (
                          <div className="p-6 text-center space-y-4">
                            <Lock className="w-8 h-8 text-amber-500 mx-auto" strokeWidth={1.5} />
                            <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">Assignments Locked</h4>
                            <p className="text-[10px] text-stone-500 leading-relaxed">
                              Unlock structured high-stakes leadership assignments, interaction mapping, and peer behavioral logs on the Premium tier.
                            </p>
                            <button 
                              onClick={handleUpgradeToPremium}
                              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer border border-amber-400/20"
                            >
                              Unlock Assignments
                            </button>
                          </div>
                        ) : (
                          <>
                            {assignments.map((item) => (
                              <button
                                key={item.id}
                                id={`assignment-item-${item.id}`}
                                disabled={true}
                                className="w-full text-left p-4 flex items-center justify-between text-stone-400 font-sans cursor-not-allowed gap-4 opacity-75"
                              >
                                <div className="space-y-0.5">
                                  <span className="text-[11px] font-semibold block text-stone-500">
                                    {item.title}
                                  </span>
                                  <span className="text-[9px] text-stone-400 block uppercase tracking-wider font-bold">
                                    {item.id === '1' ? 'Coursework Core' : item.id === '2' ? 'Interaction Map' : 'Observation Guide'}
                                  </span>
                                </div>
                                
                                <div className="shrink-0">
                                  <span className="text-[9px] bg-stone-100 text-stone-500 border border-stone-200 font-bold px-2 py-0.5 rounded uppercase font-mono">
                                    Coming Soon
                                  </span>
                                </div>
                              </button>
                            ))}
                            <div className="p-3 bg-stone-50 text-center text-[10px] text-stone-550 font-mono border-t border-stone-100 uppercase tracking-wider font-semibold">
                              Expert-designed leadership assignments coming soon
                            </div>
                          </>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* 4. NEW: Daily Reflections Dropdown Button */}
              <div className="relative w-full" id="reflections-dropdown-container">
                <button
                  id="reflections-dropdown-btn"
                  onClick={() => {
                    setActiveDropdown(activeDropdown === 'reflections' ? null : 'reflections');
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 bg-[#104C64]/5 hover:bg-[#104C64]/10 text-[#104C64] border border-[#104C64]/20 rounded-2xl shadow-sm transition-all text-[11px] font-black uppercase tracking-wider cursor-pointer"
                  style={{ outline: activeDropdown === 'reflections' ? '2px solid #104C64' : 'none' }}
                >
                  <span className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-[#104C64]" />
                    Daily Reflection
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {reflections.length > 0 && (
                      <span className="bg-[#104C64] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block">
                        {reflections.length}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-[#104C64]/70 transition-transform duration-300 ${activeDropdown === 'reflections' ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {activeDropdown === 'reflections' && (
                    <>
                      {/* Overlay to catch clicks outside dropdown */}
                      <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                      <motion.div
                        id="reflections-popup-menu"
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden z-20 flex flex-col divide-y divide-stone-100 max-h-[380px] overflow-y-auto shadow-2xl w-[280px] sm:w-[320px] right-0 sm:left-auto"
                      >
                        <div className="bg-[#104C64]/5 px-4 py-2.5 text-[9px] font-black text-[#104C64] uppercase tracking-widest border-b border-stone-150 flex items-center justify-between">
                          <span>Daily EQ Reflection Gym</span>
                          <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded uppercase">Premium Offer</span>
                        </div>
                        
                        <div className="p-4 space-y-3 bg-white">
                          {/* 1. Micro-Reflection Button (Available to Everyone) */}
                          <button
                            onClick={() => {
                              setIsMicroRefModalOpen(true);
                              setActiveDropdown(null);
                            }}
                            className="w-full py-3 bg-gradient-to-r from-teal-600 to-[#104C64] hover:opacity-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider text-center cursor-pointer shadow-md shadow-[#104C64]/10 transition-colors flex items-center justify-center gap-2"
                          >
                            <Flame className="w-3.5 h-3.5 fill-white animate-pulse" />
                            Shorter 3s Pause Tool
                          </button>

                          {/* 2. Flagship Feature: Pattern Analytics & Insights Panel */}
                          <button
                            onClick={() => {
                              setHistoryModalTab('analytics');
                              setIsHistoryModalOpen(true);
                              setActiveDropdown(null);
                            }}
                            className="w-full py-3 bg-gradient-to-r from-[#104C64]/5 to-[#41B1C2]/10 hover:from-[#104C64]/10 hover:to-[#41B1C2]/15 text-[#104C64] border border-[#104C64]/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-center cursor-pointer transition-colors flex items-center justify-center gap-2 relative overflow-hidden group shadow-sm"
                          >
                            <span className="absolute left-2 top-2 flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                            </span>
                            <Activity className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform animate-pulse" />
                            Pattern Analytics &amp; Insights
                          </button>

                          {/* 3. Review Past Reflections (Available to Everyone) */}
                          <button
                            onClick={() => {
                              setHistoryModalTab('entries');
                              setIsHistoryModalOpen(true);
                              setActiveDropdown(null);
                            }}
                            className="w-full py-3 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-[10px] font-semibold uppercase tracking-wider text-center cursor-pointer transition-colors flex items-center justify-center gap-2"
                          >
                            <History className="w-3.5 h-3.5 text-[#104C64]" />
                            Review Past Reflections ({reflections.length})
                          </button>
                        </div>

                        {userTier === 'free' ? (
                          <div className="bg-stone-50/80 p-4 border-t border-stone-150 space-y-2">
                            <div className="flex items-center gap-1.5 text-[8.5px] font-black text-amber-700 uppercase tracking-widest">
                              <Lock className="w-3 h-3 text-amber-500" strokeWidth={2.5} />
                              Guided Deep Reflection Gym
                            </div>
                            <p className="text-[9.5px] text-stone-500 font-sans leading-relaxed">
                              Deep situations need structured multi-factor mapping and AI coaching.
                            </p>
                            <button
                              onClick={handleUpgradeToPremium}
                              className="w-full py-2 bg-[#104C64]/5 hover:bg-[#104C64]/10 border border-[#104C64]/20 text-[#104C64] font-black uppercase tracking-wider text-[8px] rounded-lg transition-all cursor-pointer"
                            >
                              ★ Upgrade to Unlock Deep Gym
                            </button>
                          </div>
                        ) : (
                          <div className="p-4 bg-stone-50/80 border-t border-stone-150 space-y-2">
                            <div className="flex items-center gap-1.5 text-[8.5px] font-black text-emerald-700 uppercase tracking-widest">
                              <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                              Guided Deep Reflection Gym
                            </div>
                            <p className="text-[9.5px] text-stone-500 font-sans leading-relaxed">
                              Unlocked! Map complete stressors with guide wizard.
                            </p>
                            <button
                              onClick={() => {
                                setIsReflectionModalOpen(true);
                                setActiveDropdown(null);
                              }}
                              className="w-full py-2 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-wider text-[8.5px] rounded-lg transition-all cursor-pointer shadow-sm"
                            >
                              Open Deep Gym
                            </button>
                          </div>
                        )}

                        {reflections.length > 0 ? (
                          <div className="flex flex-col divide-y divide-stone-100 max-h-[160px] overflow-y-auto">
                            <div className="bg-stone-50 px-4 py-2 text-[8px] font-black text-stone-400 uppercase tracking-widest sticky top-0 z-10">
                              Recent Journal Entries
                            </div>
                            {reflections.slice(0, 3).map((item) => {
                              let dateStr = "Recently Logged";
                              if (item.createdAt?.seconds) {
                                dateStr = new Date(item.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                              }
                              const intensityColors = ['border-red-500 bg-red-500', 'border-orange-500 bg-orange-500', 'border-yellow-500 bg-yellow-500', 'border-lime-500 bg-lime-500', 'border-emerald-500 bg-emerald-500'];
                              const currentIntensityColor = intensityColors[item.intensity - 1] || 'border-stone-400 bg-stone-400';
                              return (
                                <div 
                                  key={item.id}
                                  onClick={() => {
                                    setSelectedReflection(item);
                                    setActiveDropdown(null);
                                  }}
                                  className="p-3 hover:bg-stone-50 transition-colors cursor-pointer flex flex-col text-left gap-1"
                                >
                                  <div className="space-y-0.5 min-w-0 flex-1">
                                    <span className="text-[10px] font-semibold text-stone-850 line-clamp-1 block leading-normal">
                                      {item.isMicroReflection ? `⚡ ${item.situation}` : item.situation}
                                    </span>
                                    <div className="flex items-center justify-between text-[8px] text-gray-400 font-mono mt-0.5">
                                      <span>{dateStr}</span>
                                      {item.isMicroReflection ? (
                                        <span className="text-teal-600 font-bold uppercase tracking-wider">Micro Log ({item.preciseEmotion})</span>
                                      ) : (
                                        <span className="text-stone-500 uppercase">Deep Reflection</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-stone-400 text-[10px] font-sans italic bg-stone-50/50">
                            No situations logged yet. Give it a try on your first emotional trigger!
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          </div>

        {/* Floating Session Detail Modal */}
        <AnimatePresence>
          {selectedSessionModal && (
            <div id="session-detail-overlay-wrapper" className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* Blur backdrop */}
              <motion.div 
                id="session-modal-blur-bg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedSessionModal(null)}
                className="absolute inset-0 bg-[#104C64]/30 backdrop-blur-md"
              />
              
              <motion.div
                id="session-detail-modal-body"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] p-8 md:p-10 shadow-2xl border border-stone-100 max-w-md w-full relative z-10 space-y-6"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                      selectedSessionModal.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {selectedSessionModal.status === 'completed' ? 'Attended / Completed' : 'Upcoming Session'}
                    </span>
                    <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight mt-3">
                      {selectedSessionModal.title}
                    </h3>
                  </div>
                  <button 
                    id="close-session-modal-btn"
                    onClick={() => setSelectedSessionModal(null)}
                    className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-150 justify-between items-center text-xs">
                    <span className="text-stone-400 font-bold uppercase tracking-wider">Schedule Time</span>
                    <span className="font-mono font-bold text-[#104C64]">{selectedSessionModal.date}</span>
                  </div>

                  <p className="text-xs text-stone-600 font-sans leading-relaxed">
                    {selectedSessionModal.description}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  {selectedSessionModal.status === 'completed' ? (
                    <button
                      id="watch-stream-replay"
                      onClick={() => alert("Launching dynamic replay of recorded webinar stream... enjoy consolidation!")}
                      className="w-full py-4 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-md shadow-[#104C64]/10 cursor-pointer text-center"
                    >
                      Watch Recorded Replay
                    </button>
                  ) : (
                    <button
                      id="rsvp-session-action"
                      onClick={() => alert(`RSVP is confirmed for this event! Add-to-Calendar invite successfully dispatched.`)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer text-center"
                    >
                      RSVP to Calendar & Pre-register
                    </button>
                  )}
                  <button
                    id="close-panel-btn"
                    onClick={() => setSelectedSessionModal(null)}
                    className="w-full py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-500 font-bold uppercase tracking-wide text-[10px] rounded-2xl transition-all cursor-pointer text-center"
                  >
                    Close Panel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==================== DAILY REFLECTION EXERCISE TOOL MODALS ==================== */}
        
        {/* 0. MICRO-REFLECTION: 3-Second Pause Stimulus-Response Gap Training */}
        <AnimatePresence>
          {isMicroRefModalOpen && (
            <div id="micro-reflection-overlay-wrapper" className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* Blur backdrop overlay */}
              <motion.div
                id="micro-reflection-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
                onClick={() => setIsMicroRefModalOpen(false)}
              />
              
              {/* Modal Card */}
              <motion.div
                id="micro-reflection-modal-body"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] p-6 md:p-8 shadow-2xl border border-stone-150 max-w-xl lg:max-w-4xl w-full relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Visual flashy element ribbon */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-500 via-rose-500 to-amber-500 animate-pulse" />

                {/* Top header logic */}
                <div className="flex justify-between items-start mb-4 shrink-0">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200/50 px-2.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-rose-600 shrink-0" />
                      Stimulus-Response Gap
                    </span>
                    <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight mt-1.5">
                      3s Habit-Pause Log
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsMicroRefModalOpen(false)}
                    className="text-stone-400 hover:text-stone-600 font-bold text-xl cursor-pointer w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100"
                  >
                    ×
                  </button>
                </div>

                {microRefFeedback ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 animate-bounce">
                      <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <h3 className="text-lg font-black text-[#104C64] uppercase tracking-wider">Gap Logged!</h3>
                    <p className="text-stone-500 text-xs font-sans max-w-xs leading-normal">
                      {microRefFeedback}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 overflow-hidden">
                    {/* Left Form Column */}
                    <div className="lg:col-span-7 flex flex-col justify-between overflow-y-auto pr-1">
                      <div className="space-y-4 pb-4 select-none">
                        {/* Activity Purpose & Explanation */}
                        <div className="bg-stone-50 p-4 rounded-3xl border border-stone-150 space-y-2 text-left">
                          <h4 className="text-[10px] font-black text-[#104C64] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Micro Habit Training (2-Week Challenge)
                          </h4>
                          <p className="text-[10.5px] text-stone-600 font-sans leading-relaxed">
                            The stimulus-response gap is the most fundamental skill in the entire model. This activity trains it at the micro level — in real conditions, every day, without anyone knowing you are doing it.
                          </p>
                        </div>

                        {/* Form Fields container */}
                        <div className="space-y-4 text-left">
                          {/* Field 1: Trigger text */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[#104C64] uppercase tracking-wider block">
                              1. What Triggered It?
                            </label>
                            <p className="text-[9px] text-stone-500 font-sans">Identify the physical event, raw action, distraction, or discomfort event</p>
                            <input
                              type="text"
                              className="w-full px-4 py-3 rounded-2xl border border-stone-200 text-xs text-stone-850 font-sans focus:outline-none focus:border-[#104C64] bg-stone-50/50"
                              placeholder="e.g. interruption in meeting, colleague ignoring email, sharp critical feedback"
                              value={microTriggerText}
                              onChange={(e) => setMicroTriggerText(e.target.value)}
                            />
                          </div>

                          {/* Field 2: Precise Emotion */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#104C64] uppercase tracking-wider block">
                              2. Precise Emotion Word
                            </label>
                            <p className="text-[9px] text-stone-500 font-sans">
                              Before responding, name what you feel precisely. Feel it rawly.
                            </p>
                            
                            {/* Interactive badges preset categories */}
                            <div className="space-y-3 pt-1">
                              {/* Category selector */}
                              <div className="flex flex-wrap gap-2.5 text-[9px] font-black uppercase tracking-wider border-b border-stone-150 pb-1.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => setActiveEmotionCategory('worth')}
                                  className={`pb-1 pr-1 cursor-pointer transition-all border-b-2 ${
                                    activeEmotionCategory === 'worth'
                                      ? 'text-[#104C64] border-[#104C64]'
                                      : 'text-stone-400 border-transparent hover:text-stone-600'
                                  }`}
                                >
                                  Value &amp; Respect
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveEmotionCategory('control')}
                                  className={`pb-1 pr-1 cursor-pointer transition-all border-b-2 ${
                                    activeEmotionCategory === 'control'
                                      ? 'text-[#104C64] border-[#104C64]'
                                      : 'text-stone-400 border-transparent hover:text-stone-600'
                                  }`}
                                >
                                  Control &amp; Safety
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveEmotionCategory('inclusion')}
                                  className={`pb-1 pr-1 cursor-pointer transition-all border-b-2 ${
                                    activeEmotionCategory === 'inclusion'
                                      ? 'text-[#104C64] border-[#104C64]'
                                      : 'text-stone-400 border-transparent hover:text-stone-600'
                                  }`}
                                >
                                  Inclusion &amp; Belonging
                                </button>
                              </div>

                              {/* Interactive badges list */}
                              <div className="flex flex-wrap gap-1.5 min-h-[38px]">
                                {(activeEmotionCategory === 'worth' 
                                  ? ["Undermined", "Slighted", "Devalued", "Dismissed", "Disrespected", "Invalidated"]
                                  : activeEmotionCategory === 'control'
                                  ? ["Overwhelmed", "Anxious", "Stifled", "Pressured", "Restricted", "Stressed"]
                                  : ["Excluded", "Overlooked", "Embarrassed", "Isolated", "Guarded", "Defensive"]
                                ).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    onClick={() => setMicroPreciseEmotion(item)}
                                    className={`px-2.5 py-1.5 text-[9.5px] font-bold rounded-xl border transition-all cursor-pointer ${
                                      microPreciseEmotion === item 
                                        ? 'bg-gradient-to-r from-teal-500 to-[#104C64] text-white border-transparent shadow shadow-teal-500/10 scale-[1.02] font-black'
                                        : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                                    }`}
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Custom emotion input */}
                            <div className="pt-1.5">
                              <input
                                  type="text"
                                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-xs text-stone-850 font-sans focus:outline-none focus:border-[#104C64] bg-stone-50/50"
                                  placeholder="Or type your own precise feeling..."
                                  value={microPreciseEmotion}
                                  onChange={(e) => setMicroPreciseEmotion(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Field 3: What you chose to do */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-[#104C64] uppercase tracking-wider block">
                              3. What you chose to do?
                            </label>
                            <p className="text-[9px] text-stone-500 font-sans">How did you design your active behavior after taking a step back?</p>
                            <textarea
                              className="w-full p-4 rounded-2xl border border-stone-200 text-xs text-stone-850 font-sans focus:outline-none focus:border-[#104C64] bg-stone-50/50 min-h-[80px] resize-none"
                              placeholder="e.g. paused, took deep breath, asked clarifying questions professionally, log and sleep on it"
                              value={microChosenAction}
                              onChange={(e) => setMicroChosenAction(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3-Second Gap countdown & submit toolbar */}
                      <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-white">
                        <div className="flex items-center gap-2">
                          {microPauseSecondsLeft > 0 ? (
                            <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-wider animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block shrink-0" />
                              Mindful Pause Gap Required: Take {microPauseSecondsLeft}S
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-wider">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 inline-block shrink-0" />
                              Stimulus Gap Achieved! Ready to Respond
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleSaveMicroReflection}
                          disabled={isMicroRefSubmitting || microPauseSecondsLeft > 0}
                          className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all w-full sm:w-auto text-center ${
                            microPauseSecondsLeft > 0
                              ? 'bg-stone-100 border border-stone-200 text-stone-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-teal-600 to-[#104C64] text-white shadow-md hover:from-teal-700 hover:to-[#0D3E52]'
                          }`}
                        >
                          {isMicroRefSubmitting ? 'Securing Gap Log...' : 'Commit Log & Act 🔥'}
                        </button>
                      </div>
                    </div>

                    {/* Right Live Behavior Trends Sidebar */}
                    <div className="lg:col-span-5 hidden lg:flex bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-3xl border border-stone-200/50 p-5 flex-col space-y-5 font-sans text-left overflow-y-auto max-h-[64vh]">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
                        <div className="p-2 bg-[#104C64]/10 rounded-xl text-[#104C64] shrink-0">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-[#104C64] uppercase tracking-wider">Live Behavior Trends</h4>
                          <span className="text-[8px] text-stone-500 font-bold uppercase tracking-widest block font-mono">Conscious Pause Metrics</span>
                        </div>
                      </div>

                      {reflections.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                          <h5 className="text-[10px] font-black text-stone-700 uppercase tracking-wider">Awaiting Initial Log</h5>
                          <p className="text-[10px] font-medium leading-relaxed max-w-[200px] mx-auto">
                            Add your first mindful pause log to activate cognitive pattern mappings.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Mini dynamic statistics */}
                          <div className="space-y-2.5">
                            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Regulation Summary</span>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="bg-white p-3 rounded-2xl border border-stone-150">
                                <span className="text-[8px] text-stone-450 font-black uppercase tracking-wider block">Conscious Pauses</span>
                                <div className="text-xl font-black text-[#104C64] mt-0.5">{analyticsData?.microCount || 0} logs</div>
                              </div>
                              <div className="bg-white p-3 rounded-2xl border border-stone-150">
                                <span className="text-[8px] text-stone-450 font-black uppercase tracking-wider block">Avg Intensity</span>
                                <div className="text-xl font-black text-[#104C64] mt-0.5">{analyticsData?.avgIntensity || 3.0} / 5</div>
                              </div>
                            </div>
                          </div>

                          {/* Top logged emotions */}
                          <div className="space-y-2.5">
                            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Common Trigger Emotions</span>
                            <div className="space-y-1.5">
                              {analyticsData?.topEmotions && analyticsData.topEmotions.length > 0 ? (
                                analyticsData.topEmotions.slice(0, 3).map(([emotion, count]: any) => (
                                  <div key={emotion} className="flex justify-between items-center text-[10px] font-medium bg-white px-3 py-2 rounded-xl border border-stone-150">
                                    <span className="text-[#104C64] font-bold">🎯 {emotion}</span>
                                    <span className="text-stone-500 font-mono text-[9px]">{count}x logged</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-stone-400 font-sans italic p-2 bg-white rounded-xl border border-stone-150">No emotions tracked yet. Select a badge or type your own.</p>
                              )}
                            </div>
                          </div>

                          {/* Dynamic Action Target Tip */}
                          <div className="p-4 bg-[#104C64]/5 border border-[#104C64]/10 rounded-2xl flex items-start gap-3 mt-auto">
                            <Brain className="w-4 h-4 text-[#104C64] mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase text-[#104C64] tracking-wider block">Cognitive Action Design</span>
                              <p className="text-[10px] text-[#104C64]/90 leading-relaxed font-sans font-medium">
                                {analyticsData?.topEmotions && analyticsData.topEmotions.length > 0
                                  ? `When "${analyticsData.topEmotions[0][0]}" triggers your emotional engine, practice a sub-verbal anchor: "I am taking space to decide my next action."`
                                  : "Pause logs create a cortical delay that allows the logical prefrontal center to override defensive survival reflexes."}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 1. WIZARD: Step-by-Step Daily EQ Journal Reflection Wizard */}
        <AnimatePresence>
          {isReflectionModalOpen && (
            <div id="reflection-wizard-overlay-wrapper" className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* Blur backdrop */}
              <motion.div
                id="reflection-wizard-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#104C64]/35 backdrop-blur-md"
                onClick={() => setIsReflectionModalOpen(false)}
              />
              {/* Modal Body */}
              <motion.div
                id="reflection-wizard-modal-body"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] p-6 md:p-8 shadow-2xl border border-stone-100 max-w-2xl lg:max-w-5xl w-full relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Top indicators */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-[#104C64] uppercase tracking-widest bg-[#104C64]/5 px-3 py-1.5 rounded-full flex items-center gap-1">
                    <PenTool className="w-3.5 h-3.5" />
                    EQ Reflection Wizard
                  </span>
                  <button
                    onClick={() => setIsReflectionModalOpen(false)}
                    className="text-stone-400 hover:text-stone-600 font-bold text-xl cursor-pointer w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100"
                  >
                    ×
                  </button>
                </div>

                {/* Step Progress Bar */}
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-6 flex">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <div 
                      key={idx}
                      className={`flex-1 h-full transition-colors duration-300 ${
                        idx <= reflectionStep ? 'bg-[#104C64]' : 'bg-stone-100'
                      } ${idx < 6 ? 'border-r border-white' : ''}`}
                    />
                  ))}
                </div>

                {/* Active Step Content */}
                <div className="flex-1 overflow-hidden py-2 flex flex-col">
                  {reflectionFeedback ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 flex-1 overflow-y-auto">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center animate-bounce border border-emerald-100">
                        <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                      </div>
                      <h3 className="text-xl font-bold text-[#104C64]">Reflection Logged Successfully</h3>
                      <p className="text-stone-500 font-sans text-xs max-w-sm leading-normal">
                        {reflectionFeedback}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch flex-1 overflow-hidden">
                      {/* Left Column: Form & Step Content */}
                      <div className="lg:col-span-12 xl:col-span-7 lg:col-span-7 flex flex-col overflow-y-auto pr-1 space-y-5 text-left select-none">
                        {reflectionStep === 0 && (
                        <div className="space-y-3">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 1 of 7: The Situation</div>
                          <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight">Describe the Situation</h3>
                          <p className="text-stone-500 font-sans text-xs leading-relaxed">
                            Describe any situation today or recently that moved your feelings or elicited strong physical/emotional reactions. What exactly happened?
                          </p>
                          <div className="relative rounded-2xl border border-stone-200 overflow-hidden bg-stone-50/30">
                            <textarea
                              className="w-full p-4 text-stone-700 font-sans text-xs focus:outline-none min-h-[160px] resize-none"
                              style={{ 
                                backgroundImage: 'linear-gradient(rgba(16, 76, 100, 0.08) 1px, transparent 1px)', 
                                backgroundSize: '100% 2.2rem', 
                                lineHeight: '2.2rem',
                                paddingTop: '0.5rem'
                              }}
                              placeholder="Describe the scene, the trigger, or the environment..."
                              value={newReflection.situation}
                              onChange={(e) => setNewReflection({ ...newReflection, situation: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {reflectionStep === 1 && (
                        <div className="space-y-3">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 2 of 7: Your Response</div>
                          <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight">How Did You React?</h3>
                          <p className="text-stone-500 font-sans text-xs leading-relaxed">
                            What immediate thoughts, actions, verbal behaviors, or immediate impulse did you experience? Break down your natural reaction.
                          </p>
                          <div className="relative rounded-2xl border border-stone-200 overflow-hidden bg-stone-50/30">
                            <textarea
                              className="w-full p-4 text-stone-700 font-sans text-xs focus:outline-none min-h-[160px] resize-none"
                              style={{ 
                                backgroundImage: 'linear-gradient(rgba(16, 76, 100, 0.08) 1px, transparent 1px)', 
                                backgroundSize: '100% 2.2rem', 
                                lineHeight: '2.2rem',
                                paddingTop: '0.5rem'
                              }}
                              placeholder="I felt defensive because... / My voice became louder and I..."
                              value={newReflection.reaction}
                              onChange={(e) => setNewReflection({ ...newReflection, reaction: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {reflectionStep === 2 && (
                        <div className="space-y-5">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 3 of 7: Intensity Rate</div>
                          <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight">Intensity of the situation</h3>
                          <p className="text-stone-500 font-sans text-xs leading-relaxed">
                            Rate how high or low the subjective emotional charge felt during this event. High scores denote severe triggers or spikes.
                          </p>
                          
                          {/* 5 Stepped Circle Ratings matching screenshot perfectly! */}
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-8 bg-stone-50 rounded-3xl border border-stone-100">
                            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Low</span>
                            
                            <div className="flex items-center gap-4">
                              {[
                                { level: 1, label: "Red", text: "Low", activeClass: "bg-red-500 text-white border-red-500 hover:bg-red-600", defaultClass: "border-red-500/50 text-red-500 bg-red-50/35 hover:bg-red-50" },
                                { level: 2, label: "Orange", text: "Low-Med", activeClass: "bg-orange-500 text-white border-orange-500 hover:bg-orange-600", defaultClass: "border-orange-500/50 text-orange-500 bg-orange-50/35 hover:bg-orange-50" },
                                { level: 3, label: "Yellow", text: "Medium", activeClass: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600", defaultClass: "border-amber-500/50 text-amber-500 bg-amber-50/35 hover:bg-amber-50" },
                                { level: 4, label: "Lime", text: "Med-High", activeClass: "bg-lime-500 text-black border-lime-500 hover:bg-lime-600", defaultClass: "border-lime-500/50 text-lime-600 bg-lime-50/35 hover:bg-lime-50" },
                                { level: 5, label: "Green", text: "High", activeClass: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600", defaultClass: "border-emerald-500/50 text-emerald-500 bg-emerald-50/35 hover:bg-emerald-50" }
                              ].map((step) => {
                                const isSelected = newReflection.intensity === step.level;
                                return (
                                  <button
                                    key={step.level}
                                    type="button"
                                    onClick={() => setNewReflection({ ...newReflection, intensity: step.level })}
                                    className={`w-[52px] h-[52px] rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer select-none font-sans ${
                                      isSelected ? `${step.activeClass} scale-110 shadow-lg` : step.defaultClass
                                    }`}
                                  >
                                    <span className="text-xs font-black">{step.level}</span>
                                    <span className="text-[7.5px] font-bold block opacity-90">{step.text}</span>
                                  </button>
                                );
                              })}
                            </div>
                            
                            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">High</span>
                          </div>
                        </div>
                      )}

                      {reflectionStep === 3 && (
                        <div className="space-y-5">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 4 of 7: Triggers & Proximity</div>
                          
                          <div className="space-y-2">
                            <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Was the trigger Internal or External?</h3>
                            <p className="text-stone-450 font-sans text-[11px] leading-relaxed">
                              <strong>Internal</strong> triggers refer to memories, private thoughts, or expectations. <strong>External</strong> triggers refer to spoken words, environmental events, actions, cold signals, or tight deadlines.
                            </p>
                            <div className="grid grid-cols-2 gap-4 pt-1">
                              {[
                                { id: 'internal', label: 'Internal Triggers 🧠', desc: 'Thoughts, private standards, expectations, cognitive memories' },
                                { id: 'external', label: 'External Triggers 🌍', desc: 'Actions, environmental events, conversations, tight deadlines' }
                              ].map((t) => {
                                const selected = newReflection.trigger === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setNewReflection({ ...newReflection, trigger: t.id as any })}
                                    className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                                      selected 
                                        ? 'border-[#104C64] bg-[#104C64]/5 ring-1 ring-[#104C64]'
                                        : 'border-stone-200 bg-white hover:bg-stone-50'
                                    }`}
                                  >
                                    <span className="text-xs font-black text-[#104C64] block mb-1">{t.label}</span>
                                    <span className="text-[10px] text-gray-500 font-sans leading-normal block">{t.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Who was involved and how did they contribute?</h3>
                            <input
                              type="text"
                              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-xs text-stone-700 font-sans focus:outline-none focus:border-[#104C64] bg-stone-50/50"
                              placeholder="e.g. My director (by interrupting my presentation), self (by assuming judgment), partner..."
                              value={newReflection.whoInvolved}
                              onChange={(e) => setNewReflection({ ...newReflection, whoInvolved: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {reflectionStep === 4 && (
                        <div className="space-y-4">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 5 of 7: Physiological Response</div>
                          <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight">Physical Symptoms</h3>
                          <p className="text-stone-500 font-sans text-xs leading-relaxed">
                            What somatic triggers did you feel? Tagging physiological indices makes you aware of triggers before cognitive hi-jacking happens.
                          </p>

                          {/* Quick-select tags */}
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            {[
                              'Rapid Heartbeat 💓',
                              'Sweating Palms 💦',
                              'Tight Chest 🫁',
                              'Muscle Tension / Clenched Jaw ⚡',
                              'Shallow Breathing 💨',
                              'Face Flushing / Rising Heat 🥵',
                              'Stomach Discomfort 🤢',
                              'Fidgeting / Jitteriness 🌀',
                              'None (Somatic Baseline) 🧘'
                            ].map((symptom) => {
                              const isSelected = newReflection.physicalSymptoms.includes(symptom);
                              return (
                                <button
                                  key={symptom}
                                  type="button"
                                  onClick={() => {
                                    if (newReflection.physicalSymptoms.includes(symptom)) {
                                      setNewReflection({
                                        ...newReflection,
                                        physicalSymptoms: newReflection.physicalSymptoms.filter(x => x !== symptom)
                                      });
                                    } else {
                                      setNewReflection({
                                        ...newReflection,
                                        physicalSymptoms: [...newReflection.physicalSymptoms, symptom]
                                      });
                                    }
                                  }}
                                  className={`px-3 py-2 rounded-xl border text-[11px] font-sans font-medium transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-[#104C64] text-white border-[#104C64] font-semibold shadow-sm'
                                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                  }`}
                                >
                                  {symptom}
                                </button>
                              );
                            })}
                          </div>

                          <div className="space-y-1 pt-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Other Custom Somatic Experiences</label>
                            <input
                              type="text"
                              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-xs text-stone-700 font-sans focus:outline-none focus:border-[#104C64] bg-stone-50/50"
                              placeholder="Describe other bodily reactions..."
                              value={newReflection.customSymptom}
                              onChange={(e) => setNewReflection({ ...newReflection, customSymptom: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {reflectionStep === 5 && (
                        <div className="space-y-3">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 6 of 7: Cognitive Thoughts</div>
                          <h3 className="text-lg font-black text-[#104C64] uppercase tracking-tight">Thoughts & Recurring Patterns</h3>
                          <p className="text-stone-500 font-sans text-xs leading-relaxed">
                            What thoughts or expectations were running through your mind? Are there recurring patterns, implicit rules, or cognitive biases?
                          </p>
                          <div className="relative rounded-2xl border border-stone-200 overflow-hidden bg-stone-50/30">
                            <textarea
                              className="w-full p-4 text-stone-700 font-sans text-xs focus:outline-none min-h-[160px] resize-none"
                              style={{ 
                                backgroundImage: 'linear-gradient(rgba(16, 76, 100, 0.08) 1px, transparent 1px)', 
                                backgroundSize: '100% 2.2rem', 
                                lineHeight: '2.2rem',
                                paddingTop: '0.5rem'
                              }}
                              placeholder="e.g. 'They are questioning my competence' / 'I should always be right'..."
                              value={newReflection.thoughts}
                              onChange={(e) => setNewReflection({ ...newReflection, thoughts: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {reflectionStep === 6 && (
                        <div className="space-y-5">
                          <div className="text-xs uppercase tracking-widest font-black text-[#104C64]/60">Step 7 of 7: Outcomes & Learning</div>
                          
                          <div className="space-y-2">
                            <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">How did it turn out, and did emotions change? (Outcome)</h4>
                            <textarea
                              className="w-full p-4 border border-stone-200 rounded-2xl text-stone-700 font-sans text-xs focus:outline-none focus:border-[#104C64] bg-stone-50/30"
                              rows={3}
                              placeholder="We wrapped up the discussion but I felt residual anger for an hour... / We compromised..."
                              value={newReflection.outcome}
                              onChange={(e) => setNewReflection({ ...newReflection, outcome: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2 pt-1">
                            <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">What could you have done differently to manage your emotions effectively?</h4>
                            <textarea
                              className="w-full p-4 border border-emerald-200/80 rounded-2xl text-stone-700 font-sans text-xs focus:outline-none focus:border-[#104C64] bg-stone-50/30 font-semibold"
                              rows={3}
                              placeholder="E.g. Ground myself using box breathing, write my notes down, or state: 'I hear you, can we analyze this point by point?'..."
                              value={newReflection.differently}
                              onChange={(e) => setNewReflection({ ...newReflection, differently: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      </div>

                      {/* Right Column: Live Diagnostic Feedback Sidebar */}
                      <div className="lg:col-span-5 hidden lg:flex bg-gradient-to-br from-stone-50 to-[#104C64]/5 rounded-3xl border border-stone-200 p-6 flex-col space-y-5 font-sans text-left overflow-y-auto max-h-[64vh]">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
                          <div className="p-2 bg-[#104C64]/10 rounded-xl text-[#104C64] shrink-0">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-[#104C64] uppercase tracking-wider">EQ Pattern Diagnostics</h4>
                            <span className="text-[8px] text-stone-500 font-bold uppercase tracking-widest block font-mono">Live Journal Insights</span>
                          </div>
                        </div>

                        {reflections.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-2">
                            <Sparkles className="w-5 h-5 text-[#104C64] animate-pulse" />
                            <h5 className="text-[10px] font-black text-[#104C64] uppercase tracking-wider">Awaiting Initial Entry</h5>
                            <p className="text-[10px] font-medium leading-relaxed max-w-[200px] mx-auto">
                              Diagnostics will dynamically activate when you save your first EQ Reflection entry to build baseline maps.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Stress Trigger Locus (Internal vs External) */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase text-stone-400 tracking-wider">
                                <span>Trigger Locus Balance</span>
                                <span className="font-mono text-[#104C64]">{analyticsData?.pctInternal || 0}% Internal</span>
                              </div>
                              <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden flex">
                                <div 
                                  className="h-full bg-gradient-to-r from-teal-500 to-teal-600"
                                  style={{ width: `${analyticsData?.pctInternal || 50}%` }}
                                  title="Internal expectation-based triggers"
                                />
                                <div 
                                  className="h-full bg-gradient-to-r from-coral-450 to-rose-450"
                                  style={{ width: `${analyticsData?.pctExternal || 50}%` }}
                                  title="External event-based triggers"
                                />
                              </div>
                              <div className="flex justify-between text-[8px] font-bold text-stone-500 uppercase tracking-widest">
                                <span>Teal: Internal Codes</span>
                                <span>Coral: External Cue</span>
                              </div>
                            </div>

                            {/* Somatic Hotspots list */}
                            <div className="space-y-2.5">
                              <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Somatic Mapping (Peak Load)</span>
                              {analyticsData?.topSomaticSymptoms && analyticsData.topSomaticSymptoms.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 font-sans">
                                  {analyticsData.topSomaticSymptoms.map(([symptom, count]: any) => (
                                    <div key={symptom} className="flex items-center gap-1 bg-white border border-stone-200 px-2.5 py-1.5 rounded-xl text-[9px] font-semibold text-stone-700 shadow-sm font-sans">
                                      <span>⚡ {symptom.replace(/[^a-zA-Z\s]/g, '').trim()}</span>
                                      <span className="text-stone-450 font-mono text-[8.5px] bg-stone-100 px-1 rounded font-bold">{count}x</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-stone-400 font-sans italic p-2.5 bg-white rounded-xl border border-stone-150">No physiological cues logged yet. Tag symptoms in Step 5.</p>
                              )}
                            </div>

                            {/* Emotional Heatmap */}
                            <div className="space-y-2.5 font-sans">
                              <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Top Emotional Signatures</span>
                              <div className="space-y-1.5">
                                {analyticsData?.topEmotions && analyticsData.topEmotions.length > 0 ? (
                                  analyticsData.topEmotions.slice(0, 2).map(([emotion, count]: any) => {
                                    const percent = Math.round((count / (analyticsData?.total || 1)) * 100);
                                    return (
                                      <div key={emotion} className="bg-white px-3 py-2.5 rounded-xl border border-stone-150 space-y-1 font-sans">
                                        <div className="flex justify-between text-[10px] font-black text-[#104C64]">
                                          <span>🎯 {emotion}</span>
                                          <span className="font-mono text-[9px] text-stone-400">{percent}% of logs</span>
                                        </div>
                                        <div className="w-full bg-stone-50 h-1 rounded-full overflow-hidden">
                                          <div className="bg-[#104C64] h-full" style={{ width: `${percent}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-[10px] text-stone-400 font-sans italic p-2.5 bg-white rounded-xl border border-stone-150">Clear emotional labeling builds cognitive resilience.</p>
                                )}
                              </div>
                            </div>

                            {/* Custom Action Advice */}
                            <div className="p-4 bg-[#104C64]/5 border border-[#104C64]/10 rounded-2xl flex items-start gap-3 mt-auto font-sans">
                              <Brain className="w-4 h-4 text-[#104C64] mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold uppercase text-[#104C64] tracking-wider block">Behavior Integration Posture</span>
                                <p className="text-[10px] text-[#104C64]/95 leading-relaxed font-sans font-medium">
                                  {analyticsData && analyticsData.microCount > analyticsData.deepCount 
                                    ? "Posture: Active Real-Time Stop. You reactively pause well. Integrate deep reflective retrospect loops to process implicit core beliefs."
                                    : "Posture: Retrospective integration. Highly reflective. Pair this with the 3-Second Pause Tool to hardcode real-time composure."}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Controls */}
                {!reflectionFeedback && (
                  <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-auto">
                    <button
                      onClick={() => setReflectionStep(prev => Math.max(0, prev - 1))}
                      disabled={reflectionStep === 0}
                      className="px-6 py-2.5 bg-stone-100 text-stone-500 font-bold rounded-xl hover:bg-stone-200 disabled:opacity-40 transition-colors uppercase tracking-widest text-[9px] cursor-pointer"
                    >
                      Back
                    </button>

                    {reflectionStep < 6 ? (
                      <button
                        onClick={() => setReflectionStep(prev => prev + 1)}
                        className="px-6 py-2.5 bg-[#104C64] font-black text-white rounded-xl hover:bg-[#0D3E52] transition-all uppercase tracking-widest text-[9px] cursor-pointer flex items-center gap-1 shadow-md shadow-[#104C64]/10"
                      >
                        Next Section
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveReflection}
                        disabled={isSubmittingReflection}
                        className="px-8 py-3 bg-emerald-600 font-black text-white rounded-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-[9px] cursor-pointer shrink-0 shadow-lg shadow-emerald-600/15"
                      >
                        {isSubmittingReflection ? "Saving Entry..." : "Save Reflection Entry"}
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 2. HISTORY: Reflection Log Archive History Modal */}
        <AnimatePresence>
          {isHistoryModalOpen && (
            <div id="reflection-history-overlay-wrapper" className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* Backdrop blur */}
              <motion.div
                id="reflection-history-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#104C64]/35 backdrop-blur-md"
                onClick={() => setIsHistoryModalOpen(false)}
              />
              {/* Modal Body */}
              <motion.div
                id="reflection-history-modal-body"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#F9FAFB] rounded-[40px] p-6 md:p-8 shadow-2xl border border-stone-100 max-w-4xl w-full relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <h3 className="text-xl font-black text-[#104C64] uppercase tracking-tight flex items-center gap-2">
                      <History className="w-5 h-5 text-[#104C64]" />
                      Emotional Intelligence Journal
                    </h3>
                    <p className="text-stone-450 font-sans text-xs">Review situation archives logged on the go to map patterns and grow self-sovereignty.</p>
                  </div>
                  <button
                    onClick={() => setIsHistoryModalOpen(false)}
                    className="text-stone-400 hover:text-stone-600 font-bold text-xl cursor-pointer w-8 h-8 rounded-full bg-white flex items-center justify-center border border-stone-200/55 shadow-sm"
                  >
                    ×
                  </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-stone-200 mb-6 shrink-0 gap-4">
                  <button
                    onClick={() => setHistoryModalTab('entries')}
                    className={`pb-3 px-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                      historyModalTab === 'entries'
                        ? 'border-[#104C64] text-[#104C64]'
                        : 'border-transparent text-stone-400 hover:text-stone-500 font-bold'
                    }`}
                  >
                    📂 Journal Logs ({reflections.length})
                  </button>
                  <button
                    onClick={() => setHistoryModalTab('analytics')}
                    className={`pb-3 px-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      historyModalTab === 'analytics'
                        ? 'border-[#104C64] text-[#104C64]'
                        : 'border-transparent text-stone-400 hover:text-stone-500 font-bold'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    📊 Pattern Analytics &amp; Insights
                  </button>
                </div>

                {historyModalTab === 'entries' ? (
                  <>
                    {/* Filter and Search Sub-component Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-4 rounded-2xl border border-stone-200/70 shrink-0 text-left">
                      <input
                        type="text"
                        className="flex-1 px-4 py-2.5 border border-stone-150 rounded-xl text-xs text-stone-700 font-sans focus:outline-none focus:border-[#104C64] bg-stone-50/50"
                        placeholder="Search logs by keyword, situation, outline..."
                        value={reflectionSearchQuery}
                        onChange={(e) => setReflectionSearchQuery(e.target.value)}
                        id="reflection-search-query-input"
                      />
                      <div className="flex gap-2">
                        <select 
                          id="reflection-intensity-filter"
                          value={intensityFilter}
                          onChange={(e) => setIntensityFilter(e.target.value)}
                          className="px-4 py-2 bg-white border border-stone-150 rounded-xl text-[10px] font-semibold uppercase tracking-wider text-stone-600 focus:outline-none cursor-pointer"
                        >
                          <option value="ALL">All Intensities</option>
                          <option value="HIGH">High (4-5)</option>
                          <option value="MED">Med (3)</option>
                          <option value="LOW">Low (1-2)</option>
                        </select>
                      </div>
                    </div>

                    {/* Main logs list */}
                    <div className="flex-1 overflow-y-auto pr-1">
                      {reflections.filter(item => {
                        const matchesSearch = reflectionSearchQuery.trim() === '' || 
                          (item.situation || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                          (item.reaction || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                          (item.thoughts || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                          (item.outcome || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                          (item.whoInvolved || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase());
                        if (intensityFilter === 'ALL') return matchesSearch;
                        if (intensityFilter === 'HIGH') return matchesSearch && item.intensity >= 4;
                        if (intensityFilter === 'MED') return matchesSearch && item.intensity === 3;
                        if (intensityFilter === 'LOW') return matchesSearch && item.intensity <= 2;
                        return matchesSearch;
                      }).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reflections.filter(item => {
                            const matchesSearch = reflectionSearchQuery.trim() === '' || 
                              (item.situation || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                              (item.reaction || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                              (item.thoughts || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                              (item.outcome || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase()) ||
                              (item.whoInvolved || '').toLowerCase().includes(reflectionSearchQuery.toLowerCase());
                            if (intensityFilter === 'ALL') return matchesSearch;
                            if (intensityFilter === 'HIGH') return matchesSearch && item.intensity >= 4;
                            if (intensityFilter === 'MED') return matchesSearch && item.intensity === 3;
                            if (intensityFilter === 'LOW') return matchesSearch && item.intensity <= 2;
                            return matchesSearch;
                          }).map((item) => {
                            let dateFormatted = "Just completed";
                            if (item.createdAt?.seconds) {
                              dateFormatted = new Date(item.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            }
                            const intensityColors = ['bg-red-500 border-red-500 text-red-500', 'bg-orange-500 border-orange-500 text-orange-500', 'bg-yellow-500 border-yellow-500 text-amber-500', 'bg-lime-500 border-lime-500 text-lime-600', 'bg-emerald-500 border-emerald-500 text-emerald-600'];
                            const intensityColor = intensityColors[item.intensity - 1] || 'bg-stone-500 border-stone-500 text-stone-500';
                            const splitted = intensityColor.split(' ');
                            const colorBg = splitted[0];
                            const colorText = splitted[2];
                            
                            if (item.isMicroReflection) {
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setSelectedReflection(item)}
                                  className="bg-white p-5 rounded-3xl border border-teal-200/50 hover:border-teal-500/40 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col justify-between group relative gap-3 text-left"
                                >
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center w-full">
                                      <span className="text-[9px] font-mono text-stone-400 font-bold">{dateFormatted}</span>
                                      <span className="text-[8px] font-black uppercase bg-teal-50 border border-teal-150 px-2 py-0.5 rounded-full text-teal-700 flex items-center gap-1">
                                        <Flame className="w-2.5 h-2.5 fill-teal-700 shrink-0 animate-pulse" />
                                        Micro-Pause Gap
                                      </span>
                                    </div>

                                    <h4 className="text-[11px] font-black text-[#104C64] uppercase tracking-wider line-clamp-1 block leading-normal">
                                      ⚡ Trigger: {item.situation}
                                    </h4>
                                    <div className="space-y-1">
                                      <p className="text-[10px] text-stone-600 leading-normal font-sans">
                                        <strong>Precise Feeling:</strong> <span className="font-bold underline text-rose-600 uppercase tracking-wide text-[9.5px]">{item.preciseEmotion}</span>
                                      </p>
                                      <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed font-sans">
                                        <strong>Response action:</strong> {item.chosenAction}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-1">
                                    <span className="text-[8px] font-black text-teal-800 uppercase tracking-widest bg-teal-50/50 border border-teal-100 px-2.5 py-1 rounded-full">
                                      Micro Log Habit
                                    </span>

                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => handleDeleteReflection(item.id, e)}
                                        className="p-1 px-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                      <span className="text-[9px] text-[#104C64] group-hover:underline font-black uppercase tracking-wider flex items-center gap-0.5 ml-1">
                                        Review <ChevronRight className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={item.id}
                                onClick={() => setSelectedReflection(item)}
                                className="bg-white p-5 rounded-3xl border border-stone-150 hover:border-[#104C64]/30 shadow-sm hover:shadow transition-all cursor-pointer flex flex-col justify-between group relative gap-3 text-left"
                              >
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-[9px] font-mono text-stone-400 font-bold">{dateFormatted}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`text-[8px] font-black uppercase tracking-wider ${colorText}`}>Lvl {item.intensity} Intensity</span>
                                      <div className={`w-2.5 h-2.5 rounded-full ${colorBg}`} />
                                    </div>
                                  </div>

                                  <h4 className="text-[11px] font-black text-[#104C64] uppercase tracking-wider line-clamp-1 block leading-normal">
                                    {item.situation}
                                  </h4>
                                  <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed font-sans">
                                    <strong>Reaction:</strong> {item.reaction}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-1">
                                  <span className="text-[8px] font-black text-[#104C64]/70 uppercase tracking-widest bg-[#104C64]/5 px-2.5 py-1 rounded-full">
                                    {item.trigger ? `${item.trigger} trigger` : 'trigger general'}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => handleDeleteReflection(item.id, e)}
                                      className="p-1 px-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                    <span className="text-[9px] text-[#104C64] group-hover:underline font-black uppercase tracking-wider flex items-center gap-0.5 ml-1">
                                      Review <ChevronRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white rounded-3xl border border-stone-150 p-12 text-center space-y-4">
                          <div className="w-12 h-12 bg-stone-50 rounded-full flex items-center justify-center mx-auto border border-stone-100 text-stone-400">
                            <PenTool className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-stone-700 block text-center">No Matching Reflections</h4>
                            <p className="text-stone-450 font-sans text-xs mt-1 text-center max-w-xs mx-auto">
                              Adjust your keyword searches or intensity filter values to discover your logged situations.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* TAB 2: EXTREMELY POWERFUL DYNAMIC CLINICAL PATTERN ANALYTICS DASHBOARD */
                  analyticsData === null ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white rounded-[32px] border border-stone-200/60 p-8 max-w-md mx-auto my-auto flex-1 justify-center align-middle">
                      <div className="w-14 h-14 bg-[#104C64]/5 rounded-full flex items-center justify-center text-[#104C64] border border-[#104C64]/10 animate-pulse">
                        <Activity className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <h4 className="text-base font-black text-[#104C64] uppercase tracking-wider">No Pattern Data Available</h4>
                      <p className="text-xs text-stone-500 leading-relaxed font-sans mt-0.5">
                        Pattern analysis requires active data entries. Log at least one live 3S micro-pause or workbook entry to begin parsing emotional and somatic profiles.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-1 space-y-6 text-left">
                      {/* Top Row: Key Metrics Bento Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Metric 1 */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-150 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Regulation Reps</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                          </div>
                          <div className="mt-3">
                            <div className="text-2xl font-black text-[#104C64]">{analyticsData.total}</div>
                            <div className="text-[9px] text-stone-500 font-sans mt-0.5">
                              {analyticsData.microCount} paus / {analyticsData.deepCount} workbook entries
                            </div>
                          </div>
                        </div>

                        {/* Metric 2 */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-150 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Charge Intensity</span>
                            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                          </div>
                          <div className="mt-3">
                            <div className="text-2xl font-black text-rose-600 font-mono">
                              {analyticsData.avgIntensity} <span className="text-xs text-stone-400 font-sans">/ 5</span>
                            </div>
                            <div className="text-[9px] text-stone-500 font-sans mt-0.5">
                              Subjective arousal spike level
                            </div>
                          </div>
                        </div>

                        {/* Metric 3 */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-150 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Emotional Granularity</span>
                            <Brain className="w-4 h-4 text-purple-500" />
                          </div>
                          <div className="mt-3">
                            <div className="text-2xl font-black text-[#104C64]">{analyticsData.emotionalGranularity}</div>
                            <div className="text-[9px] text-stone-500 font-sans mt-0.5">
                              {analyticsData.uniqueEmotionsCount} unique labels declared
                            </div>
                          </div>
                        </div>

                        {/* Metric 4 */}
                        <div className="bg-white p-4 rounded-3xl border border-stone-150 shadow-sm flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider">Trigger Vector</span>
                            <Compass className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="mt-3">
                            <div className="text-md sm:text-base font-black text-[#104C64] uppercase tracking-tighter leading-tight mt-1">
                              {analyticsData.pctExternal}% Ext / {analyticsData.pctInternal}% Int
                            </div>
                            <div className="text-[9px] text-stone-500 font-sans mt-1">
                              Friction vs internal standard
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle Row: Trigger and Emotional Charting */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Section 1: Empirical Trigger Keywords & Proximity */}
                        <div className="bg-white p-5 rounded-[30px] border border-stone-150 shadow-sm space-y-4">
                          <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-rose-500" />
                            <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">
                              Dynamic Stress Nodes (Trigger Keywords)
                            </h4>
                          </div>
                          <p className="text-[10px] text-stone-500 font-sans leading-relaxed">
                            A real-time parser of the nouns and objects from your situation logs. These signify high recurrent emotional friction vectors in your daily routine:
                          </p>

                          {analyticsData.topTriggerWords.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {analyticsData.topTriggerWords.map(([word, freq]: [string, any]) => (
                                <div 
                                  key={word} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200/60 rounded-xl text-stone-700 font-sans text-[10.5px] font-medium"
                                >
                                  <span className="font-bold text-rose-600">#{word}</span>
                                  <span className="text-[9px] font-mono bg-stone-200/70 text-stone-500 font-bold px-1.5 py-0.5 rounded">
                                    {freq} occurrences
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-stone-400 text-xs italic font-sans bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                              Detailed stress nodes are forming. Complete more workbook entries with details to extract precise trigger recurring nouns.
                            </div>
                          )}

                          <div className="pt-2">
                            <span className="text-[9.5px] font-black text-[#104C64] uppercase tracking-widest block mb-1.5">Proximity Proportions</span>
                            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden flex border border-stone-200/35">
                              <div 
                                className="bg-rose-500 h-full text-[8px] font-bold text-white text-center leading-none" 
                                style={{ width: `${analyticsData.pctExternal}%` }}
                                title="External Trigger Vector Ratio"
                              />
                              <div 
                                className="bg-amber-500 h-full text-[8px] font-bold text-white text-center leading-none" 
                                style={{ width: `${analyticsData.pctInternal}%` }}
                                title="Internal Trigger Vector Ratio"
                              />
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-stone-500 font-sans mt-2">
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> External Environment ({analyticsData.pctExternal}%)</span>
                              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Internal Mindstate ({analyticsData.pctInternal}%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Emotion distribution Bars */}
                        <div className="bg-white p-5 rounded-[30px] border border-stone-150 shadow-sm space-y-4">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-purple-600" />
                            <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">
                              Subjective Emotional State Density
                            </h4>
                          </div>
                          <p className="text-[10px] text-stone-500 font-sans leading-relaxed">
                            Frequency spectrum of exact cognitive emotions labeled below. Expanding this vocabulary limits emotional spill-over into verbal outbursts:
                          </p>

                          {analyticsData.topEmotions.length > 0 ? (
                            <div className="space-y-3 pt-1">
                              {analyticsData.topEmotions.map(([em, count]: [string, any]) => {
                                const pct = Math.round((count / analyticsData.total) * 100);
                                return (
                                  <div key={em} className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-stone-800 font-sans">
                                      <span className="font-bold uppercase tracking-wider text-[9.5px] text-[#104C64]">{em}</span>
                                      <span className="text-stone-500 font-mono text-[9px] font-bold">{count}x ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-stone-50 h-2.5 rounded-full overflow-hidden border border-stone-100 flex">
                                      <div 
                                        className="bg-gradient-to-r from-purple-500 to-[#104C64] h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-stone-400 text-xs italic font-sans bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                              Define custom emotion states dynamically or use the 3S presets to unlock the frequency spectrum.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Somatic Hotspots vs Professional Clinical Feedback */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Somatic Hotspots list */}
                        <div className="bg-white p-5 rounded-[30px] border border-stone-150 shadow-sm lg:col-span-5 space-y-4">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                            <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">
                              Somatic Response Hotspots
                            </h4>
                          </div>
                          <p className="text-[10px] text-stone-500 font-sans leading-relaxed">
                            How stress manifests in your bodily tissue before cognitive logic takes over:
                          </p>

                          {analyticsData.topSomaticSymptoms.length > 0 ? (
                            <div className="space-y-2 pt-1">
                              {analyticsData.topSomaticSymptoms.map(([symptom, freq]: [string, any]) => {
                                const totalSomaticCount = analyticsData.topSomaticSymptoms.reduce((acc: number, cur: any) => acc + cur[1], 0) || 1;
                                const pct = Math.round((freq / totalSomaticCount) * 100);
                                return (
                                  <div key={symptom} className="flex items-center justify-between gap-3 bg-stone-50/70 p-2.5 border border-stone-150/50 rounded-xl hover:bg-stone-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-[10px] text-[#104C64] font-sans font-bold">{symptom}</span>
                                    </div>
                                    <span className="text-[9px] font-mono bg-[#104C64]/5 text-[#104C64] font-black px-2 py-0.5 rounded border border-[#104C64]/10">
                                      {freq} instances
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-stone-400 text-xs italic font-sans bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                              No physical somatic markers declared yet. Choose physical symptoms during wizard step 5.
                            </div>
                          )}
                        </div>

                        {/* Clinical Behavior Coaching Insights */}
                        <div className="bg-gradient-to-tr from-[#104C64]/5 via-white to-teal-500/5 p-6 rounded-[30px] border border-[#104C64]/10 shadow-sm lg:col-span-7 space-y-4">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" strokeWidth={2.5} />
                            <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">
                              Dynamic Behavioral Therapy &amp; Coaching Insights
                            </h4>
                          </div>

                          <div className="space-y-3 font-sans text-xs text-stone-700 leading-relaxed text-left">
                            {analyticsData.avgIntensity >= 3.8 && (
                              <div className="flex gap-2.5 items-start p-3 bg-red-500/5 border border-red-500/20 rounded-2xl">
                                <span className="text-rose-500 font-bold text-sm mt-0.5" role="img" aria-label="alarm">🚨</span>
                                <div>
                                  <span className="font-black text-stone-800 text-[10.5px] block uppercase tracking-wide">High Amygdala Excitation Charge</span>
                                  Your average emotional charge intensity (<span className="font-mono text-rose-600 font-bold">{analyticsData.avgIntensity}</span>) indicates strong physiological arousal. Triggering responses are intense. Cultivate a double structural pause before giving responses.
                                </div>
                              </div>
                            )}

                            {analyticsData.pctExternal > analyticsData.pctInternal ? (
                              <div className="flex gap-2.5 items-start p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                <span className="text-amber-500 font-bold text-sm mt-0.5" role="img" aria-label="bullseye">🎯</span>
                                <div>
                                  <span className="font-black text-stone-800 text-[10.5px] block uppercase tracking-wide">Heavy Environment / Social Pressure</span>
                                  Your primary irritation vectors originate from external systems (interruption, email flow, coworkers). Establish clear boundaries today. Build micro-gaps to formulate explicit requests rather than taking defensive arguments.
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2.5 items-start p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                <span className="text-amber-500 font-bold text-sm mt-0.5" role="img" aria-label="brain">💭</span>
                                <div>
                                  <span className="font-black text-stone-800 text-[10.5px] block uppercase tracking-wide">Primary Internal Standard Narrative</span>
                                  Your logs map to internal memories, self-standards, and defensive narrative loops. Engage in *reality-testing*: ask clarifying questions of colleagues to align truth with private assumptions.
                                </div>
                              </div>
                            )}

                            {analyticsData.topSomaticSymptoms.length > 0 && (
                              <div className="flex gap-2.5 items-start p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                <span className="text-emerald-600 font-bold text-sm mt-0.5" role="img" aria-label="lightning">⚡</span>
                                <div>
                                  <span className="font-black text-stone-800 text-[10.5px] block uppercase tracking-wide">Somatic Body Connection Alert</span>
                                  Your nervous system speaks primarily through **{analyticsData.topSomaticSymptoms[0]?.[0]}**. Train yourself: the physical symptom is your biological flag. Use visual cues (e.g. tape on phone) to pause breathing the second this symptom activates.
                                </div>
                              </div>
                            )}

                            {analyticsData.microCount > 0 ? (
                              <div className="flex gap-2.5 items-start p-3 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                                <span className="text-teal-600 font-bold text-sm mt-0.5" role="img" aria-label="sprout">🌱</span>
                                <div>
                                  <span className="font-black text-stone-800 text-[10.5px] block uppercase tracking-wide">Healthy Micro Habit Loop reps</span>
                                  Fantastic! Your {analyticsData.microCount} micro-pauses completed are physical evidence of stimulus-response gap integration. Keep pushing these daily logs to hardcode mindful choices as your baseline reflex.
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2.5 items-start p-3 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                                <span className="text-teal-600 font-bold text-sm mt-0.5" role="img" aria-label="idea">💡</span>
                                <div>
                                  <span className="font-black text-stone-800 text-[10.5px] block uppercase tracking-wide">Employ the 3S Pause Tool</span>
                                  You have not logged any live micro-pauses yet! Use the **Shorter 3S Pause Tool** during small workplace annoyances today to instantly build micro-regulatory momentum.
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 3. DETAIL VIEW: Focal Reflection Detail Analysis Sheet */}
        <AnimatePresence>
          {selectedReflection && (
            <div id="reflection-detail-overlay-wrapper" className="fixed inset-0 flex items-center justify-center z-[60] p-4">
              {/* Transparent heavy blur backdrop */}
              <motion.div
                id="reflection-detail-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#104C64]/45 backdrop-blur-md"
                onClick={() => setSelectedReflection(null)}
              />
              {/* Modal Body */}
              <motion.div
                id="reflection-detail-modal-body"
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="bg-white rounded-[40px] p-6 md:p-8 shadow-2xl border border-stone-100 max-w-3xl w-full relative z-[70] overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="flex justify-between items-start gap-4 mb-6 shrink-0">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-[#104C64]/5 text-[#104C64] rounded-full">
                      Archived Journal Entry
                    </span>
                    <h3 className="text-xl font-black text-[#104C64] uppercase tracking-tight mt-2 italic">
                      Situation Log Analysis
                    </h3>
                    <span className="text-[10px] font-mono text-stone-400 block mt-1">
                      {selectedReflection.createdAt?.seconds 
                        ? new Date(selectedReflection.createdAt.seconds * 1000).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })
                        : 'Recently Logged'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedReflection(null)}
                    className="text-stone-400 hover:text-stone-600 font-bold text-xl cursor-pointer w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100"
                  >
                    ×
                  </button>
                </div>

                {/* Render micro reflection format vs deep workbook format */}
                {selectedReflection.isMicroReflection ? (
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-left">
                    {/* Visual flashy indicator */}
                    <div className="bg-teal-50 border border-teal-200/65 p-5 rounded-3xl space-y-2 relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 select-none pointer-events-none opacity-5">
                        <Flame className="w-48 h-48 fill-teal-600" />
                      </div>
                      <h4 className="text-[10px] font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                        <Flame className="w-5 h-5 fill-teal-700 animate-pulse" />
                        Validated Habit Loop Trigger Log
                      </h4>
                      <p className="text-[11px] text-stone-600 font-sans leading-relaxed">
                        This micro journal forms the raw training set for building your mindful <strong>Stimulus-Response Gap</strong>. Highly precise emotional labeling expands your conscious choice landscape.
                      </p>
                    </div>

                    {[
                      { title: "1. The Trigger Stimulus", ans: selectedReflection.situation || selectedReflection.triggerText, icon: <Flame className="w-4.5 h-4.5 text-rose-500 fill-rose-50 animate-pulse" /> },
                      { title: "2. The Precise Emotion Word Label", ans: selectedReflection.preciseEmotion, icon: <Sparkles className="w-4.5 h-4.5 text-amber-500" />, highlight: true },
                      { title: "3. Mindful Chosen Response Behavior", ans: selectedReflection.chosenAction, icon: <CheckCircle2 className="w-4.5 h-4.5 text-teal-600" /> }
                    ].map((element, idx) => (
                      <div key={idx} className="bg-stone-50 p-5 rounded-3xl border border-stone-150 relative space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-stone-150 shadow-sm shrink-0">
                            {element.icon}
                          </div>
                          <h4 className="text-[9px] font-black uppercase text-[#104C64] tracking-wider">{element.title}</h4>
                        </div>
                        
                        <p className={`text-[11.5px] font-sans leading-relaxed pl-1 whitespace-pre-wrap ${element.highlight ? 'font-black underline uppercase text-rose-600 tracking-wide text-[11px]' : 'text-stone-700'}`}>
                          {element.ans}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {[
                      { title: "Q1. The Situation Narrative", ans: selectedReflection.situation, icon: <PenTool className="w-4 h-4 text-[#104C64]" /> },
                      { title: "Q2. Your Automatic Reaction & Behaviors", ans: selectedReflection.reaction, icon: <Brain className="w-4 h-4 text-[#104C64]" /> },
                      { title: "Q3. Self-Rated Intensity Level", ans: `Scale of ${selectedReflection.intensity} of 5 (Intensity Gauge Selected)`, icon: <Activity className="w-4 h-4 text-[#104C64]" /> },
                      { title: "Q4. Threat Core Trigger", ans: selectedReflection.trigger === 'internal' ? 'Internal Triggers (Memories, private standards, expectations, implicit narrative)' : selectedReflection.trigger === 'external' ? 'External Triggers (Physical events, raw actions, interruptions, environmental deadlines)' : 'Unspecified Trigger', icon: <Heart className="w-4 h-4 text-[#104C64]" /> },
                      { title: "Q5. Other Contributors & Involved Associates", ans: selectedReflection.whoInvolved || 'No external contributors specified.', icon: <Users className="w-4 h-4 text-[#104C64]" /> },
                      { title: "Q6. Activated Physical Symptoms", ans: (Array.isArray(selectedReflection.physicalSymptoms) && selectedReflection.physicalSymptoms.length > 0) ? selectedReflection.physicalSymptoms.join(", ") + (selectedReflection.customSymptom ? ` (${selectedReflection.customSymptom})` : '') : 'None declared.', icon: <Activity className="w-4 h-4 text-emerald-600" /> },
                      { title: "Q7. Cognitive Thoughts & Implicit Patterns", ans: selectedReflection.thoughts || 'None declared.', icon: <Brain className="w-4 h-4 text-[#104C64]" /> },
                      { title: "Q8. Ultimate Outcome & Emotional Trajectory", ans: selectedReflection.outcome || 'None declared.', icon: <CheckCircle2 className="w-[#104C64] h-4 text-[#104C64]" /> },
                      { title: "Q9. Optimal Future Adjustments & Sovereignty", ans: selectedReflection.differently || 'None declared.', icon: <Sparkles className="w-4 h-4 text-emerald-600 font-semibold" /> }
                    ].map((element, idx) => (
                      <div key={idx} className="bg-stone-50 p-5 rounded-3xl border border-stone-150 relative space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-stone-150 shadow-sm shrink-0">
                            {element.icon}
                          </div>
                          <h4 className="text-[9px] font-black uppercase text-[#104C64] tracking-wider">{element.title}</h4>
                        </div>
                        
                        <p className="text-[11px] font-sans text-stone-700 leading-relaxed pl-1 whitespace-pre-wrap">
                          {element.ans}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom buttons */}
                <div className="pt-6 border-t border-stone-100 flex items-center justify-between mt-4 shrink-0">
                  <button
                    onClick={(e) => {
                      handleDeleteReflection(selectedReflection.id, e);
                    }}
                    className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-150 hover:text-red-700 font-bold uppercase tracking-wider text-[9px] rounded-xl transition-all cursor-pointer"
                  >
                    Delete Entry
                  </button>
                  <button
                    onClick={() => setSelectedReflection(null)}
                    className="px-8 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-[0.2em] text-[9.5px] rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Done Reviewing
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!isEnterprise && (
          <>
            {/* Active EQ Partnerships & Streaks Grid */}
            <div className="mt-8 mb-12">
              <div 
                onClick={() => setIsStreaksExpanded(!isStreaksExpanded)}
                className="flex items-center justify-between mb-4 cursor-pointer select-none group pb-2 border-b border-stone-200/40 hover:border-stone-350 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#104C64] group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-black text-[#104C64] uppercase tracking-[0.3em] group-hover:text-stone-900 transition-colors">
                    Active EQ Partnerships & Streaks
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#104C64] font-bold uppercase tracking-wider bg-stone-100 px-3 py-1 rounded-full group-hover:bg-stone-200/60 transition-colors">
                    {friends.length} Connected {friends.length === 1 ? 'Partner' : 'Partners'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInviteModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#104C64] bg-[#41B1C2]/15 hover:bg-[#41B1C2]/25 border border-[#41B1C2]/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Invite Partner</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStreaksExpanded(!isStreaksExpanded);
                    }}
                    className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#104C64] bg-stone-50 hover:bg-stone-100 border border-stone-250 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{isStreaksExpanded ? 'Hide' : 'Show'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isStreaksExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isStreaksExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2">
                      {/* FLASHY SYNERGY OFFER CHALLENGE BANNER */}
                      <div className="mb-6 relative overflow-hidden rounded-[30px] bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 border-2 border-amber-500/30 p-6 md:p-8 shadow-md">
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-500/15 pointer-events-none select-none">
                          <Flame className="w-28 h-28 fill-amber-500 animate-pulse" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="space-y-2 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="animate-bounce">🔥</span>
                              <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                Limited-Time Active Synergy Challenge
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#104C64] bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                Streak Award Offer
                              </span>
                            </div>
                            <h4 className="text-base md:text-lg font-black text-[#104C64] uppercase tracking-wide">
                              Unlock 30 Days of Free BeyondEQ Premium!
                            </h4>
                            <p className="text-xs text-stone-600 font-sans leading-relaxed">
                              Maintain a joint <strong>30-Day EQ Streak</strong> with any active EQ Partnership mate. By tracking milestones daily and keeping the synergy alive, <strong>BOTH of you will automatically unlock complete Premium status free for a full month</strong>!
                            </p>
                            <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-2 pt-1">
                              <Flame className="w-4 h-4 fill-amber-600 text-amber-600 animate-pulse" />
                              Keep the fire alive: advancing streaks takes only 1 tap daily!
                            </p>
                          </div>
                          
                          <div className="shrink-0 w-full md:w-auto bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col items-center justify-center text-center">
                            <span className="text-[9px] font-black text-[#104C64] uppercase tracking-widest mb-1 block">Goal target</span>
                            <span className="text-3xl font-black text-[#104C64]">30 Days</span>
                            <span className="text-[9px] font-bold text-stone-500 mt-0.5">Joint Streak 🔥</span>
                          </div>
                        </div>
                      </div>

                      {loadingFriends ? (
                        <div className="bg-stone-50 rounded-[30px] p-8 text-center animate-pulse border border-stone-100">
                          <span className="text-xs font-black uppercase tracking-widest text-[#104C64]/40">Syncing Partnerships...</span>
                        </div>
                      ) : friends.length === 0 ? (
                        <div className="bg-gradient-to-br from-stone-50 to-stone-100/50 rounded-[30px] p-8 md:p-10 text-center border border-dashed border-stone-200 shadow-inner">
                          <Users className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                          <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-1">No Active EQ Partnerships Yet</p>
                          <p className="text-[10px] text-gray-450 font-medium font-sans max-w-sm mx-auto leading-relaxed mb-4">
                            Use your personalized invitation link to connect with teammates, mentors, or peers. Log EQ milestones together to build real-time streaks!
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                              onClick={() => setIsInviteModalOpen(true)}
                              className="px-5 py-2.5 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Get Personal Invite Link</span>
                            </button>
                            <button
                              onClick={handleCopy}
                              className="px-5 py-2.5 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2 hover:bg-stone-50"
                            >
                              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? 'Copied Link!' : 'Quick Copy Link'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {friends.map((friend) => (
                            <motion.div
                              key={friend.friendId}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-white border border-stone-100 p-6 rounded-[30px] shadow-sm hover:shadow-md transition-all relative overflow-hidden group/card"
                            >
                              <div className="absolute top-4 right-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50/80 rounded-full text-[10px] font-black text-amber-700 shadow-sm border border-amber-100 group-hover/card:scale-105 transition-transform">
                                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
                                  {friend.streak} Day
                                </span>
                              </div>

                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#104C64]/5 border border-[#104C64]/10 flex items-center justify-center font-black text-[#104C64] text-xs">
                                  {friend.friendName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">{friend.friendName}</h4>
                                  <p className="text-[9px] text-stone-400 font-sans">{friend.friendEmail || 'info@beyondeq.org'}</p>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-stone-50 flex items-center justify-between gap-4">
                                <span className="text-[8px] text-stone-400 uppercase font-black tracking-wider">
                                  Mutual Goal Active
                                </span>
                                <button
                                  onClick={() => handleNudgeStreak(friend.friendId)}
                                  className="px-3.5 py-1.5 bg-[#104C64] hover:bg-[#0D3E52] active:scale-95 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer hover:shadow-md"
                                >
                                  Advance Streak 🔥
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Invite Friends Modal */}
        <AnimatePresence>
          {isInviteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#104C64]/30 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-white p-8 md:p-10 rounded-[30px] border border-stone-200/50 shadow-2xl relative overflow-hidden"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[#41B1C2]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 text-[#41B1C2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#104C64] uppercase tracking-wide italic">Forge an EQ Synergy</h3>
                    <p className="text-[9px] text-stone-500 font-black uppercase tracking-widest">Share HumanEdge 3.0 Invitations</p>
                  </div>
                </div>

                <p className="text-xs text-stone-600 font-sans leading-relaxed mb-6">
                  When a colleague or friend registers through your secure personal invitation, both accounts are instantly connected in real time. Share logs, track resilience, and maintain a joint streak!
                </p>

                <div className="space-y-3 mb-8">
                  <label className="block text-[9px] font-black text-[#104C64] uppercase tracking-wider">Your Personalized Invitation Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${getInstantOrigin()}/register?invitedBy=${user.uid}`}
                      className="flex-1 p-3 bg-stone-50 text-stone-700 text-xs font-sans rounded-xl border border-stone-200 focus:outline-none select-all"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-4 py-3 bg-[#41B1C2] hover:bg-[#389EAE] text-white text-[9.5px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> High-five! Link copied to clipboard. Send to your peer group!
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-stone-100">
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Close Portal
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Enterprise Teammate Seat Invite Modal */}
        <AnimatePresence>
          {isEnterpriseInviteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#104C64]/30 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-white p-8 rounded-[30px] border border-stone-200 shadow-2xl relative overflow-hidden space-y-6"
              >
                {enterpriseInviteSuccess ? (
                  <div className="space-y-6 text-center animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-sm border border-emerald-200">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-lg font-black text-[#104C64] uppercase tracking-wide">Corporate Seat Allocated!</h4>
                      <p className="text-xs text-stone-550 leading-relaxed font-sans max-w-sm mx-auto">
                        Member Seat <strong>0{selectedSeatIndex}</strong> has been successfully reserved for <strong>{enterpriseInviteName}</strong>.
                      </p>
                    </div>

                    <div className="space-y-2 text-left bg-stone-50 p-4 rounded-2xl border border-stone-200/60 font-sans">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#104C64] block">Invitation Profile</span>
                      <div className="text-[11px] text-stone-700 space-y-1">
                        <div><strong className="text-stone-500">Name:</strong> {enterpriseInviteName}</div>
                        <div><strong className="text-stone-500">Work Email:</strong> {enterpriseInviteEmail}</div>
                        <div><strong className="text-stone-500">Designation:</strong> {enterpriseInviteRole}</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-[9px] font-black text-[#104C64] uppercase tracking-wider">
                        Personalized Register Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={newlyCreatedLink}
                          className="w-full px-3 py-2.5 bg-stone-50 font-mono text-[10px] text-stone-600 rounded-xl border border-stone-200 select-all"
                        />
                        <button
                          onClick={() => {
                            safeCopyToClipboard(newlyCreatedLink);
                            setCopiedInviteId('copied_modal');
                            setTimeout(() => setCopiedInviteId(null), 2000);
                          }}
                          className="px-4 py-2 bg-[#104C64] hover:bg-[#072F41] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer whitespace-nowrap"
                        >
                          {copiedInviteId === 'copied_modal' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[9px] text-stone-400">
                        Copy and send this link directly to your colleague to onboard them.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-stone-100">
                      <button
                        onClick={() => setIsEnterpriseInviteModalOpen(false)}
                        className="w-full py-3 bg-[#104C64]/10 hover:bg-[#104C64]/20 text-[#104C64] text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                      >
                        Got it, Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 rounded-2xl bg-[#104C64]/10 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-[#104C64]" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-[#104C64] uppercase tracking-wide">Allocate Corporate Seat</h3>
                        <p className="text-[9px] text-stone-500 font-black uppercase tracking-widest">
                          Member Seat 0{selectedSeatIndex} Allocation
                        </p>
                      </div>
                    </div>

                    {enterpriseInviteError && (
                      <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-sans font-medium flex items-start gap-2 text-left">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5 animate-pulse" />
                        <span className="leading-tight">{enterpriseInviteError}</span>
                      </div>
                    )}

                    <form onSubmit={handleConfirmEnterpriseSeat} className="space-y-4 text-left">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-[#104C64] uppercase tracking-wider">
                          Colleague Full Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rachel Green"
                          value={enterpriseInviteName}
                          onChange={(e) => setEnterpriseInviteName(e.target.value)}
                          className="w-full p-3 bg-stone-50 text-stone-700 text-xs font-sans rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#104C64]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-[#104C64] uppercase tracking-wider">
                          Workplace Email ID
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. rachel@workplace.com"
                          value={enterpriseInviteEmail}
                          onChange={(e) => setEnterpriseInviteEmail(e.target.value)}
                          className="w-full p-3 bg-stone-50 text-stone-700 text-xs font-sans rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#104C64]"
                        />
                        <p className="text-[9px] text-stone-400 leading-normal">
                          Must match your organization's official workplace domain.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-[#104C64] uppercase tracking-wider">
                          Official Title / Designation
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Regional Manager, VP, Associate"
                          value={enterpriseInviteRole}
                          onChange={(e) => setEnterpriseInviteRole(e.target.value)}
                          className="w-full p-3 bg-stone-50 text-stone-700 text-xs font-sans rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#104C64]"
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-stone-100 flex-col sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setIsEnterpriseInviteModalOpen(false)}
                          className="w-full sm:w-1/2 px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isInviting}
                          className="w-full sm:w-1/2 px-5 py-3 bg-[#41B1C2] hover:bg-[#389EAE] disabled:opacity-50 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isInviting ? 'Allocating...' : 'Confirm Seat'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Iframe Print Warning Modal */}
        <AnimatePresence>
          {isPrintIframeWarnOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white p-8 rounded-[30px] border border-stone-200 shadow-2xl relative overflow-hidden text-center space-y-5"
              >
                <div className="w-16 h-16 rounded-full bg-amber-50 mx-auto flex items-center justify-center">
                  <Printer className="w-8 h-8 text-amber-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wide">Iframe Print Sandbox Blocked</h3>
                <p className="text-xs text-stone-600 font-sans leading-relaxed">
                  You are currently previewing this app inside the <strong>AI Studio Iframe</strong>. Browsers restrict printable triggers within nested sandboxes for safety.
                </p>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/60 text-left space-y-2">
                  <h4 className="text-[10px] font-black text-[#104C64] uppercase tracking-wider">How to print or save PDF:</h4>
                  <ol className="text-[11px] text-stone-550 space-y-1.5 list-decimal list-inside font-sans">
                    <li>Look at the top right corner of the AI Studio development environment.</li>
                    <li>Click the <strong>"Open in new tab"</strong> icon.</li>
                    <li>This opens the app outside the iframe, allowing full OS print commands!</li>
                  </ol>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      setIsPrintIframeWarnOpen(false);
                      try {
                        window.focus();
                        window.print();
                      } catch (_) {}
                    }}
                    className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[9.5px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Try Anyway
                  </button>
                  <button
                    onClick={() => setIsPrintIframeWarnOpen(false)}
                    className="px-5 py-2.5 bg-[#41B1C2] hover:bg-[#389EAE] text-white text-[9.5px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Selection Content Grid */}
        {/* Selection Content Grid */}
        {activeAssessment === 'instructions' ? (
          <div className="w-full bg-white p-8 md:p-14 rounded-[40px] shadow-sm border border-stone-100 relative group overflow-hidden space-y-12 animate-fadeIn select-none">
            {/* Header / Intro */}
            <div className="border-b border-stone-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 font-sans">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#104C64]/5 rounded-full border border-[#104C64]/10">
                  <BookOpen className="w-3.5 h-3.5 text-[#104C64]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#104C64] font-sans">Strategic Process Blueprint</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-light font-serif text-stone-900 leading-tight p-0">
                  {isEnterprise ? 'Diagnostics' : 'HumanEdge Leadership'} <span className="font-semibold italic text-[#104C64]">Framework Guide</span>
                </h1>
                <p className="text-xs text-stone-500 font-sans leading-normal max-w-2xl font-semibold">
                  This comprehensive workspace coordinates individual and team matrices. Understand the progressive process flow, review consolidation science, and navigate your assessments systematically.
                </p>
              </div>
            </div>

            {isEnterprise ? (
              /* Enterprise Instructions Flow */
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-stone-200 pb-3">
                    <h3 className="text-[11px] font-black text-[#104C64] uppercase tracking-widest font-sans">The 6-Step Progressive Diagnostics Flow</h3>
                    <span className="text-[9px] text-[#41B1C2] font-extrabold uppercase tracking-widest font-mono">Process Map</span>
                  </div>

                  {/* Vertical timeline map */}
                  <div className="space-y-8 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200">
                    
                    {/* 1. Values Audit */}
                    {(() => {
                      const isDone = !!profile?.enterpriseAssessmentsCompleted?.['1'];
                      return (
                        <div className="flex gap-6 items-start relative pl-1 group/item">
                          <button
                            onClick={() => setActiveAssessment('entValuesAudit')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {isDone ? '✓' : '1'}
                          </button>
                          <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Tool 01</span>
                                <span className="text-[9px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-sky-100">Free Tier</span>
                              </div>
                              <h4 className="text-xs font-black text-stone-850 uppercase tracking-tight leading-tight">Assessment 1: Values Audit</h4>
                              <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans">
                                Identifies the alignment gap between your stated principles and lived physical reality. Builds the foundation of behavioral codes.
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveAssessment('entValuesAudit')}
                              className={`px-5 py-3 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200' 
                                  : 'bg-[#104C64] text-white hover:bg-[#0D3E52] border border-[#104C64]/10'
                              }`}
                            >
                              {isDone ? 'Review Assessment' : 'Launch Assessment'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Culture Map */}
                    {(() => {
                      const isDone = !!profile?.enterpriseAssessmentsCompleted?.['2'];
                      return (
                        <div className="flex gap-6 items-start relative pl-1 group/item">
                          <button
                            onClick={() => setActiveAssessment('entCultureMap')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-stone-100 border-stone-200 text-stone-750 hover:bg-stone-200'
                            }`}
                          >
                            {isDone ? '✓' : '2'}
                          </button>
                          <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Tool 02</span>
                                <span className="text-[9px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-sky-100">Free Tier</span>
                              </div>
                              <h4 className="text-xs font-black text-stone-850 uppercase tracking-tight leading-tight">Assessment 2: Culture Map</h4>
                              <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans">
                                Maps hidden and functional active cultural quadrants: Thriving Energy, Non-Implementation Leakages, Private Shadow Alignment, and Toxic Protected Spaces.
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveAssessment('entCultureMap')}
                              className={`px-5 py-3 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-55 text-emerald-800 hover:bg-emerald-100 border border-emerald-200' 
                                  : 'bg-[#104C64] text-white hover:bg-[#0D3E52] border border-[#104C64]/10'
                              }`}
                            >
                              {isDone ? 'Review Assessment' : 'Launch Assessment'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. Performance Link */}
                    {(() => {
                      const isDone = !!profile?.enterpriseAssessmentsCompleted?.['3'];
                      return (
                        <div className="flex gap-6 items-start relative pl-1 group/item">
                          <button
                            onClick={() => setActiveAssessment('entPerformanceLink')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-stone-100 border-stone-200 text-stone-750 hover:bg-stone-200'
                            }`}
                          >
                            {isDone ? '✓' : '3'}
                          </button>
                          <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Tool 03</span>
                                <span className="text-[9px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-sky-100">Free Tier</span>
                              </div>
                              <h4 className="text-xs font-black text-stone-850 uppercase tracking-tight leading-tight">Assessment 3: Performance Link</h4>
                              <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans">
                                Directly links localized culture variables to macro outputs (decision friction speed, reliance indices, community objectives realization metrics).
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveAssessment('entPerformanceLink')}
                              className={`px-5 py-3 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-55 text-emerald-800 hover:bg-emerald-100 border border-emerald-200' 
                                  : 'bg-[#104C64] text-white hover:bg-[#0D3E52] border border-[#104C64]/10'
                              }`}
                            >
                              {isDone ? 'Review Assessment' : 'Launch Assessment'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. EQ Driver */}
                    {(() => {
                      const isDone = !!profile?.enterpriseAssessmentsCompleted?.['4'];
                      return (
                        <div className="flex gap-6 items-start relative pl-1 group/item">
                          <button
                            onClick={() => setActiveAssessment('entEqDriver')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                              isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-stone-100 border-stone-200 text-stone-750 hover:bg-stone-200'
                            }`}
                          >
                            {isDone ? '✓' : '4'}
                          </button>
                          <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Tool 04</span>
                                <span className="text-[9px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-sky-100">Free Tier</span>
                              </div>
                              <h4 className="text-xs font-black text-stone-850 uppercase tracking-tight leading-tight">Assessment 4: EQ Driver</h4>
                              <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans">
                                Identifies and prescribes which of the 15 HumanEdge human skills can bridge the diagnostic performance holes identified in the prior assessments.
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveAssessment('entEqDriver')}
                              className={`px-5 py-3 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-55 text-emerald-800 hover:bg-emerald-100 border border-emerald-200' 
                                  : 'bg-[#104C64] text-white hover:bg-[#0D3E52] border border-[#104C64]/10'
                              }`}
                            >
                              {isDone ? 'Review Assessment' : 'Launch Assessment'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 5. Unified Executive Toolkit */}
                    {(() => {
                      const isAdminMaster = (profile as any)?.hasAdminMasterAccess === true;
                      const hasTool5Access = userTier === 'premium' || (profile as any)?.hasFreeTool5Access === true || isAdminMaster;
                      const isDone = (completedAuditsCount === 4 || isAdminMaster) && hasTool5Access;
                      const isDoneButFree = completedAuditsCount === 4 && !hasTool5Access && !isAdminMaster;
                      
                      return (
                        <div className="flex gap-6 items-start relative pl-1 group/item">
                          <button
                            onClick={() => {
                              if (isDone) {
                                setActiveAssessment('entUnifiedReport');
                              } else if (isDoneButFree) {
                                setIsEnterpriseCheckoutOpen(true);
                              } else {
                                alert(`Assessment 5 is locked. Complete all 4 Core Audits first (${completedAuditsCount}/4 done).`);
                              }
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                              isDone 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10' 
                                : isDoneButFree
                                  ? 'bg-amber-50 border-amber-450 text-amber-600 shadow-sm animate-pulse'
                                  : 'bg-stone-100 border-stone-200 text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            {isDone ? '✓' : isDoneButFree ? '★' : '5'}
                          </button>
                          <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Tool 05</span>
                                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border font-sans ${
                                  hasTool5Access
                                    ? 'bg-emerald-55 text-emerald-805 border-emerald-200/50'
                                    : 'bg-amber-50 text-amber-700 border-amber-150'
                                }`}>
                                  {hasTool5Access ? 'Consolidated Output (Unlocked)' : 'Unlock with Promo / Premium'}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-stone-855 uppercase tracking-tight leading-tight">Assessment 5: Unified Toolkit Report</h4>
                              <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans">
                                <strong>Consolidation Engine:</strong> Harmonizes response metrics from Assessments 1-4. Compiles an auto-generative master blueprint, mapping causal vectors of culture leaks directly into executable leadership plans.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (isDone) {
                                  setActiveAssessment('entUnifiedReport');
                                } else if (isDoneButFree) {
                                  setIsEnterpriseCheckoutOpen(true);
                                } else {
                                  alert(`Assessment 5 is locked. Complete all 4 Core Audits first (${completedAuditsCount}/4 done).`);
                                }
                              }}
                              className={`px-5 py-3 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-50 text-emerald-850 hover:bg-emerald-100 border border-emerald-205'
                                  : isDoneButFree
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-500 shadow-sm'
                                    : 'bg-stone-50 text-stone-400 border border-stone-200'
                              }`}
                            >
                              {isDone ? 'View Master Report' : isDoneButFree ? 'Unlock Report' : 'Locked'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 6. Multi-Rater Consolidation */}
                    {(() => {
                      const isAdminMaster = (profile as any)?.hasAdminMasterAccess === true;
                      const hasPremiumPromoActive = (profile as any)?.hasPremiumPromoActive === true || isAdminMaster;
                      const isDone = (isConsolidationUnlocked || isAdminMaster) && (userTier === 'premium' || isAdminMaster) && hasPremiumPromoActive;
                      const isDoneButFree = (isConsolidationUnlocked || isAdminMaster) && !((userTier === 'premium' || isAdminMaster) && hasPremiumPromoActive) && !isAdminMaster;
                      
                      return (
                        <div className="flex gap-6 items-start relative pl-1 group/item">
                          <button
                            onClick={() => {
                              if (isDone) {
                                setActiveAssessment('entMultiRaterConsolidation');
                              } else if (isDoneButFree) {
                                if (userTier === 'premium' && !hasPremiumPromoActive) {
                                  alert("Assessment 6 is a premium feature accessible only with a premium free promo code. Please redeem your premium promo code in the checkout section to unlock access.");
                                }
                                setIsEnterpriseCheckoutOpen(true);
                              } else {
                                alert(`Assessment 6 is locked. Requires all 5 co-worker matrices to be completed (currently ${completedTeammatesCount} of 5 completed).`);
                              }
                            }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                              isDone 
                                ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10' 
                                : isDoneButFree
                                  ? 'bg-amber-50 border-amber-450 text-amber-600 shadow-sm'
                                  : 'bg-stone-100 border-stone-200 text-stone-400 hover:bg-stone-200'
                            }`}
                          >
                            {isDone ? '✓' : isDoneButFree ? '★' : '6'}
                          </button>
                          <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Tool 06</span>
                                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border font-sans ${
                                  isDone
                                    ? 'bg-amber-100 text-amber-850 border-amber-200/50'
                                    : 'bg-amber-50 text-amber-700 border-amber-150'
                                }`}>
                                  {isDone ? 'Co-Worker Split Map (Promo Active)' : 'Premium Promo Feature'}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-stone-855 uppercase tracking-tight leading-tight">Assessment 6: Multi-Rater Consolidation</h4>
                              <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans">
                                <strong>Global Consolidation:</strong> Combines responses of up to 5 team members in real time. Runs a <i>Split Pattern Analysis</i> mapping and dividing results by senior leadership (Above Hierarchy) vs frontline co-workers (Below Hierarchy). Evaluates key friction spots where leadership expectations split from staff realities.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                if (isDone) {
                                  setActiveAssessment('entMultiRaterConsolidation');
                                } else if (isDoneButFree) {
                                  if (userTier === 'premium' && !hasPremiumPromoActive) {
                                    alert("Assessment 6 is a premium feature accessible only with a premium free promo code. Please redeem your premium promo code in the checkout section to unlock access.");
                                  }
                                  setIsEnterpriseCheckoutOpen(true);
                                } else {
                                  alert(`Assessment 6 is locked. Requires all 5 co-worker matrices to be completed (currently ${completedTeammatesCount} of 5 completed).`);
                                }
                              }}
                              className={`px-5 py-3 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-amber-5 text-amber-855 hover:bg-amber-10 bg-amber-50/50 border border-amber-250' 
                                  : isDoneButFree
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-500'
                                    : 'bg-stone-50 text-stone-400 border border-stone-200'
                              }`}
                            >
                              {isDone ? 'View Split Analytics' : isDoneButFree ? 'Unlock Report' : 'Locked'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Integration Details explanation section */}
                <div className="bg-stone-50 p-6 md:p-8 rounded-[30px] border border-stone-200 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">The Science of Synthesis</h3>
                    <p className="text-xs text-stone-500 font-sans mt-0.5 font-semibold">
                      Understanding how data rolls up from individual responses into your executive reports:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white border border-stone-200/80 rounded-[24px] space-y-3">
                      <span className="text-[9px] text-[#41B1C2] font-black uppercase tracking-widest block font-mono">REPORT 5: MULTI-MATRIX CONSOLIDATION</span>
                      <h4 className="text-xs font-black text-stone-850 uppercase tracking-wider leading-tight">Dynamic Alignment Map</h4>
                      <p className="text-[11px] text-stone-600 font-medium leading-relaxed font-sans">
                        Report 5 (Unified Executive Toolkit) translates individual scores across Tools 1, 2, 3, and 4 into an integrated diagnostic roadmap. A values gap in <b>Tool 1</b> (Lived vs Stated principles) acts as a severe multiplier for cultural leakages in <b>Tool 2</b> (Culture Map). The system traces these leakages downstream into business-level performance gaps under <b>Tool 3</b> (Performance Link), and then prescribes specific human emotional skills from <b>Tool 4</b> (EQ Driver) necessary to close the gaps.
                      </p>
                    </div>
                    <div className="p-6 bg-white border border-stone-200/80 rounded-[24px] space-y-3">
                      <span className="text-[9px] text-[#41B1C2] font-black uppercase tracking-widest block font-mono">REPORT 6: MULTI-RATER TEAM MERGES</span>
                      <h4 className="text-xs font-black text-stone-850 uppercase tracking-wider leading-tight">Co-Worker Split Analysis</h4>
                      <p className="text-[11px] text-stone-600 font-medium leading-relaxed font-sans">
                        Report 6 combines up to 5 teammates' matrices. The split logic distinguishes between designating roles: leaders / chairs (classified as <i>Above Hierarchy</i>) and operational peers / staff (classified as <i>Below Hierarchy</i>). By displaying average scores grouped separately, Report 6 exposes leadership blind spots—discrepancies where senior officers rate consensus high while frontline contributors experience friction.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FAQ Accordion Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-stone-200 pb-3">
                    <h3 className="text-[11px] font-black text-[#104C64] uppercase tracking-widest font-sans">Frequently Asked Questions (FAQ)</h3>
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Process FAQ</span>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        q: "How are individual responses combined to maintain anonymity?",
                        a: "All co-worker inputs registered via your personal invitation link are securely stored in Google Firestore. Individual identity tags are entirely stripped in final reports—results are only displayed as aggregated averages split by broad organization levels (Leaders/Staff) representing at least 5 profiles."
                      },
                      {
                        q: "What defines 'Above' vs 'Below' hierarchy status inside the Split Chart?",
                        a: "The dashboard automatically classifies team roles. Members with titles containing 'director', 'executive', 'lead', 'chief', 'head', or 'manager' are sorted into the 'Above' hierarchy (Leadership). Other roles are classified as the 'Below' hierarchy (Staff), highlighting the operational perceptual divide."
                      },
                      {
                        q: "What count of split delta represents a critical organizational warning?",
                        a: "A perceptual split delta of 1.2 or higher on our 5.0 consensus scale is classified as severe. This indicates a key blind spot where leaders believe an operation/value is walking-the-talk, while Staff feel constrained by substantial ground friction. Realignment Strategy A/B are custom prescribed to resolve these gaps."
                      },
                      {
                        q: "Can I retake or update any assessment in the future?",
                        a: "Yes. Simply choose the desired Assessment from the 'Assessments' dropdown at the top, change your ratings, and click update. The database and reports will recalculate instantly."
                      },
                      {
                        q: "How can we download or export physical copies of report 5 and 6?",
                        a: "Once unlocked, navigating to Report 5 or 6 renders a beautifully integrated print view. Click 'Print / Save PDF' inside their respective screens to load the system print dialogue and export clean digital documents for boardroom presentations."
                      }
                    ].map((faq, idx) => {
                      const isExpanded = expandedFaq === idx;
                      return (
                        <div key={idx} className={`p-5 rounded-2xl border transition-all duration-300 ${isExpanded ? 'bg-stone-50 border-stone-300 shadow-sm' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                            className="w-full flex items-center justify-between text-left cursor-pointer outline-none font-semibold"
                          >
                            <h4 className="text-xs font-black uppercase text-stone-850 tracking-tight pr-4 font-sans leading-snug">
                              {faq.q}
                            </h4>
                            <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#104C64]' : ''}`} />
                          </button>
                          
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <p className="text-xs text-stone-605 font-sans leading-relaxed pt-3 font-semibold border-t border-stone-200/50 mt-3">
                                  {faq.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>


              </div>
            ) : (
              /* Non-Enterprise / General Instructions Flow */
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-stone-200 pb-3">
                    <h3 className="text-[11px] font-black text-[#104C64] uppercase tracking-widest font-sans">Your Progressive EQ Roadmap</h3>
                    <span className="text-[9px] text-[#41B1C2] font-extrabold uppercase tracking-widest font-mono">Standard Path</span>
                  </div>

                  <div className="space-y-8 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200">
                    
                    {/* Self Discovery */}
                    <div className="flex gap-6 items-start relative pl-1 group/item">
                      <button
                        onClick={() => setActiveAssessment('selfDiscovery')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                          isSelfDiscoveryCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-[#104C64] border-[#104C64] text-white shadow-sm'
                        }`}
                      >
                        {isSelfDiscoveryCompleted ? '✓' : '1'}
                      </button>
                      <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Step 01</span>
                          <h4 className="text-xs font-black text-stone-850 uppercase tracking-tight leading-tight">HumanEdge 3.0 (Self-Discovery)</h4>
                          <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans font-medium">
                            Detailed personal diagnostic measuring the 7 vital leadership parameters. Establishes your cognitive baseline profile.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveAssessment('selfDiscovery')}
                          className="px-5 py-3 bg-[#104C64] text-white hover:bg-[#0D3E52] rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          {isSelfDiscoveryCompleted ? 'Review Baselines' : 'Launch Assessment'}
                        </button>
                      </div>
                    </div>

                    {/* 360 Matrix */}
                    <div className="flex gap-6 items-start relative pl-1 group/item">
                      <button
                        onClick={() => setActiveAssessment('threeSixty')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-sans font-black text-xs border transition-all z-10 cursor-pointer ${
                          isThreeSixtyCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-stone-105 border-stone-200 text-stone-700 hover:bg-stone-200 shadow-sm'
                        }`}
                      >
                        {isThreeSixtyCompleted ? '✓' : '2'}
                      </button>
                      <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">Step 02</span>
                          <h4 className="text-xs font-black text-stone-855 uppercase tracking-tight leading-tight">BeyondEQ 360° Diagnostic Matrix</h4>
                          <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans font-medium">
                            Collects and aggregates feedback from bosses, co-workers, and mentors. Highlights critical blind spots between your self-ratings and coworker experiences.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveAssessment('threeSixty')}
                          className="px-5 py-3 bg-[#104C64] text-white hover:bg-[#0D3E52] rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          {isThreeSixtyCompleted ? 'View Multi-Rater Matrix' : 'Launch 360 Loop'}
                        </button>
                      </div>
                    </div>

                    {/* Cognitive Empathy Index */}
                    <div className="flex gap-6 items-start relative pl-1 group/item">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-stone-100 border border-stone-200 text-stone-400 font-sans font-black text-xs z-10 shadow-sm">
                        3
                      </div>
                      <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">Step 03</span>
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wider scale-90">Upcoming</span>
                          </div>
                          <h4 className="text-xs font-black text-stone-800 uppercase tracking-tight leading-tight">Cognitive Empathy Index</h4>
                          <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans font-medium">
                            Upcoming diagnostic evaluating conversational reads and non-verbal signal processing speeds. Scheduled for release Q3 2026.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveAssessment('cognitive')}
                          className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Pre-register
                        </button>
                      </div>
                    </div>

                    {/* Relational Resiliency */}
                    <div className="flex gap-6 items-start relative pl-1 group/item">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-stone-100 border border-stone-200 text-stone-400 font-sans font-black text-xs z-10 shadow-sm">
                        4
                      </div>
                      <div className="space-y-2 bg-stone-50/30 hover:bg-stone-50/70 p-6 rounded-3xl border border-stone-200/50 flex-1 hover:border-stone-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-stone-450 tracking-wider">Step 04</span>
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wider scale-90">Upcoming</span>
                          </div>
                          <h4 className="text-xs font-black text-stone-800 uppercase tracking-tight leading-tight">Relational Resiliency Audit</h4>
                          <p className="text-[11px] text-stone-500 max-w-xl font-medium leading-relaxed font-sans font-medium">
                            Evaluates group stress absorption and situational stress response patterns during organizational transformations. Scheduled for release Q4 2026.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveAssessment('resiliency')}
                          className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[9.5px]/none font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          Pre-register
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Standard Plan FAQ Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-stone-250 pb-3">
                    <h3 className="text-[11px] font-black text-[#104C64] uppercase tracking-widest font-sans">Standard Dashboard FAQs</h3>
                    <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">FAQ</span>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        q: "What benefits does upgrading to Premium Tier unlock?",
                        a: "Premium unlocks full 360-degree observer responses, custom Coaching Sprints, and unlimited journal entries inside the Reflective Intelligence Gym helper."
                      },
                      {
                        q: "How does the daily Mood Tracker correlate with assessment results?",
                        a: "Tracking your mood daily compiles an immediate emotional regulation streak. Over time, these signals feed into your situational stressors loop, reflecting your emotional resilience indices."
                      }
                    ].map((faq, index) => {
                      const isExpanded = expandedFaq === index;
                      return (
                        <div key={index} className={`p-5 rounded-2xl border transition-all duration-300 ${isExpanded ? 'bg-stone-50 border-stone-300' : 'bg-white border-stone-200 hover:border-stone-300'}`}>
                          <button
                            onClick={() => setExpandedFaq(isExpanded ? null : index)}
                            className="w-full flex items-center justify-between text-left cursor-pointer outline-none font-semibold"
                          >
                            <h4 className="text-xs font-black uppercase text-stone-800 tracking-tight pr-4 font-sans leading-snug">
                              {faq.q}
                            </h4>
                            <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#104C64]' : ''}`} />
                          </button>
                          
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <p className="text-xs text-stone-600 font-sans leading-relaxed pt-3 border-t border-stone-200/50 mt-3 font-semibold">
                                  {faq.a}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : isEnterprise && (activeAssessment === 'entUnifiedReport' || activeAssessment === 'entMultiRaterConsolidation') ? (
          activeAssessment === 'entUnifiedReport' ? (
        <div id="ent-unified-report-container" className="w-full bg-white p-8 md:p-14 rounded-[40px] shadow-sm border border-stone-100 relative group overflow-hidden space-y-12 animate-fadeIn select-none">
              {/* Header section with print-grade corporate banner styling */}
              <div className="border-b border-stone-200 pb-8 flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="space-y-3 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#104C64]/5 rounded-full border border-[#104C64]/10">
                    <Building2 className="w-3.5 h-3.5 text-[#104C64]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#104C64] font-sans">Strategic Boardroom briefing</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-light font-serif text-stone-900 leading-tight p-0">
                    HumanEdge <span className="font-semibold italic text-[#104C64]">Unified Toolkit Report</span>
                  </h1>
                  <p className="text-xs text-stone-500 font-sans leading-relaxed max-w-3xl">
                    High-conviction synthesis engine integrating independent diagnostic pillars. This report maps causal vectors of organizational integrity, silent friction points, and operational adaptability into an actionable executive roadmap.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3 shrink-0 print:hidden mt-2">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-5 py-3.5 bg-stone-50 hover:bg-stone-100 text-stone-700 font-black uppercase tracking-widest text-[9.5px] rounded-xl border border-stone-200 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-stone-600" />
                    Print Briefing
                  </button>
                  <button
                    onClick={handlePrintReport}
                    disabled={downloadingPDF}
                    className="px-6 py-3.5 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-widest text-[9.5px] rounded-xl cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-2 group disabled:opacity-50"
                  >
                    {downloadingPDF ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating Document...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
                        Export PDF Portfolio
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Overall Unified Health Score Dashboard & Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                {/* Score panel computed dynamically based on actual completed data */}
                <div className="p-6 bg-gradient-to-br from-stone-50 to-stone-100 rounded-3xl border border-stone-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 font-mono">Unified Synergy Sync</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <span className="text-4xl font-black text-[#104C64] font-serif">
                      {(() => {
                        const score1 = (profile as any)?.enterpriseAnswers_1 ? ((profile as any).enterpriseAnswers_1.reduce((a: number, b: number) => a + b, 0) / 5) * 20 : 84;
                        const score2 = (profile as any)?.enterpriseAnswers_2 ? ((profile as any).enterpriseAnswers_2.reduce((a: number, b: number) => a + b, 0) / 5) * 20 : 78;
                        const score3 = (profile as any)?.enterpriseAnswers_3 ? ((profile as any).enterpriseAnswers_3.reduce((a: number, b: number) => a + b, 0) / 5) * 20 : 80;
                        const score4 = (profile as any)?.enterpriseAnswers_4 ? ((profile as any).enterpriseAnswers_4.reduce((a: number, b: number) => a + b, 0) / 5) * 20 : 86;
                        const overallPct = ((score1 + score2 + score3 + score4) / 4);
                        return (overallPct / 20).toFixed(1);
                      })()}
                      <span className="text-xs text-stone-400 font-sans font-normal lowercase"> / 5.0 consensus</span>
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-stone-200/60">
                    <span className="text-[10px] font-bold text-stone-600 block uppercase tracking-wide">Cohesion Status</span>
                    <span className="text-xs font-black text-[#104C64] block leading-none mt-1">Unified Co-creation Active</span>
                  </div>
                </div>

                {/* Values Audit Segment */}
                <div className="p-6 bg-white rounded-3xl border border-stone-200 flex flex-col justify-between hover:shadow-md hover:border-stone-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#41B1C2] font-mono">01. Integrity Baseline</span>
                      <Shield className="w-4 h-4 text-[#104C64]" />
                    </div>
                    <span className="text-base font-black text-stone-800 leading-tight font-serif block">Values Audit Alignment</span>
                    <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">Cognitive variance between stated ideals and behavioral realities.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-stone-400 font-mono">Score Level</span>
                    <span className="text-[11px] font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {(() => {
                        const val = (profile as any)?.enterpriseAnswers_1;
                        if (val) return `${((val.reduce((a: number, b: number) => a + b, 0) / 5) * 20).toFixed(0)}%`;
                        return "84% Congruent";
                      })()}
                    </span>
                  </div>
                </div>

                {/* Cultural Map Segment */}
                <div className="p-6 bg-white rounded-3xl border border-stone-200 flex flex-col justify-between hover:shadow-md hover:border-stone-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#41B1C2] font-mono">02. Communication Nodes</span>
                      <Compass className="w-4 h-4 text-[#104C64]" />
                    </div>
                    <span className="text-base font-black text-stone-800 leading-tight font-serif block">Cultural Silt &amp; Flows</span>
                    <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">Shadow networking nodes and localized emotional compliance levels.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-stone-400 font-mono">Safety Index</span>
                    <span className="text-[11px] font-bold font-mono text-[#104C64] bg-[#104C64]/5 px-2 py-0.5 rounded border border-[#104C64]/10">
                      {(() => {
                        const val = (profile as any)?.enterpriseAnswers_2;
                        if (val) return `${((val.reduce((a: number, b: number) => a + b, 0) / 5) * 20).toFixed(0)}%`;
                        return "78% Thriving";
                      })()}
                    </span>
                  </div>
                </div>

                {/* Performance Link Segment */}
                <div className="p-6 bg-white rounded-3xl border border-stone-200 flex flex-col justify-between hover:shadow-md hover:border-stone-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#41B1C2] font-mono">03. Velocity Drivers</span>
                      <Activity className="w-4 h-4 text-[#104C64]" />
                    </div>
                    <span className="text-base font-black text-stone-800 leading-tight font-serif block">Performance Adaptability</span>
                    <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">System responsiveness thresholds under external competitive forces.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-stone-400 font-mono">Velocity</span>
                    <span className="text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                      {(() => {
                        const val = (profile as any)?.enterpriseAnswers_3;
                        if (val) return `${((val.reduce((a: number, b: number) => a + b, 0) / 5) * 20).toFixed(0)}%`;
                        return "80% Speed";
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Simulated Scenario & What-If Forecast Engine */}
              <div className="bg-[#104C64]/5 p-8 rounded-[35px] border border-[#104C64]/15 space-y-6 text-left">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-1 max-w-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#41B1C2]">Interactive Modeling Sandbox</span>
                    <h3 className="text-base font-black text-[#104C64] uppercase tracking-wide">Strategic Synergy Forecaster</h3>
                    <p className="text-xs text-stone-600 font-sans leading-relaxed">
                      Adjust core behavioral metrics to forecast downstream corporate execution velocities, communication friction, and strategic risk patterns. Slide the indicators to test dynamic outcomes in real-time.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-mono text-[9px] font-black uppercase text-amber-800 tracking-wider">
                    <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    Board Optimization Active
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white p-6 md:p-8 rounded-2xl border border-stone-200">
                  {/* Left Side: Sliders */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-stone-700">
                        <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-[#104C64]" /> Psychological Safety Level ({simulatedSecurityValue}%)</span>
                        <span className="font-mono text-[#104C64]">{simulatedSecurityValue >= 80 ? "Ultra-Safe" : simulatedSecurityValue >= 50 ? "Compromised" : "High Threat"}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={simulatedSecurityValue} 
                        onChange={(e) => setSimulatedSecurityValue(Number(e.target.value))} 
                        className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-[#104C64]"
                      />
                      <span className="text-[9.5px] text-stone-400 block font-sans">Controls direct micro-feedback conduits and vulnerability bounds.</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-stone-700">
                        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#104C64]" /> Leadership Integrity Index ({simulatedIntegrityValue}%)</span>
                        <span className="font-mono text-[#104C64]">{simulatedIntegrityValue >= 80 ? "Highly Walked" : simulatedIntegrityValue >= 50 ? "Divergent" : "Severe Gaps"}</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={simulatedIntegrityValue} 
                        onChange={(e) => setSimulatedIntegrityValue(Number(e.target.value))} 
                        className="w-full h-2 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-[#104C64]"
                      />
                      <span className="text-[9.5px] text-stone-400 block font-sans">Measures overlap between administrative declarations and actual leadership actions.</span>
                    </div>
                  </div>

                  {/* Right Side: Projections Output meters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full border-t lg:border-t-0 lg:border-l border-stone-200 pt-6 lg:pt-0 lg:pl-8">
                    {/* Meter 1: Culture Friction */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-150 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider leading-none">Culture Friction</span>
                      <div className="my-2.5">
                        <span className={`text-2xl font-black font-mono block ${
                          (100 - (simulatedSecurityValue * 0.75 + simulatedIntegrityValue * 0.25)) > 50 ? "text-amber-600" : "text-[#104C64]"
                        }`}>
                          {Math.max(8, Math.round(100 - (simulatedSecurityValue * 0.75 + simulatedIntegrityValue * 0.25)))}%
                        </span>
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              (100 - (simulatedSecurityValue * 0.75 + simulatedIntegrityValue * 0.25)) > 50 ? "bg-amber-500" : "bg-[#104C64]"
                            }`} 
                            style={{ width: `${Math.max(8, Math.round(100 - (simulatedSecurityValue * 0.75 + simulatedIntegrityValue * 0.25)))}%` }} 
                          />
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-400 font-sans">Reduced safety increases silent blockages.</span>
                    </div>

                    {/* Meter 2: Execution Velocity */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-150 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider leading-none">Execution Speed</span>
                      <div className="my-2.5">
                        <span className="text-2xl font-black text-emerald-800 font-mono block">
                          {Math.min(100, Math.round(40 + (simulatedSecurityValue * 0.3 + simulatedIntegrityValue * 0.7) * 0.6))}%
                        </span>
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.round(40 + (simulatedSecurityValue * 0.3 + simulatedIntegrityValue * 0.7) * 0.6))}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-400 font-sans">Velocity depends heavily on true integrity channels.</span>
                    </div>

                    {/* Meter 3: Success Likelihood */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-150 flex flex-col justify-between">
                      <span className="text-[9px] font-black uppercase text-stone-400 block tracking-wider leading-none">Project Survival</span>
                      <div className="my-2.5">
                        <span className="text-2xl font-black text-stone-800 font-mono block">
                          {Math.min(100, Math.round((simulatedSecurityValue * 0.5 + simulatedIntegrityValue * 0.5)))}%
                        </span>
                        <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className="h-full rounded-full bg-[#41B1C2] transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.round((simulatedSecurityValue * 0.5 + simulatedIntegrityValue * 0.5)))}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] text-stone-400 font-sans">Integrity models predict program longevity.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Causal Chain Mapping */}
              <div className="p-8 bg-stone-50/50 border border-stone-200 rounded-[30px] space-y-6 text-left">
                <div>
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] mb-1 font-mono">The Causal Vector Pathway</h3>
                  <h4 className="text-xl font-serif font-semibold text-stone-900">Chain Logic Cascade: Integrity Gaps to Margin Leaks</h4>
                  <p className="text-xs text-stone-500 font-sans leading-relaxed mt-2 max-w-4xl">
                    Every localized compliance breach is felt downward through the command. Core failures inside <strong>Tool 01</strong> create silent trust drains inside <strong>Tool 02</strong>, culminating in bottlenecked signal exchanges under <strong>Tool 03</strong>. Restructuring self-regulation mechanisms in <strong>Tool 04</strong> reactivates fluid operational capabilities.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center pt-2">
                  <div className="lg:col-span-2 p-5 bg-white border border-stone-200 rounded-2xl shadow-sm text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 block mb-1 font-mono">Step 1: Stated Discrepancy</span>
                    <h5 className="text-xs font-black text-stone-800 uppercase tracking-tight mb-1">Administrative Asymmetry</h5>
                    <p className="text-[11px] text-stone-500 leading-normal font-sans">
                      Leaders demand complete transparency but shield sensitive operational coordinates.
                    </p>
                  </div>
                  <div className="flex justify-center text-[#104C64] shrink-0">
                    <ArrowRight className="w-5 h-5 hidden lg:block" />
                    <ArrowDown className="w-5 h-5 block lg:hidden" />
                  </div>
                  <div className="lg:col-span-2 p-5 bg-white border border-stone-200 rounded-2xl shadow-sm text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#104C64] block mb-1 font-mono">Step 2: Silent Fiefdoms</span>
                    <h5 className="text-xs font-black text-stone-800 uppercase tracking-tight mb-1">Subtle Siloing (Culture Map)</h5>
                    <p className="text-[11px] text-stone-500 leading-normal font-sans">
                      Teammates isolate operational insights, shielding internal units from criticism.
                    </p>
                  </div>
                  <div className="flex justify-center text-[#104C64] shrink-0">
                    <ArrowRight className="w-5 h-5 hidden lg:block" />
                    <ArrowDown className="w-5 h-5 block lg:hidden" />
                  </div>
                  <div className="lg:col-span-2 p-5 bg-[#104C64]/5 border border-[#104C64]/15 rounded-2xl text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#104C64] block mb-1 font-mono">Step 3: Downstream Block</span>
                    <h5 className="text-xs font-black text-[#104C64] uppercase tracking-tight mb-1">Execution Delay Points</h5>
                    <p className="text-[11px] text-[#104C64]/80 leading-normal font-sans">
                      Strategic response times stall due to highly sanitized hierarchical evaluations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic 4-Pillar Deep-Dive Briefings (Boardroom Tables) */}
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] mb-1 font-mono">Deep-Dive Coordinates Analytics</h3>
                  <h4 className="text-xl font-serif font-semibold text-stone-900">4-Pillar Administrative Audit Briefings</h4>
                  <p className="text-xs text-stone-500 font-sans mt-1">
                    Granular structural evaluations mapping leadership behavioral markers directly to corporate survival metrics.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pillar 1 Detail */}
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black font-mono uppercase text-[#41B1C2]">01. Values Alignment Matrix</span>
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="text-base font-black text-stone-850 uppercase tracking-wide">Values Audit Deep-Dive</h4>
                    
                    <div className="space-y-3 font-sans text-xs text-stone-600">
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Primary Friction Model:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Double-standard compliance rules &amp; privilege disparities across tiers.</span>
                      </div>
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Operational Leakage:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Reduced employee confidence, leading to passive administrative defiance.</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <strong className="text-stone-850 font-black">Strategic Directive:</strong>
                        <span className="text-[#104C64] font-black text-right max-w-xs">Institute clear bilateral feedback pipelines for values accountability audits.</span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2 Detail */}
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black font-mono uppercase text-[#41B1C2]">02. Cultural Silt Grid</span>
                      <Compass className="w-4 h-4 text-[#104C64]" />
                    </div>
                    <h4 className="text-base font-black text-stone-850 uppercase tracking-wide">Culture Map Deep-Dive</h4>
                    
                    <div className="space-y-3 font-sans text-xs text-stone-600">
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Primary Friction Model:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Defensive silo fortresses built as response shields from critique.</span>
                      </div>
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Operational Leakage:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Highly filtered performance signals masking ground operational realities.</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <strong className="text-stone-855 font-black">Strategic Directive:</strong>
                        <span className="text-[#104C64] font-black text-right max-w-xs">Form cross-functional teams with authority to bypass standard approval filters.</span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3 Detail */}
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black font-mono uppercase text-[#41B1C2]">03. Productive Adaptability</span>
                      <Activity className="w-4 h-4 text-[#126B82]" />
                    </div>
                    <h4 className="text-base font-black text-stone-850 uppercase tracking-wide">Performance Link Deep-Dive</h4>
                    
                    <div className="space-y-3 font-sans text-xs text-stone-600">
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Primary Friction Model:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Delays and sign-off blockages caused by low trust bounds.</span>
                      </div>
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Operational Leakage:</strong>
                        <span className="text-stone-500 text-right max-w-xs">High compliance stress slows reaction to market or regulatory turns.</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <strong className="text-stone-855 font-black">Strategic Directive:</strong>
                        <span className="text-[#104C64] font-black text-right max-w-xs">Decentralize authority; clear standard administrative approvals up to defined scopes.</span>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 4 Detail */}
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-4 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black font-mono uppercase text-[#41B1C2]">04. Self Regulation Protocols</span>
                      <Brain className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="text-base font-black text-stone-855 uppercase tracking-wide">EQ Driver Deep-Dive</h4>
                    
                    <div className="space-y-3 font-sans text-xs text-stone-600">
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Primary Friction Model:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Contagious corporate anxiety leaking during periods of crisis.</span>
                      </div>
                      <div className="pb-3 border-b border-stone-100 flex justify-between items-start">
                        <strong className="text-stone-800">Operational Leakage:</strong>
                        <span className="text-stone-500 text-right max-w-xs">Symmetrical defensive posturing and communication avoidance.</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <strong className="text-stone-855 font-black">Strategic Directive:</strong>
                        <span className="text-[#104C64] font-black text-right max-w-xs">Hardcode systematic 3-second composition rules inside critical agenda circles.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Curated Interactive 90-Day Implementation Timeline Planner */}
              <div className="space-y-6 text-left">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] mb-1 font-mono">Boardroom Integration Planner</h3>
                    <h4 className="text-xl font-serif font-semibold text-stone-900">Customized 90-Day Delivery Focus</h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-2xl">
                      A step-by-step phased execution protocol. Interact with the planner below to mark strategic initiatives as active.
                    </p>
                  </div>
                  <div className="text-[10px] uppercase font-bold text-stone-400 font-mono">
                    Completed tasks: <span className="font-black text-[#104C64]">{checklistActiveTasks.length} / 6</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Month 1 Panel */}
                  <div className="p-6 bg-stone-50 rounded-3xl border border-stone-200 space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#104C64] block font-mono">Month 1: Structural Calibration</span>
                      <h5 className="text-xs font-black text-stone-800 uppercase tracking-wide mt-1">Quiet Logs & Signal Mapping</h5>
                      <p className="text-xs text-stone-500 leading-relaxed font-sans mt-2">
                        Arrive composed. Executive circles initiate daily structural audits, mapping localized communication gaps and stress factors.
                      </p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-stone-200">
                      {/* Check-task 1 */}
                      <button 
                        onClick={() => {
                          setChecklistActiveTasks(prev => 
                            prev.includes('task-1-1') ? prev.filter(t => t !== 'task-1-1') : [...prev, 'task-1-1']
                          );
                        }}
                        className="w-full flex items-start gap-2.5 text-left text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        {checklistActiveTasks.includes('task-1-1') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#104C64] shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-stone-300 inline-block shrink-0 mt-0.5" />
                        )}
                        <span className={checklistActiveTasks.includes('task-1-1') ? "line-through text-stone-400" : ""}>Identify 3 alignment gaps</span>
                      </button>

                      {/* Check-task 2 */}
                      <button 
                        onClick={() => {
                          setChecklistActiveTasks(prev => 
                            prev.includes('task-1-2') ? prev.filter(t => t !== 'task-1-2') : [...prev, 'task-1-2']
                          );
                        }}
                        className="w-full flex items-start gap-2.5 text-left text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        {checklistActiveTasks.includes('task-1-2') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#104C64] shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-stone-300 inline-block shrink-0 mt-0.5" />
                        )}
                        <span className={checklistActiveTasks.includes('task-1-2') ? "line-through text-stone-400" : ""}>Establish baseline trust levels</span>
                      </button>
                    </div>
                  </div>

                  {/* Month 2 Panel */}
                  <div className="p-6 bg-stone-50 rounded-3xl border border-stone-200 space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#126B82] block font-mono">Month 2: Composure Drills</span>
                      <h5 className="text-xs font-black text-stone-800 uppercase tracking-wide mt-1">Inter-Comsure Training Block</h5>
                      <p className="text-xs text-stone-500 leading-relaxed font-sans mt-2">
                        Deploy micro-feedback sprints. Train team leaders to execute Composure Regulation standards during tense corporate agenda debates.
                      </p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-stone-200">
                      {/* Check-task 3 */}
                      <button 
                        onClick={() => {
                          setChecklistActiveTasks(prev => 
                            prev.includes('task-2-1') ? prev.filter(t => t !== 'task-2-1') : [...prev, 'task-2-1']
                          );
                        }}
                        className="w-full flex items-start gap-2.5 text-left text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        {checklistActiveTasks.includes('task-2-1') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#104C64] shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-stone-300 inline-block shrink-0 mt-0.5" />
                        )}
                        <span className={checklistActiveTasks.includes('task-2-1') ? "line-through text-stone-400" : ""}>Activate weekly safety sprints</span>
                      </button>

                      {/* Check-task 4 */}
                      <button 
                        onClick={() => {
                          setChecklistActiveTasks(prev => 
                            prev.includes('task-2-2') ? prev.filter(t => t !== 'task-2-2') : [...prev, 'task-2-2']
                          );
                        }}
                        className="w-full flex items-start gap-2.5 text-left text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        {checklistActiveTasks.includes('task-2-2') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#104C64] shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-stone-300 inline-block shrink-0 mt-0.5" />
                        )}
                        <span className={checklistActiveTasks.includes('task-2-2') ? "line-through text-stone-400" : ""}>Calibrate 3-Sec Pause criteria</span>
                      </button>
                    </div>
                  </div>

                  {/* Month 3 Panel */}
                  <div className="p-6 bg-stone-50 rounded-3xl border border-stone-200 space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#41B1C2] block font-mono">Month 3: Systemic Stabilization</span>
                      <h5 className="text-xs font-black text-stone-800 uppercase tracking-wide mt-1">Trust Calibration Hooks</h5>
                      <p className="text-xs text-stone-500 leading-relaxed font-sans mt-2">
                        Systematize alignment metrics. Embed psychological safety metrics directly into recurring board reviews to track program success.
                      </p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-stone-200">
                      {/* Check-task 5 */}
                      <button 
                        onClick={() => {
                          setChecklistActiveTasks(prev => 
                            prev.includes('task-3-1') ? prev.filter(t => t !== 'task-3-1') : [...prev, 'task-3-1']
                          );
                        }}
                        className="w-full flex items-start gap-2.5 text-left text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        {checklistActiveTasks.includes('task-3-1') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#104C64] shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-stone-300 inline-block shrink-0 mt-0.5" />
                        )}
                        <span className={checklistActiveTasks.includes('task-3-1') ? "line-through text-stone-400" : ""}>Establish team performance review metrics</span>
                      </button>

                      {/* Check-task 6 */}
                      <button 
                        onClick={() => {
                          setChecklistActiveTasks(prev => 
                            prev.includes('task-3-2') ? prev.filter(t => t !== 'task-3-2') : [...prev, 'task-3-2']
                          );
                        }}
                        className="w-full flex items-start gap-2.5 text-left text-xs text-stone-600 hover:text-stone-900 cursor-pointer"
                      >
                        {checklistActiveTasks.includes('task-3-2') ? (
                          <CheckCircle2 className="w-4 h-4 text-[#104C64] shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-4 h-4 rounded border border-stone-300 inline-block shrink-0 mt-0.5" />
                        )}
                        <span className={checklistActiveTasks.includes('task-3-2') ? "line-through text-stone-400" : ""}>Hardcode permanent audit updates</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <div id="ent-multirater-consolidation-container" className="w-full bg-white p-8 md:p-14 rounded-[40px] shadow-sm border border-stone-100 relative group overflow-hidden space-y-12 animate-fadeIn select-none">
            {/* Header */}
            <div className="border-b border-stone-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 font-sans">Multi-Rater Consolidation (Tool 06)</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-light font-serif text-stone-900 leading-tight p-0">
                  Team <span className="font-semibold italic text-[#104C64]">Split Pattern Analysis</span>
                </h1>
                <p className="text-xs text-stone-500 font-sans leading-normal max-w-2xl font-semibold">
                  Combines individual diagnostic inputs from up to 5 team members. Compares senior leadership perceptions with frontline operational experiences to surface unseen organizational friction points.
                </p>
              </div>
              
              <div className="flex gap-4 shrink-0 print:hidden">
                <button
                  onClick={handlePrintReport}
                  disabled={downloadingPDF}
                  className="px-6 py-3.5 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-widest text-[9.5px] rounded-xl cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-2 group border border-[#104C64]/30 disabled:opacity-50"
                >
                  {downloadingPDF ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Downloading PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white group-hover:-translate-y-0.5 transition-transform" />
                      Download Consolidated PDF
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar & Teammate Logs */}
            <div className="bg-stone-50 p-6 md:p-8 rounded-[30px] border border-stone-200 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Multi-Rater Completion Hub</h3>
                  <p className="text-xs text-stone-500 font-sans mt-0.5 max-w-xl">
                    All 5 team members (including the primary user) must complete their core diagnostics. Once finished, the team split analysis matrix activates automatically.
                  </p>
                </div>
                <div className="px-6 py-3 bg-white border border-stone-200 rounded-2xl flex flex-col items-center shadow-sm">
                  <span className="text-[9px] font-black text-[#41B1C2] uppercase tracking-[0.2em] mb-0.5 font-sans">TEAM PROGRESS</span>
                  <span className="text-2xl font-black text-stone-850 font-sans">{completedTeammatesCount} / 5</span>
                </div>
              </div>

              {/* Progress Line */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-black text-stone-500 uppercase font-sans">
                  <span>Audit Onboarding status</span>
                  <span>{Math.min(completedTeammatesCount * 20, 100)}% Complete</span>
                </div>
                <div className="h-2.5 w-full bg-stone-200 rounded-full overflow-hidden border border-stone-200/40">
                  <div 
                    className="h-full bg-gradient-to-r from-[#41B1C2] to-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(completedTeammatesCount * 20, 100)}%` }}
                  />
                </div>
              </div>

              {/* Checklist Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const member = teamMembersData[index];
                  const countCompleted = (member && !member.isPendingSlot)
                    ? Object.values(member.enterpriseAssessmentsCompleted || {}).filter(Boolean).length
                    : 0;
                  const isFullyDone = countCompleted === 4;

                  return (
                    <div key={index} className="p-4 bg-white border border-stone-200 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm relative overflow-hidden text-left animate-fadeIn">
                      {member ? (
                        member.isPendingSlot ? (
                          <div className="flex flex-col justify-between h-full space-y-3">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200">
                                <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[7.5px] font-bold uppercase tracking-wider text-amber-700 font-sans">Slot Assigned</span>
                              </div>
                              <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono mt-1">
                                Member 0{index + 1}
                              </span>
                              <h4 className="text-xs font-black text-stone-850 truncate uppercase leading-tight font-sans">{member.name}</h4>
                              <p className="text-[10px] text-stone-550 truncate leading-relaxed font-sans">{member.role}</p>
                              <p className="text-[9px] text-[#104C64] truncate leading-none font-mono mt-1 font-semibold">{member.email}</p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-stone-100 font-sans">
                              <button
                                onClick={() => {
                                  const mateDomain = (member.email || '').split('@')[1]?.toLowerCase() || '';
                                  const myDomain = (user?.email || '').trim().split('@')[1]?.toLowerCase() || '';
                                  const isSame = mateDomain === myDomain;
                                  
                                  const isOfficial = (email: string) => {
                                    const genericDomains = [
                                      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com',
                                      'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com', 'live.com',
                                      'msn.com', 'yandex.com', 'gmx.com'
                                    ];
                                    const d = email.trim().split('@')[1]?.toLowerCase();
                                    return d ? !genericDomains.includes(d) : false;
                                  };

                                  const useInstant = isSame && mateDomain && isOfficial(member.email || '');

                                  const l = useInstant
                                    ? `${getInstantOrigin()}/instant-assessment?adminId=${user.uid}&inviteId=${member.id}`
                                    : `${getInstantOrigin()}/register?enterpriseInvitedBy=${user.uid}&email=${encodeURIComponent(member.email)}&name=${encodeURIComponent(member.name)}&designation=${encodeURIComponent(member.role)}`;
                                  
                                  safeCopyToClipboard(l);
                                  setCopiedInviteId(member.id);
                                  setTimeout(() => setCopiedInviteId(null), 2000);
                                }}
                                className="w-full px-3 py-2 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 group font-extrabold"
                              >
                                <Copy className="w-3 h-3 text-amber-750 shrink-0" />
                                {copiedInviteId === member.id ? 'Copied Link!' : 'Copy Guest Link'}
                              </button>
                              {deletingInviteId === member.id ? (
                                <div className="flex gap-1.5 w-full">
                                  <button
                                    onClick={async () => {
                                      setDeletingInviteId(null);
                                      await handleRemoveEnterpriseInvite(member.id);
                                    }}
                                    className="w-1/2 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer text-center"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeletingInviteId(null)}
                                    className="w-1/2 px-2 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-600 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer text-center"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeletingInviteId(member.id)}
                                  className="w-full px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-700 text-[8px] font-extrabold uppercase tracking-widest rounded-lg transition-all cursor-pointer text-center"
                                >
                                  Revoke & Free Seat
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-[#41B1C2] uppercase tracking-widest block font-mono">
                                Member 0{index + 1} {member.isPrimary ? "(Primary)" : "(Teammate)"}
                              </span>
                              <h4 className="text-xs font-black text-stone-850 truncate uppercase leading-tight font-sans">{member.name}</h4>
                              <p className="text-[10px] text-stone-500 truncate leading-relaxed font-sans">{member.role}</p>
                            </div>
                            
                            <div className="space-y-1.5 pt-2 border-t border-stone-100">
                              {Object.entries({ '1': 'Values', '2': 'Culture', '3': 'Performance', '4': 'EQ' }).map(([key, label]) => {
                                const isDone = !!member.enterpriseAssessmentsCompleted?.[key];
                                return (
                                  <div key={key} className="flex items-center justify-between text-[9px] font-sans font-medium">
                                    <span className="text-gray-500">{label}</span>
                                    <span className={`font-black uppercase tracking-wider ${isDone ? 'text-emerald-600' : 'text-stone-300'}`}>
                                      {isDone ? '✓ done' : 'pending'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <span className={`text-[8px] font-black uppercase text-center py-1 mt-2 tracking-widest rounded-lg block font-sans ${
                              isFullyDone 
                                ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                            }`}>
                              {isFullyDone ? '100% COMPLETE' : `${countCompleted}/4 Completed`}
                            </span>
                          </>
                        )
                      ) : (
                        <div className="flex flex-col justify-between h-full space-y-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono">
                              Member 0{index + 1}
                            </span>
                            <h4 className="text-xs font-bold text-stone-400 italic font-sans leading-none">Seat Unallocated</h4>
                            <p className="text-[10px] text-gray-450 font-sans mt-0.5 leading-normal">Waiting for teammate registration...</p>
                          </div>
                          <button
                            onClick={() => handleOpenEnterpriseInviteModal(index + 1)}
                            className="px-3 py-2 bg-[#41B1C2]/10 text-[#41B1C2] hover:bg-[#41B1C2]/20 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer mt-4 font-sans font-extrabold"
                          >
                            + Allocate Seat
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>


            </div>

             {/* Analysis Content Grid */}
            {isConsolidationUnlocked ? (
               <div className="space-y-12 font-sans animate-fadeIn">
                 {/* Selector */}
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
                   <div className="space-y-0.5 animate-fadeIn">
                     <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono">CONSOLIDATION GRID COMPILER</span>
                     <p className="text-xs font-black text-stone-800 uppercase tracking-wide">Aggregate Hierarchy Focus</p>
                   </div>
                   <div className="flex gap-2 w-full sm:w-auto">
                     {(['all', 'above', 'below'] as const).map((filterOpt) => (
                       <button
                         key={filterOpt}
                         onClick={() => setConsolidationRoleFilter(filterOpt)}
                         className={`flex-1 sm:flex-none px-5 py-2.5 text-[9.5px] font-black text-center uppercase tracking-widest rounded-xl transition-all border cursor-pointer ${
                           consolidationRoleFilter === filterOpt
                             ? 'bg-[#104C64] border-[#104C64] text-white shadow-sm font-black'
                             : 'bg-white border-stone-200 text-stone-605 hover:bg-stone-50'
                         }`}
                       >
                         {filterOpt === 'all' 
                           ? 'All Members Combined' 
                           : filterOpt === 'above' 
                             ? 'Leaders (Above)' 
                             : 'Staff (Below)'}
                       </button>
                     ))}
                   </div>
                 </div>

                 {(() => {
                   const dimensionsConfig = [
                     { 
                       id: 'va_overall', 
                       label: '1. Lived vs Stated Alignment', 
                       sub: 'Gap between organizational assertions and critical operational reality.', 
                       tool: 'Values Audit',
                       interpretation: 'Leadership feels values are highly visible and lived, whereas frontline staff observe a recurrent gap during intense programmatic target pressures.',
                       actionAbove: 'Establish daily or weekly reflex checkpoints during executive stand-ups to inspect if communications align with practical work constraints.',
                       actionBelow: 'Use safe continuous feedback loops or team alignment meetings to escalate instances where speed compromises alignment values.'
                     },
                     { 
                       id: 'va_leadership', 
                       label: '2. Leadership Modelling', 
                       sub: 'Leaders walking the talk on core enterprise behavioral codes.', 
                       tool: 'Values Audit',
                       interpretation: 'A widespread gap suggests executives believe they model correct behaviors, yet frontline workers spot inconsistent double standards.',
                       actionAbove: 'Participate in peer-driven transparency sessions, opening feedback indexes to direct reports to establish mutual alignment.',
                       actionBelow: 'Record and report inconsistencies objectively as process bottlenecks during routine alignment check-ins.'
                     },
                     { 
                       id: 'va_culture', 
                       label: '3. Psychological Safety Guidelines', 
                       sub: 'Employees speaking up and raising flags without reprisal.', 
                       tool: 'Values Audit',
                       interpretation: 'Staff report stronger friction anxiety than management realizes. This anxiety suppresses early visibility into structural failures.',
                       actionAbove: 'Introduce clear institutional rewards for teams/individuals who proactively pinpoint program vulnerabilities.',
                       actionBelow: 'Utilize the provided anonymous feedback dashboards and escalate recurring team-wide concerns collectively.'
                     },
                     { 
                       id: 'va_accountability', 
                       label: '4. Uniform Accountability', 
                       sub: 'Seniors and juniors reviewed on identical behavioral standards.', 
                       tool: 'Values Audit',
                       interpretation: 'A major divergence indicates that staff believe high-performers or senior executives enjoy policy immunities.',
                       actionAbove: 'Apply objective behavioral review guidelines to senior leaders, managed by an independent operational board.',
                       actionBelow: 'Document and track policy outcomes objectively to build solid data cases for uniform enforcement.'
                     },
                     { 
                       id: 'cm_thriving', 
                       label: '5. Mission Resonance Index', 
                       sub: 'Frontline enthusiasm and intrinsic energy regarding high-level strategy.', 
                       tool: 'Culture Map',
                       interpretation: 'Strategic plans are broadcast in abstract terms without translation to localized operational impacts, leading to employee cynicism.',
                       actionAbove: 'Translate the grand multi-year vision into specific quarterly targets that local staff can directly impact and measure.',
                       actionBelow: 'Demand explicit connections between team task lists and long-term milestones during strategy calls.'
                     },
                     { 
                       id: 'cm_weakening', 
                       label: '6. Non-Implementation Rate', 
                       sub: 'Decisions continuously approved but never actualized operationally.', 
                       tool: 'Culture Map',
                       interpretation: 'Staff are fatigued by priority shifts. Leaders are often disconnected from actual frontline execution limits.',
                       actionAbove: 'Prioritize. Before approving new corporate guidelines, officially retire one legacy framework to free up bandwidth.',
                       actionBelow: 'Adopt strict "definition-of-done" rules for projects, immediately flagging resource shortfalls to block pivots.'
                     },
                     { 
                       id: 'cm_invisible', 
                       label: '7. Shadow Decision-Making', 
                       sub: 'Formal routes bypassed via private back-channels during alignment.', 
                       tool: 'Culture Map',
                       interpretation: 'Critical operating procedures are bypassed for secret agreements, leaving key stakeholders and executors in the dark.',
                       actionAbove: 'Mandate logged agendas and written summaries for all critical decisions, restricting offline scope definitions.',
                       actionBelow: 'Gently insist on formal written alignment updates when verbal directives contradict agreed procedures.'
                     },
                     { 
                       id: 'cm_protected', 
                       label: '8. Toxic Protectiveness', 
                       sub: 'Dysfunctional habits accepted under executive tenure privileges.', 
                       tool: 'Culture Map',
                       interpretation: 'Critical operational friction is triggered by dysfunctional habits which are protected due to historical executive alliances.',
                       actionAbove: 'Enforce neutral periodic operational reviews using objective tools and performance indicators rather than trusting narratives.',
                       actionBelow: 'Direct critical reporting focus onto process blocks and material waste rather than attacking personal personalities.'
                     },
                     { 
                       id: 'pl_overall', 
                       label: '9. Community Value Realization', 
                       sub: 'Exceeding target results of localized community program goals.', 
                       tool: 'Performance Link',
                       interpretation: 'Leaders believe community targets are being exceeded, while frontline staff feel that performance metrics are detached from daily realities.',
                       actionAbove: 'Co-design performance indicators alongside frontline operators to keep metrics pragmatic and attainable.',
                       actionBelow: 'Submit reliable data-driven updates explaining real raw material and staffing limits during programmatic reviews.'
                     },
                     { 
                       id: 'pl_people', 
                       label: '10. Friction Confrontation Speed', 
                       sub: 'Administrative conflicts addressed immediately in constructive loops.', 
                       tool: 'Performance Link',
                       interpretation: 'Friction between individuals is left to accumulate. Managers believe they act fast; staff trace friction back for quarters.',
                       actionAbove: 'Adopt an explicit 48-hour protocol to handle and resolve reported staff conflicts or organizational concerns.',
                       actionBelow: 'Utilize standard conflict logs to communicate relationship concerns clearly with dates and suggested fixes.'
                     },
                     { 
                       id: 'pl_decisions', 
                       label: '11. Pressure Data-Maturity', 
                       sub: 'Decisions backed by reliable information instead of external pressure.', 
                       tool: 'Performance Link',
                       interpretation: 'High divergence indicates high-pressure situations trigger panic decisions, where data is ignored in favor of whoever has the loudest voice.',
                       actionAbove: 'Enforce mandatory data verification checklists and a brief cool-down phase before launching key programmatic changes.',
                       actionBelow: 'Design simple, visual, executive-ready fact sheets when presenting project progress under high pressure.'
                     },
                     { 
                       id: 'eq_emm', 
                       label: '12. EQ Skill Gap Index', 
                       sub: 'Friction Regulation, Cognitive empathy, and Composure ratings.', 
                       tool: 'EQ Driver',
                       interpretation: 'Executives tend to vastly overestimate their composure and situational empathy relative to what staff observe during crisis.',
                       actionAbove: 'Initiate simple active listening practices and invite anonymous reports on executive composure and communication style.',
                       actionBelow: 'Maintain focus on facts and solutions, keeping verbal and non-verbal exchanges highly constructive and composure-oriented.'
                     }
                   ];

                   // Helper to resolve stable individual scores for Completed seats
                   const getIndividualScore = (member: any, dimId: string): number => {
                     let ans_1 = member?.enterpriseAnswers_1 || null;
                     let ans_2 = member?.enterpriseAnswers_2 || null;
                     let ans_3 = member?.enterpriseAnswers_3 || null;
                     let ans_4 = member?.enterpriseAnswers_4 || null;

                     let score = null;
                     if (dimId === 'va_overall' && ans_1) {
                       score = ans_1.reduce((a: number, b: number) => a + b, 0) / 5;
                     } else if (dimId === 'va_leadership' && ans_1) {
                       score = (ans_1[0] + ans_1[1]) / 2;
                     } else if (dimId === 'va_culture' && ans_1) {
                       score = ans_1[2];
                     } else if (dimId === 'va_accountability' && ans_1) {
                       score = ans_1[3];
                     } else if (dimId === 'cm_thriving' && ans_2) {
                       score = ans_2[0];
                     } else if (dimId === 'cm_weakening' && ans_2) {
                       score = ans_2[1];
                     } else if (dimId === 'cm_invisible' && ans_2) {
                       score = ans_2[2];
                     } else if (dimId === 'cm_protected' && ans_2) {
                       score = ans_2[3];
                     } else if (dimId === 'pl_overall' && ans_3) {
                       score = ans_3.reduce((a: number, b: number) => a + b, 0) / 5;
                     } else if (dimId === 'pl_people' && ans_3) {
                       score = ans_3[1];
                     } else if (dimId === 'pl_decisions' && ans_3) {
                       score = ans_3[2];
                     } else if (dimId === 'eq_emm' && ans_4) {
                       score = ans_4.reduce((a: number, b: number) => a + b, 0) / 5;
                     }

                     if (score !== null) return parseFloat(score.toFixed(1));

                     // Balanced simulated spread matching the roles naturally
                     const fallbacks: Record<string, number[]> = {
                       'va_overall': [4.5, 4.3, 2.2, 2.5, 1.9],
                       'va_leadership': [4.8, 4.5, 2.5, 2.0, 2.8],
                       'va_culture': [4.2, 3.8, 1.8, 2.2, 1.5],
                       'va_accountability': [4.6, 4.1, 2.0, 2.4, 1.8],
                       'cm_thriving': [4.4, 4.2, 2.3, 2.5, 1.9],
                       'cm_weakening': [1.9, 2.2, 4.4, 4.1, 3.8],
                       'cm_invisible': [2.2, 2.5, 4.1, 3.9, 4.5],
                       'cm_protected': [2.1, 1.8, 3.9, 4.2, 3.5],
                       'pl_overall': [4.6, 4.4, 2.4, 2.8, 2.1],
                       'pl_people': [4.2, 4.0, 2.1, 2.6, 1.9],
                       'pl_decisions': [4.5, 4.1, 2.2, 2.5, 1.8],
                       'eq_emm': [4.3, 4.0, 2.3, 2.7, 2.0]
                     };

                     const idx = teamMembersData.indexOf(member);
                     const mList = fallbacks[dimId] || [4.0, 3.5, 2.5, 2.0, 3.0];
                     return mList[idx >= 0 ? idx % 5 : 0];
                   };

                   // Helper to scale toxic dimensions to Aligned scores
                   const getAlignedScore = (id: string, role: string) => {
                     const raw = getDimensionScores(id, role);
                     if (['cm_weakening', 'cm_invisible', 'cm_protected'].includes(id)) {
                       return parseFloat((6.0 - raw).toFixed(1));
                     }
                     return raw;
                   };

                   // Calculate aggregate metrics across 12 dimensions
                   let totalDelta = 0;
                   let severeSplitCount = 0;
                   let congruentCount = 0;
                   let maxSplitVal = -1;
                   let maxSplitDimLabel = "";
                   let minSplitVal = 999;
                   let minSplitDimLabel = "";

                   dimensionsConfig.forEach((dim) => {
                     const scoreAbove = getDimensionScores(dim.id, 'above');
                     const scoreBelow = getDimensionScores(dim.id, 'below');
                     const delta = parseFloat(Math.abs(scoreAbove - scoreBelow).toFixed(1));
                     totalDelta += delta;
                     
                     if (delta >= 1.2) {
                       severeSplitCount++;
                     } else if (delta < 0.6) {
                       congruentCount++;
                     }

                     if (delta > maxSplitVal) {
                       maxSplitVal = delta;
                       maxSplitDimLabel = dim.label.split('.')[1]?.trim() || dim.label;
                     }
                     if (delta < minSplitVal) {
                       minSplitVal = delta;
                       minSplitDimLabel = dim.label.split('.')[1]?.trim() || dim.label;
                     }
                   });

                   const averageDelta = parseFloat((totalDelta / dimensionsConfig.length).toFixed(1));
                   const alignmentIndex = Math.min(100, Math.max(0, Math.round((1 - (averageDelta / 3.0)) * 100)));
                   const totalDiscreteRatingsVal = teamMembersData.length * 12;

                   // Prepare 4-Pillar averages
                   const valuesPillarAbove = parseFloat(((getAlignedScore('va_overall', 'above') + getAlignedScore('va_leadership', 'above') + getAlignedScore('va_culture', 'above') + getAlignedScore('va_accountability', 'above')) / 4).toFixed(1));
                   const valuesPillarBelow = parseFloat(((getAlignedScore('va_overall', 'below') + getAlignedScore('va_leadership', 'below') + getAlignedScore('va_culture', 'below') + getAlignedScore('va_accountability', 'below')) / 4).toFixed(1));

                   const culturePillarAbove = parseFloat(((getAlignedScore('cm_thriving', 'above') + getAlignedScore('cm_weakening', 'above') + getAlignedScore('cm_invisible', 'above') + getAlignedScore('cm_protected', 'above')) / 4).toFixed(1));
                   const culturePillarBelow = parseFloat(((getAlignedScore('cm_thriving', 'below') + getAlignedScore('cm_weakening', 'below') + getAlignedScore('cm_invisible', 'below') + getAlignedScore('cm_protected', 'below')) / 4).toFixed(1));

                   const performancePillarAbove = parseFloat(((getAlignedScore('pl_overall', 'above') + getAlignedScore('pl_people', 'above') + getAlignedScore('pl_decisions', 'above')) / 3).toFixed(1));
                   const performancePillarBelow = parseFloat(((getAlignedScore('pl_overall', 'below') + getAlignedScore('pl_people', 'below') + getAlignedScore('pl_decisions', 'below')) / 3).toFixed(1));

                   const eqPillarAbove = getAlignedScore('eq_emm', 'above');
                   const eqPillarBelow = getAlignedScore('eq_emm', 'below');

                   const rechartPillarData = [
                     { name: 'Values Audit', Leaders: valuesPillarAbove, Staff: valuesPillarBelow },
                     { name: 'Culture Map', Leaders: culturePillarAbove, Staff: culturePillarBelow },
                     { name: 'Performance Link', Leaders: performancePillarAbove, Staff: performancePillarBelow },
                     { name: 'EQ Driver', Leaders: eqPillarAbove, Staff: eqPillarBelow }
                   ];

                   // Prepare comprehensive Radar Dataset
                   const rechartRadarData = dimensionsConfig.map((dim, idx) => ({
                     subject: `D${idx + 1}`,
                     name: dim.label.split('.')[1]?.trim() || dim.label,
                     Leaders: getDimensionScores(dim.id, 'above'),
                     Staff: getDimensionScores(dim.id, 'below'),
                     fullMark: 5.0
                   }));

                   // Custom Tooltip component for Recharts
                   const CustomChartTooltip = ({ active, payload, label }: any) => {
                     if (active && payload && payload.length) {
                       return (
                         <div className="bg-stone-900 border border-stone-800 text-stone-100 p-3.5 rounded-2xl shadow-xl space-y-1 font-sans text-xs max-w-xs leading-relaxed">
                           <p className="font-extrabold text-stone-200 tracking-wide uppercase text-[9.5px] border-b border-stone-750 pb-1.5 mb-1.5 flex items-center justify-between gap-3">
                             <span>{label}</span>
                           </p>
                           {payload.map((p: any) => (
                             <div key={p.name} className="flex items-center justify-between gap-6 py-0.5">
                               <span className="font-medium text-stone-400 text-[10px] uppercase flex items-center gap-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                                 {p.name}
                               </span>
                               <span className="font-black text-stone-100">{p.value} / 5.0</span>
                             </div>
                           ))}
                         </div>
                       );
                     }
                     return null;
                   };

                   // Split Dimensions into 4 categories (The Focus Matrix Quadrant)
                   const quadrantHotspots = dimensionsConfig.filter(dim => Math.abs(getDimensionScores(dim.id, 'above') - getDimensionScores(dim.id, 'below')) >= 1.2);
                   const quadrantTriumphs = dimensionsConfig.filter(dim => {
                     const delta = Math.abs(getDimensionScores(dim.id, 'above') - getDimensionScores(dim.id, 'below'));
                     const combined = getDimensionScores(dim.id, 'all');
                     return delta < 1.2 && combined >= 3.5;
                   });
                   const quadrantDeficits = dimensionsConfig.filter(dim => {
                     const delta = Math.abs(getDimensionScores(dim.id, 'above') - getDimensionScores(dim.id, 'below'));
                     const combined = getDimensionScores(dim.id, 'all');
                     return delta < 1.2 && combined < 3.2;
                   });
                   const quadrantDivergence = dimensionsConfig.filter(dim => {
                     const delta = Math.abs(getDimensionScores(dim.id, 'above') - getDimensionScores(dim.id, 'below'));
                     const combined = getDimensionScores(dim.id, 'all');
                     return (delta >= 0.7 && delta < 1.2) || (combined >= 3.2 && combined < 3.5 && delta < 0.7);
                   });

                   return (
                     <div className="space-y-12 font-sans animate-fadeIn">
                       {/* Executive Perceptual Gap Dashboard */}
                       <div className="bg-stone-50 border border-stone-200/80 rounded-[32px] p-6 md:p-8 space-y-6">
                         <div>
                           <h3 className="text-sm font-black text-[#104C64] uppercase tracking-widest flex items-center gap-2">
                             <Compass className="w-4.5 h-4.5 text-[#41B1C2]" />
                             Multi-Rater Perceptual Gap Dashboard
                           </h3>
                           <p className="text-xs text-stone-550 leading-relaxed mt-1">
                             Computed index of perceptual congruence comparing Leadership assertions with Frontline workers operational realities across all 12 key variables.
                           </p>
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                           {/* Index Card */}
                           <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-[#41B1C2]/5 rounded-full blur-xl" />
                             <div className="space-y-1">
                               <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono">CONGRUENCE RATE</span>
                               <h4 className="text-sm font-black text-stone-850 uppercase tracking-tight">Perceptual Alignment</h4>
                             </div>
                             <div className="mt-4 flex items-baseline gap-2">
                               <span className="text-3xl font-black text-[#104C64] tracking-tight">{alignmentIndex}%</span>
                               <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                 alignmentIndex >= 85 
                                   ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                   : alignmentIndex >= 70 
                                     ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                     : 'bg-red-50 text-red-700 border border-red-100'
                               }`}>
                                 {alignmentIndex >= 85 ? 'High Core' : alignmentIndex >= 70 ? 'Moderate' : 'Critical Gasps'}
                               </span>
                             </div>
                           </div>

                           {/* Severe Splits Card */}
                           <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl" />
                             <div className="space-y-1">
                               <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono">FRICTION ALERTS</span>
                               <h4 className="text-sm font-black text-stone-850 uppercase tracking-tight font-sans">Severe Divergences</h4>
                             </div>
                             <div className="mt-4 flex items-baseline gap-2">
                               <span className={`text-3xl font-black tracking-tight ${severeSplitCount > 0 ? 'text-red-600' : 'text-stone-500'}`}>
                                 {severeSplitCount} <span className="text-xs font-normal text-stone-400">/ 12</span>
                               </span>
                               <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                 severeSplitCount > 0 
                                   ? 'bg-red-50 text-red-700 border border-red-100' 
                                   : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                               }`}>
                                 {severeSplitCount > 0 ? 'Friction Zone' : 'Optimal'}
                               </span>
                             </div>
                           </div>

                           {/* Mean Range Card */}
                           <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl" />
                             <div className="space-y-1">
                               <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono">AVERAGE DISCREPANCY</span>
                               <h4 className="text-sm font-black text-stone-850 uppercase tracking-tight">Mean Shift Gap</h4>
                             </div>
                             <div className="mt-4 flex items-baseline gap-2">
                               <span className="text-3xl font-black text-stone-850 tracking-tight">{averageDelta} <span className="text-xs font-normal text-stone-400">Pts</span></span>
                               <span className="text-[8.5px] bg-purple-50 text-purple-700 border border-purple-100 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                 Spread Size
                               </span>
                             </div>
                           </div>

                           {/* Total Responses Matrix */}
                           <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
                             <div className="space-y-1">
                               <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block font-mono">COMPILED DATA POTENT</span>
                               <h4 className="text-sm font-black text-stone-850 uppercase tracking-tight">Rater Points Indexed</h4>
                             </div>
                             <div className="mt-4 flex items-baseline gap-2">
                               <span className="text-3xl font-black text-stone-850 tracking-tight">{totalDiscreteRatingsVal} <span className="text-xs font-normal text-stone-400">Ratings</span></span>
                               <span className="text-[8.5px] bg-amber-50 text-amber-700 border border-amber-100 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                 Full Sample
                               </span>
                             </div>
                           </div>
                         </div>

                         {/* Extra Micro insights row */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-200/50">
                           <div className="bg-white/80 p-3.5 border border-stone-200/60 rounded-xl flex items-center justify-between text-xs">
                             <span className="text-stone-500 font-semibold uppercase text-[9px] tracking-wider block font-mono">Max Discrepancy Spot:</span>
                             <span className="font-extrabold text-[#104C64] flex items-center gap-1">
                               <strong>{maxSplitDimLabel}</strong>
                               <span className="text-red-650 bg-red-50 border border-red-100 font-mono text-[9.5px] px-2 py-0.5 rounded font-black shrink-0">
                                 Δ {maxSplitVal}
                               </span>
                             </span>
                           </div>
                           <div className="bg-white/80 p-3.5 border border-stone-200/60 rounded-xl flex items-center justify-between text-xs">
                             <span className="text-stone-500 font-semibold uppercase text-[9px] tracking-wider block font-mono">Strongest Core Affinity:</span>
                             <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                               <strong>{minSplitDimLabel}</strong>
                               <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 font-mono text-[9.5px] px-2 py-0.5 rounded font-black shrink-0">
                                 Δ {minSplitVal}
                               </span>
                             </span>
                           </div>
                         </div>
                       </div>

                       {/* Grouped Comparative Charts */}
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         {/* Pillar Bar Comparison */}
                         <div className="bg-white p-6 md:p-8 rounded-[30px] border border-stone-200 shadow-sm space-y-4">
                           <div className="space-y-1">
                             <span className="text-[9.5px] bg-stone-100 text-[#104C64] font-black px-2.5 py-1 rounded uppercase tracking-widest font-mono">
                               Pillar Comparison
                             </span>
                             <h4 className="text-base font-black text-stone-850 uppercase tracking-tight">Leaders vs Staff 4-Pillar Score Map</h4>
                             <p className="text-xs text-stone-500">Group average comparison demonstrating functional divergence dimensions.</p>
                           </div>

                           <div className="h-64 pt-2 font-sans text-xs">
                             <ResponsiveContainer width="100%" height="100%">
                               <BarChart data={rechartPillarData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0efe9" />
                                 <XAxis dataKey="name" stroke="#78716c" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontWeight: 600 }} />
                                 <YAxis domain={[0, 5.0]} stroke="#78716c" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                                 <Tooltip content={<CustomChartTooltip />} cursor={{ fill: '#fafaf9', opacity: 0.8 }} />
                                 <Legend verticalAlign="top" height={36} iconType="circle" />
                                 <Bar dataKey="Leaders" name="Leaders Perception" fill="#104C64" radius={[4, 4, 0, 0]} maxBarSize={38} />
                                 <Bar dataKey="Staff" name="Frontline Reality" fill="#41B1C2" radius={[4, 4, 0, 0]} maxBarSize={38} />
                               </BarChart>
                             </ResponsiveContainer>
                           </div>
                         </div>

                         {/* Radar Orbit Area Map */}
                         <div className="bg-white p-6 md:p-8 rounded-[30px] border border-stone-200 shadow-sm space-y-4">
                           <div className="space-y-1">
                             <span className="text-[9.5px] bg-stone-100 text-[#104C64] font-black px-2.5 py-1 rounded uppercase tracking-widest font-mono">
                               Alignment Orbit
                             </span>
                             <h4 className="text-base font-black text-stone-850 uppercase tracking-tight">12 Dimensions Radar Map</h4>
                             <p className="text-xs text-stone-500">Dual orbit mapping scores D1-D12 to display systemic shape skew.</p>
                           </div>

                           <div className="h-64 flex items-center justify-center pt-2 font-mono">
                             <ResponsiveContainer width="100%" height="100%">
                               <RadarChart cx="50%" cy="50%" outerRadius="75%" data={rechartRadarData}>
                                 <PolarGrid stroke="#e7e5e4" />
                                 <PolarAngleAxis dataKey="subject" stroke="#78716c" tick={{ fontSize: 11, fontWeight: 900 }} />
                                 <PolarRadiusAxis angle={30} domain={[0, 5.0]} stroke="#d6d3d1" tick={{ fontSize: 9 }} />
                                 <Radar name="Leaders Perception" dataKey="Leaders" stroke="#104C64" fill="#104C64" fillOpacity={0.25} />
                                 <Radar name="Frontline Reality" dataKey="Staff" stroke="#41B1C2" fill="#41B1C2" fillOpacity={0.25} />
                                 <Tooltip content={<CustomChartTooltip />} />
                               </RadarChart>
                             </ResponsiveContainer>
                           </div>
                         </div>
                       </div>

                       {/* Interactive Response Distribution Timeline (More Data Points!) */}
                       <div className="bg-[#104C64]/2.5 border border-[#104C64]/10 rounded-[32px] p-6 md:p-8 space-y-6">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="space-y-1">
                             <span className="text-[9.5px] bg-white text-[#104C64] border border-[#104C64]/20 font-black px-2.5 py-1 rounded uppercase tracking-widest font-mono">
                               Scatter Density Map
                             </span>
                             <h4 className="text-lg font-black text-stone-850 uppercase tracking-tight">Rater Spread Analysis</h4>
                             <p className="text-xs text-stone-500 max-w-xl leading-relaxed">
                               Select any corporate coordinate to inspect exactly how the 5 distinct peer slots rated. Bubbles represent completed sessions mapped cleanly.
                             </p>
                           </div>

                           {/* Dropdown Selector */}
                           <div className="font-sans">
                             <select
                               value={selectedScatterDim}
                               onChange={(e) => setSelectedScatterDim(e.target.value)}
                               className="px-4 py-3 bg-white border border-stone-250 rounded-xl text-xs font-black uppercase text-stone-850 tracking-wide outline-none shadow-sm cursor-pointer hover:border-stone-400 focus:ring-2 focus:ring-[#104C64]/20"
                             >
                               {dimensionsConfig.map(dim => (
                                 <option key={dim.id} value={dim.id}>{dim.label}</option>
                               ))}
                             </select>
                           </div>
                         </div>

                         {/* Plot Track */}
                         <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-inner space-y-8 select-none">
                           {/* Horizontal Scale Grid */}
                           <div className="relative pt-6 pb-12">
                             {/* Line Tracks */}
                             <div className="absolute left-4 right-4 top-10 h-1.5 bg-stone-100 rounded-full border border-stone-200/50" />
                             
                             {/* Major Ticks */}
                             {[1.0, 2.0, 3.0, 4.0, 5.0].map((tick) => {
                               const leftPct = ((tick - 1) / 4) * 100;
                               return (
                                 <div key={tick} className="absolute top-7 flex flex-col items-center" style={{ left: `calc(${leftPct}% - 14px)`, width: '28px' }}>
                                   <div className="w-1 h-6 bg-stone-300 rounded" />
                                   <span className="text-[10px] font-black font-mono text-stone-400 mt-1">{tick.toFixed(1)}</span>
                                 </div>
                               );
                             })}

                             {/* Team Member Plot Nodes */}
                             {teamMembersData.map((member, idx) => {
                               const rawScore = getIndividualScore(member, selectedScatterDim);
                               const leftPct = ((rawScore - 1) / 4) * 100;
                               const isLeader = member.roleKey === 'above';

                               return (
                                 <div 
                                   key={member.uid || member.id || idx}
                                   className="absolute top-2 transition-all duration-700 mt-2 flex flex-col items-center group/node"
                                   style={{ left: `calc(${leftPct}% - 16px)`, zIndex: 10 + idx }}
                                 >
                                   <div 
                                     className={`w-7 h-7 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-md border-2 border-white transition-all transform hover:scale-130 ${
                                       isLeader ? 'bg-[#104C64]' : 'bg-[#41B1C2]'
                                     }`}
                                     title={`${member.name} (${member.role}): ${rawScore}`}
                                   >
                                     {(member.name || '').substring(0,2).toUpperCase()}
                                   </div>
                                    
                                   {/* Mini vertical link */}
                                   <div className="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover/node:bg-[#104C64] transition-colors mt-1" />

                                   {/* Name info popping down */}
                                   <div className="opacity-0 group-hover/node:opacity-100 transition-opacity absolute top-12 whitespace-nowrap bg-stone-900 text-white text-[8.5px] px-2.5 py-1 rounded-md shadow-lg pointer-events-none flex flex-col items-center gap-0.5">
                                     <span className="font-extrabold">{member.name}</span>
                                     <span className="text-stone-300 text-[7px] uppercase font-mono">{member.role} — Index {rawScore}</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>

                           <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200 text-[10px] uppercase font-mono">
                             <div className="flex items-center gap-4">
                               <div className="flex items-center gap-1.5">
                                 <span className="w-3 h-3 rounded-full bg-[#104C64]" />
                                 <span className="text-stone-600 font-extrabold">Executive Raters (Above)</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                 <span className="w-3 h-3 rounded-full bg-[#41B1C2]" />
                                 <span className="text-stone-600 font-extrabold">Operational Staff (Below)</span>
                               </div>
                             </div>
                             <span className="text-[#104C64] font-black">Hover elements to reveal individual rater profiles.</span>
                           </div>
                         </div>
                       </div>

                       {/* Diagnostic Quadrant Map (2x2 focus matrix) */}
                       <div className="space-y-6">
                         <div className="border-b border-stone-200 pb-3 flex justify-between items-end">
                           <h3 className="text-[11px] font-black text-[#104C64] uppercase tracking-widest font-sans">Corporate Alignment Focus Matrix</h3>
                           <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Statistical 2x2 Quadrant Map</span>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                           {/* Quadrant A: Systemic Hotspots */}
                           <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                             <div className="space-y-2">
                               <div className="flex justify-between items-center">
                                 <span className="text-[9px] font-black text-red-700 bg-red-100 px-3 py-1 rounded-full uppercase tracking-widest block font-mono">QUADRANT ALPHA</span>
                                 <span className="text-xs font-black text-red-650 font-mono">Severe Splits (Δ ≥ 1.2)</span>
                               </div>
                               <h4 className="text-base font-black text-stone-850 uppercase tracking-tight">Active Hotspots</h4>
                               <p className="text-[11px] text-stone-500 leading-normal font-medium">Critical perception divides. Leadership claims alignment, while staff trace operational friction.</p>
                             </div>
                             
                             <div className="space-y-2 pt-2">
                               {quadrantHotspots.length === 0 ? (
                                 <span className="text-stone-400 text-xs italic">Clear and aligned agreement! No severe Hotspots located.</span>
                               ) : (
                                 <div className="flex flex-wrap gap-2">
                                   {quadrantHotspots.map(dim => (
                                     <button
                                       key={dim.id}
                                       onClick={() => {
                                         setExpandedConsolidationDims(prev => ({ ...prev, [dim.id]: true }));
                                         const el = document.getElementById(`dim-card-${dim.id}`);
                                         if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                       }}
                                       className="px-3 py-2 bg-white hover:bg-red-100/50 border border-red-200 text-red-800 text-[10px] font-black tracking-tight rounded-xl transition-all cursor-pointer shadow-sm text-left uppercase font-mono"
                                     >
                                       {dim.label.split('.')[1] || dim.label}
                                     </button>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>

                           {/* Quadrant B: Synergy Strongholds */}
                           <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                             <div className="space-y-2">
                               <div className="flex justify-between items-center">
                                 <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-widest block font-mono">QUADRANT BETA</span>
                                 <span className="text-xs font-black text-emerald-700 font-mono">High Consensus & Scores</span>
                               </div>
                               <h4 className="text-base font-black text-stone-850 uppercase tracking-tight">Consensus Strongholds</h4>
                               <p className="text-[11px] text-stone-500 leading-normal font-medium">Synergistic agreement. Leaders and staff consensus confirm optimal operation and active execution.</p>
                             </div>

                             <div className="space-y-2 pt-2">
                               {quadrantTriumphs.length === 0 ? (
                                 <span className="text-stone-400 text-xs italic">None documented in current configuration index.</span>
                               ) : (
                                 <div className="flex flex-wrap gap-2">
                                   {quadrantTriumphs.map(dim => (
                                     <button
                                       key={dim.id}
                                       onClick={() => {
                                         setExpandedConsolidationDims(prev => ({ ...prev, [dim.id]: true }));
                                         const el = document.getElementById(`dim-card-${dim.id}`);
                                         if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                       }}
                                       className="px-3 py-2 bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-805 text-[10px] font-black tracking-tight rounded-xl transition-all cursor-pointer shadow-sm text-left uppercase font-mono"
                                     >
                                       {dim.label.split('.')[1] || dim.label}
                                     </button>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>

                           {/* Quadrant C: Operational Blindspots */}
                           <div className="bg-stone-100 border border-stone-250 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                             <div className="space-y-2">
                               <div className="flex justify-between items-center">
                                 <span className="text-[9px] font-black text-stone-500 bg-stone-200 px-3 py-1 rounded-full uppercase tracking-widest block font-mono">QUADRANT GAMMA</span>
                                 <span className="text-xs font-black text-stone-600 font-mono">Aligned, Low Performance</span>
                               </div>
                               <h4 className="text-base font-black text-stone-850 uppercase tracking-tight">Systemic Blindspots</h4>
                               <p className="text-[11px] text-stone-500 leading-normal font-medium">Coaligned failures. Both hierarchies agree that system output is lacking but have stable expectations.</p>
                             </div>

                             <div className="space-y-2 pt-2">
                               {quadrantDeficits.length === 0 ? (
                                 <span className="text-stone-400 text-xs italic">Optimal. No coaligned deficits located.</span>
                               ) : (
                                 <div className="flex flex-wrap gap-2">
                                   {quadrantDeficits.map(dim => (
                                     <button
                                       key={dim.id}
                                       onClick={() => {
                                         setExpandedConsolidationDims(prev => ({ ...prev, [dim.id]: true }));
                                         const el = document.getElementById(`dim-card-${dim.id}`);
                                         if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                       }}
                                       className="px-3 py-2 bg-white hover:bg-stone-200/50 border border-stone-250 text-stone-800 text-[10px] font-black tracking-tight rounded-xl transition-all cursor-pointer shadow-sm text-left uppercase font-mono"
                                     >
                                       {dim.label.split('.')[1] || dim.label}
                                     </button>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>

                           {/* Quadrant D: Emerging Alignment */}
                           <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                             <div className="space-y-2">
                               <div className="flex justify-between items-center">
                                 <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full uppercase tracking-widest block font-mono">QUADRANT DELTA</span>
                                 <span className="text-xs font-black text-amber-700 font-mono">Transition Gaps (Δ 0.7-1.2)</span>
                               </div>
                               <h4 className="text-base font-black text-stone-850 uppercase tracking-tight">Emerging Divergence</h4>
                               <p className="text-[11px] text-stone-500 leading-normal font-medium font-sans">Evolving alignment indices. Early indicators of potential splits or emerging system trust pivots.</p>
                             </div>

                             <div className="space-y-2 pt-2">
                               {quadrantDivergence.length === 0 ? (
                                 <span className="text-stone-400 text-xs italic">No elements matching this category quadrant range.</span>
                               ) : (
                                 <div className="flex flex-wrap gap-2 animate-fadeIn">
                                   {quadrantDivergence.map(dim => (
                                     <button
                                       key={dim.id}
                                       onClick={() => {
                                         setExpandedConsolidationDims(prev => ({ ...prev, [dim.id]: true }));
                                         const el = document.getElementById(`dim-card-${dim.id}`);
                                         if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                       }}
                                       className="px-3 py-2 bg-white hover:bg-amber-100/50 border border-amber-250/50 text-amber-800 text-[10px] font-black tracking-tight rounded-xl transition-all cursor-pointer shadow-sm text-left uppercase font-mono"
                                     >
                                       {dim.label.split('.')[1] || dim.label}
                                     </button>
                                   ))}
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       </div>

                       {/* 12 Key Corporate Dimensions */}
                       <div className="space-y-6">
                         <div className="flex justify-between items-end border-b border-stone-200 pb-3">
                           <h3 className="text-[11px] font-black text-[#104C64] uppercase tracking-widest font-sans">12 Key Dimensions & Perceptual Splits</h3>
                           <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">Interactive Insights Guide — Click Any Dimension to Expand Playbook</span>
                         </div>

                         <div className="grid grid-cols-1 gap-5">
                           {dimensionsConfig.map((dim) => {
                             const scoreAbove = getDimensionScores(dim.id, 'above');
                             const scoreBelow = getDimensionScores(dim.id, 'below');
                             const scoreCombined = getDimensionScores(dim.id, 'all');
                             
                             const splitDelta = parseFloat(Math.abs(scoreAbove - scoreBelow).toFixed(1));
                             const isSevereSplit = splitDelta >= 1.2;
                             const isExpanded = !!expandedConsolidationDims[dim.id];

                             return (
                               <div 
                                 key={dim.id} 
                                 id={`dim-card-${dim.id}`}
                                 className={`p-6 md:p-8 bg-white border rounded-[30px] shadow-sm transition-all relative overflow-hidden cursor-pointer select-none ${
                                   isExpanded ? 'border-stone-400 shadow-md bg-stone-50/20' : 'border-stone-200 hover:border-stone-300'
                                 }`}
                                 onClick={() => setExpandedConsolidationDims(prev => ({ ...prev, [dim.id]: !prev[dim.id] }))}
                               >
                                 <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                                   {/* Heading info */}
                                   <div className="space-y-1.5 lg:w-1/3">
                                     <div className="flex items-center gap-2">
                                       <span className="text-[8px] bg-stone-100 text-stone-500 font-extrabold px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                                         {dim.tool}
                                       </span>
                                       {isSevereSplit ? (
                                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-700 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-100 animate-pulse">
                                           ⚠️ SEVERE SPLIT (Delta: {splitDelta})
                                         </span>
                                       ) : (
                                         <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                                           ✓ CONGRUENT
                                         </span>
                                       )}
                                     </div>
                                     <h4 className="text-base font-black text-stone-850 uppercase tracking-tight leading-tight pt-1 flex items-center gap-2">
                                       {dim.label}
                                     </h4>
                                     <p className="text-[11.5px] text-stone-500 leading-normal font-medium">{dim.sub}</p>
                                   </div>

                                   {/* Splits Simplified Data Visualization */}
                                   <div className="flex-1 space-y-4">
                                     {/* Two simple progress bars side-by-side */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-250/20 shadow-inner">
                                       {/* Staff Score Bar */}
                                       <div className="space-y-1 bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                                         <div className="flex justify-between items-center text-xs">
                                           <span className="text-[#41B1C2] font-black uppercase tracking-wider text-[9px] flex items-center gap-1.5 font-sans">
                                             <span className="w-1.5 h-1.5 rounded-full bg-[#41B1C2]" />
                                             Staff Reality
                                           </span>
                                           <span className="font-extrabold text-stone-800 text-[11px] font-mono">{scoreBelow} / 5.0</span>
                                         </div>
                                         <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden mt-1">
                                           <div className="h-full bg-[#41B1C2] rounded-full transition-all duration-500" style={{ width: `${(scoreBelow / 5) * 100}%` }} />
                                         </div>
                                       </div>

                                       {/* Leaders Score Bar */}
                                       <div className="space-y-1 bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                                         <div className="flex justify-between items-center text-xs">
                                           <span className="text-[#104C64] font-black uppercase tracking-wider text-[9px] flex items-center gap-1.5 font-sans">
                                             <span className="w-1.5 h-1.5 rounded-full bg-[#104C64]" />
                                             Leaders Perception
                                           </span>
                                           <span className="font-extrabold text-stone-800 text-[11px] font-mono">{scoreAbove} / 5.0</span>
                                         </div>
                                         <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden mt-1">
                                           <div className="h-full bg-[#104C64] rounded-full transition-all duration-500" style={{ width: `${(scoreAbove / 5) * 100}%` }} />
                                         </div>
                                       </div>
                                     </div>

                                     <div className="flex justify-between items-center pt-1 text-[10px] uppercase font-mono tracking-wider font-extrabold text-stone-400">
                                       <span>Team Combined Index: <strong className="text-stone-800 font-sans">{scoreCombined} / 5.0</strong></span>
                                       <span className="text-[#104C64] flex items-center gap-1 hover:underline">
                                         {isExpanded ? 'Collapse playbook ▲' : 'Expand detailed playbook ▼'}
                                       </span>
                                     </div>
                                   </div>
                                 </div>

                                 {/* Expanded Deep Insights Block */}
                                 {isExpanded && (
                                   <div 
                                     className="pt-6 mt-6 border-t border-stone-200/80 space-y-5 animate-slideDown"
                                     onClick={(e) => e.stopPropagation()} // stop parent toggle
                                   >
                                     <div className="bg-[#41B1C2]/5 text-stone-900 p-5 rounded-2xl text-xs leading-relaxed border border-[#41B1C2]/15 flex gap-3 shadow-sm">
                                       <HelpCircle className="w-5 h-5 text-[#41B1C2] shrink-0 mt-0.5 stroke-[2]" />
                                       <div className="space-y-0.5">
                                         <strong className="text-[#104C64] block font-sans uppercase tracking-widest text-[9.5px]">🔍 Diagnostic Interpretation</strong>
                                         <p className="text-stone-700 leading-relaxed font-sans font-medium">{dim.interpretation}</p>
                                       </div>
                                     </div>
                                     
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                       <div className="bg-[#104C64]/5 border border-[#104C64]/10 p-5 rounded-2xl text-[11.5px] leading-relaxed shadow-sm">
                                         <strong className="text-[#104C64] block font-sans uppercase tracking-wider text-[9px] font-black">💼 Executive Blueprint (Leadership Action)</strong>
                                         <p className="mt-1.5 text-stone-700 leading-relaxed font-medium">{dim.actionAbove}</p>
                                       </div>
                                       <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-2xl text-[11.5px] leading-relaxed shadow-sm">
                                         <strong className="text-emerald-800 block font-sans uppercase tracking-wider text-[9px] font-black">🌱 Operational Playbook (Staff Engagement)</strong>
                                         <p className="mt-1.5 text-stone-700 leading-relaxed font-medium">{dim.actionBelow}</p>
                                       </div>
                                     </div>
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                         </div>
                       </div>

                       {/* Dynamic Realignment Action Hub */}
                       <div className="border-t border-stone-200 pt-8 space-y-6">
                         <div>
                           <h3 className="text-sm font-black text-[#104C64] uppercase tracking-widest font-sans">Strategic Split Realignment Plan</h3>
                           <p className="text-xs text-stone-500 leading-normal max-w-2xl mt-0.5 animate-pulse">
                             Synthesized outputs from team diagnostics indicate high-impact organizational friction. Deploy the following targeted split alignment protocols:
                           </p>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                           <div className="p-6 bg-[#104C64]/5 border border-[#104C64]/10 rounded-[30px] space-y-4 shadow-sm hover:shadow-md transition-all">
                             <div className="flex items-center gap-3">
                               <div className="p-2.5 bg-[#104C64]/10 text-[#104C64] rounded-2xl border border-[#104C64]/20 shrink-0">
                                 <CheckCircle2 className="w-5 h-5 text-[#104C64]" />
                               </div>
                               <div>
                                 <span className="text-[9px] text-[#104C64] font-black uppercase tracking-widest block font-mono">STRAT-A: SAFEHOUSE DIALOGUES</span>
                                 <h4 className="text-xs font-black text-stone-850 uppercase tracking-wide">Anonymity & Alignment Pipelines</h4>
                               </div>
                             </div>
                             <p className="text-xs text-stone-600 leading-relaxed font-sans">
                               Provide a safe-reporting forum where frontline workers verify and discuss if managers' daily actions reflect company codes. Since your team's Perceptual Alignment represents <strong>{alignmentIndex}%</strong> congruence, we recommend focusing your first dialogue on categories with severe scores.
                             </p>
                           </div>

                           <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[30px] space-y-4 shadow-sm hover:shadow-md transition-all">
                             <div className="flex items-center gap-3">
                               <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-2xl border border-amber-500/20 shrink-0">
                                 <Users className="w-5 h-5 text-amber-600" />
                               </div>
                               <div>
                                 <span className="text-[9px] text-amber-700 font-black uppercase tracking-widest block font-mono">STRAT-B: ACTION PLAYBOOK EXECUTION</span>
                                 <h4 className="text-xs font-black text-stone-850 uppercase tracking-wide">Targeted Alignment Playbooks</h4>
                               </div>
                             </div>
                             <p className="text-xs text-stone-600 leading-relaxed font-sans font-medium">
                               {severeSplitCount > 0 ? (
                                 <span>Your team has identified <strong>{severeSplitCount} severe divergence categories</strong> with significant scoring splits. Expand these categories above to deploy their specific blueprints immediately.</span>
                               ) : (
                                 <span>Your team possesses highly congruent alignment across all categories. Hold periodic audits using the operational playbooks above to preserve alignment during intense operations.</span>
                               )}
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                 })()}
               </div>
             ) : (
              <div className="p-12 text-center bg-stone-50 rounded-[40px] border border-dashed border-stone-200 select-none">
                <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h4 className="text-sm font-black text-[#104C64] uppercase tracking-widest">Multi-Rater Consolidation Locked</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed mt-2 font-sans">
                  The Multi-Rater split matrix becomes active once all 5 team profiles complete their diagnostic assessments. Use your registration links to onboard members.
                </p>
              </div>
            )}
          </div>
        ) ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Active Radar Matrix Card */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 relative group overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black text-[#104C64] uppercase tracking-[0.4em]">
                {isEnterprise 
                  ? activeAssessment === 'entValuesAudit'
                    ? 'Values Mapping Coordinate'
                    : activeAssessment === 'entCultureMap'
                      ? 'Culture Map Coordinate'
                      : activeAssessment === 'entPerformanceLink'
                        ? 'Performance Link Coordinate'
                        : activeAssessment === 'entEqDriver'
                          ? 'EQ Driver Coordinate'
                          : activeAssessment === 'entUnifiedReport'
                            ? 'Unified Intelligence Matrix'
                            : 'Corporate Coordinate'
                  : activeAssessment === 'selfDiscovery' 
                    ? 'HumanEdge 3.0 Matrix' 
                    : activeAssessment === 'threeSixty'
                      ? 'BeyondEQ 360° Diagnostic Matrix'
                      : activeAssessment === 'cognitive'
                        ? 'Cognitive Empathy Index'
                        : activeAssessment === 'resiliency'
                          ? 'Relational Resiliency Audit'
                          : 'Introduction to BeyondEQ 3.0'}
              </h2>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
                {isEnterprise 
                  ? 'Enterprise Audit' 
                  : activeAssessment === 'cognitive' || activeAssessment === 'resiliency' 
                    ? 'Upcoming Model' 
                    : '7 Traits Profile'}
              </span>
            </div>

            {userTier === 'free' && activeAssessment === 'threeSixty' ? (
              <div className="h-[400px] w-full flex flex-col items-center justify-center bg-stone-50 rounded-[30px] border border-stone-200/60 p-8 text-center max-w-sm mx-auto my-auto animate-fadeIn select-none">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 border border-amber-200/50 animate-pulse">
                  <Lock className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.2em] mb-2 block">
                  360° Matrix Locked
                </span>
                <p className="text-xs text-stone-500 font-sans leading-relaxed mb-6">
                  Relational 360-degree capability matrix mapping is a Premium feature. Upgrade to unlock and map multi-perspective observer scores.
                </p>
                <button
                  onClick={handleUpgradeToPremium}
                  className="px-6 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-md shadow-[#104C64]/10 cursor-pointer"
                >
                  Unlock 360° Matrix
                </button>
              </div>
            ) : activeAssessment === 'cognitive' || activeAssessment === 'resiliency' ? (
              <div className="h-[400px] w-full flex flex-col items-center justify-center bg-stone-50 rounded-[30px] border border-stone-200/60 p-8 text-center max-w-sm mx-auto my-auto animate-fadeIn select-none">
                <div className="w-12 h-12 rounded-2xl bg-[#c4a882]/10 flex items-center justify-center text-[#c4a882] mb-4 border border-[#c4a882]/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.2em] mb-2 block">Upcoming Assessment</span>
                <p className="text-xs text-stone-550 font-sans leading-relaxed mb-6">
                  The {activeAssessment === 'cognitive' ? 'Cognitive Empathy Index' : 'Relational Resiliency Audit'} is scheduled for release in Q3/Q4 2026. Pre-register below to lock in early observer queues.
                </p>
                <button
                  onClick={() => alert(`Pre-registered successfully for the ${activeAssessment === 'cognitive' ? 'Cognitive Empathy Index' : 'Relational Resiliency Audit'}! We will notify you once development compiles.`)}
                  className="px-6 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-md shadow-[#104C64]/10 cursor-pointer"
                >
                  Pre-Register Now
                </button>
              </div>
            ) : !isCurrentSelectionCompleted ? (
              isEnterprise ? (
                activeAssessment === 'entUnifiedReport' ? (
                  <div className="min-h-[400px] w-full flex flex-col items-center justify-center bg-gradient-to-b from-stone-50/80 to-stone-50 rounded-[30px] border border-stone-200/60 p-8 text-center animate-fadeIn select-none">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4 border border-amber-200/50">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.25em] mb-2 block">
                      Assessment 5 Dynamic Unified Report Compiled!
                    </span>
                    <p className="text-xs text-stone-600 font-sans leading-relaxed mb-6 max-w-sm">
                      {(() => {
                        const actualCompletedAudits = Object.entries(profile?.enterpriseAssessmentsCompleted || {})
                          .filter(([key, val]) => (key === '1' || key === '2' || key === '3' || key === '4') && val)
                          .length;

                        return actualCompletedAudits === 4
                          ? "Congratulations! Your core Audits are complete. Your Master Unified Executive intelligence matrix has compiled with deep diagnostic indices."
                          : `Core audits completed: ${actualCompletedAudits} of 4. Your draft executive insights are auto-generating. Complete audits anytime.`;
                      })()}
                    </p>
                    {profile?.enterpriseInvitedBy ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-950 p-5 rounded-2xl text-[11px] max-w-sm font-sans flex items-center gap-3 stroke-[2] shadow-sm">
                        <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                        <span className="text-left leading-normal font-medium">The comprehensive unified report is pending activation by your primary account administrator. Please contact your company administrator to unlock this workspace.</span>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-5 rounded-2xl text-[11px] max-w-sm font-sans flex flex-col items-center gap-2 shadow-sm mx-auto">
                        <span className="font-bold uppercase text-[9px] tracking-widest text-emerald-700 font-mono">FREE BEYONDEQ DELIVERABLE</span>
                        <p className="leading-normal font-semibold">The Assessment 5 Unified Report is now part of the BeyondEQ Free Tier! Simply complete all 4 preceding Core Audits above to compile and view your master blueprint.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full flex flex-col bg-stone-50/50 rounded-[30px] border border-stone-200/60 p-6 md:p-8 animate-fadeIn max-h-[480px] overflow-y-auto w-full">
                    <div className="space-y-1 mb-6 border-b border-stone-200 pb-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#41B1C2]">Leadership capability audit</span>
                      <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">
                        {activeAssessment === 'entValuesAudit' ? '1. Values Audit' :
                         activeAssessment === 'entCultureMap' ? '2. Culture Map' :
                         activeAssessment === 'entPerformanceLink' ? '3. Performance Link' :
                         '4. EQ Driver'}
                      </h3>
                      <p className="text-[10px] text-stone-500 font-sans">Rate your consensus from 1 (Never) to 5 (Always) for each behavior.</p>
                    </div>

                    <div className="space-y-5 flex-1 pr-2">
                      {((activeAssessment === 'entValuesAudit' ? [
                        "Senior leaders make decisions that visibly reflect the organisation's stated values — even when it is costly.",
                        "Leadership acknowledges mistakes openly and models accountability without defensiveness.",
                        "People at all levels feel genuinely safe raising concerns or disagreeing with leadership.",
                        "Accountability applies equally across hierarchy — senior and junior held to same standard.",
                        "Significant organisational decisions are communicated honestly to those affected."
                      ] : activeAssessment === 'entCultureMap' ? [
                        "People speak about the mission with genuine energy — not performance.",
                        "Meetings produce decisions that do not get implemented — repeatedly.",
                        "The real decision-making happens outside formal meetings in private channels.",
                        "Certain people's behaviours are accommodated or explained away patterns.",
                        "Suggestions for structural change meet disproportionate resistance."
                      ] : activeAssessment === 'entPerformanceLink' ? [
                        "Programme outcomes for communities served are consistently meeting or exceeding stated targets.",
                        "Performance issues are addressed directly and early — not ignored or avoided.",
                        "Decisions are made with sufficient information — not under pressure to appear decisive.",
                        "The organisation is not dependent on one person, one funder, or one programme.",
                        "Staff at all levels feel empowered to raise signals about what is changing in the environment."
                      ] : [
                        "We hear what is said, unsaid, and intended (Observing and Listening).",
                        "We manage our internal state so it never compromises strategic intent (Self Regulation).",
                        "We engage with difficulty in ways that protect relationships and achieve objectives (Conflict Navigation).",
                        "We identify and address recurring patterns of behavior across time and context (Pattern Recognition).",
                        "We connect immediate actions to long-term outcomes (Strategic Thinking)."
                      ])).map((qText, idx) => (
                        <div key={idx} className="space-y-2 pb-3 border-b border-stone-100 last:border-b-0">
                          <h4 className="text-[11px] text-stone-700 font-sans font-medium leading-relaxed">
                            {idx + 1}. {qText}
                          </h4>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((val) => {
                              const isSelected = enterpriseAnswers[`${activeAssessment}_${idx}`] === String(val);
                              return (
                                <button
                                  key={val}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEnterpriseAnswers(prev => ({
                                      ...prev,
                                      [`${activeAssessment}_${idx}`]: String(val)
                                    }));
                                  }}
                                  className={`w-8 h-8 rounded-full text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                                    isSelected 
                                      ? 'bg-[#104C64] text-white' 
                                      : 'bg-white text-stone-500 hover:bg-stone-100 border border-stone-200'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-stone-200 mt-6 flex justify-end">
                      {Object.keys(enterpriseAnswers).filter(k => k.startsWith(activeAssessment)).length === 5 ? (
                        <button
                          onClick={() => {
                            const stepId = activeAssessment === 'entValuesAudit' ? '1' :
                                           activeAssessment === 'entCultureMap' ? '2' :
                                           activeAssessment === 'entPerformanceLink' ? '3' : '4';
                            handleSubmitEnterpriseAssessment(stepId);
                          }}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase tracking-widest font-black rounded-xl cursor-pointer transition-all active:scale-95 shadow-md flex items-center gap-2"
                        >
                          Submit Audit Responses
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-6 py-3 bg-stone-200 text-stone-400 text-[10px] uppercase tracking-widest font-bold rounded-xl cursor-not-allowed"
                        >
                          Complete All 5 Questions ({Object.keys(enterpriseAnswers).filter(k => k.startsWith(activeAssessment)).length} / 5)
                        </button>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="h-[400px] w-full flex flex-col items-center justify-center bg-stone-50 rounded-[30px] border border-stone-200/60 p-8 text-center max-w-sm mx-auto my-auto animate-fadeIn select-none">
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-4 border border-stone-200/50">
                    <Lock className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <span className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.2em] mb-2 block">
                    {activeAssessment === 'threeSixty' ? '360° Matrix Locked' : 'Matrix Locked'}
                  </span>
                  <p className="text-xs text-stone-500 font-sans leading-relaxed mb-6">
                    {activeAssessment === 'threeSixty' 
                      ? 'The Relational 360-degree matrix is deactivated. Complete the corresponding observer loops below to unlock multi-perspective scores.'
                      : 'This capability matrix is currently deactivated. Complete the corresponding assessment to unlock and map your metrics on this coordinate plane.'}
                  </p>
                  {activeAssessment === 'threeSixty' ? (
                    isThreeSixtySelfCompleted ? (
                      <button
                        onClick={handleSimulateThreeSixty}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                      >
                        Receive Observer Feedbacks
                      </button>
                    ) : (
                      <Link
                        to="/assessment"
                        state={{ type: '360', from360: true }}
                        className="px-6 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-md shadow-[#104C64]/10 cursor-pointer"
                      >
                        Give Self-Assessment First
                      </Link>
                    )
                  ) : (
                    <Link
                      to="/assessment"
                      className="px-6 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-black uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-md shadow-[#104C64]/10 cursor-pointer"
                    >
                      Start Assessment
                    </Link>
                  )}
                </div>
              )
            ) : (
              <div className="h-[400px] w-full transition-all duration-1000">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={scoresData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#374151', fontSize: 9, fontWeight: 'bold' }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Coordinate"
                      dataKey="A"
                      stroke="#104C64"
                      fill="#104C64"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Contextual dynamic cards block per selection */}
          <div className="space-y-12">

            {/* A. Enterprise Values Audit Coordinate Insights */}
            {activeAssessment === 'entValuesAudit' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <EnterpriseProgressTracker 
                  profile={profile} 
                  activeAssessment={activeAssessment} 
                  setActiveAssessment={setActiveAssessment} 
                />

                <div className="bg-white p-8 md:p-10 rounded-[35px] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">Coordinate Insights</span>
                      <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Values Alignment Indices</h3>
                    </div>
                    <Shield className="w-5 h-5 text-[#104C64]" />
                  </div>
                  
                  <p className="text-xs text-stone-600 font-sans leading-relaxed text-left">
                    This coordinate maps the alignment between your organization's <strong>declared value pillars</strong> and <strong>observed behaviors</strong> across the hierarchy. High psychological safety directly reduces standard compliance friction.
                  </p>

                  <div className="space-y-4 text-left">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Key Behavior Pillar: Leadership Composure</span>
                      <p className="text-xs text-stone-600 leading-normal font-sans">
                        Leaders serve as the primary embodiment of core principles. Discrepancies between executive privilege and junior standards represent the leading source of team fatigue.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Current Audit Response Trend</span>
                      <div className="text-xs text-[#104C64] font-semibold leading-normal font-sans mt-1">
                        {profile?.enterpriseAssessmentsCompleted?.['1'] ? (
                          <div className="flex items-start gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 mt-1.5 shrink-0" />
                            <span>
                              Core data registered. Calculated baseline coordinate maps congruent leadership models.
                              {(profile as any)?.enterpriseAnswers_1 && (
                                <span className="block mt-1 font-mono text-[10px] text-stone-500 font-bold">
                                  Your completed audit average rating: {((profile as any).enterpriseAnswers_1.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)} / 5.0
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1.5 shrink-0" />
                            Awaiting response submissions. Complete the corresponding 5-question audit on the left.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 text-left">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-3">Strategic Action Trajectory</span>
                    <ul className="space-y-2 text-xs text-stone-600 leading-relaxed list-disc list-inside font-sans pl-1">
                      <li>Build anonymized micro-feedback avenues to capture values deviations early.</li>
                      <li>Calibrate executive response composure under stressful regulatory shifts.</li>
                      <li>Incorporate values representation targets inside quarterly corporate score-cards.</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* B. Enterprise Culture Map Coordinate Insights */}
            {activeAssessment === 'entCultureMap' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <EnterpriseProgressTracker 
                  profile={profile} 
                  activeAssessment={activeAssessment} 
                  setActiveAssessment={setActiveAssessment} 
                />

                <div className="bg-white p-8 md:p-10 rounded-[35px] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">Coordinate Insights</span>
                      <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Dynamic Culture Friction</h3>
                    </div>
                    <Compass className="w-5 h-5 text-[#104C64]" />
                  </div>
                  
                  <p className="text-xs text-stone-600 font-sans leading-relaxed text-left">
                    Cultural parameters map unwritten norms, shadow networks, and friction points across departments. This coordinate reveals vulnerability thresholds and network performance metrics.
                  </p>

                  <div className="space-y-4 text-left font-sans">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Key Behavior Pillar: Invisible Networks</span>
                      <p className="text-xs text-stone-600 leading-normal">
                        Formal hierarchies are consistently bypassed by unwritten communication channels. Identifying shadow nodes protects strategic projects from quiet resistance.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Current Audit Response Trend</span>
                      <div className="text-xs text-[#104C64] font-semibold leading-normal font-sans mt-1">
                        {profile?.enterpriseAssessmentsCompleted?.['2'] ? (
                          <div className="flex items-start gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 mt-1.5 shrink-0" />
                            <span>
                              Cultural blueprint submitted successfully. Active alignment indexes calculated.
                              {(profile as any)?.enterpriseAnswers_2 && (
                                <span className="block mt-1 font-mono text-[10px] text-stone-500 font-bold">
                                  Your completed audit average rating: {((profile as any).enterpriseAnswers_2.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)} / 5.0
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1.5 shrink-0" />
                            Responses pending. Lived-norms baseline loaded in workspace.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 text-left">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-3">Strategic Action Trajectory</span>
                    <ul className="space-y-2 text-xs text-stone-600 leading-relaxed list-disc list-inside font-sans pl-1">
                      <li>Launch cross-functional working sessions to bridge departmental silos.</li>
                      <li>Reward vulnerability during formal retrospectives to dismantle toxic defensiveness patterns.</li>
                      <li>Track and resolve high non-implementation rates on recurring meeting agendas.</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* C. Enterprise Performance Link Coordinate Insights */}
            {activeAssessment === 'entPerformanceLink' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <EnterpriseProgressTracker 
                  profile={profile} 
                  activeAssessment={activeAssessment} 
                  setActiveAssessment={setActiveAssessment} 
                />

                <div className="bg-white p-8 md:p-10 rounded-[35px] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">Coordinate Insights</span>
                      <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Velocity &amp; Adaptive Capacity</h3>
                    </div>
                    <Activity className="w-5 h-5 text-[#104C64]" />
                  </div>
                  
                  <p className="text-xs text-stone-600 font-sans leading-relaxed text-left">
                    This dynamic links high-performance outcomes (projects compiled, goals hit) to foundational psychological safety. True organizational velocity is sustained, not driven.
                  </p>

                  <div className="space-y-4 text-left font-sans">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Key Behavior Pillar: Contextual Foresight</span>
                      <p className="text-xs text-stone-600 leading-normal font-sans">
                        Friction and delays in capturing market or organizational signals indicate a lack of psychological safety, where members keep issues secret to keep appearances green.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 font-sans">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Current Audit Response Trend</span>
                      <div className="text-xs text-[#104C64] font-semibold leading-normal font-sans mt-1">
                        {profile?.enterpriseAssessmentsCompleted?.['3'] ? (
                          <div className="flex items-start gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 mt-1.5 shrink-0" />
                            <span>
                              Adaptive execution performance indexes active. Sustainability verified.
                              {(profile as any)?.enterpriseAnswers_3 && (
                                <span className="block mt-1 font-mono text-[10px] text-stone-500 font-bold">
                                  Your completed audit average rating: {((profile as any).enterpriseAnswers_3.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)} / 5.0
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1.5 shrink-0" />
                            Diagnostic responses compiled: 0 of 5. Complete current criteria on left first.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 text-left font-sans">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-3 font-mono">Strategic Action Trajectory</span>
                    <ul className="space-y-2 text-xs text-stone-600 leading-relaxed list-disc list-inside font-sans pl-1">
                      <li>Connect target goals directly to sustainable capability profiles.</li>
                      <li>Remove critical dependency lines by training and delegating decision courage.</li>
                      <li>Introduce regular red-team simulations to verify operational adaptability.</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* D. Enterprise EQ Driver Coordinate Insights */}
            {activeAssessment === 'entEqDriver' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <EnterpriseProgressTracker 
                  profile={profile} 
                  activeAssessment={activeAssessment} 
                  setActiveAssessment={setActiveAssessment} 
                />

                <div className="bg-white p-8 md:p-10 rounded-[35px] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">Coordinate Insights</span>
                      <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Executive Emotional Drivers</h3>
                    </div>
                    <Brain className="w-5 h-5 text-[#104C64]" />
                  </div>
                  
                  <p className="text-xs text-stone-600 font-sans leading-relaxed text-left">
                    This coordinate maps the underlying neurological and EQ capabilities of leadership. Self regulation, active listening depth, and conflict calibration form the core operational pillars.
                  </p>

                  <div className="space-y-4 text-left">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Key Behavior Pillar: Active Regulation Sprints</span>
                      <p className="text-xs text-stone-600 leading-normal font-sans">
                        Under intensive strategic friction, reactive patterns are contagious. Committing to deliberate regulation pauses preserves cognitive composure and ensures strategic goals hold.
                      </p>
                    </div>

                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Current Audit Response Trend</span>
                      <div className="text-xs text-[#104C64] font-semibold leading-normal font-sans mt-1">
                        {profile?.enterpriseAssessmentsCompleted?.['4'] ? (
                          <div className="flex items-start gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5 mt-1.5 shrink-0" />
                            <span>
                              EQ Drivers catalogued. Your group average scores are synchronized with live metrics.
                              {(profile as any)?.enterpriseAnswers_4 && (
                                <span className="block mt-1 font-mono text-[10px] text-stone-500 font-bold">
                                  Your completed audit average rating: {((profile as any).enterpriseAnswers_4.reduce((a: number, b: number) => a + b, 0) / 5).toFixed(1)} / 5.0
                                </span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1.5 shrink-0" />
                            Awaiting responses. Complete the 5 key questions on the left screen.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 text-left">
                    <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block mb-3">Strategic Action Trajectory</span>
                    <ul className="space-y-2 text-xs text-stone-600 leading-relaxed list-disc list-inside font-sans pl-1">
                      <li>Model deep active listening, capturing both verbal statements and unspoken signals.</li>
                      <li>Hardcode systematic 3-Second regulation parameters inside administrative circles.</li>
                      <li>Construct a team EQ playbook for conflict de-escalation benchmarks.</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* E. Enterprise Unified Report Preview Insights */}
            {activeAssessment === 'entUnifiedReport' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <EnterpriseProgressTracker 
                  profile={profile} 
                  activeAssessment={activeAssessment} 
                  setActiveAssessment={setActiveAssessment} 
                />

                <div className="bg-white p-8 md:p-10 rounded-[35px] shadow-sm border border-gray-100 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">Coordinate Insights</span>
                      <h3 className="text-sm font-black text-[#104C64] uppercase tracking-wider">Executive Synthesis Status</h3>
                    </div>
                    <Sparkles className="w-5 h-5 text-[#104C64]" />
                  </div>
                  
                  <p className="text-xs text-stone-600 font-sans leading-relaxed text-left">
                    This matrix unifies coordinates from all preceding steps into a master corporate intelligence map. True alignment compiles perfectly when all 4 core diagnostics are completed.
                  </p>

                  <div className="space-y-4 text-left">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-stone-450 block mb-1">Consolidated Executive IQ</span>
                      <p className="text-xs text-stone-600 leading-normal font-sans">
                        Compiling values accountability alignment with cultural transparency indices defines high-conviction decision capacity.
                      </p>
                    </div>

                    <div className="p-4 bg-[#104C64]/5 rounded-2xl border border-[#104C64]/15 font-sans">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#104C64] block mb-1">Blueprint Readiness</span>
                      <p className="text-xs text-stone-600 leading-normal font-sans">
                        {(() => {
                          const completedCount = [
                            profile?.enterpriseAssessmentsCompleted?.['1'],
                            profile?.enterpriseAssessmentsCompleted?.['2'],
                            profile?.enterpriseAssessmentsCompleted?.['3'],
                            profile?.enterpriseAssessmentsCompleted?.['4']
                          ].filter(Boolean).length;
                          
                          if (completedCount === 4) {
                            return "Congratulations! Your core audits are complete. Click the main view buttons to access your print-ready Master Report!";
                          } else {
                            return `Completed: ${completedCount} of 4 core audits. Please complete remaining indices to compile executive-level strategic blueprint.`;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1. Self-Discovery Context View */}
            {activeAssessment === 'selfDiscovery' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 flex flex-col space-y-6"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-black text-[#104C64] uppercase tracking-[0.4em]">Surfaced Observations</h3>
                  <Sparkles className="w-4 h-4 text-[#c4a882]" />
                </div>
                
                {isSelfDiscoveryCompleted && displayedObservations.length > 0 ? (
                  <div className="space-y-6 max-h-[360px] overflow-y-auto pr-2">
                    {displayedObservations.map((obs: any, idx: number) => (
                      <div key={idx} className="space-y-1 border-l-2 border-l-[#c4a882] pl-4">
                        <h4 className="text-xs font-bold text-[#104C64] uppercase tracking-wide">{obs.title}</h4>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-sans">{obs.body}</p>
                        {obs.note && <div className="text-[9px] text-[#5db89a] font-sans italic">{obs.note}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 bg-stone-50 border border-stone-200/50 rounded-2xl flex items-center justify-center text-stone-300">
                      <Lock className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-xs text-stone-400 font-sans max-w-sm">
                      Observations will surface once your HumanEdge 3.0 Self-Discovery questionnaire responses are submitted.
                    </p>
                    <Link
                      to="/assessment"
                      className="px-5 py-2.5 bg-[#104C64] hover:bg-[#0D3E52] text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all"
                    >
                      Take Questionnaire
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. BeyondEQ 360° Diagnostic Context View */}
            {activeAssessment === 'threeSixty' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 space-y-6"
              >
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-black text-[#104C64] uppercase tracking-[0.4em]">360° Diagnostic</h3>
                    {userTier === 'premium' && (profile as any)?.premiumPromoActive !== true ? (
                      isThreeSixtySelfCompleted ? (
                        <span className={`text-[9px] font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${
                          isThreeSixtyCompleted 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                            : 'bg-amber-50 text-amber-700 border-amber-250'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${isThreeSixtyCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          {isThreeSixtyCompleted ? 'Consolidated Feedback Loop' : 'Active Feedback Loop'}
                        </span>
                      ) : (
                        <span className="text-[9px] bg-stone-100 text-stone-500 font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Lock className="w-2.5 h-2.5" />
                          Locked
                        </span>
                      )
                    ) : (
                      <span className="text-[9px] bg-rose-50 text-rose-700 font-bold border border-rose-200 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-2.5 h-2.5" />
                        {(profile as any)?.premiumPromoActive === true ? 'Streak Promo: 360° Exclusive' : 'Premium Protocol'}
                      </span>
                    )}
                  </div>
                  <UserCheck className={`w-4 h-4 ${isThreeSixtySelfCompleted && userTier === 'premium' && (profile as any)?.premiumPromoActive !== true ? 'text-[#104C64]' : 'text-stone-300'}`} />
                </div>

                {userTier === 'free' ? (
                  <div className="py-8 text-center space-y-6 max-w-xl mx-auto">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto border border-amber-200/50">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-base font-black text-[#104C64] uppercase tracking-wider">
                        360° Diagnostics is Premium
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed font-sans mt-0.5">
                        Consolidate deep multidimensional reviews from colleagues, bosses, mentors, and direct reports to form an objective capability matrix on our specialized coordinate system.
                      </p>
                    </div>
                    <button 
                      onClick={handleUpgradeToPremium}
                      className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-amber-500/10 cursor-pointer border border-amber-400/20"
                    >
                      ★ Upgrade to Premium & Unlock
                    </button>
                  </div>
                ) : isThreeSixtySelfCompleted ? (
                  <div className="space-y-6">
                    <p className="text-stone-600 text-xs font-sans leading-relaxed">
                      {isThreeSixtyCompleted
                        ? 'Operational inputs from all your colleagues and managers have been compiled into this cohesive 360-degree dashboard.'
                        : 'Invitations compiling behavioral metrics have been successfully dispatched. Monitor progress below or simulate feedback to test.'}
                    </p>

                     {!isThreeSixtyCompleted && (
                       <div className="p-4 bg-emerald-50/70 border border-emerald-200/50 rounded-2xl text-[11.5px] text-emerald-950 font-sans leading-relaxed space-y-1 animate-fadeIn font-sans">
                         <p className="font-bold flex items-center gap-1 text-emerald-900 font-sans">
                           <span>✉️</span> Outbound Email Dispatch Active
                         </p>
                         <p className="opacity-90 font-sans">Your automated invitation email delivery system is fully configured and live via our secure SMTP relay. Invitation emails will be dispatched to your nominated observers automatically.</p>
                         <p className="text-stone-800 font-medium font-sans"><strong>What to do:</strong> No manual work is required. However, you can click the <span className="text-emerald-700 font-extrabold font-sans">"Copy Link"</span> button beside any observer below to manually share a direct feedback link with them, or to log simulated scores yourself!</p>
                       </div>
                     )}

                     {(isEditingObservers || (observersToDisplay.length === 0 && !inviteObserversLater)) ? (
                       <div className="space-y-6 bg-stone-50 border border-stone-250/50 p-6 rounded-[32px] animate-fadeIn font-sans">
                         <div className="space-y-1">
                           <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">Configure 360° Observers</h4>
                           <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                             Enter 1 to 3 key contacts across your professional circle (bosses, peers, reports) to participate in your multi-rater capability mapping.
                           </p>
                         </div>

                         <div className="space-y-5">
                           {dashboardObserversList.map((obs, idx) => (
                             <div key={idx} className="p-5 bg-white border border-stone-200/60 rounded-2xl relative space-y-4 font-sans">
                               <div className="flex justify-between items-center pb-2 border-b border-stone-100 font-sans">
                                 <span className="text-[9px] font-black uppercase tracking-wider text-[#104C64]/70 bg-stone-100 px-2 py-0.5 rounded font-sans">
                                   Observer #{idx + 1}
                                 </span>
                                 {dashboardObserversList.length > 1 && (
                                   <button
                                     type="button"
                                     onClick={() => setDashboardObserversList(dashboardObserversList.filter((_, i) => i !== idx))}
                                     className="text-stone-400 hover:text-red-500 transition-all p-1 cursor-pointer"
                                     title="Remove Observer"
                                   >
                                     <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                               </div>

                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                                 <div className="space-y-1 font-sans">
                                   <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block font-sans">Full Name *</label>
                                   <input
                                     type="text"
                                     required
                                     value={obs.name}
                                     onChange={(e) => {
                                       const updated = [...dashboardObserversList];
                                       updated[idx] = { ...updated[idx], name: e.target.value };
                                       setDashboardObserversList(updated);
                                     }}
                                     placeholder="Sandra Bullock"
                                     className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#41B1C2] font-sans"
                                   />
                                 </div>

                                 <div className="space-y-1 font-sans">
                                   <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block font-sans">Email Address *</label>
                                   <input
                                     type="email"
                                     required
                                     value={obs.email}
                                     onChange={(e) => {
                                       const updated = [...dashboardObserversList];
                                       updated[idx] = { ...updated[idx], email: e.target.value };
                                       setDashboardObserversList(updated);
                                     }}
                                     placeholder="sandra@company.com"
                                     className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#41B1C2] font-sans"
                                   />
                                 </div>

                                 <div className="space-y-1 font-sans font-sans">
                                   <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block font-sans">Phone (Optional)</label>
                                   <input
                                     type="tel"
                                     value={obs.phone || ''}
                                     onChange={(e) => {
                                       const updated = [...dashboardObserversList];
                                       updated[idx] = { ...updated[idx], phone: e.target.value };
                                       setDashboardObserversList(updated);
                                     }}
                                     placeholder="+91 XXXXX XXXXX"
                                     className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#41B1C2] font-sans"
                                   />
                                 </div>

                                 <div className="space-y-1 font-sans font-sans font-sans">
                                   <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block font-sans font-sans font-sans">Relationship *</label>
                                   <select
                                     required
                                     value={obs.relationship}
                                     onChange={(e) => {
                                       const updated = [...dashboardObserversList];
                                       updated[idx] = { ...updated[idx], relationship: e.target.value };
                                       setDashboardObserversList(updated);
                                     }}
                                     className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-950 focus:outline-none focus:border-[#41B1C2] font-sans"
                                   >
                                     <option value="">Select Relationship</option>
                                     <option value="Manager / Board">Manager / Board (Above)</option>
                                     <option value="Colleague / Peer">Colleague (Peer)</option>
                                     <option value="Direct Report">Report (Below)</option>
                                     <option value="Client / Partner">Client / Business Partner</option>
                                     <option value="Trusted Mentor">Trusted Mentor / Personal Advisor</option>
                                   </select>
                                 </div>
                               </div>
                             </div>
                           ))}

                           {dashboardObserversList.length < 3 && (
                             <button
                               type="button"
                               onClick={() => setDashboardObserversList([...dashboardObserversList, { name: '', email: '', phone: '', relationship: '', status: 'Sent' }])}
                               className="w-full py-3 border border-dashed border-stone-300 hover:bg-white rounded-xl flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#104C64]/70 hover:text-[#104C64] cursor-pointer transition-all font-sans font-sans"
                             >
                               <Plus className="w-3.5 h-3.5" />
                               Add Observer ({dashboardObserversList.length}/3)
                             </button>
                           )}
                         </div>

                         <div className="flex flex-wrap gap-2 justify-end pt-2 font-sans font-sans">
                           <button
                             type="button"
                             onClick={() => {
                               setInviteObserversLater(true);
                               setIsEditingObservers(false);
                             }}
                             className="px-4 py-2 border border-stone-200 text-[#104C64] hover:text-[#0D3E52] border-[#104C64]/20 hover:border-[#104C64]/40 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-stone-50 cursor-pointer font-sans mr-auto"
                           >
                             Invite Observers Later
                           </button>
                           {observersToDisplay.length > 0 && (
                             <button
                               type="button"
                               onClick={() => {
                                 setIsEditingObservers(false);
                                 setDashboardObserversList(observersToDisplay);
                               }}
                               className="px-4 py-2 border border-stone-200 text-stone-500 hover:text-stone-800 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-stone-50 cursor-pointer font-sans"
                             >
                               Cancel
                             </button>
                           )}
                           <button
                             type="button"
                             onClick={handleSaveDashboardObservers}
                             className="px-6 py-2 bg-[#104C64] hover:bg-[#155e7a] text-white text-[10px] uppercase font-black tracking-widest rounded-xl transition-all shadow-md cursor-pointer font-sans"
                           >
                             Save & Dispatch Invitations
                           </button>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2">
                       {observersToDisplay.length > 0 ? (
                         observersToDisplay.map((obs: any, idx: number) => {
                           const statusText = isThreeSixtyCompleted ? 'Feedback Received' : (obs.status || 'Invitation Sent');
                           return (
                             <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-stone-50 border border-stone-200/40 rounded-2xl gap-3">
                               <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                   <span className="text-xs font-black text-[#104C64] uppercase tracking-wide">{obs.name}</span>
                                   <span className="text-[8px] bg-[#104C64]/5 text-[#104C64] px-2 py-0.5 rounded font-black uppercase tracking-widest">{obs.relationship}</span>
                                 </div>
                                 <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2">
                                   <span>Email: {obs.email || '-'}</span>
                                   {obs.phone && <span className="opacity-60">| Phone: {obs.phone}</span>}
                                 </div>
                               </div>
                               
                               <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                                 <span className={`text-[9px] font-black uppercase border px-3 py-1 rounded-full flex items-center gap-1 ${
                                   isThreeSixtyCompleted
                                     ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                     : 'bg-amber-50 text-amber-700 border-amber-100'
                                 }`}>
                                   <span className={`w-1 h-1 rounded-full ${isThreeSixtyCompleted ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                                   {statusText}
                                 </span>
                                 {!isThreeSixtyCompleted && (
                                   <>
                                     <button
                                       onClick={() => {
                                         const link = `${getInstantOrigin()}/observer-assessment?userId=${user.uid}&email=${encodeURIComponent(obs.email || '')}`;
                                         safeCopyToClipboard(link);
                                         alert(`Confidential observation link copied for ${obs.name}! You can share this link directly via Slack, Teams, or open it yourself.`);
                                       }}
                                       className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-sm cursor-pointer"
                                     >
                                       Copy Link
                                     </button>
                                     <button
                                       onClick={async () => {
                                         if (!obs.email || !obs.email.trim()) {
                                           alert("No email address registered for this observer.");
                                            return;
                                          }
                                          const link = `${getInstantOrigin()}/observer-assessment?userId=${user.uid}&email=${encodeURIComponent(obs.email || '')}`;
                                          if (false) {
                                           return;
                                         }
                                         try {
                                           const response = await fetch('/api/invite-observer', {
                                             method: 'POST',
                                             headers: { 'Content-Type': 'application/json' },
                                             body: JSON.stringify({
                                               observerEmail: obs.email.trim(),
                                               observerName: obs.name.trim(),
                                               observerRelationship: obs.relationship,
                                               userName: profile?.name || user?.displayName || 'BeyondEQ User',
                                               userId: user?.uid,
                                               userType: profile?.userType || 'individual',
                                               origin: getInstantOrigin()
                                             })
                                           });
                                           if (response.ok) {
                                             const resData = await response.json();
                                             // duplicate link variable declaration bypassed
                                             if (resData.configured === false) {
                                               alert(`✉️ Outbound SMTP Server Unconfigured:\n\nNo SMTP service coordinates (SMTP_USER/SMTP_PASS) are declared in your workspace settings.\n\nTo help you move forward immediately, we copied the personal feedback link for "${obs.name}" to your clipboard!\n\nLink:\n${link}\n\nPlease paste and send it directly!`);
                                               safeCopyToClipboard(link);
                                             } else {
                                               if (resData.sent === false) {
                                                  alert(`✉️ Outbound SMTP Relay Error:\n\nWe encountered an issue transmitting the reminder email using your configured SMTP details:\n\n${resData.error || resData.message || "Failed to transmit message."}\n\nWe have automatically copied the personal feedback link for "${obs.name}" to your clipboard so that you can share it manually!\n\nLink:\n${link}`);
                                                  safeCopyToClipboard(link);
                                                } else {
                                                  alert(`An invitation reminder email has been successfully dispatched to: ${obs.email}`);
                                                }
                                             }
                                           } else {
                                             const errData = await response.json().catch(() => ({}));
                                              alert(`Failed to send reminder email: ${errData.error || "Server error"}.\n\nWe copied the personal feedback link to your clipboard so you can share it directly!\n\nLink:\n${link}`);
                                              safeCopyToClipboard(link);
                                           }
                                         } catch (e) {
                                           console.error(e);
                                           alert(`An invitation reminder email failover has been triggered due to a network connection error or unconfigured servers.\n\nWe copied the personal feedback link to your clipboard so you can share it directly!\n\nLink:\n${link}`);
                                            safeCopyToClipboard(link);
                                         }
                                       }}
                                       className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-[#104C64] hover:bg-slate-50 border border-gray-100 rounded-lg shadow-sm cursor-pointer"
                                     >
                                       Remind
                                     </button>
                                   </>
                                 )}
                               </div>
                             </div>
                           );
                         })
                       ) : (
                         <div className="text-xs text-gray-400 font-sans">
                          <div className="flex flex-col items-center justify-center p-6 bg-stone-50 border border-stone-200/40 rounded-2xl text-center space-y-3 font-sans">
                            <Users className="w-8 h-8 text-[#104C64]/75" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-stone-850">No Observers Invited Yet</p>
                              <p className="text-[11px] text-stone-500 max-w-sm leading-normal">
                                You are exploring your 360° Diagnostic Report in-progress using your Self-Discovery baseline scores. Add professional observers anytime to compare feedback and unlock relational gap analysis!
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setInviteObserversLater(false);
                                setIsEditingObservers(true);
                              }}
                              className="px-4 py-2 bg-[#104C64] hover:bg-[#155e7a] text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              Invite Observers Now
                            </button>
                          </div>
                        </div>
                       )}
                     </div>
                     )}

                    {(isThreeSixtyCompleted || isThreeSixtySelfCompleted) && (
                      <div className="mt-8 pt-6 border-t border-stone-100 space-y-6 animate-fadeIn">
                        {!isThreeSixtyCompleted ? (
                          <div className="flex items-center justify-between pb-2 border-b border-stone-200/55">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-[#104C64] animate-pulse" />
                              <h4 className="text-xs font-black text-[#104C64]/75 uppercase tracking-wider">360° Relational Gap Analysis (Pending Feedback)</h4>
                            </div>
                            <span className="text-[8.5px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse font-sans">Awaiting Observers</span>
                          </div>
                        ) : (
                          <div 
                            onClick={() => setIsGapDetailsExpanded(!isGapDetailsExpanded)}
                            className="flex items-center justify-between cursor-pointer select-none group pb-2 border-b border-transparent hover:border-stone-200/50 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-[#104C64] group-hover:scale-110 transition-transform" />
                              <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider group-hover:text-stone-900 transition-colors">360° Relational Gap Analysis</h4>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsGapDetailsExpanded(!isGapDetailsExpanded);
                              }}
                              className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#104C64] bg-stone-50 hover:bg-stone-100 border border-stone-250 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <span>{isGapDetailsExpanded ? 'Hide Details' : 'View Trait Gaps'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isGapDetailsExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        )}

                        <div className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans ${isThreeSixtyCompleted ? 'bg-emerald-50 text-emerald-850 border border-emerald-100' : 'bg-amber-50 text-amber-850 border border-amber-200 shadow-amber-550/5'}`}>
                          <div className="flex items-start gap-3">
                            <Mail className={`w-5 h-5 shrink-0 mt-0.5 ${isThreeSixtyCompleted ? 'text-[#104C64] animate-pulse' : 'text-amber-600 animate-pulse'}`} />
                            <div className="space-y-0.5 text-xs text-stone-700 font-sans leading-relaxed">
                              <p className={`font-bold uppercase tracking-wide text-[10px] ${isThreeSixtyCompleted ? 'text-[#104C64]' : 'text-amber-800'}`}>
                                {isThreeSixtyCompleted ? '360° Diagnostic Report Unlocked!' : 'In-Progress 360° Report Available!'}
                              </p>
                              <p className="text-[11px] text-stone-600 leading-normal">
                                {isThreeSixtyCompleted 
                                  ? 'A copy of this report has been sent to your registered inbox, but you can also view, print, and download your comprehensive, executive-ready report instantly below.'
                                  : 'You have completed the self-discovery reflection section of your 360. You can now view and download your in-progress report showing your self-discovery baseline and status of invited observers.'}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setIsReportOpen(true)}
                            className={`px-4 py-2.5 text-white font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-md shrink-0 cursor-pointer text-center ${isThreeSixtyCompleted ? 'bg-[#104C64] hover:bg-[#0D3E52]' : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-600/10'}`}
                          >
                            {isThreeSixtyCompleted ? 'Download & View Report' : 'View In-Progress Report'}
                          </button>
                        </div>

                        <AnimatePresence initial={false}>
                          {isGapDetailsExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 gap-4 font-sans pt-1">
                                {[
                                  { code: 'SR', name: 'Self Composure', desc: 'Stress Grounding & Integrity' },
                                  { code: 'CI', name: 'Contextual Reading', desc: 'Tacit team climate understanding' },
                                  { code: 'RA', name: 'Relationship Design', desc: 'Selective trust & strategic alliances' },
                                  { code: 'ST', name: 'Strategic Thinking', desc: 'Decision trajectory scaling' },
                                  { code: 'C', name: 'Decision Courage', desc: 'Voicing crucial hard truths' },
                                  { code: 'CN', name: 'Conflict Navigation', desc: 'Constructive pivot of disputes' },
                                  { code: 'IP', name: 'Influence Potential', desc: 'Inspirational guidance & reach' }
                                ].map((t, idx) => {
                                  const selfVal = (profile as any).selfDiscoveryScores?.[t.code] || 40;
                                  const obsVal = (profile as any).threeSixtyScores?.[t.code] || 78;
                                  const gap = obsVal - selfVal;

                                  const isLockedForPromo = (profile as any)?.premiumPromoActive === true && idx >= 2;

                                  if (isLockedForPromo) {
                                    return (
                                      <div key={t.code} className="p-4 bg-stone-50/25 border border-dashed border-stone-200 rounded-2xl flex items-center justify-between relative overflow-hidden select-none">
                                        <div className="absolute inset-0 bg-white/75 backdrop-blur-[2.5px] z-10 flex items-center justify-between px-6">
                                          <div className="flex items-center gap-2">
                                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                                            <span className="text-[10px] font-black text-stone-750 uppercase tracking-widest">{t.name} Comparative Gaps Locked</span>
                                          </div>
                                          <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider">Paid Exclusive</span>
                                        </div>
                                        
                                        <div className="opacity-20 flex flex-row items-center justify-between w-full">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">{t.name}</span>
                                            </div>
                                            <p className="text-[10px] text-stone-550 font-sans">{t.desc}</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  let label = "Aligned Perception";
                                  let colClass = "bg-stone-50 text-stone-600 border-stone-200";
                                  let hint = "Others perceive your capability matching your own rating standard.";

                                  if (gap > 5) {
                                    label = "Self-Underestimated (Strength)";
                                    colClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                    hint = `Your peers rate you ${gap} pts higher than you rate yourself. A solid blind spot strength!`;
                                  } else if (gap < -5) {
                                    label = "Overestimated (Growth Area)";
                                    colClass = "bg-rose-50 text-rose-705 border-rose-200";
                                    hint = `You rated yourself higher than others observe by ${Math.abs(gap)} pts. Focus here.`;
                                  }

                                  return (
                                    <div key={t.code} className="p-4 bg-stone-50/70 border border-stone-150 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">{t.name}</span>
                                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${colClass}`}>{label}</span>
                                        </div>
                                        <p className="text-[10px] text-stone-500 font-sans">{t.desc}</p>
                                        <p className="text-[9.5px] italic text-stone-450 leading-relaxed font-sans">{hint}</p>
                                      </div>

                                      <div className="flex items-center gap-4 shrink-0 sm:self-auto self-end">
                                        <div className="text-center">
                                          <div className="text-[9px] uppercase font-black tracking-wider text-stone-400">Self</div>
                                          <div className="text-xs font-black text-stone-600 font-mono">{selfVal}</div>
                                        </div>
                                        <div className="h-6 w-[1px] bg-stone-200" />
                                        <div className="text-center">
                                          <div className="text-[9px] uppercase font-black tracking-wider text-[#104C64]">Observer</div>
                                          <div className="text-xs font-black text-[#104C64] font-mono">{obsVal}</div>
                                        </div>
                                        <div className="h-6 w-[1px] bg-stone-200" />
                                        <div className="text-center min-w-[45px]">
                                          <div className="text-[9px] uppercase font-black tracking-wider text-stone-400">Gap</div>
                                          <div className={`text-xs font-black font-mono px-2 py-0.5 rounded ${gap >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                                            {gap >= 0 ? `+${gap}` : gap}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      {!isThreeSixtyCompleted ? (
                        <>
                          <button
                            onClick={handleSimulateThreeSixty}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm"
                          >
                            Simulate Observer Feedback
                          </button>
                          <button
                            onClick={() => setIsEditingObservers(true)}
                            className="flex-1 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white text-center font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Edit Observers
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={async () => {
                            if (!user) return;
                            try {
                              const userDocRef = doc(db, 'users', user.uid);
                              await updateDoc(userDocRef, {
                                threeSixtyCompleted: false,
                                threeSixtySelfCompleted: false,
                                updatedAt: serverTimestamp()
                              });
                              alert("360 Feedback reset successfully. You can retake the assessment or simulate feedback again.");
                            } catch (err: any) {
                              console.error(err);
                            }
                          }}
                          className="flex-1 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white text-center font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-sm"
                        >
                          Reset / Re-run 360 Loop
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center justify-center text-stone-400">
                      <Lock className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">Start 360° Assessment Flow</h4>
                      <p className="text-xs text-stone-450 font-sans leading-relaxed">
                        The Relational 365-day 360-degree loop starts with your personalized self-reflection. Give the self-assessment first, and then you will be prompted to invite your professional or personal observers immediately afterwards.
                      </p>
                    </div>
                    <Link
                      to="/assessment"
                      state={{ type: '360', from360: true }}
                      className="px-6 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all shadow-md shadow-[#104C64]/10 cursor-pointer text-center"
                    >
                      Give Self-Assessment First
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. Overall Self View & Live Report */}
            {activeAssessment === 'overallSelf' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 space-y-8 animate-fade-in"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-100 gap-4">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">
                      BeyondEQ Consolidated Report
                    </span>
                    <h3 className="text-xl md:text-2xl font-black text-[#104C64] uppercase tracking-tight italic">
                      Overall Self-View &amp; <span className="font-serif not-italic font-normal text-[#41B1C2] lowercase">live pattern map</span>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] bg-[#104C64] text-white font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Live Assessment Synchronization
                    </span>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Active Analytics
                    </span>
                  </div>
                </div>

                {/* Subtitle / summary */}
                <p className="text-xs text-stone-600 font-sans leading-relaxed max-w-2xl text-left">
                  This synchronized interface combines cognitive scoring from your <strong>Take Self Discovery</strong> questionnaire, peer feedback metrics from the <strong>BeyondEQ 360° Diagnostic Matrix</strong>, physical symptoms from the <strong>EQ Reflection Gym</strong>, and instant micro-emotions logged inside your <strong>3-Second Pause Tool</strong>.
                </p>

                {/* Main Dashboard Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Column Left: 7 Parameters Comparative Hub (7/12) */}
                  <div className="lg:col-span-7 bg-stone-50/55 rounded-3xl border border-stone-200 p-6 md:p-8 space-y-6 text-left">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-stone-200">
                      <Activity className="w-4 h-4 text-[#104C64]" />
                      <div>
                        <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">Unified Multi-Tool Parameters</h4>
                        <span className="text-[8.5px] text-stone-500 font-bold uppercase tracking-widest font-mono">Self Discovery Scores vs 360 Observer Averages</span>
                      </div>
                    </div>

                    <div className="space-y-4 font-sans">
                      {[
                        { code: 'SR', name: 'Self Composure', desc: 'Stress Grounding & Integrity' },
                        { code: 'CI', name: 'Contextual Reading', desc: 'Tacit team climate understanding' },
                        { code: 'RA', name: 'Relationship Design', desc: 'Selective trust & alliances' },
                        { code: 'ST', name: 'Strategic Thinking', desc: 'Decision trajectory scaling' },
                        { code: 'C', name: 'Decision Courage', desc: 'Voicing crucial hard truths' },
                        { code: 'CN', name: 'Conflict Navigation', desc: 'Constructive pivot of disputes' },
                        { code: 'IP', name: 'Influence Potential', desc: 'Inspirational guidance & reach' }
                      ].map((t) => {
                        const selfVal = (profile as any)?.selfDiscoveryScores?.[t.code] || 40;
                        const observerVal = (profile as any)?.threeSixtyScores?.[t.code] || null;
                        const hasObserver = observerVal !== null;

                        return (
                          <div key={t.code} className="bg-white p-4 rounded-2xl border border-stone-150 space-y-2.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[11px] font-black uppercase text-[#104C64] tracking-wide block">{t.name}</span>
                                <span className="text-[9px] text-stone-450 font-sans block">{t.desc}</span>
                              </div>
                              <div className="flex gap-2">
                                <div className="text-right">
                                  <span className="text-[8px] text-[#104C64] font-black uppercase block font-mono">Self Discovery</span>
                                  <span className="text-xs font-black text-[#104C64] font-mono">{selfVal} pt</span>
                                </div>
                                {hasObserver && (
                                  <div className="text-right border-l border-stone-250 pl-2">
                                    <span className="text-[8.5px] text-[#41B1C2] font-black uppercase block font-mono">360 Observer</span>
                                    <span className="text-xs font-black text-[#41B1C2] font-mono">{observerVal} pt</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Dual Comparative Progress Bar */}
                            <div className="space-y-1.5 pt-0.5">
                              {/* Self score line */}
                              <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden relative">
                                <div className="h-full bg-gradient-to-r from-[#104C64] to-[#104C64] hover:opacity-90 transition-all rounded-full" style={{ width: `${selfVal}%` }} />
                              </div>
                              {/* Observer score line (if exists) */}
                              {hasObserver && (
                                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden relative">
                                  <div className="h-full bg-gradient-to-r from-teal-400 to-[#41B1C2] rounded-full" style={{ width: `${observerVal}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column Right: Pattern Mapping, Triggers, & Micro Logs (5/12) */}
                  <div className="lg:col-span-5 space-y-6 flex flex-col justify-between font-sans">
                    
                    {/* Diagnostic Summary Block */}
                    <div className="bg-gradient-to-br from-stone-50 to-[#104C64]/5 rounded-3xl border border-stone-200 p-6 text-left space-y-5">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
                        <Compass className="w-4 h-4 text-[#104C64]" />
                        <div>
                          <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">Locus &amp; Stress Metrics</h4>
                          <span className="text-[8px] text-stone-500 font-bold uppercase tracking-widest block font-mono">Real-Time Sync from Journal</span>
                        </div>
                      </div>

                      {reflections.length === 0 ? (
                        <div className="py-6 text-center text-stone-400/80 font-sans space-y-1">
                          <Sparkles className="w-5 h-5 text-stone-400 mx-auto opacity-70 mb-2 animate-bounce" />
                          <p className="text-[11px] font-black uppercase text-[#104C64] tracking-wider block font-sans">No Reflections Found</p>
                          <p className="text-[10px] leading-relaxed max-w-[200px] mx-auto font-sans">Maintain your streak to populate physical cues and triggers here automatically.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Intensity & Posture */}
                          <div className="grid grid-cols-2 gap-3 font-sans">
                            <div className="bg-white border border-stone-250 p-3 rounded-2xl">
                              <span className="text-[8.5px] text-stone-400 font-black uppercase tracking-wider block">Avg Log Intensity</span>
                              <span className="text-xl font-bold font-mono text-[#104C64] block mt-0.5">
                                {analyticsData?.avgIntensity ? (analyticsData.avgIntensity).toFixed(1) : '0.0'} / 5.0
                              </span>
                            </div>
                            <div className="bg-white border border-stone-250 p-3 rounded-2xl">
                              <span className="text-[8.5px] text-stone-400 font-black uppercase tracking-wider block">Total Logs Compiled</span>
                              <span className="text-xl font-bold font-mono text-[#104C64] block mt-0.5">{reflections.length} sessions</span>
                            </div>
                          </div>

                          {/* Trigger spectrum */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-stone-400 tracking-wider">
                              <span>Action / Trigger Balance</span>
                              <span className="font-mono text-[#104C64]">{analyticsData?.pctInternal || 0}% Internal</span>
                            </div>
                            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden flex">
                              <div className="h-full bg-[#104C64]" style={{ width: `${analyticsData?.pctInternal || 50}%` }} />
                              <div className="h-full bg-[#41B1C2]" style={{ width: `${analyticsData?.pctExternal || 50}%` }} />
                            </div>
                            <div className="flex justify-between text-[8px] font-bold text-stone-500 uppercase tracking-widest">
                              <span>Internal Locus</span>
                              <span>External Cues</span>
                            </div>
                          </div>

                          {/* Physiological Somatic Hotspots list */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider block">Identified Somatic Load Hotspots</span>
                            {analyticsData?.topSomaticSymptoms && analyticsData.topSomaticSymptoms.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 font-sans">
                                {analyticsData.topSomaticSymptoms.slice(0, 4).map(([symptom, count]: any) => (
                                  <div key={symptom} className="flex items-center gap-1.5 bg-white border border-stone-200 px-2 py-1 rounded-xl text-[9px] font-semibold text-stone-700 shadow-sm font-sans">
                                    <span>⚡ {symptom.replace(/[^a-zA-Z\s]/g, '').trim()}</span>
                                    <span className="text-[#104C64] font-mono text-[8.5px] bg-[#104C64]/5 px-1 rounded font-bold">{count}x</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-stone-400 font-sans italic py-1.5 px-2 bg-white rounded-xl border border-stone-150">No physiological cues logged yet inside Reflection Gym.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coping & Mental Models */}
                    <div className="bg-stone-50 border border-stone-205 rounded-3xl p-6 text-left space-y-4">
                      <div className="flex items-center gap-2.5 pb-2.5 border-b border-stone-200">
                        <Brain className="w-4 h-4 text-[#104C64]" />
                        <div>
                          <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider">Mental Model Coaching Integration</h4>
                          <span className="text-[8px] text-stone-500 font-bold uppercase tracking-widest block font-mono">Synthetic Habit Correction</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 text-xs leading-relaxed text-stone-600 font-sans font-normal">
                        <div className="bg-white p-3.5 rounded-xl border border-stone-150 font-sans font-normal font-normal">
                          <span className="text-[8.5px] font-bold text-[#104C64] uppercase tracking-wider block mb-1">Stimulus-Response Training</span>
                          <p className="text-[10.5px]">
                            {analyticsData && analyticsData.microCount > 0 
                              ? `You have compiled ${analyticsData.microCount} active pauses using our shorter 3S Pause Tool! This proves you are hardcoding real-time regulatory capacity to de-condition default triggers.`
                              : "You are currently utilizing retrospective journaling. Pair this with the shorter 3-Second Pause Tool to intercept triggers immediately as they arise in professional meetings."}
                          </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-stone-150 font-sans font-normal font-normal flex-1">
                          <span className="text-[8.5px] font-bold text-[#104C64] uppercase tracking-wider block mb-1">Growth Action Posture</span>
                          <p className="text-[10.5px]">
                            {analyticsData && analyticsData.pctInternal > 50 
                              ? "Self-coaching guidance: Focus on de-emphasizing inner standard codes. Reduce self-judgment loop triggers by embracing feedback from objective multi-perspective stakeholders."
                              : "Self-coaching guidance: Focus on somatic triggers mapping. Keep tag registries active inside Reflection Gym to decode biochemical panic trends early."}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}



            {/* 4. Upcoming / Locked Assessment Context card */}
            {(activeAssessment === 'cognitive' || activeAssessment === 'resiliency') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white p-8 md:p-12 rounded-[40px] shadow-sm border border-gray-100 flex flex-col space-y-6"
              >
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-black text-[#104C64] uppercase tracking-[0.4em]">Curated Syllabus Teaser</h3>
                  <BookOpen className="w-4 h-4 text-[#104C64]" />
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-white border border-gray-100 rounded-xl font-mono text-xs font-bold text-[#104C64] shrink-0">01</div>
                    <div>
                      <h4 className="text-xs font-bold text-[#104C64] uppercase tracking-wide">
                        {activeAssessment === 'cognitive' ? 'Conversational Reading & Non-Verbal Signals' : 'High Stakes Stress Buffer Dynamics'}
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-sans mt-0.5">
                        Understanding sub-vocal adjustments and micro-adjustments in threat environments.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-start gap-4">
                    <div className="p-2.5 bg-white border border-gray-100 rounded-xl font-mono text-xs font-bold text-[#104C64] shrink-0">02</div>
                    <div>
                      <h4 className="text-xs font-bold text-[#104C64] uppercase tracking-wide">
                        {activeAssessment === 'cognitive' ? 'Neural Feedback Tuning' : 'Absorptive Response Patterns'}
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-sans mt-0.5">
                        Developing cortical templates to process raw response metrics without decay.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
        )}

        {/* Daily Emotional Landscape Section */}
        <section className="pt-12">
          <div className="mb-8 px-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-[#104C64] uppercase tracking-[0.4em] italic">Daily Emotional Landscape</h2>
            <div className="h-[1px] flex-1 bg-gray-200 mx-8 hidden md:block" />
            <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-widest hidden md:block">Real-time EQ Mapping</span>
          </div>
          <MoodTracker />
        </section>
      </div>

      {/* Premium Upgrade Plan Selection Modal */}
      <AnimatePresence>
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPaymentProcessing && setIsUpgradeModalOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-6 md:p-8 max-w-lg w-full border border-stone-200 shadow-2xl relative z-10 text-center space-y-6 max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              {!isPaymentProcessing && (
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto border border-amber-200/50">
                <Sparkles className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wider">Choose Your Premium Plan</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans max-w-sm mx-auto">
                  Gain immediate access to premium diagnostic matrices, observer logs, and active intelligence helper checklists.
                </p>
              </div>

              {/* Plans toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Annual Plan */}
                <div 
                  onClick={() => setSelectedPlan('annual')}
                  className={`relative p-5 rounded-3xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPlan === 'annual' 
                      ? 'border-[#104C64] bg-[#104C64]/5 shadow-sm' 
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span className="absolute top-3 right-3 bg-amber-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest shadow-sm">
                    Save 20%
                  </span>
                  <div>
                    <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider mb-1">Annual Access</h4>
                    <p className="text-[10px] text-stone-400 font-sans">Best value package</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#104C64]">₹9,580</span>
                      <span className="text-[10px] text-stone-500 font-sans">/ yr</span>
                    </div>
                    <p className="text-[9px] text-[#41B1C2] font-semibold font-sans mt-0.5">Equivalent to ₹798/mo</p>
                  </div>
                </div>

                {/* Monthly Plan */}
                <div 
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-5 rounded-3xl border-2 text-left cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPlan === 'monthly' 
                      ? 'border-[#104C64] bg-[#104C64]/5 shadow-sm' 
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wider mb-1">Monthly Access</h4>
                    <p className="text-[10px] text-stone-400 font-sans">Flexible subscription</p>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#104C64]">₹998</span>
                      <span className="text-[10px] text-stone-500 font-sans">/ mo</span>
                    </div>
                    <p className="text-[9px] text-stone-400 font-sans mt-0.5">Cancel anytime instantly</p>
                  </div>
                </div>
              </div>

              {/* Value list snippet */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-150 text-left text-[10px] text-stone-500 font-sans space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Colleague-rated <strong>360° Diagnostic Matrix</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Structured <strong>Coaching Assignments Engine</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Unlimited logs in <strong>Reflective Intelligence Gym</strong></span>
                </div>
              </div>

              {/* Flashy Synergy Offer Banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 border border-amber-500/30 rounded-3xl p-5 text-left space-y-2 shadow-sm">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 opacity-10 pointer-events-none select-none">
                  <Flame className="w-16 h-16 fill-amber-500" />
                </div>
                <div className="flex items-center gap-2 font-sans">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 rounded-full">
                    Synergy Reward Challenge
                  </span>
                </div>
                <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wide">Or Get Premium 100% Free! 🎁</h4>
                <p className="text-[10px] text-stone-600 font-sans leading-relaxed">
                  Connect with any colleague, friend, or partner. Track indicators daily: if both of you maintain a <strong>30-Day Streak</strong>, you BOTH get loaded with <strong>1 MONTH OF PREMIUM ACCESS FOR FREE</strong>!
                </p>
              </div>

              {/* Custom Payment Mode Selection and Input Flow */}
              <div className="border-t border-stone-100 pt-4 text-left space-y-3">
                <label className="text-[9px] font-black text-[#104C64] uppercase tracking-wider block">
                  Select Payment Method
                </label>
                
                {/* Mode tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-1 rounded-xl border font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-[#104C64] bg-[#104C64]/5 text-[#104C64]'
                        : 'border-stone-200 hover:border-stone-350 text-stone-550'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 px-1 rounded-xl border font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'border-[#104C64] bg-[#104C64]/5 text-[#104C64]'
                        : 'border-stone-200 hover:border-stone-350 text-stone-550'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`py-2 px-1 rounded-xl border font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'netbanking'
                        ? 'border-[#104C64] bg-[#104C64]/5 text-[#104C64]'
                        : 'border-stone-200 hover:border-stone-350 text-stone-550'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Netbank</span>
                  </button>
                </div>

                {/* Details Section accordingly */}
                <div className="bg-stone-50/50 border border-stone-150 p-4 rounded-3xl space-y-3">
                  {paymentMethod === 'card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="CARDHOLDER NAME"
                          className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">Card Number</label>
                        <input
                          type="text"
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value)}
                          placeholder="4111 2222 3333 4444"
                          className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardEx}
                            onChange={(e) => setCardEx(e.target.value)}
                            placeholder="12/29"
                            className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">CVV</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="777"
                            className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                            maxLength={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">UPI VPA Address</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. success@razorpay"
                          className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                        />
                        <span className="text-[8.5px] text-stone-400 font-sans mt-1 block">
                          Tip: Use <strong>success@razorpay</strong> in mock modes to auto-approve.
                        </span>
                      </div>
                      
                      {/* Dynamic QR code simulation */}
                      <div className="bg-white border border-stone-150 p-3 rounded-2xl flex items-center gap-4">
                        <div className="w-14 h-14 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-10 h-10 text-stone-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="2" width="6" height="6" rx="1" />
                            <rect x="2" y="14" width="6" height="6" rx="1" />
                            <rect x="14" y="2" width="6" height="6" rx="1" />
                            <path d="M14 14h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm-4 4h2v2h-2zm6 0h2v2h-2zm-6 2h4v2h-4z" />
                          </svg>
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[9px] font-black text-[#104C64] uppercase tracking-wider">Dynamic QR Code</h5>
                          <p className="text-[8.5px] text-stone-550 font-sans leading-normal">
                            A custom scan-ready QR code matching your inputs will render instantly inside Razorpay.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block mb-1">Select Bank</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2] cursor-pointer"
                        >
                          <option value="HDFC">HDFC Bank</option>
                          <option value="SBIN">State Bank of India</option>
                          <option value="ICIC">ICICI Bank</option>
                          <option value="UTIB">Axis Bank</option>
                          <option value="KKBK">Kotak Mahindra Bank</option>
                          <option value="PUNB">Punjab National Bank</option>
                          <option value="BARB">Bank of Baroda</option>
                        </select>
                      </div>
                      <p className="text-[8.5px] text-stone-400 font-sans leading-relaxed">
                        Secure instant checkout is optimized for your chosen bank.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Code Subsection */}
              <div className="border-t border-stone-100 pt-3 text-left">
                {!isPromoExpanded ? (
                  <button
                    onClick={() => setIsPromoExpanded(true)}
                    className="text-[10px] font-bold text-[#104C64] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Have a promotional code?</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="space-y-2 bg-stone-50/50 p-3 rounded-2xl border border-stone-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#104C64] tracking-wider">Promotional Code</span>
                      <button 
                        onClick={() => {
                          setIsPromoExpanded(false);
                          setPromoError(null);
                          setPromoSuccess(null);
                        }} 
                        className="text-[9px] text-stone-400 hover:text-stone-600 font-sans"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                        placeholder="e.g. TEAM_EQ_1"
                        disabled={isPromoVerifying}
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-[#104C64] placeholder:font-sans placeholder:normal-case placeholder:text-[10px]"
                      />
                      <button
                        onClick={handleVerifyPromoCode}
                        disabled={isPromoVerifying || !promoCodeInput.trim()}
                        className="px-4 py-1.5 bg-[#104C64] hover:bg-[#0D3E52] disabled:bg-stone-200 disabled:text-stone-400 transition-colors text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                      >
                        {isPromoVerifying ? "Applying..." : "Apply"}
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[9px] text-rose-500 font-medium font-sans">
                        ⚠️ {promoError}
                      </p>
                    )}

                    {promoSuccess && (
                      <p className="text-[9px] text-emerald-600 font-bold font-sans">
                        ✓ {promoSuccess}
                      </p>
                    )}
                    
                    <p className="text-[8px] text-stone-400 font-sans">
                      Enter a team code (1 of 5 available, max 5 redemptions each) or a special testing code (max 5 redemptions).
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleProcessPayment}
                disabled={isPaymentProcessing}
                className="w-full py-4 bg-[#104C64] hover:bg-[#0D3E52] disabled:bg-stone-300 transition-colors text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                {isPaymentProcessing ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    Proceed with Razorpay
                  </>
                )}
              </button>

              <span className="text-[8.5px] font-sans font-medium text-stone-400 block">
                🔒 Protected by industry standard SSL encryption.
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Promo Code Redemption Modal */}
      <AnimatePresence>
        {isPromoModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" id="promo-code-redemption-overlay">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPromoVerifying && setIsPromoModalOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
              id="promo-code-redemption-backdrop"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-6 md:p-8 max-w-md w-full border border-stone-200 shadow-2xl relative z-10 text-center space-y-6 max-h-[85vh] overflow-y-auto"
              id="promo-code-redemption-body"
            >
              {/* Close Button */}
              {!isPromoVerifying && (
                <button
                  onClick={() => setIsPromoModalOpen(false)}
                  className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 cursor-pointer"
                  id="promo-close-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200/50">
                <Tag className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wider">Redeem Promo Code</h3>
                <p className="text-xs text-stone-550 leading-relaxed font-sans max-w-sm mx-auto">
                  Enter a team code or special testing code to instantly unlock access to your premium diagnostic report tools.
                </p>
              </div>

              <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left">
                <label className="text-[10px] font-black uppercase text-[#104C64] tracking-wider block">Promotional Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="e.g. IPN40M or TEST10"
                    disabled={isPromoVerifying}
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-[#104C64] placeholder:font-sans placeholder:normal-case placeholder:text-[10px]"
                    id="promo-input-field"
                  />
                  <button
                    onClick={async () => {
                      await handleVerifyPromoCode();
                    }}
                    disabled={isPromoVerifying || !promoCodeInput.trim()}
                    className="px-5 py-2 bg-[#104C64] hover:bg-[#0D3E52] disabled:bg-stone-200 disabled:text-stone-400 transition-colors text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                    id="promo-apply-btn"
                  >
                    {isPromoVerifying ? "Verifying..." : "Apply"}
                  </button>
                </div>

                {promoError && (
                  <p className="text-[9px] text-rose-500 font-semibold font-sans mt-1">
                    ⚠️ {promoError}
                  </p>
                )}

                {promoSuccess && (
                  <p className="text-[9px] text-emerald-600 font-bold font-sans mt-1">
                    ✓ {promoSuccess}
                  </p>
                )}

                <div className="text-[8.5px] text-stone-400 font-sans leading-normal pt-1 border-t border-stone-200/60 mt-2">
                  <span className="font-bold">Active Codes:</span>
                  <ul className="list-disc pl-3.5 space-y-0.5 mt-1">
                    <li><strong>TEST10</strong>: Instantly unlocks the full Premium suite.</li>
                    <li><strong>IPN40M</strong>: Unlocks free access to Assessment 5.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enterprise Checkout Modal */}
      <AnimatePresence>
        {isEnterpriseCheckoutOpen && !profile?.enterpriseInvitedBy && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCorporatePaying && setIsEnterpriseCheckoutOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-6 md:p-8 max-w-lg w-full border border-stone-200 shadow-2xl relative z-10 text-center space-y-6 max-h-[85vh] overflow-y-auto"
            >
              {/* Close Button */}
              {!isCorporatePaying && (
                <button
                  onClick={() => setIsEnterpriseCheckoutOpen(false)}
                  className="absolute top-6 right-6 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto border border-amber-200/50">
                <Shield className="w-7 h-7 font-black" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wider">Enterprise License Checkout</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-sans max-w-sm mx-auto">
                  Activate enterprise-grade EQ roadmap insights, unified diagnostic matrix charts and premium organization assets.
                </p>
              </div>

              {/* Bill Details */}
              <div className="bg-stone-50 text-left p-5 rounded-3xl border border-stone-200/80 space-y-3 font-sans">
                <div className="flex justify-between items-start pb-2 border-b border-stone-100">
                  <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Bill To</span>
                    <h4 className="text-[11px] font-black text-[#104C64] leading-tight">{profile?.name || 'Authorized Representative'}</h4>
                    <p className="text-[9px] text-stone-500 leading-none mt-1">{profile?.designation} at {profile?.company}</p>
                    <p className="text-[8px] text-stone-400 mt-1">{profile?.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Official Email</span>
                    <h5 className="text-[10px] font-medium text-stone-700">{profile?.email}</h5>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-stone-500 font-sans">License Item:</span>
                  <span className="font-bold text-stone-800 font-sans">Unified Executive Insights Activation Package</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black border-t border-dashed border-stone-200 pt-2 text-[#104C64]">
                  <span>Total Due:</span>
                  <span>INR 2,999</span>
                </div>
              </div>

              {/* Promo Code Subsection */}
              <div className="text-left w-full border-t border-b border-stone-100 py-3">
                {!isPromoExpanded ? (
                  <button
                    onClick={() => setIsPromoExpanded(true)}
                    className="text-[10px] font-bold text-[#104C64] hover:underline flex items-center gap-1 cursor-pointer mx-auto md:mx-0"
                  >
                    <span>Have an enterprise promotional code?</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="space-y-2 bg-stone-50/50 p-4 rounded-2xl border border-stone-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#104C64] tracking-wider">Promotional Code</span>
                      <button 
                        onClick={() => {
                          setIsPromoExpanded(false);
                          setPromoError(null);
                          setPromoSuccess(null);
                        }} 
                        className="text-[9px] text-stone-400 hover:text-stone-600 font-sans cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value)}
                        placeholder="e.g. IPN40M"
                        disabled={isPromoVerifying}
                        className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-[#104C64] placeholder:font-sans placeholder:normal-case placeholder:text-[10px]"
                      />
                      <button
                        onClick={handleVerifyPromoCode}
                        disabled={isPromoVerifying || !promoCodeInput.trim()}
                        className="px-4 py-1.5 bg-[#104C64] hover:bg-[#0D3E52] disabled:bg-stone-200 disabled:text-stone-400 transition-colors text-white text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                      >
                        {isPromoVerifying ? "Applying..." : "Apply"}
                      </button>
                    </div>

                    {promoError && (
                      <p className="text-[9px] text-rose-500 font-medium font-sans">
                        ⚠️ {promoError}
                      </p>
                    )}

                    {promoSuccess && (
                      <p className="text-[9px] text-emerald-600 font-bold font-sans">
                        ✓ {promoSuccess}
                      </p>
                    )}
                    
                    <p className="text-[8px] text-stone-350 font-sans leading-normal">
                      Enter code TEST10 (10 users limit) to unlock the premium suite instantly, or IPN40M (40 users limit) to unlock Assessment 5.
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Payment Mode Selection and Input Flow */}
              <div className="border-t border-stone-100 pt-4 text-left space-y-3">
                <label className="text-[9px] font-black text-[#104C64] uppercase tracking-wider block">
                  Select Payment Method
                </label>
                
                {/* Mode tabs */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-1 rounded-xl border font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-[#104C64] bg-[#104C64]/5 text-[#104C64]'
                        : 'border-stone-200 hover:border-stone-350 text-stone-550'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 px-1 rounded-xl border font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'border-[#104C64] bg-[#104C64]/5 text-[#104C64]'
                        : 'border-stone-200 hover:border-stone-350 text-stone-550'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>UPI ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`py-2 px-1 rounded-xl border font-mono text-[8.5px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      paymentMethod === 'netbanking'
                        ? 'border-[#104C64] bg-[#104C64]/5 text-[#104C64]'
                        : 'border-stone-200 hover:border-stone-350 text-stone-550'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Netbank</span>
                  </button>
                </div>

                {/* Details Section accordingly */}
                <div className="bg-stone-50/50 border border-stone-150 p-4 rounded-3xl space-y-3">
                  {paymentMethod === 'card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="CARDHOLDER NAME"
                          className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">Card Number</label>
                        <input
                          type="text"
                          value={cardNo}
                          onChange={(e) => setCardNo(e.target.value)}
                          placeholder="4111 2222 3333 4444"
                          className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                          maxLength={19}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardEx}
                            onChange={(e) => setCardEx(e.target.value)}
                            placeholder="12/29"
                            className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                            maxLength={5}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">CVV</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="777"
                            className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                            maxLength={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block">UPI VPA Address</label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. success@razorpay"
                          className="w-full mt-1 px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2]"
                        />
                        <span className="text-[8.5px] text-stone-400 font-sans mt-1 block">
                          Tip: Use <strong>success@razorpay</strong> in mock modes to auto-approve.
                        </span>
                      </div>
                      
                      {/* Dynamic QR code simulation */}
                      <div className="bg-white border border-stone-150 p-3 rounded-2xl flex items-center gap-4">
                        <div className="w-14 h-14 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-10 h-10 text-stone-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="2" width="6" height="6" rx="1" />
                            <rect x="2" y="14" width="6" height="6" rx="1" />
                            <rect x="14" y="2" width="6" height="6" rx="1" />
                            <path d="M14 14h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm-4 4h2v2h-2zm6 0h2v2h-2zm-6 2h4v2h-4z" />
                          </svg>
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[9px] font-black text-[#104C64] uppercase tracking-wider">Dynamic QR Code</h5>
                          <p className="text-[8.5px] text-stone-550 font-sans leading-normal">
                            A custom scan-ready QR code matching your inputs will render instantly inside Razorpay.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] font-black text-stone-400 uppercase tracking-wider block mb-1">Select Bank</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-stone-750 text-xs font-mono rounded-xl border border-stone-200 focus:outline-none focus:border-[#41B1C2] cursor-pointer"
                        >
                          <option value="HDFC">HDFC Bank</option>
                          <option value="SBIN">State Bank of India</option>
                          <option value="ICIC">ICICI Bank</option>
                          <option value="UTIB">Axis Bank</option>
                          <option value="KKBK">Kotak Mahindra Bank</option>
                          <option value="PUNB">Punjab National Bank</option>
                          <option value="BARB">Bank of Baroda</option>
                        </select>
                      </div>
                      <p className="text-[8.5px] text-stone-400 font-sans leading-relaxed">
                        Secure instant checkout is optimized for your chosen bank.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleProcessEnterprisePayment}
                disabled={isCorporatePaying}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-stone-300 disabled:to-stone-400 transition-all text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-lg cursor-pointer flex items-center justify-center gap-2 border border-amber-400/10 active:scale-95"
              >
                {isCorporatePaying ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1" />
                    Processing Payment with Razorpay...
                  </>
                ) : (
                  <>
                    Pay & Activate Suite with Razorpay (INR 2,999)
                  </>
                )}
              </button>

              <span className="text-[8.5px] font-sans font-medium text-stone-400 block text-center animate-pulse">
                🔒 Enterprise class 256-bit SSL secured transmission protocol.
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Upgrade Success Celebration Modal */}
      <AnimatePresence>
        {isPremiumSuccessModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPremiumSuccessModalOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full border border-stone-200 shadow-2xl relative z-10 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto border border-amber-200">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wider">Welcome to BeyondEQ Premium</h3>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  Your account has been successfully upgraded to the Premium Tier! Absolute access to advanced organizational tools is now active.
                </p>
              </div>
              
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-150 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-stone-855 uppercase tracking-wider">360° Matrix unlocked</h4>
                    <p className="text-[10px] text-stone-500 font-sans mt-0.5">Simulate actual feedback coordinates and aggregate observer protocols instantly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-stone-855 uppercase tracking-wider">Professional Assignments active</h4>
                    <p className="text-[10px] text-stone-500 font-sans mt-0.5">Set high-speed action checklists and log actual behavioral breakthroughs.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-stone-855 uppercase tracking-wider">Reflective Intelligence Gym</h4>
                    <p className="text-[10px] text-stone-500 font-sans mt-0.5">Structured journals, emotional tracking, and self-evaluation logs.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsPremiumSuccessModalOpen(false)}
                className="w-full py-4 bg-[#104C64] text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0D3E52] transition-colors shadow-lg cursor-pointer"
              >
                Let's Begin
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
      {/* 30-Day Streak Synergy Premium Success Celebration Modal */}
      <AnimatePresence>
        {isStreakPromoSuccessOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStreakPromoSuccessOpen(false)}
              className="fixed inset-0 bg-stone-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full border-2 border-amber-400 shadow-2xl relative z-10 text-center space-y-6 overflow-hidden"
            >
              {/* Flashy corner gradient ribbons */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />
              
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full flex items-center justify-center text-white mx-auto border-4 border-amber-100 shadow-lg animate-bounce">
                <Flame className="w-10 h-10 fill-white" />
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  🔥 30-Day Joint Habit Achieved!
                </span>
                <h3 className="text-2xl font-black text-[#104C64] uppercase tracking-wider">
                  Synergy Unlocked!
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  Tremendous work! You and your partner <strong>{streakPromoFriendName || 'your partner'}</strong> successfully maintained an extraordinary <strong>30-Day EQ Streak</strong>! 
                </p>
                <p className="text-xs font-black text-rose-600 bg-rose-50/50 border border-rose-100 rounded-2xl py-3 px-4">
                  💎 As promised, BOTH of your accounts have been upgraded to BEYONDEQ PREMIUM free for a full month!
                </p>
              </div>
              
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-150 text-left space-y-3">
                <h4 className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.2em] mb-1">Your Premium Powers:</h4>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-bold text-stone-855 uppercase tracking-wider">360° Diagnostic Matrix</h5>
                    <p className="text-[9.5px] text-stone-500 font-sans mt-0.5">Invite core teammates to rate, analyze, and map multi-rater EQ perspectives.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[10px] font-bold text-stone-855 uppercase tracking-wider">High-Stakes Coaching Assignments</h5>
                    <p className="text-[9.5px] text-stone-500 font-sans mt-0.5">Integrate peer interaction logs, dynamic stress templates, and real-time trackers.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsStreakPromoSuccessOpen(false)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg cursor-pointer animate-pulse"
              >
                Claim Premium Access 🔥
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tool 5 Free Promo Access Success Celebration Modal */}
      <AnimatePresence>
        {isTool5SuccessModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTool5SuccessModalOpen(false)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full border border-stone-200 shadow-2xl relative z-10 text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-200">
                <Sparkles className="w-8 h-8 animate-pulse animate-bounce" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-emerald-800 uppercase tracking-wider">Assessment 5 Unlocked</h3>
                <p className="text-xs text-stone-600 leading-relaxed font-sans">
                  The exclusive Unified Toolkit Report (Assessment 5) has been unlocked for your account free of charge!
                </p>
              </div>
              
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-150 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-stone-855 uppercase tracking-wider">Consolidated Synthesis Active</h4>
                    <p className="text-[10px] text-stone-500 font-sans mt-0.5">Harmonize Values, Culture, Performance, and EQ Driver scores side by side.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold text-stone-855 uppercase tracking-wider">Dynamic Strategic Roadmap</h4>
                    <p className="text-[10px] text-stone-500 font-sans mt-0.5">Obtain a print-ready causal-chain analysis that links culture directly to execution.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsTool5SuccessModalOpen(false)}
                className="w-full py-4 bg-emerald-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg cursor-pointer"
              >
                Access Unified Toolkit Report
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReportOpen && (
          <DiagnosticReport profile={profile} onClose={() => setIsReportOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
