"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { 
  useDataStore, 
  Project, 
  ProjectTask, 
  ProjectExpense, 
  AdminProjectHour, 
  TimeAllocation,
  ProjectStatus,
  SYSTEM_CATEGORIES
} from "@/store/data-store";
import { 
  ChevronLeft, 
  LayoutDashboard, 
  CheckSquare, 
  CreditCard, 
  Users, 
  FileText, 
  TrendingUp,
  Plus,
  Trash2,
  Clock,
  Calendar,
  Euro,
  Tag,
  AlertCircle,
  Save,
  UserPlus,
  ArrowRight,
  TrendingDown,
  Info,
  Building2,
  Briefcase,
  Paperclip
} from "lucide-react";
import { toast } from "sonner";

type TabType = "overview" | "tasks" | "expenses" | "team" | "financials" | "report";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    projects, projectTasks, projectExpenses, adminProjectHours, timeAllocations, teamMembers, customers, freelancerWorkLogs,
    updateProject, deleteProject, addProjectTask, updateProjectTask, deleteProjectTask,
    addProjectExpense, updateProjectExpense, deleteProjectExpense,
    addAdminProjectHour, deleteAdminProjectHour, updateTimeAllocation, deleteTimeAllocation
  } = useDataStore();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const project = useMemo(() => projects.find(p => p.id === params.id), [projects, params.id]);

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";
  const isCEO = isSuperAdmin || ["ceo", "co founder", "admin", "manager"].includes(user?.role?.toLowerCase() || "");

  // Financial Calculations
  const financials = useMemo(() => {
    if (!project) return {
      employeeLaborCost: 0,
      adminLaborCost: 0,
      totalManualExpenses: 0,
      freelancerCost: 0,
      totalCost: 0,
      profit: 0,
      margin: 0,
      totalHours: 0,
      allocationCount: 0,
      expenseCount: 0
    };

    const allocations = timeAllocations.filter(a => a.projectId === project.id);
    const expenses = projectExpenses.filter(e => e.projectId === project.id);
    const adminHours = adminProjectHours.filter(h => h.projectId === project.id);
    const freelancerLogs = freelancerWorkLogs.filter(l => l.projectId === project.id);

    let employeeLaborCost = 0;
    allocations.forEach(a => {
      const member = teamMembers.find(m => m.id === a.workerId);
      const rate = (member?.hourlyCost || 20) * (member?.costMultiplier || 1);
      employeeLaborCost += a.hours * rate;
    });

    const adminLaborCost = adminHours.reduce((sum, h) => sum + (h.hours * h.hourlyCost), 0);
    const totalManualExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const freelancerCost = freelancerLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);
    
    const totalCost = employeeLaborCost + adminLaborCost + totalManualExpenses + freelancerCost;
    const profit = project.revenue - totalCost;
    const margin = project.revenue > 0 ? (profit / project.revenue) * 100 : 0;
    const totalHours = allocations.reduce((sum, a) => sum + a.hours, 0) + adminHours.reduce((sum, h) => sum + h.hours, 0);

    return {
      employeeLaborCost,
      adminLaborCost,
      totalManualExpenses,
      freelancerCost,
      totalCost,
      profit,
      margin,
      totalHours,
      allocationCount: allocations.length,
      expenseCount: expenses.length
    };
  }, [project, timeAllocations, projectExpenses, adminProjectHours, teamMembers, freelancerWorkLogs]);

  if (!project) return <div className="p-20 text-center font-black text-gray-300">Projekt nicht gefunden.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 animate-in fade-in duration-700">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/projects")}
          className="flex items-center gap-2 text-gray-400 hover:text-black font-black uppercase text-[10px] tracking-widest transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Zurück zu allen Projekten
        </button>
        <div className="flex items-center gap-3">
           <select 
            value={project.status}
            onChange={(e) => updateProject(project.id, { status: e.target.value as ProjectStatus })}
            className="bg-white border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm"
           >
              <option value="Draft">Entwurf</option>
              <option value="Active">Aktiv</option>
              <option value="Waiting for client">Warten auf Kunden</option>
              <option value="Finished">Abgeschlossen</option>
              <option value="Cancelled">Abgebrochen</option>
           </select>
           {isCEO && (
             <button 
              onClick={() => { if(confirm("Löschen?")) { deleteProject(project.id); router.push("/projects"); } }}
              className="h-10 w-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
             >
               <Trash2 className="h-4 w-4" />
             </button>
           )}
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white rounded-[48px] border border-gray-100 shadow-sm p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
             {(project.categories || [project.category]).map(cat => (
               <span key={cat} className="px-3 py-1 bg-brand-secondary/10 text-brand-secondary text-[10px] font-black uppercase tracking-widest rounded-full">{cat}</span>
             ))}
             <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">ID: {project.id}</span>
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-[0.9]">{project.name}</h1>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-gray-400">
               <Building2 className="h-4 w-4" />
               <span className="text-sm font-bold">{project.customerName}</span>
             </div>
             <div className="flex items-center gap-2 text-gray-400">
               <Calendar className="h-4 w-4" />
               <span className="text-sm font-bold">{project.startDate} — {project.deadline || 'Offen'}</span>
             </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Projekt Budget</p>
           <h2 className="text-5xl font-black text-gray-900">€{project.revenue.toLocaleString()}</h2>
           <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${financials.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {financials.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-xs font-black uppercase tracking-widest">{financials.margin.toFixed(1)}% Marge</span>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {[
          { id: "overview", label: "Übersicht", icon: LayoutDashboard },
          { id: "tasks", label: "Aufgaben", icon: CheckSquare },
          { id: "team", label: "Team & Zeit", icon: Users },
          { id: "expenses", label: "Ausgaben", icon: CreditCard },
          { id: "financials", label: "Finanzen", icon: TrendingUp },
          { id: "report", label: "Abschlussbericht", icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-3 px-8 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? "bg-black text-white shadow-xl" 
                : "bg-white text-gray-400 hover:text-black border border-gray-100"
            }`}
          >
            <tab.icon className="h-5 w-5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "overview" && <OverviewTab project={project} financials={financials} />}
        {activeTab === "tasks" && <TasksTab project={project} isCEO={isCEO} />}
        {activeTab === "expenses" && <ExpensesTab project={project} isCEO={isCEO} />}
        {activeTab === "team" && <TeamTab project={project} isCEO={isCEO} />}
        {activeTab === "financials" && <FinancialsTab project={project} financials={financials} />}
        {activeTab === "report" && <ReportTab project={project} financials={financials} />}
      </div>
    </div>
  );
}

// --- TAB COMPONENTS ---

function OverviewTab({ project, financials }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-10 space-y-6">
             <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Beschreibung</h3>
             <p className="text-gray-500 font-medium leading-relaxed">{project.description || "Keine Beschreibung hinterlegt."}</p>
             {project.notes && (
               <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl space-y-2">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Interne Notizen</p>
                  <p className="text-sm text-orange-900 font-medium">{project.notes}</p>
               </div>
             )}
          </div>

          <div className="grid grid-cols-2 gap-8">
             <div className="bg-white rounded-[40px] border border-gray-100 p-10 flex flex-col items-center justify-center text-center gap-4">
                <Clock className="h-12 w-12 text-brand-secondary" />
                <div>
                   <h4 className="text-3xl font-black text-gray-900">{financials.totalHours.toFixed(1)}h</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Gesamtzeit</p>
                </div>
             </div>
             <div className="bg-white rounded-[40px] border border-gray-100 p-10 flex flex-col items-center justify-center text-center gap-4">
                <Euro className="h-12 w-12 text-emerald-500" />
                <div>
                   <h4 className="text-3xl font-black text-gray-900">€{financials.totalCost.toLocaleString()}</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Gesamtkosten</p>
                </div>
             </div>
          </div>
       </div>

       <div className="bg-black rounded-[40px] p-10 text-white space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <h3 className="text-xl font-black uppercase tracking-tight relative z-10">Live Financials</h3>
          
          <div className="space-y-6 relative z-10">
             <div className="flex justify-between items-center py-4 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Umsatz</span>
                <span className="text-xl font-black">€{project.revenue.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center py-4 border-b border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Kosten</span>
                <span className="text-xl font-black text-red-400">- €{financials.totalCost.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center pt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Gewinn (Netto)</span>
                <span className={`text-3xl font-black ${financials.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                   €{financials.profit.toLocaleString()}
                </span>
             </div>
          </div>

          <div className="pt-8 space-y-4 relative z-10">
             <div className="flex justify-between items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Profitabilitäts-Check</p>
                <span className="text-sm font-black">{Math.round(financials.margin)}%</span>
             </div>
             <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${financials.margin > 30 ? 'bg-emerald-400' : financials.margin > 0 ? 'bg-orange-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.max(5, Math.min(100, financials.margin))}%` }}
                />
             </div>
             <p className="text-[9px] font-bold text-white/30 italic uppercase">Aktualisiert vor wenigen Sekunden • Echtzeit-Daten</p>
          </div>
       </div>
    </div>
  );
}

function TasksTab({ project, isCEO }: any) {
  const { projectTasks, teamMembers, addProjectTask, updateProjectTask, deleteProjectTask } = useDataStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const tasks = projectTasks.filter(t => t.projectId === project.id);

  const [newTask, setNewTask] = useState<Partial<ProjectTask>>({
    title: "",
    category: "Grafik/Druck",
    status: "Open",
    assignedMemberIds: [],
    estimatedHours: 0,
    dueDate: ""
  });

  const handleCreateTask = () => {
    if (!newTask.title) return;
    addProjectTask({
      ...newTask as ProjectTask,
      id: "TSK-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
      projectId: project.id
    });
    setIsAddModalOpen(false);
    setNewTask({ title: "", category: "Grafik/Druck", status: "Open", assignedMemberIds: [], estimatedHours: 0, dueDate: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h3 className="text-2xl font-black text-gray-900 tracking-tight">Projekt Aufgaben ({tasks.length})</h3>
         {isCEO && (
           <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
           >
             <Plus className="h-4 w-4" /> Aufgabe Erstellen
           </button>
         )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-white rounded-[32px] border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all">
            <div className="flex items-center gap-6 flex-1">
               <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                 task.status === "Done" ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-400"
               }`}>
                 <CheckSquare className="h-6 w-6" />
               </div>
               <div className="space-y-1">
                  <h4 className={`text-lg font-black tracking-tight ${task.status === "Done" ? "line-through text-gray-300" : "text-gray-900"}`}>{task.title}</h4>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{task.category}</span>
                     <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-widest flex items-center gap-1">
                       <Clock className="h-3 w-3" /> {task.estimatedHours}h Est.
                     </span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-8">
               <div className="flex -space-x-2">
                 {task.assignedMemberIds.map(mid => {
                   const m = teamMembers.find(tm => tm.id === mid);
                   return (
                    <div key={mid} title={m?.fullName} className="h-10 w-10 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                      {m?.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{m?.username.charAt(0).toUpperCase()}</div>}
                    </div>
                   );
                 })}
                 {isCEO && (
                   <button className="h-10 w-10 rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-black transition-colors">
                     <UserPlus className="h-4 w-4" />
                   </button>
                 )}
               </div>

               <select 
                value={task.status}
                onChange={(e) => updateProjectTask(task.id, { status: e.target.value as any })}
                className="bg-gray-50 border-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
               >
                  <option value="Open">Offen</option>
                  <option value="In progress">In Arbeit</option>
                  <option value="Waiting">Warten</option>
                  <option value="Done">Erledigt</option>
               </select>

               {isCEO && (
                 <button onClick={() => deleteProjectTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                   <Trash2 className="h-5 w-5" />
                 </button>
               )}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="py-20 text-center space-y-4 bg-gray-50 rounded-[48px] border border-dashed border-gray-200">
             <AlertCircle className="h-12 w-12 text-gray-200 mx-auto" />
             <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Noch keine Aufgaben definiert.</p>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
             <h3 className="text-2xl font-black text-gray-900">Neue Aufgabe</h3>
             <div className="space-y-4">
                <input 
                  placeholder="Aufgabentitel..."
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                />
                <select 
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none appearance-none"
                  value={newTask.category}
                  onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                >
                  {SYSTEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-4">
                   <input 
                    type="number"
                    placeholder="Est. Hours"
                    className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                    value={newTask.estimatedHours}
                    onChange={(e) => setNewTask({...newTask, estimatedHours: Number(e.target.value)})}
                   />
                   <input 
                    type="date"
                    className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                   />
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mitarbeiter Zuweisen</p>
                   <div className="flex flex-wrap gap-2">
                     {teamMembers.map(m => (
                       <button 
                        key={m.id}
                        onClick={() => {
                          const current = newTask.assignedMemberIds || [];
                          const next = current.includes(m.id) ? current.filter(id => id !== m.id) : [...current, m.id];
                          setNewTask({...newTask, assignedMemberIds: next});
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                          newTask.assignedMemberIds?.includes(m.id) ? "bg-black text-white border-black" : "bg-gray-50 text-gray-400 border-gray-100"
                        }`}
                       >
                         {m.fullName}
                       </button>
                     ))}
                   </div>
                </div>
             </div>
             <div className="flex gap-4 pt-4">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 font-black uppercase text-[10px] tracking-widest text-gray-400 hover:text-black">Abbrechen</button>
                <button onClick={handleCreateTask} className="flex-2 py-4 px-10 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Erstellen</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpensesTab({ project, isCEO }: any) {
  const { 
    projectExpenses, 
    addProjectExpense, 
    deleteProjectExpense,
    expenses: generalExpenses,
    updateExpense
  } = useDataStore();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const expenses = projectExpenses.filter(e => e.projectId === project.id);
  const [selectedGeneralId, setSelectedGeneralId] = useState("");

  const [newExpense, setNewExpense] = useState<Partial<ProjectExpense>>({
    title: "",
    category: "Grafik/Druck",
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: "",
    status: "Unpaid",
    receiptUrl: ""
  });

  const mapCategory = (cat: string): ProjectExpense["category"] => {
    // If it's already a valid category from SYSTEM_CATEGORIES, return it
    if (SYSTEM_CATEGORIES.includes(cat as any)) return cat;
    // Map old legacy strings just in case
    switch(cat) {
      case "Marketing": return "Marketing & Ads";
      case "Hardware": return "Hardware & Equipment";
      case "Advertising": return "Marketing & Ads";
      case "Printing": return "Print & Tabela";
      default: return "Sonstiges";
    }
  };

  const handleCreateExpense = () => {
    if (!newExpense.title || !newExpense.amount) return;
    
    addProjectExpense({
      ...newExpense as ProjectExpense,
      id: "EXP-" + Math.random().toString(36).substr(2, 5).toUpperCase(),
      projectId: project.id
    });

    if (selectedGeneralId) {
      updateExpense(selectedGeneralId, {
        projectId: project.id,
        projectName: project.name
      });
      toast.success("Allgemeine Ausgabe erfolgreich verknüpft!");
    }

    setIsAddModalOpen(false);
    setNewExpense({ title: "", category: "Grafik/Druck", amount: 0, date: new Date().toISOString().split('T')[0], status: "Unpaid", receiptUrl: "" });
    setSelectedGeneralId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h3 className="text-2xl font-black text-gray-900 tracking-tight">Manuelle Ausgaben ({expenses.length})</h3>
         {isCEO && (
           <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
           >
             <Plus className="h-4 w-4" /> Ausgabe Hinzufügen
           </button>
         )}
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
           <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                 <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Beschreibung</th>
                 <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kategorie</th>
                 <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Datum</th>
                 <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Betrag</th>
                 {isCEO && <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aktion</th>}
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                   <td className="px-8 py-6 font-black text-gray-900 flex items-center gap-2">
                     <span>{exp.title}</span>
                     {exp.receiptUrl && (
                       <a 
                         href={exp.receiptUrl} 
                         target="_blank" 
                         rel="noreferrer"
                         className="p-1 bg-gray-50 text-gray-400 hover:text-black rounded-lg transition-all border border-gray-100 flex items-center justify-center shrink-0"
                         title="Beleg anzeigen"
                       >
                         <Paperclip className="h-3.5 w-3.5" />
                       </a>
                     )}
                   </td>
                   <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest rounded-full">{exp.category}</span>
                   </td>
                   <td className="px-8 py-6 text-sm font-bold text-gray-400">{exp.date}</td>
                   <td className="px-8 py-6 text-right font-black text-gray-900">€{exp.amount.toLocaleString()}</td>
                   {isCEO && (
                     <td className="px-8 py-6 text-right">
                        <button onClick={() => deleteProjectExpense(exp.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                     </td>
                   )}
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-8 py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">Keine Ausgaben erfasst.</td>
                </tr>
              )}
           </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-6">
              <h3 className="text-2xl font-black text-gray-900">Neue Ausgabe</h3>
              <div className="space-y-4">
                 {/* Existing receipt selector */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Aus bestehenden Belegen / Rechnungen wählen</label>
                    <select 
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none appearance-none font-bold text-gray-800"
                      value={selectedGeneralId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setSelectedGeneralId(selId);
                        if (!selId) return;
                        
                        const selectedGe = generalExpenses.find(g => g.id === selId);
                        if (selectedGe) {
                          setNewExpense({
                            title: selectedGe.title,
                            category: mapCategory(selectedGe.category),
                            amount: selectedGe.amount,
                            date: selectedGe.date,
                            receiptUrl: selectedGe.fileUrl || "",
                            description: `Ausgabe verknüpft mit Beleg: ${selectedGe.title}`,
                            status: selectedGe.status === "Bezahlt" ? "Paid" : "Unpaid"
                          });
                          toast.success("Daten aus allgemeinem Beleg übernommen!");
                        }
                      }}
                    >
                      <option value="">-- Beleg auswählen --</option>
                      {generalExpenses.map(ge => (
                        <option key={ge.id} value={ge.id}>
                          [{ge.date}] {ge.title} - €{ge.amount.toLocaleString()} {ge.fileUrl ? "📎" : ""}
                        </option>
                      ))}
                    </select>
                 </div>

                 <div className="h-px bg-gray-100 my-2" />

                 <input placeholder="Titel der Ausgabe..." className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" value={newExpense.title} onChange={(e)=>setNewExpense({...newExpense, title: e.target.value})} />
                 <select className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none appearance-none" value={newExpense.category} onChange={(e)=>setNewExpense({...newExpense, category: e.target.value as any})}>
                   {SYSTEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <div className="flex gap-4">
                    <input type="number" placeholder="Betrag (€)" className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none font-bold" value={newExpense.amount || ""} onChange={(e)=>setNewExpense({...newExpense, amount: Number(e.target.value) || 0})} />
                    <input type="date" className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none font-bold" value={newExpense.date} onChange={(e)=>setNewExpense({...newExpense, date: e.target.value})} />
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button 
                   onClick={() => {
                     setIsAddModalOpen(false);
                      setNewExpense({ title: "", category: "Grafik/Druck", amount: 0, date: new Date().toISOString().split('T')[0], status: "Unpaid", receiptUrl: "" });
                     setSelectedGeneralId("");
                   }} 
                   className="flex-1 font-black uppercase text-[10px] tracking-widest text-gray-400"
                 >
                   Abbrechen
                 </button>
                 <button onClick={handleCreateExpense} className="flex-2 py-4 px-10 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Speichern</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function TeamTab({ project, isCEO }: any) {
  const { 
    timeAllocations, 
    teamMembers, 
    adminProjectHours, 
    addAdminProjectHour, 
    deleteAdminProjectHour,
    updateTimeAllocation,
    deleteTimeAllocation
  } = useDataStore();
  const allocations = timeAllocations.filter(a => a.projectId === project.id);
  const adminHours = adminProjectHours.filter(h => h.projectId === project.id);
  
  const [isAdminHourModalOpen, setIsAdminHourModalOpen] = useState(false);
  const [newAdminHour, setNewAdminHour] = useState({
    hours: 0,
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  const [editingAllocation, setEditingAllocation] = useState<any>(null);
  const [editHours, setEditHours] = useState(0);

  const memberStats = useMemo(() => {
    const stats: Record<string, { hours: number, cost: number, name: string, avatar?: string }> = {};
    allocations.forEach(a => {
      if (!stats[a.workerId]) {
        const m = teamMembers.find(tm => tm.id === a.workerId);
        stats[a.workerId] = { hours: 0, cost: 0, name: m?.fullName || "Unbekannt", avatar: m?.avatarUrl };
      }
      const member = teamMembers.find(tm => tm.id === a.workerId);
      const rate = (member?.hourlyCost || 20) * (member?.costMultiplier || 1);
      stats[a.workerId].hours += a.hours;
      stats[a.workerId].cost += a.hours * rate;
    });
    return Object.entries(stats).sort((a,b) => b[1].hours - a[1].hours);
  }, [allocations, teamMembers]);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Employee Hours */}
         <div className="bg-white rounded-[40px] border border-gray-100 p-10 space-y-8">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Zeitaufwand pro Mitarbeiter</h3>
            <div className="space-y-6">
               {memberStats.map(([id, s]) => (
                 <div key={id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-gray-50 overflow-hidden border border-gray-100">
                          {s.avatar ? <img src={s.avatar} className="w-full h-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-gray-300"><Users /></div>}
                       </div>
                       <div>
                          <p className="text-sm font-black text-gray-900">{s.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.hours.toFixed(1)} Stunden</p>
                       </div>
                    </div>
                    {isCEO && <p className="text-sm font-black text-gray-900">€{s.cost.toLocaleString()}</p>}
                 </div>
               ))}
               {memberStats.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">Noch keine Stunden erfasst.</p>}
            </div>
         </div>

         {/* Admin/Employer Hours */}
         <div className="bg-white rounded-[40px] border border-gray-100 p-10 space-y-8">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Chef Stunden</h3>
               {isCEO && (
                 <button onClick={()=>setIsAdminHourModalOpen(true)} className="h-10 w-10 bg-black text-white rounded-xl flex items-center justify-center hover:scale-110 transition-all">
                   <Plus className="h-5 w-5" />
                 </button>
               )}
            </div>
            <div className="space-y-6">
               {adminHours.map(h => (
                 <div key={h.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-brand-secondary/5 text-brand-secondary flex items-center justify-center">
                          <UserPlus className="h-6 w-6" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-gray-900">{h.description}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h.hours}h • {h.date}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <p className="text-sm font-black text-gray-900">€{(h.hours * h.hourlyCost).toLocaleString()}</p>
                       <button onClick={()=>deleteAdminProjectHour(h.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
                    </div>
                 </div>
               ))}
               {adminHours.length === 0 && <p className="text-center py-10 text-gray-300 font-bold uppercase tracking-widest text-[10px]">Keine Admin-Stunden erfasst.</p>}
            </div>
         </div>
      </div>

      {/* Detailed Time Logs */}
      <div className="bg-white rounded-[40px] border border-gray-100 p-10 space-y-8 mt-10">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Detaillierte Zeitbuchungen</h3>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="border-b border-gray-50">
                      <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mitarbeiter</th>
                      <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Datum</th>
                      <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notiz</th>
                      <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Stunden</th>
                      {isCEO && <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aktionen</th>}
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                   {allocations.sort((a,b) => b.timestamp - a.timestamp).map(a => {
                      const m = teamMembers.find(tm => tm.id === a.workerId);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                           <td className="py-5 flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-gray-100 overflow-hidden">
                                 {m?.avatarUrl ? <img src={m.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{m?.username.charAt(0).toUpperCase()}</div>}
                              </div>
                              <span className="text-sm font-bold text-gray-900">{m?.fullName}</span>
                           </td>
                           <td className="py-5 text-xs text-gray-500 font-medium">{a.date}</td>
                           <td className="py-5 text-xs text-gray-400 max-w-[200px] truncate" title={a.notes}>{a.notes || "-"}</td>
                           <td className="py-5 text-right font-black text-gray-900 text-sm">{a.hours.toFixed(2)}h</td>
                           {isCEO && (
                             <td className="py-5 text-right">
                                <div className="flex justify-end gap-2">
                                   <button 
                                    onClick={() => { setEditingAllocation(a); setEditHours(a.hours); }}
                                    className="h-8 w-8 rounded-lg bg-gray-50 text-gray-400 hover:bg-black hover:text-white transition-all flex items-center justify-center"
                                   >
                                      <Info className="h-3.5 w-3.5" />
                                   </button>
                                   <button 
                                    onClick={() => { if(confirm("Löschen?")) deleteTimeAllocation(a.id); }}
                                    className="h-8 w-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                   >
                                      <Trash2 className="h-3.5 w-3.5" />
                                   </button>
                                </div>
                             </td>
                           )}
                        </tr>
                      );
                   })}
                   {allocations.length === 0 && (
                     <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">Keine Buchungen gefunden.</td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
      </div>

      {isAdminHourModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 space-y-6">
              <h3 className="text-2xl font-black text-gray-900">Admin Stunden hinzufügen</h3>
              <div className="space-y-4">
                 <input placeholder="Beschreibung..." className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" value={newAdminHour.description} onChange={(e)=>setNewAdminHour({...newAdminHour, description: e.target.value})} />
                 <div className="flex gap-4">
                    <input type="number" placeholder="Stunden" className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" value={newAdminHour.hours} onChange={(e)=>setNewAdminHour({...newAdminHour, hours: Number(e.target.value)})} />
                    <input type="date" className="flex-1 px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none" value={newAdminHour.date} onChange={(e)=>setNewAdminHour({...newAdminHour, date: e.target.value})} />
                 </div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest p-2 bg-gray-50 rounded-xl">Interne Kosten: €50.00 /h (Standard)</p>
              </div>
              <div className="flex gap-4 pt-4">
                 <button onClick={()=>setIsAdminHourModalOpen(false)} className="flex-1 font-black uppercase text-[10px] tracking-widest text-gray-400">Abbrechen</button>
                 <button 
                  onClick={() => {
                    addAdminProjectHour({
                      id: "AH-" + Date.now(),
                      projectId: project.id,
                      ...newAdminHour,
                      hourlyCost: 50 // Fixed admin rate for now
                    });
                    setIsAdminHourModalOpen(false);
                    setNewAdminHour({ hours: 0, description: "", date: new Date().toISOString().split('T')[0] });
                  }}
                  className="flex-2 py-4 px-10 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                 >
                   Speichern
                 </button>
              </div>
           </div>
        </div>
      )}

      {editingAllocation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 space-y-6">
              <h3 className="text-xl font-black text-gray-900">Stunden anpassen</h3>
              <div className="space-y-4">
                 <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{teamMembers.find(m=>m.id===editingAllocation.workerId)?.fullName}</p>
                    <p className="text-xs font-bold text-gray-600">{editingAllocation.date}</p>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Neue Stunden</p>
                    <input 
                      type="number"
                      step="0.5"
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-black"
                      value={editHours}
                      onChange={(e) => setEditHours(Number(e.target.value))}
                    />
                 </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setEditingAllocation(null)} className="flex-1 font-black uppercase text-[10px] tracking-widest text-gray-400">Abbrechen</button>
                 <button 
                  onClick={() => {
                    updateTimeAllocation(editingAllocation.id, { hours: editHours });
                    setEditingAllocation(null);
                    toast.success("Aktualisiert");
                  }}
                  className="flex-2 py-4 px-8 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest"
                 >
                   Speichern
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function FinancialsTab({ project, financials }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="bg-white rounded-[40px] border border-gray-100 p-10 space-y-8">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Kostenstruktur</h3>
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><Users className="h-4 w-4" /></div>
                   <span className="text-sm font-bold text-gray-500">Mitarbeiter Stunden</span>
                </div>
                <span className="font-black text-gray-900">€{financials.employeeLaborCost.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center"><UserPlus className="h-4 w-4" /></div>
                   <span className="text-sm font-bold text-gray-500">Admin Stunden</span>
                </div>
                <span className="font-black text-gray-900">€{financials.adminLaborCost.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center"><CreditCard className="h-4 w-4" /></div>
                   <span className="text-sm font-bold text-gray-500">Material & Spesen</span>
                </div>
                <span className="font-black text-gray-900">€{financials.totalManualExpenses.toLocaleString()}</span>
             </div>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center"><Briefcase className="h-4 w-4" /></div>
                   <span className="text-sm font-bold text-gray-500">Freelancer</span>
                </div>
                <span className="font-black text-gray-900">€{financials.freelancerCost.toLocaleString()}</span>
             </div>
             <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gesamtkosten</span>
                <span className="text-2xl font-black text-gray-900">€{financials.totalCost.toLocaleString()}</span>
             </div>
          </div>
       </div>

       <div className="bg-white rounded-[40px] border border-gray-100 p-10 flex flex-col justify-between gap-10">
          <div className="space-y-4">
             <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Gewinn & Marge</h3>
             <div className="p-8 bg-gray-50 rounded-[32px] text-center space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Netto Ergebnis</p>
                <h4 className={`text-5xl font-black ${financials.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                   {financials.profit >= 0 ? '+' : ''}€{financials.profit.toLocaleString()}
                </h4>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Projekt Marge</p>
                <span className={`text-xl font-black ${financials.margin > 20 ? 'text-emerald-500' : financials.margin > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                  {financials.margin.toFixed(1)}%
                </span>
             </div>
             <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-1 border border-white shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${financials.margin > 20 ? 'bg-emerald-500' : financials.margin > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(5, Math.min(100, financials.margin))}%` }}
                />
             </div>
          </div>
       </div>
    </div>
  );
}

function ReportTab({ project, financials }: any) {
  return (
    <div className="bg-white rounded-[48px] border border-gray-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
       <div className="p-16 space-y-16">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-16">
             <div className="space-y-4">
                <h2 className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.4em]">Abschlussbericht</h2>
                <h1 className="text-6xl font-black text-gray-900 tracking-tight">{project.name}</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{project.customerName} • {project.startDate} — {project.finishedDate || project.deadline}</p>
             </div>
             <div className={`px-10 py-4 rounded-3xl font-black uppercase text-xs tracking-[0.3em] ${financials.profit >= 0 ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-red-500 text-white shadow-red-500/30'} shadow-2xl`}>
                {financials.profit >= 0 ? 'Profitabel' : 'Verlust'}
             </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
             <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Umsatz</p>
                <p className="text-3xl font-black text-gray-900">€{project.revenue.toLocaleString()}</p>
             </div>
             <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kosten</p>
                <p className="text-3xl font-black text-gray-900">€{financials.totalCost.toLocaleString()}</p>
             </div>
             <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Arbeitszeit</p>
                <p className="text-3xl font-black text-gray-900">{financials.totalHours.toFixed(1)}h</p>
             </div>
             <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ergebnis</p>
                <p className={`text-3xl font-black ${financials.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  €{financials.profit.toLocaleString()}
                </p>
             </div>
          </div>

          {/* Detailed Summary */}
          <div className="space-y-10">
             <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight border-b border-gray-100 pb-4">Zusammenfassung</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div className="space-y-6">
                   <p className="text-sm text-gray-500 leading-relaxed">
                      Das Projekt <strong>{project.name}</strong> wurde mit einem Budget von <strong>€{project.revenue.toLocaleString()}</strong> durchgeführt. 
                      Insgesamt wurden <strong>{financials.totalHours.toFixed(1)} Arbeitsstunden</strong> investiert, wobei die Mitarbeiterkosten 
                      sich auf <strong>€{financials.employeeLaborCost.toLocaleString()}</strong> beliefen.
                   </p>
                   <div className="p-8 bg-gray-50 rounded-[32px] space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Wichtigste KPI</h4>
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold">Gewinnmarge</span>
                         <span className={`font-black ${financials.margin > 20 ? 'text-emerald-500' : 'text-orange-500'}`}>{financials.margin.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-sm font-bold">Kostenanteil</span>
                         <span className="font-black text-gray-900">{((financials.totalCost / project.revenue) * 100).toFixed(1)}%</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-6 text-center flex flex-col justify-center items-center">
                   <div className={`h-32 w-32 rounded-full border-8 ${financials.profit >= 0 ? 'border-emerald-100 bg-emerald-50 text-emerald-500' : 'border-red-100 bg-red-50 text-red-500'} flex items-center justify-center`}>
                      {financials.profit >= 0 ? <TrendingUp className="h-16 w-16" /> : <TrendingDown className="h-16 w-16" />}
                   </div>
                   <p className="text-sm font-black uppercase tracking-[0.2em]">Projekt Evaluation</p>
                   <p className="text-gray-400 text-xs font-bold leading-relaxed px-10">
                      {financials.profit > project.revenue * 0.3 
                        ? "Herausragende Performance! Das Projekt war hochgradig profitabel." 
                        : financials.profit > 0 
                          ? "Gutes Ergebnis. Das Projekt war profitabel, lässt aber Raum für Optimierung." 
                          : "Kritisch. Das Projekt hat Verluste generiert. Eine Analyse der Zeitfresser ist notwendig."}
                   </p>
                </div>
             </div>
          </div>

          <div className="pt-10 flex justify-center">
             <button onClick={()=>window.print()} className="px-12 py-5 bg-black text-white rounded-[24px] font-black uppercase text-[10px] tracking-[0.3em] hover:scale-105 transition-all shadow-2xl flex items-center gap-3">
                <FileText className="h-5 w-5" /> Bericht als PDF speichern
             </button>
          </div>
       </div>
    </div>
  );
}
