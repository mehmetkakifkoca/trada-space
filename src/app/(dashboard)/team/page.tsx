"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore, TeamMember } from "@/store/data-store";
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  X,
  Save,
  Lock,
  Edit,
  Trash2,
  UserCircle,
  Clock,
  ShieldCheck,
  Camera,
  Mail,
  User,
  Settings2,
  Palette
} from "lucide-react";
import { toast } from "sonner";

export default function TeamPage() {
  const { user } = useAuthStore();
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, attendanceLogs } = useDataStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Authentication Checks
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin" || user?.username === "trada";
  const isCEO = isSuperAdmin || ["ceo", "co founder", "admin"].includes(user?.role?.toLowerCase() || "");

  const [formData, setFormData] = useState<Partial<TeamMember>>({
    fullName: "",
    username: "",
    password: "",
    role: "Mitarbeiter",
    weeklyTargetHours: 40,
    permissions: ["att"],
    avatarUrl: "",
    colorTag: "#3B82F6",
    hourlyCost: 0,
    costMultiplier: 1.0
  });

  // Filter out the Super Admin from the list to keep it clean, but show everyone else
  const displayMembers = useMemo(() => {
    return teamMembers.filter(m => {
      const isSearchMatch = m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.username.toLowerCase().includes(searchTerm.toLowerCase());
      const isNotSuper = m.role?.toLowerCase() !== "superadmin" && m.username !== "trada";
      return isSearchMatch && isNotSuper;
    });
  }, [teamMembers, searchTerm]);

  const stats = useMemo(() => {
    const total = displayMembers.length;
    const active = displayMembers.filter(member => {
      const userLogs = attendanceLogs.filter(log => log.workerId === member.id || log.workerName.toLowerCase() === member.username.toLowerCase());
      return userLogs[0]?.action === "Clock In";
    }).length;
    const totalHours = displayMembers.reduce((sum, m) => sum + (m.weeklyTargetHours || 40), 0);
    const rolesCount = displayMembers.reduce((acc, m) => {
      const r = m.role || "Mitarbeiter";
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, active, totalHours, rolesCount };
  }, [displayMembers, attendanceLogs]);

  const handleOpenModal = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({ ...member });
    } else {
      setEditingMember(null);
      setFormData({
        fullName: "",
        username: "",
        password: "",
        role: "Mitarbeiter",
        weeklyTargetHours: 40,
        permissions: ["att"],
        avatarUrl: "",
        colorTag: "#" + Math.floor(Math.random()*16777215).toString(16),
        hourlyCost: 0,
        costMultiplier: 1.0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.fullName || !formData.username) {
      toast.error("Name und Benutzername sind erforderlich.");
      return;
    }

    if (editingMember) {
      updateTeamMember(editingMember.id, formData);
      toast.success("Mitarbeiter aktualisiert");
    } else {
      const newMember: TeamMember = {
        ...formData as TeamMember,
        id: "e" + Date.now(),
        permissions: formData.permissions || ["att"]
      };
      addTeamMember(newMember);
      toast.success("Mitarbeiter hinzugefügt");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Möchten Sie diesen Mitarbeiter wirklich löschen?")) {
      deleteTeamMember(id);
      toast.success("Mitarbeiter gelöscht");
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(p => ({ ...p, avatarUrl: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const togglePermission = (perm: string) => {
    const current = formData.permissions || [];
    const next = current.includes(perm) 
      ? current.filter(p => p !== perm) 
      : [...current, perm];
    setFormData({ ...formData, permissions: next });
  };

  // If not CEO/Admin and not editing own profile, show restricted view
  if (!isCEO) {
    const ownProfile = teamMembers.find(m => m.username === user?.username);
    if (!ownProfile) return <div className="p-20 text-center font-bold text-gray-400">Profil nicht gefunden.</div>;

    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-black text-gray-900 mb-10">Mein Profil</h1>
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="h-40 w-40 rounded-[32px] overflow-hidden bg-gray-50 border-4 border-white shadow-lg">
            {ownProfile.avatarUrl ? <img src={ownProfile.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-gray-200" />}
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-black text-gray-900">{ownProfile.fullName}</h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">@{ownProfile.username} • {ownProfile.role}</p>
            <button onClick={() => handleOpenModal(ownProfile)} className="px-8 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Profil bearbeiten</button>
          </div>
        </div>
        {isModalOpen && <EditModal member={editingMember} formData={formData} setFormData={setFormData} onSave={handleSave} onClose={() => setIsModalOpen(false)} isSuper={false} />}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Mitarbeiter Management</h1>
          <p className="text-gray-400 font-medium mt-1">Verwalten Sie Ihr Team, Rollen und Berechtigungen.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-3 bg-brand-secondary text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-brand-secondary/20"
        >
          <Plus className="h-5 w-5" /> Mitarbeiter Hinzufügen
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-black transition-colors" />
        <input 
          type="text"
          placeholder="Mitarbeiter suchen (Name, Username...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-16 pr-8 py-5 bg-white border border-gray-100 rounded-[24px] text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 shadow-sm transition-all"
        />
      </div>

      {/* KPI Stats Row for General Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Members */}
        <div className="bg-white p-6 rounded-[32px] border border-gray-100/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block">Gesamtstärke</span>
            <h3 className="text-2xl font-black text-gray-900">{stats.total}</h3>
            <p className="text-[10px] font-bold text-gray-400">Teammitglieder registriert</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
            <UsersIcon className="h-6 w-6" />
          </div>
        </div>

        {/* Currently Clocked In */}
        <div className="bg-white p-6 rounded-[32px] border border-gray-100/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block">Live Aktiv</span>
            <h3 className="text-2xl font-black text-emerald-600 flex items-center gap-2">
              {stats.active}
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            </h3>
            <p className="text-[10px] font-bold text-gray-400">Arbeiten gerade live</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Capacity / Total Weekly Target Hours */}
        <div className="bg-white p-6 rounded-[32px] border border-gray-100/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block">Soll-Kapazität</span>
            <h3 className="text-2xl font-black text-gray-900">{stats.totalHours}h</h3>
            <p className="text-[10px] font-bold text-gray-400">Soll-Wochenstunden gesamt</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Roles Distribution Quick Insights */}
        <div className="bg-white p-6 rounded-[32px] border border-gray-100/80 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] block">Rollenverteilung</span>
            <h3 className="text-sm font-black text-gray-900 truncate max-w-[170px]">
              {Object.entries(stats.rolesCount)
                .slice(0, 2)
                .map(([role, count]) => `${count}x ${role}`)
                .join(", ") || "Keine Rollen"}
            </h3>
            <p className="text-[10px] font-bold text-gray-400">Häufigste Rollen im Team</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Sleek Minimal Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayMembers.map((member) => {
          const userLogs = attendanceLogs.filter(
            log => log.workerId === member.id || log.workerName.toLowerCase() === member.username.toLowerCase()
          );
          const isWorking = userLogs[0]?.action === "Clock In";
          
          return (
            <div 
              key={member.id} 
              className="bg-white rounded-[32px] border border-gray-100/80 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between gap-6 relative group"
            >
              {/* Card Top: Avatar and Identity */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 shadow-inner">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xl font-black text-gray-400 bg-gray-100 uppercase" style={{ color: member.colorTag }}>
                        {member.fullName.charAt(0)}
                      </div>
                    )}
                  </div>
                  {/* Status Indicator */}
                  <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center ${
                    isWorking ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                  }`} title={isWorking ? "Am Arbeiten" : "Offline"} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-black text-gray-900 truncate leading-tight group-hover:text-brand-secondary transition-colors">
                      {member.fullName}
                    </h3>
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest truncate">
                    @{member.username}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                      style={{ 
                        color: member.colorTag || '#3B82F6', 
                        borderColor: `${member.colorTag || '#3B82F6'}20`,
                        backgroundColor: `${member.colorTag || '#3B82F6'}08` 
                      }}
                    >
                      {member.role || "Mitarbeiter"}
                    </span>
                    {isWorking && (
                      <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Divider */}
              <div className="h-px bg-gray-50 w-full" />

              {/* Card Middle: Capacity and Modules */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Wochenstunden</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>{member.weeklyTargetHours || 40} Std / Soll</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Zugriff</span>
                  <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                    <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                    <span>{member.permissions?.length || 0} Module</span>
                  </div>
                </div>
              </div>

              {/* Hourly Cost - Only for CEO/Superadmin to keep it clean but functional */}
              {isSuperAdmin && member.hourlyCost ? (
                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100/50 flex items-center justify-between text-[10px] font-bold text-gray-500">
                  <span className="uppercase tracking-wider">Effektiver Stundensatz:</span>
                  <span className="text-gray-900 font-black text-xs">
                    €{((member.hourlyCost || 0) * (member.costMultiplier || 1)).toFixed(2)} /h
                  </span>
                </div>
              ) : null}

              {/* Action Buttons: Minimal footer actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                <button 
                  onClick={() => handleOpenModal(member)}
                  className="px-4 py-2 bg-gray-50 hover:bg-black hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border border-gray-100"
                >
                  <Edit className="h-3 w-3" /> Bearbeiten
                </button>
                <button 
                  onClick={() => handleDelete(member.id)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 transition-all flex items-center gap-1.5 border border-red-100/50"
                >
                  <Trash2 className="h-3 w-3" /> Löschen
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <EditModal 
          member={editingMember} 
          formData={formData} 
          setFormData={setFormData} 
          onSave={handleSave} 
          onClose={() => setIsModalOpen(false)}
          isSuper={isSuperAdmin}
          handleAvatarUpload={handleAvatarUpload}
          togglePermission={togglePermission}
        />
      )}
    </div>
  );
}

function EditModal({ member, formData, setFormData, onSave, onClose, isSuper, handleAvatarUpload, togglePermission }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 space-y-10 my-10 relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-8 right-8 h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-black transition-all">
          <X className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="h-32 w-32 rounded-[40px] overflow-hidden border-8 border-gray-50 shadow-inner bg-gray-50">
              {formData.avatarUrl ? <img src={formData.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle className="w-full h-full text-gray-200" />}
            </div>
            <label className="absolute bottom-0 right-0 h-10 w-10 bg-brand-secondary text-white rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-all shadow-lg border-4 border-white">
              <Camera className="h-5 w-5" />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
            </label>
            {formData.avatarUrl && (
              <button onClick={() => setFormData({...formData, avatarUrl: ''})} className="absolute -top-2 -right-2 h-8 w-8 bg-white text-red-500 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900">{member ? "Mitarbeiter Bearbeiten" : "Neuer Mitarbeiter"}</h2>
            <p className="text-sm text-gray-400 font-medium">Füllen Sie die untenstehenden Informationen aus.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vollständiger Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input 
                className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5"
                value={formData.fullName || ""}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Benutzername</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input 
                className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5"
                value={formData.username || ""}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rolle</label>
            <select 
              className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5 appearance-none"
              value={formData.role || "Mitarbeiter"}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="CEO">CEO</option>
              <option value="Co Founder">Co Founder</option>
              <option value="Manager">Manager</option>
              <option value="Buchhaltung">Buchhaltung</option>
              <option value="Mitarbeiter">Mitarbeiter</option>
              <option value="Freelancer">Freelancer</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Wochenstunden (Soll)</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
              <input 
                type="number"
                className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5"
                value={formData.weeklyTargetHours || 40}
                onChange={(e) => setFormData({...formData, weeklyTargetHours: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mitarbeiter Farbe</label>
             <div className="relative flex items-center gap-4">
                <Palette className="absolute left-4 h-4 w-4 text-gray-300" />
                <input 
                  type="color"
                  className="w-24 h-12 rounded-xl border-none cursor-pointer bg-transparent ml-10"
                  value={formData.colorTag || "#3B82F6"}
                  onChange={(e) => setFormData({...formData, colorTag: e.target.value})}
                />
                <span className="text-xs font-mono font-bold text-gray-900">{formData.colorTag}</span>
             </div>
          </div>

          {isSuper && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Neues Passwort (Reset)</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                  <input 
                    type="text"
                    placeholder="Passwort eingeben..."
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5"
                    value={formData.password || ""}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Stundenlohn (€)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">€</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5"
                    value={formData.hourlyCost || 0}
                    onChange={(e) => setFormData({...formData, hourlyCost: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kosten-Multiplikator</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">x</span>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="1.3"
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-black/5"
                    value={formData.costMultiplier || 1}
                    onChange={(e) => setFormData({...formData, costMultiplier: Number(e.target.value)})}
                  />
                </div>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider ml-1">Effektive Kosten: €{((formData.hourlyCost || 0) * (formData.costMultiplier || 1)).toFixed(2)} /h</p>
              </div>
            </>
          )}
        </div>

        {isSuper && (
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Berechtigungen (Module)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'acc', label: 'Accounting' },
                { id: 'crm', label: 'CRM / Kunden' },
                { id: 'team', label: 'Team Admin' },
                { id: 'proj', label: 'Projekte' },
                { id: 'att', label: 'Attendance' },
                { id: 'cal', label: 'Kalender' },
                { id: 'free', label: 'Freelancer' }
              ].map(perm => (
                <button
                  key={perm.id}
                  type="button"
                  onClick={() => togglePermission(perm.id)}
                  className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    formData.permissions?.includes(perm.id)
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {perm.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={onSave}
          className="w-full py-5 bg-brand-secondary text-white rounded-[24px] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-brand-secondary/30"
        >
          {member ? "Änderungen Speichern" : "Mitarbeiter Erstellen"}
        </button>
      </div>
    </div>
  );
}
