import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { biasData } from '../data/biasData';
import { Info, X, Brain, Shield, Zap, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Bias {
  ID: number;
  BiasName: string;
  CodexQuadrant: string;
  SubCategory: string;
  Definition: string;
  WhyItHappens: string;
  BrainRegions: string;
  NeuroscienceInsight: string;
  HowToAvoid: string;
  RealWorldImpact: string;
  RelatedBiases: string;
  CodexRing: string;
  Severity: number;
}

const quadrants = [
  "Too Much Information",
  "Not Enough Meaning",
  "Need to Act Fast",
  "What to Remember"
];

const quadrantColors: Record<string, string> = {
  "Too Much Information": "#104C64",
  "Not Enough Meaning": "#41B1C2",
  "Need to Act Fast": "#FF5757",
  "What to Remember": "#7ED957"
};

export default function BiasCodex() {
  const { user, loading } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBias, setSelectedBias] = useState<Bias | null>(null);
  const [hoveredBias, setHoveredBias] = useState<Bias | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !user) return;

    const width = 1200;
    const height = 1200;
    const radius = Math.min(width, height) / 2 - 120;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .html("");

    const mainGroup = svg.append("g");

    // Add Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        mainGroup.attr("transform", event.transform);
      });

    svg.call(zoom);

    const center = mainGroup.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    if (!selectedQuadrant) {
      // --- OVERVIEW MODE ---
      // Draw Quadrant Segments
      const arc = d3.arc<any>()
        .innerRadius(0)
        .outerRadius(radius)
        .padAngle(0.02)
        .cornerRadius(20);

      const pie = d3.pie<string>()
        .value(1)
        .sort(null);

      const segments = center.selectAll(".quadrant-segment")
        .data(pie(quadrants))
        .enter()
        .append("g")
        .attr("class", "quadrant-segment")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
          setSelectedQuadrant(d.data);
          // Auto-zoom or transition could go here
        });

      segments.append("path")
        .attr("d", arc as any)
        .attr("fill", d => quadrantColors[d.data])
        .attr("opacity", 0.1)
        .attr("stroke", d => quadrantColors[d.data])
        .attr("stroke-width", 2)
        .attr("class", "transition-all duration-500 hover:opacity-20");

      segments.append("text")
        .attr("transform", d => {
          const centroid = arc.centroid(d as any);
          const x = centroid[0] * 1.6;
          const y = centroid[1] * 1.6;
          return `translate(${x}, ${y})`;
        })
        .attr("text-anchor", "middle")
        .attr("fill", d => d3.color(quadrantColors[d.data])?.darker(1).formatHex() || quadrantColors[d.data])
        .attr("font-size", "22px")
        .attr("font-weight", "950")
        .attr("class", "uppercase italic tracking-tighter")
        .selectAll("tspan")
        .data(d => d.data.split(" "))
        .enter()
        .append("tspan")
        .attr("x", 0)
        .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
        .text(d => d);

      // Node Preview (Dots) in overview
      const overviewNodes = biasData.map(d => {
        const qIdx = quadrants.indexOf(d.CodexQuadrant);
        const startAngle = (qIdx * 90 + 5) * (Math.PI / 180);
        const endAngle = ((qIdx + 1) * 90 - 5) * (Math.PI / 180);
        const biasInQ = biasData.filter(b => b.CodexQuadrant === d.CodexQuadrant);
        const idx = biasInQ.indexOf(d);
        
        const angle = startAngle + (idx + 0.5) * (endAngle - startAngle) / biasInQ.length;
        const r = radius * (0.3 + (idx % 3) * 0.2);
        
        return { ...d, x: Math.cos(angle) * r, y: Math.sin(angle) * r };
      });

      // Add Distinct Axis Lines
      const axisLines = center.append("g").attr("class", "axis-lines").style("opacity", 0.5);

      axisLines.append("line")
        .attr("x1", -radius * 1.3)
        .attr("y1", 0)
        .attr("x2", radius * 1.3)
        .attr("y2", 0)
        .attr("stroke", "#104C64")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,6");

      axisLines.append("line")
        .attr("x1", 0)
        .attr("y1", -radius * 1.3)
        .attr("x2", 0)
        .attr("y2", radius * 1.3)
        .attr("stroke", "#104C64")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,6");

      center.selectAll(".overview-dot")
        .data(overviewNodes)
        .enter()
        .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", 4)
        .attr("fill", d => d3.color(quadrantColors[d.CodexQuadrant])?.darker(1).formatHex() || quadrantColors[d.CodexQuadrant])
        .attr("opacity", 0.8);

    } else {
      // --- DETAIL MODE ---
      const filteredData = biasData.filter(d => d.CodexQuadrant === selectedQuadrant);
      
      // Sort to make grouping stable
      const sortedData = [...filteredData].sort((a, b) => a.SubCategory.localeCompare(b.SubCategory));
      
      const subCategories = Array.from(new Set(sortedData.map(d => d.SubCategory))).sort();
      const ringMap: Record<string, number> = { "Inner": 0.4, "Middle": 0.65, "Outer": 0.9 };

      // Add background slices for each subcategory
      const angleStep = (2 * Math.PI) / subCategories.length;
      
      const slices = center.selectAll(".subcat-slice")
        .data(subCategories)
        .enter()
        .append("path")
        .attr("class", "subcat-slice")
        .attr("d", (d, i) => {
          const startAngle = i * angleStep - Math.PI / 2 - (angleStep / 2) + 0.05;
          const endAngle = (i + 1) * angleStep - Math.PI / 2 - (angleStep / 2) - 0.05;
          return d3.arc()({
            innerRadius: radius * 0.25,
            outerRadius: radius * 1.15,
            startAngle: startAngle + Math.PI / 2,
            endAngle: endAngle + Math.PI / 2,
          });
        })
        .attr("fill", quadrantColors[selectedQuadrant])
        .attr("opacity", 0.03)
        .attr("stroke", quadrantColors[selectedQuadrant])
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .on("mouseenter", function() {
          d3.select(this).transition().duration(300).attr("opacity", 0.1);
        })
        .on("mouseleave", function() {
          d3.select(this).transition().duration(300).attr("opacity", 0.03);
        });

      // Add Quadrant Title (Fixed Top Left)
      const quadrantHeader = svg.append("g")
        .attr("transform", `translate(40, 45)`);

      quadrantHeader.append("text")
        .text(selectedQuadrant)
        .attr("font-size", "22px")
        .attr("font-weight", "950")
        .attr("fill", d3.color(quadrantColors[selectedQuadrant])?.darker(0.5).formatHex() || quadrantColors[selectedQuadrant])
        .attr("class", "uppercase tracking-tighter italic opacity-100");

      quadrantHeader.append("text")
        .attr("dy", "1.6em")
        .text(`${filteredData.length} Nodes Detected`)
        .attr("font-size", "9px")
        .attr("font-weight", "900")
        .attr("fill", "#6b7280")
        .attr("class", "uppercase tracking-[0.3em]");

      // Layout nodes by SubCategory spokes
      const nodes = sortedData.map((d) => {
        const catIdx = subCategories.indexOf(d.SubCategory);
        const subCatNodes = sortedData.filter(n => n.SubCategory === d.SubCategory);
        const nodeIdxInCat = subCatNodes.indexOf(d);
        
        // Calculate base angle for the subcategory center
        const baseAngle = catIdx * angleStep - Math.PI / 2;
        
        // Offset nodes within the subcategory based on their ring
        const r = radius * (ringMap[d.CodexRing] || 0.5);
        
        return {
          ...d,
          x: Math.cos(baseAngle) * r,
          y: Math.sin(baseAngle) * r,
          targetAngle: baseAngle,
          targetR: r
        };
      });

      // Simulation to prevent overlapping - high structure
      const simulation = d3.forceSimulation(nodes as any)
        .force("charge", d3.forceManyBody().strength(-400))
        .force("collide", d3.forceCollide().radius(105))
        .force("r", d3.forceRadial((d: any) => d.targetR, 0, 0).strength(1.5))
        .force("angle", d3.forceX((d: any) => Math.cos(d.targetAngle) * d.targetR).strength(1.2))
        .force("angleY", d3.forceY((d: any) => Math.sin(d.targetAngle) * d.targetR).strength(1.2))
        .stop();

      for (let i = 0; i < 250; ++i) simulation.tick();

      // Draw SubCategory labels at the edge of each slice
      const subCatLabels = center.selectAll(".subcat-label")
        .data(subCategories)
        .enter()
        .append("g")
        .attr("class", "subcat-label");

      subCatLabels.append("text")
        .attr("transform", (d, i) => {
          const angle = (i / subCategories.length) * 360 - 90;
          const r = radius * 1.25; // Push labels further out
          return `rotate(${angle}) translate(${r},0) ${angle > 90 && angle < 270 ? "rotate(180)" : ""}`;
        })
        .attr("text-anchor", (d, i) => {
          const angle = (i / subCategories.length) * 360 - 90;
          return angle > 90 && angle < 270 ? "end" : "start";
        })
        .text(d => d)
        .attr("font-size", "14px")
        .attr("font-weight", "950")
        .attr("fill", quadrantColors[selectedQuadrant])
        .attr("class", "uppercase tracking-[0.3em] italic opacity-40");

      const nodeGroups = center.selectAll(".node-group")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node-group")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .on("mouseenter", (event, d) => {
          setHoveredBias(d);
          center.selectAll(".node-group").transition().duration(200).style("opacity", (n: any) => n.ID === d.ID ? 1 : 0.1);
        })
        .on("mouseleave", () => {
          setHoveredBias(null);
          center.selectAll(".node-group").transition().duration(200).style("opacity", 1);
        })
        .on("click", (event, d) => setSelectedBias(d));

      nodeGroups.append("circle")
        .attr("r", d => 9 + d.Severity * 1.5)
        .attr("fill", d => d3.color(quadrantColors[selectedQuadrant])?.darker(0.8).formatHex() || quadrantColors[selectedQuadrant])
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .attr("class", "shadow-sm transition-transform duration-300 hover:scale-125 hover:stroke-[rgba(255,255,255,0.8)]");

      nodeGroups.append("text")
        .attr("dx", d => d.x > 0 ? 25 : -25)
        .attr("dy", 5)
        .attr("text-anchor", d => d.x > 0 ? "start" : "end")
        .text(d => d.BiasName)
        .attr("font-size", "13px")
        .attr("font-weight", "900")
        .attr("fill", "#104C64")
        .attr("class", "uppercase tracking-tighter pointer-events-none")
        .style("letter-spacing", "-0.01em");
    }

    // Shared Branding
    const centralLogo = center.append("g")
      .attr("class", "logo-center")
      .style("cursor", "pointer")
      .on("click", () => setSelectedQuadrant(null));

    centralLogo.append("circle")
      .attr("r", 70)
      .attr("fill", "white")
      .attr("stroke", selectedQuadrant ? quadrantColors[selectedQuadrant] : "#104C64")
      .attr("stroke-width", 2)
      .attr("class", "transition-all duration-500 hover:stroke-opacity-50");
    
    // Add inner ring for logo
    centralLogo.append("circle")
      .attr("r", 60)
      .attr("fill", "white")
      .attr("stroke", selectedQuadrant ? quadrantColors[selectedQuadrant] : "#104C64")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3);

    centralLogo.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 10)
      .attr("font-weight", "950")
      .attr("font-size", "14px")
      .attr("fill", "#104C64")
      .attr("class", "italic tracking-tight")
      .text(selectedQuadrant ? "MAP BACK" : "BEYONDEQ");

    // Instructions
    if (selectedQuadrant) {
      svg.append("text")
        .attr("x", 40)
        .attr("y", height - 40)
        .text("CLICK CENTRAL LOGO TO GO BACK • ZOOM/PAN ENABLED")
        .attr("font-size", "14px")
        .attr("font-weight", "950")
        .attr("fill", "#9ca3af")
        .attr("class", "uppercase tracking-[0.2em]");
    } else {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", 60)
        .attr("text-anchor", "middle")
        .text("SELECT A QUADRANT TO EXPLORE")
        .attr("font-size", "16px")
        .attr("font-weight", "950")
        .attr("fill", "#104C64")
        .attr("class", "uppercase tracking-[0.4em] opacity-60");
    }

  }, [selectedQuadrant]);

  // Handle Search Filtering separately to avoid re-rendering entire SVG
  useEffect(() => {
    if (!svgRef.current) return;
    const center = d3.select(svgRef.current).select("g").select("g");
    
    center.selectAll(".node-group")
      .transition().duration(300)
      .style("opacity", (d: any) => 
        searchTerm === "" || d.BiasName.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0.05
      )
      .style("filter", (d: any) => 
        searchTerm !== "" && d.BiasName.toLowerCase().includes(searchTerm.toLowerCase()) ? "drop-shadow(0 0 10px rgba(0,0,0,0.2))" : "none"
      );
  }, [searchTerm]);

  const filteredBiases = biasData.filter(b => 
    b.BiasName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.CodexQuadrant.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-[#104C64] font-bold uppercase tracking-[0.4em]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="h-screen bg-white pt-20 px-6 md:px-12 flex flex-col items-center overflow-hidden">
      <div className="max-w-[1400px] w-full flex-1 flex flex-col min-h-0">
        {/* Header - More Compact */}
        <div className="text-center mb-6 relative shrink-0">
          <h1 className="text-4xl md:text-6xl font-black text-[#104C64] uppercase tracking-tighter italic mb-1">
            The Bias <span className="text-[#41B1C2]">Codex</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.5em] text-[10px]">Neural Architecture Mapping by BeyondEQ</p>
          
          {/* Smaller Search Bar moved to top right */}
          <div className="fixed top-8 right-12 z-50 w-72 md:w-80 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#104C64] to-[#41B1C2] rounded-full blur-[2px] opacity-10 group-hover:opacity-30 transition-all duration-500" />
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input 
                type="text"
                placeholder="FIND A BIAS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-2.5 bg-white/80 backdrop-blur-md border border-gray-100 rounded-full shadow-lg focus:ring-0 font-sans text-[9px] font-black tracking-[0.2em] uppercase transition-all focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch flex-1 min-h-0 pb-6">
          {/* Main Visualization - Filling available height */}
          <div ref={containerRef} className="xl:col-span-8 bg-gray-50 rounded-[40px] md:rounded-[80px] border border-gray-100 p-4 shadow-inner relative flex items-center justify-center cursor-move overflow-hidden">
             <svg ref={svgRef} className="w-full h-full" />
          </div>

          {/* Details Sidebar - Content Scrollable within sidebar */}
          <div className="xl:col-span-4 h-full overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {selectedBias ? (
                <motion.div 
                  key={selectedBias.ID}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="bg-[#104C64] rounded-[30px] md:rounded-[60px] p-8 md:p-10 text-white shadow-[0_40px_80px_rgba(16,76,100,0.3)] relative overflow-hidden flex-1 flex flex-col"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#41B1C2]/20 rounded-full blur-3xl" />
                  
                  <button 
                    onClick={() => setSelectedBias(null)}
                    className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="flex items-center gap-3 mb-6">
                       <Zap className="w-4 h-4 text-[#41B1C2] fill-[#41B1C2]" />
                       <span className="text-[9px] font-black text-[#41B1C2] uppercase tracking-[0.4em]">
                        Node {selectedBias.ID} / {selectedBias.CodexQuadrant}
                      </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black italic uppercase leading-none mb-8 tracking-tighter">
                      {selectedBias.BiasName}
                    </h2>
                    
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#41B1C2]/60 mb-3 border-b border-white/10 pb-2">Phenomenon</h3>
                        <p className="text-lg text-white leading-tight font-medium italic">"{selectedBias.Definition}"</p>
                      </section>

                      <section>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#41B1C2]/60 mb-3 border-b border-white/10 pb-2">Neural Pathway</h3>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-3">
                           <p className="text-xs text-white/80 italic mb-3">"{selectedBias.NeuroscienceInsight}"</p>
                           <div className="flex items-center gap-2 text-[8px] font-black text-[#41B1C2] uppercase tracking-widest">
                              <Brain className="w-3 h-3" /> {selectedBias.BrainRegions}
                           </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7ED957] mb-4 border-b border-[#7ED957]/20 pb-2">Defense Strategy</h3>
                        <p className="text-sm font-bold text-[#7ED957]/90 leading-relaxed uppercase tracking-wide">{selectedBias.HowToAvoid}</p>
                      </section>

                      <div className="pt-6 flex border-t border-white/10 justify-between items-center text-[9px] font-black uppercase tracking-[0.4em]">
                         <div className="flex gap-1.5">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < selectedBias.Severity ? 'bg-[#FF5757]' : 'bg-white/10'}`} />
                            ))}
                         </div>
                         <span className="text-white/40">Severity</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-50 rounded-[40px] md:rounded-[60px] border border-gray-100 p-8 md:p-12 text-center h-full flex flex-col items-center justify-center border-dashed"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mb-6 md:mb-8 shadow-2xl relative">
                    <div className="absolute inset-0 bg-[#104C64] rounded-full animate-ping opacity-5" />
                    <Brain className="w-8 h-8 md:w-10 md:h-10 text-[#104C64]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-[#104C64] uppercase italic mb-4 md:mb-6 tracking-tight">Decipher the Mind</h3>
                  <p className="text-gray-400 text-[10px] md:text-xs italic leading-relaxed mb-8 md:mb-10 max-w-xs">
                    Hover over any node in the codex to preview. Click to deep-dive into the neuroscientific blueprints of cognitive error.
                  </p>
                  
                  <div className="w-full space-y-2 md:space-y-3">
                    {quadrants.map(q => (
                      <div key={q} className="group p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-3 transition-all hover:translate-x-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: quadrantColors[q] }} />
                        <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#104C64] transition-colors">{q}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
