"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore, FreelancerTag, FreelancerWorkLog } from "@/store/data-store";
import { 
  Briefcase, 
  Tags, 
  Clock, 
  Euro, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronLeft,
  ChevronRight,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { de } from "date-fns/locale";

type Tab = "dashboard" | "logs" | "tags";

export default function FreelancersPage() {
  const { user } = useAuthStore();
  const { 
    teamMembers, 
    freelancerTags, 
    freelancerWorkLogs, 
    projects,
    addFreelancerTag,
    deleteFreelancerTag,
    addFreelancerWorkLog,
    updateFreelancerWorkLog,
    deleteFreelancerWorkLog,
    updateFreelancerTag
  } = useDataStore();

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin" || ["ceo", "manager", "admin"].includes(user?.role?.toLowerCase() || "");
  const isFreelancer = user?.role?.toLowerCase() === "freelancer";

  // If Admin, they can select a freelancer to view. Otherwise, strictly themselves.
  const freelancers = teamMembers.filter(m => 
    m.role?.toLowerCase() === "freelancer" || 
    m.permissions?.includes("free") || 
    m.role?.toLowerCase() === "ceo" ||
    m.role?.toLowerCase() === "superadmin"
  );
  const defaultFreelancerId = isFreelancer ? user?.id.replace("demo-", "") : (freelancers[0]?.id || "");
  
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<string>(defaultFreelancerId || "");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const selectedFreelancer = teamMembers.find(m => m.id === selectedFreelancerId);

  // Forms state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagForm, setTagForm] = useState<Partial<FreelancerTag>>({
    name: "",
    hourlyRate: 0,
    color: "#3B82F6"
  });

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<Partial<FreelancerWorkLog>>({
    type: "HOURLY",
    date: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    tagId: "",
    startTime: "09:00",
    endTime: "10:00",
    pauschalAmount: 0,
    description: ""
  });

  // Data Filtering
  const myTags = useMemo(() => freelancerTags.filter(t => 
    t.freelancerId === selectedFreelancerId || 
    t.freelancerId === `demo-${selectedFreelancerId}` ||
    (selectedFreelancerId === "e7" && (t.freelancerId === "demo-admin" || t.freelancerId === "admin"))
  ), [freelancerTags, selectedFreelancerId]);
  
  const myLogs = useMemo(() => {
    let logs = freelancerWorkLogs.filter(l => 
      l.freelancerId === selectedFreelancerId || 
      l.freelancerId === `demo-${selectedFreelancerId}` ||
      // Backward compatibility for Akif's old demo-admin ID
      (selectedFreelancerId === "e7" && (l.freelancerId === "demo-admin" || l.freelancerId === "admin"))
    );
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [freelancerWorkLogs, selectedFreelancerId]);

  const monthLogs = useMemo(() => {
    if (!selectedMonth) return [];
    return myLogs.filter(l => l.date.startsWith(selectedMonth));
  }, [myLogs, selectedMonth]);

  // Dashboard Calculations
  const totalMonthHours = monthLogs.reduce((acc, l) => acc + (l.type === "HOURLY" ? (l.durationHours || 0) : 0), 0);
  const totalMonthEarnings = monthLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);

  const handlePrevMonth = () => {
    if (!selectedMonth) return;
    const date = parseISO(`${selectedMonth}-01`);
    setSelectedMonth(format(subMonths(date, 1), "yyyy-MM"));
  };

  const handleNextMonth = () => {
    if (!selectedMonth) return;
    const date = parseISO(`${selectedMonth}-01`);
    setSelectedMonth(format(addMonths(date, 1), "yyyy-MM"));
  };

  // Handlers
  const handleSaveTag = () => {
    if (!tagForm.name || !tagForm.hourlyRate || !selectedFreelancerId) {
      toast.error("Bitte alle Felder ausfüllen.");
      return;
    }
    const tagData = {
      freelancerId: selectedFreelancerId,
      name: tagForm.name,
      hourlyRate: Number(tagForm.hourlyRate),
      color: tagForm.color || "#3B82F6"
    };

    if (editingTagId) {
      updateFreelancerTag(editingTagId, tagData);
      toast.success("Tag erfolgreich aktualisiert!");
    } else {
      addFreelancerTag({
        id: "ft" + Date.now(),
        ...tagData
      });
      toast.success("Tag erfolgreich hinzugefügt!");
    }
    
    setIsTagModalOpen(false);
  };

  const handleSaveLog = () => {
    if (!logForm.projectId || !logForm.date || !selectedFreelancerId) {
      toast.error("Projektauswahl und Datum sind erforderlich.");
      return;
    }

    let totalCost = 0;
    let durationHours = 0;

    if (logForm.type === "HOURLY") {
      if (!logForm.tagId || !logForm.startTime || !logForm.endTime) {
        toast.error("Für Stundenabrechnung werden Tag und Uhrzeiten benötigt.");
        return;
      }
      const tag = myTags.find(t => t.id === logForm.tagId);
      if (!tag) {
        toast.error("Bitte einen gültigen Tag auswählen.");
        return;
      }

      const [startH, startM] = logForm.startTime.split(":").map(Number);
      const [endH, endM] = logForm.endTime.split(":").map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      let diffMinutes = endMinutes - startMinutes;
      
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Overnight shift
      } else if (diffMinutes === 0) {
        toast.error("Start- und Endzeit können nicht identisch sein.");
        return;
      }
      
      durationHours = diffMinutes / 60;
      totalCost = durationHours * tag.hourlyRate;
    } else {
      if (!logForm.pauschalAmount || logForm.pauschalAmount <= 0) {
        toast.error("Bitte einen gültigen Pauschalbetrag eingeben.");
        return;
      }
      totalCost = Number(logForm.pauschalAmount);
    }

    const newLog: any = {
      id: editingLogId || "fwl" + Date.now(),
      freelancerId: selectedFreelancerId,
      projectId: logForm.projectId,
      date: logForm.date,
      type: logForm.type as "HOURLY" | "PAUSCHAL",
      description: logForm.description || "",
      totalCost,
      ...(logForm.type === "HOURLY" ? {
        startTime: logForm.startTime,
        endTime: logForm.endTime,
        durationHours,
        tagId: logForm.tagId,
        pauschalAmount: null
      } : {
        pauschalAmount: Number(logForm.pauschalAmount),
        startTime: null,
        endTime: null,
        durationHours: null,
        tagId: null
      })
    };

    if (editingLogId) {
      updateFreelancerWorkLog(editingLogId, newLog);
      toast.success("Arbeitseintrag aktualisiert!");
    } else {
      addFreelancerWorkLog(newLog);
      toast.success("Arbeitseintrag gespeichert!");
    }
    
    setIsLogModalOpen(false);
  };

  if (!isSuperAdmin && !isFreelancer) {
    return <div className="p-20 text-center text-gray-500 font-bold">Keine Berechtigung für diesen Bereich.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-6 sm:space-y-10 animate-in fade-in duration-700 px-2 sm:px-0">
      
      {/* Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">Freelancer Hub</h1>
          <p className="text-gray-400 font-medium text-xs sm:text-sm mt-0.5 sm:mt-1">Verwalten Sie Arbeitszeiten, Projekte und Abrechnungen.</p>
        </div>
        
        {isSuperAdmin && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto">
            <span className="text-[10px] font-black text-gray-400 sm:ml-2 uppercase tracking-widest">Ansicht für:</span>
            <select 
              value={selectedFreelancerId}
              onChange={(e) => setSelectedFreelancerId(e.target.value)}
              className="bg-gray-50 border-none rounded-xl px-4 py-2.5 text-xs font-black outline-none w-full sm:w-auto cursor-pointer"
            >
              <option value="" disabled>Freelancer auswählen</option>
              {freelancers.map(f => (
                <option key={f.id} value={f.id}>{f.fullName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedFreelancerId ? (
        <div className="text-center py-20 bg-white rounded-[32px] sm:rounded-[40px] border border-gray-100 shadow-sm">
          <Briefcase className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-base sm:text-xl font-bold text-gray-400">Kein Freelancer ausgewählt oder vorhanden.</h3>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          
          {/* Responsive scrollable tab bar */}
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-full md:w-fit overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: Clock },
              { id: "logs", label: "Einträge", icon: Clock },
              { id: "tags", label: "Tags & Preise", icon: Tags }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all shrink-0 ${
                  activeTab === tab.id 
                    ? "bg-black text-white shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" /> {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 sm:space-y-8">
              
              {/* Responsive touch-friendly Month Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg sm:text-2xl font-black text-gray-900">Monatsübersicht</h2>
                
                <div className="flex items-center justify-between sm:justify-start gap-3 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-full sm:w-auto">
                   <button 
                     onClick={handlePrevMonth} 
                     className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors active:scale-95 touch-manipulation"
                   >
                     <ChevronLeft className="h-5 w-5 text-gray-400" />
                   </button>
                   <span className="font-black text-gray-900 w-full sm:w-32 text-center text-xs uppercase tracking-widest select-none">
                     {selectedMonth ? format(parseISO(`${selectedMonth}-01`), "MMM yyyy", { locale: de }) : "---"}
                   </span>
                   <button 
                     onClick={handleNextMonth} 
                     className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors active:scale-95 touch-manipulation"
                   >
                     <ChevronRight className="h-5 w-5 text-gray-400" />
                   </button>
                </div>
              </div>

              {/* Minimal modern stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-gray-900 to-black rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-[0.03] sm:opacity-[0.07] group-hover:scale-110 transition-transform duration-700">
                    <Clock className="h-24 w-24 sm:h-32 sm:w-32 text-white" />
                  </div>
                  <h3 className="text-gray-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-1.5 sm:mb-2">Geleistete Stunden</h3>
                  <p className="text-4xl sm:text-6xl font-black text-white">{totalMonthHours.toFixed(1)} <span className="text-lg sm:text-xl text-gray-500 font-bold">h</span></p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-md relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-[0.03] sm:opacity-[0.07] group-hover:scale-110 transition-transform duration-700">
                    <Euro className="h-24 w-24 sm:h-32 sm:w-32 text-white" />
                  </div>
                  <h3 className="text-blue-200 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-1.5 sm:mb-2">Umsatz (Brutto)</h3>
                  <p className="text-4xl sm:text-6xl font-black text-white">{totalMonthEarnings.toFixed(2)} <span className="text-lg sm:text-xl text-blue-300 font-bold">€</span></p>
                </div>
              </div>

              {/* Project Distribution */}
              <div className="bg-white rounded-3xl sm:rounded-[40px] p-5 sm:p-8 shadow-sm border border-gray-100">
                <h3 className="text-base sm:text-lg font-black text-gray-900 mb-6">Projektverteilung im {selectedMonth ? format(parseISO(`${selectedMonth}-01`), "MMMM yyyy", { locale: de }) : "ausgewählten Zeitraum"}</h3>
                {monthLogs.length === 0 ? (
                  <p className="text-gray-400 font-medium text-sm">Keine Einträge für diesen Monat vorhanden.</p>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {Object.entries(
                      monthLogs.reduce((acc, log) => {
                        const projName = projects.find(p => p.id === log.projectId)?.name || "Unbekanntes Projekt";
                        if (!acc[projName]) acc[projName] = { hours: 0, earnings: 0 };
                        if (log.type === "HOURLY") acc[projName].hours += (log.durationHours || 0);
                        acc[projName].earnings += log.totalCost;
                        return acc;
                      }, {} as Record<string, { hours: number, earnings: number }>)
                    ).map(([pName, stats]) => (
                      <div key={pName} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-2xl gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4 text-gray-400" />
                          </div>
                          <span className="font-bold text-gray-900 text-sm truncate max-w-[200px] sm:max-w-xs">{pName}</span>
                        </div>
                        <div className="flex justify-between sm:justify-end gap-8 text-right border-t border-gray-100 sm:border-0 pt-2 sm:pt-0">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Stunden</p>
                            <p className="font-black text-gray-900 text-xs sm:text-sm">{stats.hours.toFixed(1)}h</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Umsatz</p>
                            <p className="font-black text-blue-600 text-xs sm:text-sm">€{stats.earnings.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">Arbeitseinträge</h2>
                <button 
                  onClick={() => {
                    setEditingLogId(null);
                    setLogForm({
                      type: "HOURLY",
                      date: format(new Date(), "yyyy-MM-dd"),
                      projectId: projects[0]?.id || "",
                      tagId: myTags[0]?.id || "",
                      startTime: "09:00",
                      endTime: "10:00",
                      pauschalAmount: 0,
                      description: ""
                    });
                    setIsLogModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:scale-102 transition-all shadow-md active:scale-98 shrink-0"
                >
                  <Plus className="h-4 w-4" /> Neuer Eintrag
                </button>
              </div>

              {/* Desktop Table View - Hidden on Mobile */}
              <div className="hidden md:block bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Datum</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Projekt</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Details</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Typ</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Kosten</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">Keine Einträge vorhanden.</td>
                      </tr>
                    ) : (
                      myLogs.map(log => {
                        const proj = projects.find(p => p.id === log.projectId);
                        const tag = myTags.find(t => t.id === log.tagId);
                        return (
                          <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="p-4 font-bold text-gray-900 text-sm whitespace-nowrap">
                              {format(parseISO(log.date), "dd.MM.yyyy")}
                            </td>
                            <td className="p-4 font-bold text-gray-600 text-sm">{proj?.name || "Unbekannt"}</td>
                            <td className="p-4 text-sm text-gray-500 max-w-[300px]">
                              <p className="font-medium line-clamp-2" title={log.description || "-"}>{log.description || "-"}</p>
                              {log.type === "HOURLY" && (
                                <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">
                                  {log.startTime} - {log.endTime} ({log.durationHours?.toFixed(1)}h)
                                </p>
                              )}
                            </td>
                            <td className="p-4">
                              {log.type === "HOURLY" ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                                      style={{ backgroundColor: `${tag?.color || '#eee'}15`, color: tag?.color || '#666', borderColor: `${tag?.color || '#eee'}30` }}>
                                  <Clock className="h-3 w-3" /> {tag?.name || "Ohne Tag"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                                  <Euro className="h-3 w-3" /> Pauschal
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-black text-blue-600 text-right">
                              €{log.totalCost.toFixed(2)}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingLogId(log.id);
                                    setLogForm(log);
                                    setIsLogModalOpen(true);
                                  }}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => deleteFreelancerWorkLog(log.id)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View - Hidden on Desktop */}
              <div className="md:hidden space-y-4">
                {myLogs.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center text-gray-400 font-bold border border-gray-100">
                    Keine Einträge vorhanden.
                  </div>
                ) : (
                  myLogs.map(log => {
                    const proj = projects.find(p => p.id === log.projectId);
                    const tag = myTags.find(t => t.id === log.tagId);
                    return (
                      <div key={log.id} className="bg-white rounded-[24px] p-5 border border-gray-100/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {format(parseISO(log.date), "dd.MM.yyyy")}
                          </span>
                          <span className="text-xs font-black text-gray-900 max-w-[60%] truncate">
                            {proj?.name || "Unbekannt"}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-700 leading-relaxed line-clamp-2" title={log.description || "Keine Beschreibung"}>
                            {log.description || "Keine Beschreibung"}
                          </p>
                          {log.type === "HOURLY" && (
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
                              {log.startTime} - {log.endTime} ({log.durationHours?.toFixed(1)}h)
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                          <div>
                            {log.type === "HOURLY" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
                                    style={{ backgroundColor: `${tag?.color || '#eee'}10`, color: tag?.color || '#666' }}>
                                {tag?.name || "Ohne Tag"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 rounded-full text-[9px] font-bold uppercase tracking-wider border border-green-100">
                                Pauschal
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-black">
                              €{log.totalCost.toFixed(2)}
                            </span>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => {
                                  setEditingLogId(log.id);
                                  setLogForm(log);
                                  setIsLogModalOpen(true);
                                }}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-black transition-colors"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteFreelancerWorkLog(log.id)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: TAGS */}
          {activeTab === "tags" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900">Tags & Preise</h2>
                <button 
                  onClick={() => {
                    setEditingTagId(null);
                    setTagForm({ name: "", hourlyRate: 0, color: "#" + Math.floor(Math.random()*16777215).toString(16) });
                    setIsTagModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-black hover:bg-neutral-900 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:scale-102 transition-all shadow-md active:scale-98 shrink-0"
                >
                  <Plus className="h-4 w-4" /> Tag erstellen
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {myTags.map(tag => (
                  <div key={tag.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: tag.color }} />
                    <div className="absolute top-4 right-4 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setTagForm(tag);
                          setIsTagModalOpen(true);
                        }}
                        className="h-8 w-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-black transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => deleteFreelancerTag(tag.id)}
                        className="h-8 w-8 bg-gray-50 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="h-12 w-12 rounded-xl mb-4 flex items-center justify-center" style={{ backgroundColor: `${tag.color}15`, color: tag.color }}>
                      <Tags className="h-6 w-6" />
                    </div>
                    <h3 className="font-black text-gray-900 text-base sm:text-lg">{tag.name}</h3>
                    <p className="text-gray-400 font-bold mt-1 text-xs sm:text-sm">{tag.hourlyRate.toFixed(2)} € / Stunde</p>
                  </div>
                ))}
                {myTags.length === 0 && (
                  <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-200 rounded-[24px]">
                    <Tags className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-400 font-bold text-xs sm:text-sm">Noch keine Tags erstellt.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE TAG */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] sm:rounded-[32px] shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-6">{editingTagId ? "Tag bearbeiten" : "Neuer Tag"}</h3>
            
            <div className="space-y-4 mb-6 sm:mb-8">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Bezeichnung (z.B. Video Schnitt)</label>
                <input 
                  type="text"
                  value={tagForm.name}
                  onChange={e => setTagForm({...tagForm, name: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                  placeholder="Tag Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Stundenlohn (€)</label>
                  <input 
                    type="number"
                    value={tagForm.hourlyRate || ""}
                    onChange={e => setTagForm({...tagForm, hourlyRate: Number(e.target.value)})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Farbe</label>
                  <input 
                    type="color"
                    value={tagForm.color}
                    onChange={e => setTagForm({...tagForm, color: e.target.value})}
                    className="w-full h-[44px] bg-gray-50 border-none rounded-xl cursor-pointer px-2 py-1 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsTagModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSaveTag}
                className="flex-1 py-3 bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-colors"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE LOG */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[28px] sm:rounded-[32px] shadow-2xl p-6 sm:p-8 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-4 sm:mb-6">{editingLogId ? "Arbeitseintrag bearbeiten" : "Neuer Arbeitseintrag"}</h3>
            
            <div className="space-y-4 mb-6 sm:mb-8">
              {/* Type Toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={() => setLogForm({...logForm, type: "HOURLY"})}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${logForm.type === "HOURLY" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Stundenbasis
                </button>
                <button 
                  onClick={() => setLogForm({...logForm, type: "PAUSCHAL"})}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${logForm.type === "PAUSCHAL" ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                >
                  Pauschal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Datum</label>
                  <input 
                    type="date"
                    value={logForm.date}
                    onChange={e => setLogForm({...logForm, date: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Projekt</label>
                  <select 
                    value={logForm.projectId}
                    onChange={e => setLogForm({...logForm, projectId: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                  >
                    <option value="" disabled>Projekt wählen...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {logForm.type === "HOURLY" ? (
                <>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Leistungs-Tag</label>
                    <select 
                      value={logForm.tagId}
                      onChange={e => setLogForm({...logForm, tagId: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="" disabled>Tag wählen...</option>
                      {myTags.map(t => <option key={t.id} value={t.id}>{t.name} ({t.hourlyRate}€/h)</option>)}
                    </select>
                    {myTags.length === 0 && <p className="text-xs text-red-500 mt-1">Bitte zuerst Tags im "Tags" Tab anlegen!</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Startzeit</label>
                      <input 
                        type="time"
                        value={logForm.startTime}
                        onChange={e => setLogForm({...logForm, startTime: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Endzeit</label>
                      <input 
                        type="time"
                        value={logForm.endTime}
                        onChange={e => setLogForm({...logForm, endTime: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Pauschalbetrag (€)</label>
                  <input 
                    type="number"
                    value={logForm.pauschalAmount || ""}
                    onChange={e => setLogForm({...logForm, pauschalAmount: Number(e.target.value)})}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5"
                    placeholder="z.B. 150"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Beschreibung / Aufgabe</label>
                <textarea 
                  value={logForm.description}
                  onChange={e => setLogForm({...logForm, description: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-black/5 resize-none h-20 sm:h-24"
                  placeholder="Was wurde erledigt?"
                />
              </div>

            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsLogModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSaveLog}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-colors shadow-md"
              >
                Eintrag Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
