export type Company = {
  name: string;
  /** Simple Icons slug — https://simpleicons.org */
  slug: string;
  /** For the favicon fallback. */
  domain: string;
};

export const COMPANIES: Company[] = [
  { name: "Razorpay", slug: "razorpay", domain: "razorpay.com" },
  { name: "Swiggy", slug: "swiggy", domain: "swiggy.com" },
  { name: "Zomato", slug: "zomato", domain: "zomato.com" },
  { name: "Flipkart", slug: "flipkart", domain: "flipkart.com" },
  { name: "Google", slug: "google", domain: "google.com" },
  { name: "Microsoft", slug: "microsoft", domain: "microsoft.com" },
  { name: "Amazon", slug: "amazon", domain: "amazon.com" },
  { name: "CRED", slug: "cred", domain: "cred.club" },
  { name: "Zerodha", slug: "zerodha", domain: "zerodha.com" },
  { name: "Paytm", slug: "paytm", domain: "paytm.com" },
  { name: "PhonePe", slug: "phonepe", domain: "phonepe.com" },
  { name: "Infosys", slug: "infosys", domain: "infosys.com" },
  { name: "TCS", slug: "tcs", domain: "tcs.com" },
  { name: "Wipro", slug: "wipro", domain: "wipro.com" },
  { name: "Adobe", slug: "adobe", domain: "adobe.com" },
  { name: "Uber", slug: "uber", domain: "uber.com" },
  { name: "Atlassian", slug: "atlassian", domain: "atlassian.com" },
  { name: "Meesho", slug: "meesho", domain: "meesho.com" },
  { name: "Groww", slug: "groww", domain: "groww.in" },
  { name: "Salesforce", slug: "salesforce", domain: "salesforce.com" },
];

export type Stat = { value: string; label: string };

// Placeholder numbers; replace before launch.
export const STATS: Stat[] = [
  { value: "50,000+", label: "Job Seekers Prepared" },
  { value: "92%", label: "Interview Success Rate" },
  { value: "500+", label: "Companies Hiring" },
  { value: "4.9★", label: "Average Rating" },
];

export type Feature = {
  icon: string;
  title: string;
  body: string;
  /** Column span in the 5-column bento grid. */
  span: 2 | 3;
  accent?: boolean;
};

export const BENTO_FEATURES: Feature[] = [
  {
    icon: "description",
    title: "ATS-Optimized Resumes",
    body: "Create single-column, highly structured resumes guaranteed to parse perfectly in Workday, Greenhouse, and Lever.",
    span: 3,
  },
  {
    icon: "adjust",
    title: "JD Tailoring",
    body: "Paste any job description. Our AI instantly rewrites your bullets to match the exact keywords.",
    span: 2,
  },
  {
    icon: "star",
    title: "STAR Builder",
    body: "Structure your behavioral answers perfectly using the Situation, Task, Action, Result framework.",
    span: 2,
    accent: true,
  },
  {
    icon: "mic",
    title: "Live AI Mock Interviews",
    body: "Practice out loud. Our AI asks role-specific questions, listens to your responses, and provides a brutal, honest scorecard.",
    span: 3,
  },
];

export const CORE_FEATURES: Omit<Feature, "span">[] = [
  {
    icon: "description",
    title: "AI Resume Builder",
    body: "Builds a professional ATS resume from 8 quick questions. Includes 12+ ATS-friendly templates focusing on campus freshers and professional formats. Clean A4 PDF, ATS-parseable.",
  },
  {
    icon: "auto_fix_high",
    title: "JD-Tailored Rewriting",
    body: "Instantly rewrites your resume to perfectly match any job description with intelligent keyword matching, ensuring you pass the initial screening.",
  },
  {
    icon: "record_voice_over",
    title: "Live AI Mock Interview",
    body: "Experience a voice-based interview with real-time follow-ups and a detailed scorecard. Questions are experience-calibrated to match your career level.",
  },
];

export const GAP_FEATURES: Omit<Feature, "span">[] = [
  {
    icon: "analytics",
    title: "Skill Gap Analysis",
    body: "Identify exactly where your profile falls short of job requirements and get actionable steps to bridge them.",
  },
  {
    icon: "psychology",
    title: "Behavioral Questions & Intent",
    body: "Master common behavioral questions with a deep dive into what recruiters are actually looking for in your answers.",
  },
  {
    icon: "terminal",
    title: "Practical Technical Challenges",
    body: "Solve real-world technical problems that test your core competencies, accompanied by the reasoning behind each task.",
  },
];

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The AI interviewer was brutal, but exactly what I needed. It grilled me on my system design tradeoffs just like the real loop.",
    name: "Aditya S.",
    role: "SDE-2 at Amazon",
  },
  {
    quote:
      "Strategy-AI tailored my resume to the exact PM job description in seconds. It kept my metrics but upgraded the impact language perfectly.",
    name: "Priya M.",
    role: "Product Manager at Razorpay",
  },
  {
    quote:
      "I was struggling to get past ATS filters. I used the tech template here, tailored it, and got 3 interview calls the next week.",
    name: "Rahul T.",
    role: "Frontend Engineer at Swiggy",
  },
  {
    quote:
      "The STAR method builder helped me structure my behavioral answers. I used to ramble, but this forced me to be concise and impactful.",
    name: "Sneha K.",
    role: "Data Scientist at Flipkart",
  },
  {
    quote:
      "The skill gap analysis is insane. It doesn't just give you tutorials, it maps out the exact architecture concepts you need for the interview.",
    name: "Vikram R.",
    role: "Analyst at CRED",
  },
  {
    quote:
      "I've tried every resume builder. This is the only one that actually understands what tech recruiters are looking for. No fluff, just results.",
    name: "Ananya D.",
    role: "Software Engineer at Google",
  },
];

export const STAR_STEPS = [
  {
    letter: "S",
    title: "Situation",
    body: "Set the scene and give the necessary details of your example.",
  },
  {
    letter: "T",
    title: "Task",
    body: "Describe what your responsibility was in that situation.",
  },
  {
    letter: "A",
    title: "Action",
    body: "Explain exactly what steps you took to address it.",
  },
  {
    letter: "R",
    title: "Result",
    body: "Share what outcomes your actions achieved.",
  },
];
