import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ✅ FIX: Added 'type' keyword for strict TS compliance
import { motion, AnimatePresence, type Variants } from "framer-motion"; 
import { 
  Shield, ArrowRight, Briefcase, ChevronRight, 
  BookOpen, Infinity, Award, Headset, Users, FileText,
  CheckCircle, Mic, Video, PhoneOff, MoreHorizontal,
  Star, MapPin, Mail, Phone, ArrowUp
} from "lucide-react";

// --- 🎨 PREMIUM COLOR PALETTE ---
const brand = {
  blue: "#005EB8",
  green: "#87C232",
  dark: "#0f172a", 
  light: "#F8FAFC",
  gray: "#94a3b8",
};

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
  },
  {
    id: 1,
    line1: "We Have Collected The",
    line2: "Best Online Courses",
    line3: "For Your Future.",
    sub: "Curated content designed for the modern learner.",
    highlightColor: "text-[#005EB8]",
    buttonColor: "bg-[#005EB8]",
  },
];

// --- 📝 SECTION 3: DYNAMIC TEXTS ---
const DYNAMIC_TEXTS = [
  "Discover a transformative learning experience with iQmath's online courses, meticulously crafted for real-life applicability. Our curriculum seamlessly integrates theory with practical insights.",
  "Our expert-led sessions focus on industry-relevant skills, ensuring you stay ahead of the curve. Join thousands of successful students who have upgraded their careers.",
  "Experience interactive learning with live doubt-clearing sessions and hands-on projects. We prioritize your growth with personalized mentorship and community support."
];

// --- 🎥 YOUTUBE VIDEO DATA ---
const VIDEOS = [
  { id: "q6kVdZQLe54", title: "The Report | Hacker Rank Problem | Joins & SQL" },
  { id: "65aaipcziy0", title: "How to Install MySQL Workbench in Windows" },
  { id: "MC83S5IAQk8", title: "Connect to Database (MySQL) Using Excel" },
];

// --- ✨ FEATURE DATA ---
const FEATURES = [
  { icon: <BookOpen size={24} />, label: "10+ Online Courses" },
  { icon: <Infinity size={24} />, label: "Lifetime Access" },
  { icon: <Award size={24} />, label: "Value For Money" },
  { icon: <Headset size={24} />, label: "Lifetime Support" },
  { icon: <Users size={24} />, label: "Community Support" },
];

// --- 💬 SECTION 4: TESTIMONIALS DATA ---
const TESTIMONIALS = [
  {
    id: 1,
    name: "Logambal",
    role: "Student",
    image: "https://img.freepik.com/free-photo/young-student-woman-wearing-graduation-hat-holding-books-pointing-finger-side-looking-camera-with-happy-face-standing-white-background_141793-138374.jpg?w=1000",
    quote: "Thank you so much sir for teaching us. We learned a lot from your teaching. We will miss you. Thanks for making this learning process something different and truly engaging.",
    rating: 4
  },
  {
    id: 2,
    name: "Rahul Verma",
    role: "Data Science Intern",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1000&auto=format&fit=crop", 
    quote: "The practical approach to Data Structures changed my perspective entirely. The code arena feature helped me practice real-world problems directly in the browser.",
    rating: 5
  },
  {
    id: 3,
    name: "Priya Sharma",
    role: "Web Developer",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop", 
    quote: "I never thought learning React could be this intuitive. The instructors break down complex concepts into bite-sized, digestible lessons. Highly recommended!",
    rating: 5
  }
];

// --- 🏢 SECTION 5: CUSTOM LOGO COMPONENT (PERMANENT FIX) ---
// Renders SVG logos directly in code to avoid broken external links.
const CompanyLogo = ({ name }: { name: string }) => {
  switch (name) {
    case "Infosys":
      return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="40" fill="#007CC3">Infosys</text>
        </svg>
      );
    case "Zoho":
      return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
          <rect x="20" y="10" width="35" height="40" rx="4" fill="#e3262e" opacity="0.9" />
          <rect x="60" y="10" width="35" height="40" rx="4" fill="#2d9a46" opacity="0.9" />
          <rect x="100" y="10" width="35" height="40" rx="4" fill="#1b6eb4" opacity="0.9" />
          <rect x="140" y="10" width="35" height="40" rx="4" fill="#fbb034" opacity="0.9" />
          <text x="37.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">Z</text>
          <text x="77.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">O</text>
          <text x="117.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">H</text>
          <text x="157.5" y="38" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" fontFamily="sans-serif">O</text>
        </svg>
      );
    case "TCS":
      return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
           <path d="M40 10 C 20 10 20 50 40 50 L 160 50 C 180 50 180 10 160 10 Z" fill="none" />
           <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="45" fill="#5F259F" letterSpacing="-2">tcs</text>
        </svg>
      );
    case "Amazon":
      return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
           <text x="100" y="35" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="38" fill="#232F3E">amazon</text>
           <path d="M 45 45 Q 100 65 155 45" stroke="#FF9900" strokeWidth="4" fill="none" strokeLinecap="round" />
           <path d="M 155 45 L 150 38 M 155 45 L 148 48" stroke="#FF9900" strokeWidth="3" />
        </svg>
      );
    case "Cognizant":
      return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
           <text x="110" y="40" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="30" fill="#0033A0">Cognizant</text>
           <path d="M 30 30 L 45 15 L 60 30 L 45 45 Z" fill="#26A8E0" />
        </svg>
      );
    case "Disperse":
       return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="32" fill="#555">Disperse</text>
        </svg>
       );
    case "Tiger Analytics":
      return (
         <svg viewBox="0 0 200 60" className="w-full h-full">
           <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="28" fill="#888">TIGER</text>
           <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" fontFamily="sans-serif" fontWeight="normal" fontSize="14" fill="#aaa" letterSpacing="4">ANALYTICS</text>
         </svg>
      );
    case "NielsenIQ":
      return (
        <svg viewBox="0 0 200 60" className="w-full h-full">
          <path d="M 20 15 L 40 45 L 60 15" stroke="#87C232" strokeWidth="4" fill="none"/>
          <text x="120" y="40" textAnchor="middle" fontFamily="sans-serif" fontWeight="bold" fontSize="28" fill="#666">NielsenIQ</text>
        </svg>
      );
    default:
      return <div className="text-gray-400 font-bold">{name}</div>;
  }
};

const COMPANIES = [
  "Infosys", "Zoho", "TCS", "Disperse", 
  "Amazon", "Cognizant", "Tiger Analytics", "NielsenIQ"
];


// --- 🎞️ ANIMATION VARIANTS ---
const textContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
};

const textFromBottom: Variants = {
  hidden: { y: "110%", opacity: 0, rotate: 2 },
  visible: { y: "0%", opacity: 1, rotate: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  exit: { y: "-110%", opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }
};

const textFromTop: Variants = {
  hidden: { y: "-110%", opacity: 0, rotate: -2 },
  visible: { y: "0%", opacity: 1, rotate: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  exit: { y: "110%", opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ⏱️ CINEMATIC TIMER (HERO)
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6000); 
    return () => clearInterval(timer);
  }, []);

  // ⏱️ TEXT SLIDER TIMER (SECTION 3)
  useEffect(() => {
    const textTimer = setInterval(() => {
        setTextIndex((prev) => (prev + 1) % DYNAMIC_TEXTS.length);
    }, 5000); 
    return () => clearInterval(textTimer);
  }, []);

  // ⏱️ TESTIMONIAL SLIDER TIMER (SECTION 4)
  useEffect(() => {
    const reviewTimer = setInterval(() => {
        setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(reviewTimer);
  }, []);

  // 📜 SCROLL TO TOP LISTENER
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentSlide = SLIDES[index];
  const currentReview = TESTIMONIALS[testimonialIndex];

  return (
    <div className="min-h-screen w-full bg-white font-sans overflow-x-hidden selection:bg-[#005EB8] selection:text-white relative">
      
      {/* 🛡️ ADMIN ACCESS */}
      <div className="fixed top-6 right-6 z-50">
        <button 
          onClick={() => navigate("/admin-login")}
          className="p-3 bg-white/5 backdrop-blur-md border border-black/5 rounded-full hover:bg-white/50 hover:border-[#005EB8] transition-all group shadow-sm"
          title="Instructor Login"
        >
          <Shield className="w-6 h-6 text-slate-400 group-hover:text-[#005EB8] transition-colors" />
        </button>
      </div>

      {/* =====================================================================================
          SECTION 1: HERO
      ===================================================================================== */}
      <div className="h-screen w-full relative flex flex-col lg:flex-row bg-[#0f172a]">
        {/* LEFT SIDE: TYPOGRAPHY (60%) */}
        <div className="w-full lg:w-[60%] h-full flex flex-col justify-center px-12 lg:px-24 bg-white relative z-10 transition-colors duration-1000">
          <div className="max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div 
                key={index} 
                variants={textContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="overflow-hidden mb-1">
                  <motion.h1 variants={textFromTop} className="text-4xl lg:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
                    {currentSlide.line1}
                  </motion.h1>
                </div>
                <div className="overflow-hidden mb-1">
                  <motion.h1 variants={textFromBottom} className={`text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight ${currentSlide.highlightColor}`}>
                    {currentSlide.line2}
                  </motion.h1>
                </div>
                <div className="overflow-hidden mb-8">
                  <motion.h1 variants={textFromTop} className="text-4xl lg:text-6xl font-extrabold text-slate-800 tracking-tight leading-tight">
                    {currentSlide.line3}
                  </motion.h1>
                </div>
                <div className="overflow-hidden mb-12">
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: 0.5, duration: 0.8 } }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    className="text-xl text-slate-500 font-medium"
                  >
                    {currentSlide.sub}
                  </motion.p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className={`px-8 py-4 ${currentSlide.buttonColor} text-white text-lg font-bold rounded-xl shadow-lg shadow-black/10 flex items-center gap-3 transition-colors duration-500`}
              >
                Our Courses <ArrowRight size={20} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, borderColor: currentSlide.id === 0 ? brand.green : brand.blue, color: currentSlide.id === 0 ? brand.green : brand.blue }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 text-lg font-bold rounded-xl flex items-center gap-3 transition-colors duration-300"
              >
                Join Internship <Briefcase size={20} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: ANIMATED VISUALS (40%) */}
        <div className="hidden lg:flex w-[40%] h-full bg-[#0f172a] relative overflow-hidden items-center justify-center pl-20">
          <div className="absolute top-0 bottom-0 -left-20 w-40 bg-white transform skew-x-[-10deg] z-20"></div>
          <div className={`absolute top-0 bottom-0 -left-10 w-10 ${index === 0 ? 'bg-[#87C232]/20' : 'bg-[#005EB8]/20'} transform skew-x-[-10deg] z-10 backdrop-blur-sm transition-colors duration-1000`}></div>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className={`absolute inset-0 bg-gradient-to-br ${index === 0 ? 'from-[#87C232]/20 to-slate-900' : 'from-[#005EB8]/20 to-slate-900'}`}
            />
          </AnimatePresence>

          <div className="relative z-30 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                exit={{ scale: 1.2, opacity: 0, filter: "blur(20px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {index === 0 ? (
                  <div className="flex flex-col items-center">
                     <h1 className="text-9xl font-black text-white tracking-tighter drop-shadow-2xl">
                       iQ<span className="text-[#87C232]">math</span>
                     </h1>
                     <div className="h-1 w-32 bg-[#87C232] mt-4 mb-2 rounded-full"></div>
                     <p className="text-slate-400 text-xl font-bold tracking-[0.5em] uppercase">Technologies</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                     <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter">
                       World<br/>Class
                     </h1>
                     <div className="mt-6 flex items-center gap-3 text-[#005EB8] font-bold text-2xl border border-[#005EB8] px-6 py-2 rounded-full">
                        100+ Courses <ChevronRight />
                     </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* =====================================================================================
          SECTION 2: FEATURES & VIDEOS
      ===================================================================================== */}
      <div className="w-full bg-[#F8FAFC] py-20 px-6 lg:px-24 border-t border-slate-200">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-wrap justify-center gap-8 lg:gap-16 mb-24"
        >
          {FEATURES.map((feature, i) => (
            <div key={i} className="flex items-center gap-4 group cursor-default">
              <div className="w-14 h-14 rounded-full bg-[#005EB8]/10 flex items-center justify-center text-[#005EB8] group-hover:bg-[#005EB8] group-hover:text-white transition-all duration-300 shadow-sm">
                {feature.icon}
              </div>
              <span className="text-slate-700 font-bold text-sm lg:text-lg group-hover:text-[#005EB8] transition-colors">
                {feature.label}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {VIDEOS.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.6 }}
              whileHover={{ y: -10 }}
              className="bg-white rounded-2xl overflow-hidden shadow-xl shadow-slate-200 border border-slate-100 group"
            >
              <div className="relative pt-[56.25%] bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                ></iframe>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-800 text-sm leading-relaxed line-clamp-2 min-h-[40px]">{video.title}</h3>
                <div className="flex items-center gap-2 mt-4 text-xs text-[#005EB8] font-extrabold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  Watch Now
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
             <FileText size={18} className="text-[#005EB8]" />
             <span className="text-[#005EB8] font-extrabold tracking-widest text-sm uppercase">Popular Courses</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-[#0f172a] tracking-tight">
            Our Popular Online Courses
          </h2>
        </motion.div>
      </div>

      {/* =====================================================================================
          SECTION 3: LIVE CLASS INTERFACE
      ===================================================================================== */}
      <div className="w-full bg-white py-24 px-6 lg:px-24 flex flex-col lg:flex-row items-center gap-16 border-t border-slate-100">
        <div className="w-full lg:w-1/2">
            <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-[#005EB8]" />
                <span className="text-[#005EB8] font-bold text-xs uppercase tracking-widest">Join in your live course today</span>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-black text-[#0f172a] mb-8 leading-tight">
                Online Learning Courses Designed For Real Life
            </h2>

            <div className="min-h-[120px] mb-8">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={textIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="text-lg text-slate-500 leading-relaxed"
                    >
                        {DYNAMIC_TEXTS[textIndex]}
                    </motion.p>
                </AnimatePresence>
            </div>

            <div className="space-y-4 mb-10">
                {["Easy Online Learning Platform", "98% Course Completion Rates", "Friendly Environments & Teachers"].map((item, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                    >
                        <CheckCircle size={20} className="text-[#005EB8] fill-blue-50" />
                        <span className="text-slate-700 font-bold text-sm">{item}</span>
                    </motion.div>
                ))}
            </div>

            <button 
                onClick={() => navigate("/login")}
                className="px-8 py-4 bg-[#005EB8] text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 hover:bg-[#004a94] transition-colors flex items-center gap-2"
            >
                EXPLORE OUR COURSES <ArrowRight size={18} />
            </button>
        </div>

        <div className="w-full lg:w-1/2 relative">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 bg-slate-900"
            >
                <img 
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop" 
                    alt="Live Instructor" 
                    className="w-full h-[400px] object-cover opacity-90"
                />
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 cursor-pointer"><MoreHorizontal size={18} /></div>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 cursor-pointer"><Mic size={18} /></div>
                    <div className="w-12 h-12 rounded-full bg-[#005EB8] flex items-center justify-center text-white shadow-lg cursor-pointer animate-pulse"><Video size={20} /></div>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900 cursor-pointer"><Video size={18} /></div>
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white cursor-pointer hover:bg-red-600"><PhoneOff size={18} /></div>
                </div>
            </motion.div>
            <div className="text-center mt-6">
                <h3 className="text-2xl font-bold text-[#005EB8]">Video Class Interface</h3>
            </div>
        </div>
      </div>

      {/* =====================================================================================
          SECTION 4: TESTIMONIALS
      ===================================================================================== */}
      <div className="w-full bg-white py-24 px-6 lg:px-24 border-t border-slate-100">
        <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-3">
                <FileText size={16} className="text-[#005EB8]" />
                <span className="text-[#005EB8] font-bold text-xs uppercase tracking-widest">Our Students Testimonials</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-[#0f172a]">
                What Our Students Say About Our Classes
            </h2>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-md aspect-square bg-slate-100 rounded-2xl overflow-hidden">
                   <AnimatePresence mode="wait">
                        <motion.img 
                            key={currentReview.id}
                            src={currentReview.image} 
                            alt={currentReview.name}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="w-full h-full object-cover object-top"
                        />
                   </AnimatePresence>
                </div>
            </div>

            <div className="w-full lg:w-1/2">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentReview.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-start"
                    >
                        <div className="mb-6">
                             <img src="https://cdn-icons-png.flaticon.com/512/9358/9358782.png" alt="Quote" className="w-12 h-12 opacity-50" />
                        </div>
                        <h3 className="text-xl lg:text-2xl font-medium text-slate-600 leading-loose italic mb-8">
                            "{currentReview.quote}"
                        </h3>
                        <div className="w-full h-px bg-slate-200 mb-8"></div>
                        <div className="flex flex-col">
                            <h4 className="text-2xl font-black text-slate-900">{currentReview.name}</h4>
                            <span className="text-[#005EB8] font-bold text-sm mb-2">{currentReview.role}</span>
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        size={18} 
                                        className={`${i < currentReview.rating ? "fill-blue-500 text-blue-500" : "text-slate-300"}`} 
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
                <div className="flex gap-2 mt-8">
                    {TESTIMONIALS.map((_, i) => (
                        <div 
                            key={i}
                            className={`h-1 rounded-full transition-all duration-300 ${i === testimonialIndex ? "w-8 bg-[#005EB8]" : "w-2 bg-slate-300"}`}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* =====================================================================================
          SECTION 5: COMPANY LOGOS (PERMANENT SVG FIX)
      ===================================================================================== */}
      <div className="w-full bg-[#F1F5F9] py-16 px-6 lg:px-24 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              
              {/* LEFT: TEXT */}
              <div className="w-full lg:w-[35%]">
                  <div className="flex items-center gap-2 mb-3">
                      <FileText size={16} className="text-[#005EB8]" />
                      <span className="text-[#005EB8] font-bold text-xs uppercase tracking-widest">OUR LEARNERS WORKS AT</span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black text-[#0f172a] leading-tight">
                      Our Learners Work at <span className="text-[#005EB8]">10+</span> Global Companies
                  </h2>
              </div>

              {/* RIGHT: LOGO GRID */}
              <div className="w-full lg:w-[60%] grid grid-cols-2 md:grid-cols-4 gap-8">
                  {COMPANIES.map((company, i) => (
                      <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center justify-center p-4 h-24 bg-white rounded-xl shadow-sm border border-slate-100 group overflow-hidden"
                      >
                         <div className="w-full h-full filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 ease-in-out flex items-center justify-center">
                            <CompanyLogo name={company} />
                         </div>
                      </motion.div>
                  ))}
              </div>
          </div>
      </div>

      {/* =====================================================================================
          SECTION 6: FOOTER (Short & Dark)
      ===================================================================================== */}
      <footer className="w-full bg-[#020617] text-slate-300 py-16 px-6 lg:px-24 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            
            {/* COLUMN 1: About Company */}
            <div>
              <h4 className="text-white text-lg font-bold mb-6 pb-2 inline-block relative">
                About Company
                <span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span>
              </h4>
              <div className="flex items-center gap-2 mb-4">
                 <h1 className="text-2xl font-black text-white tracking-tighter">
                   iQ<span className="text-[#005EB8]">math</span>
                 </h1>
              </div>
            </div>

            {/* COLUMN 2: Quick Links */}
            <div>
              <h4 className="text-white text-lg font-bold mb-6 pb-2 inline-block relative">
                Quick Links
                <span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span>
              </h4>
              <ul className="space-y-3 text-sm font-medium">
                {["Marketing", "Data Science", "Business", "Design", "Photography"].map((item) => (
                  <li key={item} className="hover:text-[#005EB8] cursor-pointer transition-colors flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* COLUMN 3: Our Courses */}
            <div>
              <h4 className="text-white text-lg font-bold mb-6 pb-2 inline-block relative">
                Our Courses
                <span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span>
              </h4>
              <ul className="space-y-3 text-sm font-medium opacity-50">
                <li>Coming Soon...</li>
              </ul>
            </div>

            {/* COLUMN 4: Resources */}
            <div>
              <h4 className="text-white text-lg font-bold mb-6 pb-2 inline-block relative">
                Resources
                <span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span>
              </h4>
              <ul className="space-y-3 text-sm font-medium">
                {["Community", "Support", "Video Guides", "Documentation", "Security", "Template"].map((item) => (
                  <li key={item} className="hover:text-[#005EB8] cursor-pointer transition-colors flex items-center gap-2">
                    <span className="w-1 h-1 bg-slate-500 rounded-full"></span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* COLUMN 5: Get in touch! */}
            <div>
              <h4 className="text-white text-lg font-bold mb-6 pb-2 inline-block relative">
                Get in touch!
                <span className="absolute bottom-0 left-0 w-8 h-1 bg-[#005EB8] rounded-full"></span>
              </h4>
              <ul className="space-y-6 text-sm">
                 <li className="flex items-start gap-3">
                    <MapPin className="text-[#005EB8] mt-1 flex-shrink-0" size={18} />
                    <span className="leading-relaxed">1/339, Kulakkarai Main Rd, Thoraipakkam, Perungudi, Chennai, Tamil Nadu 600096</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Mail className="text-[#005EB8] flex-shrink-0" size={18} />
                    <span>iqmathindia@gmail.com</span>
                 </li>
                 <li className="flex items-center gap-3">
                    <Phone className="text-[#005EB8] flex-shrink-0" size={18} />
                    <span>+91 9360960219</span>
                 </li>
              </ul>
            </div>
          </div>

          {/* COPYRIGHT BAR */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
              <p>Copyright © 2023 iQmath All Rights Reserved.</p>
              <div className="flex gap-6">
                <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
                <span className="hover:text-white cursor-pointer transition-colors">Terms & Condition</span>
              </div>
          </div>
      </footer>

      {/* ⏫ SCROLL TO TOP BUTTON */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-3 bg-[#005EB8] text-white rounded-full shadow-lg hover:bg-[#004a94] transition-colors z-50"
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;