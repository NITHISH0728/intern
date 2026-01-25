import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion"; 
import { 
  Shield, ArrowRight, Briefcase, ChevronRight, 
  BookOpen, Infinity, Award, Headset, Users, FileText,
  CheckCircle, Mic, Video, PhoneOff, MoreHorizontal,
  Star, MapPin, Mail, Phone, ArrowUp
} from "lucide-react";

// --- 🎨 BRAND CONSTANTS ---
const BRAND_BLUE = "#005EB8";
const BRAND_GREEN = "#87C232";

// --- 🔄 HERO SLIDE DATA ---
const SLIDES = [
  {
    id: 0,
    line1: "Learn Every Day & Any",
    line2: "New Skills Online",
    line3: "With Our iQmath Platform.",
    sub: "Future-proof your career with world-class education.",
    highlightColor: "text-[#87C232]",
    buttonColor: "bg-[#87C232]",
    panelGradient: "from-[#4A7729] via-[#87C232] to-[#2D4B19]",
    accent: BRAND_GREEN
  },
  {
    id: 1,
    line1: "We Have Collected The",
    line2: "Best Online Courses",
    line3: "For Your Future.",
    sub: "Curated content designed for the modern learner.",
    highlightColor: "text-[#005EB8]",
    buttonColor: "bg-[#005EB8]",
    panelGradient: "from-[#003366] via-[#005EB8] to-[#001A33]",
    accent: BRAND_BLUE
  },
];

// --- 🎨 PRECISE BRAND LOGO (EXACT REPLICA) ---
const IQMathLogo = ({ isTwoTone = false, color = "white" }) => (
  <svg 
    viewBox="0 0 540 160" 
    className="w-full max-w-[320px] lg:max-w-[440px]"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="translate(10, 20)">
      {/* Precise 'i' */}
      <circle cx="35" cy="15" r="10" fill={isTwoTone ? BRAND_BLUE : color} />
      <rect x="25" y="32" width="20" height="68" rx="5" fill={isTwoTone ? BRAND_BLUE : color} />
      
      {/* Precise 'Q' */}
      <path 
        d="M105 15 A50 50 0 1 0 105 115" 
        stroke={isTwoTone ? BRAND_BLUE : color} 
        strokeWidth="18" 
        fill="none" 
      />
      <path 
        d="M105 15 A50 50 0 0 1 140 105 L 155 125" 
        stroke={isTwoTone ? BRAND_GREEN : color} 
        strokeWidth="18" 
        fill="none" 
        strokeLinecap="round" 
      />
      
      {/* Circuit Nodes */}
      <g stroke={isTwoTone ? BRAND_GREEN : color} strokeWidth="2.5" fill="none">
        <path d="M85 65 V50 H95" />
        <path d="M105 42 V55" />
        <path d="M122 75 V60 H112" />
        <circle cx="85" cy="65" r="5" fill={isTwoTone ? BRAND_GREEN : color} stroke="none" />
        <circle cx="105" cy="42" r="5" fill={isTwoTone ? BRAND_GREEN : color} stroke="none" />
        <circle cx="122" cy="75" r="5" fill={isTwoTone ? BRAND_GREEN : color} stroke="none" />
      </g>
    </g>
    <text x="180" y="118" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="105" fill={isTwoTone ? BRAND_BLUE : color} letterSpacing="-5">math</text>
    <text x="185" y="148" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="34" fill={isTwoTone ? BRAND_GREEN : color} letterSpacing="4">Build Your Dreams</text>
  </svg>
);

// --- 📝 SECTION DATA ---
const DYNAMIC_TEXTS = [
  "Discover a transformative learning experience with iQmath's online courses, meticulously crafted for real-life applicability. Our curriculum seamlessly integrates theory with practical insights.",
  "Our expert-led sessions focus on industry-relevant skills, ensuring you stay ahead of the curve. Join thousands of successful students who have upgraded their careers.",
  "Experience interactive learning with live doubt-clearing sessions and hands-on projects. We prioritize your growth with personalized mentorship and community support."
];

const VIDEOS = [
  { id: "q6kVdZQLe54", title: "The Report | Hacker Rank Problem | Joins & SQL" },
  { id: "65aaipcziy0", title: "How to Install MySQL Workbench in Windows" },
  { id: "MC83S5IAQk8", title: "Connect to Database (MySQL) Using Excel" },
];

const FEATURES = [
  { icon: <BookOpen size={24} />, label: "10+ Online Courses" },
  { icon: <Infinity size={24} />, label: "Lifetime Access" },
  { icon: <Award size={24} />, label: "Value For Money" },
  { icon: <Headset size={24} />, label: "Lifetime Support" },
  { icon: <Users size={24} />, label: "Community Support" },
];

const TESTIMONIALS = [
  { id: 1, name: "Logambal", role: "Student", image: "https://img.freepik.com/free-photo/young-student-woman-wearing-graduation-hat-holding-books-pointing-finger-side-looking-camera-with-happy-face-standing-white-background_141793-138374.jpg?w=1000", quote: "Thank you so much sir for teaching us. We learned a lot from your teaching. We will miss you. Thanks for making this learning process something different and truly engaging.", rating: 4 },
  { id: 2, name: "Rahul Verma", role: "Data Science Intern", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1000&auto=format&fit=crop", quote: "The practical approach to Data Structures changed my perspective entirely. The code arena feature helped me practice real-world problems directly in the browser.", rating: 5 },
  { id: 3, name: "Priya Sharma", role: "Web Developer", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop", quote: "I never thought learning React could be this intuitive. The instructors break down complex concepts into bite-sized, digestible lessons. Highly recommended!", rating: 5 }
];

const CompanyLogo = ({ name }: { name: string }) => {
  switch (name) {
    case "Infosys": return <svg viewBox="0 0 200 60" className="w-full h-full"><text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="40" fill="#007CC3">Infosys</text></svg>;
    case "Zoho": return <svg viewBox="0 0 200 60" className="w-full h-full"><rect x="20" y="10" width="35" height="40" rx="4" fill="#e3262e" opacity="0.9" /><rect x="60" y="10" width="35" height="40" rx="4" fill="#2d9a46" opacity="0.9" /><rect x="100" y="10" width="35" height="40" rx="4" fill="#1b6eb4" opacity="0.9" /><rect x="140" y="10" width="35" height="40" rx="4" fill="#fbb034" opacity="0.9" /><text x="37.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">Z</text><text x="77.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">O</text><text x="117.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">H</text><text x="157.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">O</text></svg>;
    case "TCS": return <svg viewBox="0 0 200 60" className="w-full h-full"><text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="45" fill="#5F259F" letterSpacing="-2">tcs</text></svg>;
    case "Amazon": return <svg viewBox="0 0 200 60" className="w-full h-full"><text x="100" y="35" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="38" fill="#232F3E">amazon</text><path d="M 45 45 Q 100 65 155 45" stroke="#FF9900" strokeWidth="4" fill="none" /></svg>;
    case "Cognizant": return <svg viewBox="0 0 200 60" className="w-full h-full"><text x="110" y="40" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="30" fill="#0033A0">Cognizant</text><path d="M 30 30 L 45 15 L 60 30 L 45 45 Z" fill="#26A8E0" /></svg>;
    case "NielsenIQ": return <svg viewBox="0 0 200 60" className="w-full h-full"><path d="M 20 15 L 40 45 L 60 15" stroke="#87C232" strokeWidth="4" fill="none"/><text x="120" y="40" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="28" fill="#666">NielsenIQ</text></svg>;
    default: return <div className="text-gray-400 font-bold">{name}</div>;
  }
};

const COMPANIES = ["Infosys", "Zoho", "TCS", "Amazon", "Cognizant", "NielsenIQ"];

const LandingPage = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const heroTimer = setInterval(() => setIndex((prev) => (prev + 1) % SLIDES.length), 6000);
    const textTimer = setInterval(() => setTextIndex((prev) => (prev + 1) % DYNAMIC_TEXTS.length), 5000);
    const reviewTimer = setInterval(() => setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length), 5000);
    return () => { clearInterval(heroTimer); clearInterval(textTimer); clearInterval(reviewTimer); };
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentSlide = SLIDES[index];
  const currentReview = TESTIMONIALS[testimonialIndex];

  return (
    <div className="min-h-screen w-full bg-white font-sans overflow-x-hidden selection:bg-[#005EB8] selection:text-white relative">
      
      {/* 🛡️ ADMIN ACCESS */}
      <div className="fixed top-6 right-6 z-50">
        <button onClick={() => navigate("/admin-login")} className="p-3 bg-white/5 backdrop-blur-md border border-black/5 rounded-full hover:bg-white/50 transition-all group shadow-sm">
          <Shield className="w-6 h-6 text-slate-400 group-hover:text-[#005EB8]" />
        </button>
      </div>

      {/* ================= SECTION 1: HERO (SHARP PARTITION) ================= */}
      <div className="h-screen w-full relative flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT CONTENT */}
        <div className="w-full lg:w-[50%] h-full flex flex-col justify-center px-10 lg:px-20 bg-white relative z-20">
          <div className="absolute top-10 left-10 lg:left-20 scale-50 origin-left">
             <IQMathLogo isTwoTone={true} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="mt-12">
              <div className="space-y-0 text-slate-800">
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-1">{currentSlide.line1}</h2>
                <h1 className={`text-5xl lg:text-6xl font-black leading-tight ${currentSlide.highlightColor} tracking-tighter`}>{currentSlide.line2}</h1>
                <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mt-1">{currentSlide.line3}</h2>
              </div>
              <p className="text-lg text-slate-500 mt-6 mb-10 font-medium max-w-md leading-relaxed">{currentSlide.sub}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-5">
            <button onClick={() => navigate("/login")} className={`px-8 py-3.5 ${currentSlide.buttonColor} text-white font-bold rounded-full shadow-lg flex items-center gap-2 hover:brightness-110 transition-all`}>
              <ChevronRight size={20} strokeWidth={3} /> Our Courses
            </button>
            <button className="px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-full shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all">
              <Briefcase size={18} className="text-slate-400" /> Join Internship
            </button>
          </div>
        </div>

        {/* RIGHT VISUAL PANEL */}
        <div className="hidden lg:flex w-[50%] h-full relative items-center justify-center">
          {/* Skewed Backgrounds */}
          <div className="absolute top-0 bottom-0 -left-28 w-56 bg-white transform skew-x-[-18deg] z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.05)]"></div>
          <motion.div animate={{ backgroundColor: currentSlide.accent }} className="absolute top-0 bottom-0 -left-14 w-4 transform skew-x-[-18deg] z-10 opacity-30" />
          <motion.div key={`bg-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className={`absolute inset-0 bg-gradient-to-br ${currentSlide.panelGradient}`} />
          
          {/* Dynamic Content */}
          <div className="relative z-20">
            <AnimatePresence mode="wait">
              <motion.div 
                key={`content-${index}`} 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 1.05, opacity: 0 }} 
                transition={{ duration: 0.5 }} 
                className="drop-shadow-[0_25px_40px_rgba(0,0,0,0.3)] text-center"
              >
                
                {/* ✅ LOGIC CHANGE: Different content for different slides */}
                {index === 0 ? (
                    // Slide 1 (Green): Show Logo with Custom Color
                    // You asked to change "Technologies" font color. 
                    // I'm passing 'color="white"' which makes the base text white.
                    // The component logic uses BRAND_GREEN for "Technologies" if isTwoTone is true.
                    // To force a specific color, we might need to tweak the SVG component or just pass props.
                    <IQMathLogo isTwoTone={false} color="white" /> 
                ) : (
                    // Slide 2 (Blue): Show "World Class Courses" Text
                    <div className="text-white">
                        <h1 className="text-7xl font-black tracking-tighter leading-none mb-2">
                            WORLD<br/>CLASS<br/>COURSES
                        </h1>
                        <div className="h-2 w-32 bg-yellow-400 mx-auto rounded-full mt-6" />
                    </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      {/* ================= SECTION 2: FEATURES & VIDEOS ================= */}
      <div className="w-full bg-[#F8FAFC] py-20 px-6 lg:px-24 border-t border-slate-200">
        <div className="flex flex-wrap justify-center gap-8 lg:gap-16 mb-24">
          {FEATURES.map((feature, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <div className="w-14 h-14 rounded-full bg-[#005EB8]/10 flex items-center justify-center text-[#005EB8] group-hover:bg-[#005EB8] group-hover:text-white transition-all shadow-sm">{feature.icon}</div>
              <span className="text-slate-700 font-bold text-lg">{feature.label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {VIDEOS.map((video) => (
            <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-100">
              <div className="relative pt-[56.25%] bg-black">
                <iframe src={`https://www.youtube.com/embed/${video.id}`} title={video.title} className="absolute top-0 left-0 w-full h-full" allowFullScreen></iframe>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-800 text-sm leading-relaxed line-clamp-2 min-h-[40px]">{video.title}</h3>
                <div className="flex items-center gap-2 mt-4 text-xs text-[#005EB8] font-extrabold uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Watch Now
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= SECTION 3: LIVE CLASS SECTION ================= */}
      <div className="w-full bg-white py-24 px-6 lg:px-24 flex flex-col lg:flex-row items-center gap-16 border-t border-slate-100">
        <div className="w-full lg:w-1/2">
            <h2 className="text-4xl lg:text-5xl font-black text-[#0f172a] mb-8 leading-tight">Online Learning Designed For Real Life</h2>
            <div className="min-h-[120px] mb-8">
                <AnimatePresence mode="wait">
                    <motion.p key={textIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="text-lg text-slate-500 leading-relaxed">
                        {DYNAMIC_TEXTS[textIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>
            <div className="space-y-4 mb-10">
                {["Easy Online Learning Platform", "98% Course Completion Rates", "Friendly Environments & Teachers"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3"><CheckCircle size={20} className="text-[#005EB8] fill-blue-50" /><span className="text-slate-700 font-bold text-sm">{item}</span></div>
                ))}
            </div>
            <button onClick={() => navigate("/login")} className="px-8 py-4 bg-[#005EB8] text-white font-bold rounded-xl shadow-lg hover:bg-[#004a94] flex items-center gap-2">EXPLORE OUR COURSES <ArrowRight size={18} /></button>
        </div>
        <div className="w-full lg:w-1/2 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-100 bg-slate-900">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop" alt="Live Instructor" className="w-full h-[400px] object-cover opacity-90" />
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900"><Mic size={18} /></div>
                    <div className="w-12 h-12 rounded-full bg-[#005EB8] flex items-center justify-center text-white shadow-lg animate-pulse"><Video size={20} /></div>
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white"><PhoneOff size={18} /></div>
                </div>
            </div>
        </div>
      </div>

      {/* ================= SECTION 4: TESTIMONIALS ================= */}
      <div className="w-full bg-white py-24 px-6 lg:px-24 border-t border-slate-100">
        <div className="text-center mb-16"><h2 className="text-4xl lg:text-5xl font-black text-[#0f172a]">What Our Students Say</h2></div>
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-md aspect-square bg-slate-100 rounded-2xl overflow-hidden">
                   <AnimatePresence mode="wait"><motion.img key={currentReview.id} src={currentReview.image} alt={currentReview.name} initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="w-full h-full object-cover object-top" /></AnimatePresence>
                </div>
            </div>
            <div className="w-full lg:w-1/2">
                <AnimatePresence mode="wait">
                    <motion.div key={currentReview.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.5 }}>
                        <h3 className="text-xl lg:text-2xl font-medium text-slate-600 italic mb-8">"{currentReview.quote}"</h3>
                        <div className="w-full h-px bg-slate-200 mb-8"></div>
                        <h4 className="text-2xl font-black text-slate-900">{currentReview.name}</h4>
                        <span className="text-[#005EB8] font-bold text-sm mb-2">{currentReview.role}</span>
                        <div className="flex gap-1">{[...Array(5)].map((_, i) => (<Star key={i} size={18} className={`${i < currentReview.rating ? "fill-blue-500 text-blue-500" : "text-slate-300"}`} />))}</div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
      </div>

      {/* ================= SECTION 5: COMPANY LOGOS ================= */}
      <div className="w-full bg-[#F1F5F9] py-16 px-6 lg:px-24 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="w-full lg:w-[35%]"><h2 className="text-3xl lg:text-4xl font-black text-[#0f172a] leading-tight">Our Learners Work at <span className="text-[#005EB8]">10+</span> Global Companies</h2></div>
              <div className="w-full lg:w-[60%] grid grid-cols-2 md:grid-cols-3 gap-8">
                  {COMPANIES.map((company, i) => (
                      <div key={i} className="flex items-center justify-center p-4 h-24 bg-white rounded-xl shadow-sm border border-slate-100 group overflow-hidden">
                         <div className="w-full h-full filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 ease-in-out flex items-center justify-center"><CompanyLogo name={company} /></div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* ================= SECTION 6: FOOTER ================= */}
      <footer className="w-full bg-[#020617] text-slate-300 py-16 px-6 lg:px-24 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            <div><h4 className="text-white text-lg font-bold mb-6 relative pb-2">About Company<span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span></h4><h1 className="text-2xl font-black text-white tracking-tighter">iQ<span className="text-[#005EB8]">math</span></h1></div>
            <div><h4 className="text-white text-lg font-bold mb-6 relative pb-2">Quick Links<span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span></h4><ul className="space-y-3 text-sm font-medium">{["Marketing", "Data Science", "Business"].map((item) => (<li key={item} className="hover:text-[#005EB8] cursor-pointer transition-colors">{item}</li>))}</ul></div>
            <div><h4 className="text-white text-lg font-bold mb-6 relative pb-2">Resources<span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span></h4><ul className="space-y-3 text-sm font-medium">{["Community", "Support", "Documentation"].map((item) => (<li key={item} className="hover:text-[#005EB8] cursor-pointer transition-colors">{item}</li>))}</ul></div>
            <div><h4 className="text-white text-lg font-bold mb-6 relative pb-2">Get in touch!<span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span></h4><ul className="space-y-4 text-sm"><li className="flex gap-3"><MapPin size={18} className="text-[#005EB8]" /> Chennai, Tamil Nadu</li><li className="flex gap-3"><Mail size={18} className="text-[#005EB8]" /> iqmathindia@gmail.com</li></ul></div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500"><p>Copyright © 2023 iQmath All Rights Reserved.</p></div>
      </footer>

      {/* SCROLL TO TOP */}
      <AnimatePresence>{showScrollTop && (<motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-8 right-8 p-3 bg-[#005EB8] text-white rounded-full shadow-lg z-50 hover:bg-[#004a94] transition-colors"><ArrowUp size={24} /></motion.button>)}</AnimatePresence>
    </div>
    </div>
  );
};

export default LandingPage;