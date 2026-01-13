import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Editor from "@monaco-editor/react"; 
import Plyr from "plyr-react"; 
import "plyr/dist/plyr.css"; 
import API_BASE_URL from './config';
import { 
  PlayCircle, FileText, ChevronLeft, Menu, Code, HelpCircle, 
  UploadCloud, Play, Save, Monitor, Cpu, ChevronDown, ChevronRight, CreditCard,
  File as FileIcon, X, CheckCircle, Radio, Lock, ArrowLeft, AlertCircle,Clock, 
  Zap
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

// --- 🔄 POLLING HELPER FUNCTION ---
// --- 🔄 IMPROVED POLLING HELPER ---
const pollResult = async (taskId: string) => {
    const maxRetries = 20; 
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const res = await axios.get(`${API_BASE_URL}/result/${taskId}`);
            console.log("Polling Response:", res.data); // 👈 Debugging line

            // ✅ FIX: Check for "SUCCESS" (Celery default) OR "completed"
            const status = res.data.status;
            if (status === "completed" || status === "SUCCESS") {
                // If the data is nested in 'data', grab it. Otherwise use the whole response.
                return res.data.data || res.data; 
            }
            
            if (status === "failed" || status === "FAILURE") {
                return { status: "error", output: res.data.error || "Execution failed" };
            }
        } catch (e) {
            console.error("Polling error", e);
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    }
    return { status: "error", output: "Timeout: Server took too long to respond." };
};
// --- 💻 COMPONENT: PROFESSIONAL CODE ARENA ---
const CodeCompiler = ({ lesson }: { lesson: any }) => {
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
    setOutput("Compiling & Executing (Queued)...");
    try {
        // 1. Submit Job
        const res = await axios.post(`${API_BASE_URL}/execute`, {
    source_code: code,
    language_id: language, 
    stdin: activeProblem.testCases?.[0]?.input || "" 
});

        const taskId = res.data.task_id;
        setOutput("Processing in Background...");

       // 2. Poll for Result
      const result = await pollResult(taskId);

      // 3. Display Output
      // Since we fixed pollResult, 'result' is now the full object { status: "...", output: "..." }
      // We just display whatever is in 'output', whether it is success or error text.
      setOutput(result.output || "Execution finished with no output.");

    } catch (err) {
        console.error(err);
        setOutput("❌ Execution Failed. Check backend connection.");
    } finally {
        setLoading(false);
    }
  };
  const saveProgress = () => {
      triggerToast("Code Saved Successfully!", "success");
  };

  if (!problems.length) return (
      <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500 font-bold p-10 text-center">
          ⚠️ No coding problems found. <br/> (Instructor: Please edit and re-save this item in Course Builder).
      </div>
  );

  return (
    <div className="flex h-full p-4 gap-4 bg-slate-100 font-sans relative">
        <ToastNotification toast={toast} setToast={setToast} />
        
        <div className="w-[40%] flex flex-col gap-4">
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
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
    const [, setVerdict] = useState<string | null>(null);

    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const triggerToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    useEffect(() => { loadChallenges(); }, []);
    
    const loadChallenges = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/challenges`, { headers: { Authorization: `Bearer ${token}` } });
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
        setOutput("Initializing Test Environment...");
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
                
                // 1. Submit Job
                setOutput(`Running Test Case ${i + 1}/${cases.length}...`);
                const res = await axios.post(`${API_BASE_URL}/execute`, {
    source_code: code, language_id: langId, stdin: tc.input
});

                // 2. Poll for Result
                const result = await pollResult(res.data.task_id);
                const actualOutput = result.output ? result.output.trim() : "";
                const expectedOutput = tc.output.trim();

                // Validation Logic
                if (actualOutput !== expectedOutput) {
                    allPassed = false;
                    currentOutput = `❌ TEST CASE ${i + 1} FAILED\n\n➤ Input:\n${tc.input}\n\n➤ Expected Output:\n${tc.output}\n\n➤ Your Output:\n${actualOutput}`;
                    break;
                }
            }

            if (allPassed) {
                currentOutput = "🎉 SUCCESS! All Test Cases Passed.\n\nYour solution has been verified and saved.";
                await axios.post(`${API_BASE_URL}/challenges/${selectedProblem.id}/solve`, {}, { headers: { Authorization: `Bearer ${token}` } });
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
                 <ToastNotification toast={toast} setToast={setToast} /> 
                 
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

    // 2. RENDER LIST VIEW
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

// --- ⏳ DELAYED PLAYER COMPONENT (Fixes the crash) ---
const DelayedVideoPlayer = ({ lesson, plyrOptions }: { lesson: any, plyrOptions: any }) => {
    const [isReady, setIsReady] = useState(false);

    // This helper extracts the ID (moved here so it's accessible)
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // ⚡ THE MAGIC: Whenever the lesson ID changes, we reset 'isReady' to false
    // Then wait 500ms before showing the new player.
    // This destroys the old player completely (like switching to notes).
    useEffect(() => {
        setIsReady(false);
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 1000); // 1 second delay (You can make this 3000 for 3 secs)
        return () => clearTimeout(timer);
    }, [lesson.id]);

    const videoId = getYoutubeId(lesson.url);
    
    // 1. If Video ID is invalid
    if (!videoId) return <div className="text-white p-10">Invalid Video URL</div>;

    // 2. If Loading (The transition state)
    if (!isReady) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                {/* Simple Loading Spinner */}
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-white text-sm font-bold animate-pulse">LOADING NEXT LESSON...</p>
            </div>
        );
    }

    // 3. The Actual Player (Only renders after delay)
    const plyrSource = { type: "video" as const, sources: [{ src: videoId, provider: "youtube" as const }] };
    
    return (
         <div style={{ width: "100%", height: "100%", background: "black", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: "1000px", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                <style>{` .plyr__video-embed iframe { top: -50%; height: 200%; } :root { --plyr-color-main: #005EB8; } `}</style>
                {/* We use the key here to ensure React treats it as a fresh instance */}
                <Plyr key={lesson.id} source={plyrSource} options={plyrOptions} />
            </div>
        </div>
    );
};

// --- 🕵️ PROCTORING COMPONENT (FIXED & TESTED) ---
// --- 🕵️ PROCTORING COMPONENT (FIXED) ---
const LiveTestProctor = ({ lesson }: { lesson: any }) => {
    // States: 
    // waiting (future) | countdown (<5 min) | ready (start btn) | 
    // rules (instructions) | active (test running) | 
    // terminated (banned) | expired (time up)

    if (!lesson.start_time || !lesson.end_time) {
        return (
            <div className="p-10 text-center flex flex-col items-center justify-center h-full text-slate-500">
                <AlertCircle size={48} className="text-red-400 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Configuration Error</h2>
                <p>This test has no scheduled time set.</p>
                <p className="text-xs mt-2 text-slate-400">Instructor: Please edit this item in Course Builder and set the Start/End times.</p>
            </div>
        );
    }

    const [status, setStatus] = useState("checking"); 
    
    const [countdownString, setCountdownString] = useState(""); // For "Starts in..."
    const [testTimerString, setTestTimerString] = useState(""); // For "Time Remaining..."
    
    // Initialize violation count from Backend (Important for persistence!)
    const [violationCount, setViolationCount] = useState(lesson.violation_count || 0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 1. MASTER TIME & STATE CONTROLLER
    useEffect(() => {
        const checkStatus = () => {
            // If backend says already terminated, lock it immediately.
            if (lesson.is_terminated) {
                setStatus("terminated");
                return;
            }

            const now = new Date();
            const start = new Date(lesson.start_time);
            const end = new Date(lesson.end_time);

            // CASE 1: Test is over (Time passed)
            if (now > end) {
                setStatus("expired");
                return;
            }

            // CASE 2: Test is currently running (Window Open)
            if (now >= start && now <= end) {
                // Only change status if we are in a "pre-test" state. 
                // Don't disrupt 'active' or 'terminated'.
                if (["checking", "waiting", "countdown"].includes(status)) {
                    setStatus("ready");
                }
                
                // Calculate Remaining Time for the Top Right Timer
                const diff = end.getTime() - now.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTestTimerString(`${hours}h ${minutes}m ${seconds}s`);
            }

            // CASE 3: Test is in the future
            if (now < start) {
                const diff = start.getTime() - now.getTime();
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                
                // Logic: 5 Min Countdown
                if (diff <= 5 * 60 * 1000) {
                    setStatus("countdown");
                    setCountdownString(`${minutes}m ${seconds}s`);
                } else {
                    setStatus("waiting");
                }
            }
        };

        checkStatus(); // Run immediately
        const interval = setInterval(checkStatus, 1000);
        return () => clearInterval(interval);
    }, [lesson, status]);


    // 2. VIOLATION REPORTER
    const reportViolation = async () => {
        // If already terminated or expired, don't report
        if (status === "terminated" || status === "expired") return;

        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(`${API_BASE_URL}/proctoring/violation`, 
                { lesson_id: lesson.id }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Update local count from server response
            setViolationCount(res.data.violation_count);
            
            if (res.data.status === "terminated") {
                setStatus("terminated");
                if (document.fullscreenElement) {
                     document.exitFullscreen().catch(() => {});
                }
            } else {
                // Optional: Play a warning sound here
                alert(`⚠️ PROCTORING WARNING \n\nFocus lost! You have ${3 - res.data.violation_count} attempts left before termination.`);
            }
        } catch (err) { console.error("Violation Report Failed:", err); } 
    };

    // 3. LISTENERS (Fullscreen & Tabs)
    useEffect(() => {
        if (status !== "active") return;

        const handleVisibilityChange = () => { 
            if (document.hidden) reportViolation(); 
        };
        
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                reportViolation();
            } else {
                setIsFullscreen(true);
            }
        };

        // Block Right Click
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("contextmenu", handleContextMenu);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("contextmenu", handleContextMenu);
        };
    }, [status]); // Only run listeners when test is ACTIVE

    const enterFullScreenAndStart = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().then(() => {
                setStatus("active");
                setIsFullscreen(true);
            }).catch(() => alert("Fullscreen permission denied. You cannot take the test."));
        }
    };

    // --- RENDER VIEWS ---

    // 1. FUTURE (Long Wait)
    if (status === "waiting") {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-800 p-10 text-center">
                <Clock size={64} className="text-[#005EB8] mb-4" />
                <h2 className="text-2xl font-bold mb-2">Upcoming Live Test</h2>
                <p className="text-slate-500">This test is scheduled for:</p>
                <div className="text-xl font-bold mt-2 text-[#005EB8]">
                    {new Date(lesson.start_time).toLocaleString()}
                </div>
                <p className="text-xs text-slate-400 mt-8">Please return to this page at the scheduled time.</p>
            </div>
        );
    }

    // 2. COUNTDOWN (< 5 Mins)
    if (status === "countdown") {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-10 text-center">
                <Clock size={64} className="text-yellow-400 mb-4 animate-pulse" />
                <h2 className="text-3xl font-bold mb-2">Test Starting Soon</h2>
                <div className="text-7xl font-mono font-bold text-yellow-400 mt-6">{countdownString}</div>
                <p className="text-slate-400 mt-6">Do not refresh the page.</p>
            </div>
        );
    }

    // 3. READY (Start Button)
    if (status === "ready") {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-green-50 text-slate-900 p-10 text-center">
                <Zap size={64} className="text-green-600 mb-4" />
                <h2 className="text-3xl font-bold mb-4">The Test is Live!</h2>
                <p className="text-slate-600 mb-8 max-w-md">The proctoring system is active. Ensure you have a stable connection and no other apps running.</p>
                <button onClick={() => setStatus("rules")} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-green-700 transition-all animate-bounce">
                    Proceed to Exam Hall
                </button>
            </div>
        );
    }

    // 4. RULES (Last Step)
    if (status === "rules") {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white p-10">
                <div className="max-w-2xl w-full text-center">
                    <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900 mb-6">⚠️ Strict Exam Rules</h1>
                    <div className="text-left space-y-4 text-slate-700 bg-red-50 p-8 rounded-xl border border-red-200 mb-8">
                        <li className="flex items-start gap-3"><span className="font-bold">1. Fullscreen Mandatory:</span> Exiting fullscreen counts as a violation.</li>
                        <li className="flex items-start gap-3"><span className="font-bold">2. No Tab Switching:</span> Moving to another tab counts as a violation.</li>
                        <li className="flex items-start gap-3 text-red-700 font-bold"><span className="bg-red-600 text-white px-2 rounded text-sm mr-2">CRITICAL</span> If violations exceed 2, you will be TERMINATED immediately.</li>
                        <li className="flex items-start gap-3"><span className="font-bold">4. No Re-attempts:</span> Terminated students cannot restart the test.</li>
                    </div>
                    <button onClick={enterFullScreenAndStart} className="bg-[#005EB8] text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg hover:scale-105 flex items-center gap-2 mx-auto transition-all">
                        <CheckCircle size={24} /> I Agree & Start Test
                    </button>
                </div>
            </div>
        );
    }

    // 5. TERMINATED (Banned)
    if (status === "terminated") {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-900 p-10 text-center border-l-8 border-red-600">
                <AlertCircle size={80} className="text-red-600 mb-6" />
                <h1 className="text-4xl font-extrabold mb-4">YOU HAVE BEEN TERMINATED</h1>
                <p className="text-xl max-w-lg mx-auto">You violated the proctoring rules multiple times (tab switching or exiting fullscreen). Your test has been auto-submitted and locked.</p>
                <div className="mt-8 bg-white p-4 rounded-lg border border-red-200 text-sm font-bold text-red-500">
                    Review Status: REJECTED due to malpractice.
                </div>
            </div>
        );
    }

    // 6. EXPIRED (Time Up)
    if (status === "expired") {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-100 text-slate-600 p-10 text-center">
                <Clock size={80} className="text-slate-400 mb-6" />
                <h1 className="text-3xl font-bold mb-4">Test Ended</h1>
                <p className="text-lg">This test is no longer available.</p>
                <p className="text-sm mt-2">Thank you for participating.</p>
            </div>
        );
    }

    // 7. ACTIVE TEST (The Proctoring View)
    if (status === "active") {
        return (
            <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black flex flex-col">
                {/* PROCTORING WARNING OVERLAY (If they escape fullscreen) */}
                {!isFullscreen && (
                     <div className="absolute inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center text-white p-10 text-center">
                        <AlertCircle size={64} className="text-red-500 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-red-400 mb-2">⚠️ RETURN TO FULLSCREEN</h2>
                        <p className="text-lg text-slate-300 max-w-md">You are violating the exam rules. Time is running.</p>
                        <div className="mt-6 font-mono font-bold text-2xl text-white bg-red-600 px-6 py-2 rounded">
                             Attempts Remaining: {3 - violationCount}
                        </div>
                        <button onClick={enterFullScreenAndStart} className="mt-8 bg-white text-black px-8 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                            RETURN TO TEST
                        </button>
                     </div>
                )}

                {/* HEADER BAR */}
                <div className="h-14 bg-slate-900 border-b border-slate-700 flex justify-between items-center px-6 text-white select-none">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-slate-100">{lesson.title}</span>
                        <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold animate-pulse border border-red-900 bg-red-900/20 px-2 py-1 rounded">
                            <Radio size={12} /> REC
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        {/* WARNING COUNTER */}
                        <div className={`flex items-center gap-2 text-sm font-bold px-3 py-1 rounded ${violationCount > 0 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-green-900/30 text-green-400'}`}>
                            <AlertCircle size={16} /> 
                            Warnings: <span className="text-white">{violationCount}</span> / 3
                        </div>

                        {/* STOP CLOCK */}
                        <div className="flex items-center gap-2 font-mono text-xl font-bold text-white bg-slate-800 px-4 py-1 rounded border border-slate-700">
                            <Clock size={18} className="text-[#005EB8]" />
                            {testTimerString}
                        </div>
                    </div>
                </div>

                {/* TEST CONTENT (IFRAME) */}
                <iframe 
                    src={lesson.url} 
                    className="flex-1 w-full border-none bg-white" 
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals" 
                />
            </div>
        );
    }
    
    return <div className="p-10 text-center">Loading Proctor Status...</div>;
};

// --- MAIN PLAYER COMPONENT (UNTOUCHED) ---
const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
        const orderUrl = `${API_BASE_URL}/create-order`;
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
       const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/player`, { headers: { Authorization: `Bearer ${token}` } }); setCourse(res.data);
        if (res.data.modules?.[0]) {
            setExpandedModules([res.data.modules[0].id]); 
            if (res.data.modules[0].lessons?.length > 0) setActiveLesson(res.data.modules[0].lessons[0]);
        }
      } catch (err) { console.error(err); }
    };
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (activeLesson) {
        setIsTransitioning(true);
        // 500ms delay to force the old player to destroy completely
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 500); 
        return () => clearTimeout(timer);
    }
}, [activeLesson?.id]);

  const toggleModule = (moduleId: number) => setExpandedModules(prev => prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]);
  
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    
    // 1. Handle Google Forms (Existing Logic)
    if (url.includes("docs.google.com/forms")) {
        return url.replace(/\/viewform.*/, "/viewform?embedded=true").replace(/\/view.*/, "/viewform?embedded=true");
    }

    // 2. ✅ NEW: Handle Google App Scripts
    // We return the URL exactly as is. We do NOT want to add '/preview' to it.
    if (url.includes("script.google.com")) {
        return url; 
    }

    // 3. Handle Google Drive Files (PDFs/Docs)
    // This replaces /view with /preview for clean embedding
    return url.replace("/view", "/preview");
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
        // 1. Create FormData to send file + data together
        const formData = new FormData();
        formData.append("file", assignmentFile);           // The file object
        formData.append("lesson_title", activeLesson.title); // The lesson title (Required by backend)

        // 2. Send directly to your backend endpoint
        // NOTE: No need for '/get-upload-url' or '/confirm-submission' anymore
        await axios.post(`${API_BASE_URL}/submit-assignment`, formData, {
            headers: { 
                "Authorization": `Bearer ${token}`,
                // Axios automatically sets Content-Type to multipart/form-data when it sees FormData
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`Uploading: ${percent}%`);
                }
            }
        });
        
        // 3. Success Handling
        triggerToast(`✅ Assignment "${assignmentFile.name}" Submitted Successfully!`, "success");
        setAssignmentFile(null); 

    } catch (err) {
        console.error("Upload Error:", err);
        triggerToast("❌ Upload Failed. Please try again.", "error");
    } finally {
        setUploading(false);
    }
  };

 // 👇 REPLACE YOUR ENTIRE renderContent FUNCTION WITH THIS:
const renderContent = () => {
    if (!activeLesson) return <div className="text-white p-10 text-center">Select a lesson</div>;
    
    // 1. SHOW LOADING SCREEN DURING TRANSITION
    if (isTransitioning) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
                {/* Simple Spinner */}
                <div className="w-10 h-10 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold tracking-wider animate-pulse text-slate-400">LOADING...</p>
            </div>
        );
    }

    // 2. STANDARD CONTENT RENDERING (Your existing logic)
    if (activeLesson.type === "note") return <iframe src={getEmbedUrl(activeLesson.url)} width="100%" height="100%" className="bg-white border-0" allow="autoplay" />;
    
   if (activeLesson.type === "quiz") {
        return (
            <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-4">
                <iframe 
                    src={getEmbedUrl(activeLesson.url)} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    className="rounded-xl shadow-sm border border-slate-200 bg-white max-w-4xl" 
                    allowFullScreen
                    // ✅ NEW: These permissions ensure App Scripts run smoothly
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                >
                    Loading...
                </iframe>
            </div>
        );
    }
    
    if (activeLesson.type === "video" || activeLesson.type === "live_class") {
    // This calls the helper component we created at the top of the file
    return (
        <DelayedVideoPlayer 
            key={activeLesson.id} 
            lesson={activeLesson} 
            plyrOptions={plyrOptions} 
        />
    );
}
    
    if (activeLesson.type === "live_test") {
    return <LiveTestProctor lesson={activeLesson} />; 

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