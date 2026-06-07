import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Zap, Heart, Sparkles, Brain, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmotionDetail {
  title: string;
  definition: string;
  biological: string;
  color: string;
}

interface Node {
  id: string;
  label: string;
  color: string;
  children?: Node[];
  biology?: string;
  definition?: string;
}

const emotionHierarchy: Node[] = [
  {
    id: 'fearful',
    label: 'Fearful',
    color: '#F57C00', // Deep Orange
    children: [
      { id: 'scared', label: 'Scared', color: '#FFA726', children: [{ id: 'frightened', label: 'Frightened', color: '#FFCC80' }, { id: 'helpless', label: 'Helpless', color: '#FFCC80' }] },
      { id: 'anxious', label: 'Anxious', color: '#FFA726', children: [{ id: 'worried', label: 'Worried', color: '#FFCC80' }, { id: 'overwhelmed_fear', label: 'Overwhelmed', color: '#FFCC80' }] },
      { id: 'insecure', label: 'Insecure', color: '#FFA726', children: [{ id: 'inferior_insecure', label: 'Inferior', color: '#FFCC80' }, { id: 'inadequate', label: 'Inadequate', color: '#FFCC80' }] },
      { id: 'weak', label: 'Weak', color: '#FFA726', children: [{ id: 'insignificant', label: 'Insignificant', color: '#FFCC80' }, { id: 'worthless', label: 'Worthless', color: '#FFCC80' }] },
      { id: 'rejected', label: 'Rejected', color: '#FFA726', children: [{ id: 'persecuted', label: 'Persecuted', color: '#FFCC80' }, { id: 'excluded', label: 'Excluded', color: '#FFCC80' }] },
      { id: 'threatened', label: 'Threatened', color: '#FFA726', children: [{ id: 'exposed', label: 'Exposed', color: '#FFCC80' }, { id: 'nervous', label: 'Nervous', color: '#FFCC80' }] },
    ]
  },
  {
    id: 'angry',
    label: 'Angry',
    color: '#D32F2F', // Deep Red
    children: [
      { id: 'let_down', label: 'Let down', color: '#EF5350', children: [{ id: 'resentful', label: 'Resentful', color: '#FFCDD2' }, { id: 'betrayed', label: 'Betrayed', color: '#FFCDD2' }] },
      { id: 'humiliated', label: 'Humiliated', color: '#EF5350', children: [{ id: 'ridiculed', label: 'Ridiculed', color: '#FFCDD2' }, { id: 'disrespected', label: 'Disrespected', color: '#FFCDD2' }] },
      { id: 'bitter', label: 'Bitter', color: '#EF5350', children: [{ id: 'violated', label: 'Violated', color: '#FFCDD2' }, { id: 'indignant', label: 'Indignant', color: '#FFCDD2' }] },
      { id: 'mad', label: 'Mad', color: '#EF5350', children: [{ id: 'jealous', label: 'Jealous', color: '#FFCDD2' }, { id: 'furious', label: 'Furious', color: '#FFCDD2' }] },
      { id: 'aggressive', label: 'Aggressive', color: '#EF5350', children: [{ id: 'hostile', label: 'Hostile', color: '#FFCDD2' }, { id: 'provoked', label: 'Provoked', color: '#FFCDD2' }] },
      { id: 'frustrated', label: 'Frustrated', color: '#EF5350', children: [{ id: 'annoyed', label: 'Annoyed', color: '#FFCDD2' }, { id: 'infuriated', label: 'Infuriated', color: '#FFCDD2' }] },
      { id: 'distant', label: 'Distant', color: '#EF5350', children: [{ id: 'numb', label: 'Numb', color: '#FFCDD2' }, { id: 'withdrawn', label: 'Withdrawn', color: '#FFCDD2' }] },
      { id: 'critical', label: 'Critical', color: '#EF5350', children: [{ id: 'dismissive', label: 'Dismissive', color: '#FFCDD2' }, { id: 'sceptical', label: 'Sceptical', color: '#FFCDD2' }] },
    ]
  },
  {
    id: 'disgusted',
    label: 'Disgusted',
    color: '#455A64', // Dark Slate Blue Grey
    children: [
      { id: 'disapproving', label: 'Disapproving', color: '#78909C', children: [{ id: 'embarrassed_dis', label: 'Embarrassed', color: '#CFD8DC' }, { id: 'judgmental', label: 'Judgmental', color: '#CFD8DC' }] },
      { id: 'disappointed_dis', label: 'Disappointed', color: '#78909C', children: [{ id: 'revolted', label: 'Revolted', color: '#CFD8DC' }, { id: 'appalled', label: 'Appalled', color: '#CFD8DC' }] },
      { id: 'awful', label: 'Awful', color: '#78909C', children: [{ id: 'detestable', label: 'Detestable', color: '#CFD8DC' }, { id: 'nauseated', label: 'Nauseated', color: '#CFD8DC' }] },
      { id: 'repelled', label: 'Repelled', color: '#78909C', children: [{ id: 'hesitant', label: 'Hesitant', color: '#CFD8DC' }, { id: 'horrified', label: 'Horrified', color: '#CFD8DC' }] },
    ]
  },
  {
    id: 'sad',
    label: 'Sad',
    color: '#1976D2', // Deep Blue
    children: [
      { id: 'hurt', label: 'Hurt', color: '#42A5F5', children: [{ id: 'embarrassed_sad', label: 'Embarrassed', color: '#BBDEFB' }, { id: 'disappointed_sad', label: 'Disappointed', color: '#BBDEFB' }] },
      { id: 'depressed', label: 'Depressed', color: '#42A5F5', children: [{ id: 'empty', label: 'Empty', color: '#BBDEFB' }, { id: 'inferior_sad', label: 'Inferior', color: '#BBDEFB' }] },
      { id: 'guilty', label: 'Guilty', color: '#42A5F5', children: [{ id: 'remorseful', label: 'Remorseful', color: '#BBDEFB' }, { id: 'ashamed', label: 'Ashamed', color: '#BBDEFB' }] },
      { id: 'despair', label: 'Despair', color: '#42A5F5', children: [{ id: 'grief', label: 'Grief', color: '#BBDEFB' }, { id: 'powerless', label: 'Powerless', color: '#BBDEFB' }] },
      { id: 'vulnerable', label: 'Vulnerable', color: '#42A5F5', children: [{ id: 'fragile', label: 'Fragile', color: '#BBDEFB' }, { id: 'victimised', label: 'Victimised', color: '#BBDEFB' }] },
      { id: 'lonely', label: 'Lonely', color: '#42A5F5', children: [{ id: 'abandoned', label: 'Abandoned', color: '#BBDEFB' }, { id: 'isolated', label: 'Isolated', color: '#BBDEFB' }] },
    ]
  },
  {
    id: 'happy',
    label: 'Happy',
    color: '#FFD700', // Gold
    children: [
      { id: 'optimistic', label: 'Optimistic', color: '#FFE135', children: [{ id: 'inspired', label: 'Inspired', color: '#FFF4A3' }, { id: 'hopeful', label: 'Hopeful', color: '#FFF4A3' }] },
      { id: 'trusting', label: 'Trusting', color: '#FFE135', children: [{ id: 'intimate', label: 'Intimate', color: '#FFF4A3' }, { id: 'sensitive', label: 'Sensitive', color: '#FFF4A3' }] },
      { id: 'peaceful', label: 'Peaceful', color: '#FFE135', children: [{ id: 'thankful', label: 'Thankful', color: '#FFF4A3' }, { id: 'loving', label: 'Loving', color: '#FFF4A3' }] },
      { id: 'powerful', label: 'Powerful', color: '#FFE135', children: [{ id: 'creative', label: 'Creative', color: '#FFF4A3' }, { id: 'courageous', label: 'Courageous', color: '#FFF4A3' }] },
      { id: 'accepted', label: 'Accepted', color: '#FFE135', children: [{ id: 'valued', label: 'Valued', color: '#FFF4A3' }, { id: 'respected', label: 'Respected', color: '#FFF4A3' }] },
      { id: 'proud', label: 'Proud', color: '#FFE135', children: [{ id: 'confident', label: 'Confident', color: '#FFF4A3' }, { id: 'successful', label: 'Successful', color: '#FFF4A3' }] },
      { id: 'interested', label: 'Interested', color: '#FFE135', children: [{ id: 'inquisitive', label: 'Inquisitive', color: '#FFF4A3' }, { id: 'curious', label: 'Curious', color: '#FFF4A3' }] },
      { id: 'content', label: 'Content', color: '#FFE135', children: [{ id: 'joyful', label: 'Joyful', color: '#FFF4A3' }, { id: 'free', label: 'Free', color: '#FFF4A3' }] },
      { id: 'playful', label: 'Playful', color: '#FFE135', children: [{ id: 'cheeky', label: 'Cheeky', color: '#FFF4A3' }, { id: 'aroused', label: 'Aroused', color: '#FFF4A3' }] },
    ]
  },
  {
    id: 'surprised',
    label: 'Surprised',
    color: '#8E24AA', // Rich Purple
    children: [
      { id: 'excited', label: 'Excited', color: '#AB47BC', children: [{ id: 'energetic', label: 'Energetic', color: '#CE93D8' }, { id: 'eager', label: 'Eager', color: '#CE93D8' }] },
      { id: 'amazed', label: 'Amazed', color: '#AB47BC', children: [{ id: 'awe', label: 'Awe', color: '#CE93D8' }, { id: 'astonished', label: 'Astonished', color: '#CE93D8' }] },
      { id: 'confused', label: 'Confused', color: '#AB47BC', children: [{ id: 'perplexed', label: 'Perplexed', color: '#CE93D8' }, { id: 'disillusioned', label: 'Disillusioned', color: '#CE93D8' }] },
      { id: 'startled', label: 'Startled', color: '#AB47BC', children: [{ id: 'dismayed', label: 'Dismayed', color: '#CE93D8' }, { id: 'shocked', label: 'Shocked', color: '#CE93D8' }] },
    ]
  },
  {
    id: 'bad',
    label: 'Bad',
    color: '#43A047', // Forest Green
    children: [
      { id: 'tired', label: 'Tired', color: '#66BB6A', children: [{ id: 'unfocussed', label: 'Unfocussed', color: '#A5D6A7' }, { id: 'sleepy', label: 'Sleepy', color: '#A5D6A7' }] },
      { id: 'stressed', label: 'Stressed', color: '#66BB6A', children: [{ id: 'out_control', label: 'Out of control', color: '#A5D6A7' }, { id: 'overwhelmed_bad', label: 'Overwhelmed', color: '#A5D6A7' }] },
      { id: 'busy', label: 'Busy', color: '#66BB6A', children: [{ id: 'rushed', label: 'Rushed', color: '#A5D6A7' }, { id: 'pressured', label: 'Pressured', color: '#A5D6A7' }] },
      { id: 'bored', label: 'Bored', color: '#66BB6A', children: [{ id: 'apathetic', label: 'Apathetic', color: '#A5D6A7' }, { id: 'indifferent', label: 'Indifferent', color: '#A5D6A7' }] },
    ]
  }
];

// Helper to find node and its biological context
const getEmotionDetails = (node: Node): EmotionDetail => {
  const category = node.id.split('_')[0]; // simple way to group
  let biology = 'Standard neurological arousal pattern.';
  let definition = `A nuanced emotional state of being ${node.label.toLowerCase()}.`;

  if (node.label === 'Happy' || category === 'happy' || category === 'joyous' || category === 'content') {
    biology = 'Driven by Dopamine (reward) and Serotonin (stability). The prefrontal cortex shows increased metabolic activity.';
    definition = 'A state of well-being ranging from contentment to intense joy.';
  } else if (node.label === 'Sad' || category === 'sad' || category === 'depressed' || category === 'lonely') {
    biology = 'Linked to reduced Serotonin and Norepinephrine. Chronic states may involve HPA axis dysregulation.';
    definition = 'Emotional pain associated with loss, despair, or disappointment.';
  } else if (node.label === 'Angry' || category === 'angry' || category === 'rage' || category === 'hostile') {
    biology = 'Triggers the HPA axis. Adrenaline and Testosterone surge. Amygdala activity overrides the logic centers.';
    definition = 'A strong feeling of annoyance, displeasure, or hostility reaching various intensities.';
  } else if (node.label === 'Fearful' || category === 'fear' || category === 'anxious' || category === 'scared') {
    biology = 'Amygdala hijacking triggers the "Fight or Flight" response. High Cortisol and Noradrenaline levels alert the system.';
    definition = 'An unpleasant emotion caused by the perception of danger or threat, real or imagined.';
  } else if (node.label === 'Surprised' || category === 'surprised' || category === 'excited' || category === 'amazed') {
    biology = 'Brief cognitive interruption. Acetylcholine release facilitates rapid new learning and orienting toward the stimulus.';
    definition = 'The physiological and mental reaction to an unexpected event or discovery.';
  } else if (node.label === 'Disgusted' || category === 'disgusted' || category === 'repelled' || category === 'awful') {
    biology = 'Activation of the Insular Cortex. Nausea-related neural signals trigger evolutionary avoidance mechanisms.';
    definition = 'A feeling of revulsion or strong disapproval aroused by something perceived as offensive or unpleasant.';
  } else if (node.label === 'Bad' || category === 'bad' || category === 'stressed' || category === 'tired') {
    biology = 'Often signals metabolic depletion or chronic low-level stress. Elevated baseline Cortisol and sleep-debt indicators.';
    definition = 'A general state of discomfort, dissatisfaction, or depleted resources.';
  }

  return {
    title: node.label,
    definition: node.definition || definition,
    biological: node.biology || biology,
    color: node.color
  };
};

const WheelSegment = ({ 
  startAngle, 
  endAngle, 
  innerRadius, 
  outerRadius, 
  color, 
  label,
  onClick,
  level
}: { 
  startAngle: number; 
  endAngle: number; 
  innerRadius: number; 
  outerRadius: number; 
  color: string; 
  label: string;
  onClick: () => void;
  level: number;
}) => {
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const center = 0;
  const start = polarToCartesian(center, center, outerRadius, endAngle);
  const end = polarToCartesian(center, center, outerRadius, startAngle);
  const startInner = polarToCartesian(center, center, innerRadius, endAngle);
  const endInner = polarToCartesian(center, center, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  const d = [
    "M", start.x, start.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    "L", endInner.x, endInner.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    "Z"
  ].join(" ");

  const textAngle = startAngle + (endAngle - startAngle) / 2;
  const textRadius = innerRadius + (outerRadius - innerRadius) / 2;
  const textPos = polarToCartesian(center, center, textRadius, textAngle);

  // Dynamic orientation: Rotate the text to fit exactly into its block.
  // We compare the arc width vs radial height to decide orientation.
  const arcLen = textRadius * ((endAngle - startAngle) * Math.PI / 180);
  const segHeight = outerRadius - innerRadius;
  const isRadial = segHeight > arcLen;

  let rotateText = 0;
  if (isRadial) {
    // Radial flow: longest axis is the radius
    rotateText = textAngle - 90;
    // Orient to read from left-to-right as much as possible
    if (textAngle > 180 && textAngle < 360) {
      rotateText += 180;
    }
  } else {
    // Circumferential flow: longest axis is the arc
    rotateText = textAngle;
    // Flip bottom half to keep it upright
    if (textAngle > 90 && textAngle < 270) {
      rotateText += 180;
    }
  }

  return (
    <g className="cursor-pointer group" onClick={onClick}>
      <motion.path 
        d={d} 
        fill={color} 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.85, scale: 1 }}
        whileHover={{ opacity: 1, filter: 'brightness(1.05)' }}
        className="transition-all duration-300"
        stroke="white"
        strokeWidth="0.5"
      />
      <text
        x={textPos.x}
        y={textPos.y}
        fill={level === 0 ? "rgba(0,0,0,0.95)" : level === 1 ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.75)"}
        fontSize={level === 0 ? "10" : level === 1 ? "7.5" : "5.5"}
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${rotateText}, ${textPos.x}, ${textPos.y})`}
        className="pointer-events-none select-none uppercase tracking-tighter"
      >
        {label}
      </text>
    </g>
  );
};

export default function Pinwheel() {
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionDetail | null>(null);
  const navigate = useNavigate();

  const wheelData = useMemo(() => {
    const data: Array<{
      startAngle: number;
      endAngle: number;
      innerRadius: number;
      outerRadius: number;
      color: string;
      label: string;
      id: string;
      level: number;
      node: Node;
    }> = [];

    // First ring (Core): Radius 40-100
    // Second ring (Secondary): Radius 100-180
    // Third ring (Tertiary): Radius 180-280
    const radii = [40, 105, 185, 290];

    // Total tertiary segments = 82 (calculated previously)
    const totalUnits = 82;
    const anglePerUnit = 360 / totalUnits;

    let currentUnit = 0;

    emotionHierarchy.forEach((core) => {
      const coreTertiaryCount = core.children?.reduce((acc, sec) => acc + (sec.children?.length || 0), 0) || 0;
      const coreStartAngle = currentUnit * anglePerUnit;
      const coreEndAngle = (currentUnit + coreTertiaryCount) * anglePerUnit;

      // Add Core Segment
      data.push({
        startAngle: coreStartAngle,
        endAngle: coreEndAngle,
        innerRadius: radii[0],
        outerRadius: radii[1],
        color: core.color,
        label: core.label,
        id: core.id,
        level: 0,
        node: core
      });

      let secUnit = currentUnit;
      core.children?.forEach((sec) => {
        const secTertiaryCount = sec.children?.length || 0;
        const secStartAngle = secUnit * anglePerUnit;
        const secEndAngle = (secUnit + secTertiaryCount) * anglePerUnit;

        // Add Secondary Segment
        data.push({
          startAngle: secStartAngle,
          endAngle: secEndAngle,
          innerRadius: radii[1],
          outerRadius: radii[2],
          color: sec.color,
          label: sec.label,
          id: sec.id,
          level: 1,
          node: sec
        });

        sec.children?.forEach((ter, idx) => {
          const terStartAngle = (secUnit + idx) * anglePerUnit;
          const terEndAngle = (secUnit + idx + 1) * anglePerUnit;

          // Add Tertiary Segment
          data.push({
            startAngle: terStartAngle,
            endAngle: terEndAngle,
            innerRadius: radii[2],
            outerRadius: radii[3],
            color: ter.color,
            label: ter.label,
            id: ter.id,
            level: 2,
            node: ter
          });
        });

        secUnit += secTertiaryCount;
      });

      currentUnit += coreTertiaryCount;
    });

    return data;
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pt-24 pb-12 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <header className="text-center mb-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="mb-4 text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.4em] hover:opacity-70 transition-opacity"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl md:text-6xl font-black text-[#104C64] uppercase tracking-tighter italic leading-none mb-3">
            Emotional <br />
            <span className="text-[#41B1C2]">Landscape Wheel</span>
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] max-w-lg mx-auto italic">
            A comprehensive mapping of core, secondary, and tertiary feelings. Click segments to see the biological footprint.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 xl:gap-12 w-full">
          {/* Instructions */}
          <div className="w-full lg:w-[230px] xl:w-[270px] lg:shrink-0 space-y-4 order-2 lg:order-1">
             <div className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-xl shadow-black/[0.02]">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-4 h-4 text-[#41B1C2]" />
                  <span className="text-[9px] font-black text-[#104C64] uppercase tracking-widest">Emotional Depth</span>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black text-[#104C64] uppercase italic">1. Core Feelings</span>
                     <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Center segments (Happy, Sad...)</span>
                  </div>
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-gray-100">
                     <span className="text-[10px] font-black text-gray-500 uppercase italic">2. Secondary</span>
                     <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest leading-none">Middle layer variations</span>
                  </div>
                  <div className="flex flex-col gap-1 pl-4 border-l-2 border-gray-50">
                     <span className="text-[10px] font-black text-gray-400 uppercase italic">3. Nuances</span>
                     <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest leading-none">Outer ring specialties</span>
                  </div>
                </div>
             </div>

             <div className="bg-[#104C64] p-6 rounded-[35px] text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Info className="w-4 h-4 text-[#41B1C2]" />
                  <span className="text-[9px] font-black text-[#41B1C2] uppercase tracking-widest">Usage</span>
                </div>
                <p className="text-[10px] font-medium leading-relaxed italic text-white/70">
                  Tap any segment to reveal its biological signature. The wheel expands from core survival to nuanced social states.
                </p>
             </div>
          </div>

          {/* The Circular Wheel */}
          <div className="relative order-1 lg:order-2 flex items-center justify-center scale-[0.8] min-[400px]:scale-[0.85] sm:scale-100 lg:scale-100 transition-transform lg:flex-1 min-w-0 w-full">
            <svg viewBox="-300 -300 600 600" className="w-full max-w-[285px] min-[380px]:max-w-[320px] sm:max-w-[420px] md:max-w-[480px] lg:max-w-[560px] xl:max-w-[660px] 2xl:max-w-[720px] h-auto drop-shadow-2xl">
              {wheelData.map((seg) => (
                <WheelSegment 
                  key={seg.id}
                  startAngle={seg.startAngle}
                  endAngle={seg.endAngle}
                  innerRadius={seg.innerRadius}
                  outerRadius={seg.outerRadius}
                  color={seg.color}
                  label={seg.label}
                  level={seg.level}
                  onClick={() => setSelectedEmotion(getEmotionDetails(seg.node))}
                />
              ))}

              {/* Center point */}
              <circle r="4" fill="#104C64" />
            </svg>

            {/* Subtle background circles */}
            <div className="absolute inset-x-0 inset-y-0 w-full h-full pointer-events-none opacity-10">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[160px] border border-[#104C64] rounded-full" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] border border-[#104C64] rounded-full" />
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] border border-[#104C64] rounded-full" />
            </div>
          </div>

          {/* Details Column */}
          <div className="w-full lg:w-[280px] xl:w-[320px] lg:shrink-0 order-3">
             <AnimatePresence mode="wait">
               {selectedEmotion ? (
                 <motion.div
                   key={selectedEmotion.title}
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   className="bg-white p-8 rounded-[45px] border border-gray-100 shadow-2xl relative overflow-hidden"
                 >
                   <div 
                     className="absolute -top-10 -right-10 w-40 h-40 opacity-[0.08] pointer-events-none rounded-full blur-2xl"
                     style={{ backgroundColor: selectedEmotion.color }}
                   />
                   
                   <button 
                     onClick={() => setSelectedEmotion(null)}
                     className="absolute top-6 right-6 p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-300 hover:text-[#104C64]"
                   >
                     <X className="w-5 h-5" />
                   </button>

                   <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-3">
                       <Scale className="w-3.5 h-3.5 text-[#41B1C2]" />
                       <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#104C64]">Analysis Profile</span>
                     </div>
                     
                     <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#104C64] mb-6 leading-none">
                       {selectedEmotion.title}
                     </h2>
                     
                     <div className="space-y-6">
                       <div>
                         <div className="flex items-center gap-2 mb-2">
                           <Zap className="w-3.5 h-3.5 text-[#41B1C2]" />
                           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#104C64]">Core Meaning</span>
                         </div>
                         <p className="text-[10px] font-bold leading-relaxed italic text-gray-500 uppercase tracking-wide">
                           "{selectedEmotion.definition}"
                         </p>
                       </div>

                       <div className="pt-6 border-t border-gray-50">
                         <div className="flex items-center gap-2 mb-2">
                           <Heart className="w-3.5 h-3.5 text-[#FF5757]" />
                           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#104C64]">Biology</span>
                         </div>
                         <p className="text-[10px] font-bold leading-relaxed italic text-gray-400 uppercase tracking-wide">
                           {selectedEmotion.biological}
                         </p>
                       </div>
                     </div>
                   </div>
                 </motion.div>
               ) : (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="text-center p-10 border border-dashed border-gray-200 rounded-[45px] bg-gray-50/30"
                 >
                   <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Sparkles className="w-5 h-5 text-[#41B1C2]" />
                   </div>
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] italic leading-loose">
                     Select a slice <br />
                     to reveal the <br />
                     biological DNA
                   </p>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Background Graphic */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-[0.015]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[45vw] font-black text-[#104C64] uppercase italic tracking-tighter select-none -rotate-12">
          SPECTRUM
        </div>
      </div>
    </div>
  );
}
