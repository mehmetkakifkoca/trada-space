"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { 
  useDataStore, 
  Customer, 
  Project, 
  ProjectStatus, 
  ProjectCategory, 
  ProjectTask,
  SYSTEM_CATEGORIES 
} from "@/store/data-store";
import { 
  Plus, 
  Search, 
  Filter, 
  X,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Euro,
  Users,
  Layers,
  RotateCcw,
  CheckSquare,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  UserPlus
} from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const COLUMNS: { id: ProjectStatus; title: string; color: string; bg: string; text: string }[] = [
  { id: "Draft", title: "Entwurf", color: "bg-gray-400", bg: "bg-gray-50/50", text: "text-gray-600" },
  { id: "Active", title: "Aktiv", color: "bg-emerald-500", bg: "bg-emerald-50/30", text: "text-emerald-700" },
  { id: "Waiting for client", title: "Wartend", color: "bg-orange-500", bg: "bg-orange-50/30", text: "text-orange-700" },
  { id: "Finished", title: "Abgeschlossen", color: "bg-blue-500", bg: "bg-blue-50/30", text: "text-blue-700" },
  { id: "Cancelled", title: "Abgebrochen", color: "bg-red-500", bg: "bg-red-50/30", text: "text-red-750" }
];

const statusLabel: Record<ProjectStatus, string> = {
  Draft: "Entwurf",
  Active: "Aktiv",
  "Waiting for client": "Wartend",
  Finished: "Abgeschlossen",
  Cancelled: "Abgebrochen"
};

export default function CRMPage() {
  const { user } = useAuthStore();
  const { 
    customers, addCustomer, updateCustomer, deleteCustomer, teamMembers,
    projects, addProject, updateProject, deleteProject,
    projectTasks, addProjectTask, updateProjectTask, deleteProjectTask,
    timeAllocations, freelancerWorkLogs
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<"kanban" | "customers">("kanban");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";
  const isCEO = isSuperAdmin || ["ceo", "co founder", "admin", "manager", "buchhaltung"].includes(user?.role?.toLowerCase() || "");
  const canEditPayments = user?.role === "CEO" || user?.role === "Buchhaltung";

  // --- FILTER STATES (KANBAN) ---
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // --- CUSTOMERS TAB STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [customerFormData, setCustomerFormData] = useState<Partial<Customer>>({
    name: "",
    email: "",
    status: "Active",
    color: "#3B82F6"
  });

  // --- KANBAN PROJECT MODALS STATE ---
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectModalTab, setProjectModalTab] = useState<"details" | "tasks" | "finances" | "team">("details");

  const [projectFormData, setProjectFormData] = useState<Partial<Project>>({
    name: "",
    customerId: "",
    category: "Design & Grafik",
    categories: ["Design & Grafik"],
    status: "Active",
    revenue: 0,
    startDate: new Date().toISOString().split('T')[0],
    deadline: "",
    description: "",
    internalCode: ""
  });

  // --- MODAL TASKS CREATION STATE ---
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskWorkerId, setNewTaskWorkerId] = useState("");
  const [newTaskEstHours, setNewTaskEstHours] = useState(0);
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  // --- CUSTOMER FILTERING ---
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- PROJECT FILTERING (KANBAN) ---
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
        p.customerName.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.internalCode?.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(projectSearch.toLowerCase());

      const matchesCategory = 
        selectedCategory === "All" || 
        p.category === selectedCategory || 
        p.categories?.includes(selectedCategory);

      let matchesDate = true;
      if (startDateFilter) {
        const pEnd = p.deadline || p.startDate;
        if (pEnd < startDateFilter) matchesDate = false;
      }
      if (endDateFilter) {
        const pStart = p.startDate;
        if (pStart > endDateFilter) matchesDate = false;
      }

      // Permissions check: CEO or has 'proj' permission can see all.
      // Otherwise, see only if they have tasks assigned to them on the project.
      const hasProjPermission = user?.customPermissions?.includes("proj");
      const isAssigned = isCEO || hasProjPermission || projectTasks.some(t => t.projectId === p.id && t.assignedMemberIds.includes(user?.id || ""));

      return matchesSearch && matchesCategory && matchesDate && isAssigned;
    });
  }, [projects, projectSearch, selectedCategory, startDateFilter, endDateFilter, isCEO, projectTasks, user]);

  // --- DRAG AND DROP KANBAN ---
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const newStatus = destination.droppableId as ProjectStatus;
    updateProject(draggableId, { status: newStatus });
    toast.success(`Projekt "${projects.find(p => p.id === draggableId)?.name}" in "${statusLabel[newStatus]}" verschoben.`);
  };

  // --- CUSTOMER ACTIONS ---
  const handleOpenCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerFormData(customer);
    } else {
      setEditingCustomer(null);
      setCustomerFormData({
        name: "",
        email: "",
        company: "",
        contactPerson: "",
        address: "",
        vatId: "",
        phone: "",
        paymentTerms: "14 Tage netto",
        notes: "",
        status: "Active",
        color: "#" + Math.floor(Math.random()*16777215).toString(16)
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name) {
      toast.error("Der Kundenname ist erforderlich.");
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerFormData);
      toast.success("Kunde erfolgreich aktualisiert.");
    } else {
      const newCustomer: Customer = {
        ...customerFormData as Customer,
        id: "c" + Date.now(),
      };
      addCustomer(newCustomer);
      toast.success("Kunde erfolgreich hinzugefügt.");
    }
    setIsCustomerModalOpen(false);
  };

  const handleCustomerDelete = (id: string) => {
    if (confirm("Möchten Sie diesen Kunden wirklich löschen?")) {
      deleteCustomer(id);
      toast.success("Kunde gelöscht.");
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
      }
    }
  };

  // --- PROJECT ACTIONS ---
  const handleOpenNewProjectModal = () => {
    setEditingProjectId(null);
    setSelectedProject(null);
    setProjectFormData({
      name: "",
      customerId: "",
      category: "Design & Grafik",
      categories: ["Design & Grafik"],
      status: "Draft",
      revenue: 0,
      startDate: new Date().toISOString().split('T')[0],
      deadline: "",
      description: "",
      internalCode: ""
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenProjectDetailModal = (project: Project) => {
    setSelectedProject(project);
    setProjectModalTab("details");
    setProjectFormData({
      name: project.name,
      customerId: project.customerId,
      category: project.category,
      categories: project.categories || [project.category],
      status: project.status,
      revenue: project.revenue,
      startDate: project.startDate,
      deadline: project.deadline,
      description: project.description,
      internalCode: project.internalCode
    });
    setEditingProjectId(project.id);
    
    // Reset Task Creation form inputs
    setNewTaskTitle("");
    setNewTaskWorkerId("");
    setNewTaskEstHours(0);
    setNewTaskDueDate(new Date().toISOString().split('T')[0]);

    setIsProjectModalOpen(true);
  };

  const handleSaveOrUpdateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.name || !projectFormData.customerId) {
      toast.error("Projektname und Kunde sind erforderlich.");
      return;
    }

    const customer = customers.find(c => c.id === projectFormData.customerId);
    const customerName = customer?.name || "Unbekannter Kunde";

    if (editingProjectId) {
      // Update
      updateProject(editingProjectId, {
        ...projectFormData,
        customerName
      });
      toast.success("Projekt erfolgreich aktualisiert.");
      setSelectedProject(prev => prev ? { ...prev, ...projectFormData, customerName } : null);
    } else {
      // Create
      const newProject: Project = {
        ...projectFormData as Project,
        id: "PRJ-" + Math.floor(1000 + Math.random() * 9000),
        customerName,
        createdAt: Date.now()
      };
      addProject(newProject);
      toast.success("Projekt erfolgreich erstellt.");
    }
    setIsProjectModalOpen(false);
  };

  const handleProjectDelete = (id: string) => {
    if (confirm("Dieses Projekt wirklich löschen? Alle verknüpften Stunden und Ausgaben bleiben im System, aber das Projekt wird entfernt.")) {
      deleteProject(id);
      toast.success("Projekt gelöscht.");
      setIsProjectModalOpen(false);
      setSelectedProject(null);
    }
  };

  // --- PROJECT TASK MANAGEMENT ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!newTaskTitle) {
      toast.error("Titel der Aufgabe ist erforderlich.");
      return;
    }

    const newTask: ProjectTask = {
      id: "TSK-" + Math.floor(10000 + Math.random() * 90000),
      projectId: selectedProject.id,
      title: newTaskTitle,
      description: "",
      category: "CRM-Created",
      status: "Open",
      assignedMemberIds: newTaskWorkerId ? [newTaskWorkerId] : [],
      estimatedHours: newTaskEstHours || 0,
      dueDate: newTaskDueDate || new Date().toISOString().split('T')[0]
    };

    addProjectTask(newTask);
    toast.success("Aufgabe hinzugefügt.");
    
    // Clear inputs
    setNewTaskTitle("");
    setNewTaskWorkerId("");
    setNewTaskEstHours(0);
    setNewTaskDueDate(new Date().toISOString().split('T')[0]);
  };

  const toggleTaskStatus = (task: ProjectTask) => {
    const statusCycle: Record<ProjectTask["status"], ProjectTask["status"]> = {
      "Open": "In progress",
      "In progress": "Waiting",
      "Waiting": "Done",
      "Done": "Open"
    };
    updateProjectTask(task.id, { status: statusCycle[task.status] });
    toast.success(`Aufgabenstatus geändert zu "${statusCycle[task.status]}"`);
  };

  const handleTaskDelete = (taskId: string) => {
    if (confirm("Diese Aufgabe löschen?")) {
      deleteProjectTask(taskId);
      toast.success("Aufgabe gelöscht.");
    }
  };

  return (
    <div className="space-y-6 pb-20 relative animate-in fade-in duration-300">
      
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">CRM Hub</h1>
          <p className="text-xs text-gray-500 mt-1.5 font-medium">Verwalten Sie Projekte, Status und Kundenbeziehungen zentralisiert.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === "kanban" ? (
            <button 
              onClick={handleOpenNewProjectModal}
              className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 shadow-md transition-all"
            >
              <Plus className="h-4 w-4" />
              Neues Projekt
            </button>
          ) : (
            <button 
              onClick={() => handleOpenCustomerModal()}
              className="flex items-center gap-2 bg-brand-secondary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 shadow-md shadow-brand-secondary/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              Kunde hinzufügen
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center bg-white border border-gray-100 rounded-2xl p-1.5 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("kanban")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "kanban" ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
        >
          <Layers className="h-4 w-4" />
          Projekt-Board (Kanban)
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "customers" ? "bg-black text-white" : "text-gray-500 hover:text-black"}`}
        >
          <Users className="h-4 w-4" />
          Kunden-Datenbank
        </button>
      </div>

      {/* --- KANBAN BOARD VIEW --- */}
      {activeTab === "kanban" && (
        <div className="space-y-6">
          
          {/* Global Filter Bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Projekte suchen nach Name, Code, Kunde..." 
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
               <div className="relative">
                  <select 
                    className="pl-3 pr-9 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none appearance-none cursor-pointer text-gray-650"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">Alle Kategorien</option>
                    {SYSTEM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
               </div>
               
               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                 <span className="text-[9px] font-black text-gray-400 uppercase">Von:</span>
                 <input 
                   type="date"
                   className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer"
                   value={startDateFilter}
                   onChange={(e) => setStartDateFilter(e.target.value)}
                 />
               </div>
               
               <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                 <span className="text-[9px] font-black text-gray-400 uppercase">Bis:</span>
                 <input 
                   type="date"
                   className="bg-transparent border-none text-[11px] font-bold focus:outline-none cursor-pointer"
                   value={endDateFilter}
                   onChange={(e) => setEndDateFilter(e.target.value)}
                 />
               </div>

               {(projectSearch || selectedCategory !== "All" || startDateFilter || endDateFilter) && (
                 <button 
                   onClick={() => {
                     setProjectSearch("");
                     setSelectedCategory("All");
                     setStartDateFilter("");
                     setEndDateFilter("");
                   }}
                   className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all flex items-center justify-center border border-red-100"
                   title="Filter zurücksetzen"
                 >
                   <RotateCcw className="h-4 w-4" />
                 </button>
               )}
               
               <div className="h-8 w-px bg-gray-100 mx-1 hidden lg:block" />
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredProjects.length} Ergebnisse</p>
            </div>
          </div>

          {/* Kanban Columns */}
          {mounted ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5 items-start overflow-x-auto pb-4">
                {COLUMNS.map((col) => {
                  const columnProjects = filteredProjects.filter(p => p.status === col.id);
                  return (
                    <div key={col.id} className="flex flex-col bg-gray-100/30 rounded-3xl p-3 border border-gray-100/50 min-w-[250px] flex-1">
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-4 px-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                          <h3 className="font-bold text-gray-900 text-xs tracking-tight">{col.title}</h3>
                        </div>
                        <span className="text-[10px] font-bold bg-white text-gray-500 px-2 py-0.5 rounded-full border border-gray-100/70 shadow-sm">
                          {columnProjects.length}
                        </span>
                      </div>

                      {/* Droppable Area */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-3 rounded-2xl p-1 transition-colors min-h-[500px] ${snapshot.isDraggingOver ? 'bg-gray-100/50' : ''}`}
                          >
                            {columnProjects.map((project, index) => {
                              const stats = calculateProjectQuickStats(project, projectTasks, timeAllocations, teamMembers, freelancerWorkLogs);
                              const specificTasks = projectTasks.filter(t => t.projectId === project.id);
                              const completedTasks = specificTasks.filter(t => t.status === "Done").length;
                              const totalTasksCount = specificTasks.length;

                              const isOverdue = project.deadline && 
                                project.status !== "Finished" && 
                                project.status !== "Cancelled" && 
                                new Date(project.deadline) < new Date(new Date().setHours(0,0,0,0));

                              return (
                                <Draggable key={project.id} draggableId={project.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      onClick={() => handleOpenProjectDetailModal(project)}
                                      className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative ${snapshot.isDragging ? 'shadow-lg rotate-1 scale-[1.01] border-brand-secondary' : ''}`}
                                    >
                                      {/* Categories */}
                                      <div className="flex flex-wrap gap-1 mb-2.5">
                                        {project.categories?.slice(0, 2).map((cat) => (
                                          <span key={cat} className="px-2 py-0.5 bg-brand-primary-light text-brand-primary text-[8px] font-black uppercase tracking-wider rounded">
                                            {cat}
                                          </span>
                                        )) || (
                                          <span className="px-2 py-0.5 bg-brand-primary-light text-brand-primary text-[8px] font-black uppercase tracking-wider rounded">
                                            {project.category}
                                          </span>
                                        )}
                                      </div>

                                      {/* Project Name */}
                                      <h4 className="text-xs font-bold text-gray-900 group-hover:text-brand-secondary transition-colors line-clamp-1 mb-0.5">
                                        {project.name}
                                      </h4>
                                      {project.internalCode && (
                                        <span className="text-[9px] text-gray-400 font-bold tracking-wider uppercase block mb-2">{project.internalCode}</span>
                                      )}
                                      
                                      {/* Customer */}
                                      <p className="text-[10px] text-gray-500 font-bold mb-3">
                                        {project.customerName}
                                      </p>

                                      {/* Quick indicators */}
                                      <div className="grid grid-cols-2 gap-y-2 gap-x-1 border-t border-gray-50 pt-2.5 text-[9px] font-bold text-gray-400">
                                        <div className="flex items-center gap-1">
                                          <Euro className="h-3 w-3 text-gray-400 shrink-0" />
                                          <span className="text-gray-800 font-extrabold">
                                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(project.revenue)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end">
                                          <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                                          <span className="text-gray-750 font-bold">{stats.totalHours.toFixed(1)}h</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <CheckSquare className="h-3 w-3 text-gray-400 shrink-0" />
                                          <span>{completedTasks}/{totalTasksCount} Tasks</span>
                                        </div>
                                        <div className="flex items-center gap-1 justify-end">
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${stats.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                            {stats.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stats.profit)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Timeline indicator */}
                                      {project.deadline && (
                                        <div className="mt-3 pt-2 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-gray-400">
                                          <span>Deadline: {project.deadline}</span>
                                          {isOverdue && (
                                            <span className="flex items-center gap-0.5 text-red-500 bg-red-50 px-1.5 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                                              <AlertTriangle className="h-2.5 w-2.5" /> Fällig
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          ) : (
            <div className="py-20 text-center text-gray-400 font-bold text-sm bg-white border border-gray-100 rounded-3xl">Lade Board...</div>
          )}
        </div>
      )}

      {/* --- CUSTOMERS DATABASE VIEW --- */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Suchen nach Name, Firma oder E-Mail..." 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <button className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-605 hover:bg-gray-100 transition-all flex items-center gap-2">
                  <Filter className="h-4 w-4" /> Filter
               </button>
               <div className="h-10 w-px bg-gray-100 mx-2" />
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredCustomers.length} Ergebnisse</p>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kunde / Firma</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">E-Mail</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-gray-50/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: customer.color }} />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-brand-secondary transition-colors">
                            {customer.company || customer.name}
                          </span>
                          {customer.company && customer.contactPerson && (
                            <span className="text-[10px] text-gray-400 font-medium">({customer.contactPerson})</span>
                          )}
                          {customer.company && !customer.contactPerson && (
                            <span className="text-[10px] text-gray-400 font-medium">({customer.name})</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        customer.status === "Active" ? "bg-emerald-50 text-emerald-600" :
                        customer.status === "Lead" ? "bg-orange-50 text-orange-600" :
                        "bg-gray-150 text-gray-500"
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenCustomerModal(customer)}
                          className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100"
                          title="Bearbeiten"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleCustomerDelete(customer.id)}
                          className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-650 hover:bg-red-100 transition-all border border-red-100/50"
                          title="Löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="py-20 text-center space-y-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
               <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-10 w-10 text-gray-300" />
               </div>
               <p className="text-gray-505 font-medium">Keine Kunden gefunden.</p>
            </div>
          )}
        </div>
      )}

      {/* --- ADD/EDIT CUSTOMER MODAL --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 sm:p-8 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{editingCustomer ? "Kunde bearbeiten" : "Neuer Kunde"}</h2>
                <button onClick={() => setIsCustomerModalOpen(false)} className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-black transition-all">
                   <X className="h-5 w-5" />
                </button>
             </div>
             <form onSubmit={handleCustomerSubmit} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kundenname (Ansprechpartner) *</label>
                       <input 
                        type="text" 
                        required
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        value={customerFormData.name}
                        onChange={(e) => setCustomerFormData({...customerFormData, name: e.target.value})}
                       />
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Firma (Company)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        value={customerFormData.company || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, company: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ansprechpartner (Details)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="z.B. Sarah Schmidt"
                        value={customerFormData.contactPerson || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, contactPerson: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">E-Mail Adresse</label>
                       <input 
                        type="email" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        value={customerFormData.email || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, email: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Telefonnummer</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="+43 664 1234567"
                        value={customerFormData.phone || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, phone: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">UID-Nummer (VAT-ID)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="ATU12345678"
                        value={customerFormData.vatId || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, vatId: e.target.value})}
                       />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Adresse</label>
                       <textarea 
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-medium resize-none"
                        placeholder="Musterstraße 1, 1010 Wien"
                        value={customerFormData.address || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, address: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Zahlungsbedingungen</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="z.B. Zahlbar innerhalb von 14 Tagen"
                        value={customerFormData.paymentTerms || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, paymentTerms: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Notizen</label>
                       <textarea 
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-medium resize-none"
                        placeholder="Zusätzliche Infos..."
                        value={customerFormData.notes || ""}
                        onChange={(e) => setCustomerFormData({...customerFormData, notes: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                       <select 
                         className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold cursor-pointer"
                         value={customerFormData.status}
                         onChange={(e) => setCustomerFormData({...customerFormData, status: e.target.value as any})}
                       >
                         <option value="Active">Active</option>
                         <option value="Lead">Lead</option>
                         <option value="Inactive">Inactive</option>
                       </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4 border-t border-gray-100 font-bold">
                   <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="flex-1 py-3 bg-gray-50 rounded-2xl text-xs text-gray-500 hover:bg-gray-100 transition-all">
                      Abbrechen
                   </button>
                   <button type="submit" className="flex-1 py-3 bg-brand-secondary text-white rounded-2xl text-xs hover:scale-[1.02] shadow-lg shadow-brand-secondary/20 transition-all flex items-center justify-center gap-2">
                      <Save className="h-4 w-4" />
                      {editingCustomer ? "Speichern" : "Erstellen"}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* --- CLIENT DETAILS MODAL --- */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
               <div className="flex items-center gap-4">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedCustomer.color }} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Kunden-Details & Zahlungsstatus</p>
                  </div>
               </div>
               <button onClick={() => setSelectedCustomer(null)} className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-black transition-all">
                  <X className="h-6 w-6" />
               </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
               {/* Extended Info Block */}
               <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-2">
                    <p className="font-black text-[8px] text-gray-400 uppercase tracking-widest mb-1">Stammdaten</p>
                    {selectedCustomer.company && <p className="font-semibold text-gray-700">Firma: <span className="font-bold text-gray-900">{selectedCustomer.company}</span></p>}
                    {selectedCustomer.contactPerson && <p className="font-semibold text-gray-700">Ansprechpartner: <span className="font-bold text-gray-900">{selectedCustomer.contactPerson}</span></p>}
                    {selectedCustomer.vatId && <p className="font-semibold text-gray-700">UID-Nummer: <span className="font-bold text-gray-900">{selectedCustomer.vatId}</span></p>}
                    {selectedCustomer.paymentTerms && <p className="font-semibold text-gray-700">Zahlungsbedingungen: <span className="font-bold text-gray-900">{selectedCustomer.paymentTerms}</span></p>}
                  </div>
                  <div className="space-y-2">
                    <p className="font-black text-[8px] text-gray-400 uppercase tracking-widest mb-1">Adresse & Notizen</p>
                    {selectedCustomer.address ? (
                      <div className="font-semibold text-gray-700">
                        <p className="text-[10px] text-gray-400">Adresse:</p>
                        <p className="font-bold text-gray-900 whitespace-pre-line mt-0.5">{selectedCustomer.address}</p>
                      </div>
                    ) : <p className="text-gray-400 italic">Keine Adresse hinterlegt</p>}
                    {selectedCustomer.notes && (
                      <div className="mt-2 font-semibold text-gray-700">
                        <p className="text-[10px] text-gray-400">Notizen:</p>
                        <p className="font-bold text-gray-900 whitespace-pre-line mt-0.5">{selectedCustomer.notes}</p>
                      </div>
                    )}
                  </div>
               </div>

               {/* Plan Info */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-1">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monatlicher Plan</p>
                     <p className="text-2xl font-bold">{selectedCustomer.socialPlan?.price || 0}€</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-1">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Posts / Woche</p>
                     <p className="text-2xl font-bold">{selectedCustomer.socialPlan?.weeklyPosts || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-1">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Schnittstelle</p>
                     <p className="text-sm font-bold text-gray-700 mt-1">
                        {teamMembers.find(m => m.id === selectedCustomer.assignedEmployeeId)?.fullName || "Kein Mitarbeiter zugewiesen"}
                     </p>
                  </div>
               </div>

               {/* 12 Month Payment View */}
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold uppercase tracking-widest">Zahlungsübersicht (12 Monate)</h3>
                     {!canEditPayments && (
                        <span className="text-[10px] bg-red-50 text-red-500 px-3 py-1 rounded-full font-bold uppercase">Nur Lesezugriff</span>
                     )}
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                     {Array.from({ length: 12 }).map((_, i) => {
                       const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
                       const monthKey = `2024-${String(i + 1).padStart(2, '0')}`;
                       const payment = selectedCustomer.payments?.find(p => p.month === monthKey);
                       const status = payment?.status || (i < 4 ? "UNPAID" : "FUTURE");

                       const getStatusStyles = (s: string) => {
                         switch(s) {
                           case "PAID": return "bg-emerald-500 text-white border-emerald-500";
                           case "UNPAID": return "bg-red-500 text-white border-red-500";
                           case "PENDING": return "bg-orange-400 text-white border-orange-400";
                           default: return "bg-gray-50 text-gray-300 border-gray-100";
                         }
                       };

                       return (
                         <button 
                           key={i}
                           disabled={!canEditPayments}
                           onClick={() => {
                             const currentPayments = selectedCustomer.payments || [];
                             const nextStatus = status === "PAID" ? "UNPAID" : status === "UNPAID" ? "PENDING" : "PAID";
                             const newPayments = currentPayments.filter(p => p.month !== monthKey);
                             newPayments.push({ month: monthKey, status: nextStatus as any });
                             updateCustomer(selectedCustomer.id, { payments: newPayments });
                             setSelectedCustomer({ ...selectedCustomer, payments: newPayments });
                             toast.success(`${monthNames[i]} Status aktualisiert`);
                           }}
                           className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${getStatusStyles(status)} ${canEditPayments ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}`}
                         >
                           <span className="text-[10px] font-bold uppercase">{monthNames[i]}</span>
                           <div className={`h-1.5 w-1.5 rounded-full ${status === 'FUTURE' ? 'bg-gray-250' : 'bg-white'}`} />
                         </button>
                       );
                     })}
                  </div>
                  <div className="flex gap-4 text-[9px] font-bold uppercase text-gray-400">
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Bezahlt</div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /> Offen</div>
                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-orange-400" /> In Klärung</div>
                  </div>
               </div>
            </div>
            
            <div className="p-8 bg-gray-50/50 flex gap-4">
               <button 
                 onClick={() => { handleOpenCustomerModal(selectedCustomer); setSelectedCustomer(null); }}
                 className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-655 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
               >
                 <Edit className="h-4 w-4" /> Bearbeiten
               </button>
               <button 
                 onClick={() => setSelectedCustomer(null)}
                 className="flex-1 py-4 bg-black text-white rounded-2xl text-xs font-bold hover:bg-gray-800 transition-all"
               >
                 Schließen
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- KANBAN PROJECT EDIT / DETAILS DIALOG --- */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] my-10 relative flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {selectedProject ? `${selectedProject.name}` : "Neues Projekt"}
                </h2>
                {selectedProject && (
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {selectedProject.internalCode || selectedProject.id} &bull; {selectedProject.customerName}
                  </span>
                )}
              </div>
              <button 
                onClick={() => { setIsProjectModalOpen(false); setSelectedProject(null); }} 
                className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-black transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs if editing existing project */}
            {selectedProject && (
              <div className="bg-gray-50/50 px-6 border-b border-gray-100 flex gap-2 overflow-x-auto">
                {[
                  { id: "details", label: "Stammdaten", icon: Layers },
                  { id: "tasks", label: "Aufgaben (Tasks)", icon: CheckSquare },
                  { id: "finances", label: "Finanzen & Profit", icon: DollarSign },
                  { id: "team", label: "Teammitglieder", icon: Users }
                ].map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setProjectModalTab(tab.id as any)}
                      className={`flex items-center gap-2 py-3.5 px-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                        projectModalTab === tab.id 
                          ? "border-black text-black" 
                          : "border-transparent text-gray-400 hover:text-gray-900"
                      }`}
                    >
                      <TabIcon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content Container */}
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto min-h-[300px]">
              
              {/* TAB: Core details form (creation or editing details) */}
              {(projectModalTab === "details" || !selectedProject) && (
                <form onSubmit={handleSaveOrUpdateProject} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Projektname *</label>
                      <input 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                        value={projectFormData.name}
                        onChange={(e) => setProjectFormData({...projectFormData, name: e.target.value})}
                        placeholder="Z.B. Website Redesign"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kunde *</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
                        value={projectFormData.customerId}
                        onChange={(e) => setProjectFormData({...projectFormData, customerId: e.target.value})}
                        required
                      >
                        <option value="">Kunde wählen...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kategorien (Tippen zum Anpassen)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SYSTEM_CATEGORIES.map(cat => {
                        const isSelected = projectFormData.categories?.includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              const current = projectFormData.categories || [];
                              const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
                              setProjectFormData({
                                ...projectFormData, 
                                categories: next, 
                                category: next[0] || "Design & Grafik"
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                              isSelected 
                                ? "bg-black text-white border-black" 
                                : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Projekt-Code (z.B. PRJ-2026)</label>
                      <input 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                        value={projectFormData.internalCode || ""}
                        onChange={(e) => setProjectFormData({...projectFormData, internalCode: e.target.value})}
                        placeholder="Interne Projekt-ID..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
                        value={projectFormData.status}
                        onChange={(e) => setProjectFormData({...projectFormData, status: e.target.value as ProjectStatus})}
                      >
                        <option value="Draft">Entwurf</option>
                        <option value="Active">Aktiv</option>
                        <option value="Waiting for client">Warten auf Kunden</option>
                        <option value="Finished">Abgeschlossen</option>
                        <option value="Cancelled">Abgebrochen</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Umsatz / Budget (€)</label>
                      <input 
                        type="number"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                        value={projectFormData.revenue || 0}
                        onChange={(e) => setProjectFormData({...projectFormData, revenue: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Startdatum</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        value={projectFormData.startDate || ""}
                        onChange={(e) => setProjectFormData({...projectFormData, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Deadline</label>
                      <input 
                        type="date"
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        value={projectFormData.deadline || ""}
                        onChange={(e) => setProjectFormData({...projectFormData, deadline: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Beschreibung</label>
                    <textarea 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none resize-none h-20"
                      value={projectFormData.description || ""}
                      onChange={(e) => setProjectFormData({...projectFormData, description: e.target.value})}
                      placeholder="Details, Ziele und Umfang des Projekts..."
                    />
                  </div>

                  <div className="pt-4 flex justify-between gap-4 font-bold border-t border-gray-100">
                    {selectedProject && isCEO && (
                      <button 
                        type="button" 
                        onClick={() => handleProjectDelete(selectedProject.id)}
                        className="py-3 px-6 bg-red-50 text-red-500 rounded-2xl text-xs hover:bg-red-100 transition-all flex items-center gap-1.5 border border-red-100"
                      >
                        <Trash2 className="h-4 w-4" /> Projekt löschen
                      </button>
                    )}
                    <div className="flex gap-3 flex-1 justify-end">
                      <button 
                        type="button" 
                        onClick={() => { setIsProjectModalOpen(false); setSelectedProject(null); }} 
                        className="py-3 px-6 bg-gray-50 rounded-2xl text-xs text-gray-500 hover:bg-gray-100 transition-all"
                      >
                        Schließen
                      </button>
                      <button 
                        type="submit" 
                        className="py-3 px-8 bg-black text-white rounded-2xl text-xs hover:scale-[1.02] shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Speichern
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* TAB: Tasks management */}
              {selectedProject && projectModalTab === "tasks" && (
                <div className="space-y-6">
                  {/* Task creation form */}
                  <form onSubmit={handleAddTask} className="bg-gray-50/50 p-4 border border-gray-100 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-gray-400" />
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Neue Projektaufgabe erstellen</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Titel *</label>
                        <input 
                          type="text"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold outline-none"
                          placeholder="z.B. Feedback einarbeiten"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Zuständig</label>
                        <select 
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold outline-none cursor-pointer"
                          value={newTaskWorkerId}
                          onChange={(e) => setNewTaskWorkerId(e.target.value)}
                        >
                          <option value="">Zuweisen...</option>
                          {teamMembers.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Stundenschätzung</label>
                        <input 
                          type="number"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold outline-none"
                          value={newTaskEstHours || ""}
                          onChange={(e) => setNewTaskEstHours(Number(e.target.value))}
                          placeholder="Std..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Fällig am</label>
                        <input 
                          type="date"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-bold outline-none cursor-pointer"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <button 
                      type="submit" 
                      className="w-full py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Aufgabe erstellen
                    </button>
                  </form>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Bestehende Aufgaben ({projectTasks.filter(t => t.projectId === selectedProject.id).length})</h4>
                    <div className="divide-y divide-gray-50 border border-gray-150 rounded-2xl overflow-hidden bg-white">
                      {projectTasks.filter(t => t.projectId === selectedProject.id).map(task => {
                        const isTaskOverdue = task.dueDate && task.status !== "Done" && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));
                        const worker = teamMembers.find(m => task.assignedMemberIds.includes(m.id));

                        return (
                          <div key={task.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button 
                                type="button"
                                onClick={() => toggleTaskStatus(task)}
                                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  task.status === "Done" ? "bg-emerald-500 border-emerald-500 text-white" :
                                  task.status === "In progress" ? "bg-blue-500 border-blue-500 text-white" :
                                  task.status === "Waiting" ? "bg-orange-400 border-orange-400 text-white" :
                                  "border-gray-300 hover:border-black"
                                }`}
                              >
                                {task.status === "Done" && <CheckCircle2 className="h-3.5 w-3.5" />}
                                {task.status === "In progress" && <Clock className="h-3.5 w-3.5" />}
                                {task.status === "Waiting" && <AlertCircle className="h-3.5 w-3.5" />}
                              </button>
                              
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold text-gray-900 ${task.status === "Done" ? "line-through text-gray-400" : ""}`}>
                                  {task.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-bold text-gray-400">
                                  <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    task.status === "Done" ? "bg-emerald-50 text-emerald-600" :
                                    task.status === "In progress" ? "bg-blue-50 text-blue-600" :
                                    task.status === "Waiting" ? "bg-orange-50 text-orange-600" :
                                    "bg-gray-50 text-gray-500"
                                  }`}>
                                    {task.status}
                                  </span>
                                  {task.estimatedHours > 0 && (
                                    <span>&bull; {task.estimatedHours} Std. geschätzt</span>
                                  )}
                                  {task.dueDate && (
                                    <span className={isTaskOverdue ? "text-red-500 font-extrabold" : ""}>
                                      &bull; Fällig am {task.dueDate} {isTaskOverdue && "(Fällig)"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {worker && (
                                <div className="flex items-center gap-1.5">
                                  <span className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: worker.colorTag }}>
                                    {worker.fullName.split(" ").map(n => n[0]).join("")}
                                  </span>
                                  <span className="text-[10px] font-semibold text-gray-655 hidden sm:inline">{worker.fullName}</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleTaskDelete(task.id)}
                                className="p-1.5 hover:bg-red-50 text-gray-450 hover:text-red-600 border border-transparent hover:border-red-150 rounded-lg transition-all"
                                title="Aufgabe löschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {projectTasks.filter(t => t.projectId === selectedProject.id).length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-xs font-semibold">Keine Aufgaben für dieses Projekt vorhanden.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Finances breakdown */}
              {selectedProject && projectModalTab === "finances" && (
                <div className="space-y-6">
                  
                  {/* Financial Stats Summary */}
                  {(() => {
                    const stats = calculateProjectQuickStats(selectedProject, projectTasks, timeAllocations, teamMembers, freelancerWorkLogs);
                    const totalLaborCost = timeAllocations
                      .filter(a => a.projectId === selectedProject.id)
                      .reduce((sum, a) => {
                        const m = teamMembers.find(member => member.id === a.workerId);
                        const cost = (m?.hourlyCost || 20) * (m?.costMultiplier || 1);
                        return sum + a.hours * cost;
                      }, 0);
                    const totalFreelancerCost = freelancerWorkLogs
                      .filter(l => l.projectId === selectedProject.id)
                      .reduce((sum, l) => sum + (l.totalCost || 0), 0);
                    
                    const totalCost = totalLaborCost + totalFreelancerCost;
                    const margin = selectedProject.revenue > 0 ? (stats.profit / selectedProject.revenue) * 100 : 0;

                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projektbudget (Einnahme)</span>
                            <span className="text-2xl font-black text-gray-900 mt-2">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(selectedProject.revenue)}
                            </span>
                          </div>
                          <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gesamtkosten (Ausgaben)</span>
                            <span className="text-2xl font-black text-red-500 mt-2">
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(totalCost)}
                            </span>
                          </div>
                          <div className={`p-5 rounded-2xl border flex flex-col justify-between ${stats.profit >= 0 ? 'bg-emerald-50/20 border-emerald-100 text-emerald-800' : 'bg-red-50/20 border-red-100 text-red-800'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Netto Profit (Gewinn)</span>
                            <div className="flex items-baseline gap-2 mt-2">
                              <span className="text-2xl font-black">
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(stats.profit)}
                              </span>
                              <span className="text-xs font-black">({margin.toFixed(0)}%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Labor Breakdown */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Erfasste Stunden & Personalkosten</h4>
                          <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-150">
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase">Mitarbeiter</th>
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase text-center">Stunden</th>
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase text-right">Kostensatz / Std</th>
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase text-right">Gesamtkosten</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 font-bold">
                                {(() => {
                                  const allocations = timeAllocations.filter(a => a.projectId === selectedProject.id);
                                  const grouped: Record<string, { hours: number; rate: number; name: string }> = {};
                                  
                                  allocations.forEach(a => {
                                    if (!grouped[a.workerId]) {
                                      const m = teamMembers.find(member => member.id === a.workerId);
                                      grouped[a.workerId] = {
                                        hours: 0,
                                        rate: (m?.hourlyCost || 20) * (m?.costMultiplier || 1),
                                        name: m?.fullName || "Unbekannt"
                                      };
                                    }
                                    grouped[a.workerId].hours += a.hours;
                                  });

                                  const rows = Object.values(grouped);
                                  if (rows.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={4} className="p-6 text-center text-gray-400 font-semibold">Bisher keine Stunden auf dieses Projekt erfasst.</td>
                                      </tr>
                                    );
                                  }

                                  return rows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/30">
                                      <td className="p-3 text-gray-900">{row.name}</td>
                                      <td className="p-3 text-center text-gray-655">{row.hours.toFixed(1)}h</td>
                                      <td className="p-3 text-right text-gray-500">{row.rate} €</td>
                                      <td className="p-3 text-right text-gray-900">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(row.hours * row.rate)}</td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Freelancer Breakdown */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Freelancer Dienstleistungskosten</h4>
                          <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-150">
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase">Freelancer / Typ</th>
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase">Beschreibung</th>
                                  <th className="p-3 text-[9px] font-black text-gray-400 uppercase text-right">Kosten</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 font-bold">
                                {(() => {
                                  const logs = freelancerWorkLogs.filter(l => l.projectId === selectedProject.id);
                                  if (logs.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={3} className="p-6 text-center text-gray-400 font-semibold">Keine Freelancer-Kosten auf dieses Projekt gebucht.</td>
                                      </tr>
                                    );
                                  }

                                  return logs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/30">
                                      <td className="p-3 text-gray-900">
                                        <div className="flex flex-col">
                                          <span>Dienstleister</span>
                                          <span className="text-[8px] uppercase tracking-wider text-gray-400 font-black mt-0.5">{log.type}</span>
                                        </div>
                                      </td>
                                      <td className="p-3 text-gray-500 truncate max-w-[200px]">{log.description || "Dienstleistungspauschale"}</td>
                                      <td className="p-3 text-right text-gray-900">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(log.totalCost || 0)}</td>
                                    </tr>
                                  ));
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB: Team Members involved */}
              {selectedProject && projectModalTab === "team" && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Involvierte Teammitglieder</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      // Gather all members who either have tasks assigned or logged hours
                      const pTasks = projectTasks.filter(t => t.projectId === selectedProject.id);
                      const pAllocations = timeAllocations.filter(a => a.projectId === selectedProject.id);
                      
                      const involvedMemberIds = new Set<string>();
                      pTasks.forEach(t => t.assignedMemberIds.forEach(id => involvedMemberIds.add(id)));
                      pAllocations.forEach(a => involvedMemberIds.add(a.workerId));

                      const projectMembers = teamMembers.filter(m => involvedMemberIds.has(m.id));

                      if (projectMembers.length === 0) {
                        return (
                          <div className="col-span-2 py-12 text-center text-gray-400 text-xs font-semibold bg-gray-50/50 rounded-2xl border border-gray-150">
                            Keine Teammitglieder zugewiesen oder Stunden erfasst.
                          </div>
                        );
                      }

                      return projectMembers.map(member => {
                        const totalHours = pAllocations
                          .filter(a => a.workerId === member.id)
                          .reduce((sum, a) => sum + a.hours, 0);

                        const taskCount = pTasks.filter(t => t.assignedMemberIds.includes(member.id)).length;

                        return (
                          <div key={member.id} className="p-4 bg-gray-50/30 border border-gray-100 rounded-2xl flex items-center gap-3">
                            <span 
                              className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-sm"
                              style={{ backgroundColor: member.colorTag }}
                            >
                              {member.fullName.split(" ").map(n => n[0]).join("")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-gray-900 truncate">{member.fullName}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{member.role}</p>
                              
                              <div className="flex gap-3 text-[9px] font-bold text-gray-450 mt-2">
                                <span>{totalHours.toFixed(1)} Std. erfasst</span>
                                <span>&bull;</span>
                                <span>{taskCount} Tasks zugewiesen</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- PROJECT METRIC CALCULATION FUNCTION ---
function calculateProjectQuickStats(
  project: Project, 
  tasks: any[], 
  allocations: any[], 
  teamMembers: any[], 
  freelancerWorkLogs: any[]
) {
  const projectAllocations = allocations.filter(a => a.projectId === project.id);
  const totalHours = projectAllocations.reduce((sum, a) => sum + a.hours, 0);
  
  let laborCost = 0;
  const involvedMemberIds = new Set<string>();

  projectAllocations.forEach(a => {
    const member = teamMembers.find(m => m.id === a.workerId);
    involvedMemberIds.add(a.workerId);
    const hourlyCost = (member?.hourlyCost || 20) * (member?.costMultiplier || 1);
    laborCost += a.hours * hourlyCost;
  });
  
  const projectFreelancerLogs = freelancerWorkLogs.filter(l => l.projectId === project.id);
  const freelancerCost = projectFreelancerLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);

  const involvedMembers = teamMembers.filter(m => involvedMemberIds.has(m.id));

  return {
    totalHours,
    profit: project.revenue - laborCost - freelancerCost,
    involvedMembers
  };
}
