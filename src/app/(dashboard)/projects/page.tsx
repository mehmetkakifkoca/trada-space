"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore, Project, ProjectStatus, ProjectCategory, SYSTEM_CATEGORIES } from "@/store/data-store";
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  ChevronRight,
  Clock,
  Euro,
  Users,
  Target,
  Briefcase,
  X,
  Edit,
  Trash2,
  Save,
  Building2,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const { 
    projects, addProject, updateProject, deleteProject, customers, teamMembers,
    projectTasks, timeAllocations, freelancerWorkLogs
  } = useDataStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";
  const isCEO = isSuperAdmin || ["ceo", "co founder", "admin", "manager"].includes(user?.role?.toLowerCase() || "");

  const [formData, setFormData] = useState<Partial<Project>>({
    name: "",
    customerId: "",
    category: "Design",
    categories: ["Design"],
    status: "Active",
    revenue: 0,
    startDate: new Date().toISOString().split('T')[0],
    deadline: "",
    description: "",
    internalCode: ""
  });

  const displayProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.internalCode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      
      // If employee has explicit 'proj' permission or is CEO, they see all projects.
      // Otherwise, fallback to seeing only projects where they have assigned tasks.
      const hasProjPermission = user?.customPermissions?.includes("proj");
      const isAssigned = isCEO || hasProjPermission || projectTasks.some(t => t.projectId === p.id && t.assignedMemberIds.includes(user?.id || ""));
      
      return matchesSearch && matchesStatus && isAssigned;
    });
  }, [projects, searchTerm, statusFilter, isCEO, projectTasks, user]);

  const handleSaveProject = () => {
    if (!formData.name || !formData.customerId) {
      toast.error("Projektname und Kunde sind erforderlich.");
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);
    
    const newProject: Project = {
      ...formData as Project,
      id: "PRJ-" + Math.floor(1000 + Math.random() * 9000),
      customerName: customer?.name || "Unbekannter Kunde",
      createdAt: Date.now()
    };

    addProject(newProject);
    toast.success("Projekt erfolgreich erstellt.");
    setIsModalOpen(false);
    setFormData({
      name: "",
      customerId: "",
      category: "Design",
      categories: ["Design"],
      status: "Active",
      revenue: 0,
      startDate: new Date().toISOString().split('T')[0],
      deadline: "",
      description: "",
      internalCode: ""
    });
  };

  // Edit mode
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setFormData({
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
    setIsModalOpen(true);
  };

  const handleSaveOrUpdate = () => {
    if (!formData.name || !formData.customerId) {
      toast.error("Projektname und Kunde sind erforderlich.");
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);

    if (editingProjectId) {
      // Update existing
      updateProject(editingProjectId, {
        ...formData,
        customerName: customer?.name || "Unbekannter Kunde"
      });
      toast.success("Projekt erfolgreich aktualisiert.");
    } else {
      // Create new
      const newProject: Project = {
        ...formData as Project,
        id: "PRJ-" + Math.floor(1000 + Math.random() * 9000),
        customerName: customer?.name || "Unbekannter Kunde",
        createdAt: Date.now()
      };
      addProject(newProject);
      toast.success("Projekt erfolgreich erstellt.");
    }

    setIsModalOpen(false);
    setEditingProjectId(null);
    setFormData({
      name: "",
      customerId: "",
      category: "Design",
      categories: ["Design"],
      status: "Active",
      revenue: 0,
      startDate: new Date().toISOString().split('T')[0],
      deadline: "",
      description: "",
      internalCode: ""
    });
  };

  const handleDeleteProject = (id: string) => {
    if (confirm("Dieses Projekt wirklich löschen?")) {
      deleteProject(id);
      toast.success("Projekt gelöscht.");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const statusLabel: Record<ProjectStatus, string> = {
    Draft: "Entwurf",
    Active: "Aktiv",
    "Waiting for client": "Wartend",
    Finished: "Abgeschlossen",
    Cancelled: "Abgebrochen"
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projekte</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Verwalten Sie Ihre Kundenprojekte und Rentabilität.</p>
        </div>
        {isCEO && (
          <button 
            onClick={() => {
              setEditingProjectId(null);
              setFormData({
                name: "",
                customerId: "",
                category: "Design",
                categories: ["Design"],
                status: "Active",
                revenue: 0,
                startDate: new Date().toISOString().split('T')[0],
                deadline: "",
                description: "",
                internalCode: ""
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:scale-[1.02] transition-all shadow-md"
          >
            <Plus className="h-4 w-4" /> Neues Projekt
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Projekte suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black/10 shadow-sm"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black/10 shadow-sm appearance-none cursor-pointer"
        >
          <option value="All">Alle Status</option>
          <option value="Draft">Entwurf</option>
          <option value="Active">Aktiv</option>
          <option value="Waiting for client">Warten auf Kunden</option>
          <option value="Finished">Abgeschlossen</option>
          <option value="Cancelled">Abgebrochen</option>
        </select>
      </div>

      {/* Project List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Projekt</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Kunde</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Kategorie</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Umsatz</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Profit</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Stunden</th>
                <th className="px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayProjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-gray-400 font-medium text-sm">
                    Keine Projekte gefunden.
                  </td>
                </tr>
              ) : (
                displayProjects.map((project) => {
                  const stats = calculateProjectQuickStats(project, projectTasks, timeAllocations, teamMembers, freelancerWorkLogs);
                  return (
                    <tr key={project.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{project.name}</p>
                        {project.internalCode && (
                          <p className="text-[9px] text-gray-400 font-medium mt-0.5">{project.internalCode}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-gray-600 truncate max-w-[150px]">{project.customerName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[9px] font-bold text-brand-secondary uppercase tracking-wider">
                          {project.categories?.join(", ") || project.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs font-bold text-gray-900">{formatCurrency(project.revenue)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-xs font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatCurrency(stats.profit)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs font-bold text-gray-500">{stats.totalHours.toFixed(1)}h</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/projects/${project.id}`}
                            className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100"
                            title="Details"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                          {isCEO && (
                            <>
                              <button
                                onClick={() => handleEditProject(project)}
                                className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100"
                                title="Bearbeiten"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="p-1.5 bg-red-50 rounded-lg text-red-400 hover:text-red-650 hover:bg-red-100 transition-all border border-red-100/50"
                                title="Löschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-y-auto max-h-[90vh] my-10 relative animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{editingProjectId ? "Projekt bearbeiten" : "Neues Projekt"}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingProjectId(null); }} className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-black transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Projektname</label>
                  <input 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Z.B. Website Redesign"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Kunde</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
                    value={formData.customerId}
                    onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  >
                    <option value="">Kunde wählen...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Kategorien</label>
                <div className="flex flex-wrap gap-1.5">
                  {SYSTEM_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        const current = formData.categories || [];
                        const next = current.includes(cat as any) ? current.filter(c => c !== cat) : [...current, cat as any];
                        setFormData({...formData, categories: next, category: (next[0] || "Design") as any});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        formData.categories?.includes(cat as any) ? "bg-black text-white border-black" : "bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {editingProjectId && (
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none appearance-none cursor-pointer"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value as ProjectStatus})}
                  >
                    <option value="Draft">Entwurf</option>
                    <option value="Active">Aktiv</option>
                    <option value="Waiting for client">Warten auf Kunden</option>
                    <option value="Finished">Abgeschlossen</option>
                    <option value="Cancelled">Abgebrochen</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Budget / Umsatz (€)</label>
                  <input 
                    type="number"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                    value={formData.revenue}
                    onChange={(e) => setFormData({...formData, revenue: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Startdatum</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Deadline</label>
                  <input 
                    type="date"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Projektbeschreibung</label>
                <textarea 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none resize-none h-20"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Details zum Projekt..."
                />
              </div>

              <button 
                onClick={handleSaveOrUpdate}
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingProjectId ? "Projekt Aktualisieren" : "Projekt Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<ProjectStatus, string> = {
    Draft: "bg-gray-100 text-gray-600",
    Active: "bg-emerald-100 text-emerald-600",
    "Waiting for client": "bg-orange-100 text-orange-600",
    Finished: "bg-blue-100 text-blue-600",
    Cancelled: "bg-red-100 text-red-600"
  };

  return (
    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${styles[status]}`}>
      {status}
    </span>
  );
}

function calculateProjectQuickStats(project: Project, tasks: any[], allocations: any[], teamMembers: any[], freelancerWorkLogs: any[]) {
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
