import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";import API_BASE_URL from './config';
import { 
  ArrowLeft, Trash2, Edit2, Video, FileText, 
  Code, HelpCircle, FileQuestion, ChevronDown, ChevronRight,
  CheckCircle, X, AlertTriangle, GripVertical, Radio, Zap,
  Check
} from "lucide-react";

// --- Types ---
interface ContentItem {
  id: number;
  title: string;
  type: string;
  url: string;
  order: number;
}
interface Module {
  id: number;
  title: string;
  lessons: ContentItem[]; // Note: API returns 'lessons', we use it here
}

const CoursePreview = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]); // Local state for Drag & Drop
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);

  // Editing Item State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // Editing Module State
  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: number; type: 'item' | 'module' } | null>(null);

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({ 
    show: false, message: "", type: "success" 
  });

  // 🎨 PROFESSIONAL THEME
  const brand = { 
    blue: "#005EB8", 
    green: "#87C232", 
    textMain: "#1e293b", 
    textLight: "#64748b",
    cardBg: "#F8FAFC",
    border: "#cbd5e1"
  };

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => { fetchCourseData(); }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/courses/${courseId}/player`, {
         headers: { Authorization: `Bearer ${token}` }
      });
      setCourse(res.data);
      
      // Initialize modules state for DnD, sorting items by order
      const sortedModules = res.data.modules.map((m: any) => ({
          ...m,
          lessons: m.lessons.sort((a: any, b: any) => a.order - b.order)
      }));
      setModules(sortedModules);
      
      // Auto-expand all modules initially
      setExpandedModules(res.data.modules.map((m: any) => m.id));
    } catch (err) { console.error("Error loading preview", err); } finally { setLoading(false); }
  };

  // --- ITEM ACTIONS ---
  const handleDeleteItem = async (itemId: number) => {
    if (deleteConfirmId?.id !== itemId || deleteConfirmId?.type !== 'item') {
        setDeleteConfirmId({ id: itemId, type: 'item' });
        setTimeout(() => setDeleteConfirmId(null), 3000);
        return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE_URL}/content/${itemId}`, { headers: { Authorization: `Bearer ${token}` } });
      
      // Update local state instead of refetching for speed
      const updatedModules = modules.map(m => ({
          ...m,
          lessons: m.lessons.filter(l => l.id !== itemId)
      }));
      setModules(updatedModules);
      
      setDeleteConfirmId(null);
      triggerToast("Item deleted successfully", "success");
    } catch (err) { triggerToast("Failed to delete item.", "error"); }
  };

  const handleEditItemStart = (item: any) => { setEditingItem(item); setEditTitle(item.title); setEditUrl(item.url); };
  const handleEditItemSave = async () => {
    if (!editingItem) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API_BASE_URL}/content/${editingItem.id}`, { title: editTitle, url: editUrl }, { headers: { Authorization: `Bearer ${token}` } });
      
      // Update local state
      const updatedModules = modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => l.id === editingItem.id ? { ...l, title: editTitle, url: editUrl } : l)
      }));
      setModules(updatedModules);
      
      setEditingItem(null); 
      triggerToast("Item updated successfully", "success");
    } catch (err) { triggerToast("Failed to update item.", "error"); }
  };

  // --- MODULE ACTIONS (NEW) ---
  const handleEditModuleStart = (module: any, e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent toggling accordion
      setEditingModuleId(module.id);
      setEditModuleTitle(module.title);
  };

  const handleEditModuleSave = async () => {
      if (!editingModuleId) return;
      try {
          const token = localStorage.getItem("token");
          await axios.patch(`${API_BASE_URL}/modules/${editingModuleId}`, { title: editModuleTitle }, { headers: { Authorization: `Bearer ${token}` } });
          
          setModules(modules.map(m => m.id === editingModuleId ? { ...m, title: editModuleTitle } : m));
          setEditingModuleId(null);
          triggerToast("Module renamed!", "success");
      } catch (err) { triggerToast("Failed to rename module", "error"); }
  };

  const handleDeleteModule = async (moduleId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (deleteConfirmId?.id !== moduleId || deleteConfirmId?.type !== 'module') {
        setDeleteConfirmId({ id: moduleId, type: 'module' });
        setTimeout(() => setDeleteConfirmId(null), 3000);
        return;
      }

      try {
          const token = localStorage.getItem("token");
          await axios.delete(`${API_BASE_URL}/modules/${moduleId}`, { headers: { Authorization: `Bearer ${token}` } });
          setModules(modules.filter(m => m.id !== moduleId));
          setDeleteConfirmId(null);
          triggerToast("Module and its content deleted.", "success");
      } catch (err) { triggerToast("Failed to delete module", "error"); }
  };


  // --- DRAG AND DROP LOGIC ---
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // Only allow reordering within the SAME module
    if (source.droppableId !== destination.droppableId) return;

    const moduleIndex = modules.findIndex(m => m.id.toString() === source.droppableId);
    const newLessons = Array.from(modules[moduleIndex].lessons);
    
    // Reorder locally
    const [reorderedItem] = newLessons.splice(source.index, 1);
    newLessons.splice(destination.index, 0, reorderedItem);

    // Update State Immediately (Optimistic UI)
    const newModules = [...modules];
    newModules[moduleIndex].lessons = newLessons;
    setModules(newModules);

    // Save to Backend
    try {
        const token = localStorage.getItem("token");
        const itemIds = newLessons.map(i => i.id);
        await axios.put(
            `${API_BASE_URL}/modules/${modules[moduleIndex].id}/reorder`, 
            { item_ids: itemIds },
            { headers: { Authorization: `Bearer ${token}` } }
        );
    } catch (err) {
        triggerToast("Failed to save new order", "error");
    }
  };

  const toggleModule = (id: number) => { setExpandedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]); };

  const getIcon = (type: string) => {
    switch (type) {
      case "video": return <Video size={18} color="#005EB8" />;
      case "note": return <FileText size={18} color="#E67E22" />;
      case "quiz": return <HelpCircle size={18} color="#87C232" />;
      case "code_test": return <Code size={18} color="#9B59B6" />;
      case "live_test": return <Zap size={18} color="#F59E0B" />;
      case "live_class": return <Radio size={18} color="#EF4444" />;
      default: return <FileQuestion size={18} color="#64748b" />;
    }
  };

  if (loading) return <div style={{ padding: "40px", color: brand.textLight }}>Loading content...</div>;
  if (!course) return <div style={{ padding: "40px", color: brand.textLight }}>Course not found.</div>;

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", position: "relative" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "30px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button onClick={() => navigate(`/dashboard/course/${courseId}/builder`)} style={{ background: "white", border: `1px solid ${brand.border}`, borderRadius: "50%", padding: "8px", cursor: "pointer", color: brand.textMain }}>
            <ArrowLeft size={20} />
          </button>
          <div>
             <h1 style={{ fontSize: "24px", margin: 0, color: brand.textMain, fontWeight: "800" }}>{course.title}</h1>
             <p style={{ color: brand.textLight, margin: "5px 0 0 0", fontSize: "14px" }}>Content Manager & Preview</p>
          </div>
        </div>
        <div style={{ background: "#e0f2fe", color: "#005EB8", padding: "8px 16px", borderRadius: "20px", fontWeight: "700", fontSize: "12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Instructor View
        </div>
      </div>

      {/* MODULES LIST WITH DRAG AND DROP */}
      <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {modules.map((module) => (
          <div key={module.id} style={{ border: `1px solid ${brand.border}`, borderRadius: "12px", background: brand.cardBg, overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            
            {/* Module Header (With Edit/Delete) */}
            <div 
              onClick={() => toggleModule(module.id)}
              style={{ padding: "16px 20px", background: "#F1F5F9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: expandedModules.includes(module.id) ? `1px solid ${brand.border}` : "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                  {editingModuleId === module.id ? (
                      <div onClick={e => e.stopPropagation()} style={{display: "flex", gap: "8px", flex: 1}}>
                          <input 
                              value={editModuleTitle} 
                              onChange={e => setEditModuleTitle(e.target.value)}
                              style={{ flex: 1, padding: "8px", borderRadius: "6px", border: `1px solid ${brand.blue}`, outline: "none", fontSize: "14px", fontWeight: "700" }}
                              autoFocus
                          />
                          <button onClick={handleEditModuleSave} style={{ background: brand.green, border: "none", borderRadius: "6px", padding: "6px", color: "white", cursor: "pointer" }}><Check size={16} /></button>
                          <button onClick={() => setEditingModuleId(null)} style={{ background: "#ef4444", border: "none", borderRadius: "6px", padding: "6px", color: "white", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                  ) : (
                      <>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: brand.textMain }}>{module.title}</h3>
                        <div style={{display: "flex", gap: "5px", marginLeft: "10px"}}>
                            <button onClick={(e) => handleEditModuleStart(module, e)} style={{ border: "none", background: "none", cursor: "pointer", color: brand.textLight }}><Edit2 size={14} /></button>
                            <button onClick={(e) => handleDeleteModule(module.id, e)} style={{ border: "none", background: "none", cursor: "pointer", color: deleteConfirmId?.id === module.id && deleteConfirmId.type === 'module' ? "red" : brand.textLight }}>
                                {deleteConfirmId?.id === module.id && deleteConfirmId.type === 'module' ? "Confirm?" : <Trash2 size={14} />}
                            </button>
                        </div>
                      </>
                  )}
              </div>
              {expandedModules.includes(module.id) ? <ChevronDown size={20} color={brand.textLight} /> : <ChevronRight size={20} color={brand.textLight} />}
            </div>

            {/* Lessons List (Draggable) */}
            {expandedModules.includes(module.id) && (
              <Droppable droppableId={module.id.toString()}>
              {(provided) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    style={{ padding: "10px" }}
                  >
                    {module.lessons.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: brand.textLight, fontSize: "14px", fontStyle: "italic" }}>No content yet. Drag items here later.</div>
                    ) : (
                      module.lessons.map((lesson, index) => (
                        <Draggable key={lesson.id} draggableId={lesson.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{ 
                                    display: "flex", alignItems: "center", justifyContent: "space-between", 
                                    padding: "12px", borderBottom: "1px solid #f1f5f9", 
                                    background: snapshot.isDragging ? "#e0f2fe" : "white", 
                                    borderRadius: "8px", marginBottom: "8px",
                                    ...provided.draggableProps.style 
                                }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                {/* Drag Handle */}
                                <div {...provided.dragHandleProps} style={{ cursor: "grab", color: "#cbd5e1", display: "flex", alignItems: "center" }}>
                                    <GripVertical size={20} />
                                </div>

                                <div style={{ width: "36px", height: "36px", background: "#F8FAFC", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${brand.border}` }}>
                                  {getIcon(lesson.type)}
                                </div>
                                <div>
                                   <div style={{ fontWeight: "600", fontSize: "14px", color: brand.textMain }}>{lesson.title}</div>
                                   <div style={{ fontSize: "12px", color: brand.textLight, maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                     {lesson.type.toUpperCase()} • {lesson.url || "No Link"}
                                   </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "8px" }}>
                                  <button onClick={() => handleEditItemStart(lesson)} style={{ padding: "8px", border: `1px solid ${brand.border}`, borderRadius: "8px", background: "white", cursor: "pointer", color: brand.textLight, transition: "all 0.2s" }} title="Edit Details">
                                    <Edit2 size={16} />
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleDeleteItem(lesson.id)} 
                                    style={{ 
                                        padding: "8px 12px", 
                                        border: deleteConfirmId?.id === lesson.id && deleteConfirmId.type === 'item' ? "1px solid #dc2626" : "1px solid #fee2e2", 
                                        borderRadius: "8px", 
                                        background: deleteConfirmId?.id === lesson.id && deleteConfirmId.type === 'item' ? "#dc2626" : "#fff1f2", 
                                        cursor: "pointer", 
                                        color: deleteConfirmId?.id === lesson.id && deleteConfirmId.type === 'item' ? "white" : "#ef4444", 
                                        transition: "all 0.2s",
                                        display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold"
                                    }} 
                                    title="Delete Item"
                                  >
                                    {deleteConfirmId?.id === lesson.id && deleteConfirmId.type === 'item' ? "Confirm?" : <Trash2 size={16} />}
                                  </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
              )}
              </Droppable>
            )}
          </div>
        ))}
      </div>
      </DragDropContext>

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div style={{ background: brand.cardBg, padding: "30px", borderRadius: "16px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, color: brand.textMain, fontWeight: "800", fontSize: "18px" }}>Edit Content</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "5px", color: brand.textLight, textTransform: "uppercase" }}>Title</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${brand.border}`, outline: "none", color: brand.textMain }} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "5px", color: brand.textLight, textTransform: "uppercase" }}>URL / Content Link</label>
              <input value={editUrl} onChange={e => setEditUrl(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: `1px solid ${brand.border}`, outline: "none", color: brand.textMain }} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
               <button onClick={handleEditItemSave} style={{ flex: 1, padding: "10px", background: brand.blue, color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Save Changes</button>
               <button onClick={() => setEditingItem(null)} style={{ flex: 1, padding: "10px", background: "white", color: brand.textLight, border: `1px solid ${brand.border}`, borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9999,
          background: "white", padding: "16px 24px", borderRadius: "12px",
          boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)", borderLeft: `6px solid ${toast.type === "success" ? brand.green : "#ef4444"}`,
          display: "flex", alignItems: "center", gap: "12px", animation: "slideIn 0.3s ease-out"
        }}>
           {toast.type === "success" ? <CheckCircle size={24} color={brand.green} /> : <AlertTriangle size={24} color="#ef4444" />}
           <div>
             <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "700", color: brand.textMain }}>{toast.type === "success" ? "Success" : "Error"}</h4>
             <p style={{ margin: 0, fontSize: "13px", color: brand.textLight }}>{toast.message}</p>
           </div>
           <button onClick={() => setToast(prev => ({ ...prev, show: false }))} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "10px" }}>
             <X size={16} color="#94a3b8" />
           </button>
           <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
      )}
    </div>
  );
};

export default CoursePreview;