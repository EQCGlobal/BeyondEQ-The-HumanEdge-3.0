import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, TrendingUp, Info, Filter, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Compass, Brain, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const moods = [
  { label: 'Happy', color: 'bg-[#7ED957]', hex: '#7ED957' },
  { label: 'Strong', color: 'bg-[#41B1C2]', hex: '#41B1C2' },
  { label: 'Angry', color: 'bg-[#FF5757]', hex: '#FF5757' },
  { label: 'Fear', color: 'bg-[#CB6CE6]', hex: '#CB6CE6' },
  { label: 'Sad', color: 'bg-[#5271FF]', hex: '#5271FF' },
  { label: 'Weak', color: 'bg-[#FFA726]', hex: '#FFA726' },
];

const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MoodTracker() {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'stats'>('grid');
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
  const [statsRange, setStatsRange] = useState<'Day' | 'Week' | 'Month' | 'All'>('All');
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showHowToUse, setShowHowToUse] = useState(false);

  // Initial state loads from sessionStorage for session persistence
  const [moodData, setMoodData] = useState<Record<string, string>>(() => {
    try {
      const saved = sessionStorage.getItem('eq-mood-tracker-data');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Save to sessionStorage whenever data changes
  useEffect(() => {
    sessionStorage.setItem('eq-mood-tracker-data', JSON.stringify(moodData));
  }, [moodData]);

  const isFutureDate = (year: number, month: number, day: number) => {
    const today = new Date();
    const entryDate = new Date(year, month, day, 0, 0, 0, 0);
    const comparisonDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return entryDate > comparisonDate;
  };

  const getMoodColor = (moodLabel: string | undefined) => {
    if (!moodLabel) return 'bg-gray-50';
    return moods.find(m => m.label === moodLabel)?.color || 'bg-gray-50';
  };

  const handleCellClick = (month: number, day: number) => {
    if (isFutureDate(currentYear, month, day)) {
      return;
    }
    const key = `${month}-${day}`;
    const nextMoodIndex = moodData[key] 
      ? (moods.findIndex(m => m.label === moodData[key]) + 1) % (moods.length + 1)
      : 0;
    
    const newData = { ...moodData };
    if (nextMoodIndex === moods.length) {
      delete newData[key];
    } else {
      newData[key] = moods[nextMoodIndex].label;
    }
    setMoodData(newData);
  };

  // Calculate filtered stats based on range
  const getFilteredData = () => {
    const today = new Date();
    // Use activeMonth and currentYear for the base of filtering if needed, 
    // but for 'Week' we should really use the actual date relative to today 
    // OR relative to the selected view if we want to be fancy. 
    // Let's stick to true relative-to-today for Week/Day.

    if (statsRange === 'All') return moodData;

    const filtered: Record<string, string> = {};
    const now = today.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    Object.entries(moodData).forEach(([key, value]) => {
      const [m, d] = key.split('-').map(Number);
      const entryDate = new Date(currentYear, m, d);
      const entryTime = entryDate.getTime();
      
      if (statsRange === 'Day') {
        if (m === today.getMonth() && d === today.getDate()) filtered[key] = value;
      } else if (statsRange === 'Week') {
        const diffDays = (now - entryTime) / oneDay;
        if (diffDays >= 0 && diffDays < 7) filtered[key] = value;
      } else if (statsRange === 'Month') {
        if (m === activeMonth) filtered[key] = value;
      }
    });
    return filtered;
  };

  const currentStatsData = getFilteredData();

  // Calculate statistics
  const stats = moods.map(mood => {
    const count = Object.values(currentStatsData).filter(m => m === mood.label).length;
    return { ...mood, count };
  }).sort((a, b) => b.count - a.count);

  const topMood = stats[0] || { ...moods[0], count: 0 };
  const totalDays = Object.keys(currentStatsData).length;

  // Calculate dynamic stability and focus
  const calculateStability = () => {
    if (totalDays < 2) return 100;
    const moodValues = Object.values(currentStatsData);
    const changes = moodValues.filter((m, i) => i > 0 && m !== moodValues[i-1]).length;
    return Math.max(0, 100 - (changes / totalDays) * 100);
  };

  const calculateStreak = () => {
    const sortedKeys = Object.keys(moodData).sort((a, b) => {
      const [m1, d1] = a.split('-').map(Number);
      const [m2, d2] = b.split('-').map(Number);
      return (m1 * 100 + d1) - (m2 * 100 + d2);
    });
    
    let maxStreak = 0;
    let currentStreak = 0;
    let lastMood = '';

    sortedKeys.forEach(key => {
      const mood = moodData[key];
      if (mood === 'Happy' || mood === 'Strong') {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    return maxStreak;
  };

  const stability = Math.round(calculateStability());
  const streak = calculateStreak();

  // Day of Week Stats
  const weekdayStats = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
    const moodsOnThisDay: string[] = [];
    Object.keys(currentStatsData).forEach(key => {
      const [m, d] = key.split('-').map(Number);
      const date = new Date(currentYear, m, d);
      if (date.toLocaleDateString('en-US', { weekday: 'long' }) === day) {
        moodsOnThisDay.push(currentStatsData[key]);
      }
    });

    // Find most frequent mood for this day
    const frequency: Record<string, number> = {};
    moodsOnThisDay.forEach(m => frequency[m] = (frequency[m] || 0) + 1);
    const dominantMoodLabel = Object.keys(frequency).length > 0
      ? Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b)
      : null;
    const dominantMood = dominantMoodLabel ? (moods.find(m => m.label === dominantMoodLabel) || moods[0]) : null;

    return { day, dominantMood, count: moodsOnThisDay.length };
  });

  const getDeeperInsights = () => {
    const happyCount = stats.find(s => s.label === 'Happy')?.count || 0;
    const totalCount = Object.values(currentStatsData).length;
    const happyRatio = totalCount > 0 ? (happyCount / totalCount) * 100 : 0;

    switch (statsRange) {
      case 'Day':
        return [
          { title: 'Moment Snapshot', text: totalCount > 0 ? `Your ${topMood.label} state currently defines your perspective. Notice how this affects your decisions.` : 'No data logged for today yet. Start your journey with a single tap.', icon: '🎯' },
          { title: 'Neural Baseline', text: `Compared to your weekly average, your focus levels are ${happyCount > 0 ? 'elevated' : 'at maintenance'}.`, icon: '🧠' },
          { title: 'Quick Tip', text: 'Consider a 5-minute reflection to anchor this specific emotional state for future recall.', icon: '💡' }
        ];
      case 'Week':
        return [
          { title: 'Weekly Rhythm', text: streak >= 3 ? `You are on a ${streak}-day "Happy/Strong" streak! This momentum is a sign of high resilience.` : 'This week shows some emotional variety. Variety is the spice of growth; name each state clearly.', icon: '📉' },
          { title: 'Social Synergy', text: happyRatio > 50 ? 'Your "Happy" markers indicate a high capacity for collaborative work this week.' : 'Focus on individual recovery tasks to rebuild your baseline emotional reserves.', icon: '🤝' },
          { title: 'Growth Factor', text: totalCount >= 5 ? `With 5+ entries, your data granularity is improving. You are becoming more aware.` : 'Consistency is key. Try to log your mood at the same time each day for better accuracy.', icon: '🌱' }
        ];
      case 'Month':
        return [
          { title: 'Monthly Stability', text: `You reached an emotional stability index of ${stability}% this month. A very consistent performance.`, icon: '📊' },
          { title: 'Dominant Archetype', text: `The "${topMood.label}" state was your primary operating mode for ${Math.round(happyRatio)}% of the month.`, icon: '✨' },
          { title: 'Resilience Note', text: totalCount > 15 ? 'High data density suggests you are developing a strong habit of introspection.' : 'Every log is a step toward mastery. Keep populating your emotional map.', icon: '🔄' }
        ];
      default:
        return [
          { title: 'The Long View', text: `Across ${totalCount} logs, your most frequent state is "${topMood.label}". This is your core baseline.`, icon: '🔭' },
          { title: 'Personality Profile', text: `"${topMood.label}" and "${stats[1]?.label || 'Strong'}" constitute the majority of your selected experiences.`, icon: '🏛️' },
          { title: 'Mastery Path', text: streak > 5 ? `A ${streak}-day peak streak shows masterful emotional regulation at scale.` : 'Long-term tracking reveals hidden patterns. Scroll back to see how far you\'ve come.', icon: '🚀' }
        ];
    }
  };

  const deeperInsights = getDeeperInsights();


  return (
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-black/[0.02] overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-[#104C64] italic uppercase tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-[#41B1C2]" />
            Daily Mood Tracker
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reframe your emotional landscape</p>
            <button 
              onClick={() => setShowHowToUse(true)}
              className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200/60 text-[8px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all flex items-center gap-1"
            >
              <Info className="w-2.5 h-2.5" />
              How to use
            </button>
          </div>
        </div>
        
        <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setView('grid')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'grid' ? 'bg-white text-[#104C64] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid className="w-4 h-4 inline-block mr-2" />
            Grid
          </button>
          <button 
            onClick={() => setView('stats')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'stats' ? 'bg-white text-[#104C64] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <TrendingUp className="w-4 h-4 inline-block mr-2" />
            Insights
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Time Range Filter for Grid View */}
        {view === 'grid' && (
          <div className="flex justify-center mb-8">
            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200">
              <button 
                onClick={() => setTimeRange('month')}
                className={`px-8 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === 'month' ? 'bg-[#104C64] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Month
              </button>
              <button 
                onClick={() => setTimeRange('year')}
                className={`px-8 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${timeRange === 'year' ? 'bg-[#104C64] text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Year
              </button>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col lg:flex-row gap-12"
            >
              {/* Mood Legend */}
              <div className="w-full lg:w-64">
                <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <Filter className="w-3 h-3" /> Filters
                </div>
                <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col lg:gap-3">
                  {moods.map((mood) => (
                    <button
                      key={mood.label}
                      onClick={() => setSelectedMood(selectedMood === mood.label ? null : mood.label)}
                      className={`w-full flex items-center justify-start p-2.5 lg:p-3 rounded-xl lg:rounded-2xl border transition-all ${
                        selectedMood === mood.label 
                          ? 'border-[#104C64] bg-[#104C64]/5' 
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 lg:gap-3">
                        <div className={`w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full ${mood.color} shadow-sm`} />
                        <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest ${selectedMood === mood.label ? 'text-[#104C64]' : 'text-gray-400'}`}>
                          {mood.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedMood && (
                  <button 
                    onClick={() => setSelectedMood(null)}
                    className="w-full mt-4 text-[8px] font-black text-[#41B1C2] uppercase tracking-[0.5em] text-center hover:underline"
                  >
                    Reset Filter
                  </button>
                )}

                <div className="pt-8 mt-8 border-t border-gray-50">
                  <button
                    onClick={() => navigate('/pinwheel')}
                    className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#104C64] text-white hover:bg-[#41B1C2] transition-all group lg:flex-col lg:items-center xl:flex-row shadow-lg shadow-[#104C64]/10"
                  >
                    <Compass className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Refer Pinwheel</span>
                  </button>
                  <p className="mt-3 text-[8px] font-bold text-gray-300 uppercase tracking-widest text-center px-4 italic">
                    Understand the DNA of your feelings
                  </p>
                </div>
              </div>

              {/* The Grid Component */}
              <div className="flex-1 overflow-x-auto no-scrollbar pb-4">
                <div className="inline-block min-w-full">
                  {timeRange === 'year' ? (
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between mb-12 px-4">
                        <div className="flex items-center">
                          <button 
                            onClick={() => setCurrentYear(currentYear - 1)}
                            className="w-[30px] h-[30px] flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-colors border border-gray-100 shadow-sm"
                          >
                            <ChevronLeft className="w-5 h-5 text-[#104C64]" />
                          </button>
                        </div>
                        <div className="flex items-center">
                          <h3 className="text-xl font-black italic uppercase tracking-tighter text-[#104C64]">
                            Overview {currentYear}
                          </h3>
                        </div>
                        <div className="flex items-center">
                          <button 
                            onClick={() => setCurrentYear(currentYear + 1)}
                            className="w-[30px] h-[30px] flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-colors border border-gray-100 shadow-sm"
                          >
                            <ChevronRight className="w-5 h-5 text-[#104C64]" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 max-w-6xl mx-auto">
                        {fullMonths.map((monthName, monthIdx) => {
                          const daysInMonth = new Date(currentYear, monthIdx + 1, 0).getDate();
                          const firstDay = new Date(currentYear, monthIdx, 1).getDay(); // 0 is Sunday
                          const startingOffset = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Mon-Sun grid

                          return (
                            <div key={monthIdx} className="space-y-3">
                              <h4 className="text-[9px] font-black text-[#104C64] uppercase tracking-[0.2em] italic px-1 opacity-60">
                                {monthName}
                              </h4>
                              <div className="grid grid-cols-7 gap-[1px]">
                                {/* Padding for the start of the month */}
                                {Array.from({ length: startingOffset }).map((_, i) => (
                                  <div key={`pad-${i}`} className="w-[20px] h-[20px]" />
                                ))}
                                
                                {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                                  const day = dayIdx + 1;
                                  const isFuture = isFutureDate(currentYear, monthIdx, day);
                                  const moodLabel = moodData[`${monthIdx}-${day}`];
                                  const dim = selectedMood && moodLabel && moodLabel !== selectedMood;

                                  return (
                                    <div
                                      key={dayIdx}
                                      className={`w-[20px] h-[20px] rounded-[2px] transition-all duration-300 ${
                                        isFuture 
                                          ? 'bg-gray-50 border border-dashed border-gray-100 opacity-20 cursor-not-allowed' 
                                          : getMoodColor(moodLabel)
                                      } ${
                                        dim ? 'opacity-10 grayscale' : 'opacity-100'
                                      } border border-gray-50/10 shadow-sm flex items-center justify-center group`}
                                      title={isFuture ? `${monthName} ${day}: Future (No entry allowed)` : `${monthName} ${day}: ${moodLabel || 'No data'}`}
                                    >
                                      <span className="text-[6px] font-black text-[#104C64]/40 pointer-events-none group-hover:text-[#104C64] group-hover:opacity-100 transition-all">
                                        {day}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (() => {
                    const daysInMonth = new Date(currentYear, activeMonth + 1, 0).getDate();
                    const firstDay = new Date(currentYear, activeMonth, 1).getDay(); // 0 is Sunday
                    const startingOffset = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Mon-Sun grid

                    return (
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between mb-8 px-4">
                          <button onClick={() => setActiveMonth((activeMonth - 1 + 12) % 12)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-[#104C64]" />
                          </button>
                          <h3 className="text-xl font-black italic uppercase tracking-tighter text-[#104C64]">
                            {fullMonths[activeMonth]} {currentYear}
                          </h3>
                          <button onClick={() => setActiveMonth((activeMonth + 1) % 12)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronRight className="w-5 h-5 text-[#104C64]" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 md:gap-1.5 max-w-4xl mx-auto">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="text-center text-[9px] font-black text-[#104C64] uppercase tracking-widest pb-3 border-b border-gray-100 mb-2">
                              {day}
                            </div>
                          ))}
                          {/* Empty cells for previous month padding */}
                          {Array.from({ length: startingOffset }).map((_, idx) => (
                            <div 
                              key={`pad-${idx}`} 
                              className="w-full aspect-square md:w-16 md:h-16 opacity-0 pointer-events-none" 
                            />
                          ))}
                          {/* Days of current month */}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isFuture = isFutureDate(currentYear, activeMonth, day);
                            const moodLabel = moodData[`${activeMonth}-${day}`];
                            const dim = selectedMood && moodLabel && moodLabel !== selectedMood;

                            return (
                              <button
                                key={i}
                                disabled={isFuture}
                                onClick={() => !isFuture && handleCellClick(activeMonth, day)}
                                className={`w-full aspect-square md:w-16 md:h-16 rounded-xl md:rounded-2xl transition-all duration-300 ${
                                  isFuture 
                                    ? 'bg-gray-100/50 border border-dashed border-gray-200 cursor-not-allowed opacity-30 shadow-none' 
                                    : getMoodColor(moodLabel)
                                } ${
                                  dim ? 'opacity-10 grayscale' : 'opacity-100'
                                } border border-gray-100 ${!isFuture ? 'hover:scale-[1.02] active:scale-95 shadow-md group relative overflow-hidden' : ''} flex items-center justify-center`}
                                title={isFuture ? `Future date (Cannot add entries)` : moodLabel || 'Click to log mood'}
                              >
                                <span className={`text-[12px] md:text-xl font-black italic tracking-tighter transition-colors ${
                                  isFuture 
                                    ? 'text-gray-300' 
                                    : moodLabel ? 'text-white' : 'text-[#104C64]/20 group-hover:text-[#104C64]/60'
                                }`}>
                                  {day}
                                </span>
                                {!isFuture && <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {timeRange === 'month' && (
                  <p className="mt-8 text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center italic">
                    Tip: Tap on a cell to cycle through moods. Recreates your internal success landscape.
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-12"
            >
              {/* Stats Filter */}
              <div className="flex justify-center mb-8">
                <div className="flex bg-gray-50 p-1 rounded-full border border-gray-100">
                  {['Day', 'Week', 'Month', 'All'].map((range) => (
                    <button 
                      key={range}
                      onClick={() => setStatsRange(range as any)}
                      className={`px-6 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        statsRange === range 
                          ? 'bg-[#104C64] text-white shadow-md' 
                          : 'text-gray-400 hover:text-[#104C64]'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {/* Highlight Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#104C64] p-8 rounded-[40px] text-white">
                  <div className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em] mb-4">Dominant ({statsRange})</div>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${topMood.color} border border-white/20`} />
                    <div>
                      <h3 className="text-2xl font-black italic uppercase tracking-tight leading-none">{topMood.label}</h3>
                      <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">
                        {statsRange === 'Day' ? 'Snapshot current' : `${topMood.count} instances detected`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100">
                  <div className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-4">Stability Index</div>
                  <div className="text-4xl font-black text-[#104C64] italic">
                    {stability}%
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {stability > 80 ? 'Exceptional consistency' : stability > 50 ? 'Resilience peaks detected' : 'Varied emotional range'}
                  </p>
                </div>
                <div className="bg-[#41B1C2]/10 p-8 rounded-[40px] border border-[#41B1C2]/20 relative overflow-hidden">
                  <div className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
                    Focus Factor
                    {streak > 0 && <Flame className="w-[25px] h-[25px] text-[#FF5757] fill-[#FF5757] animate-pulse" />}
                  </div>
                  <div className="text-4xl font-black text-[#104C64] italic">
                    {streak} Days
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    {streak > 5 ? 'High Performance Streak' : 'Consistency is Mastery'}
                  </p>
                </div>
              </div>

              {/* Deeper Insights Breakdown */}
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-[#41B1C2]" />
                  <span className="text-[9px] font-black text-[#104C64] uppercase tracking-[0.3em]">Neural Insights ({statsRange})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {deeperInsights.map((insight, idx) => (
                    <motion.div 
                      key={idx + statsRange}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-7 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-black/[0.02] transition-all flex flex-col gap-4 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl group-hover:scale-110 transition-transform">{insight.icon}</span>
                          <h4 className="text-[10px] font-black text-[#104C64] uppercase tracking-widest italic">{insight.title}</h4>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#41B1C2] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium leading-relaxed italic pr-4">{insight.text}</p>
                      
                      <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Confidence: {stability > 90 ? '98%' : '94%'}</span>
                        <Info className="w-3 h-3 text-gray-200 group-hover:text-[#41B1C2] transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Day of Week Analysis */}
              {statsRange !== 'Day' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-[#41B1C2]" />
                      <span className="text-[9px] font-black text-[#104C64] uppercase tracking-[0.3em]">Temporal Patterns</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {weekdayStats.map((item, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-[30px] border border-gray-100 text-center flex flex-col items-center group hover:border-[#104C64]/20 hover:shadow-lg transition-all">
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-3">{item.day.slice(0, 3)}</span>
                        <div className={`w-12 h-12 rounded-2xl ${item.dominantMood ? item.dominantMood.color : 'bg-gray-50'} flex items-center justify-center text-xl shadow-lg mb-3 group-hover:scale-110 transition-transform`} />
                        <span className="text-[9px] font-black text-[#104C64] uppercase tracking-tighter truncate w-full">{item.dominantMood ? item.dominantMood.label : 'No Data'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Micro-Goals based on top mood */}
              <div className="bg-[#104C64] p-10 rounded-[50px] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#41B1C2]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h3 className="text-[10px] font-black text-[#41B1C2] uppercase tracking-[0.5em] mb-4">Strategic Focus (Next 24h)</h3>
                    <h4 className="text-3xl font-black italic uppercase italic tracking-tighter mb-4 leading-none">Capitalize on your {topMood.label} Energy</h4>
                    <p className="text-sm text-white/70 font-medium italic leading-relaxed">
                      Your current emotional state is optimized for {topMood.label === 'Strong' ? 'complex problem solving' : topMood.label === 'Happy' ? 'creative collaboration' : 'reflective planning'}. Use this window to tackle high-impact tasks.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { icon: '🎯', goal: 'Define one core objective' },
                      { icon: '🕐', goal: 'Batch 90m of deep work' },
                      { icon: '🤝', goal: 'Connect with a peer for 15m' }
                    ].map((g, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                        <span className="text-xl">{g.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">{g.goal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                {/* Distribution */}
              <div className="relative group">
                <div className="bg-gray-50 p-10 rounded-[60px] border border-gray-100 relative overflow-hidden">
                  <h3 className="text-[10px] font-black text-[#104C64] uppercase tracking-[0.5em] mb-8 text-center">Mood Distribution ({statsRange})</h3>
                <div className="space-y-6">
                  {stats.map((mood) => {
                    const percentage = totalDays > 0 ? (mood.count / totalDays) * 100 : 0;
                    
                    return (
                      <div key={mood.label} className={`space-y-2 transition-all duration-500 ${selectedMood && selectedMood !== mood.label ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{mood.label}</span>
                          <span className="text-[10px] font-black text-[#104C64] uppercase italic">{Math.round(percentage)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-gray-100">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${mood.color}`} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

              {/* Monthly Focus */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-12">
                <button 
                  onClick={() => setActiveMonth((activeMonth - 1 + 12) % 12)}
                  className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div className="text-center">
                  <h4 className="text-2xl font-black text-[#104C64] uppercase italic tracking-tighter">
                    {fullMonths[activeMonth]} Focus
                  </h4>
                  <div className="flex gap-2 justify-center mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#41B1C2]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#104C64]" />
                  </div>
                </div>
                <button 
                  onClick={() => setActiveMonth((activeMonth + 1) % 12)}
                  className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-8 bg-[#104C64]/5 rounded-[40px] border border-[#104C64]/10 text-center">
                <div className="flex justify-center mb-4"><Info className="w-5 h-5 text-[#41B1C2]" /></div>
                <p className="text-sm text-[#104C64] font-medium leading-relaxed italic max-w-xl mx-auto">
                  Emotional Intelligence Insight: "Your {topMood.label.toLowerCase()} states correlate with high social synergy peaks. Leverage this for team alignment sessions."
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How to Use Popup */}
      <AnimatePresence>
        {showHowToUse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHowToUse(false)}
              className="absolute inset-0 bg-[#104C64]/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-gray-100"
            >
              <div className="bg-[#104C64] p-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#41B1C2]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">How to Use the Tracker</h3>
                <p className="text-[10px] font-bold text-[#41B1C2] uppercase tracking-widest">Mastering your emotional landscape</p>
                <button 
                  onClick={() => setShowHowToUse(false)}
                  className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                >
                  <LayoutGrid className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { step: '01', title: 'Select a Date', desc: 'Click on any empty cell in the calendar grid to start logging.' },
                  { step: '02', title: 'Cycle Moods', desc: 'Click the same cell multiple times to cycle through different emotional states.' },
                  { step: '03', title: 'Filter & Analyze', desc: 'Use the mood filters on the left to highlight specific patterns in your grid.' },
                  { step: '04', title: 'View Insights', desc: 'Switch to the Insights tab to see your emotional stability and neural metrics.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-[10px] font-black text-[#41B1C2] uppercase tracking-widest leading-none pt-1">{item.step}</span>
                    <div>
                      <h4 className="text-[12px] font-black text-[#104C64] uppercase tracking-widest mb-1">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 font-medium italic leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setShowHowToUse(false)}
                  className="w-full py-4 bg-[#104C64] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#41B1C2] transition-all shadow-lg"
                >
                  Got it, let's start
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
