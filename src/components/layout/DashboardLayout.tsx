"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X, Bell, LogOut, Home, UserCircle, Check, Info } from "lucide-react";
import { useDataStore } from "@/store/data-store";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { invoiceSettings, notifications, markNotificationAsRead } = useDataStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const pathname = usePathname();

  const unreadCount = notifications.filter(n => !n.read).length;
  const isDashboard = pathname === "/dashboard";

  // Close mobile sidebar automatically when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("auth-storage");
    await auth.signOut();
    window.location.href = "/login";
  };

  // Automatic Daily Google Drive Backup for CEO/Admin with configurable time schedule
  useEffect(() => {
    if (!user) return;
    // Match the same role check used in the Settings page
    const role = user.role?.toLowerCase() || "";
    const isUserAdmin =
      role === "superadmin" ||
      ["ceo", "co founder", "admin", "administrator"].includes(role);
    if (!isUserAdmin) return;

    // Track in-flight requests to prevent concurrent backup calls
    let isRunning = false;

    const performBackup = async () => {
      const enableAuto = invoiceSettings?.enableAutoBackup ?? true;
      if (!enableAuto) return;

      // Already running? skip
      if (isRunning) return;

      const today = new Date().toISOString().split("T")[0];

      // If already successfully backed up today, skip
      const lastBackup = localStorage.getItem("last-gdrive-backup");
      if (lastBackup === today) return;

      // If last attempt failed recently, wait 1 hour before retrying (prevents spam)
      const lastFailedAt = localStorage.getItem("last-gdrive-backup-failed-at");
      if (lastFailedAt) {
        const elapsed = Date.now() - parseInt(lastFailedAt, 10);
        const oneHour = 60 * 60 * 1000;
        if (elapsed < oneHour) return;
      }

      // Configure backup time (default is 00:00)
      const [targetHour, targetMinute] = (invoiceSettings?.backupTime || "00:00").split(":").map(Number);
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Check if we reached or passed the scheduled time for today
      if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
        const data = localStorage.getItem("trada-data-storage");
        if (data) {
          isRunning = true;
          console.log(`[Trada Backup] Auto-backup triggered at scheduled time ${invoiceSettings?.backupTime || "00:00"}`);
          try {
            const res = await fetch(`/api/backup?userId=${user.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: JSON.parse(data) }),
            });
            const result = await res.json();
            if (result.success) {
              // Only mark as done today after a confirmed success
              localStorage.setItem("last-gdrive-backup", today);
              localStorage.removeItem("last-gdrive-backup-failed-at");
              console.log(`[Trada Backup] Automatic daily backup successful. File: ${result.fileName}`);
            } else {
              console.error("[Trada Backup] Daily automatic backup failed:", result.error);
              // Record failure timestamp so we wait 1 hour before next retry
              localStorage.setItem("last-gdrive-backup-failed-at", String(Date.now()));
              toast.error(result.error || "Otomatik Google Drive yedekleme başarısız oldu.", { duration: 8000 });
            }
          } catch (err) {
            console.error("[Trada Backup] Network error during auto backup:", err);
            localStorage.setItem("last-gdrive-backup-failed-at", String(Date.now()));
            toast.error("Otomatik yedekleme sırasında bağlantı hatası oluştu.", { duration: 8000 });
          } finally {
            isRunning = false;
          }
        }
      }
    };

    // Run check immediately on load/render
    performBackup();

    // Run check every 60 seconds to catch scheduled time transition
    const interval = setInterval(performBackup, 60000);
    return () => clearInterval(interval);
  }, [user, invoiceSettings]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-[200] w-72 bg-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden shadow-2xl pt-[env(safe-area-inset-top)]`}>
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Premium Single-Row Mobile Header (with Safe Area Support for Mobile Status Bar) */}
        <header className="flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 lg:hidden relative z-[100] shadow-sm">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="h-10 w-10 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-900 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Home */}
            {!isDashboard && (
              <Link 
                href="/dashboard"
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-black transition-all"
              >
                <Home className="h-4.5 w-4.5" />
              </Link>
            )}

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowMobileNotifications(!showMobileNotifications)}
                className="relative p-2 text-gray-400 hover:text-black transition-colors"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showMobileNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMobileNotifications(false)} />
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-900">Benachrichtigungen</h3>
                      <button onClick={() => setShowMobileNotifications(false)}>
                        <X className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => { markNotificationAsRead(n.id); }}
                          className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0 ${!n.read ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center shrink-0 ${
                              n.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 
                              n.type === 'warning' ? 'bg-orange-50 text-orange-500' : 
                              'bg-blue-50 text-blue-500'
                            }`}>
                              {n.type === 'success' ? <Check className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-900">{n.title}</p>
                              <p className="text-[9px] text-gray-500 mt-0.5 leading-normal">{n.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="p-6 text-center text-gray-400 text-[10px]">Keine Benachrichtigungen</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar / Settings Link */}
            <Link 
              href="/settings"
              className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden shrink-0 border border-gray-100"
              style={{ backgroundColor: user?.colorTag || '#1f2937' }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="h-5 w-5 text-white/50" />
              )}
            </Link>
            
            {/* Logout */}
            <button 
              onClick={handleLogout}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        {/* Desktop Topbar - Hidden on mobile */}
        <div className="hidden lg:block">
          <Topbar />
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
