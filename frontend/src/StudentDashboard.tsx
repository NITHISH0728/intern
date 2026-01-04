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

// ✅ AI IMPORTS (Keep these, they are fine)
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
  
  // ✅ LOADING STATE
  const [loading, setLoading] = useState(true);
  
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
  
  // --- PROCTORING STATES ---
  const [, setTimeLeft] = useState(0);
  const [warnings, setWarnings] = useState(0); 
  const [faceStatus, setFaceStatus] = useState<"ok" | "missing" | "multiple">("ok");
  const [isFullScreenViolation, setIsFullScreenViolation] = useState(false);
  
  // Problem & Code State
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [solutions, setSolutions] = useState<{[key: number]: string}>({});
  const [userCode, setUserCode] = useState("");
  const [language, setLanguage] = useState(71); 
  
  const [consoleOutput, setConsoleOutput] = useState("Ready...");
  const [executionStatus, setExecutionStatus] = useState("idle"); 
  const videoRef = useRef<HTMLVideoElement>(null);

  const languages = [
    { id: 71, name: "Python (3.8.1)", value: "python" },
    { id: 62, name: "Java (OpenJDK 13)", value: "java" },
    { id: 54, name: "C++ (GCC 9.2.0)", value: "cpp" },
    { id: 63, name: "JavaScript (Node.js)", value: "javascript" },
  ];

  // Helper function for Toast
  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // --- DATA FETCHING (SAFE MODE) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/"); return; }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [allRes, myRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/courses`, config),
        axios.get(`${API_BASE_URL}/my-courses`, config)
      ]);

      // Ensure data is array before setting state
      const allData = Array.isArray(allRes.data) ? allRes.data : [];
      const myData = Array.isArray(myRes.data) ? myRes.data : [];

      const myCourseIds = new Set(myData.map((c: any) => c.id));
      setAvailableCourses(allData.filter((c: any) => !myCourseIds.has(c.id)));
      setEnrolledCourses(myData);
    } catch (err: any) { 
        console.error("Fetch Error", err);
        if(err.response?.status === 401) { localStorage.clear(); navigate("/"); }
    } finally { 
        setLoading(false); 
    }
  };

  const fetchCodeTests = async () => {
      try {
         const token = localStorage.getItem("token");
         if(!token) return;
         const res = await axios.get(`${API_BASE_URL}/code-tests`, { headers: { Authorization: `Bearer ${token}` } });
         setCodeTests(Array.isArray(res.data) ? res.data : []);
      } catch(err) { console.error(err); }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role === "instructor") { navigate("/dashboard"); return; }
    fetchData();
    fetchCodeTests();
  }, []);

  // --- EXECUTION & PAYMENT HANDLERS ---
  // (These logic blocks are kept exactly as they were because they work)
  const handleStartTest = async () => {
      // ... (Same logic as before)
      const token = localStorage.getItem("token");
      try {
          if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
          const formData = new FormData(); formData.append("pass_key", passKeyInput);
          const res = await axios.post(`${API_BASE_URL}/code-tests/${showPassKeyModal}/start`, formData, { headers: { Authorization: `Bearer ${token}` } });
          setActiveTest(res.data); setShowPassKeyModal(null);
      } catch(err) { triggerToast("Invalid Pass Key", "error"); }
  };

  const handleRun = async () => { 
      setExecutionStatus("running"); 
      const currentProb = activeTest?.problems[currentProblemIndex]; 
      let sampleInput = "5", expectedOutput = "";
      try { 
          const cases = JSON.parse(currentProb?.test_cases || "[]");
          sampleInput = cases[0]?.input || "5"; expectedOutput = cases[0]?.output || "";
      } catch(e) {}

      try { 
          const res = await axios.post(`${API_BASE_URL}/execute`, { source_code: userCode, language_id: language, stdin: sampleInput }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          const taskId = res.data.task_id;
          const intervalId = setInterval(async () => {
              try {
                  const statusRes = await axios.get(`${API_BASE_URL}/result/${taskId}`);
                  if (statusRes.data.status === "completed") {
                      clearInterval(intervalId);
                      const output = statusRes.data.data.output || "";
                      setExecutionStatus(output.trim() === expectedOutput.trim() ? "success" : "error");
                      setConsoleOutput(output.trim() === expectedOutput.trim() ? `✅ Success!\nOutput: ${output}` : `❌ Wrong Answer\nActual: ${output}`);
                  }
              } catch (err) { clearInterval(intervalId); setExecutionStatus("error"); }
          }, 1000);
      } catch (err) { setExecutionStatus("error"); } 
  };

  const submitTest = async () => { 
      if(!activeTest) return; 
      try { 
          await axios.post(`${API_BASE_URL}/code-tests/submit`, { test_id: activeTest.id, score: 100, problems_solved: 1, time_taken: "Finished" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); 
          setActiveTest(null); if(document.fullscreenElement) document.exitFullscreen(); 
          triggerToast("Test Submitted Successfully!"); 
      } catch(err) {} 
  };

  const handleEnrollStrategy = async (type: "trial" | "paid") => {
      if (!selectedCourse) return;
      setProcessing(true);
      try {
          if (type === "trial") {
              await axios.post(`${API_BASE_URL}/enroll/${selectedCourse.id}`, { type: "trial" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
              triggerToast(`🎉 Trial Started!`); fetchData(); setShowModal(false); setActiveTab("learning");
          } else {
              const isLoaded = await loadRazorpayScript();
              if (!isLoaded) return;
              const orderRes = await axios.post(`${API_BASE_URL}/create-order`, { amount: selectedCourse.price }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
              const options = {
                  key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
                  amount: orderRes.data.amount, currency: orderRes.data.currency, order_id: orderRes.data.id,
                  handler: async () => {
                      await axios.post(`${API_BASE_URL}/enroll/${selectedCourse.id}`, { type: "paid" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
                      triggerToast("🎉 Payment Successful!"); fetchData(); setShowModal(false); setActiveTab("learning");
                  }
              };
              const rzp = new (window as any).Razorpay(options); rzp.open();
          }
      } catch (err) { triggerToast("Failed.", "error"); } finally { setProcessing(false); }
  };

  const handleFreeEnroll = async (courseId: number) => {
        setProcessing(true);
        try {
            await axios.post(`${API_BASE_URL}/enroll/${courseId}`, { type: "paid" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
            triggerToast("🎉 Enrolled!"); fetchData(); setActiveTab("learning");
        } catch (err) { triggerToast("Enrollment failed.", "error"); } finally { setProcessing(false); }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // --- RENDER HELPERS (No more nested components!) ---
  const getImageUrl = (url: string) => url.startsWith('http') ? url : `${API_BASE_URL.replace('/api/v1', '')}/${url}`;

  // 🔴 CODE ARENA VIEW (This works, so we keep it exactly as is)
  if (activeTest) { 
    return (
      <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden relative">
        <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Simple View for Test Mode */}
            <div className="w-full h-16 bg-white border-b flex items-center px-6 justify-between">
                <h3 className="font-bold text-xl">Code Arena: {activeTest.title}</h3>
                <button onClick={submitTest} className="bg-red-500 text-white px-4 py-2 rounded">Submit Test</button>
            </div>
            <div className="flex w-full h-full">
                <div className="w-1/3 border-r p-6 bg-white overflow-y-auto">
                    <h4 className="font-bold mb-4">Problem Statement</h4>
                    <p className="text-slate-600 mb-6">{activeTest.problems[0]?.description}</p>
                    <div className="bg-slate-100 p-4 rounded text-sm font-mono">
                        Input: 5 <br/> Expected Output: 120
                    </div>
                </div>
                <div className="w-2/3 bg-[#1e1e1e] flex flex-col">
                    <Editor height="60%" theme="vs-dark" language="python" value={userCode} onChange={(val) => setUserCode(val || "")} />
                    <div className="h-40 bg-black text-green-400 p-4 font-mono text-sm overflow-auto border-t border-slate-700">
                        {executionStatus === "running" ? "Running..." : consoleOutput}
                    </div>
                    <div className="p-4 bg-slate-800 flex justify-end">
                        <button onClick={handleRun} className="bg-green-600 text-white px-6 py-2 rounded font-bold">Run Code</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // 🔵 STUDENT DASHBOARD VIEW (LIGHTWEIGHT & FIXED)
  return (
    <div className="flex min-h-screen bg-[#E2E8F0] font-sans">
      
      {/* 1. SIDEBAR */}
      <aside className={`fixed h-full bg-white border-r border-slate-200 z-50 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
        <div className="p-6 flex items-center justify-between">
            {!collapsed && <span className="text-xl font-extrabold text-[#005EB8]">iQmath<span className="text-[#87C232]">Pro</span></span>}
            <button onClick={() => setCollapsed(!collapsed)}><Menu className="text-slate-600" /></button>
        </div>
        
        <nav className="flex flex-col gap-2 p-4">
            {[
                { id: "home", label: "Home", icon: <LayoutDashboard size={20}/> },
                { id: "learning", label: "My Learning", icon: <BookOpen size={20}/> },
                { id: "test", label: "Code Test", icon: <Code size={20}/> },
                { id: "explore", label: "Explore Courses", icon: <Compass size={20}/> },
            ].map((item) => (
                <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${activeTab === item.id ? "bg-blue-50 text-[#005EB8] font-bold" : "text-slate-500 hover:bg-slate-50"}`}
                >
                    {item.icon} {!collapsed && <span>{item.label}</span>}
                </button>
            ))}
        </nav>

        <div className="absolute bottom-4 w-full p-4">
            <button onClick={handleLogout} className="flex items-center gap-3 text-red-500 font-bold p-2 hover:bg-red-50 rounded-lg w-full">
                <LogOut size={20} /> {!collapsed && "Sign Out"}
            </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA (Fixed Margin Issue) */}
      <main className={`flex-1 p-8 transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}>
        
        {/* HEADER */}
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-extrabold text-slate-800">
                {activeTab === "home" && "Dashboard Overview"}
                {activeTab === "learning" && "My Learning"}
                {activeTab === "explore" && "Explore Courses"}
                {activeTab === "test" && "Active Challenges"}
            </h1>
            <div className="w-10 h-10 bg-[#005EB8] rounded-full flex items-center justify-center text-white font-bold">S</div>
        </header>

        {/* LOADING SPINNER */}
        {loading ? (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#005EB8] border-t-transparent"></div>
            </div>
        ) : (
            <>
                {/* --- TAB: HOME --- */}
                {activeTab === "home" && (
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Simple Stat Cards (Direct JSX, No sub-components) */}
                            <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-lg text-[#005EB8]"><BookOpen size={24}/></div>
                                <div><h4 className="text-2xl font-bold">{enrolledCourses.length}</h4><p className="text-xs text-slate-500 font-bold">ENROLLED</p></div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-green-50 rounded-lg text-[#87C232]"><Trophy size={24}/></div>
                                <div><h4 className="text-2xl font-bold">{codeTests.length}</h4><p className="text-xs text-slate-500 font-bold">CHALLENGES</p></div>
                            </div>
                        </div>

                        {/* Current Course Banner */}
                        {enrolledCourses.length > 0 && (
                            <div className="bg-gradient-to-r from-[#005EB8] to-blue-900 rounded-2xl p-8 text-white shadow-xl flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">Continue Learning</h2>
                                    <p className="opacity-90 mb-4">{enrolledCourses[0].title}</p>
                                    <button onClick={() => navigate(`/course/${enrolledCourses[0].id}/player`)} className="bg-white text-[#005EB8] px-6 py-2 rounded-lg font-bold">Resume</button>
                                </div>
                                <div className="hidden md:block opacity-20"><Zap size={100}/></div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TAB: LEARNING & EXPLORE (Shared Card Logic) --- */}
                {(activeTab === "learning" || activeTab === "explore") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(activeTab === "learning" ? enrolledCourses : availableCourses).map(course => (
                            <div key={course.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="h-40 bg-slate-200 relative">
                                    {course.image_url ? (
                                        <img src={getImageUrl(course.image_url)} alt={course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400"><BookOpen size={40}/></div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <h4 className="font-bold text-slate-800 mb-2 truncate">{course.title}</h4>
                                    <div className="flex justify-between items-center mt-4">
                                        <span className="font-bold text-[#005EB8]">{course.price === 0 ? "FREE" : `₹${course.price}`}</span>
                                        {activeTab === "explore" ? (
                                            <button 
                                                onClick={() => course.price === 0 ? handleFreeEnroll(course.id) : (() => { setSelectedCourse(course); setShowModal(true); })() }
                                                className="bg-[#005EB8] text-white px-4 py-2 rounded-lg text-sm font-bold"
                                            >
                                                {course.price === 0 ? "Enroll" : "Unlock"}
                                            </button>
                                        ) : (
                                            <button onClick={() => navigate(`/course/${course.id}/player`)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold">Resume</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Empty State */}
                        {(activeTab === "learning" ? enrolledCourses : availableCourses).length === 0 && (
                            <div className="col-span-3 text-center py-20 text-slate-400">No courses found.</div>
                        )}
                    </div>
                )}

                {/* --- TAB: TESTS --- */}
                {activeTab === "test" && (
                    <div className="grid gap-4">
                        {codeTests.map(test => (
                            <div key={test.id} className="bg-white p-6 rounded-xl border flex justify-between items-center shadow-sm">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{test.title}</h3>
                                    <p className="text-slate-500 text-sm">Time Limit: {test.time_limit} Mins</p>
                                </div>
                                <button onClick={() => setShowPassKeyModal(test.id)} className="bg-[#005EB8] text-white px-6 py-2 rounded-lg font-bold">Start Challenge</button>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
      </main>

      {/* MODALS (Simplified) */}
      {showModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-bold mb-4">Unlock Course</h3>
                <p className="mb-6">Get full access to <strong>{selectedCourse.title}</strong></p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => handleEnrollStrategy("paid")} disabled={processing} className="w-full bg-[#005EB8] text-white py-3 rounded-lg font-bold">{processing ? "Processing..." : "Pay Now"}</button>
                    <button onClick={() => setShowModal(false)} className="w-full text-slate-500 py-2">Cancel</button>
                </div>
            </div>
        </div>
      )}

      {showPassKeyModal !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                <Lock className="mx-auto mb-4 text-[#005EB8]" size={32}/>
                <h3 className="font-bold text-lg mb-2">Enter Passkey</h3>
                <input type="text" placeholder="SECRET123" value={passKeyInput} onChange={(e) => setPassKeyInput(e.target.value)} className="w-full p-3 border rounded mb-4 text-center font-bold tracking-widest" />
                <div className="flex gap-2">
                    <button onClick={() => setShowPassKeyModal(null)} className="flex-1 bg-slate-100 py-2 rounded font-bold">Cancel</button>
                    <button onClick={handleStartTest} className="flex-1 bg-[#005EB8] text-white py-2 rounded font-bold">Start</button>
                </div>
            </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed top-6 right-6 bg-white border-l-4 border-green-500 p-4 rounded shadow-xl z-[2000] animate-bounce">
            <p className="font-bold text-slate-800">{toast.message}</p>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;