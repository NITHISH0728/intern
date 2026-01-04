import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react"; 
import API_BASE_URL from './config';
import { 
  LayoutDashboard, BookOpen, Compass, Award, LogOut, 
  CheckCircle, AlertTriangle, X, 
  Code, Play, Monitor, 
  Menu, Sparkles, User, PlayCircle, Trophy, Lock
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

// --- 🟢 HELPER COMPONENTS ---

const SidebarItem = ({ icon, label, active, onClick, collapsed }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${active ? "bg-white text-[#005EB8] font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
    {icon} {!collapsed && <span className="text-sm">{label}</span>}
  </button>
);

const StatCard = ({ icon: Icon, label, value }: any) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 transition-all">
    <div className="p-3 rounded-xl bg-slate-100 text-slate-600"><Icon size={24} /></div>
    <div><h4 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h4><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">{label}</p></div>
  </motion.div>
);

const CourseCard = ({ course, type, navigate, handleFreeEnroll, openEnrollModal }: any) => {
  const imageUrl = course?.image_url?.startsWith('http') 
    ? course.image_url 
    : `${API_BASE_URL.replace('/api/v1', '')}/${course?.image_url}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all">
        <div className="h-40 bg-slate-200 relative flex items-center justify-center">
            {course?.image_url ? (<img src={imageUrl} alt={course?.title} className="w-full h-full object-cover" />) : (<BookOpen size={40} className="text-slate-400" />)}
            {type === "enrolled" && <div className="absolute top-2 right-2 bg-[#87C232] text-white px-2 py-1 rounded-full text-[10px] font-bold">ACTIVE</div>}
        </div>
        <div className="p-5">
            <h4 className="font-bold text-slate-800 mb-4">{course?.title || "Untitled Course"}</h4>
            <div className="flex justify-between items-center">
                <span className={`text-lg font-extrabold ${course?.price === 0 ? "text-[#87C232]" : "text-[#005EB8]"}`}>{course?.price === 0 ? "Free" : `₹${course?.price}`}</span>
                {type === "available" ? (
                    <button onClick={() => course?.price === 0 ? handleFreeEnroll(course.id) : openEnrollModal(course)} className={`px-4 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2 ${course?.price === 0 ? "bg-[#87C232]" : "bg-[#005EB8]"}`}>
                        {course?.price === 0 ? <Sparkles size={14} /> : <Lock size={14} />} {course?.price === 0 ? "Enroll" : "Unlock"}
                    </button>
                ) : (
                    <button onClick={() => navigate(`/course/${course.id}/player`)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><PlayCircle size={14} /> Resume</button>
                )}
            </div>
        </div>
    </div>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home"); 
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProgress, setCurrentProgress] = useState({ percent: 0, completed: 0, total: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ 
    show: false, message: "", type: "success" 
  });

  const [codeTests, setCodeTests] = useState<CodeTest[]>([]);
  const [activeTest, setActiveTest] = useState<CodeTest | null>(null);
  const [passKeyInput, setPassKeyInput] = useState("");
  const [showPassKeyModal, setShowPassKeyModal] = useState<number | null>(null);
  
  const [, setTimeLeft] = useState(0);
  const [faceStatus, setFaceStatus] = useState<"ok" | "missing" | "multiple">("ok");
  const [isFullScreenViolation, setIsFullScreenViolation] = useState(false);
  
  const [currentProblemIndex] = useState(0);
  const [solutions] = useState<{[key: number]: string}>({});
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

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

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
      const myData = Array.isArray(myRes.data) ? myRes.data : [];
      const allData = Array.isArray(allRes.data) ? allRes.data : [];
      const myCourseIds = new Set(myData.map((c: any) => c.id));
      setAvailableCourses(allData.filter((c: any) => !myCourseIds.has(c.id)));
      setEnrolledCourses(myData);
    } catch (err: any) { 
        if(err.response?.status === 401) { localStorage.clear(); navigate("/"); }
    } finally { setLoading(false); }
  };

  const fetchCodeTests = async () => {
      try {
         const token = localStorage.getItem("token");
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

  useEffect(() => {
    if (enrolledCourses.length > 0) fetchCourseProgress(enrolledCourses[0].id);
  }, [enrolledCourses]);

  const fetchCourseProgress = async (courseId: number) => {
    try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/player`, { headers: { Authorization: `Bearer ${token}` } });
        const modules = res.data?.modules || [];
        const completed = modules.filter((m: any) => m.is_completed).length;
        const total = modules.length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        setCurrentProgress({ percent, completed, total });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
      let aiInterval: any;
      if (activeTest) {
          const savedSolutions = localStorage.getItem(`sols_${activeTest.id}`);
          if (savedSolutions) {
              try {
                setUserCode(JSON.parse(savedSolutions)[0] || "# Write solution...");
              } catch(e) { setUserCode("# Write solution..."); }
          } else setUserCode("# Write solution...");

          const timer = setInterval(() => {
              setTimeLeft(prev => { if (prev <= 1) { submitTest(); return 0; } return prev - 1; });
          }, 1000);

          const handleFullScreenChange = () => { 
             if (!document.fullscreenElement) { setIsFullScreenViolation(true); }
             else { setIsFullScreenViolation(false); }
          };
          
          document.addEventListener("fullscreenchange", handleFullScreenChange);

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
                                      setFaceStatus(predictions.length === 0 ? "missing" : predictions.length > 1 ? "multiple" : "ok");
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
              if(videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          };
      }
  }, [activeTest]);

  const handleStartTest = async () => {
      try {
          if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
          const formData = new FormData(); formData.append("pass_key", passKeyInput);
          const res = await axios.post(`${API_BASE_URL}/code-tests/${showPassKeyModal}/start`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
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
                      setConsoleOutput(output.trim() === expectedOutput.trim() ? `✅ Success!\nInput: ${sampleInput}\nOutput: ${output}` : `❌ Wrong Answer\nExpected: ${expectedOutput}\nActual: ${output}`);
                  }
              } catch (err) { clearInterval(intervalId); setExecutionStatus("error"); }
          }, 1000);
      } catch (err) { setExecutionStatus("error"); setConsoleOutput("❌ Failed to queue job."); } 
  };

  const submitTest = async () => { 
      if(!activeTest) return; 
      try { 
          await axios.post(`${API_BASE_URL}/code-tests/submit`, { test_id: activeTest.id, score: 100, problems_solved: 1, time_taken: "Finished" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); 
          setActiveTest(null); if(document.fullscreenElement) document.exitFullscreen(); 
          triggerToast("Test Submitted Successfully!"); 
      } catch(err) {} 
  };

  const handleFreeEnroll = async (courseId: number) => {
      setProcessing(true);
      try {
          await axios.post(`${API_BASE_URL}/enroll/${courseId}`, { type: "paid" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          triggerToast("🎉 Enrolled!"); fetchData(); setActiveTab("learning");
      } catch (err) { triggerToast("Enrollment failed.", "error"); } finally { setProcessing(false); }
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

  const handleDownloadCertificate = async (courseId: number, courseTitle: string) => {
      triggerToast("Downloading...");
      try {
         const res = await axios.get(`${API_BASE_URL}/generate-pdf/${courseId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, responseType: 'blob' });
         const url = window.URL.createObjectURL(new Blob([res.data]));
         const link = document.createElement('a'); link.href = url;
         link.setAttribute('download', `${courseTitle}_Certificate.pdf`); document.body.appendChild(link); link.click(); link.remove();
      } catch (error) { triggerToast("Download Failed.", "error"); }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-[#E2E8F0]">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005EB8]"></div>
                  <p className="text-slate-600 font-bold">Initialising Dashboard...</p>
              </div>
          </div>
      );
  }

  if (activeTest) { 
    return (
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden relative">
        {isFullScreenViolation && (
            <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center text-center p-4">
                <AlertTriangle size={80} className="text-red-500 mb-4" />
                <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight">TEST INTERRUPTED</h1>
                <button onClick={() => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); setIsFullScreenViolation(false); }} className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded font-bold flex items-center gap-2"><Monitor size={20}/> RETURN TO FULL SCREEN</button>
            </div>
        )}
        <div className="w-[35%] flex flex-col border-r bg-white h-full shadow-lg z-10">
            <div className="h-16 border-b flex items-center px-6 justify-between">
                <h3 className="text-xl font-extrabold text-slate-800">Challenge View</h3>
                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded">PROCTORING ACTIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                 <p className="text-slate-500 mb-4 text-sm italic">{activeTest.problems[currentProblemIndex]?.description || "Read carefully."}</p>
                 <div className="space-y-2">
                    {(() => {
                        try {
                            return JSON.parse(activeTest.problems[currentProblemIndex]?.test_cases || "[]").map((tc: any, i: number) => (
                                <div key={i} className="bg-slate-50 border p-3 rounded text-[12px] font-mono"><span className="text-slate-400">Input:</span> {tc.input}</div>
                            ));
                        } catch(e) { return null; }
                    })()}
                 </div>
            </div>
            <div className="h-48 bg-black relative flex items-center justify-center overflow-hidden">
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
                {faceStatus !== "ok" && <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center"><span className="text-white font-bold bg-red-600 px-3 py-1 rounded text-xs">⚠️ FACE {faceStatus.toUpperCase()}</span></div>}
            </div>
        </div>
        <div className="w-[65%] flex flex-col bg-[#F3F4F6] h-full">
            <div className="h-12 bg-white border-b flex items-center justify-between px-4">
                 <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><Code size={14}/> IDE</span>
                 <select value={language} onChange={(e) => setLanguage(Number(e.target.value))} className="text-[10px] border rounded px-2 py-1 bg-white font-bold outline-none">
                   {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                 </select>
            </div>
            <div className="flex-1 bg-white">
                <Editor height="100%" theme="light" language={languages.find(l => l.id === language)?.value} value={userCode} onChange={(val) => setUserCode(val || "")} />
            </div>
            <div className="h-32 bg-[#0F172A] p-3 font-mono text-[11px] overflow-y-auto text-slate-300">
                <pre className={`whitespace-pre-wrap ${executionStatus === "error" ? "text-red-400" : "text-green-400"}`}>{executionStatus === "running" ? "Compiling..." : consoleOutput}</pre>
            </div>
            <div className="h-16 bg-white border-t flex items-center justify-end px-6 gap-4">
                 <button onClick={handleRun} disabled={executionStatus === "running"} className="px-6 py-2 rounded-lg bg-[#005EB8] text-white font-bold text-xs flex items-center gap-2"><Play size={14}/> Run Code</button>
                 <button onClick={() => submitTest()} className="px-6 py-2 rounded-lg bg-[#87C232] text-white font-bold text-xs">Submit</button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#E2E8F0]">
      <aside className={`bg-[#F8FAFC] border-r p-6 flex flex-col fixed h-full z-50 transition-all ${collapsed ? "w-20" : "w-64"}`}>
        <div className="mb-10 flex items-center justify-between">{!collapsed && <span className="text-xl font-extrabold text-[#005EB8]">iQmath<span className="text-[#87C232]">Pro</span></span>}<button onClick={() => setCollapsed(!collapsed)}><Menu size={24}/></button></div>
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Home" active={activeTab === "home"} onClick={() => setActiveTab("home")} collapsed={collapsed} />
          <SidebarItem icon={<BookOpen size={20} />} label="Learning" active={activeTab === "learning"} onClick={() => setActiveTab("learning")} collapsed={collapsed} />
          <SidebarItem icon={<Code size={20} />} label="Challenges" active={activeTab === "test"} onClick={() => setActiveTab("test")} collapsed={collapsed} />
          <SidebarItem icon={<Compass size={20} />} label="Explore" active={activeTab === "explore"} onClick={() => setActiveTab("explore")} collapsed={collapsed} />
          <SidebarItem icon={<Award size={20} />} label="Certificates" active={activeTab === "certificates"} onClick={() => setActiveTab("certificates")} collapsed={collapsed} />
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-red-500 hover:bg-red-50 font-bold transition-all"><LogOut size={20} /> {!collapsed && "Sign Out"}</button>
      </aside>

      <main className={`ml-${collapsed ? "20" : "64"} flex-1 p-10`}>
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">{activeTab.toUpperCase()}</h2>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full bg-[#005EB8] text-white flex items-center justify-center"><User size={20} /></button>
        </header>

        {activeTab === "home" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
                <div><h1 className="text-3xl font-extrabold text-slate-800 mb-2">Welcome! 👋</h1></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={BookOpen} label="Enrolled" value={enrolledCourses.length} />
                    <StatCard icon={Award} label="Awards" value={0} />
                    <StatCard icon={Trophy} label="Tests" value={codeTests.filter(t => t.completed).length} />
                </div>
                {enrolledCourses.length > 0 ? (
                    <div className="bg-gradient-to-r from-[#005EB8] to-[#004080] rounded-2xl p-8 text-white shadow-xl"> 
                        <h2 className="text-2xl font-bold mb-2">Resume Course</h2> 
                        <p className="opacity-80 mb-6">{enrolledCourses[0].title}</p>
                        <div className="w-full bg-blue-900/50 rounded-full h-3 mb-2"><div style={{ width: `${currentProgress.percent}%` }} className="h-full bg-[#87C232] rounded-full transition-all duration-1000"></div></div> 
                        <button onClick={() => navigate(`/course/${enrolledCourses[0].id}/player`)} className="mt-6 bg-white text-[#005EB8] px-6 py-2 rounded-lg font-bold text-sm">Continue</button> 
                    </div>
                ) : ( <div className="bg-white p-10 rounded-2xl border-dashed border text-center text-slate-400">Enroll to start trackng progress.</div> )}
            </motion.div>
        )}

        {activeTab === "learning" && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{enrolledCourses.map(c => <CourseCard key={c.id} course={c} type="enrolled" navigate={navigate} />)}</div>}
        {activeTab === "explore" && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{availableCourses.map(c => <CourseCard key={c.id} course={c} type="available" handleFreeEnroll={handleFreeEnroll} openEnrollModal={(course: Course) => { setSelectedCourse(course); setShowModal(true); }} />)}</div>}
        {activeTab === "test" && ( <div className="grid gap-4"> {codeTests.map(test => ( <div key={test.id} className="bg-white p-6 rounded-xl border flex justify-between items-center"> <div><h3 className="font-bold">{test.title}</h3></div> <button onClick={() => setShowPassKeyModal(test.id)} className="bg-[#005EB8] text-white px-6 py-2 rounded-lg font-bold text-xs">Start</button> </div> ))} </div> )}
        
        {activeTab === "certificates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {enrolledCourses.map(course => (
                    <div key={course.id} className="bg-white p-6 rounded-xl border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Award size={24} className="text-slate-400" />
                            <h4 className="font-bold text-slate-800 text-sm">{course.title}</h4>
                        </div>
                        <button onClick={() => handleDownloadCertificate(course.id, course.title)} className="bg-[#005EB8] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Sparkles size={14} /> PDF</button>
                    </div>
                ))}
            </div>
        )}
      </main>

      {showModal && selectedCourse && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-8 relative overflow-hidden">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600"><X size={20}/></button>
            <h3 className="text-xl font-extrabold text-slate-800 mb-1">Enrollment</h3>
            <div className="bg-slate-50 p-4 rounded-lg border mb-6 flex justify-between items-center">
                <div><span className="block text-[9px] font-bold text-slate-400 uppercase">Price</span><span className="text-2xl font-extrabold text-[#005EB8]">₹{selectedCourse.price}</span></div>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => handleEnrollStrategy("paid")} disabled={processing} className="w-full py-3 rounded-lg bg-[#005EB8] text-white font-bold text-sm">{processing ? "Processing..." : "Pay Now"}</button>
                <button onClick={() => handleEnrollStrategy("trial")} disabled={processing} className="w-full py-3 rounded-lg bg-white border text-slate-600 font-bold text-xs">Trial</button>
            </div>
          </div>
        </div>
      )}

      {showPassKeyModal !== null && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl w-full max-w-xs text-center">
            <Lock className="text-[#005EB8] mx-auto mb-4" size={40} />
            <input type="text" placeholder="PASSKEY" value={passKeyInput} onChange={(e) => setPassKeyInput(e.target.value)} className="w-full p-3 border rounded-lg text-center font-bold outline-none" />
            <div className="flex gap-2 mt-6"><button onClick={() => setShowPassKeyModal(null)} className="flex-1 py-2 bg-slate-100 rounded-lg text-xs font-bold">Cancel</button><button onClick={handleStartTest} className="flex-1 py-2 bg-[#005EB8] text-white rounded-lg text-xs font-bold">Verify</button></div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed top-6 right-6 z-[9999] bg-white p-4 rounded-xl shadow-2xl border-l-4 ${toast.type === "success" ? "border-green-500" : "border-red-500"} flex items-center gap-3`}>
           {toast.type === "success" ? <CheckCircle className="text-green-500" size={20}/> : <AlertTriangle className="text-red-500" size={20}/>}
           <p className="text-xs font-bold text-slate-800">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;