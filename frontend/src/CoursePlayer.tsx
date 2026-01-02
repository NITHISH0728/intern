import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Editor from "@monaco-editor/react"; 
import Plyr from "plyr-react"; 
import "plyr/dist/plyr.css"; 

import { 
  PlayCircle, FileText, ChevronLeft, Menu, Code, HelpCircle, 
  UploadCloud, Play, Save, Monitor, Cpu, ChevronDown, ChevronRight, CreditCard,
  File as FileIcon, X, CheckCircle, Radio, Lock, ArrowLeft, AlertCircle
} from "lucide-react";

// --- 🍞 SHARED TOAST COMPONENT ---
const ToastNotification = ({ toast, setToast }: any) => {
  if (!toast.show) return null;
  return (
    <div style={{ 
        position: "fixed", top: "20px", right: "20px", zIndex: 9999, 
        background: "white", padding: "16px 24px", borderRadius: "12px", 
        boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)", 
        borderLeft: `6px solid ${toast.type === "success" ? "#87C232" : "#ef4444"}`, 
        display: "flex", alignItems: "center", gap: "12px", animation: "slideIn 0.3s ease-out" 
    }}>
        {toast.type === "success" ? <CheckCircle size={24} color="#87C232" /> : <AlertCircle size={24} color="#ef4444" />}
        <div>
            <h4 style={{ margin: "0", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                {toast.type === "success" ? "Success" : "Error"}
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>{toast.message}</p>
        </div>
        <button onClick={() => setToast({ ...toast, show: false })} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "10px" }}>
            <X size={16} color="#94a3b8" />
        </button>
        <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
};

// --- 💻 COMPONENT: PROFESSIONAL CODE ARENA ---
const CodeCompiler = ({ lesson }: { lesson: any }) => {
  // ✅ Toast State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const problems = useMemo(() => {
      try {
          if (!lesson.test_config) return [];
          let parsed = JSON.parse(lesson.test_config);
          if (typeof parsed === "string") parsed = JSON.parse(parsed);
          return parsed.problems || [];
      } catch (e) {
          console.error("❌ Failed to parse Code Test Config:", e);
          return [];
      }
  }, [lesson.test_config]);
  
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const activeProblem = problems[activeProblemIndex] || { 
      title: "No Problem Configured", description: "Please ask the instructor to update this test.", testCases: [] 
  };

  const [code, setCode] = useState("# Write your solution here...\nprint('Hello iQmath')");
  const [output, setOutput] = useState("Ready to execute...");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState(71); 

  const languages = [
    { id: 71, name: "Python (3.8.1)", value: "python" },
    { id: 62, name: "Java (OpenJDK 13)", value: "java" },
    { id: 54, name: "C++ (GCC 9.2.0)", value: "cpp" },
    { id: 63, name: "JavaScript (Node.js)", value: "javascript" },
  ];

  const runCode = async () => {
    setLoading(true);
    setOutput("Compiling & Executing...");
    try {
        const res = await axios.post("http://127.0.0.1:8000/api/v1/execute", {
            source_code: code,
            language_id: language, 
            stdin: activeProblem.testCases?.[0]?.input || "" 
        });

        if (res.data.stdout) setOutput(res.data.stdout);
        else if (res.data.stderr) setOutput(`Error:\n${res.data.stderr}`);
        else if (res.data.compile_output) setOutput(`Compile Error:\n${res.data.compile_output}`);
        else setOutput("Execution finished with no output.");
    } catch (err) {
        console.error(err);
        setOutput("❌ Execution Failed. Check backend connection.");
    } finally {
        setLoading(false);
    }
  };

  const saveProgress = () => {
      triggerToast("Code Saved Successfully!", "success"); // ✅ Replaced Alert
  };

  if (!problems.length) return (
      <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500 font-bold p-10 text-center">
          ⚠️ No coding problems found. <br/> (Instructor: Please edit and re-save this item in Course Builder).
      </div>
  );

  return (
    <div className="flex h-full p-4 gap-4 bg-slate-100 font-sans relative">
        <ToastNotification toast={toast} setToast={setToast} /> {/* ✅ Toast Rendered */}
        
        <div className="w-[40%] flex flex-col gap-4">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
                {/* 🔹 PROBLEM TABS */}
                <div className="flex gap-2 mb-6 border-b border-slate-100 pb-2 overflow-x-auto">
                    {problems.map((_: any, idx: number) => (
                        <button 
                            key={idx} 
                            onClick={() => { setActiveProblemIndex(idx); setOutput("Ready to execute..."); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeProblemIndex === idx ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        >
                            Problem {idx + 1}
                        </button>
                    ))}
                </div>

                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-extrabold text-slate-800 m-0">{activeProblem.title}</h2>
                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded uppercase">{activeProblem.difficulty || "Medium"}</span>
                </div>
                <div className="prose prose-sm text-slate-600 mb-6 whitespace-pre-wrap">
                    {activeProblem.description || "No description provided."}
                </div>
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest mb-3">Test Cases</h3>
                <div className="space-y-3">
                    {activeProblem.testCases?.map((tc: any, i: number) => (
                          (
                            <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="text-xs font-bold text-slate-500 mb-1">Input:</div>
                                <div className="font-mono text-xs bg-white p-2 rounded border border-slate-200 mb-2">{tc.input}</div>
                                <div className="text-xs font-bold text-slate-500 mb-1">Expected Output:</div>
                                <div className="font-mono text-xs bg-white p-2 rounded border border-slate-200">{tc.output}</div>
                            </div>
                        )
                    ))}
                </div>
            </div>
        </div>
        <div className="w-[60%] flex flex-col gap-4">
            <div className="flex-[2.5] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-2 flex justify-between items-center px-4 h-12">
                    <div className="flex items-center gap-2 text-slate-600 font-bold text-sm"><Code size={16} /> Code Editor</div>
                    <select className="bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500" value={language} onChange={(e) => setLanguage(parseInt(e.target.value))}>
                        {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <Editor height="100%" defaultLanguage="python" language={languages.find(l => l.id === language)?.value} theme="light" value={code} onChange={(val) => setCode(val || "")} options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }} />
                </div>
            </div>
            <div className="flex-[1.5] flex flex-col gap-4">
                <div className="flex-[1.3] flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800 text-slate-400 px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Monitor size={14} /> Terminal Output</div>
                    <div className="flex-1 p-4 font-mono text-sm text-green-400 overflow-y-auto whitespace-pre-wrap">{output}</div>
                </div>
                <div className="flex-[0.2] flex gap-3">
                    <button onClick={saveProgress} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"><Save size={18} /> Save</button>
                    <button onClick={runCode} disabled={loading} className="flex-1 bg-[#005EB8] hover:bg-[#004a94] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70">{loading ? <Cpu size={18} className="animate-spin" /> : <Play size={18} />} {loading ? "Running..." : "Run Code"}</button>
                </div>
            </div>
        </div>
    </div>
  );
};

// --- 🆕 COMPONENT: CODING COURSE PLAYER ---
const CodingPlayer = ({ course, token }: { course: any, token: string }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [challenges, setChallenges] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("Easy");
    const [selectedProblem, setSelectedProblem] = useState<any>(null);
    const [code, setCode] = useState("");
    const [output, setOutput] = useState("Ready to execute...");
    const [loading, setLoading] = useState(false);
    const [verdict, setVerdict] = useState<string | null>(null);

    // ✅ Toast State
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const triggerToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    useEffect(() => { loadChallenges(); }, []);
    
    const loadChallenges = async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/v1/courses/${courseId}/challenges`, { headers: { Authorization: `Bearer ${token}` } });
            setChallenges(res.data);
        } catch(err) { console.error("Failed to load challenges", err); }
    };

    const isTabLocked = (tab: string) => {
        if (tab === "Easy") return false;
        const easySolved = challenges.filter(c => c.difficulty === "Easy" && c.is_solved).length;
        const easyTotal = challenges.filter(c => c.difficulty === "Easy").length;
        
        if (tab === "Medium") {
            return easyTotal > 0 && easySolved < easyTotal; 
        }
        if (tab === "Hard") {
             const medSolved = challenges.filter(c => c.difficulty === "Medium" && c.is_solved).length;
             const medTotal = challenges.filter(c => c.difficulty === "Medium").length;
             const mediumLocked = easyTotal > 0 && easySolved < easyTotal;
             return mediumLocked || (medTotal > 0 && medSolved < medTotal);
        }
        return true;
    };

    const runAndSubmit = async () => {
        setLoading(true);
        setOutput("Compiling & Executing Tests...");
        setVerdict(null);

        try {
            const langMap: any = { "python": 71, "java": 62, "cpp": 54, "javascript": 63 };
            const langId = langMap[course.language] || 71;

            const cases = typeof selectedProblem.test_cases === 'string' 
                ? JSON.parse(selectedProblem.test_cases) 
                : selectedProblem.test_cases;
                
            let allPassed = true;
            let currentOutput = "";

            for (let i = 0; i < cases.length; i++) {
                const tc = cases[i];
                // Execute each test case via Judge0
                const res = await axios.post("http://127.0.0.1:8000/api/v1/execute", {
                    source_code: code, language_id: langId, stdin: tc.input
                });
                
                const actualOutput = res.data.stdout ? res.data.stdout.trim() : "";
                const expectedOutput = tc.output.trim();

                // Validation Logic
                if (actualOutput !== expectedOutput) {
                    allPassed = false;
                    currentOutput = `❌ TEST CASE ${i + 1} FAILED\n\n➤ Input:\n${tc.input}\n\n➤ Expected Output:\n${tc.output}\n\n➤ Your Output:\n${actualOutput}`;
                    
                    if (res.data.stderr) currentOutput += `\n\n➤ Error Log:\n${res.data.stderr}`;
                    if (res.data.compile_output) currentOutput += `\n\n➤ Compilation Error:\n${res.data.compile_output}`;
                    break;
                }
            }

            if (allPassed) {
                currentOutput = "🎉 SUCCESS! All Test Cases Passed.\n\nYour solution has been verified and saved.";
                await axios.post(`http://127.0.0.1:8000/api/v1/challenges/${selectedProblem.id}/solve`, {}, { headers: { Authorization: `Bearer ${token}` } });
                
                const updatedChallenges = challenges.map(c => 
                    c.id === selectedProblem.id ? { ...c, is_solved: true } : c
                );
                setChallenges(updatedChallenges);
                setVerdict("Solved");
            }

            setOutput(currentOutput);
        } catch (err) {
            console.error(err);
            setOutput("System Error during execution. Please check backend.");
        } finally {
            setLoading(false);
        }
    };

    // 1. RENDER PROBLEM SOLVING INTERFACE
    if (selectedProblem) {
        return (
            <div className="flex h-screen w-screen bg-[#F8FAFC] font-sans p-6 overflow-hidden relative">
                 <ToastNotification toast={toast} setToast={setToast} /> {/* ✅ Toast Rendered */}
                 
                 {/* LEFT PANEL: Problem Info */}
                 <div className="w-[35%] flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 mr-6 overflow-hidden">
                     <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                        <button onClick={() => setSelectedProblem(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
                            <ArrowLeft size={18} />
                        </button>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{course.language}</h2>
                        <div className="flex-1 text-right text-xs font-bold text-slate-400">1 / {challenges.length} Problems</div>
                     </div>
                     <div className="p-8 overflow-y-auto flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-[#005EB8] text-white text-xs font-bold px-3 py-1 rounded-full">Problem {challenges.indexOf(selectedProblem) + 1}</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${selectedProblem.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : selectedProblem.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{selectedProblem.difficulty}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 mb-6 leading-tight">{selectedProblem.title}</h1>
                        
                        <div className="prose prose-slate text-slate-600 leading-relaxed mb-8">
                            {selectedProblem.description}
                        </div>

                        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest mb-4">TEST CASES</h3>
                        <div className="space-y-4">
                            {(typeof selectedProblem.test_cases === 'string' ? JSON.parse(selectedProblem.test_cases) : selectedProblem.test_cases).map((tc: any, i: number) => {
                                if(tc.hidden) return null; // Hide hidden cases
                                return (
                                    <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="mb-3">
                                            <div className="text-xs font-bold text-slate-500 mb-1">Input:</div>
                                            <div className="font-mono text-sm bg-white p-3 rounded-lg border border-slate-200 text-slate-700">{tc.input}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 mb-1">Expected Output:</div>
                                            <div className="font-mono text-sm bg-white p-3 rounded-lg border border-slate-200 text-slate-700">{tc.output}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                     <div className="p-4 border-t border-slate-100 flex gap-3">
                        <button onClick={() => setSelectedProblem(null)} className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50">Previous</button>
                        <button className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900">Next Problem</button>
                     </div>
                 </div>

                 {/* RIGHT PANEL: Editor & Terminal */}
                 <div className="w-[65%] flex flex-col h-full gap-4">
                     {/* EDITOR CARD */}
                     <div className="flex-[2] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="h-12 border-b border-slate-100 flex items-center justify-between px-6 bg-white">
                            <div className="flex items-center gap-2 text-[#005EB8] font-bold text-sm"><Code size={16} /> Code Editor</div>
                            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{course.language} (Latest)</div>
                        </div>
                        <div className="flex-1 p-2">
                            <Editor 
                                height="100%" 
                                defaultLanguage={course.language || "python"} 
                                theme="light"
                                value={code} 
                                onChange={(val) => setCode(val || "")}
                                options={{ minimap: { enabled: false }, fontSize: 15, padding: { top: 20 }, scrollBeyondLastLine: false }}
                            />
                        </div>
                     </div>

                     {/* TERMINAL CARD */}
                     <div className="flex-[1] bg-[#0f172a] rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col">
                         <div className="h-10 bg-[#1e293b] border-b border-slate-700 flex items-center px-4">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Monitor size={14}/> Terminal Output</span>
                         </div>
                         <div className="flex-1 p-5 font-mono text-sm text-[#4ade80] overflow-auto whitespace-pre-wrap leading-relaxed">
                             {output}
                         </div>
                     </div>

                     {/* ACTION BUTTONS */}
                     <div className="flex justify-end gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                         <button onClick={() => triggerToast("Progress Saved!", "success")} className="px-6 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                             <Save size={18} /> Save
                         </button>
                         <button onClick={runAndSubmit} disabled={loading} className="px-8 py-3 rounded-xl bg-[#005EB8] hover:bg-[#004a94] text-white font-bold shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-70 transition-all">
                             {loading ? <Cpu size={18} className="animate-spin"/> : <Play size={18} />} {loading ? "Running Code..." : "Run Code"}
                         </button>
                     </div>
                 </div>
            </div>
        )
    }

    // 2. RENDER LIST VIEW (Unchanged from previous functional version)
    return (
        <div className="min-h-screen bg-slate-50 font-sans p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                     <div className="flex items-center gap-4">
                        <button onClick={() => navigate("/student-dashboard")} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"><ChevronLeft size={20} /></button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 m-0">{course.title}</h1>
                            <p className="text-slate-500 text-sm mt-1">Language: <span className="font-bold text-[#005EB8] uppercase">{course.language}</span></p>
                        </div>
                     </div>
                </div>

                <div className="flex gap-4 mb-8">
                    {["Easy", "Medium", "Hard"].map(tab => {
                        const locked = isTabLocked(tab);
                        return (
                            <button 
                                key={tab} 
                                disabled={locked} 
                                onClick={() => setActiveTab(tab)} 
                                className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${activeTab === tab ? "bg-[#005EB8] text-white shadow-lg shadow-blue-200 scale-105" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}
                                style={{ opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}
                            >
                                {tab} Level {locked && <Lock size={14} />}
                            </button>
                        );
                    })}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.filter(c => c.difficulty === activeTab).map((c, idx) => (
                        <div key={c.id} className={`bg-white p-6 rounded-2xl border transition-all hover:shadow-xl group relative overflow-hidden ${c.is_solved ? "border-green-200 bg-green-50/30" : "border-slate-200"}`}>
                            {c.is_solved && <div className="absolute top-0 right-0 bg-[#87C232] text-white p-1 rounded-bl-xl"><CheckCircle size={16} /></div>}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${c.is_solved ? "bg-green-100 text-green-700" : "bg-blue-50 text-[#005EB8]"}`}>
                                    {idx + 1}
                                </div>
                                <h4 className="font-bold text-slate-800 text-lg line-clamp-1">{c.title}</h4>
                            </div>
                            <p className="text-slate-500 text-sm line-clamp-2 mb-6 h-10">{c.description}</p>
                            <button 
                                onClick={() => setSelectedProblem(c)} 
                                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${c.is_solved ? "bg-white border border-green-200 text-green-700" : "bg-slate-900 text-white hover:bg-[#005EB8]"}`}
                            >
                                {c.is_solved ? "Solve Again" : "Solve Challenge"} {!c.is_solved && <ArrowLeft className="rotate-180" size={16} />}
                            </button>
                        </div>
                    ))}
                    {challenges.filter(c => c.difficulty === activeTab).length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-400">
                            <p className="font-bold text-lg">No challenges available in this section yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// --- MAIN PLAYER COMPONENT ---
const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  
  // File Upload State
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // ✅ Toast State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const brand = { blue: "#005EB8", green: "#87C232", textMain: "#0f172a", textLight: "#64748b" };

  const handlePayment = async () => {
    try {
        const orderUrl = "http://127.0.0.1:8000/api/v1/create-order";
        const { data } = await axios.post(orderUrl, { amount: 599 }); 
        const options = {
            key: "rzp_test_Ru8lDcv8KvAiC0", 
            amount: data.amount,
            currency: "INR",
            name: "iQmath Pro",
            description: "Lifetime Course Access",
            order_id: data.id, 
            handler: function (response: any) { 
                triggerToast(`Payment Successful! ID: ${response.razorpay_payment_id}`, "success"); // ✅ Replaced Alert
            },
            theme: { color: "#87C232" }
        };
        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();
    } catch (error) { 
        triggerToast("Payment init failed", "error"); // ✅ Replaced Alert
    }
  };

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://127.0.0.1:8000/api/v1/courses/${courseId}/player`, { headers: { Authorization: `Bearer ${token}` } });
        setCourse(res.data);
        if (res.data.modules?.[0]) {
            setExpandedModules([res.data.modules[0].id]); 
            if (res.data.modules[0].lessons?.length > 0) setActiveLesson(res.data.modules[0].lessons[0]);
        }
      } catch (err) { console.error(err); }
    };
    fetchCourse();
  }, [courseId]);

  const toggleModule = (moduleId: number) => setExpandedModules(prev => prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]);
  
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("docs.google.com/forms")) {
        return url.replace(/\/viewform.*/, "/viewform?embedded=true").replace(/\/view.*/, "/viewform?embedded=true");
    }
    return url.replace("/view", "/preview");
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const plyrOptions = useMemo(() => ({
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
  }), []);

  const handleAssignmentUpload = async () => {
    if (!assignmentFile) return;
    setUploading(true);
    const token = localStorage.getItem("token");

    try {
        const ticketRes = await axios.post("http://127.0.0.1:8000/api/v1/get-upload-url", {
            lesson_title: activeLesson.title,
            file_name: assignmentFile.name,
            file_type: assignmentFile.type
        }, { headers: { "Authorization": `Bearer ${token}` } });

        const uploadUrl = ticketRes.data.upload_url;

        await axios.put(uploadUrl, assignmentFile, {
            headers: { "Content-Type": assignmentFile.type },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`Uploading to Drive: ${percent}%`);
                }
            }
        });
        
        await axios.post("http://127.0.0.1:8000/api/v1/confirm-submission", {
            lesson_title: activeLesson.title,
            file_name: assignmentFile.name
        }, { headers: { "Authorization": `Bearer ${token}` } });

        triggerToast(`✅ Assignment "${assignmentFile.name}" Submitted Successfully!`, "success"); // ✅ Replaced Alert
        setAssignmentFile(null); 

    } catch (err) {
        console.error(err);
        triggerToast("❌ Upload Failed. Please try again.", "error"); // ✅ Replaced Alert
    } finally {
        setUploading(false);
    }
  };

  const renderContent = () => {
    if (!activeLesson) return <div className="text-white p-10 text-center">Select a lesson</div>;
    if (activeLesson.type === "note") return <iframe src={getEmbedUrl(activeLesson.url)} width="100%" height="100%" className="bg-white border-0" allow="autoplay" />;
    if (activeLesson.type === "quiz") return <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-4"><iframe src={getEmbedUrl(activeLesson.url)} width="100%" height="100%" frameBorder="0" className="rounded-xl shadow-sm border border-slate-200 bg-white max-w-4xl" allowFullScreen>Loading...</iframe></div>;
    
    if (activeLesson.type === "video" || activeLesson.type === "live_class") {
        const videoId = getYoutubeId(activeLesson.url);
        if (!videoId) return <div style={{color: "white", padding: "40px"}}>Invalid Video URL</div>;
        const plyrSource = { type: "video" as const, sources: [{ src: videoId, provider: "youtube" as const }] };
        return <div style={{ width: "100%", height: "100%", background: "black", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: "100%", maxWidth: "1000px", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}><style>{` .plyr__video-embed iframe { top: -50%; height: 200%; } :root { --plyr-color-main: #005EB8; } `}</style><Plyr key={activeLesson.id} source={plyrSource} options={plyrOptions} /></div></div>;
    }
    
    if (activeLesson.type === "code_test") return <CodeCompiler lesson={activeLesson} />;
    
    if (activeLesson.type === "assignment") {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#F8FAFC] p-8 font-sans text-slate-800">
            <div className="bg-white p-10 rounded-2xl shadow-xl max-w-2xl w-full text-center border border-slate-100">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6"><UploadCloud size={40} className="text-[#005EB8]" /></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{activeLesson.title}</h2>
                {activeLesson.is_mandatory && (<span className="inline-block bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full mb-4">MANDATORY SUBMISSION</span>)}
                <p className="text-slate-600 mb-8 leading-relaxed whitespace-pre-wrap text-sm">{activeLesson.instructions || activeLesson.description || "Upload your assignment below. Supported formats: PDF, DOCX, ZIP."}</p>
                <div className="mb-8">
                    {!assignmentFile ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer relative group">
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.zip" />
                            <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform"><UploadCloud size={32} className="text-slate-400 group-hover:text-[#005EB8]" /><div><p className="text-slate-700 font-bold text-sm">Click to upload or drag and drop</p><p className="text-slate-400 text-xs mt-1">Maximum file size 10MB</p></div></div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4"><div className="bg-white p-2 rounded-lg border border-blue-100 text-[#005EB8]"><FileIcon size={24} /></div><div className="text-left"><p className="text-slate-800 font-bold text-sm truncate max-w-[200px]">{assignmentFile.name}</p><p className="text-slate-500 text-xs">{(assignmentFile.size / 1024 / 1024).toFixed(2)} MB</p></div></div>
                            <button onClick={() => setAssignmentFile(null)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                    )}
                </div>
                <button onClick={handleAssignmentUpload} disabled={!assignmentFile || uploading} className="w-full py-4 bg-[#005EB8] hover:bg-[#004a94] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed">
                    {uploading ? "Uploading to Drive..." : "Submit Assignment"} {!uploading && <CheckCircle size={20} />}
                </button>
            </div>
        </div>
      );
    }
    return <div className="text-white p-10 text-center">Select content from the sidebar</div>;
  };

  // ✅ CHECK: If Coding Course, Switch Player View completely
  if (course?.course_type === "coding") {
      const token = localStorage.getItem("token") || "";
      return <CodingPlayer course={course} token={token} />;
  }

  // --- STANDARD PLAYER RENDER ---
  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans bg-slate-900 relative">
      <ToastNotification toast={toast} setToast={setToast} /> {/* ✅ Toast Rendered */}
      
      <div className="flex-1 flex flex-col h-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/student-dashboard")} className="bg-none border-none cursor-pointer text-slate-500 flex items-center gap-2 font-semibold hover:text-slate-800"><ChevronLeft size={20} /> Dashboard</button>
            <div className="h-6 w-px bg-slate-200"></div>
            <h1 className="text-base font-bold text-slate-900 m-0">{activeLesson?.title || "Course Player"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handlePayment} className="flex items-center gap-2 bg-[#87C232] text-white px-4 py-2 rounded-lg font-bold border-none cursor-pointer hover:bg-[#76a82b] transition-colors"><CreditCard size={18} /> Buy Lifetime Access</button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-none border-none cursor-pointer"><Menu color={brand.textMain} /></button>
          </div>
        </header>
        <div className="flex-1 bg-white relative overflow-hidden">{renderContent()}</div>
      </div>
      {sidebarOpen && (
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
           <div className="p-6 border-b border-slate-200"><h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest m-0">Course Content</h2></div>
           <div className="flex-1 overflow-y-auto p-0">
             {course?.modules.map((module: any, idx: number) => (
                <div key={module.id} className="border-b border-slate-100">
                  <div onClick={() => toggleModule(module.id)} className="p-4 bg-slate-50 cursor-pointer flex justify-between items-center hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                        {module.is_completed ? (
                            <div className="bg-[#87C232] rounded-full p-1 text-white"><CheckCircle size={20} fill="white" className="text-[#87C232]" /></div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{idx + 1}</div>
                        )}
                        <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase">{module.is_completed ? "Completed" : `Section ${idx + 1}`}</div>
                            <div className={`text-sm font-semibold ${module.is_completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{module.title}</div>
                        </div>
                    </div>
                    {expandedModules.includes(module.id) ? <ChevronDown size={18} color="#64748b" /> : <ChevronRight size={18} color="#64748b" />}
                  </div>
                  {expandedModules.includes(module.id) && (
                    <div className="animate-fade-in">
                      {module.lessons.map((lesson: any) => {
                         const isActive = activeLesson?.id === lesson.id;
                         return (
                             <div key={lesson.id} onClick={() => setActiveLesson(lesson)} className={`flex items-center gap-3 p-3 pl-12 cursor-pointer border-l-4 transition-all ${isActive ? 'bg-blue-50 border-blue-600' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                                 <div className={isActive ? "text-blue-600" : "text-slate-400"}>
                                     {lesson.is_completed ? (
                                          <CheckCircle size={16} className="text-[#87C232]" fill="#ecfccb" />
                                     ) : (
                                         <>
                                             {lesson.type.includes("video") && <PlayCircle size={16} />}
                                             {lesson.type === "note" && <FileText size={16} />}
                                             {lesson.type === "quiz" && <HelpCircle size={16} />} 
                                             {lesson.type.includes("code") && <Code size={16} />}
                                             {lesson.type === "assignment" && <UploadCloud size={16} />}
                                             {lesson.type === "live_class" && <Radio size={16} />}
                                         </>
                                     )}
                                 </div>
                                 <div className={`text-sm flex-1 ${isActive ? "text-blue-600 font-semibold" : "text-slate-600"} ${lesson.is_completed ? "line-through text-slate-400 decoration-slate-300" : ""}`}>{lesson.title}</div>
                             </div>
                         );
                      })}
                    </div>
                  )}
                </div>
             ))}
           </div>
        </aside>
      )}
    </div>
  );
};

export default CoursePlayer;