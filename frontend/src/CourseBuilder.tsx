import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from './config';
import { 
  Plus, ArrowLeft, Video, HelpCircle, Zap, FileText, 
  Edit3, Layout, X, Link, Clock, Radio, 
  AlertCircle, Trash2, CheckCircle, Code,Edit, Sparkles
} from "lucide-react";

interface Module {
  id: number;
  title: string;
  order: number;
}

// ✅ NEW: Structure for Multiple Problems
interface CodeProblem {
  title: string;
  description: string;
  difficulty: string;
  testCases: { input: string; output: string }[];
}

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // --- CORE STATE ---
  const [modules, setModules] = useState<Module[]>([]);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [showAddModule, setShowAddModule] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  // ✅ FIX 1: Add Loading State (Prevents Header Moving/Jumping)
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NEW: Course Details State (For Hybrid Check)
  const [courseDetails, setCourseDetails] = useState<any>(null);

  // --- MODAL STATE ---
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemUrl, setItemUrl] = useState(""); 
  const [itemInstructions, setItemInstructions] = useState("");
  const [duration, setDuration] = useState(""); 
  const [isMandatory, setIsMandatory] = useState(false);
  const [startTime, setStartTime] = useState(""); 
  const [endTime, setEndTime] = useState("");
  // ✅ FIX: State for Array of Problems (Up to 3)
  const [problems, setProblems] = useState<CodeProblem[]>([
    { title: "", description: "", difficulty: "Easy", testCases: [{ input: "", output: "" }] }
  ]);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editCourseForm, setEditCourseForm] = useState({
      title: "", description: "", price: 0, image_url: "", language: ""
  });

  // Open the modal and fill it with existing data
  const handleEditCourseClick = () => {
      if (!courseDetails) return;
      setEditCourseForm({
          title: courseDetails.title || "",
          description: courseDetails.description || "",
          price: courseDetails.price || 0,
          image_url: courseDetails.image_url || "",
          language: courseDetails.language || ""
      });
      setIsEditingCourse(true);
  };

  // Save changes to backend
  const handleSaveCourseDetails = async () => {
      try {
          const token = localStorage.getItem("token");
          // Re-using the endpoint we created in the previous step
          await axios.patch(`${API_BASE_URL}/courses/${courseId}/details`, editCourseForm, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          // Update local state immediately so the UI reflects changes
          setCourseDetails({ ...courseDetails, ...editCourseForm });
          
          triggerToast("Course details updated!", "success");
          setIsEditingCourse(false);
      } catch (err) {
          console.error(err);
          triggerToast("Failed to update course details.", "error");
      }
  };

  const brand = { 
    blue: "#005EB8", green: "#87C232", bg: "#E2E8F0", 
    cardBg: "#F8FAFC", border: "#cbd5e1", textMain: "#1e293b", textLight: "#64748b" 
  };

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ ...toast, show: false }), 3000);
  };

  useEffect(() => { fetchModules(); }, [courseId]);

  const fetchModules = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/modules`, { headers: { Authorization: `Bearer ${token}` } });
      setModules(res.data);
      if (res.data.length > 0 && !selectedModuleId) setSelectedModuleId(res.data[0].id);

      // ✅ NEW: FETCH COURSE DETAILS TO CHECK TYPE
      const courseRes = await axios.get(`${API_BASE_URL}/courses/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      setCourseDetails(courseRes.data); 
      
    } catch (err) { 
        console.error("Failed to load modules", err); 
    } finally {
        // ✅ Stop loading only after data is ready (Stops Layout Shift)
        setIsLoading(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/courses/${courseId}/modules`, { title: newModuleTitle, order: modules.length + 1 }, { headers: { Authorization: `Bearer ${token}` } });
      setNewModuleTitle(""); setShowAddModule(false); fetchModules();
      triggerToast("Module added successfully!", "success");
    } catch (err) { triggerToast("Error adding module", "error"); }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE_URL}/courses/${courseId}/publish`, {}, { headers: { Authorization: `Bearer ${token}` } });
      triggerToast("🎉 Course Published! It is now live.", "success");
      setTimeout(() => navigate("/dashboard/courses"), 2000);
    } catch (err) { triggerToast("Error publishing course.", "error"); } finally { setIsPublishing(false); }
  };

  // --- PROBLEM MANAGEMENT LOGIC ---
  const updateActiveProblem = (field: keyof CodeProblem, value: any) => {
    const updatedProblems = [...problems];
    // @ts-ignore
    updatedProblems[activeProblemIndex] = { ...updatedProblems[activeProblemIndex], [field]: value };
    setProblems(updatedProblems);
  };

  const addProblem = () => {
    if (problems.length >= 3) {
      triggerToast("Maximum 3 problems allowed per test.", "error");
      return;
    }
    setProblems([...problems, { title: "", description: "", difficulty: "Easy", testCases: [{ input: "", output: "" }] }]);
    setActiveProblemIndex(problems.length);
  };

  const removeProblem = (index: number) => {
    if (problems.length === 1) return triggerToast("At least one problem is required.", "error");
    const updated = problems.filter((_, i) => i !== index);
    setProblems(updated);
    setActiveProblemIndex(0);
  };

  // --- TEST CASE LOGIC ---
  const addTestCase = () => {
    const updatedProblems = [...problems];
    updatedProblems[activeProblemIndex].testCases.push({ input: "", output: "" });
    setProblems(updatedProblems);
  };

  const updateTestCase = (tcIndex: number, field: "input" | "output", val: string) => {
    const updatedProblems = [...problems];
    updatedProblems[activeProblemIndex].testCases[tcIndex][field] = val;
    setProblems(updatedProblems);
  };

  const removeTestCase = (tcIndex: number) => {
    const updatedProblems = [...problems];
    updatedProblems[activeProblemIndex].testCases = updatedProblems[activeProblemIndex].testCases.filter((_, i) => i !== tcIndex);
    setProblems(updatedProblems);
  };

  // ✅ MAIN SAVE LOGIC
  const saveContentItem = async () => {
    if (!selectedModuleId) return triggerToast("Select a module from the sidebar first!", "error");
    if (!itemTitle.trim()) return triggerToast("Please enter a title for this item.", "error");

    const token = localStorage.getItem("token");
    const typeKey = activeModal?.toLowerCase().replace(" ", "_") || "video";

    // 🔴 SPECIAL LOGIC FOR LIVE CLASS
    if (activeModal === "Live Class") {
        try {
            // 1. Activate Global Live Session
            await axios.post(`${API_BASE_URL}/live/start`, {
    youtube_url: itemUrl,
    topic: itemTitle
}, { headers: { Authorization: `Bearer ${token}` } });

            // 2. Save as Lesson in Course Curriculum
            const payload = {
                title: itemTitle,
                type: "live_class", // Matches backend type
                data_url: itemUrl,
                module_id: selectedModuleId
            };
            await axios.post(`${API_BASE_URL}/content`, payload, { headers: { Authorization: `Bearer ${token}` } });
            
            triggerToast("🔴 Live Class Started & Added to Curriculum!", "success");
            setActiveModal(null); resetForm();
            return;
        } catch (err) {
            triggerToast("Failed to start Live Class", "error");
            return;
        }
    }

    // --- REGULAR ITEM LOGIC ---
    const payload: any = {
      title: itemTitle,
      type: typeKey, // "live_test"
      data_url: itemUrl,
      duration: duration ? parseInt(duration) : null,
      is_mandatory: isMandatory,
      instructions: itemInstructions,
      module_id: selectedModuleId,
      // ✅ ADD THESE: Send times only if they exist
      start_time: startTime || null, 
      end_time: endTime || null 
    };

    // ✅ FIX: Package multiple problems into one JSON string
    if (activeModal === "Code Test") {
        for (let i = 0; i < problems.length; i++) {
          if (!problems[i].title.trim()) return triggerToast(`Problem ${i + 1} is missing a title!`, "error");
          if (!problems[i].description.trim()) return triggerToast(`Problem ${i + 1} is missing a description!`, "error");
        }
        const config = { problems: problems };
        payload.test_config = JSON.stringify(config); 
    }

    try {
      await axios.post(`${API_BASE_URL}/content`, payload, { headers: { Authorization: `Bearer ${token}` } });
      triggerToast(`✅ ${activeModal} added successfully!`, "success");
      setActiveModal(null); resetForm();
    } catch (err) { triggerToast("Failed to save.", "error"); }
  };

  const resetForm = () => {
    setItemTitle(""); setItemUrl(""); setItemInstructions(""); 
    setDuration(""); setIsMandatory(false);
    
    // ✅ ADD THESE:
    setStartTime(""); setEndTime("");

    setProblems([{ title: "", description: "", difficulty: "Easy", testCases: [{ input: "", output: "" }] }]);
    setActiveProblemIndex(0);
  };

// Inside CourseBuilder.tsx, find the CodingCourseBuilder component and replace it with this:

const CodingCourseBuilder = () => {
    const [activeTab, setActiveTab] = useState("Easy"); // Easy, Medium, Hard
    const [challenges, setChallenges] = useState<any[]>([]);
    
    // Form State
    const [cTitle, setCTitle] = useState("");
    const [cDesc, setCDesc] = useState("");
    const [cTests, setCTests] = useState([{ input: "", output: "", hidden: false }]);
    const [loadingAI, setLoadingAI] = useState(false);
    
    // ✅ NEW: Track which ID is being edited (null = creating new)
    const [editingId, setEditingId] = useState<number | null>(null);
    
    const token = localStorage.getItem("token");

    useEffect(() => { loadChallenges(); }, [courseId]);

    const loadChallenges = async () => {
         try {
             const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/challenges`, { headers: { Authorization: `Bearer ${token}` } });
             setChallenges(res.data);
         } catch(e) { console.error(e); }
    };

    // ✅ NEW: Populate form when a problem is clicked
    const handleEditChallenge = (challenge: any) => {
        setEditingId(challenge.id);
        setCTitle(challenge.title);
        setCDesc(challenge.description);
        setActiveTab(challenge.difficulty); // Auto-switch tab to match problem
        
        try {
            // Parse existing test cases
            const parsedTests = typeof challenge.test_cases === 'string' 
                ? JSON.parse(challenge.test_cases) 
                : challenge.test_cases;
            setCTests(parsedTests);
        } catch (e) {
            setCTests([{ input: "", output: "", hidden: false }]);
        }
        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ✅ NEW: Delete Logic
    const handleDeleteChallenge = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the "Edit" click on parent div
        if(!window.confirm("Are you sure you want to delete this problem?")) return;
        
        try {
            await axios.delete(`${API_BASE_URL}/challenges/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            triggerToast("Problem deleted successfully", "success");
            loadChallenges();
            if (editingId === id) resetForm(); // Clear form if we deleted the active one
        } catch (err) {
            triggerToast("Failed to delete problem", "error");
        }
    };

    const resetForm = () => {
        setCTitle(""); 
        setCDesc(""); 
        setCTests([{ input: "", output: "", hidden: false }]);
        setEditingId(null);
    };

    const handleAutoFill = async () => {
        if(!cTitle) return triggerToast("Enter a title first", "error");
        setLoadingAI(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/ai/generate-challenge`, { title: cTitle });
            setCDesc(res.data.description);
            const parsedTests = typeof res.data.test_cases === 'string' ? JSON.parse(res.data.test_cases) : res.data.test_cases;
            setCTests(parsedTests);
            triggerToast("AI Content Generated!", "success");
        } catch(err) { 
            triggerToast("AI Generation Failed. Try again.", "error"); 
        }
        setLoadingAI(false);
    };

    const saveChallenge = async () => {
        if (!cTitle || !cDesc) return triggerToast("Title and Description required", "error");

        try {
            // Smart Formatting for numbers/arrays
            const formattedTests = cTests.map(t => {
                let cleanInput: any = t.input;
                try { cleanInput = JSON.parse(t.input); } 
                catch { 
                    if (t.input.includes(" ") || !isNaN(Number(t.input))) {
                         const parts = t.input.split(" ").map(p => {
                             const num = Number(p);
                             return isNaN(num) ? p : num;
                         });
                         cleanInput = parts.length === 1 ? parts[0] : parts;
                    }
                }
                return { ...t, input: cleanInput };
            });

            const testCasesString = JSON.stringify(formattedTests);
            const payload = {
                title: cTitle, 
                description: cDesc, 
                difficulty: activeTab, 
                test_cases: testCasesString 
            };

            if (editingId) {
                // ✅ PATCH: Update existing
                await axios.patch(`${API_BASE_URL}/challenges/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
                triggerToast("Problem Updated Successfully!", "success");
            } else {
                // ✅ POST: Create new
                await axios.post(`${API_BASE_URL}/courses/${courseId}/challenges`, payload, { headers: { Authorization: `Bearer ${token}` } });
                triggerToast("Problem Added Successfully!", "success");
            }
            
            loadChallenges();
            resetForm();
        } catch (err: any) { 
            triggerToast(err.response?.data?.detail || "Error saving problem", "error"); 
        }
    };
    
    const updateTestCase = (index: number, field: string, value: any) => {
        const newTests = [...cTests];
        // @ts-ignore
        newTests[index][field] = value;
        setCTests(newTests);
    };

    return (
        <div style={{ maxWidth: "1400px", margin: "0 auto", background: brand.bg, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            
            {/* ✅ HEADER: Matches Standard Builder Style */}
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: brand.cardBg, padding: "16px 40px", borderBottom: `1px solid ${brand.border}`, zIndex: 50 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <button onClick={() => navigate("/dashboard/courses")} style={{ background: "#E2E8F0", border: "none", padding: "10px", borderRadius: "50%", cursor: "pointer" }}><ArrowLeft size={20} color={brand.textMain} /></button>
                  
                  {/* Title & Edit Icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: "800", color: brand.textMain, margin: 0 }}>
                        {courseDetails?.title || "Coding Course Builder"}
                    </h2>
                    <span style={{fontSize: "12px", color: brand.blue, background: "#dbeafe", padding: "2px 8px", borderRadius: "6px", fontWeight: "700", textTransform: "uppercase"}}>{courseDetails?.language}</span>
                    <button 
                        onClick={handleEditCourseClick} // ✅ Triggers the Edit Modal
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "5px", display: "flex", alignItems: "center" }}
                        title="Edit Course Details"
                    >
                        <Edit size={18} color={brand.textLight} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                    {/* ✅ Preview Button now works */}
                    <button onClick={() => navigate(`/dashboard/course/${courseId}/preview`)} style={{ padding: "10px 20px", background: "white", color: "#005EB8", border: "1px solid #005EB8", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Preview & Manage</button>
                    <button onClick={handlePublish} disabled={isPublishing} style={{ padding: "12px 32px", borderRadius: "10px", border: "none", background: brand.green, color: "white", fontWeight: "800", cursor: "pointer" }}>{isPublishing ? "Publishing..." : "Publish Course"}</button>
                </div>
            </header>
            
            {/* CONTENT AREA */}
            <div style={{ padding: "40px", flex: 1, overflowY: "auto" }}>
                
                {/* TABS */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "30px", justifyContent: "center" }}>
                    {["Easy", "Medium", "Hard"].map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); resetForm(); }} 
                            style={{ padding: "12px 40px", borderRadius: "30px", background: activeTab === tab ? brand.green : "white", color: activeTab === tab ? "white" : "#64748b", fontWeight: "800", border: activeTab === tab ? "none" : "1px solid #cbd5e1", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                            {tab} Level
                        </button>
                    ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "40px", maxWidth: "1200px", margin: "0 auto" }}>
                    {/* LEFT: FORM */}
                    <div style={{ background: "white", padding: "30px", borderRadius: "16px", border: "1px solid #cbd5e1", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
                             <h3 style={{fontSize:"18px", fontWeight:"800", color: brand.textMain}}>
                                {editingId ? "Edit Problem" : "Add New Problem"}
                             </h3>
                             {editingId && <button onClick={resetForm} style={{fontSize:"12px", color: brand.textLight, background:"#f1f5f9", padding:"5px 10px", borderRadius:"6px", border:"none", cursor:"pointer"}}>Cancel Edit</button>}
                        </div>

                       <div style={{display:"flex", gap:"10px", marginBottom: "15px"}}>
    <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Problem Title (e.g. Fibonacci)" style={{...inputStyle, flex:1}} />
    <button 
        onClick={handleAutoFill} 
        disabled={loadingAI} 
        style={{
            padding:"0 20px", 
            background: loadingAI ? "#cbd5e1" : "#0f172a", // ✅ Black
            color:"white", 
            border:"none", 
            borderRadius:"10px", // Slightly more rounded
            fontWeight:"700", 
            fontSize: "13px",
            cursor: loadingAI ? "wait" : "pointer", 
            transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: "8px" // Flex for icon
        }}
    >
        {loadingAI ? "Generating..." : <><Sparkles size={14} /> AI Auto Fill</>} {/* ✅ Icon instead of Emoji */}
    </button>
</div>
                        <textarea rows={5} value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Problem Description..." style={{...inputStyle, marginBottom:"20px", resize: "vertical"}} />
                        
                        {/* Test Cases UI */}
                        <div style={{background:"#f8fafc", padding:"15px", borderRadius:"12px", marginBottom:"20px", border: "1px solid #e2e8f0"}}>
                            <label style={labelStyle}>Test Cases</label>
                            {cTests.map((tc, i) => (
                                <div key={i} style={{display:"flex", gap:"10px", marginBottom:"10px", alignItems: "center"}}>
                                    <input placeholder="Input" value={tc.input} onChange={e => updateTestCase(i, "input", e.target.value)} style={{...inputStyle, flex: 1}}/>
                                    <input placeholder="Output" value={tc.output} onChange={e => updateTestCase(i, "output", e.target.value)} style={{...inputStyle, flex: 1}}/>
                                    <label style={{fontSize:"12px", display:"flex", alignItems:"center", gap:"5px", cursor: "pointer", fontWeight: "600", color: brand.textLight}}>
                                        <input type="checkbox" checked={tc.hidden} onChange={e => updateTestCase(i, "hidden", e.target.checked)} /> Hidden
                                    </label>
                                    {cTests.length > 1 && <X size={16} color="#ef4444" cursor="pointer" onClick={() => { const n = cTests.filter((_, idx) => idx !== i); setCTests(n); }} />}
                                </div>
                            ))}
                            <button onClick={() => setCTests([...cTests, {input:"", output:"", hidden:false}])} style={{fontSize:"13px", color:brand.blue, background:"none", border:"none", cursor:"pointer", marginTop:"5px", fontWeight: "700"}}>+ Add Test Case</button>
                        </div>

                       <button 
    onClick={saveChallenge} 
    style={{
        width:"100%", 
        padding:"16px", 
        background: editingId ? "#d97706" : "#0f172a", // ✅ Black (Amber for Edit)
        color:"white", 
        fontWeight:"800", 
        borderRadius:"12px", 
        border:"none", 
        cursor:"pointer", 
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        marginTop: "10px",
        fontSize: "15px"
    }}
>
    {editingId ? "Update Problem" : `Save Problem to ${activeTab}`}
</button>
                    </div>

                    {/* RIGHT: LIST (With Edit/Delete Features) */}
                    <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #cbd5e1", height: "fit-content", maxHeight: "80vh", overflowY: "auto" }}>
                        <h3 style={{fontSize:"16px", fontWeight:"800", marginBottom:"15px", color: brand.textMain}}>Problems in {activeTab}</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {challenges.filter(c => c.difficulty === activeTab).map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => handleEditChallenge(c)} // ✅ Click to Edit
                                    style={{
                                        padding:"14px", background:"white", borderRadius:"10px", border: editingId === c.id ? `2px solid ${brand.blue}` : "1px solid #cbd5e1", 
                                        fontSize:"14px", fontWeight:"600", color: brand.textMain, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s"
                                    }}
                                >
                                    <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                                        <Code size={16} color={brand.blue} /> {c.title}
                                    </div>
                                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                                        {/* Edit Indicator */}
                                        {editingId === c.id && <span style={{fontSize: "10px", color: brand.blue, fontWeight: "800", background: "#dbeafe", padding: "2px 6px", borderRadius: "4px"}}>EDITING</span>}
                                        
                                        <Trash2 
                                            size={16} 
                                            color="#cbd5e1" 
                                            style={{cursor: "pointer", transition: "color 0.2s"}} 
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                                            onClick={(e) => handleDeleteChallenge(c.id, e)} // ✅ Click to Delete
                                        />
                                    </div>
                                </div>
                            ))}
                            {challenges.filter(c => c.difficulty === activeTab).length === 0 && (
                                <div style={{textAlign: "center", padding: "20px", color: brand.textLight, fontSize: "13px"}}>No problems yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ EDIT COURSE MODAL (Included inside CodingBuilder so it works) */}
            {isEditingCourse && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: `1px solid ${brand.border}` }}>
                            <h3 style={{ fontSize: "20px", fontWeight: "800", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                                <Edit size={20} color={brand.blue} /> Edit Course Details
                            </h3>
                            <X onClick={() => setIsEditingCourse(false)} style={{ cursor: "pointer", color: brand.textLight }} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto", paddingRight: "5px" }}>
                            <div>
                                <label style={labelStyle}>Course Title</label>
                                <input value={editCourseForm.title} onChange={(e) => setEditCourseForm({...editCourseForm, title: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea rows={3} value={editCourseForm.description} onChange={(e) => setEditCourseForm({...editCourseForm, description: e.target.value})} style={{...inputStyle, resize: "vertical"}} />
                            </div>
                            <div style={{ display: "flex", gap: "20px" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Price (INR)</label>
                                    <input type="number" value={editCourseForm.price} onChange={(e) => setEditCourseForm({...editCourseForm, price: parseInt(e.target.value)})} style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Language</label>
                                    <select value={editCourseForm.language} onChange={(e) => setEditCourseForm({...editCourseForm, language: e.target.value})} style={inputStyle}>
                                        <option value="python">Python</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                        <option value="javascript">JavaScript</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Thumbnail URL</label>
                                <div style={{ position: "relative" }}>
                                    <Link size={18} style={{ position: "absolute", left: "14px", top: "14px", color: brand.textLight }} />
                                    <input value={editCourseForm.image_url} onChange={(e) => setEditCourseForm({...editCourseForm, image_url: e.target.value})} style={{ ...inputStyle, paddingLeft: "45px" }} />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleSaveCourseDetails} style={saveButton}>Save Changes</button>
                    </div>
                </div>
            )}
            {/* End Modal */}
        </div>
    );
  };

  // ✅ LOADING SCREEN: Prevents Layout Shift / Moving Header
  if (isLoading) {
      return (
          <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: brand.bg }}>
              <div style={{ textAlign: "center" }}>
                  <div style={{ width: "40px", height: "40px", border: `4px solid ${brand.border}`, borderTop: `4px solid ${brand.blue}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 15px" }}></div>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <p style={{ color: brand.textLight, fontWeight: "600" }}>Loading Builder...</p>
              </div>
          </div>
      );
  }

  // ✅ CONDITIONAL RENDER: SWITCH TO CODING BUILDER IF TYPE IS CODING
  if (courseDetails?.course_type === "coding") {
    return <CodingCourseBuilder />;
  }

  // --- STANDARD COURSE RENDER (FIXED DASHBOARD LAYOUT) ---
  return (
    <div style={{ 
        maxWidth: "1400px", 
        margin: "0 auto", 
        background: brand.bg, 
        // 🔒 FIX 1: Lock the screen height so the page body NEVER scrolls
        height: "100vh", 
        display: "flex", 
        flexDirection: "column",
        overflow: "hidden" 
    }}>
      {/* Header stays fixed at the top naturally because of flex column */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: brand.cardBg, padding: "16px 40px", borderBottom: `1px solid ${brand.border}`, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button onClick={() => navigate("/dashboard/courses")} style={{ background: "#E2E8F0", border: "none", padding: "10px", borderRadius: "50%", cursor: "pointer" }}><ArrowLeft size={20} color={brand.textMain} /></button>
          
          {/* ✅ UPDATED: Dynamic Title & Edit Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: brand.textMain, margin: 0 }}>
                {courseDetails?.title || "Course Builder"}
            </h2>
            <button 
                onClick={handleEditCourseClick}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "5px", display: "flex", alignItems: "center" }}
                title="Edit Course Details"
            >
                <Edit size={18} color={brand.textLight} style={{ transition: "color 0.2s" }} />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => navigate(`/dashboard/course/${courseId}/preview`)} style={{ padding: "10px 20px", background: "white", color: "#005EB8", border: "1px solid #005EB8", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>Preview & Manage</button>
            <button onClick={handlePublish} disabled={isPublishing} style={{ padding: "12px 32px", borderRadius: "10px", border: "none", background: brand.green, color: "white", fontWeight: "800", cursor: "pointer" }}>{isPublishing ? "Publishing..." : "Publish Course"}</button>
        </div>
      </header>

      {/* Content Area: Fills remaining height, sidebar and main sit side-by-side */}
      <div style={{ 
          display: "grid", 
          gridTemplateColumns: "350px 1fr", 
          gap: "40px", 
          padding: "20px 40px", // Reduced top padding slightly
          flex: 1, // Takes all remaining vertical space
          overflow: "hidden" // Prevents layout blowout
      }}>
        {/* SIDEBAR: Scrolls internally */}
        <aside style={{ 
            background: brand.cardBg, 
            borderRadius: "16px", 
            border: `1px solid ${brand.border}`, 
            padding: "24px", 
            height: "100%", // Fill the grid cell
            overflowY: "auto" // Scrollbar appears HERE if list is long
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "800" }}>Curriculum</h3>
            <button onClick={() => setActiveModal("Heading")} style={{ color: brand.blue, background: "none", border: "none", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>+ New Heading</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {modules.map((m) => (
              <div key={m.id} onClick={() => setSelectedModuleId(m.id)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px", background: selectedModuleId === m.id ? "#E2E8F0" : "white", borderRadius: "12px", border: selectedModuleId === m.id ? `1.5px solid ${brand.blue}` : `1px solid ${brand.border}`, cursor: "pointer", transition: "all 0.2s ease" }}>
                <Layout size={18} color={selectedModuleId === m.id ? brand.blue : brand.textLight} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: brand.textMain }}>{m.title}</span>
              </div>
            ))}
            {showAddModule ? (
              <div style={{ marginTop: "10px", padding: "15px", background: "#f1f5f9", borderRadius: "12px" }}>
                <input autoFocus placeholder="Module Name..." value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${brand.border}`, marginBottom: "10px", outline: "none" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={handleAddModule} style={{ flex: 1, background: brand.blue, color: "white", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "700" }}>Add</button>
                  <button onClick={() => setShowAddModule(false)} style={{ flex: 1, background: "white", border: `1px solid ${brand.border}`, padding: "10px", borderRadius: "8px" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddModule(true)} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `2px dashed ${brand.border}`, color: brand.textLight, background: "none", fontWeight: "700", cursor: "pointer", marginTop: "10px" }}>+ Add Module</button>
            )}
          </div>
        </aside>

        {/* MAIN PANEL: Fixed in place, scrolls internally */}
        <main style={{ 
            background: brand.cardBg, 
            borderRadius: "20px", 
            border: `1px solid ${brand.border}`, 
            padding: "60px", 
            textAlign: "center",
            height: "100%", // Fill grid cell
            overflowY: "auto" // Scrollbar appears HERE if needed
        }}>
          <Layout size={48} color={brand.border} style={{ marginBottom: "20px" }} />
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: brand.textMain, marginBottom: "8px" }}>Create new learning item</h2>
          <p style={{ color: brand.textLight, marginBottom: "48px" }}>Items will be added to: <span style={{color: brand.blue, fontWeight: "700"}}>{modules.find(m => m.id === selectedModuleId)?.title || "Select a module"}</span></p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", maxWidth: "850px", margin: "0 auto" }}>
            {[
                { type: "Note", icon: <Edit3 size={28} color={brand.blue} />, desc: "Drive PDF Links" },
                { type: "Video", icon: <Video size={28} color={brand.blue} />, desc: "YouTube lessons" },
                { type: "Quiz", icon: <HelpCircle size={28} color={brand.blue} />, desc: "Google Form Links" },
                { type: "Code Test", icon: <Code size={28} color="#7c3aed" />, desc: "Compiler Challenges" },
                { type: "Assignment", icon: <FileText size={28} color={brand.blue} />, desc: "PDF projects (Drive)" },
                { type: "Live Class", icon: <Radio size={28} color="#ef4444" />, desc: "YouTube Live Link" },
                { type: "Live Test", icon: <Zap size={28} color="#EAB308" />, desc: "Timed assessment" },
            ].map(item => (
                <div key={item.type} onClick={() => setActiveModal(item.type)} style={selectorCard}>
                    {item.icon}
                    <div style={{ textAlign: "left" }}><div style={cardTitle}>{item.type}</div><div style={cardDesc}>{item.desc}</div></div>
                </div>
            ))}
          </div>
        </main>
      </div>

      {activeModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: "800", margin: 0 }}>Add {activeModal}</h3>
              <X onClick={() => setActiveModal(null)} style={{ cursor: "pointer", color: brand.textLight }} />
            </div>
            
            {activeModal === "Code Test" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto", paddingRight: "10px" }}>
                    <div><label style={labelStyle}>Overall Test Title</label><input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="e.g. Data Structures Final Exam" style={inputStyle} /></div>

                    {/* ✅ TABS FOR PROBLEMS */}
                    <div style={{ display: "flex", gap: "10px", borderBottom: `1px solid ${brand.border}`, paddingBottom: "10px" }}>
                        {problems.map((_, idx) => (
                            <div key={idx} onClick={() => setActiveProblemIndex(idx)} style={{ padding: "8px 16px", borderRadius: "8px", background: activeProblemIndex === idx ? brand.blue : "#f1f5f9", color: activeProblemIndex === idx ? "white" : brand.textLight, cursor: "pointer", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                Problem {idx + 1}
                                {problems.length > 1 && (<X size={12} onClick={(e) => { e.stopPropagation(); removeProblem(idx); }} />)}
                            </div>
                        ))}
                        {problems.length < 3 && (<button onClick={addProblem} style={{ background: "none", border: `1px dashed ${brand.blue}`, color: brand.blue, borderRadius: "8px", padding: "4px 12px", cursor: "pointer" }}><Plus size={16} /></button>)}
                    </div>

                    <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "12px", border: `1px solid ${brand.border}` }}>
                        <div style={{ marginBottom: "15px" }}><label style={labelStyle}>Problem Title</label><input value={problems[activeProblemIndex].title} onChange={(e) => updateActiveProblem("title", e.target.value)} placeholder="e.g. Reverse a String" style={inputStyle} /></div>
                        <div style={{ marginBottom: "15px" }}><label style={labelStyle}>Difficulty</label><select value={problems[activeProblemIndex].difficulty} onChange={(e) => updateActiveProblem("difficulty", e.target.value)} style={inputStyle}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                        <div style={{ marginBottom: "15px" }}><label style={labelStyle}>Problem Description</label><textarea rows={4} value={problems[activeProblemIndex].description} onChange={(e) => updateActiveProblem("description", e.target.value)} placeholder="Explain the logic required..." style={{...inputStyle, resize: "vertical"}} /></div>
                        <div>
                            <label style={labelStyle}>Test Cases</label>
                            {problems[activeProblemIndex].testCases.map((tc, idx) => (
                                <div key={idx} style={{ background: "white", padding: "10px", borderRadius: "8px", border: `1px solid ${brand.border}`, marginBottom: "8px" }}>
                                    <div style={{display: "flex", justifyContent: "space-between", marginBottom: "5px"}}>
                                        <span style={{fontSize: "11px", fontWeight: "700", color: brand.textLight}}>CASE {idx + 1}</span>
                                        {problems[activeProblemIndex].testCases.length > 1 && <Trash2 size={14} color="#ef4444" cursor="pointer" onClick={() => removeTestCase(idx)} />}
                                    </div>
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <input placeholder="Input" value={tc.input} onChange={(e) => updateTestCase(idx, "input", e.target.value)} style={{...inputStyle, flex: 1}} />
                                        <input placeholder="Output" value={tc.output} onChange={(e) => updateTestCase(idx, "output", e.target.value)} style={{...inputStyle, flex: 1}} />
                                    </div>
                                </div>
                            ))}
                            <button onClick={addTestCase} style={{fontSize: "13px", color: brand.blue, background: "none", border: "none", cursor: "pointer", fontWeight: "700", display: "flex", alignItems: "center", gap: "5px", marginTop: "5px"}}>+ Add Test Case</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div><label style={labelStyle}>{activeModal === "Heading" ? "Heading Name" : "Item Title"}</label><input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="e.g. Phase 1: Basics" style={inputStyle} /></div>
                    {activeModal === "Assignment" && (<div><label style={labelStyle}>Description (Optional)</label><textarea rows={3} value={itemInstructions} onChange={(e) => setItemInstructions(e.target.value)} placeholder="Explain what students need to do..." style={{ ...inputStyle, resize: "vertical" }} /></div>)}
                    {activeModal !== "Heading" && (
                        <>
                        <div>
    <label style={labelStyle}>
        {activeModal === "Assignment" ? "Submission Drive Link (Google Form/Folder)" 
        : activeModal === "Note" ? "Google Drive PDF Link" 
        : "YouTube / Google Form / App Script Link"} 
    </label><div style={{ position: "relative" }}><Link size={18} style={{ position: "absolute", left: "14px", top: "14px", color: brand.textLight }} /><input value={itemUrl} onChange={(e) => setItemUrl(e.target.value)} placeholder="https://..." style={{ ...inputStyle, paddingLeft: "45px" }} /></div></div>
                        {activeModal === "Assignment" && (<div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px" }}><input type="checkbox" id="mandatoryCheck" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ width: "18px", height: "18px", cursor: "pointer" }} /><label htmlFor="mandatoryCheck" style={{ fontSize: "14px", color: "#475569", fontWeight: "600", cursor: "pointer" }}>Mark as Mandatory</label></div>)}
                      {activeModal === "Live Test" && (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* ❌ DELETED DUPLICATE TITLE INPUT */}
        {/* ❌ DELETED DUPLICATE URL INPUT */}

        {/* ✅ ONLY KEEP THE TIME INPUTS */}
        <div style={{ display: 'flex', gap: '15px' }}>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Time</label>
                <div style={{ position: "relative" }}>
                    <Clock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: brand.textLight }} />
                    <input 
                        type="datetime-local" 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)} 
                        style={{ ...inputStyle, paddingLeft: "45px" }} 
                    />
                </div>
             </div>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Time</label>
                <div style={{ position: "relative" }}>
                    <Clock size={18} style={{ position: "absolute", left: "14px", top: "14px", color: brand.textLight }} />
                    <input 
                        type="datetime-local" 
                        value={endTime} 
                        onChange={(e) => setEndTime(e.target.value)} 
                        style={{ ...inputStyle, paddingLeft: "45px" }} 
                    />
                </div>
             </div>
        </div>
    </div>
)}
                        </>
                    )}
                </div>
            )}
            <button onClick={saveContentItem} style={saveButton}>Save {activeModal === "Code Test" ? "Test" : activeModal === "Heading" ? "Section Heading" : "Learning Item"}</button>
          </div>
        </div>
      )}
      {/* ✅ NEW: EDIT COURSE DETAILS MODAL */}
      {isEditingCourse && (
        <div style={modalOverlay}>
            <div style={modalContent}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "15px", borderBottom: `1px solid ${brand.border}` }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "800", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                        <Edit size={20} color={brand.blue} /> Edit Course Details
                    </h3>
                    <X onClick={() => setIsEditingCourse(false)} style={{ cursor: "pointer", color: brand.textLight }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto", paddingRight: "5px" }}>
                    {/* Title */}
                    <div>
                        <label style={labelStyle}>Course Title</label>
                        <input 
                            value={editCourseForm.title} 
                            onChange={(e) => setEditCourseForm({...editCourseForm, title: e.target.value})} 
                            style={inputStyle} 
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea 
                            rows={3}
                            value={editCourseForm.description} 
                            onChange={(e) => setEditCourseForm({...editCourseForm, description: e.target.value})} 
                            style={{...inputStyle, resize: "vertical"}} 
                        />
                    </div>

                    <div style={{ display: "flex", gap: "20px" }}>
                        {/* Price */}
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Price (INR)</label>
                            <input 
                                type="number"
                                value={editCourseForm.price} 
                                onChange={(e) => setEditCourseForm({...editCourseForm, price: parseInt(e.target.value)})} 
                                style={inputStyle} 
                            />
                        </div>
                        {/* Language */}
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Language</label>
                            <select 
                                value={editCourseForm.language} 
                                onChange={(e) => setEditCourseForm({...editCourseForm, language: e.target.value})} 
                                style={inputStyle}
                            >
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="javascript">JavaScript</option>
                            </select>
                        </div>
                    </div>

                    {/* Thumbnail */}
                    <div>
                        <label style={labelStyle}>Thumbnail URL</label>
                        <div style={{ position: "relative" }}>
                            <Link size={18} style={{ position: "absolute", left: "14px", top: "14px", color: brand.textLight }} />
                            <input 
                                value={editCourseForm.image_url} 
                                onChange={(e) => setEditCourseForm({...editCourseForm, image_url: e.target.value})} 
                                style={{ ...inputStyle, paddingLeft: "45px" }} 
                            />
                        </div>
                    </div>
                </div>

                <button onClick={handleSaveCourseDetails} style={saveButton}>Save Changes</button>
            </div>
        </div>
      )}
      {toast.show && (<div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 9999, background: "white", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)", borderLeft: `6px solid ${toast.type === "success" ? brand.green : "#ef4444"}`, display: "flex", alignItems: "center", gap: "12px", animation: "slideIn 0.3s ease-out" }}>{toast.type === "success" ? <CheckCircle size={24} color={brand.green} /> : <AlertCircle size={24} color="#ef4444" />}<div><h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: brand.textMain }}>{toast.type === "success" ? "Success" : "Error"}</h4><p style={{ margin: 0, fontSize: "13px", color: brand.textLight }}>{toast.message}</p></div><button onClick={() => setToast({ ...toast, show: false })} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "10px" }}><X size={16} color="#94a3b8" /></button><style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style></div>)}
    </div>
  );
};

const selectorCard = { display: "flex", alignItems: "center", gap: "20px", padding: "24px", background: "white", borderRadius: "16px", border: "1.5px solid #cbd5e1", cursor: "pointer", transition: "all 0.2s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" };
const cardTitle = { fontSize: "16px", fontWeight: "800", color: "#1e293b", marginBottom: "4px" };
const cardDesc = { fontSize: "12px", color: "#64748b" };
const modalOverlay = { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" };
const modalContent = { background: "#F8FAFC", width: "100%", maxWidth: "600px", padding: "40px", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" };
const labelStyle = { display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "800", color: "#1e293b", textTransform: "uppercase" as const, letterSpacing: "0.5px" };
const inputStyle = { width: "100%", padding: "14px", borderRadius: "12px", border: "1.5px solid #cbd5e1", fontSize: "15px", outline: "none", boxSizing: "border-box" as const, background: "white" };
const saveButton = { width: "100%", padding: "16px", marginTop: "32px", background: "#005EB8", color: "white", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: "800", cursor: "pointer", boxShadow: "0 10px 15px -3px rgba(0, 94, 184, 0.3)" };

export default CourseBuilder;