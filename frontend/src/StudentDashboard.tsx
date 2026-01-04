import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from './config';
import { 
  LayoutDashboard, BookOpen, Compass, Award, LogOut, 
  CheckCircle, AlertTriangle, X, 
  Code, Menu, Sparkles, User, Trophy, Lock
} from "lucide-react";

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

// --- HELPER COMPONENTS ---
const SidebarItem = ({ icon, label, active, onClick, collapsed }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${active ? "bg-white text-[#005EB8] font-bold shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
    {icon} {!collapsed && <span className="text-sm">{label}</span>}
  </button>
);

const StatCard = ({ icon: Icon, label, value }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 transition-all hover:-translate-y-1">
    <div className="p-3 rounded-xl bg-slate-100 text-slate-600"><Icon size={24} /></div>
    <div><h4 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h4><p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">{label}</p></div>
  </div>
);

const CourseCard = ({ course, type, navigate, handleFreeEnroll, openEnrollModal }: any) => {
  const imageUrl = course?.image_url?.startsWith('http') 
    ? course.image_url 
    : `${API_BASE_URL.replace('/api/v1', '')}/${course?.image_url}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
        <div className="h-40 bg-slate-200 relative flex items-center justify-center">
            {course?.image_url ? (<img src={imageUrl} alt={course?.title} className="w-full h-full object-cover" />) : (<BookOpen size={40} className="text-slate-400" />)}
            {type === "enrolled" && <div className="absolute top-2 right-2 bg-[#87C232] text-white px-2 py-1 rounded-full text-[10px] font-bold">ACTIVE</div>}
        </div>
        <div className="p-5">
            <h4 className="font-bold text-slate-800 mb-4 truncate">{course?.title || "Untitled Course"}</h4>
            <div className="flex justify-between items-center">
                <span className={`text-lg font-extrabold ${course?.price === 0 ? "text-[#87C232]" : "text-[#005EB8]"}`}>{course?.price === 0 ? "Free" : `₹${course?.price}`}</span>
                {type === "available" ? (
                    <button onClick={() => course?.price === 0 ? handleFreeEnroll(course.id) : openEnrollModal(course)} className={`px-4 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2 ${course?.price === 0 ? "bg-[#87C232]" : "bg-[#005EB8]"}`}>
                        {course?.price === 0 ? <Sparkles size={14} /> : <Lock size={14} />} {course?.price === 0 ? "Enroll" : "Unlock"}
                    </button>
                ) : (
                    <button onClick={() => navigate(`/course/${course.id}/player`)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">Resume</button>
                )}
            </div>
        </div>
    </div>
  );
};

// --- MAIN DASHBOARD COMPONENT ---
const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home"); 
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Modal & Settings
  const [showModal, setShowModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ 
    show: false, message: "", type: "success" 
  });

  const [codeTests, setCodeTests] = useState<CodeTest[]>([]);
  
  const brand = { 
    iqBlue: "#005EB8", iqGreen: "#87C232", textMain: "#1e293b", textLight: "#64748b" 
  };

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/"); return; }
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [allRes, myRes, testRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/courses`, config),
          axios.get(`${API_BASE_URL}/my-courses`, config),
          axios.get(`${API_BASE_URL}/code-tests`, config)
        ]);

        const allData = Array.isArray(allRes.data) ? allRes.data : [];
        const myData = Array.isArray(myRes.data) ? myRes.data : [];
        const testData = Array.isArray(testRes.data) ? testRes.data : [];

        const myCourseIds = new Set(myData.map((c: any) => c.id));
        setAvailableCourses(allData.filter((c: any) => !myCourseIds.has(c.id)));
        setEnrolledCourses(myData);
        setCodeTests(testData);

      } catch (err: any) { 
          if(err.response?.status === 401) { localStorage.clear(); navigate("/"); }
      } finally { setLoading(false); }
    };

    fetchData();
  }, [navigate]);

  const handleFreeEnroll = async (courseId: number) => {
      setProcessing(true);
      try {
          await axios.post(`${API_BASE_URL}/enroll/${courseId}`, { type: "paid" }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          triggerToast("🎉 Enrolled!", "success"); 
          // Reload page to refresh data simply
          window.location.reload();
      } catch (err) { triggerToast("Enrollment failed.", "error"); } finally { setProcessing(false); }
  };

  const handleEnrollStrategy = async (type: "trial" | "paid") => {
      if (!selectedCourse) return;
      setProcessing(true);
      try {
          if (type === "trial") {
             await axios.post(`${API_BASE_URL}/enroll/${selectedCourse.id}`,
                { type: "trial" }, 
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
              );
              triggerToast(`🎉 Trial Started!`, "success");
              window.location.reload();
          } else {
              const isLoaded = await loadRazorpayScript();
              if (!isLoaded) { triggerToast("SDK Failed to load", "error"); return; }

              const token = localStorage.getItem("token");
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
                      await axios.post(`${API_BASE_URL}/enroll/${selectedCourse.id}`, 
                          { type: "paid" }, 
                          { headers: { Authorization: `Bearer ${token}` } }
                      );
                      triggerToast("🎉 Payment Successful!", "success");
                      window.location.reload();
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
  
  const handleDownloadCertificate = async (courseId: number, courseTitle: string) => {
      triggerToast("Downloading certificate...", "success");
      try {
         const response = await axios.get(`${API_BASE_URL}/generate-pdf/${courseId}`, {
             headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
             responseType: 'blob',
         });
         const url = window.URL.createObjectURL(new Blob([response.data]));
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', `${courseTitle.replace(/\s+/g, '_')}_Certificate.pdf`);
         document.body.appendChild(link);
         link.click();
         link.remove();
         window.URL.revokeObjectURL(url);
      } catch (error) {
          triggerToast("Failed to download certificate.", "error");
      }
  };

  const openEnrollModal = (course: Course) => { setSelectedCourse(course); setShowModal(true); };
  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  // --- RENDER ---
  
  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-[#E2E8F0]">
              <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005EB8]"></div>
                  <p className="text-slate-600 font-bold animate-pulse">Loading Dashboard...</p>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-[#E2E8F0] font-sans">
      <aside className={`bg-[#F8FAFC] border-r border-slate-200 p-6 flex flex-col fixed h-full z-50 transition-all ${collapsed ? "w-20" : "w-64"}`}>
        <div className="mb-10 flex items-center justify-between">{!collapsed && <span className="text-xl font-extrabold text-[#005EB8]">iQmath<span className="text-[#87C232]">Pro</span></span>}<button onClick={() => setCollapsed(!collapsed)}><Menu size={24} className="text-slate-600" /></button></div>
        <nav className="flex flex-col gap-2 flex-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Home" active={activeTab === "home"} onClick={() => setActiveTab("home")} collapsed={collapsed} />
          <SidebarItem icon={<BookOpen size={20} />} label="My Learning" active={activeTab === "learning"} onClick={() => setActiveTab("learning")} collapsed={collapsed} />
          <SidebarItem icon={<Code size={20} />} label="Code Test" active={activeTab === "test"} onClick={() => setActiveTab("test")} collapsed={collapsed} />
          <SidebarItem icon={<Compass size={20} />} label="Explore Courses" active={activeTab === "explore"} onClick={() => setActiveTab("explore")} collapsed={collapsed} />
          <SidebarItem icon={<Award size={20} />} label="My Certificates" active={activeTab === "certificates"} onClick={() => setActiveTab("certificates")} collapsed={collapsed} />
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-xl text-red-500 hover:bg-red-50 font-bold mt-auto transition-all"><LogOut size={20} /> {!collapsed && "Sign Out"}</button>
      </aside>

      <main className={`flex-1 p-10 transition-all ${collapsed ? "ml-20" : "ml-64"}`}>
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800">{activeTab === "test" ? "Active Challenges" : "Dashboard Overview"}</h2>
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-10 h-10 rounded-full bg-[#005EB8] text-white flex items-center justify-center"><User size={20} /></button>
        </header>

        {activeTab === "home" && (
            <div className="flex flex-col gap-8">
                <div><h1 className="text-3xl font-extrabold text-slate-800 mb-2">Welcome back! 👋</h1></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard icon={BookOpen} label="Courses Enrolled" value={enrolledCourses.length} />
                    <StatCard icon={Award} label="Certificates Earned" value={0} />
                    <StatCard icon={Trophy} label="Challenges" value={codeTests.length} />
                </div>
            </div>
        )}

        {activeTab === "learning" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map(c => <CourseCard key={c.id} course={c} type="enrolled" navigate={navigate} />)}
                {enrolledCourses.length === 0 && <p className="text-slate-500">No courses enrolled yet.</p>}
            </div>
        )}
        
        {activeTab === "explore" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map(c => <CourseCard key={c.id} course={c} type="available" handleFreeEnroll={handleFreeEnroll} openEnrollModal={openEnrollModal} />)}
            </div>
        )}
        
        {activeTab === "test" && ( 
            <div className="grid gap-5"> 
                {codeTests.map(test => ( 
                    <div key={test.id} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center"> 
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{test.title}</h3>
                            <p className="text-slate-500 text-sm">Duration: {test.time_limit} Mins</p>
                        </div> 
                        <button className="bg-[#005EB8] text-white px-6 py-2 rounded-lg font-bold opacity-50 cursor-not-allowed" title="Use Code Test Page">View in Code Arena</button> 
                    </div> 
                ))} 
            </div> 
        )}
        
        {activeTab === "certificates" && (
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {enrolledCourses.map(course => (
                        <div key={course.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-all flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><Award size={32} /></div>
                                <div><h4 className="font-bold text-slate-800">{course.title}</h4></div>
                            </div>
                            <button onClick={() => handleDownloadCertificate(course.id, course.title)} className="bg-[#005EB8] hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Sparkles size={16} /> Download</button>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
      
      {/* ENROLLMENT MODAL */}
      {showModal && selectedCourse && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full relative overflow-hidden p-6">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <h3 className="text-xl font-extrabold text-slate-800 mb-1">Unlock Course</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 mt-4 flex items-center justify-between">
                <div><span className="block text-[10px] font-bold text-slate-400 uppercase">Price</span><span className="text-2xl font-extrabold text-[#005EB8]">₹{selectedCourse.price}</span></div>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={() => handleEnrollStrategy("paid")} disabled={processing} className="w-full py-3 rounded-lg bg-[#005EB8] hover:bg-blue-700 text-white font-bold">{processing ? "Processing..." : "Pay Now"}</button>
                <button onClick={() => handleEnrollStrategy("trial")} disabled={processing} className="w-full py-3 rounded-lg bg-white border border-slate-300 text-slate-600 font-bold">Start Trial</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-[10000] px-6 py-3 rounded-lg shadow-xl text-white font-bold flex items-center gap-3 animate-bounce ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
           {toast.type === "success" ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
           {toast.message}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;