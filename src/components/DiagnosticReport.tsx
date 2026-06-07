import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, Shield, Users, Brain, Activity, Compass, Heart, Sparkles, 
  Printer, ArrowLeft, CheckCircle2, TrendingUp, TrendingDown, Info, Lock, Download,
  AlertTriangle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  SKILLS, 
  EMM_THRESHOLDS, 
  SHADOW, 
  TOOLS, 
  SKILL_GAPS, 
  calculateThreeSixtyResults 
} from '../lib/threeSixtySkills';

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

interface DiagnosticReportProps {
  profile: any;
  onClose: () => void;
}

export default function DiagnosticReport({ profile, onClose }: DiagnosticReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [isPrintIframeWarnOpen, setIsPrintIframeWarnOpen] = useState(false);

  const name = profile?.name || 'Anonymous User';
  const email = profile?.email || 'user@beyondeq.org';

  // HELPER: Convert old profiles on-the-fly to support the new 15-skill schema
  const getFallbackScores = (pscores: any) => {
    const answers: Record<string, number> = {};
    const impacts: Record<string, number> = {};
    
    SKILLS.forEach(skill => {
      let baseScore = 3; // "Consistently"
      const traitKeyMapping: Record<string, string> = {
        SR: 'SR', CI: 'CI', AR: 'CI', PR: 'CI', CM: 'IP', L: 'RA', CN: 'CN', AD: 'SR', IP: 'IP', OB: 'CI', EX: 'RA', RA: 'RA', SA: 'CI', EM: 'RA', ST: 'ST'
      };
      const oldKey = traitKeyMapping[skill.key] || 'SR';
      const oldScore = pscores?.[oldKey];
      if (oldScore !== undefined) {
        baseScore = Math.max(1, Math.min(4, Math.round(1 + ((oldScore - 10) / 30))));
      }
      
      skill.statements.forEach(stmt => {
        if (stmt.reverse) {
          answers[stmt.id] = baseScore <= 2 ? 4 : (baseScore === 3 ? 2 : 1);
        } else {
          answers[stmt.id] = baseScore;
        }
      });
      impacts[skill.key] = baseScore;
    });
    return { answers, impacts };
  };

  // Extract self answers
  const selfAnswers = profile?.threeSixtySelfAnswers || {};
  const selfImpacts = profile?.threeSixtySelfImpacts || {};
  const activeSelfAnswers = Object.keys(selfAnswers).length > 0 
    ? selfAnswers 
    : getFallbackScores(profile?.selfDiscoveryScores || { SR: 50, CI: 50, RA: 50, ST: 50, C: 50, CN: 50, IP: 50 }).answers;
  const activeSelfImpacts = Object.keys(selfImpacts).length > 0 
    ? selfImpacts 
    : getFallbackScores(profile?.selfDiscoveryScores || { SR: 50, CI: 50, RA: 50, ST: 50, C: 50, CN: 50, IP: 50 }).impacts;

  // Extract observer answers
  const observersList = profile?.selfDiscoveryObserversPlan?.observers || [];
  const completedObservers = observersList.filter((o: any) => o.status === 'Feedback Received');

  const processedObservers = completedObservers.map((o: any) => {
    const oAnswers = o.responses || o.threeSixtyAnswers || {};
    const oImpacts = o.impacts || o.threeSixtyImpacts || {};
    
    if (Object.keys(oAnswers).length === 0) {
      const fallback = getFallbackScores(o.scores || { SR: 78, CI: 84, RA: 81, ST: 72, C: 88, CN: 79, IP: 82 });
      return {
        name: o.name,
        relationship: o.relationship,
        responses: fallback.answers,
        impacts: fallback.impacts
      };
    }
    
    return {
      name: o.name,
      relationship: o.relationship,
      responses: oAnswers,
      impacts: oImpacts
    };
  });

  // Calculate standard 15-skill results
  const reportData = calculateThreeSixtyResults(activeSelfAnswers, activeSelfImpacts, processedObservers);
  const {
    skillResults,
    confidence,
    obsCount,
    catCoverage,
    overallLevel,
    levelInfo,
    overallPct,
    gatingNote,
    splitNote,
    topGaps,
    reverseFlags
  } = reportData;

  const confClass = {
    high: 'bg-emerald-50 text-emerald-800 border-emerald-250',
    moderate: 'bg-amber-50 text-amber-800 border-amber-250',
    low: 'bg-rose-50 text-rose-800 border-rose-250'
  }[confidence] || 'bg-stone-50 text-stone-600 border-stone-250';

  const catMap: Record<string, number> = {};
  processedObservers.forEach(od => {
    const rel = od.relationship?.toLowerCase() || 'peer';
    catMap[rel] = (catMap[rel] || 0) + 1;
  });

  const PATTERN_LABELS: Record<string, React.ReactNode> = {
    inflation: <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-150">Inflation</span>,
    deflation: <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-150">Deflation</span>,
    aligned: <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-150">Aligned</span>,
    split: <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-150">Split Observer</span>,
    insufficient: <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-stone-50 text-stone-400 border border-stone-150">Insufficient Data</span>
  };

  const SPLIT_DESC: Record<string, string> = {
    '4A': 'Above high / Below low — power-dependent behavior. Capability appears in upward relationships more than downward ones.',
    '4B': 'Below high / Above low — comfort-dependent behavior. Capability is more available in informal contexts than formal authority relationships.',
    '4C': 'Peer high — lateral comfort. Strongest capability appears with equals; drops in both directions of power differential.',
    '4D': 'Personal high / Professional low — context compartmentalization. Capability exists in personal contexts that is not yet fully available professionally.',
  };

  const tierNames = {
    1: 'Diagnostic Core',
    2: 'Behavioral Evidence',
    3: 'Developmental Indicators'
  };

  // Action download helper
  const handlePrint = async () => {
    if (!reportRef.current) return;
    setDownloading(true);

    const sanitizeOklchStylesheets = async (targetEl: HTMLElement) => {
      const styleElements = Array.from(document.querySelectorAll('style'));
      const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      
      const originalStyles = new Map<HTMLStyleElement, string>();
      const disabledLinks: { linkEl: HTMLLinkElement; tempStyleEl: HTMLStyleElement }[] = [];
      const elementsWithInlineStyles: { el: HTMLElement; originalStyle: string }[] = [];

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

      for (let i = 0; i < linkElements.length; i++) {
        const linkEl = linkElements[i];
        try {
          const href = linkEl.href;
          if (href && (href.startsWith('/') || href.startsWith(window.location.origin))) {
            const response = await fetch(href);
            if (response.ok) {
              const cssText = await response.text();
              if (cssText && (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('hwb') || cssText.includes('lab') || cssText.includes('lch') || cssText.includes('color('))) {
                const sanitized = replaceColorsInString(cssText);
                const tempStyleEl = document.createElement('style');
                tempStyleEl.textContent = sanitized;
                document.head.appendChild(tempStyleEl);
                linkEl.disabled = true;
                disabledLinks.push({ linkEl, tempStyleEl });
              }
            }
          }
        } catch (e) {}
      }

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
        } catch (e) {}
      });

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
        originalStyles.forEach((cssText, styleEl) => {
          try { styleEl.textContent = cssText; } catch (e) {}
        });
        disabledLinks.forEach(({ linkEl, tempStyleEl }) => {
          try {
            linkEl.disabled = false;
            if (tempStyleEl.parentNode) tempStyleEl.parentNode.removeChild(tempStyleEl);
          } catch (e) {}
        });
        elementsWithInlineStyles.forEach(({ el, originalStyle }) => {
          try { el.setAttribute('style', originalStyle); } catch (e) {}
        });
        CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
        colorProperties.forEach(prop => {
          if (originalGetters[prop]) {
            Object.defineProperty(CSSStyleDeclaration.prototype, prop, {
              get: originalGetters[prop],
              configurable: true
            });
          }
        });
        window.getComputedStyle = originalGetComputedStyle;
      };
    };

    let restoreStyles = () => {};
    try {
      restoreStyles = await sanitizeOklchStylesheets(reportRef.current);
    } catch (e) {}

    try {
      const element = reportRef.current;
      const originalStyle = element.style.height;
      const originalOverflow = element.style.overflow;
      const originalWidth = element.style.width;
      const originalMaxHeight = element.style.maxHeight;
      
      element.style.height = 'auto';
      element.style.overflow = 'visible';
      element.style.maxHeight = 'none';
      
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
              const origIframeGetPropVal = clonedWindow.CSSStyleDeclaration.prototype.getPropertyValue;
              clonedWindow.CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
                const val = origIframeGetPropVal.call(this, property);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('hwb') || val.includes('lab') || val.includes('lch') || val.includes('color('))) {
                  return replaceColorsInString(val);
                }
                return val;
              };
              
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

            // Also proxy the window.getComputedStyle inside the cloned Window to normalize oklch
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
          }
        }
      });

      element.style.height = originalStyle;
      element.style.overflow = originalOverflow;
      element.style.width = originalWidth;
      element.style.maxHeight = originalMaxHeight;

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

      const cleanName = name ? name.replace(/\s+/g, '_') : 'Executive';
      docPdf.save(`BeyondEQ_360_Diagnostic_Report_${cleanName}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ PDF Download Sandbox Alert:\n\nIf you are on the AI Studio preview window, please open the app in a new tab to bypass iframe sandboxing restrictions.\n\nError details: ${err?.message || err}`);
    } finally {
      restoreStyles();
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 overflow-y-auto px-4 py-8 md:p-12 flex justify-center font-sans select-none print:bg-white print:p-0 print:absolute print:inset-0">
      <div 
        className="bg-white max-w-4xl w-full rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col md:border border-stone-200 print:shadow-none print:border-none print:rounded-none selection:bg-[#41B1C2] selection:text-white"
      >
        {/* INTERACTIVE NAVIGATION CONTROL BAR */}
        <div className="bg-stone-50 border-b border-stone-200/60 px-8 py-5 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-20 print:hidden shadow-sm">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex gap-3">
            <button 
              onClick={handlePrint}
              disabled={downloading}
              className="px-5 py-2.5 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Compiling PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  Download 360 Report PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* PRINTABLE CANVAS BODY */}
        <div 
          ref={reportRef}
          className="p-8 md:p-16 space-y-12 bg-white flex-1 overflow-y-auto print:p-0 print:overflow-visible"
        >
          
          {/* CONFIDENTIAL BRANDING HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 border-b border-stone-200">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#41B1C2] block">
                BEYONDEQ · HUMANEDGE 3.0
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-[#104C64] uppercase tracking-tight italic">
                360° Relational <span className="font-serif not-italic font-normal text-[#41B1C2] lowercase">diagnostic</span>
              </h1>
            </div>
            
            <div className="text-left sm:text-right font-sans shrink-0">
              <div className="text-[9px] font-black uppercase tracking-widest text-orange-700 bg-orange-50 px-3 py-1 rounded border border-orange-120 inline-block mb-1">
                Confidential Feedback Matrix
              </div>
              <p className="text-[10px] text-stone-400 font-mono">Compiled: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* IN-PROGRESS WARNING BANNER */}
          {completedObservers.length === 0 && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4 animate-fadeIn print:hidden">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-xs text-stone-700 leading-relaxed font-sans">
                <p className="font-bold text-amber-900 uppercase tracking-wide text-[10px]">In-Progress Self-Reflection Baseline Report</p>
                <p className="text-[11px] text-stone-600 leading-normal">
                  You are viewing an in-progress draft of your 360° Diagnostic Report. Currently, no observer feedback has been recorded, so all scores and developmental insights are mapped using your <strong>Self-Discovery reflection answers</strong> as a baseline.
                </p>
                <p className="text-stone-800 font-medium">
                  <strong>What to do:</strong> Invite observers (direct reports, peers, bosses) to log comparative feedback. This will automatically compile objective multi-rater capability matrices and unlock relational gap analysis!
                </p>
              </div>
            </div>
          )}

          {/* APP STATEMENT BAR */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center bg-[#104C64]/5 p-8 rounded-3xl border border-[#104C64]/10">
            <div className="md:col-span-3 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-widest bg-[#104C64] text-white px-3 py-1 rounded">
                Executive Profile Summary
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-stone-900 leading-tight">
                {name} <span className="text-stone-400 font-normal text-sm block lowercase font-serif italic mb-1">({email})</span>
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 font-mono text-[10px] text-stone-500">
                <div>
                  <strong>Session Code:</strong> {(profile as any)?.threeSixtySessionCode || "9A4C1B"}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${confidence === 'high' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <strong>Confidence Index:</strong> {confidence.toUpperCase()} ({obsCount} Observers)
                </div>
                <div>
                  <strong>Category Coverage:</strong> {catCoverage}/4 groups
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border border-[#104C64]/15 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm shrink-0">
              <Award className="w-8 h-8 text-amber-500" />
              <div className="space-y-0.5">
                <span className="text-[9px] text-[#104C64] font-black uppercase tracking-widest block">EMM Maturity Level</span>
                <span className="text-xl font-black text-[#104C64] tracking-tight">Level {overallLevel}</span>
                <span className="text-[9px] bg-stone-100 px-2 py-0.5 rounded font-black text-stone-500 uppercase tracking-widest block">{levelInfo.name}</span>
              </div>
            </div>
          </div>

          {/* MATURITY SUMMARY INFOBAR */}
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <h4 className="text-[11px] font-bold text-[#104C64] uppercase tracking-wider">Level {overallLevel} Profile: {levelInfo.tagline}</h4>
            <p className="text-xs text-stone-600 font-sans leading-relaxed">
              Based on consolidated observer ratings, your emotional intelligence maturity maps to <strong>{levelInfo.name}</strong>. Level {overallLevel} represents how your core social, regulatory, and communicative habits manifest across power groups, de-activated from stress loops.
            </p>
          </div>

          {/* GATING / SPLIT FLAGS ALERTS */}
          {(gatingNote || splitNote || reverseFlags > 2) && (
            <div className="space-y-3 print:space-y-3">
              {gatingNote && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-sans">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Gating Threshold Rule Applied: </strong>
                    {gatingNote}
                  </div>
                </div>
              )}
              {splitNote && (
                <div className="p-4 bg-orange-50 border border-orange-200 text-orange-950 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-sans">
                  <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Split Override Applied: </strong>
                    {splitNote}
                  </div>
                </div>
              )}
              {reverseFlags > 2 && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl flex items-start gap-3 text-xs leading-relaxed font-sans">
                  <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Consistency Flag: </strong>
                    Your self-assessment answers indicated conflicting behavior on {reverseFlags} skills (rating both the positive capability and its reverse as high). This often implies variable behavior under pressure or a gap in self-perception standards.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN 15 SKILLS TABLE COMPILATION */}
          <div className="space-y-6">
            <div className="border-b border-stone-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[#104C64] pl-1">
                Comparative Skill Profile - 15 Diagnostic Vectors
              </h3>
            </div>

            <div className="space-y-8 font-sans">
              {([1, 2, 3] as const).map(tierKey => {
                const tierSkills = skillResults.filter(r => r.skill.tier === tierKey);
                
                return (
                  <div key={tierKey} className="space-y-4">
                    <h5 className="text-[9.5px] font-black uppercase tracking-widest text-[#41B1C2] border-b border-stone-100 pb-1">
                      Tier {tierKey} — {tierNames[tierKey]}
                    </h5>

                    <div className="space-y-5">
                      {tierSkills.map(r => {
                        const selfFillPercent = r.selfAvg ? Math.round(((r.selfAvg - 1) / 3) * 100) : 0;
                        const obsFillPercent = r.obsAvg ? Math.round(((r.obsAvg - 1) / 3) * 100) : 0;
                        const catColors: Record<string, string> = { above: '#C4A882', peer: '#8B7FD4', below: '#5DB89A', personal: '#888888' };

                        return (
                          <div key={r.skill.key} className="p-5 bg-stone-50/40 hover:bg-stone-50/80 transition-all border border-stone-150 rounded-3xl space-y-4">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-black text-[#104C64] uppercase tracking-wide">{r.skill.name} ({r.skill.key})</h4>
                                <p className="text-[10px] text-stone-500 font-sans max-w-xl">{r.skill.iQ}</p>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono text-[10px]">
                                <div className="text-center font-sans">
                                  <span className="text-[8px] text-stone-400 font-bold uppercase block">Self</span>
                                  <strong className="text-[#104C64] text-xs font-mono">{r.selfAvg ? r.selfAvg.toFixed(1) : '—'}</strong>
                                </div>
                                <div className="w-[1px] h-5 bg-stone-200" />
                                <div className="text-center font-sans">
                                  <span className="text-[8px] text-[#41B1C2] font-bold uppercase block">Obs Avg</span>
                                  <strong className="text-[#41B1C2] text-xs font-mono">{r.obsAvg ? r.obsAvg.toFixed(1) : '—'}</strong>
                                </div>
                                <div className="w-[1px] h-5 bg-stone-200" />
                                <div className="text-center">
                                  {PATTERN_LABELS[r.pattern] || PATTERN_LABELS.insufficient}
                                </div>
                              </div>
                            </div>

                            {/* Double relative sliders */}
                            <div className="space-y-2">
                              {/* Self score bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[8px] text-stone-400 uppercase font-black tracking-widest">
                                  <span>Self Reflective Profile</span>
                                  <span>{selfFillPercent}%</span>
                                </div>
                                <div className="h-2 bg-stone-150 rounded-full overflow-hidden">
                                  <div style={{ width: `${selfFillPercent}%` }} className="h-full bg-stone-400 rounded-full" />
                                </div>
                              </div>

                              {/* Observer composite bar */}
                              {r.obsAvg !== null && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[8px] text-[#41B1C2] uppercase font-black tracking-widest">
                                    <span>Observer Composite</span>
                                    <span>{obsFillPercent}%</span>
                                  </div>
                                  <div className="h-2 bg-stone-150 rounded-full overflow-hidden">
                                    <div style={{ width: `${obsFillPercent}%` }} className="h-full bg-[#41B1C2] rounded-full" />
                                  </div>
                                </div>
                              )}

                              {/* Categorical dots */}
                              <div className="flex flex-wrap gap-4 pt-1 text-[9px] font-sans text-stone-500">
                                {Object.entries(r.catAvgs).map(([cat, val]) => {
                                  if (val === null) return null;
                                  return (
                                    <div key={cat} className="flex items-center gap-1">
                                      <span style={{ backgroundColor: catColors[cat] }} className="w-2 h-2 rounded-full inline-block" />
                                      <span className="capitalize">{cat}: {val.toFixed(1)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="page-break-before print:pt-12" style={{ pageBreakBefore: 'always' }} />

          {/* DYNAMIC SPLIT RELATIONSHIPS DIAGNOSTIC */}
          {skillResults.some(r => r.pattern === 'split') && (
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[#104C64] border-l-2 border-[#104C64] pl-3.5">
                Primary Diagnostic: Split Relationship Signage
              </h3>
              <p className="text-xs text-stone-600 font-sans max-w-3xl leading-relaxed">
                A <strong>Split pattern</strong> indicates that your emotional performance shifts fundamentally depending on who holds relational or positional power. This is the single most valuable developmental indicator inside your 360° metrics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skillResults.filter(r => r.pattern === 'split').map(r => (
                  <div key={r.skill.key} className="p-5 border border-purple-200/60 bg-purple-50/20 rounded-3xl space-y-2">
                    <h4 className="text-xs font-black text-purple-950 uppercase tracking-wide">
                      {r.skill.name} — {r.splitConfig}
                    </h4>
                    <p className="text-[10px] text-purple-900 leading-normal font-sans">
                      {r.splitConfig ? SPLIT_DESC[r.splitConfig] : "Variable perspective."}
                    </p>
                    <p className="text-[10.5px] text-stone-600 font-sans font-medium pt-1">
                      <strong>Diagnostic Signal:</strong> A rating差 (gap) of <strong>{r.splitGap.toFixed(1)} pts</strong> exists between distinct relationship cohorts.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP 3 DEVELOPMENT GAPS */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.22em] text-[#104C64] border-l-2 border-[#104C64] pl-3.5">
              Top 3 Relational Development Gaps
            </h3>
            
            <div className="space-y-4 font-sans text-xs">
              {topGaps.map((r, idx) => (
                <div key={r.skill.key} className="p-5 bg-stone-50/70 border border-stone-200 rounded-3xl flex items-start gap-4">
                  <span className="w-6 h-6 rounded-lg bg-[#104C64] text-white font-bold flex items-center justify-center text-xs shrink-0">{idx + 1}</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-900 uppercase">
                      {r.skill.name} — Observer Avg: {r.obsAvg?.toFixed(1)} / 4.0
                    </h4>
                    <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                      {SKILL_GAPS[r.skill.key] || "Prioritize coaching practices and interactive audits to elevate peer-level composure."}
                    </p>
                    {r.pattern === 'inflation' && (
                      <p className="text-[10px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg inline-block border border-rose-100 font-mono mt-1">
                        ⚠️ <strong>Inflation Gap:</strong> Your self-rating ({r.selfAvg?.toFixed(1)}) was significantly higher than observer compositeness ({r.obsAvg?.toFixed(1)}).
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SHADOW RISK */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 items-stretch font-sans text-xs">
            <div className="p-6 bg-stone-900 text-stone-100 rounded-3xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Level {overallLevel} Shadow Risks</h4>
              <p className="text-[11px] leading-relaxed text-stone-300">
                {SHADOW[overallLevel]}
              </p>
            </div>

            <div className="p-6 bg-[#104C64]/5 border border-[#104C64]/10 rounded-3xl flex flex-col justify-between">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#104C64]">Priority Training Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {(TOOLS[overallLevel] || []).map(tool => (
                    <span key={tool} className="px-3 py-1 bg-white border border-[#104C64]/10 text-[#104C64] hover:text-stone-900 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white border border-stone-150 rounded-2xl text-[10px] text-stone-500 leading-relaxed font-sans mt-4">
                👉 <strong>Operational Debrief Required:</strong> These metrics compile behavioral vectors — not diagnoses. A trained facilitator is recommended to outline durable calibration goals.
              </div>
            </div>
          </div>

          {/* COMPLETED SIGNATURE TRACK */}
          <div className="pt-16 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-8 font-sans items-end print:pt-16">
            <div className="space-y-4 text-left">
              <div className="h-0.5 bg-stone-300 w-44" />
              <div>
                <span className="text-xs font-black text-stone-900 uppercase block">{name}</span>
                <span className="text-[9px] text-[#104C64] font-black uppercase tracking-wider">Executive Leader nominee</span>
              </div>
            </div>
            
            <div className="space-y-4 text-left md:text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#104C64] inline-block font-mono">
                BEYONDEQ ACADEMY
              </div>
              <p className="text-[9px] text-stone-400">Validated 360° Diagnostic Matrix Protocol V3.0</p>
            </div>
          </div>

        </div>
      </div>

      {/* Printer modal */}
      <AnimatePresence>
        {isPrintIframeWarnOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white p-8 rounded-[30px] border border-stone-200 shadow-2xl relative overflow-hidden text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-amber-50 mx-auto flex items-center justify-center">
                <Printer className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>
              <h3 className="text-xl font-black text-[#104C64] uppercase tracking-wide">Iframe Print Block</h3>
              <p className="text-xs text-stone-600 font-sans leading-relaxed">
                Browser controls prohibit os printing within frame sandboxes. Please open our applet outside the iframe using the "Open in new tab" icon.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setIsPrintIframeWarnOpen(false)}
                  className="px-5 py-2.5 bg-stone-100 text-stone-700 text-[9.5px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
