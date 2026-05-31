"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore, AttendanceLog } from "@/store/data-store";
import { 
  Play, 
  Square, 
  Clock, 
  Calendar, 
  Layers, 
  Users, 
  Building2, 
  Timer,
  ChevronRight,
  TrendingUp,
  Target,
  X,
  Save,
  Briefcase,
  Activity,
  Circle,
  Check
} from "lucide-react";
import { toast } from "sonner";

function MyCalendarTasks() {
  const { user } = useAuthStore();
  const { todos, updateTodo } = useDataStore();

  const myTasks = useMemo(() => {
    if (!user) return [];
    // Filter todos that belong to this user AND were imported from the calendar
    return todos.filter(t => t.customerId === user.id && t.task.includes("(Kalender:"));
  }, [todos, user]);

  if (myTasks.length === 0) return null;

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 p-8 space-y-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Ihre Kalenderaufgaben</h3>
        <span className="px-3 py-1 bg-brand-secondary text-white text-[9px] font-black uppercase tracking-widest rounded-full">Persönlich</span>
      </div>
      
      <div className="space-y-4">
        {myTasks.map((todo) => (
          <div key={todo.id} className="flex items-center gap-4 group p-2 hover:bg-gray-50 rounded-2xl transition-all">
            <button 
              onClick={() => updateTodo(todo.id, { completed: !todo.completed })}
              className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all ${todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-100 text-transparent hover:border-gray-300'}`}
            >
              <Check className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black ${todo.completed ? 'text-gray-300 line-through' : 'text-gray-900'} truncate`}>
                {todo.task.split("(Kalender:")[0].trim()}
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                {todo.dueDate}
              </p>
            </div>
            {!todo.completed && (
              <div className="h-2 w-2 rounded-full bg-brand-secondary animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingAppointments() {
  const { user } = useAuthStore();
  const { teamMembers, todos, addTodo } = useDataStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const syncEventsToTodos = (fetchedEvents: any[]) => {
    const mappings: Record<string, string> = {
      "MAK": "akif",
      "ND": "nisa",
      "AT": "arda"
    };

    fetchedEvents.forEach(event => {
      const summary = event.summary || "";
      const match = summary.match(/^([A-Z]{2,3})-/);
      
      if (match) {
        const initial = match[1];
        const username = mappings[initial];
        
        if (username) {
          const taskTitle = summary.replace(`${initial}-`, "").trim();
          const member = teamMembers.find(m => m.username === username || m.id === username);
          
          if (member) {
            const exists = todos.some(t => t.task.includes(event.id) || (t.task === taskTitle && t.customerId === member.id));
            if (!exists) {
              addTodo({
                id: "todo-" + event.id,
                customerId: member.id,
                task: `${taskTitle} (Kalender: ${event.id})`,
                completed: false,
                dueDate: event.start?.dateTime || event.start?.date || new Date().toISOString().split('T')[0]
              });
              toast.info(`Aufgabe für ${member.fullName} vom Kalender übertragen.`);
            }
          }
        }
      }
    });
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const saved = localStorage.getItem(`calendar_ids_${user?.username}`);
        let calendarIds = ["primary"];
        if (saved) {
          try {
            calendarIds = JSON.parse(saved);
          } catch (e) {}
        }

        if (calendarIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const allEvents: any[] = [];
        const promises = calendarIds.map(async (id) => {
          const res = await fetch(`/api/calendar/events?calendarId=${encodeURIComponent(id)}&limit=5&userId=${user?.id}`);
          if (res.ok) {
            const data = await res.json();
            return (data.items || []).map((e: any) => ({ ...e, calendarId: id }));
          }
          return [];
        });

        const results = await Promise.all(promises);
        results.forEach(items => allEvents.push(...items));

        const validEvents = allEvents
          .filter((e: any) => e && e.start && (e.start.dateTime || e.start.date))
          .sort((a: any, b: any) => {
            const dateA = new Date(a.start.dateTime || a.start.date || 0).getTime();
            const dateB = new Date(b.start.dateTime || b.start.date || 0).getTime();
            return dateA - dateB;
          });
        
        const futureEvents = validEvents.filter(e => {
          const startTime = new Date(e.start.dateTime || e.start.date || 0).getTime();
          return startTime > Date.now() - 3600000;
        });

        setEvents(futureEvents.slice(0, 3));
        syncEventsToTodos(allEvents);
      } catch (e) {
        console.error("Dashboard Calendar Fetch Error:", e);
      } finally {
        setLoading(false);
      }
    };
    if (user?.username) fetchEvents();
  }, [user?.username, teamMembers, todos]);

  if (loading) return (
    <div className="bg-white rounded-[40px] border border-gray-100 p-8 animate-pulse">
      <div className="h-4 w-32 bg-gray-100 rounded-full mb-8" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl w-full" />)}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-[40px] border border-gray-100 p-8 space-y-8 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Anstehende Termine</h3>
        <span className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-full">Kalender</span>
      </div>
      
      <div className="space-y-4">
        {events.length > 0 ? events.map((event) => {
          const startValue = event.start?.dateTime || event.start?.date;
          if (!startValue) return null;
          const start = new Date(startValue);
          return (
            <div key={event.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.href = '/calendar'}>
              <div className="h-12 w-12 rounded-2xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">{start.toLocaleString('de-DE', { month: 'short' })}</span>
                <span className="text-lg font-black leading-none">{start.getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 truncate group-hover:text-black transition-colors">{event.summary}</p>
                <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-black transition-all" />
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
            <Calendar className="h-8 w-8 text-gray-100" />
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Keine Termine geplant</p>
          </div>
        )}
      </div>

      <Link href="/calendar" className="block w-full py-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center">
        Zum Kalender
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    attendanceLogs = [], 
    teamMembers = [], 
    invoiceSettings,
    projects = [], 
    projectTasks = [], 
    addTimeAllocation, 
    addUnassignedWorkTime,
    addAttendanceLog,
    timeAllocations = [],
    addTodo,
    todos,
    invoices = []
  } = useDataStore();

  // Financial Dashboard Filters State
  const [timeFilter, setTimeFilter] = useState<"ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "CUSTOM">("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const financialData = useMemo(() => {
    const today = new Date();
    
    const parseDateStr = (dateStr: string) => {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date(dateStr);
    };

    const isInRange = (invDateStr: string) => {
      if (!invDateStr) return false;
      const date = parseDateStr(invDateStr);
      if (isNaN(date.getTime())) return false;

      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      endOfToday.setHours(23, 59, 59, 999);

      switch (timeFilter) {
        case "TODAY":
          return date >= startOfToday && date <= endOfToday;
        case "THIS_WEEK": {
          const currentDay = today.getDay();
          const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
          const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + distanceToMonday);
          monday.setHours(0, 0, 0, 0);
          const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
          return date >= monday && date <= sunday;
        }
        case "THIS_MONTH":
          return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
        case "THIS_YEAR":
          return date.getFullYear() === today.getFullYear();
        case "CUSTOM": {
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return date >= start && date <= end;
        }
        default:
          return true;
      }
    };

    const matchesStatus = (status: string) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "OFFEN") return status === "OFFEN";
      if (statusFilter === "BEZAHLT") return status.startsWith("BEZAHLT");
      if (statusFilter === "ENTWURF") return status === "ENTWURF";
      if (statusFilter === "OVERDUE") return status === "OVERDUE";
      if (statusFilter === "BAR") return status === "BEZAHLT_BAR";
      if (statusFilter === "BANK") return status === "BEZAHLT_BANK";
      return true;
    };

    const baseFiltered = invoices.filter(inv => {
      return isInRange(inv.date) && matchesStatus(inv.status);
    });

    let netSum = 0;
    let grossSum = 0;
    const finalFilteredInvoices: any[] = [];

    baseFiltered.forEach(inv => {
      if (categoryFilter === "ALL") {
        netSum += inv.amountNet || 0;
        grossSum += inv.amountGross || 0;
        finalFilteredInvoices.push(inv);
      } else {
        let matchingNet = 0;
        let matchingGross = 0;
        let hasMatchingPosition = false;

        if (inv.positions && inv.positions.length > 0) {
          inv.positions.forEach(pos => {
            if (pos.category === categoryFilter) {
              hasMatchingPosition = true;
              const posNet = (pos.priceNet || 0) * (pos.quantity || 1);
              const discount = pos.discountPercent ? (posNet * pos.discountPercent / 100) : 0;
              const net = posNet - discount;
              const vat = pos.vatRate ? (net * pos.vatRate / 100) : 0;
              const gross = net + vat;
              
              matchingNet += net;
              matchingGross += gross;
            }
          });
        }

        if (hasMatchingPosition) {
          netSum += matchingNet;
          grossSum += matchingGross;
          finalFilteredInvoices.push({
            ...inv,
            amountNet: matchingNet,
            amountGross: matchingGross,
            isCategoryFiltered: true
          });
        } else if (inv.category === categoryFilter) {
          netSum += inv.amountNet || 0;
          grossSum += inv.amountGross || 0;
          finalFilteredInvoices.push(inv);
        }
      }
    });

    return {
      invoices: finalFilteredInvoices,
      totalNet: netSum,
      totalGross: grossSum
    };
  }, [invoices, timeFilter, customStartDate, customEndDate, categoryFilter, statusFilter]);

  const syncEventsToTodos = (fetchedEvents: any[]) => {
    const mappings: Record<string, string> = {
      "MAK": "akif",
      "ND": "nisa",
      "AT": "arda"
    };

    fetchedEvents.forEach(event => {
      const summary = event.summary || "";
      const match = summary.match(/^([A-Z]{2,3})-/);
      
      if (match) {
        const initial = match[1];
        const username = mappings[initial];
        
        if (username) {
          const taskTitle = summary.replace(`${initial}-`, "").trim();
          const member = teamMembers.find(m => m.username === username || m.id === username);
          
          if (member) {
            const exists = todos.some(t => t.task.includes(event.id) || (t.task === taskTitle && t.customerId === member.id));
            if (!exists) {
              addTodo({
                id: "todo-" + event.id,
                customerId: member.id,
                task: `${taskTitle} (Kalender: ${event.id})`,
                completed: false,
                dueDate: event.start?.dateTime || event.start?.date || new Date().toISOString().split('T')[0]
              });
              toast.info(`${member.fullName} Aufgabe übertragen.`);
            }
          }
        }
      }
    });
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [allocationHours, setAllocationHours] = useState<Record<string, number>>({});
  const [allocationNotes, setAllocationNotes] = useState<Record<string, string>>({});

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Data Migration: Ensure Ayhan is worker and Trada is Super Admin in local storage
  useEffect(() => {
    const { teamMembers, updateTeamMember, addTeamMember } = useDataStore.getState();
    
    // 1. Check if Ayhan exists, if not add it, if yes ensure it's a worker
    const ayhan = teamMembers.find(m => m.username === "ayhan");
    if (!ayhan) {
      addTeamMember({
        id: "e6",
        fullName: "Ayhan",
        username: "ayhan",
        password: "ayhan123",
        role: "Mitarbeiter",
        colorTag: "#1F2937",
        skills: ["Marketing"],
        permissions: ["att"]
      });
    } else if (ayhan.role !== "Mitarbeiter") {
      updateTeamMember(ayhan.id, { role: "Mitarbeiter", permissions: ["att"] });
    }

    // 2. Check if Trada Super Admin (e_super) exists, if not add it
    const trada = teamMembers.find(m => m.username === "trada" || m.role === "SUPERADMIN");
    if (!trada) {
      addTeamMember({
        id: "e_super",
        fullName: "Trada Admin",
        username: "trada",
        password: "trada123",
        role: "SUPERADMIN",
        colorTag: "#000000",
        skills: ["System"],
        permissions: ["acc", "crm", "team", "att", "cal", "soc"]
      });
    }
  }, []);

  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";
  const isCEO = isSuperAdmin || ["ceo", "co founder", "admin", "administrator"].includes(user?.role?.toLowerCase() || "");
  const isWorker = user?.role?.toLowerCase() === "mitarbeiter";
  
  // Find current employee data - Case insensitive matching for robustness
  const employeeData = useMemo(() => {
    if (!user) return null;
    const cleanId = user.id.replace("demo-", "");
    return (teamMembers || []).find(m => 
      m.id === cleanId || 
      m.username.toLowerCase() === user.username.toLowerCase()
    );
  }, [teamMembers, user]);

  const userLogs = useMemo(() => {
    if (!user || !attendanceLogs) return [];
    return [...attendanceLogs]
      .filter(log => 
        log.workerId === user.id || 
        (log.workerName && user.username && log.workerName.toLowerCase() === user.username.toLowerCase())
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [attendanceLogs, user]);

  const lastLog = userLogs[0]; // Newest is at index 0
  const isClockedIn = lastLog?.action === "Clock In";

  const weeklyStats = useMemo(() => {
    const targetHours = employeeData?.weeklyTargetHours || 40;
    
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekLogs = userLogs.filter(log => log.timestamp >= startOfWeek.getTime());
    
    let totalMs = 0;
    let clockInTime: number | null = null;

    // Logic for durations: work from newest to oldest logs
    const sortedLogs = [...weekLogs].sort((a, b) => a.timestamp - b.timestamp);
    
    sortedLogs.forEach(log => {
      if (log.action === "Clock In") {
        clockInTime = log.timestamp;
      } else if (log.action === "Clock Out" && clockInTime) {
        totalMs += log.timestamp - clockInTime;
        clockInTime = null;
      }
    });

    if (isClockedIn && clockInTime) {
      totalMs += Date.now() - clockInTime;
    }

    const workedHours = totalMs / (1000 * 60 * 60);
    
    return {
      worked: workedHours,
      target: targetHours,
      remaining: Math.max(0, targetHours - workedHours),
      progress: Math.min(100, (workedHours / targetHours) * 100)
    };
  }, [userLogs, employeeData, isClockedIn]);

  const relevantProjects = useMemo(() => {
    return projects.filter(p => p.status === "Active");
  }, [projects]);

  const currentSessionDuration = useMemo(() => {
    if (!isClockedIn || !lastLog) return 0;
    return (Date.now() - lastLog.timestamp) / (1000 * 60 * 60);
  }, [isClockedIn, lastLog, currentTime]);

  const handleClockAction = () => {
    if (!user) return;
    
    if (isClockedIn) {
      // Trigger Allocation Modal
      setIsAllocationModalOpen(true);
      return;
    }

    // Direct Clock In
    const now = new Date();
    const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const newLog: AttendanceLog = {
      id: "al" + Date.now(),
      workerId: user.id,
      workerName: user.username,
      action: "Clock In",
      time,
      date,
      timestamp: now.getTime(),
      status: "On Time",
      color: user.colorTag || "#000000"
    };

    addAttendanceLog(newLog);
    toast.success("Gute Arbeit! Arbeitszeit gestartet.");
  };

  const handleFinishAllocation = () => {
    if (!user || !lastLog) return;

    const totalAllocated = Object.values(allocationHours).reduce((sum, h) => sum + h, 0);
    const sessionDuration = currentSessionDuration;

    if (totalAllocated > sessionDuration + 0.01) {
      toast.error(`Achtung! Die zugewiesene Zeit (${totalAllocated.toFixed(2)}h) darf die Arbeitszeit (${sessionDuration.toFixed(2)}h) nicht überschreiten.`);
      return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

    // 1. Clock Out Log
    const clockOutLog: AttendanceLog = {
      id: "al" + Date.now(),
      workerId: user.id,
      workerName: user.username,
      action: "Clock Out",
      time,
      date,
      timestamp: now.getTime(),
      status: "On Time",
      color: user.colorTag || "#000000"
    };

    addAttendanceLog(clockOutLog);

    // 2. Save Time Allocations
    Object.entries(allocationHours).forEach(([projectId, hours]) => {
      if (hours > 0) {
        addTimeAllocation({
          id: "ta" + Math.random(),
          workerId: employeeData?.id || user.id,
          projectId: projectId,
          date: date,
          hours: hours,
          timestamp: now.getTime(),
          notes: allocationNotes[projectId] || ""
        });
      }
    });

    // 3. Save Unassigned Time if any
    const unassigned = sessionDuration - totalAllocated;
    if (unassigned > 0.01) {
      addUnassignedWorkTime({
        id: "uw" + Math.random(),
        workerId: employeeData?.id || user.id,
        date: date,
        hours: unassigned,
        timestamp: now.getTime()
      });
    }

    setIsAllocationModalOpen(false);
    setAllocationHours({});
    setAllocationNotes({});
    toast.success("Arbeitszeit erfolgreich beendet und Zeiten verteilt.");
  };

  const navModules = [

    { name: "Kunden", icon: Building2, path: "/crm", color: "from-emerald-500 to-teal-600", permission: "crm" },
    { name: "Accounting", icon: Building2, path: "/accounting", color: "from-slate-500 to-slate-700", permission: "acc" },
    { name: "Projekte", icon: Layers, path: "/projects", color: "from-orange-500 to-amber-600", permission: "proj" },
    { name: "Team", icon: Users, path: "/team", color: "from-blue-400 to-blue-600", permission: "team" },
  ];



  const allowedModules = navModules.filter(mod => 
    isSuperAdmin || 
    employeeData?.permissions?.includes(mod.permission)
  );

  // Common Header component to fix missing data issues
  const DashboardHeader = () => (
    <div className="relative overflow-hidden bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-[48px] shadow-[0_20px_50px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-8 w-full">
      <div className="flex items-center gap-8 relative z-10">
        <div className="relative">
          <div className={`absolute -inset-1 rounded-full blur-sm opacity-50 ${isClockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-gray-200'}`} />
          <div className="h-24 w-24 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white relative z-10">
             {(user?.avatarUrl || employeeData?.avatarUrl) ? (
               <img src={user?.avatarUrl || employeeData?.avatarUrl} alt="" className="w-full h-full object-cover" />
             ) : (
               <div className="h-full w-full flex items-center justify-center text-3xl font-black text-gray-100 bg-gray-50 uppercase">
                 {user?.username.charAt(0)}
               </div>
             )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Hallo, {user?.fullName?.split(' ')[0] || user?.username}</h1>
            {isClockedIn && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">Live</span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">{currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} • {currentTime.toLocaleDateString('de-DE', { weekday: 'long' })}</p>
        </div>
      </div>
      {(invoiceSettings.systemLogo || "/logo.png") && (
        <img src={invoiceSettings.systemLogo || "/logo.png"} alt="" className="h-10 w-auto opacity-30 hidden lg:block" />
      )}
    </div>
  );

  if (isCEO) {
    const activeWorkers = (teamMembers || []).filter(m => {
      const logs = (attendanceLogs || [])
        .filter(l => l && (l.workerId === m.id || l.workerName === m.username))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return logs[0]?.action === "Clock In";
    });

    const activeProjects = (projects || []).filter(p => p.status === "Active");

    return (
      <div className="max-w-7xl mx-auto py-12 px-4 space-y-16 animate-in fade-in duration-1000">
        <DashboardHeader />

        {/* Finanz-Dashboard Section */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 sm:p-10 space-y-8">
           <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-50 pb-6">
              <div className="space-y-1">
                 <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em]">Finanz-Dashboard</span>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight">Finanzielle Übersicht</h2>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Echtzeit-Umsatz und Filteroptionen</p>
              </div>
              
              {/* Filters Panel */}
              <div className="flex flex-wrap items-center gap-4">
                 {/* Zeit Filter */}
                 <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Zeitraum</label>
                    <select 
                      value={timeFilter} 
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-black cursor-pointer"
                    >
                       <option value="ALL">Gesamter Zeitraum</option>
                       <option value="TODAY">Heute</option>
                       <option value="THIS_WEEK">Diese Woche</option>
                       <option value="THIS_MONTH">Dieser Monat</option>
                       <option value="THIS_YEAR">Dieses Jahr</option>
                       <option value="CUSTOM">Benutzerdefiniert</option>
                    </select>
                 </div>

                 {/* Kategorie Filter */}
                 <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Kategorie</label>
                    <select 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-black cursor-pointer"
                    >
                       <option value="ALL">Alle Kategorien</option>
                       <option value="Grafik/Druck">Grafik/Druck</option>
                       <option value="Web Design/SEO">Web Design/SEO</option>
                       <option value="Online Marketing">Online Marketing</option>
                       <option value="Foto/Video">Foto/Video</option>
                       <option value="Medya Avusturya">Medya Avusturya</option>
                    </select>
                 </div>

                 {/* Status Filter */}
                 <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-black cursor-pointer"
                    >
                       <option value="ALL">Alle Stati</option>
                       <option value="OFFEN">Offen</option>
                       <option value="BEZAHLT">Bezahlt (Alle)</option>
                       <option value="ENTWURF">Entwurf</option>
                       <option value="OVERDUE">Überfällig</option>
                       <option value="BAR">Bar</option>
                       <option value="BANK">Bank</option>
                    </select>
                 </div>
              </div>
           </div>

           {/* Custom Date Range Picker */}
           {timeFilter === "CUSTOM" && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-3xl animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Startdatum</label>
                   <input 
                     type="date" 
                     className="w-full bg-white border border-gray-100 text-xs font-bold rounded-xl px-3 py-2.5 outline-none"
                     value={customStartDate}
                     onChange={(e) => setCustomStartDate(e.target.value)}
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Enddatum</label>
                   <input 
                     type="date" 
                     className="w-full bg-white border border-gray-100 text-xs font-bold rounded-xl px-3 py-2.5 outline-none"
                     value={customEndDate}
                     onChange={(e) => setCustomEndDate(e.target.value)}
                   />
                </div>
             </div>
           )}

           {/* Financial KPI Numbers */}
           <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-gray-50/50 p-8 rounded-3xl border border-gray-100">
              {/* Large Gross display */}
              <div className="md:col-span-8 space-y-1">
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bruttoumsatz</span>
                 <div className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
                    {formatCurrency(financialData.totalGross)}
                 </div>
                 <div className="text-sm font-bold text-gray-400 mt-1.5 flex items-center gap-1">
                    <span>Netto:</span>
                    <span className="text-gray-900 font-extrabold">{formatCurrency(financialData.totalNet)}</span>
                 </div>
              </div>

              {/* Quick Stat boxes */}
              <div className="md:col-span-4 grid grid-cols-2 gap-4">
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-wider">Rechnungen</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{financialData.invoices.length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-wider">Durchschnitt</p>
                    <p className="text-xs font-black text-gray-950 mt-2 truncate">
                       {formatCurrency(financialData.invoices.length > 0 ? (financialData.totalGross / financialData.invoices.length) : 0)}
                    </p>
                 </div>
              </div>
           </div>

           {/* Filtered Invoices Mini List */}
           {financialData.invoices.length > 0 ? (
             <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Gefilterte Umsätze</h4>
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{financialData.invoices.length} Ergebnisse</span>
                </div>
                <div className="overflow-x-auto border border-gray-100 rounded-2xl overflow-hidden bg-white max-h-[300px] overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left text-xs">
                      <thead>
                         <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Kunde</th>
                            <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Datum</th>
                            <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Kategorie</th>
                            <th className="px-4 py-2.5 font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-2.5 text-right font-bold text-gray-400 uppercase tracking-wider">Brutto / Netto</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-medium">
                         {financialData.invoices.slice(0, 10).map((inv) => (
                            <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                               <td className="px-4 py-3 font-bold text-gray-900">{inv.id}</td>
                               <td className="px-4 py-3 font-bold text-gray-700">{inv.customerName}</td>
                               <td className="px-4 py-3 text-gray-400 font-bold">{inv.date}</td>
                               <td className="px-4 py-3 text-gray-500 font-bold">{inv.category || "-"}</td>
                               <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                    inv.status.startsWith("BEZAHLT") ? "bg-emerald-50 text-emerald-600" :
                                    inv.status === "OFFEN" ? "bg-orange-50 text-orange-600" :
                                    inv.status === "OVERDUE" ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
                                  }`}>
                                     {inv.status}
                                  </span>
                               </td>
                               <td className="px-4 py-3 text-right">
                                  <p className="font-extrabold text-gray-900">{formatCurrency(inv.amountGross)}</p>
                                  <p className="text-[9px] text-gray-400 font-bold">Netto: {formatCurrency(inv.amountNet)}</p>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
                {financialData.invoices.length > 10 && (
                  <div className="text-center">
                     <Link href="/accounting/invoices" className="text-[10px] font-black text-brand-secondary hover:underline uppercase tracking-widest">
                        Alle {financialData.invoices.length} Rechnungen im Accounting ansehen
                     </Link>
                  </div>
                )}
             </div>
           ) : (
             <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-100">
                <Activity className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keine Umsätze im gewählten Filterzeitraum vorhanden</p>
             </div>
           )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Side: Active Projects */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Layers className="h-4 w-4" /> Aktive Projekte ({activeProjects.length})
              </h3>
              <Link href="/projects" className="text-[10px] font-black text-brand-secondary uppercase tracking-widest hover:underline">Alle ansehen</Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeProjects.slice(0, 4).map(project => {
                const projectAllocations = timeAllocations.filter(a => a.projectId === project.id);
                const totalHours = projectAllocations.reduce((sum, a) => sum + a.hours, 0);
                
                return (
                  <Link 
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col gap-6 group"
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{project.category}</p>
                      <h4 className="text-xl font-black text-gray-900 leading-tight group-hover:text-brand-secondary transition-colors">{project.name}</h4>
                      <p className="text-xs font-bold text-gray-400">{project.customerName}</p>
                    </div>
                    
                    <div className="space-y-3">
                       <div className="flex justify-between items-end">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Zeitaufwand</p>
                          <span className="text-xs font-black text-gray-900">{totalHours.toFixed(1)}h</span>
                       </div>
                       <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                          <div className="h-full bg-black rounded-full" style={{ width: `${Math.min(100, (totalHours/50)*100)}%` }} />
                       </div>
                    </div>
                  </Link>
                );
              })}
              {activeProjects.length === 0 && (
                <div className="col-span-2 py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200 text-center flex flex-col items-center justify-center gap-4">
                  <Briefcase className="h-12 w-12 text-gray-200" />
                  <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Keine aktiven Projekte</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Active Team */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity className="h-4 w-4" /> Live Team ({activeWorkers.length})
              </h3>
            </div>

            <UpcomingAppointments />

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8 space-y-6">
               {activeWorkers.map(worker => (
                 <div key={worker.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                       <div className="h-14 w-14 rounded-2xl border-2 border-white shadow-lg overflow-hidden bg-gray-50 relative">
                          {worker.avatarUrl ? (
                            <img src={worker.avatarUrl} className="w-full h-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xl font-black text-gray-200 uppercase">{worker.username.charAt(0)}</div>
                          )}
                          <div className="absolute bottom-1 right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-gray-900">{worker.fullName}</p>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                            <Circle className="h-2 w-2 fill-emerald-500" /> Am Arbeiten
                          </p>
                       </div>
                    </div>
                    <Link href="/attendance" className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 hover:bg-black hover:text-white transition-all">
                       <ChevronRight className="h-5 w-5" />
                    </Link>
                 </div>
               ))}
               {activeWorkers.length === 0 && (
                 <div className="py-10 text-center space-y-2">
                    <Clock className="h-8 w-8 text-gray-100 mx-auto" />
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Niemand ist gerade eingeloggt</p>
                 </div>
               )}
            </div>

            <div className="bg-black rounded-[40px] p-8 text-white space-y-6 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 h-40 w-40 bg-brand-secondary/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
               <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50 relative z-10">System Status</h4>
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                     <span className="text-sm font-bold">Aktive Projekte</span>
                     <span className="text-xl font-black">{activeProjects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm font-bold">Team Online</span>
                     <span className="text-xl font-black">{activeWorkers.length}</span>
                  </div>
               </div>
               <button onClick={()=>router.push('/attendance')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10">
                  Attendance ansehen
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-12 animate-in fade-in duration-1000">
      
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7 space-y-12">
          <div className="relative group flex flex-col items-center">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px] transition-all duration-1000 ${
              isClockedIn ? 'bg-emerald-500/10' : 'bg-slate-500/10'
            }`} />
            
            <div className="flex flex-col items-center mb-8 animate-in slide-in-from-top-4 duration-500 relative z-10">
               <div className={`flex items-center gap-2 px-6 py-2 rounded-full border shadow-sm ${
                 isClockedIn 
                   ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                   : "bg-slate-50 text-slate-500 border-slate-100"
               }`}>
                 <div className={`h-2 w-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                   System: {isClockedIn ? "ARBEITSZEIT AKTIV" : "AUSSERHALB DER ARBEITSZEIT"}
                 </span>
               </div>
            </div>

            <button 
              onClick={handleClockAction}
              className={`relative z-10 h-80 w-80 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-700 shadow-[0_30px_70px_rgba(0,0,0,0.1)] active:scale-95 group-hover:scale-[1.02] border-[12px] border-white/80 overflow-hidden ${
                isClockedIn 
                  ? "bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-emerald-900/20" 
                  : "bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-400/20"
              }`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner mb-2 group-hover:rotate-12 transition-transform duration-500">
                {isClockedIn ? (
                  <Square className="h-12 w-12 text-white fill-white" />
                ) : (
                  <Play className="h-12 w-12 text-white fill-white ml-2" />
                )}
              </div>
              <div className="text-center px-6">
                <span className="text-white font-black text-lg uppercase tracking-wider leading-tight block">
                  {isClockedIn ? "Du bist am Arbeiten" : "Du arbeitest gerade nicht"}
                </span>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">
                  {isClockedIn ? "Arbeitszeit läuft" : "Arbeit beginnen"}
                </p>
              </div>
            </button>

            <div className="w-full max-w-md mt-16 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Wöchentlicher Fortschritt</p>
                  <h4 className="text-xl font-black text-gray-900 mt-1">{weeklyStats.worked.toFixed(1)}h / {weeklyStats.target}h</h4>
                </div>
                <span className="text-sm font-black text-brand-secondary">{Math.round(weeklyStats.progress)}%</span>
              </div>
              <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden p-1 border border-white shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
                    weeklyStats.progress >= 100 ? 'bg-emerald-500' : 'bg-brand-secondary'
                  }`}
                  style={{ width: `${weeklyStats.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column Stacked for mobile, Side by side for LG */}
        <div className="lg:col-span-5 space-y-12">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] space-y-4 hover:border-brand-secondary/30 transition-all group text-center md:text-left">
              <div className="h-12 w-12 rounded-2xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform mx-auto md:mx-0">
                <Timer className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Geleistet</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">{weeklyStats.worked.toFixed(1)}h</h3>
              </div>
            </div>
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] space-y-4 hover:border-orange-200 transition-all group text-center md:text-left">
              <div className={`h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform mx-auto md:mx-0`}>
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Verbleibend</p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">{weeklyStats.remaining.toFixed(1)}h</h3>
              </div>
            </div>

            <MyCalendarTasks />
            <UpcomingAppointments />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Schnellzugriff</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {allowedModules.map((module) => (
                <Link 
                  key={module.name}
                  href={module.path}
                  className="group relative overflow-hidden bg-white p-2 pr-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-2xl hover:scale-[1.02] transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className={`h-16 w-16 rounded-[24px] bg-gradient-to-br ${module.color} flex items-center justify-center text-white shadow-lg shadow-black/5`}>
                      <module.icon className="h-7 w-7" />
                    </div>
                    <span className="text-sm font-black text-gray-900">{module.name}</span>
                  </div>
                  <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-brand-secondary group-hover:text-white transition-colors">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Allocation Modal */}
      {isAllocationModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl p-10 space-y-8 my-10 relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setIsAllocationModalOpen(false)}
              className="absolute top-8 right-8 h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-black transition-all"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-center space-y-2">
              <div className="h-20 w-20 bg-brand-secondary/10 text-brand-secondary rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Clock className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black text-gray-900">Arbeitszeit verteilen</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                Gesamtzeit dieser Session: <span className="text-black">{currentSessionDuration.toFixed(2)}h</span>
              </p>
            </div>

            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {relevantProjects.length > 0 ? (
                relevantProjects.map(project => {
                  return (
                    <div key={project.id} className="bg-gray-50 rounded-3xl p-6 border border-gray-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[9px] font-black text-brand-secondary uppercase tracking-widest">{project.category}</p>
                          <h4 className="text-sm font-black text-gray-900 mt-1">{project.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{project.customerName}</p>
                        </div>
                        <div className="flex flex-col items-end">
                           <input 
                            type="number"
                            step="0.5"
                            placeholder="0.0"
                            className="w-20 text-center py-2 bg-white border border-gray-100 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-black"
                            value={allocationHours[project.id] || ""}
                            onChange={(e) => setAllocationHours({ ...allocationHours, [project.id]: Number(e.target.value) })}
                           />
                           <span className="text-[8px] font-bold text-gray-300 mt-1 uppercase">Stunden</span>
                        </div>
                      </div>
                      <input 
                        type="text"
                        placeholder="Was hast du an diesem Projekt gemacht?"
                        className="w-full bg-white/50 border border-transparent border-b-gray-200 py-2 px-1 text-xs font-medium outline-none focus:border-black transition-colors"
                        value={allocationNotes[project.id] || ""}
                        onChange={(e) => setAllocationNotes({ ...allocationNotes, [project.id]: e.target.value })}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                   <Briefcase className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keine aktiven Projekte gefunden.</p>
                </div>
              )}
            </div>

            <div className="bg-brand-secondary/5 rounded-[32px] p-6 border border-brand-secondary/10">
               <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nicht zugewiesene Zeit</p>
                  <span className="text-xl font-black text-brand-secondary">
                    {(currentSessionDuration - Object.values(allocationHours).reduce((a,b)=>a+b, 0)).toFixed(2)}h
                  </span>
               </div>
               <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 italic">Diese Zeit wird automatisch als allgemeine Arbeitszeit erfasst.</p>
            </div>

            <button 
              onClick={handleFinishAllocation}
              className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl flex items-center justify-center gap-3"
            >
              <Save className="h-5 w-5" /> Arbeitszeit beenden & Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardHeader() {
  const { user } = useAuthStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div className="space-y-2">
        <h2 className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.4em] mb-1">Trada Media OS</h2>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          Hallo, {user?.fullName?.split(' ')[0] || user?.username}
        </h1>
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
          {time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>
      <div className="bg-white px-8 py-4 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-6">
        <div className="flex flex-col items-end">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Aktuelle Zeit</p>
          <span className="text-2xl font-black text-gray-900">
            {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="h-10 w-px bg-gray-100" />
        <div className="h-12 w-12 rounded-2xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
          <Calendar className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
