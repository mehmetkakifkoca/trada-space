"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore, AttendanceLog } from "@/store/data-store";
import { 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowUpRight,
  ArrowDownLeft,
  Play, 
  Square,
  Plus,
  User,
  X,
  Briefcase,
  Save,
  Trash2,
  Edit,
  ExternalLink,
  CheckSquare,
  Square as SquareIcon,
  Zap
} from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const { user } = useAuthStore();
  const { 
    attendanceLogs, 
    addAttendanceLog, 
    updateAttendanceLog,
    deleteAttendanceLog,
    teamMembers, 
    projects, 
    addTimeAllocation,
    timeAllocations
  } = useDataStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);

  // Edit State
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [editForm, setEditForm] = useState({
    time: "",
    date: "",
    status: ""
  });
  const [editAllocations, setEditAllocations] = useState<Record<string, number>>({});

  // Manual Entry States
  const [manualWorkerId, setManualWorkerId] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStart, setManualStart] = useState("09:00");
  const [manualEnd, setManualEnd] = useState("17:00");
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";
  const isCEO = isSuperAdmin || ["ceo", "co founder", "admin", "administrator"].includes(user?.role?.toLowerCase() || "");
  
  const filteredLogs = useMemo(() => {
    return attendanceLogs.filter(log => 
      log.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.date.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [attendanceLogs, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map(l => l.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Sind Sie sicher, dass Sie ${selectedIds.length} Einträge löschen möchten?`)) {
      selectedIds.forEach(id => deleteAttendanceLog(id));
      setSelectedIds([]);
      toast.success("Ausgewählte Einträge gelöscht.");
    }
  };

  const handleBulkStatusUpdate = (status: string) => {
    selectedIds.forEach(id => updateAttendanceLog(id, { status: status as any }));
    setSelectedIds([]);
    toast.success(`Ausgewählte Einträge als "${status}" aktualisiert.`);
  };

  const handleEditClick = (log: AttendanceLog) => {
    setEditingLog(log);
    setEditForm({
      time: log.time,
      date: log.date,
      status: log.status
    });
    
    const existingAllocations = timeAllocations.filter(a => a.workerId === log.workerId && a.date === log.date);
    const allocMap: Record<string, number> = {};
    existingAllocations.forEach(a => {
      allocMap[a.projectId] = (allocMap[a.projectId] || 0) + a.hours;
    });
    setEditAllocations(allocMap);
    
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm("Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?")) {
      deleteAttendanceLog(id);
      toast.success("Eintrag gelöscht.");
      setActiveMenuId(null);
    }
  };

  const handleUpdateLog = () => {
    if (!editingLog) return;
    updateAttendanceLog(editingLog.id, {
      time: editForm.time,
      date: editForm.date,
      status: editForm.status as any
    });
    Object.entries(editAllocations).forEach(([projectId, hours]) => {
      if (hours > 0) {
        addTimeAllocation({
          id: "ta" + Math.random(),
          workerId: editingLog.workerId,
          projectId: projectId,
          date: editForm.date,
          hours: hours,
          timestamp: Date.now(),
          notes: "Über Bearbeitungsbildschirm zugewiesen"
        });
      }
    });
    toast.success("Eintrag aktualisiert.");
    setIsEditModalOpen(false);
  };

  const lastUserLog = attendanceLogs.find(log => log.workerId === user?.id || (user?.id === undefined && log.workerName === user?.username));
  const isClockedIn = lastUserLog?.action === "Clock In";

  const handleClockAction = () => {
    if (!user) return;
    const now = new Date();
    const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const member = teamMembers.find(m => m.username === user.username);
    addAttendanceLog({
      id: "al" + Date.now(),
      workerId: member?.id || "unknown",
      workerName: user.username,
      action: isClockedIn ? "Clock Out" : "Clock In",
      time,
      date,
      timestamp: now.getTime(),
      status: "On Time",
      color: member?.colorTag || "#1f2937"
    });
    toast.success(isClockedIn ? "Ausgestempelt" : "Eingestempelt");
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Zeiterfassung</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3">Team Labor & Presence Tracking</p>
        </div>

        {isCEO && (
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsManualModalOpen(true)}
              className="px-8 py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-2"
             >
               <Plus className="h-5 w-5" /> Zeit erfassen
             </button>
             <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 uppercase tracking-widest">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               {attendanceLogs.filter(l => l.action === "Clock In").length} Aktiv
             </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {isCEO && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Timer className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Durchschnittl. Arbeitszeit</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">8h 42m</h3>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pünktlichkeitsrate</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">92%</h3>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="h-16 w-16 bg-orange-50 rounded-2xl flex items-center justify-center">
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fehlzeiten</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">1</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-[48px] border border-gray-100 shadow-[0_40px_80px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6 flex-1 max-w-xl">
            <button 
              onClick={toggleSelectAll}
              className={`h-12 w-12 rounded-2xl border-2 flex items-center justify-center transition-all ${selectedIds.length === filteredLogs.length && filteredLogs.length > 0 ? 'bg-black border-black text-white' : 'border-gray-100 text-transparent hover:border-gray-300'}`}
            >
              <CheckSquare className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input 
                type="text"
                placeholder="Mitarbeiter oder Datum suchen..."
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-[24px] text-sm font-bold outline-none focus:border-black/5 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-5 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all">
                <Filter className="h-5 w-5" />
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-10 py-6 text-left"></th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mitarbeiter</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Aktion</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Uhrzeit</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Datum</th>
                <th className="px-10 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((log) => {
                  const member = teamMembers.find(m => m.id === log.workerId || m.username === log.workerName);
                  const isSelected = selectedIds.includes(log.id);
                  return (
                    <tr key={log.id} className={`hover:bg-gray-50/30 transition-all group relative ${isSelected ? 'bg-black/[0.02]' : ''}`}>
                      <td className="px-10 py-6">
                        <button 
                          onClick={() => toggleSelect(log.id)}
                          className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-black border-black text-white' : 'border-gray-50 text-transparent group-hover:border-gray-200'}`}
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div 
                            className="h-12 w-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-sm overflow-hidden"
                            style={{ backgroundColor: log.color }}
                          >
                            {member?.avatarUrl ? (
                              <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              log.workerName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-sm font-black text-gray-900 tracking-tight">{log.workerName}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          {log.action === "Clock In" ? (
                            <div className="h-8 w-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 bg-red-50 rounded-xl flex items-center justify-center">
                              <ArrowDownLeft className="h-4 w-4 text-red-500" />
                            </div>
                          )}
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">{log.action === "Clock In" ? "Einstempeln" : "Ausstempeln"}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 font-black text-gray-900 text-sm">{log.time}</td>
                      <td className="px-10 py-6 text-xs text-gray-400 font-bold uppercase tracking-widest">{log.date}</td>
                      <td className="px-10 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] ${
                          log.status === "Late" ? "bg-orange-50 text-orange-600" :
                          log.status === "Early" ? "bg-blue-50 text-blue-600" :
                          log.status === "Manual" ? "bg-purple-50 text-purple-600" :
                          "bg-emerald-50 text-emerald-600"
                        }`}>
                          {log.status === "On Time" ? "Pünktlich" : log.status}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === log.id ? null : log.id)}
                          className="h-10 w-10 flex items-center justify-center text-gray-300 hover:text-black hover:bg-gray-100 rounded-xl transition-all"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {activeMenuId === log.id && (
                          <div className="absolute right-10 top-16 w-56 bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 z-50 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                             <button 
                              onClick={() => handleEditClick(log)}
                              className="w-full px-5 py-3 text-left hover:bg-gray-50 flex items-center gap-3 group transition-all"
                             >
                                <Edit className="h-4 w-4 text-gray-400 group-hover:text-black" />
                                <span className="text-xs font-bold text-gray-600 group-hover:text-black">Bearbeiten & Zuweisen</span>
                             </button>
                             <button 
                              onClick={() => handleDeleteClick(log.id)}
                              className="w-full px-5 py-3 text-left hover:bg-gray-50 flex items-center gap-3 group transition-all text-red-500"
                             >
                                <Trash2 className="h-4 w-4 text-red-400 group-hover:text-red-600" />
                                <span className="text-xs font-bold group-hover:text-red-600">Eintrag löschen</span>
                             </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-black text-white px-10 py-6 rounded-[32px] shadow-2xl flex items-center gap-10 border border-white/10 backdrop-blur-xl">
             <div className="flex items-center gap-4 pr-10 border-r border-white/10">
                <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-sm">
                   {selectedIds.length}
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white/60">Ausgewählter Eintrag</span>
             </div>

             <div className="flex items-center gap-6">
                <button 
                  onClick={() => handleBulkStatusUpdate("On Time")}
                  className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  <CheckCircle2 className="h-4 w-4" /> Als Pünktlich markieren
                </button>
                <button 
                  onClick={() => handleBulkStatusUpdate("Manual")}
                  className="flex items-center gap-2 hover:text-purple-400 transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  <Zap className="h-4 w-4" /> Als Manuell markieren
                </button>
                <div className="h-8 w-[1px] bg-white/10 mx-2" />
                <button 
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  <Trash2 className="h-4 w-4" /> Massenlöschung
                </button>
             </div>

             <button 
               onClick={() => setSelectedIds([])}
               className="h-10 w-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-all ml-4"
             >
               <X className="h-5 w-5" />
             </button>
          </div>
        </div>
      )}

      {/* Edit / Allocation Modal */}
      {isEditModalOpen && editingLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-[56px] shadow-2xl p-12 space-y-10 relative animate-in zoom-in-95 duration-300 my-10">
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-10 right-10 h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-black transition-all"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="space-y-2">
              <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Eintrag bearbeiten</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editingLog.workerName} • {editingLog.action}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Uhrzeit</p>
                  <input 
                    type="time"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[24px] text-sm font-bold outline-none"
                    value={editForm.time}
                    onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Datum</p>
                  <input 
                    type="text"
                    className="w-full px-8 py-5 bg-gray-50 rounded-[24px] text-sm font-bold outline-none"
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</p>
                  <select 
                    className="w-full px-8 py-5 bg-gray-50 rounded-[24px] text-sm font-bold outline-none border-none"
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  >
                    <option value="On Time">Pünktlich</option>
                    <option value="Late">Verspätet</option>
                    <option value="Early">Frühzeitig</option>
                    <option value="Manual">Manuell</option>
                  </select>
               </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-gray-50">
               <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Projektverteilung</h3>
                  <div className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Gesamt zugewiesen: {Object.values(editAllocations).reduce((a, b) => a + b, 0).toFixed(1)}h
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {projects.filter(p => p.status === "Active").map(project => (
                    <div key={project.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group hover:border-black transition-all">
                       <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-brand-secondary uppercase tracking-widest truncate">{project.category}</p>
                          <h4 className="text-sm font-black text-gray-900 truncate">{project.name}</h4>
                       </div>
                       <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            step="0.5"
                            className="w-20 px-3 py-3 bg-white rounded-xl text-sm font-black outline-none border-2 border-transparent focus:border-black transition-all text-center"
                            placeholder="0.0"
                            value={editAllocations[project.id] || ""}
                            onChange={(e) => setEditAllocations({...editAllocations, [project.id]: Number(e.target.value)})}
                          />
                          <span className="text-[10px] font-bold text-gray-300">h</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <button 
              onClick={handleUpdateLog}
              className="w-full py-6 bg-black text-white rounded-[24px] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
            >
              <Save className="h-6 w-6" /> Änderungen speichern
            </button>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 space-y-8 relative animate-in zoom-in-95 duration-300 my-10">
            <button 
              onClick={() => setIsManualModalOpen(false)}
              className="absolute top-8 right-8 h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-black transition-all"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-gray-900">Manuelle Zeiterfassung</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Fügen Sie vergessene oder fehlende Arbeitszeiten manuell hinzu.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mitarbeiter auswählen</p>
                  <select 
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none"
                    value={manualWorkerId}
                    onChange={(e) => setManualWorkerId(e.target.value)}
                  >
                    <option value="">Wähle einen Mitarbeiter...</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Datum</p>
                  <input 
                    type="date"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                  />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Startzeit</p>
                  <input 
                    type="time"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                  />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Endzeit</p>
                  <input 
                    type="time"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                  />
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Projektverteilung (Optional)</h3>
                  <span className="text-[10px] font-bold text-brand-secondary uppercase">Gesamt: {(() => {
                    const s = manualStart.split(':');
                    const e = manualEnd.split(':');
                    const hours = (parseInt(e[0]) + parseInt(e[1])/60) - (parseInt(s[0]) + parseInt(s[1])/60);
                    return isNaN(hours) ? "0.00" : hours.toFixed(2);
                  })()}h</span>
               </div>
               
               <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {projects.filter(p => p.status === "Active").map(project => (
                    <div key={project.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between gap-4">
                       <div className="flex-1">
                          <p className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{project.category}</p>
                          <h4 className="text-sm font-black text-gray-900">{project.name}</h4>
                       </div>
                       <div className="flex items-center gap-4">
                          <input 
                            type="number"
                            step="0.5"
                            placeholder="0.0"
                            className="w-20 text-center py-3 bg-white border border-gray-100 rounded-xl text-sm font-black outline-none"
                            value={manualAllocations[project.id] || ""}
                            onChange={(e) => setManualAllocations({...manualAllocations, [project.id]: Number(e.target.value)})}
                          />
                          <span className="text-[9px] font-bold text-gray-300 uppercase">h</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <button 
              onClick={() => {
                if (!manualWorkerId) return toast.error("Bitte wählen Sie einen Mitarbeiter aus.");
                const worker = teamMembers.find(m => m.id === manualWorkerId);
                if (!worker) return;

                addAttendanceLog({
                  id: "al" + Date.now(),
                  workerId: worker.id,
                  workerName: worker.fullName,
                  action: "Clock In",
                  time: manualStart,
                  date: manualDate,
                  timestamp: new Date(manualDate + "T" + manualStart).getTime(),
                  status: "Manual",
                  color: worker.colorTag
                });

                addAttendanceLog({
                  id: "al" + (Date.now() + 1),
                  workerId: worker.id,
                  workerName: worker.fullName,
                  action: "Clock Out",
                  time: manualEnd,
                  date: manualDate,
                  timestamp: new Date(manualDate + "T" + manualEnd).getTime(),
                  status: "Manual",
                  color: worker.colorTag
                });

                Object.entries(manualAllocations).forEach(([projectId, hours]) => {
                   if (hours > 0) {
                      addTimeAllocation({
                        id: "ta" + Math.random(),
                        workerId: worker.id,
                        projectId: projectId,
                        date: manualDate,
                        hours: hours,
                        timestamp: Date.now(),
                        notes: "Manuelle Erfassung"
                      });
                   }
                });

                toast.success("Arbeitszeit erfolgreich hinzugefügt.");
                setIsManualModalOpen(false);
              }}
              className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3"
            >
              <Save className="h-5 w-5" /> Arbeitszeit speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
