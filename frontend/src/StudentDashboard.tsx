import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react"; 
import API_BASE_URL from './config';
import { 
  LayoutDashboard, BookOpen, Compass, Award, LogOut, 
  CheckCircle, AlertTriangle, X, Save, 
  Code, Play, Monitor, ChevronRight,
  Menu, Sparkles, Zap, User, PlayCircle, Trophy, Lock
} from "lucide-react";
import { motion } from "framer-motion";

// ✅ AI IMPORTS
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs-backend-webgl";

// --- TYPES ---
interface Course { id: number; title: string; description: string; price: number; image_url: string; instructor_id: number; }
interface CodeTest { id: number; title: string; time_limit: number; problems: any[]; completed?: boolean; }

// --- RAZORPAY SCRIPT LOADER ---
const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home"); 
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [, setLoading] = useState(true);
  const [currentProgress, setCurrentProgress] = useState({ percent: 0, completed: 0, total: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Modal & Settings
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ 
    show: false, message: "", type: "success" 
  });

  // --- CODE ARENA STATES ---
  const [codeTests, setCodeTests] = useState<CodeTest[]>([]);
  const [activeTest, setActiveTest] = useState<CodeTest | null>(null);
  const [passKeyInput, setPassKeyInput] = useState("");
  const [showPassKeyModal, setShowPassKeyModal] = useState<number | null>(null);
  
  // --- 🛡️ PROCTORING STATES ---
  const [, setTimeLeft] = useState(0);
  const [warnings, setWarnings] = useState(0); 
  const [faceStatus, setFaceStatus] = useState<"ok" | "missing" | "multiple">("ok");
  const [isFullScreenViolation, setIsFullScreenViolation] = useState(false);
  
  // Problem & Code State
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [solutions, setSolutions] = useState<{[key: number]: string}>({});
  const [userCode, setUserCode] = useState("");
  const [language, setLanguage] = useState(71); 
  
  const [consoleOutput, setConsoleOutput] = useState("Ready to execute...");
  const [executionStatus, setExecutionStatus] = useState("idle"); 
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // 🎨 PROFESSIONAL THEME PALETTE
  const brand = { 
    iqBlue: "#005EB8", 
    iqGreen: "#87C232", 
    mainBg: "#E2E8F0",      
    cardBg: "#F8FAFC",      
    border: "#cbd5e1",      
    textMain: "#1e293b", 
    textLight: "#64748b" 
  };

  const languages = [
    { id: 71, name: "Python (3.8.1)", value: "python" },
    { id: 62, name: "Java (OpenJDK 13)", value: "java" },
    { id: 54, name: "C++ (GCC 9.2.0)", value: "cpp" },
    { id: 63, name: "JavaScript (Node.js)", value: "javascript" },
  ];

  // ✅ Toast Helper
  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

 useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "instructor") { 
        navigate("/dashboard"); 
        return; 
    }
    
    // Check if we already have data to prevent unnecessary re-fetching
    if (availableCourses.length === 0 && enrolledCourses.length === 0) {
        fetchData();
        fetchCodeTests();
    }
  }, []);

  useEffect(() => {
    if (enrolledCourses.length > 0) fetchCourseProgress(enrolledCourses[0].id);
  }, [enrolledCourses]);

  const fetchCourseProgress = async (courseId: number) => {
    try {
        const token = localStorage.getItem("token");
       const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/player`, {
    headers: { Authorization: `Bearer ${token}` }
});
        const modules = res.data.modules || [];
        const total = modules.length;
        const completed = modules.filter((m: any) => m.is_completed).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        setCurrentProgress({ percent, completed, total });
    } catch (err) { console.error("Failed to fetch progress", err); }
  };

  // 🛡️ MILITARY GRADE PROCTORING LOGIC
  useEffect(() => {
      let aiInterval: any;
      if (activeTest) {
          const savedWarns = localStorage.getItem(`warns_${activeTest.id}`);
          if (savedWarns) setWarnings(parseInt(savedWarns));
          const savedSolutions = localStorage.getItem(`sols_${activeTest.id}`);
          if (savedSolutions) {
              const parsed = JSON.parse(savedSolutions);
              setSolutions(parsed);
              setUserCode(parsed[0] || "# Write your solution here...");
          } else setUserCode("# Write your solution here...");

          const timer = setInterval(() => {
              setTimeLeft(prev => { if (prev <= 1) { submitTest(); return 0; } return prev - 1; });
          }, 1000);

          const triggerViolation = (type: string) => {
              const currentCount = parseInt(localStorage.getItem(`warns_${activeTest.id}`) || "0") + 1;
              localStorage.setItem(`warns_${activeTest.id}`, currentCount.toString());
              setWarnings(currentCount);
              
              if (currentCount > 2) { 
                  submitTest(true); 
                  triggerToast(`⛔ TEST TERMINATED: ${type}`, "error");
              }
          };

          const handleFullScreenChange = () => { 
             if (!document.fullscreenElement) {
                setIsFullScreenViolation(true);
                triggerViolation("Full Screen Exited"); 
             } else {
                setIsFullScreenViolation(false);
             }
          };
          
          const handleVisibilityChange = () => { 
            if (document.hidden) triggerViolation("Tab Switch Detected"); 
          };

          document.addEventListener("fullscreenchange", handleFullScreenChange);
          document.addEventListener("visibilitychange", handleVisibilityChange);

          const setupAI = async () => {
              try {
                  await tf.setBackend('webgl'); 
                  const loadedModel = await blazeface.load();
                  if (navigator.mediaDevices.getUserMedia) {
                      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                      if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                          videoRef.current.onloadeddata = () => {
                              aiInterval = setInterval(async () => {
                                  if (videoRef.current && videoRef.current.readyState === 4) {
                                      const predictions = await loadedModel.estimateFaces(videoRef.current, false);
                                      if (predictions.length === 0) setFaceStatus("missing");
                                      else if (predictions.length > 1) setFaceStatus("multiple"); 
                                      else setFaceStatus("ok");
                                  }
                              }, 1000);
                          };
                      }
                  }
              } catch(err) {}
          };
          setupAI();

          return () => {
              clearInterval(timer); clearInterval(aiInterval);
              document.removeEventListener("fullscreenchange", handleFullScreenChange);
              document.removeEventListener("visibilitychange", handleVisibilityChange);
              if(videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          };
      }
  }, [activeTest]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const allRes = await axios.get(`${API_BASE_URL}/courses`, config);
      const myRes = await axios.get(`${API_BASE_URL}/my-courses`, config);
      const myCourseIds = new Set(myRes.data.map((c: Course) => c.id));
      setAvailableCourses(allRes.data.filter((c: Course) => !myCourseIds.has(c.id)));
      setEnrolledCourses(myRes.data);
    } catch (err: any) { 
        if(err.response?.status === 401) { localStorage.clear(); navigate("/"); }
    } finally { setLoading(false); }
  };

  const fetchCodeTests = async () => {
      try {
         const res = await axios.get(`${API_BASE_URL}/code-tests`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
             setCodeTests(res.data);
      } catch(err) { console.error(err); }
  };

  const handleStartTest = async () => {
      const token = localStorage.getItem("token");
      try {
          if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(() => {});
          const formData = new FormData(); formData.append("pass_key", passKeyInput);
         const res = await axios.post(`${API_BASE_URL}/code-tests/${showPassKeyModal}/start`, formData, { headers: { Authorization: `Bearer ${token}` } });
          const prevWarns = localStorage.getItem(`warns_${res.data.id}`);
          if (prevWarns && parseInt(prevWarns) > 2) { 
              if (document.fullscreenElement) document.exitFullscreen();
              triggerToast("Test Terminated Previously", "error"); return; 
          }
          setActiveTest(res.data); setTimeLeft(res.data.time_limit * 60); setShowPassKeyModal(null); setWarnings(prevWarns ? parseInt(prevWarns) : 0);
      } catch(err) { 
          if (document.fullscreenElement) document.exitFullscreen();
          triggerToast("Invalid Pass Key", "error"); 
      }
  };

  const returnToFullScreen = async () => {
     try {
         if (document.documentElement.requestFullscreen) {
             await document.documentElement.requestFullscreen();
             setIsFullScreenViolation(false);
         }
     } catch(e) { console.log(e); }
  };

  const handleSave = () => { 
      if(!activeTest) return; 
      const newSolutions = { ...solutions, [currentProblemIndex]: userCode }; 
      setSolutions(newSolutions); 
      localStorage.setItem(`sols_${activeTest.id}`, JSON.stringify(newSolutions)); 
      triggerToast("✅ Code Saved!", "success"); 
  };

  // EXECUTION LOGIC
  const handleRun = async () => { 
      setExecutionStatus("running"); 
      setConsoleOutput("🚀 Job queued... Waiting for compiler..."); 
      
      const currentProb = activeTest?.problems[currentProblemIndex]; 
      const testCases = currentProb ? JSON.parse(currentProb.test_cases) : []; 
      const sampleInput = testCases[0]?.input || "5"; 
      const expectedOutput = testCases[0]?.output || ""; 

      try { 
          const res = await axios.post(`${API_BASE_URL}/execute`, 
    { source_code: userCode, language_id: language, stdin: sampleInput }, 
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
);
          const taskId = res.data.task_id;
          const intervalId = setInterval(async () => {
              try {
                  const statusRes = await axios.get(`${API_BASE_URL}/result/${taskId}`);
                  if (statusRes.data.status === "completed") {
                      clearInterval(intervalId);
                      const result = statusRes.data.data;
                      const rawOutput = result.output || "";
                      if (rawOutput.trim() === expectedOutput.trim()) {
                          setExecutionStatus("success"); 
                          setConsoleOutput(`✅ Success! Test Case Passed.\n\nInput: ${sampleInput}\nOutput: ${rawOutput}`); 
                      } else {
                          setExecutionStatus("error"); 
                          setConsoleOutput(`❌ Wrong Answer:\n\nInput:    ${sampleInput}\nExpected: ${expectedOutput}\nActual:   ${rawOutput}`); 
                      }
                  } else if (statusRes.data.status === "failed") {
                      clearInterval(intervalId);
                      setExecutionStatus("error");
                      setConsoleOutput("❌ System Error during execution.");
                  }
              } catch (err) {
                  clearInterval(intervalId);
                  setExecutionStatus("error");
              }
          }, 1000);
      } catch (err: any) { 
          setExecutionStatus("error"); 
          setConsoleOutput("❌ Failed to queue job."); 
      } 
  };

  const switchQuestion = (index: number) => { 
      handleSave(); 
      setCurrentProblemIndex(index); 
      setUserCode(solutions[index] || "# Write solution..."); 
      setConsoleOutput("Ready..."); 
      setExecutionStatus("idle"); 
  };

  const submitTest = async (disqualified = false) => { 
      if(!activeTest) return; 
      try { 
          await axios.post(`${API_BASE_URL}/code-tests/submit`, { 
    test_id: activeTest.id, score: disqualified ? 0 : (executionStatus === "success" ? 100 : 40), 
              problems_solved: Object.keys(solutions).length, time_taken: "Finished" 
          }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); 
          setActiveTest(null); localStorage.removeItem(`sols_${activeTest.id}`); 
          if(document.fullscreenElement) document.exitFullscreen(); 
          triggerToast(disqualified ? "Test Terminated." : "Test Submitted Successfully!", disqualified ? "error" : "success"); 
      } catch(err) {} 
  };
  
  const handleFreeEnroll = async (courseId: number) => {
      setProcessing(true);
      try {
          await axios.post(`${API_BASE_URL}/enroll/${courseId}`, { type: "paid" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          triggerToast("🎉 Enrolled!", "success"); fetchData(); setActiveTab("learning");
      } catch (err) { triggerToast("Enrollment failed.", "error"); } finally { setProcessing(false); }
  };

  // ✅ NEW: HANDLE PAYMENT OR TRIAL
  const handleEnrollStrategy = async (type: "trial" | "paid") => {
      if (!selectedCourse) return;
      setProcessing(true);

      try {
          if (type === "trial") {
              // --- 1. START FREE TRIAL (Direct API Call) ---
             await axios.post(`${API_BASE_URL}/enroll/${selectedCourse.id}`,
                { type: "trial" }, 
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
              );
              triggerToast(`🎉 Free Trial Started for ${selectedCourse.title}!`, "success");
              fetchData(); setShowModal(false); setActiveTab("learning");
          } else {
              // --- 2. BUY LIFETIME ACCESS (Razorpay) ---
              const isLoaded = await loadRazorpayScript();
              if (!isLoaded) { triggerToast("SDK Failed to load", "error"); return; }

              const token = localStorage.getItem("token");
              // Create Order
              const orderRes = await axios.post(`${API_BASE_URL}/create-order`,
                  { amount: selectedCourse.price }, 
                  { headers: { Authorization: `Bearer ${token}` } }
              );

              const options = {
                  key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
                  amount: orderRes.data.amount,
                  currency: orderRes.data.currency,
                  name: "iQmath Pro",
                  description: `Unlock ${selectedCourse.title}`,
                  order_id: orderRes.data.id,
                  handler: async function () {
                      // Verify Payment & Enroll
                      await axios.post(`${API_BASE_URL}/enroll/${selectedCourse.id}`, 
                          { type: "paid" }, 
                          { headers: { Authorization: `Bearer ${token}` } }
                      );
                      triggerToast("🎉 Payment Successful! Course Unlocked.", "success");
                      fetchData(); setShowModal(false); setActiveTab("learning");
                  },
                  prefill: { name: "Student", email: "student@iqmath.com" },
                  theme: { color: "#005EB8" },
              };

              const rzp = new (window as any).Razorpay(options);
              rzp.open();
          }
      } catch (err) {
          triggerToast("Transaction Failed.", "error");
      } finally {
          setProcessing(false);
      }
  };
  
  // 🟢 NEW: Secure Certificate Downloader
  const handleDownloadCertificate = async (courseId: number, courseTitle: string) => {
      triggerToast("Downloading certificate...", "success");
      try {
         const response = await axios.get(`${API_BASE_URL}/generate-pdf/${courseId}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
              responseType: 'blob', // Important: Tells Axios this is a file, not text
          });

          // Create a hidden download link and click it
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${courseTitle.replace(/\s+/g, '_')}_Certificate.pdf`);
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          link.remove();
          window.URL.revokeObjectURL(url);
      } catch (error) {
          console.error("Download error:", error);
          triggerToast("Failed to download certificate. Try again.", "error");
      }
  };

  const openEnrollModal = (course: Course) => { setSelectedCourse(course); setShowModal(true); };
  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // --- ⚔️ THE REAL CODE ARENA VIEW ---
  if (activeTest) { 
    return (
      <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden relative">
        {/* VIOLATION OVERLAY */}
        {isFullScreenViolation && (
            <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center text-center">
                <div className="mb-6"><AlertTriangle size={80} className="text-red-500 mx-auto mb-4" /></div>
                <h1 className="text-4xl font-extrabold text-white tracking-widest mb-4">TEST INTERRUPTED</h1>
                <p className="text-slate-400 text-lg max-w-lg mb-2">You have exited full-screen mode. This is a proctoring violation.</p>
                <div className="bg-white/10 px-8 py-3 rounded-lg border border-red-500/30 mb-8"><span className="text-red-400 font-bold text-lg tracking-wider">Remaining Warnings: {Math.max(0, 3 - warnings)}</span></div>
                <button onClick={returnToFullScreen} className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded font-bold text-lg tracking-wider flex items-center gap-2"><Monitor size={24} /> RETURN TO FULL SCREEN</button>
            </div>
        )}

        <div className="w-[35%] flex flex-col border-r border-slate-300 bg-white h-full shadow-lg z-10">
            <div className="h-16 border-b border-slate-200 flex items-center px-6 bg-white">
                <h3 className="text-2xl font-extrabold text-slate-800">problem {currentProblemIndex + 1}</h3>
                <span className="ml-auto bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded">MEDIUM</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
                 <p className="text-slate-500 mb-6 italic">No description provided.</p> 
                 {activeTest.problems[currentProblemIndex]?.description && <div className="prose prose-sm text-slate-600 mb-6">{activeTest.problems[currentProblemIndex].description}</div>}
                 <h4 className="font-extrabold text-slate-900 mb-4 text-sm uppercase tracking-wide">TEST CASES</h4>
                 <div className="space-y-2">{JSON.parse(activeTest.problems[currentProblemIndex]?.test_cases || "[]").map((tc: any, i: number) => ( <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded text-sm"><span className="font-mono font-bold block">Input: {tc.input}</span></div>))}</div>
            </div>
            <div className="h-56 bg-slate-100 border-t border-slate-300 p-4 relative flex items-center justify-center overflow-hidden">
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover rounded-lg border-2 border-slate-300 bg-black" />
                <div className="absolute top-6 left-6 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white animate-pulse"></div> REC</div>
                {faceStatus !== "ok" && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><span className="text-red-400 font-bold bg-black px-2 py-1 rounded border border-red-500">FACE MISSING</span></div>}
            </div>
        </div>

        <div className="w-[65%] flex flex-col bg-[#F3F4F6] h-full">
            <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
                 <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Code size={14}/> Code Editor</span>
                 <select value={language} onChange={(e) => setLanguage(Number(e.target.value))} className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-bold text-slate-700">
                   {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                 </select>
            </div>
            <div className="flex-1 bg-white">
                <Editor height="100%" theme="light" language={languages.find(l => l.id === language)?.value} value={userCode} onChange={(val) => setUserCode(val || "")} options={{fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, fontFamily: "'JetBrains Mono', monospace", padding: { top: 16 }, lineNumbers: "on"}} />
            </div>
            <div className="h-32 bg-[#0F172A] border-t border-slate-700 text-slate-300 p-3 font-mono text-xs overflow-y-auto flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] mb-2 border-b border-slate-700 pb-1"><Monitor size={12} /> Terminal Output</div>
                <pre className={`whitespace-pre-wrap flex-1 ${executionStatus === "error" ? "text-red-400" : "text-green-400"}`}>{executionStatus === "running" ? <span className="text-yellow-400">Compiling...</span> : consoleOutput}</pre>
            </div>
            <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-end px-6 gap-4">
                 <button onClick={() => switchQuestion(currentProblemIndex + 1 < activeTest.problems.length ? currentProblemIndex + 1 : 0)} className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"><Save size={16} /> Save & Next</button>
                 <button onClick={handleRun} disabled={executionStatus === "running"} className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[#005EB8] text-white font-bold text-sm hover:bg-blue-700 shadow-md transition-all"><Play size={16} fill="currentColor" /> Run Code</button>
            </div>
        </div>
        
        {toast.show && <div className={`fixed top-5 right-5 z-[10000] px-6 py-3 rounded-lg shadow-xl text-white font-bold flex items-center gap-3 animate-bounce ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>{toast.type === "success" ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}{toast.message}</div>}
      </div>
    );
  }

  // --- DASHBOARD UI ---
  const SidebarItem = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${active ? "bg-white text-[#005EB8] font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
      {icon} {!collapsed && <span className="text-sm">{label}</span>}
    </button>
  );

  const CourseCard = ({ course, type }: { course: Course, type: "enrolled" | "available" }) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
        <div className="h-40 bg-slate-200 relative flex items-center justify-center">
            {course.image_url ? (<img src={course.image_url.startsWith('http') ? course.image_url : `${API_BASE_URL.replace('/api/v1', '')}/${course.image_url}`} alt={course.title} className="w-full h-full object-cover" />) : (<BookOpen size={40} className="text-slate-400" />)}
            {type === "enrolled" && <div className="absolute top-2 right-2 bg-[#87C232] text-white px-2 py-1 rounded-full text-[10px] font-bold">ACTIVE</div>}
        </div>
        <div className="p-5">
            <h4 className="font-bold text-slate-800 mb-4">{course.title}</h4>
            <div className="flex justify-between items-center">
                <span className={`text-lg font-extrabold ${course.price === 0 ? "text-[#87C232]" : "text-[#005EB8]"}`}>{course.price === 0 ? "Free" : `₹${course.price}`}</span>
                {type === "available" ? (
                    <button onClick={() => course.price === 0 ? handleFreeEnroll(course.id) : openEnrollModal(course)} className={`px-4 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2 ${course.price === 0 ? "bg-[#87C232]" : "bg-[#005EB8]"}`}>
                        {course.price === 0 ? <Sparkles size={14} /> : <Lock size={14} />} {course.price === 0 ? "Enroll" : "Unlock"}
                    </button>
                ) : (
                    <button onClick={() => navigate(`/course/${course.id}/player`)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><PlayCircle size={14} /> Resume</button>
                )}
            </div>
        </div>
    </div>
  );

  const StatCard = ({ icon: Icon, label, value }: any) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 transition-all">
      <div className="p-3 rounded-xl bg-slate-100 text-slate-600"><Icon size={24} /></div>
      <div><h4 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h4><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">{label}</p></div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-[#E2E8F0] font-sans">
      <aside className={`bg-[#F8FAFC] border-r border-slate-200 p-6 flex flex-col fixed h-full z-50 transition-all ${collapsed ? "w-20" : "w-64"}`}>
        <div className="mb-10 flex items-center justify-between">{!collapsed && <span className="text-xl font-extrabold text-[#005EB8]">iQmath<span className="text-[#87C232]">Pro</span></span>}<button onClick={() => setCollapsed(!collapsed)}><Menu size={24} className="text-slate-600" /></button></div>
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Home" active={activeTab === "home"} onClick={() => setActiveTab("home")} />
          <SidebarItem icon={<BookOpen size={20} />} label="My Learning" active={activeTab === "learning"} onClick={() => setActiveTab("learning")} />
          <SidebarItem icon={<Code size={20} />} label="Code Test" active={activeTab === "test"} onClick={() => setActiveTab("test")} />
          <SidebarItem icon={<Compass size={20} />} label="Explore Courses" active={activeTab === "explore"} onClick={() => setActiveTab("explore")} />
          <SidebarItem icon={<Award size={20} />} label="My Certificates" active={activeTab === "certificates"} onClick={() => setActiveTab("certificates")} />
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-xl text-red-500 hover:bg-red-50 font-bold mt-auto transition-all"><LogOut size={20} /> {!collapsed && "Sign Out"}</button>
      </aside>

      <main className={`ml-${collapsed ? "20" : "64"} flex-1 p-10 transition-all ml-64`}>
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">{activeTab === "test" ? "Active Challenges" : "Dashboard Overview"}</h2>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full bg-[#005EB8] text-white flex items-center justify-center"><User size={20} /></button>
        </header>

        {activeTab === "home" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col gap-8">
                <div><h1 className="text-3xl font-extrabold text-slate-800 mb-2">Welcome back, Student! 👋</h1><p className="text-slate-500 font-medium flex items-center gap-2"><Sparkles size={16} className="text-yellow-500" /> You're on a <span className="text-slate-800 font-bold">5-day learning streak</span>. Keep it up!</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard icon={BookOpen} label="Courses Enrolled" value={enrolledCourses.length} /><StatCard icon={Award} label="Certificates Earned" value={0} /><StatCard icon={Trophy} label="Challenges Attended" value={codeTests.filter(t => t.completed).length} /></div>
                {enrolledCourses.length > 0 ? (
                    <motion.div whileHover={{ y: -5 }} className="bg-gradient-to-r from-[#005EB8] to-[#004080] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden"> 
                        <div className="relative z-10 w-full max-w-lg"> 
                            <div className="flex items-center gap-3 mb-4 text-blue-200 text-sm font-bold uppercase tracking-wider"><Zap size={16} /> Current Focus</div> 
                            <h2 className="text-2xl font-bold mb-6">{enrolledCourses[0].title}</h2> 
                            <div className="w-full bg-blue-900/50 rounded-full h-3 mb-4 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${currentProgress.percent}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full bg-[#87C232] rounded-full"></motion.div></div> 
                            <div className="flex justify-between text-sm font-medium opacity-90"><span>{currentProgress.percent}% Completed</span><span>{currentProgress.completed}/{currentProgress.total} Modules</span></div> 
                        </div> 
                        <button onClick={() => navigate(`/course/${enrolledCourses[0].id}/player`)} className="absolute bottom-8 right-8 bg-white text-[#005EB8] px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:bg-blue-50 transition-colors">Resume <ChevronRight size={18} /></button> 
                    </motion.div>
                ) : ( <div className="bg-white p-10 rounded-2xl border border-dashed border-slate-300 text-center"><p className="text-slate-400">Enroll in a course to track your progress here.</p></div> )}
            </motion.div>
        )}

        {activeTab === "learning" && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{enrolledCourses.map(c => <CourseCard key={c.id} course={c} type="enrolled" />)}</div>}
        {activeTab === "explore" && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{availableCourses.map(c => <CourseCard key={c.id} course={c} type="available" />)}</div>}
        {activeTab === "test" && ( <div className="grid gap-5"> {codeTests.map(test => ( <div key={test.id} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center"> <div><h3 className="text-lg font-bold text-slate-800">{test.title}</h3><p className="text-slate-500 text-sm">Duration: {test.time_limit} Mins</p></div> <button onClick={() => setShowPassKeyModal(test.id)} className="bg-[#005EB8] text-white px-6 py-2 rounded-lg font-bold">Start Test</button> </div> ))} </div> )}
        
        {/* 🎓 CERTIFICATES TAB (Added) */}
        {activeTab === "certificates" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                    <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award size={40} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Your Achievements</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Certificates are awarded upon 100% completion of a course. 
                        Click download to get your high-resolution verified PDF.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {enrolledCourses.map(course => (
                        <div key={course.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-all flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <Award size={32} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">{course.title}</h4>
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded mt-1 inline-block">COMPLETED</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleDownloadCertificate(course.id, course.title)}
                                className="bg-[#005EB8] hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                            >
                                <Sparkles size={16} /> Download PDF
                            </button>
                        </div>
                    ))}
                    
                    {enrolledCourses.length === 0 && (
                        <div className="col-span-2 text-center text-slate-400 py-10 italic">
                            No certificates earned yet. Keep learning!
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </main>
      
      
      {/* 🔵 ENROLLMENT MODAL (Correctly Placed Outside Main Loop) */}
      {showModal && selectedCourse && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#005EB8] to-[#87C232]"></div>
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            
            <div className="p-6 pb-0">
                <h3 className="text-xl font-extrabold text-slate-800 mb-1">Unlock Course</h3>
                <p className="text-slate-500 text-xs">You are about to unlock <strong>{selectedCourse.title}</strong>.</p>
            </div>

            <div className="p-6">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex items-center justify-between">
                    <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Price</span><span className="text-2xl font-extrabold text-[#005EB8]">₹{selectedCourse.price}</span></div>
                    <div className="text-right"><span className="block text-[10px] font-bold text-slate-400 uppercase">Access</span><span className="text-sm font-bold text-slate-700">Lifetime</span></div>
                </div>

                <div className="flex flex-col gap-3">
                    <button onClick={() => handleEnrollStrategy("paid")} disabled={processing} className="w-full py-3 rounded-lg bg-[#005EB8] hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
                        {processing ? "Processing..." : <><Lock size={16} /> Pay & Unlock Now</>}
                    </button>
                    <button onClick={() => handleEnrollStrategy("trial")} disabled={processing} className="w-full py-3 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm">
                        Start 7-Day Free Trial
                    </button>
                </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 🟢 PROFESSIONAL PASS KEY MODAL */}
      {showPassKeyModal !== null && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "16px", width: "400px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div className="flex justify-center mb-4"><div className="bg-blue-50 p-3 rounded-full"><Lock className="text-[#005EB8]" size={32} /></div></div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "20px", fontWeight: "800", color: brand.textMain, textAlign: "center" }}>Enter Access Key</h3>
            <p className="text-center text-slate-500 text-sm mb-6">This challenge is protected. Enter the pass key provided by your instructor.</p>
            <input type="text" placeholder="e.g. SECRET123" value={passKeyInput} onChange={(e) => setPassKeyInput(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-[#005EB8] text-center font-bold text-lg tracking-widest mb-6" />
            <div style={{ display: "flex", gap: "10px" }}><button onClick={() => setShowPassKeyModal(null)} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${brand.border}`, borderRadius: "8px", fontWeight: "bold", color: brand.textLight, cursor: "pointer" }}>Cancel</button><button onClick={handleStartTest} style={{ flex: 1, padding: "12px", background: brand.iqBlue, border: "none", borderRadius: "8px", fontWeight: "bold", color: "white", cursor: "pointer" }}>Start Test</button></div>
          </div>
        </div>
      )}

      {/* ✅ PROFESSIONAL TOAST UI */}
      {toast.show && (
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, background: "white", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)", borderLeft: `6px solid ${toast.type === "success" ? brand.iqGreen : "#ef4444"}`, display: "flex", alignItems: "center", gap: "12px", animation: "slideIn 0.3s ease-out" }}>
           {toast.type === "success" ? <CheckCircle size={24} color={brand.iqGreen} /> : <AlertTriangle size={24} color="#ef4444" />}
           <div><h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: brand.textMain }}>{toast.type === "success" ? "Success" : "Alert"}</h4><p style={{ margin: 0, fontSize: "13px", color: brand.textLight }}>{toast.message}</p></div>
           <button onClick={() => setToast({ ...toast, show: false })} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "10px" }}><X size={16} color="#94a3b8" /></button>
           <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;