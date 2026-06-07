export interface TermsSection {
  id: string;
  num: string;
  title: string;
  paragraphs: string[];
}

export const TERMS_METADATA = {
  effectiveDate: "January 1, 25",
  organization: "EQC Global LLP",
  brand: "BeyondEQ",
  jurisdiction: "Chennai, Tamil Nadu, India",
  summary: "Please read these Terms and Conditions carefully before registering. By creating an account or accessing the platform, you agree to be bound by these clauses."
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "s1",
    num: "01",
    title: "About BeyondEQ & Acceptance of Terms",
    paragraphs: [
      "BeyondEQ is a digital learning and emotional intelligence (EI) development platform operated by EQC Global LLP, a limited liability partnership registered in India ('we,' 'us,' 'our,' 'the Company').",
      "By creating an account, purchasing a course or tool, or otherwise accessing the Platform, you ('User,' 'you,' 'your') enter into a binding agreement with EQC Global LLP under these Terms and Conditions ('Terms'). These Terms apply to all users — individual learners, corporate subscribers, government bodies, educational institutions, and institutional administrators.",
      "These Terms, together with our Privacy Policy and any supplemental institutional agreements, constitute the entire agreement between you and EQC Global LLP."
    ]
  },
  {
    id: "s2",
    num: "02",
    title: "Eligibility",
    paragraphs: [
      "To create an individual account on BeyondEQ, you must be at least 18 years of age. Persons under 18 may access the Platform only under the conditions described in Section 13 (Minor Users).",
      "By agreeing to these Terms, you represent and warrant that you are legally capable of entering into a binding contract under applicable Indian law, all registration information you provide is accurate and complete, and you have authority to bind your organization if registering on their behalf."
    ]
  },
  {
    id: "s3",
    num: "03",
    title: "User Accounts",
    paragraphs: [
      "Access to most features requires registration. You must provide a valid email address and create a secure password. You are solely responsible for maintaining the confidentiality of your login credentials.",
      "Each user may maintain only one individual account. Creating duplicate accounts to circumvent access restrictions, trial limits, or disciplinary actions is prohibited.",
      "In community spaces, you agree to engage respectfully. Defamatory, discriminatory, or abusive posts may be moderated and accounts suspended or terminated."
    ]
  },
  {
    id: "s4",
    num: "04",
    title: "Platform Services",
    paragraphs: [
      "The Platform offers standard LMS Courses, Assessment Tools, Live Workshops, Digital Certificates, Collaborative Features, and Mobile App access.",
      "We reserve the right to modify or suspend services with reasonable notice. Third-party integrations (including Zoom and Google Meet) are subject to their respective terms and policies."
    ]
  },
  {
    id: "s5",
    num: "05",
    title: "Assessment Tools & Psychometric Content",
    paragraphs: [
      "The assessment and psychometric tools available on BeyondEQ — including the Emotional Maturity Model (EMM) — are designed for educational and professional development purposes only.",
      "They do not constitute clinical diagnosis or psychiatric evaluation. You will not reproduce, resell, or distribute assessment reports without written consent."
    ]
  },
  {
    id: "s6",
    num: "06",
    title: "Certificates & Credentials",
    paragraphs: [
      "BeyondEQ issues digital certificates upon successful completion of qualifying programs. These do not carry formal statutory or university accreditation unless explicitly specified in writing.",
      "Certificates remain the IP of EQC Global LLP and may be revoked in case of academic dishonesty or proxy completion."
    ]
  },
  {
    id: "s7",
    num: "07",
    title: "Payment Terms",
    paragraphs: [
      "Plans include Free Tier, One-Time Purchases, Recurring Subscriptions, and Bulk Institutional Licenses.",
      "All prices are exclusive of Goods and Services Tax (GST), which will be charged in accordance with Indian tax laws. Subscriptions renew automatically unless canceled 48 hours prior to the cycle end."
    ]
  },
  {
    id: "s8",
    num: "08",
    title: "Refunds & Cancellation Policy",
    paragraphs: [
      "Refund requests for one-time purchases can be submitted to billing@beyondeq.com within 7 days of purchase, provided less than 20% of content was accessed. Subscriptions can be canceled at any time to block future renewals.",
      "Physical certificate print fees, custom promotional offers, and live workshops cancelled under 48 hours before the start time are non-refundable."
    ]
  },
  {
    id: "s9",
    num: "09",
    title: "Institutional & Corporate Accounts",
    paragraphs: [
      "Organizations managing bulk seats assume responsibility for compliance by their end users. Seat allocations are non-transferable outside the purchasing organization."
    ]
  },
  {
    id: "s10",
    num: "10",
    title: "Intellectual Property",
    paragraphs: [
      "All programs, assessment algorithms, code, reports, branding, and contents of EMM are the exclusive intellectual property of EQC Global LLP.",
      "You are granted a limited, non-assignable license purely for personal and internal learning. Commercial exploitation, reverse engineering, or duplication is strictly forbidden."
    ]
  },
  {
    id: "s11",
    num: "11",
    title: "Acceptable Use Policy",
    paragraphs: [
      "You shall not impersonate others, input malicious material, scrape directory records, or share login credentials with external third parties. Legitimate registration requires human compliance."
    ]
  },
  {
    id: "s12",
    num: "12",
    title: "Privacy & Data Protection",
    paragraphs: [
      "BeyondEQ is governed by our Privacy Policy. We comply with Indian Information Technology Act, 2000 and Digital Personal Data Protection Act (DPDPA), 2023. Deletion requests can be sent to privacy@beyondeq.com."
    ]
  },
  {
    id: "s13",
    num: "13",
    title: "Minor Users (Under 18)",
    paragraphs: [
      "Access for users under 18 requires parental consent or school supervision. Guarded rules are active during interactive exercises, and data from minors will never be used for profiling or external advertising."
    ]
  },
  {
    id: "s14",
    num: "14",
    title: "Disclaimers",
    paragraphs: [
      "Services are provided on an 'as is' and 'as available' basis. EQC Global LLP makes no warranties of merchantability, fitness, or absolute uninterrupted server uptime."
    ]
  },
  {
    id: "s15",
    num: "15",
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent under Indian law, EQC Global LLP's total aggregate liability is capped at the total amount actually paid by you to us in the preceding three months, or INR 5,000, whichever is greater."
    ]
  },
  {
    id: "s16",
    num: "16",
    title: "Suspension & Termination",
    paragraphs: [
      "We reserve the right to suspend or terminate accounts in breach of terms or if idle for more than 24 consecutive months. You can request deletion at any time."
    ]
  },
  {
    id: "s17",
    num: "17",
    title: "Governing Law & Dispute Resolution",
    paragraphs: [
      "These conditions are governed by Indian law. Any disputes or claims are subject to the exclusive jurisdiction of courts in Chennai, Tamil Nadu. Pre-litigation amicable resolution attempts are required."
    ]
  },
  {
    id: "s18",
    num: "18",
    title: "Modifications to These Terms",
    paragraphs: [
      "We reserve the right to update these Terms with 14 days' prominent notice prior to any material updates taking effect."
    ]
  },
  {
    id: "s19",
    num: "19",
    title: "Contact Us",
    paragraphs: [
      "Support: support@beyondeq.com | Billing: billing@beyondeq.com | Privacy: privacy@beyondeq.com"
    ]
  }
];
