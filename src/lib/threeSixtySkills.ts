// HumanEdge 3.0 — 360 Assessment Shared Data, Inventory & Scoring Engine
export interface Statement {
  id: string;
  obs: string;
  self: string;
  reverse: boolean;
}

export interface Skill {
  key: string;
  name: string;
  tier: 1 | 2 | 3;
  weight: number;
  iQ: string;
  iOpts: string[];
  statements: Statement[];
}

export const SKILLS: Skill[] = [
  // TIER 1 — DIAGNOSTIC CORE
  {
    key: 'SR', name: 'Self Regulation', tier: 1, weight: 0.10,
    iQ: "Overall, how would you rate the impact of this person's emotional regulation on the quality of interactions and outcomes?",
    iOpts: [
      "No impact — their emotional state regularly disrupts interactions",
      "Some impact — their regulation is inconsistent",
      "Consistent impact — their regulation reliably improves difficult interactions",
      "Significant impact — their regulation is a defining factor in how well situations resolve"
    ],
    statements: [
      { id: 'SR1', obs: "When directly challenged or criticized in front of others, this person responds without visible defensiveness, aggression or withdrawal.", self: "When directly challenged or criticized in front of others, I respond without visible defensiveness, aggression or withdrawal.", reverse: false },
      { id: 'SR2', obs: "In escalating or high-tension situations, this person's composure measurably reduces rather than increases the emotional temperature.", self: "In escalating situations, my composure measurably reduces rather than increases the emotional temperature.", reverse: false },
      { id: 'SR3', obs: "This person makes decisions under pressure that hold up over time — they do not regularly reverse or regret choices made in emotionally activated states.", self: "Decisions I make under pressure hold up over time — I do not regularly reverse or regret them.", reverse: false },
      { id: 'SR4', obs: "Others modify their behavior around this person to avoid triggering a reaction — walking on eggshells.", self: "Others modify their behavior around me to avoid triggering a reaction.", reverse: true },
      { id: 'SR5', obs: "When this person enters a high-stakes situation they appear regulated before the conversation begins — not during it.", self: "I enter high-stakes situations having already processed the emotional charge — regulated before the conversation begins.", reverse: false },
      { id: 'SR6', obs: "This person's emotional state does not consistently leak into how they deliver their message under pressure.", self: "What I feel does not consistently leak into how I deliver my message under pressure.", reverse: false },
      { id: 'SR7', obs: "In their presence, others find their own emotional states stabilising without anything being directly said or done to manage them.", self: "In my presence, others find their own emotional states stabilising without me actively managing them.", reverse: false }
    ]
  },
  {
    key: 'CI', name: 'Contextual Interpretation', tier: 1, weight: 0.10,
    iQ: "Overall, how would you rate the impact of this person's situational reading on the decisions made and outcomes achieved?",
    iOpts: [
      "No impact — their situational reads are frequently inaccurate",
      "Some impact — their reads are occasionally accurate but inconsistent",
      "Consistent impact — their situational intelligence reliably improves decisions",
      "Significant impact — their situational reading is a defining factor in outcomes"
    ],
    statements: [
      { id: 'CI1', obs: "When conflict or tension surfaces, this person identifies the real cause — not just the presenting symptom — and addresses it directly.", self: "When conflict surfaces, I identify and address the real cause — not just the presenting symptom.", reverse: false },
      { id: 'CI2', obs: "This person accurately reads what different people in a group want and need simultaneously — without needing each person to state it explicitly.", self: "I accurately read what different people in a group want and need simultaneously without needing each to state it explicitly.", reverse: false },
      { id: 'CI3', obs: "This person detects when a situation is shifting in real time and adjusts their approach before others in the room have noticed the shift.", self: "I detect when a situation is shifting in real time and adjust before others have noticed the shift.", reverse: false },
      { id: 'CI4', obs: "This person's read of situations — what is actually happening beneath the surface — is consistently more accurate than others present in the same environment.", self: "My read of what is actually happening beneath the surface is consistently more accurate than others in the same situation.", reverse: false },
      { id: 'CI5', obs: "Others seek this person's interpretation of complex situations because their read is known to be reliable.", self: "Others seek my interpretation of complex situations because my read is known to be reliable.", reverse: false },
      { id: 'CI6', obs: "This person consistently distinguishes between what someone is saying and what they actually mean — and responds to the latter.", self: "I consistently distinguish between what someone is saying and what they actually mean — and respond to the latter.", reverse: false },
      { id: 'CI7', obs: "Others describe this person as someone who always seems to know what is really going on — even in situations where that is not obvious.", self: "Others describe me as someone who always seems to know what is really going on.", reverse: false }
    ]
  },
  {
    key: 'AR', name: 'The Architect', tier: 1, weight: 0.10,
    iQ: "Overall, how would you rate the impact of this person's preparation and anticipation on the quality of outcomes?",
    iOpts: [
      "No impact — they are frequently unprepared or caught off guard",
      "Some impact — their preparation occasionally improves outcomes but is inconsistent",
      "Consistent impact — their anticipation reliably improves how situations unfold",
      "Significant impact — their preparation and foresight are a defining factor in outcomes achieved"
    ],
    statements: [
      { id: 'AR1', obs: "This person arrives at important interactions visibly prepared for multiple scenarios — not just the expected one.", self: "I arrive at important interactions prepared for multiple scenarios — not just the expected one.", reverse: false },
      { id: 'AR2', obs: "When unexpected developments occur mid-situation, this person recalibrates without visible disruption — others experience continuity even as their approach changes.", self: "When unexpected developments occur, I recalibrate without visible disruption — others experience continuity even as my approach changes.", reverse: false },
      { id: 'AR3', obs: "This person is rarely if ever caught genuinely off guard — unexpected situations produce recalibration not disruption.", self: "I am rarely caught genuinely off guard — unexpected situations produce recalibration not disruption.", reverse: false },
      { id: 'AR4', obs: "Outcomes this person was involved in designing arrive weeks or months later — others experience them as natural developments unaware of the architecture behind them.", self: "Outcomes I design arrive weeks or months later — others experience them as natural developments unaware of the architecture behind them.", reverse: false },
      { id: 'AR5', obs: "This person identifies the highest leverage intervention point in complex situations — small actions they take produce disproportionately large outcomes.", self: "I identify the highest leverage intervention point in complex situations — small actions I take produce disproportionately large outcomes.", reverse: false },
      { id: 'AR6', obs: "Others seek to understand how this person thinks — their approach to preparation and anticipation has become a reference point for those around them.", self: "Others seek to understand how I think — my approach to preparation and anticipation has become a reference point.", reverse: false },
      { id: 'AR7', obs: "In hindsight, others regularly discover this person was prepared for outcomes that seemed unpredictable at the time.", self: "In hindsight, others regularly discover I was prepared for outcomes that seemed unpredictable at the time.", reverse: false }
    ]
  },
  {
    key: 'PR', name: 'Pattern Recognition', tier: 1, weight: 0.10,
    iQ: "Overall, how would you rate the impact of this person's ability to read and anticipate patterns on outcomes?",
    iOpts: [
      "No impact — their reads of people and situations are frequently inaccurate",
      "Some impact — their pattern recognition occasionally produces useful insight",
      "Consistent impact — their pattern reading reliably improves how they navigate people and situations",
      "Significant impact — their ability to anticipate patterns is a defining factor in how situations develop"
    ],
    statements: [
      { id: 'PR1', obs: "This person correctly predicts how specific individuals will react in new situations — based on patterns they have observed over time.", self: "I correctly predict how specific individuals will react in new situations based on patterns I have observed.", reverse: false },
      { id: 'PR2', obs: "When someone behaves outside their normal pattern, this person notices and correctly identifies why — before others have registered the anomaly.", self: "When someone behaves outside their normal pattern, I notice and correctly identify why before others have registered the anomaly.", reverse: false },
      { id: 'PR3', obs: "This person distinguishes reliably between someone's default behavioral pattern and a situational reaction — they do not over-interpret one-off events.", self: "I distinguish reliably between someone's default behavioral pattern and a situational reaction — I do not over-interpret one-off events.", reverse: false },
      { id: 'PR4', obs: "This person's predictions about how situations and people will unfold are verifiably more accurate than others in the same environment.", self: "My predictions about how situations and people will unfold are verifiably more accurate than others in the same environment.", reverse: false },
      { id: 'PR5', obs: "Others seek this person's read on people and situations because their pattern recognition is known to be reliably accurate.", self: "Others seek my read on people and situations because my pattern recognition is known to be reliable.", reverse: false },
      { id: 'PR6', obs: "This person identifies recurring dynamics in relationships and environments and acts on that recognition before the pattern produces a problem.", self: "I identify recurring dynamics and act on that recognition before the pattern produces a problem.", reverse: false },
      { id: 'PR7', obs: "This person's behavioral profiles of people — their read of how someone will operate — prove accurate over time and across different situations.", self: "My behavioral profiles of people — my read of how someone will operate — prove accurate over time and across situations.", reverse: false }
    ]
  },
  {
    key: 'CM', name: 'Communication', tier: 1, weight: 0.10,
    iQ: "Overall, how would you rate the impact of this person's communication on the quality of outcomes in interactions you have shared?",
    iOpts: [
      "No impact — their communication regularly creates misunderstanding or resistance",
      "Some impact — their communication is occasionally precise but inconsistent",
      "Consistent impact — their communication reliably produces the intended effect",
      "Significant impact — their communication is a defining factor in how well interactions unfold"
    ],
    statements: [
      { id: 'CM1', obs: "When delivering difficult messages, this person does so without triggering defensive shutdown or escalation in the other person.", self: "When delivering difficult messages, I do so without triggering defensive shutdown or escalation in the other person.", reverse: false },
      { id: 'CM2', obs: "This person's communication style shifts visibly and appropriately based on who they are speaking to — without appearing inconsistent or inauthentic.", self: "My communication style shifts appropriately based on who I am speaking to — without appearing inconsistent.", reverse: false },
      { id: 'CM3', obs: "This person uses silence and pause deliberately — strategic restraint that creates more impact than additional words would.", self: "I use silence and pause deliberately — strategic restraint that creates more impact than additional words.", reverse: false },
      { id: 'CM4', obs: "Under pressure or provocation, this person's communication precision increases rather than decreases.", self: "Under pressure or provocation, my communication precision increases rather than decreases.", reverse: false },
      { id: 'CM5', obs: "This person's non-verbal communication consistently reinforces rather than contradicts their verbal message.", self: "My non-verbal communication consistently reinforces rather contradicts my verbal message.", reverse: false },
      { id: 'CM6', obs: "A single well-placed sentence or question from this person measurably shifts the direction of a conversation or room.", self: "A single well-placed sentence or question from me measurably shifts the direction of a conversation or room.", reverse: false },
      { id: 'CM7', obs: "Others find themselves using language, frameworks or ways of thinking this person introduced — sometimes without remembering the source.", self: "Others find themselves using language or frameworks I introduced — sometimes without remembering the source.", reverse: false }
    ]
  },
  // TIER 2 — BEHAVIORAL EVIDENCE
  {
    key: 'L', name: 'Listening', tier: 2, weight: 0.075,
    iQ: "Overall, how would you rate the impact of this person's listening on the quality of conversations and relationships?",
    iOpts: [
      "No impact — their listening regularly produces misunderstanding",
      "Some impact — their listening is occasionally deep but inconsistent",
      "Consistent impact — their listening reliably creates genuine understanding",
      "Significant impact — their listening is a defining factor in relationship quality"
    ],
    statements: [
      { id: 'L1', obs: "When this person reflects back what someone has said, they capture not just the content but the emotional meaning beneath it.", self: "When I reflect back what someone has said, I capture not just the content but the emotional meaning beneath it.", reverse: false },
      { id: 'L2', obs: "This person catches what is deliberately left unsaid in conversations and surfaces it without making the other person feel exposed.", self: "I catch what is deliberately left unsaid and surface it without making the other person feel exposed.", reverse: false },
      { id: 'L3', obs: "This person's listening quality does not visibly deteriorate when conversations become personally challenging or emotionally provocative.", self: "My listening quality does not visibly deteriorate when conversations become personally challenging.", reverse: false },
      { id: 'L4', obs: "This person frequently interrupts, finishes others' sentences, or begins visibly preparing their response while the other person is still speaking.", self: "I frequently interrupt, finish others' sentences, or begin preparing my response while the other person is still speaking.", reverse: true },
      { id: 'L5', obs: "Others in the same conversation regularly discover that this person noticed or heard something significant that everyone else missed.", self: "Others in the same conversation regularly discover that I noticed or heard something significant that everyone else missed.", reverse: false }
    ]
  },
  {
    key: 'CN', name: 'Conflict Navigation', tier: 2, weight: 0.075,
    iQ: "Overall, how would you rate the impact of this person's conflict navigation on the quality of relationships and outcomes?",
    iOpts: [
      "No impact — their involvement in conflict regularly makes situations worse",
      "Some impact — their conflict navigation occasionally improves situations",
      "Consistent impact — their involvement reliably de-escalates and moves toward resolution",
      "Significant impact — their conflict navigation is a defining factor in how disputes resolve"
    ],
    statements: [
      { id: 'CN1', obs: "When conflict escalates, this person deliberately lowers the emotional temperature — their response measurably reduces rather than matches the intensity.", self: "When conflict escalates, I deliberately lower the emotional temperature — my response reduces rather than matches the intensity.", reverse: false },
      { id: 'CN2', obs: "This person holds their position firmly under sustained pressure from aggressive or dominant individuals — without becoming aggressive or capitulating.", self: "I hold my position firmly under sustained pressure from aggressive or dominant individuals — without becoming aggressive or capitulating.", reverse: false },
      { id: 'CN3', obs: "Conflicts this person is involved in resolving tend not to recur in the same form — they address root causes not just surface symptoms.", self: "Conflicts I resolve tend not to recur in the same form — I address root causes not just surface symptoms.", reverse: false },
      { id: 'CN4', obs: "Others avoid bringing conflict or difficult issues to this person because of how they typically respond.", self: "Others avoid bringing conflict or difficult issues to me because of how I typically respond.", reverse: true },
      { id: 'CN5', obs: "In multi-stakeholder conflicts, this person shapes the resolution without appearing to direct it — others experience the outcome as naturally arrived at.", self: "In multi-stakeholder conflicts, I shape the resolution without appearing to direct it — others experience the outcome as naturally arrived at.", reverse: false }
    ]
  },
  {
    key: 'AD', name: 'Adaptability', tier: 2, weight: 0.075,
    iQ: "Overall, how would you rate the impact of this person's adaptability on their effectiveness across situations you have shared?",
    iOpts: [
      "No impact — their rigidity regularly limits effectiveness when circumstances change",
      "Some impact — their adaptability occasionally improves effectiveness",
      "Consistent impact — their adaptability reliably maintains effectiveness across changing conditions",
      "Significant impact — their adaptability is a defining factor in their consistent effectiveness"
    ],
    statements: [
      { id: 'AD1', obs: "When a strategy clearly is not working mid-situation, this person changes approach without losing the strategic objective or signaling confusion.", self: "When a strategy is not working, I change approach without losing the strategic objective or signaling confusion.", reverse: false },
      { id: 'AD2', obs: "This person is equally effective across significantly different contexts — formal and informal, high-stakes and routine — without visible adjustment effort.", self: "I am equally effective across significantly different contexts without visible adjustment effort.", reverse: false },
      { id: 'AD3', obs: "This person applies the same approach regardless of whether it is working — others observe them persisting with failing methods rather than recalibrating.", self: "I apply the same approach regardless of whether it is working — others observe me persisting with failing methods.", reverse: true },
      { id: 'AD4', obs: "Setbacks and unexpected failures produce immediate recalibration in this person — no observable residue carries into subsequent interactions.", self: "Setbacks and unexpected failures produce immediate recalibration in me — no observable residue carries into subsequent interactions.", reverse: false }
    ]
  },
  {
    key: 'IP', name: 'Influence & Persuasion', tier: 2, weight: 0.075,
    iQ: "Overall, how would you rate the impact of this person's ability to influence others on outcomes achieved?",
    iOpts: [
      "No impact — their influence attempts regularly create resistance or fail",
      "Some impact — their influence occasionally produces movement but is inconsistent",
      "Consistent impact — their ability to move others reliably produces intended outcomes",
      "Significant impact — their influence capability is a defining factor in how outcomes are achieved"
    ],
    statements: [
      { id: 'IP1', obs: "When this person needs to move someone toward a decision or position, they consistently find an approach that works without relying on authority, pressure or repetition.", self: "When I need to move someone toward a decision, I consistently find an approach that works without relying on authority, pressure or repetition.", reverse: false },
      { id: 'IP2', obs: "Others regularly arrive at positions this person supported and experience them as their own conclusions rather than having been persuaded.", self: "Others regularly arrive at positions I supported and experience them as their own conclusions rather than having been persuaded.", reverse: false },
      { id: 'IP3', obs: "This person's attempts to influence or persuade others are frequently experienced as pressure — creating resistance rather than movement.", self: "My attempts to influence or persuade others are frequently experienced as pressure — creating resistance rather than movement.", reverse: true },
      { id: 'IP4', obs: "The outcomes this person works toward tend to arrive — even in complex situations involving resistant people or competing agendas.", self: "The outcomes I work toward tend to arrive — even in complex situations involving resistant people or competing agendas.", reverse: false }
    ]
  },
  // TIER 3 — DEVELOPMENTAL INDICATORS
  {
    key: 'OB', name: 'Observing', tier: 3, weight: 0.033,
    iQ: "Overall, how would you rate the impact of this person's observational awareness on the quality of their interactions and decisions?",
    iOpts: [
      "No impact — they regularly miss signals that affect interaction quality",
      "Some impact — their observation occasionally catches important signals",
      "Consistent impact — their observational awareness reliably informs how they engage",
      "Significant impact — their ability to read people and environments is a defining factor"
    ],
    statements: [
      { id: 'OB1', obs: "This person notices behavioral or emotional shifts in others before those shifts are verbalized — they read the room ahead of the words.", self: "I notice behavioral or emotional shifts in others before those shifts are verbalized — I read the room ahead of the words.", reverse: false },
      { id: 'OB2', obs: "This person regularly misses non-verbal signals that others in the same interaction clearly noticed.", self: "I regularly miss non-verbal signals that others in the same interaction clearly noticed.", reverse: true },
      { id: 'OB3', obs: "Over time, this person's read of individuals and environments has become noticeably more accurate — their observational capability is visibly developing.", self: "Over time, my read of individuals and environments has become noticeably more accurate — my observational capability is visibly developing.", reverse: false }
    ]
  },
  {
    key: 'EX', name: 'Emotional Expression', tier: 3, weight: 0.033,
    iQ: "Overall, how would you rate the impact of this person's emotional expression on the quality of their relationships and interactions?",
    iOpts: [
      "No impact — their expression regularly creates distance or discomfort",
      "Some impact — their expression occasionally enhances connection",
      "Consistent impact — their expression reliably builds trust and connection",
      "Significant impact — their emotional expression is a defining factor in relationship depth"
    ],
    statements: [
      { id: 'EX1', obs: "This person expresses emotions in ways that feel genuine and appropriately calibrated to the situation — not performed or suppressed.", self: "I express emotions in ways that feel genuine and appropriately calibrated to the situation — not performed or suppressed.", reverse: false },
      { id: 'EX2', obs: "This person's emotional expression is frequently disproportionate — either visibly over-reactive or so suppressed that others cannot read their state.", self: "My emotional expression is frequently disproportionate — either over-reactive or so suppressed that others cannot read my state.", reverse: true },
      { id: 'EX3', obs: "When this person chooses to show vulnerability or personal investment, it lands as genuine and deepens rather than weakens the interaction.", self: "When I choose to show vulnerability or personal investment, it lands as genuine and deepens rather than weakens the interaction.", reverse: false }
    ]
  },
  {
    key: 'RA', name: 'Relationship Architecture', tier: 3, weight: 0.033,
    iQ: "Overall, how would you rate the impact of this person's relationship investment on the quality and depth of relationships you have shared?",
    iOpts: [
      "No impact — their approach creates distance or transactional dynamics",
      "Some impact — their investment occasionally deepens relationships",
      "Consistent impact — their deliberate investment reliably builds trust over time",
      "Significant impact — the way they build relationships is a defining factor in their environments"
    ],
    statements: [
      { id: 'RA1', obs: "The dynamics of relationships this person is part of reflect deliberate investment — others experience a consistent, clear sense of how this person operates.", self: "The dynamics of relationships I am part of reflect deliberate investment — others experience a consistent clear sense of how I operate.", reverse: false },
      { id: 'RA2', obs: "Over time, relationships this person invests in become qualitatively different — cleaner, more honest, more mutually respectful.", self: "Over time, relationships I invest in become qualitatively different — cleaner, more honest, more mutually respectful.", reverse: false },
      { id: 'RA3', obs: "Others experience this person's investment in relationships as primarily transactional — they engage more when they need something and less when they don't.", self: "Others experience my investment in relationships as primarily transactional — I engage more when I need something and less when I don't.", reverse: true }
    ]
  },
  {
    key: 'SA', name: 'Self Awareness', tier: 3, weight: 0.033,
    iQ: "Overall, how would you rate the impact of this person's self-awareness on their development and the quality of their relationships?",
    iOpts: [
      "No impact — their blind spots regularly affect interactions negatively",
      "Some impact — their self-awareness occasionally produces useful insight",
      "Consistent impact — their self-awareness reliably produces behavioral change over time",
      "Significant impact — their self-knowledge is a defining factor in their effectiveness"
    ],
    statements: [
      { id: 'SA1', obs: "When this person makes a mistake or contributes to a difficult outcome, they acknowledge their role accurately — neither deflecting nor engaging in excessive self-criticism.", self: "When I make a mistake or contribute to a difficult outcome, I acknowledge my role accurately — neither deflecting nor engaging in excessive self-criticism.", reverse: false },
      { id: 'SA2', obs: "Over time, this person's behavior demonstrably changes as a result of self-reflection — they do not repeat the same patterns indefinitely despite awareness of them.", self: "Over time, my behavior demonstrably changes as a result of self-reflection — I do not repeat the same patterns indefinitely.", reverse: false }
    ]
  },
  {
    key: 'EM', name: 'Empathy Spectrum', tier: 3, weight: 0.033,
    iQ: "Overall, how would you rate the impact of this person's empathic awareness on the quality of their relationships?",
    iOpts: [
      "No impact — others regularly feel unseen or misunderstood",
      "Some impact — their empathy occasionally creates genuine connection",
      "Consistent impact — others reliably feel genuinely understood",
      "Significant impact — their empathic presence is a defining factor in relationship depth"
    ],
    statements: [
      { id: 'EM1', obs: "Others consistently feel genuinely understood in interactions with this person — not just heard, but understood at the level of what they are actually experiencing.", self: "Others consistently feel genuinely understood in interactions with me — not just heard but understood at the level of what they are actually experiencing.", reverse: false },
      { id: 'EM2', obs: "This person acknowledges the limits of their understanding of others' experiences — they do not claim empathy they cannot genuinely offer.", self: "I acknowledge the limits of my understanding of others' experiences — I do not claim empathy I cannot genuinely offer.", reverse: false }
    ]
  },
  {
    key: 'ST', name: 'Strategic Thinking', tier: 3, weight: 0.033,
    iQ: "Overall, how would you rate the impact of this person's strategic thinking on the quality of decisions and outcomes?",
    iOpts: [
      "No impact — their decisions are primarily reactive and short-term",
      "Some impact — their strategic thinking occasionally improves outcomes",
      "Consistent impact — their long-game orientation reliably produces better outcomes over time",
      "Significant impact — their strategic thinking is a defining factor in decisions and outcomes achieved"
    ],
    statements: [
      { id: 'ST1', obs: "Decisions this person makes that appear questionable in the moment consistently make more sense in retrospect — their long-game thinking is verifiable over time.", self: "Decisions I make that appear questionable in the moment consistently make more sense in retrospect — my long-game thinking is verifiable over time.", reverse: false },
      { id: 'ST2', obs: "This person consistently sacrifices short-term comfort or advantage for better long-term positioning.", self: "I consistently sacrifice short-term comfort or advantage for better long-term positioning.", reverse: false }
    ]
  }
];

export const EMM_THRESHOLDS = [
  { level: 6, name: "Inception", col: "#7F77DD", tagline: "I cultivate conditions from which outcomes grow naturally", min: 85 },
  { level: 5, name: "Architect", col: "#D47F7F", tagline: "I design the systems within which others operate", min: 70 },
  { level: 4, name: "Proactive", col: "#C4A050", tagline: "I anticipate and shape situations before they unfold", min: 55 },
  { level: 3, name: "Responsive", col: "#1D9E75", tagline: "I respond strategically rather than reactively", min: 40 },
  { level: 2, name: "Observant", col: "#378ADD", tagline: "I read patterns with growing accuracy", min: 25 },
  { level: 1, name: "Aware", col: "#888888", tagline: "I am beginning to see the patterns", min: 0 }
];

export const SHADOW: Record<number, string> = {
  1: "Over-profiling — typing people too quickly on insufficient data. Awareness paralysis — becoming so self-conscious of patterns that natural interaction suffers.",
  2: "Observational arrogance — believing observations are always accurate and stopping curiosity prematurely. Pattern confirmation bias.",
  3: "Competence overconfidence — Level 3 feels like mastery but it is not. Formulaic application of response strategies without adapting to nuance.",
  4: "Strategic coldness — long-game thinking displacing genuine human warmth. Inception temptation without sufficient ethical anchor.",
  5: "The loneliness of Level 5 — very few people operate here. Complexity addiction — over-engineering solutions that would benefit from simplicity.",
  6: "God complex — capability so high that it creates a gravitational pull toward believing one's judgment is always right. The antidote is radical humility."
};

export const TOOLS: Record<number, string[]> = {
  1: ["3x3 Calibration Protocol", "The 4th Face", "Level 1 Typology"],
  2: ["3x3 Calibration Protocol", "The 4th Face", "Level 1 & 2 Typology", "Basic Architect Scan"],
  3: ["3x3 Calibration Protocol", "The 4th Face", "All 4 Typology Levels", "The Architect Scan", "Basic Predictive Simulation"],
  4: ["Full Architect System", "Level 4 Typology", "Incremental Influence Sequences", "Proactive Conflict Prevention"],
  5: ["Full Inception Framework", "System Level Influence Architecture", "Network Conditioning", "Keystone Person Identification"],
  6: ["Full Inception Framework — all 5 stages", "Legacy Architecture", "Network Inception", "The Mentor Framework", "Ethical Spine Audit"]
};

export const SKILL_GAPS: Record<string, string> = {
  SR: "Self regulation is the gating skill. Until this strengthens it will cap performance in every other skill under real pressure.",
  CI: "Contextual interpretation — stitching all channels into a coherent picture — needs work. You have data but not yet the complete story.",
  AR: "The Architect — preparation and real-time recalibration capability — needs deliberate development. You are more reactive than proactive.",
  PR: "Pattern recognition is a gap — you have observations but are not yet connecting them into reliable behavioral prediction.",
  CM: "Communication needs strategic development — particularly adaptive style, strategic silence and delivery of difficult messages without escalation.",
  L: "Listening is not yet at full depth — particularly reading what is not said and maintaining quality under emotional pressure.",
  CN: "Conflict navigation needs deliberate development — particularly de-escalation, assertive positioning and root-cause resolution.",
  AD: "Adaptability needs development — particularly seamless mid-situation recalibration without signaling confusion to others.",
  IP: "Influence capability is developing. The shift from direct argument to guided discovery is the key development here.",
  OB: "Observational precision needs development — especially across non-verbal channels and detecting incongruence between words and body.",
  EX: "Emotional expression — knowing what to show, when and how much — needs deliberate practice.",
  RA: "Relationship architecture is underdeveloped. You are reacting to relationship dynamics rather than designing them.",
  SA: "Self awareness needs strengthening — particularly the translation of insight into sustained behavioral change.",
  EM: "Empathy accuracy and range needs deliberate development.",
  ST: "Strategic thinking — connecting immediate actions to long-term outcomes — needs development."
};

// Helper to match relationship string with categorical role keys (above, peer, below, personal)
export function matchesCategory(relationship: string | undefined, cat: string): boolean {
  if (!relationship) return false;
  const rel = relationship.toLowerCase();
  if (cat === 'above') {
    return rel.includes('above') || rel.includes('manager') || rel.includes('board');
  }
  if (cat === 'peer') {
    return rel.includes('peer') || rel.includes('colleague');
  }
  if (cat === 'below') {
    return rel.includes('below') || rel.includes('report');
  }
  if (cat === 'personal') {
    return rel.includes('personal') || rel.includes('mentor');
  }
  return false;
}

// Math and calculation solver helper
export function calculateThreeSixtyResults(
  selfResponses: Record<string, number>,
  selfImpacts: Record<string, number>,
  observers: Array<{
    name: string;
    relationship: string;
    responses: Record<string, number>;
    impacts: Record<string, number>;
  }>
) {
  const categories = ['above', 'peer', 'below', 'personal'];

  const avg = (arr: number[]) => {
    const valid = arr.filter(x => x !== undefined && x !== null && !isNaN(x) && x > 0);
    if (!valid.length) return null;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  };

  const skillResults = SKILLS.map(skill => {
    const stmtIds = skill.statements.map(s => s.id);

    // Self responses
    const selfScores = stmtIds.map(id => selfResponses?.[id]).filter(v => v !== undefined && v !== null && v > 0);
    const selfAvg = selfScores.length ? avg(selfScores) : null;

    // Observer scores overall
    const allObsScores: number[] = [];
    observers.forEach(od => {
      stmtIds.forEach(id => {
        const v = od.responses?.[id];
        if (v !== undefined && v !== null && v > 0) allObsScores.push(v);
      });
    });
    const obsAvg = allObsScores.length ? avg(allObsScores) : null;

    // Observer scores by category
    const catAvgs: Record<string, number | null> = {};
    categories.forEach(cat => {
      const catObs = observers.filter(od => matchesCategory(od.relationship, cat));
      if (!catObs.length) {
        catAvgs[cat] = null;
        return;
      }
      const scores: number[] = [];
      catObs.forEach(od => {
        stmtIds.forEach(id => {
          const v = od.responses?.[id];
          if (v !== undefined && v !== null && v > 0) scores.push(v);
        });
      });
      catAvgs[cat] = scores.length ? avg(scores) : null;
    });

    // NA Rate
    const totalPossible = stmtIds.length * observers.length;
    let naCount = 0;
    observers.forEach(od => {
      stmtIds.forEach(id => {
        const v = od.responses?.[id];
        if (v === 0 || v === undefined || v === null) {
          naCount++;
        }
      });
    });
    const naRate = totalPossible > 0 ? naCount / totalPossible : 0;

    // Reverse item validation
    const reverseIds = skill.statements.filter(s => s.reverse).map(s => s.id);
    const forwardIds = skill.statements.filter(s => !s.reverse).map(s => s.id);
    let reverseFlag = false;
    if (reverseIds.length > 0) {
      const selfForwardAct = forwardIds.map(id => selfResponses?.[id]).filter(v => v !== undefined && v !== null && v > 0);
      const selfReverseAct = reverseIds.map(id => selfResponses?.[id]).filter(v => v !== undefined && v !== null && v > 0);
      const selfForwardAvg = selfForwardAct.length ? avg(selfForwardAct) : null;
      const selfReverseAvg = selfReverseAct.length ? avg(selfReverseAct) : null;
      if (selfForwardAvg !== null && selfReverseAvg !== null && selfForwardAvg >= 3 && selfReverseAvg >= 3) {
        reverseFlag = true;
      }
    }

    // Impact
    const selfImpact = selfImpacts?.[skill.key] || null;
    const obsImpacts = observers.map(od => od.impacts?.[skill.key]).filter(v => v !== undefined && v !== null && v > 0);
    const obsImpactAvg = obsImpacts.length ? avg(obsImpacts) : null;

    // Pattern Gap Calc
    const gap = (selfAvg !== null && obsAvg !== null) ? selfAvg - obsAvg : null;
    let pattern = 'insufficient';
    if (gap !== null) {
      if (gap > 0.5) pattern = 'inflation';
      else if (gap < -0.5) pattern = 'deflation';
      else pattern = 'aligned';
    }

    // Splits
    const availableCats = categories.filter(c => catAvgs[c] !== null);
    let splitConfig: string | null = null;
    let splitGap = 0;
    if (availableCats.length >= 2) {
      if (catAvgs.above !== null && catAvgs.below !== null) {
        const abDiff = catAvgs.above - catAvgs.below;
        if (Math.abs(abDiff) >= 0.7) {
          splitConfig = abDiff > 0 ? '4A' : '4B';
          splitGap = Math.abs(abDiff);
          pattern = 'split';
        }
      }
      if (!splitConfig && catAvgs.peer !== null) {
        const others = [catAvgs.above, catAvgs.below].filter(v => v !== null) as number[];
        if (others.length >= 1) {
          const othersAvg = avg(others);
          if (othersAvg !== null && Math.abs(catAvgs.peer - othersAvg) >= 0.7) {
            splitConfig = '4C';
            splitGap = Math.abs(catAvgs.peer - othersAvg);
            pattern = 'split';
          }
        }
      }
      if (!splitConfig && catAvgs.personal !== null) {
        const profCats = [catAvgs.above, catAvgs.peer, catAvgs.below].filter(v => v !== null) as number[];
        if (profCats.length >= 1) {
          const profAvg = avg(profCats);
          if (profAvg !== null && Math.abs(catAvgs.personal - profAvg) >= 0.7) {
            splitConfig = '4D';
            splitGap = Math.abs(catAvgs.personal - profAvg);
            pattern = 'split';
          }
        }
      }
    }

    const effectiveAvg = obsAvg !== null ? obsAvg : selfAvg;
    const pct = effectiveAvg ? ((effectiveAvg - 1) / 3) * 100 : 0;
    let skillLevel = 1;
    if (pct >= 80) skillLevel = 6;
    else if (pct >= 63) skillLevel = 5;
    else if (pct >= 50) skillLevel = 4;
    else if (pct >= 37) skillLevel = 3;
    else if (pct >= 23) skillLevel = 2;

    return {
      skill, selfAvg, obsAvg, catAvgs, pattern, splitConfig, splitGap,
      naRate, reverseFlag, selfImpact, obsImpactAvg, skillLevel, gap,
      pct: Math.round(pct)
    };
  });

  // Confidence computation
  const obsCount = observers.length;
  const catCoverage = categories.filter(c => observers.some(od => matchesCategory(od.relationship, c))).length;
  const avgNaRate = avg(skillResults.map(r => r.naRate)) || 0;
  const reverseFlags = skillResults.filter(r => r.reverseFlag).length;

  let confidence = 'high';
  if (obsCount < 4 || catCoverage < 2) confidence = 'low';
  else if (obsCount < 6 || catCoverage < 3 || avgNaRate > 0.3 || reverseFlags > 3) confidence = 'moderate';

  const srResult = skillResults.find(r => r.skill.key === 'SR');
  const srObsAvg = srResult ? srResult.obsAvg : null;

  // Weighted normalized EMM Level
  let weightedScore = 0;
  let totalWeight = 0;
  skillResults.forEach(r => {
    const score = r.obsAvg !== null ? r.obsAvg : r.selfAvg;
    if (score !== null) {
      weightedScore += score * r.skill.weight;
      totalWeight += r.skill.weight;
    }
  });
  const normalizedScore = totalWeight > 0 ? (weightedScore / totalWeight) : 0;
  const overallPct = Math.round(((normalizedScore - 1) / 3) * 100);

  let overallLevel = 1;
  EMM_THRESHOLDS.forEach(t => {
    if (overallPct >= t.min) overallLevel = Math.max(overallLevel, t.level);
  });

  // Gating thresholds
  let gatingNote: string | null = null;
  if (srObsAvg !== null && srObsAvg < 2.2 && overallLevel > 2) {
    overallLevel = 2;
    gatingNote = 'Self Regulation observer average is below the minimum threshold (2.2). Overall level has been capped at Level 2. No other skill development will produce durable results until Self Regulation is strengthened.';
  }

  // Splits trigger cap
  const splitSkills = skillResults.filter(r => r.splitConfig === '4A');
  let splitNote: string | null = null;
  if (splitSkills.length >= 3 && overallLevel > 3) {
    overallLevel = 3;
    splitNote = `A Split 4A pattern (above high / below low) was detected across ${splitSkills.length} or more skills. Genuine mastery at Level 4 and above requires behavioral consistency across all power relationships. Overall level has been capped at Level 3.`;
  }

  const levelInfo = EMM_THRESHOLDS.find(t => t.level === overallLevel) || EMM_THRESHOLDS[EMM_THRESHOLDS.length - 1];

  // Top development gaps
  const sortedByScore = [...skillResults].filter(r => r.obsAvg !== null).sort((a, b) => (a.obsAvg || 0) - (b.obsAvg || 0));
  const topGaps = sortedByScore.slice(0, 3);

  return {
    skillResults, confidence, obsCount, catCoverage,
    overallLevel, levelInfo, overallPct, gatingNote, splitNote, topGaps,
    reverseFlags
  };
}
