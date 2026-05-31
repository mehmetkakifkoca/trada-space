"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  useDataStore, 
  Invoice, 
  InvoiceStatus, 
  RecurringInvoice 
} from "@/store/data-store";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal, 
  FileText,
  Clock,
  AlertCircle,
  X,
  Mail,
  Printer,
  Edit3,
  ChevronDown,
  ExternalLink,
  Trash2,
  CheckCircle2,
  ArrowUpDown,
  FilterX,
  Copy,
  Archive,
  Ban,
  RefreshCw,
  Play,
  Pause,
  History,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  UploadCloud,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusConfig: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  ENTWURF: { label: "Entwurf", color: "text-blue-600", bg: "bg-blue-50" },
  OFFEN: { label: "Offen", color: "text-orange-600", bg: "bg-orange-50" },
  BEZAHLT: { label: "Bezahlt", color: "text-emerald-600", bg: "bg-emerald-50" },
  BEZAHLT_BAR: { label: "Bezahlt (Bar)", color: "text-emerald-600", bg: "bg-emerald-50" },
  BEZAHLT_BANK: { label: "Bezahlt (Bank)", color: "text-teal-600", bg: "bg-teal-50" },
  OVERDUE: { label: "Überfällig", color: "text-red-600", bg: "bg-red-50" },
  STORNIERT: { label: "Storniert", color: "text-gray-600", bg: "bg-gray-50" },
  CREDITED: { label: "Gutschrift", color: "text-purple-600", bg: "bg-purple-50" },
};

export default function InvoicesDashboard() {
  const router = useRouter();
  const { 
    invoices, 
    deleteInvoice, 
    updateInvoice, 
    addInvoice,
    recurringConfigs,
    updateRecurringConfig,
    deleteRecurringConfig
  } = useDataStore();
  
  // Tabs & Views
  const [viewMode, setViewMode] = useState<"ALL" | "RECURRING" | "BANK">("ALL");

  // Filter & State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "ALL">("ALL");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
  const [partialInvoiceData, setPartialInvoiceData] = useState<{
    originalInvoice: Invoice | null;
    mode: 'PERCENTAGE' | 'AMOUNT';
    value: number;
  }>({ originalInvoice: null, mode: 'PERCENTAGE', value: 50 });

  // Stats
  const stats = useMemo(() => {
    const total = invoices.reduce((acc, inv) => acc + (inv.amountGross || 0), 0);
    const open = invoices.filter(i => i.status === "OFFEN").reduce((acc, inv) => acc + (inv.amountGross || 0), 0);
    const overdue = invoices.filter(i => i.status === "OVERDUE").reduce((acc, inv) => acc + (inv.amountGross || 0), 0);
    return { total, open, overdue };
  }, [invoices]);

  const activeInvoice = useMemo(() => {
    return invoices.find(i => i.id === activeMenu) || null;
  }, [invoices, activeMenu]);

  // Filtering & Sorting (Alle Rechnungen)
  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => {
        const matchesSearch = 
          inv.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = 
          statusFilter === "ALL" || 
          inv.status === statusFilter ||
          (statusFilter === "BEZAHLT" && inv.status.startsWith("BEZAHLT"));
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [invoices, searchTerm, statusFilter, sortConfig]);

  const handleSort = (key: keyof Invoice) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDuplizieren = (invoice: Invoice) => {
    const newInvoice = {
      ...invoice,
      id: `RE-COPY-${Date.now().toString().slice(-4)}`,
      status: "ENTWURF" as const,
      date: new Date().toISOString().split('T')[0],
      amountPaid: 0,
      history: [{ date: new Date().toISOString(), action: "Dupliziert", user: "Admin" }]
    };
    addInvoice(newInvoice);
    toast.success("Rechnung dupliziert");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const handleCreatePartialInvoice = () => {
    if (!partialInvoiceData.originalInvoice) return;
    
    const { originalInvoice, mode, value } = partialInvoiceData;
    let partialAmountNet = 0;
    
    if (mode === 'PERCENTAGE') {
      partialAmountNet = originalInvoice.amountNet * (value / 100);
    } else {
      partialAmountNet = value;
    }

    const partialAmountVat = partialAmountNet * 0.19; // Simplified 19%
    const partialAmountGross = partialAmountNet + partialAmountVat;

    const newInvoice: Invoice = {
      ...originalInvoice,
      id: `TEIL-${originalInvoice.id}-${Date.now().toString().slice(-4)}`,
      status: "OFFEN",
      date: new Date().toISOString().split('T')[0],
      amountNet: partialAmountNet,
      amountVat: partialAmountVat,
      amountGross: partialAmountGross,
      amountPaid: 0,
      positions: [
        {
          id: "p1",
          name: `Teilrechnung zu ${originalInvoice.id}`,
          description: mode === 'PERCENTAGE' ? `${value}% der Gesamtsumme` : `Teilbetrag`,
          quantity: 1,
          unit: "piece",
          priceNet: partialAmountNet,
          vatRate: 19,
          discountPercent: 0,
          type: "item"
        }
      ],
      history: [{ date: new Date().toISOString(), action: "Teilrechnung erstellt", user: "Admin" }]
    };

    addInvoice(newInvoice);
    setIsPartialModalOpen(false);
    toast.success("Teilrechnung erfolgreich erstellt");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rechnungsübersicht</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Professionelle Verwaltung Ihrer Ausgangsrechnungen.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/accounting/invoices/new")}
            className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-[1.02] transition-all shadow-md shadow-brand-secondary/15"
          >
            <Plus className="h-4 w-4" />
            Neue Rechnung
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-gray-900" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Gesamtvolumen</p>
            <h3 className="text-base font-bold mt-0.5 tracking-tight text-gray-900">{formatCurrency(stats.total)}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Offener Betrag</p>
            <h3 className="text-base font-bold mt-0.5 tracking-tight text-orange-600">{formatCurrency(stats.open)}</h3>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="h-8 w-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
            <Ban className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Overdue</p>
            <h3 className="text-base font-bold mt-0.5 tracking-tight text-red-600">{formatCurrency(stats.overdue)}</h3>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-100 px-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <button 
          onClick={() => setViewMode("ALL")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${viewMode === "ALL" ? "text-black border-black" : "text-gray-400 border-transparent hover:text-gray-600"}`}
        >
          Alle Rechnungen
        </button>
        <button 
          onClick={() => setViewMode("RECURRING")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${viewMode === "RECURRING" ? "text-black border-black" : "text-gray-400 border-transparent hover:text-gray-600"}`}
        >
          Wiederkehrende Rechnungen
        </button>
        <button 
          onClick={() => setViewMode("BANK")}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${viewMode === "BANK" ? "text-black border-black" : "text-gray-400 border-transparent hover:text-gray-600"} flex items-center gap-1.5`}
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
          <span>Bankabgleich (Kontoauszug)</span>
        </button>
      </div>

      {viewMode === "ALL" && (
        <div className="animate-in fade-in duration-200 space-y-6">
          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {["ALL", "ENTWURF", "OFFEN", "BEZAHLT", "BEZAHLT_BAR", "BEZAHLT_BANK", "OVERDUE", "STORNIERT"].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all ${
                    statusFilter === status 
                      ? "bg-brand-secondary text-white shadow-sm" 
                      : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  {status === "ALL" ? "Alle Rechnungen" : statusConfig[status as InvoiceStatus]?.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Suche nach Rechnungs-ID oder Kunde..." 
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-black/5 outline-none transition-all font-medium text-gray-800 placeholder-gray-400 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all border border-gray-100 shadow-sm">
                  <Filter className="h-3.5 w-3.5" /> Filter
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-all border border-gray-100 shadow-sm">
                  <Download className="h-3.5 w-3.5" /> Exportieren
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center gap-1.5">ID <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors" onClick={() => handleSort('customerName')}>
                    <div className="flex items-center gap-1.5">Kunde <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors" onClick={() => handleSort('category' as any)}>
                    <div className="flex items-center gap-1.5">Kategorie <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-black transition-colors" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1.5">Datum <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-black transition-colors" onClick={() => handleSort('amountGross')}>
                    <div className="flex items-center gap-1.5 justify-end">Betrag <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-2.5 text-right text-[9px] font-bold text-gray-400 uppercase tracking-widest">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-2">
                      <span className="text-xs font-bold text-gray-900">{inv.id}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900 leading-snug">{inv.customerName}</span>
                        <span className="text-[9px] text-gray-400 font-medium leading-none">{inv.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-semibold text-gray-500">{inv.category || "-"}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-gray-500 font-medium">{inv.date}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-xs font-bold text-gray-900">{formatCurrency(inv.amountGross || 0)}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${statusConfig[inv.status]?.bg} ${statusConfig[inv.status]?.color}`}>
                        {statusConfig[inv.status]?.label}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5 relative">
                        <button 
                          onClick={() => router.push(`/accounting/invoices/${inv.id}`)}
                          className="p-1 bg-gray-50 rounded text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenu === inv.id) {
                                setActiveMenu(null);
                                setMenuPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveMenu(inv.id);
                                setMenuPosition({
                                  top: rect.bottom + window.scrollY + 4,
                                  left: rect.right + window.scrollX - 176
                                });
                              }
                            }}
                            className="p-1 bg-gray-50 rounded text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {viewMode === "RECURRING" && (
        <div className="space-y-4 animate-in fade-in duration-200">
           {recurringConfigs.length === 0 ? (
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4 border border-gray-100">
                   <RefreshCw className="h-5 w-5 text-gray-300" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Keine wiederkehrenden Rechnungen</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">Automatisieren Sie Ihre regelmäßigen Abrechnungszyklen. Erstellen Sie eine Vorlage und setzen Sie das Intervall.</p>
                <button 
                  onClick={() => router.push("/accounting/invoices/new?mode=recurring")}
                  className="mt-6 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all"
                >
                  Wiederkehrende Abrechnung einrichten
                </button>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recurringConfigs.map(config => (
                   <div key={config.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                      <div className="p-4 space-y-4">
                         <div className="flex items-center justify-between">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                               <RefreshCw className={`h-4 w-4 ${config.isActive ? 'animate-spin-slow' : ''}`} />
                            </div>
                            <div className="flex items-center gap-1.5">
                               <button 
                                 onClick={() => updateRecurringConfig(config.id, { isActive: !config.isActive })}
                                 className={`p-1.5 rounded-lg transition-all ${config.isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                               >
                                 {config.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                               </button>
                               <button onClick={() => deleteRecurringConfig(config.id)} className="p-1.5 bg-red-50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                 <Trash2 className="h-4 w-4" />
                               </button>
                            </div>
                         </div>

                         <div>
                            <h3 className="text-xs font-bold text-gray-900">Abonnement für {config.templateInvoice.customerName}</h3>
                            <div className="flex items-center gap-3 mt-1.5">
                               <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                  <Calendar className="h-2.5 w-2.5" /> {config.interval}
                               </span>
                               <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Nächste: {config.nextGenerationDate}</span>
                            </div>
                         </div>

                         <div className="bg-gray-50/50 rounded-xl p-3 flex items-center justify-between">
                            <div>
                               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Rechnungsbetrag</p>
                               <p className="text-sm font-bold text-gray-900">{formatCurrency(config.templateInvoice.amountGross || 0)}</p>
                            </div>
                            <button className="text-[10px] font-bold text-black flex items-center gap-0.5 hover:underline">
                               Vorlage anzeigen <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                         </div>

                         <div className="pt-2 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-gray-400 border-t border-gray-50">
                            <div className="flex items-center gap-1.5">
                               <History className="h-3 w-3" /> {config.history.length} Invoices generated
                            </div>
                            <button className="hover:text-black transition-colors">Verlauf anzeigen</button>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
           )}
        </div>
      )}

      {viewMode === "BANK" && (
        <BankReconciliationView invoices={invoices} updateInvoice={updateInvoice} />
      )}

      {isPartialModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Teilrechnung erstellen</h2>
              <button onClick={() => setIsPartialModalOpen(false)} className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl">
                <button 
                  onClick={() => setPartialInvoiceData(p => ({ ...p, mode: 'PERCENTAGE' }))}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${partialInvoiceData.mode === 'PERCENTAGE' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                >
                  Prozentual (%)
                </button>
                <button 
                  onClick={() => setPartialInvoiceData(p => ({ ...p, mode: 'AMOUNT' }))}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${partialInvoiceData.mode === 'AMOUNT' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                >
                  Betrag (€)
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {partialInvoiceData.mode === 'PERCENTAGE' ? 'Anteil in Prozent' : 'Betrag in Euro'}
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl text-xl font-bold outline-none focus:ring-2 focus:ring-brand-secondary/20"
                    value={partialInvoiceData.value}
                    onChange={(e) => setPartialInvoiceData(p => ({ ...p, value: Number(e.target.value) }))}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-gray-300">
                    {partialInvoiceData.mode === 'PERCENTAGE' ? '%' : '€'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-3xl p-6 space-y-3">
                <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  <span>Vorschau Netto</span>
                  <span>
                    {formatCurrency(partialInvoiceData.mode === 'PERCENTAGE' 
                      ? (partialInvoiceData.originalInvoice?.amountNet || 0) * (partialInvoiceData.value / 100) 
                      : partialInvoiceData.value)}
                  </span>
                </div>
                <div className="h-px bg-blue-100" />
                <p className="text-[11px] text-blue-600 font-medium leading-relaxed">
                  Es wird eine neue Rechnung mit dem gewählten Anteil erstellt. Die Originalrechnung bleibt unverändert.
                </p>
              </div>

              <button 
                onClick={handleCreatePartialInvoice}
                className="w-full py-5 bg-brand-secondary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-secondary/20 flex items-center justify-center gap-3"
              >
                <Plus className="h-5 w-5" /> Teilrechnung erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && activeInvoice && menuPosition && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setActiveMenu(null); setMenuPosition(null); }} />
          <div 
            style={{ 
              position: 'absolute',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            className="w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1.5 animate-in fade-in duration-100"
          >
            <button onClick={() => { handleDuplizieren(activeInvoice); setActiveMenu(null); setMenuPosition(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Copy className="h-3.5 w-3.5" /> Duplizieren
            </button>
            <button onClick={() => { router.push(`/accounting/invoices/${activeInvoice.id}?print=true`); setActiveMenu(null); setMenuPosition(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Printer className="h-3.5 w-3.5" /> Drucken / PDF
            </button>
            <button onClick={() => { toast.info("Email Modal..."); setActiveMenu(null); setMenuPosition(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Mail className="h-3.5 w-3.5" /> E-Mail senden
            </button>
            <div className="h-px bg-gray-50 my-1" />
            <p className="px-3 py-0.5 text-[8px] font-black text-gray-300 uppercase tracking-widest">Status ändern</p>
            {Object.entries(statusConfig).map(([status, cfg]) => (
              <button 
                key={status}
                onClick={() => { updateInvoice(activeInvoice.id, { status: status as InvoiceStatus }); setActiveMenu(null); setMenuPosition(null); toast.success(`Status auf ${cfg.label} geändert`); }}
                className={`w-full flex items-center gap-2 px-3 py-1 text-[11px] font-bold hover:bg-gray-50 transition-colors ${activeInvoice.status === status ? cfg.color : 'text-gray-600'}`}
              >
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} />
                {cfg.label}
              </button>
            ))}

            <div className="h-px bg-gray-50 my-1" />
            <button onClick={() => { setPartialInvoiceData({ originalInvoice: activeInvoice, mode: 'PERCENTAGE', value: 50 }); setIsPartialModalOpen(true); setActiveMenu(null); setMenuPosition(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Teilrechnung
            </button>
            
            <button onClick={() => { if(confirm("Archivieren this invoice?")) { /* Logic here */ } setActiveMenu(null); setMenuPosition(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:bg-gray-50 transition-colors">
              <Archive className="h-3.5 w-3.5" /> Archivieren
            </button>
            <button onClick={() => { if(confirm("Löschen this invoice?")) deleteInvoice(activeInvoice.id); setActiveMenu(null); setMenuPosition(null); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Löschen
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// BANK RECONCILIATION COMPONENT
// ==========================================
interface BankTx {
  id: string;
  date: string;
  partnerName: string;
  purpose: string;
  amount: number;
  matchedInvoice?: Invoice;
  confidence?: "EXACT" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  confidenceLabel?: string;
  status: "PENDING" | "RECONCILED" | "IGNORED";
}

function BankReconciliationView({ invoices, updateInvoice }: { invoices: Invoice[]; updateInvoice: any }) {
  const [transactions, setTransactions] = useState<BankTx[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Unpaid invoices
  const unpaidInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status === "OFFEN" || inv.status === "OVERDUE");
  }, [invoices]);

  const parseAmount = (valStr: string): number => {
    if (!valStr) return 0;
    let clean = valStr.replace(/\./g, '');
    clean = clean.replace(/,/g, '.');
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const processCSVContent = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      toast.error("Die hochgeladene Datei ist leer.");
      return;
    }

    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const sep = semicolonCount > commaCount ? ';' : ',';

    const parseLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase());
    
    // Key mappings
    const dateKws = ['datum', 'tag', 'date', 'valuta', 'buchungstext'];
    const nameKws = ['name', 'empfänger', 'auftraggeber', 'begünstigter', 'zahler', 'partner', 'payee'];
    const purposeKws = ['verwendungszweck', 'betreff', 'zweck', 'beschreibung', 'details', 'reference', 'info', 'text'];
    const amountKws = ['betrag', 'umsatz', 'wert', 'amount', 'summe'];

    const getColumnIndex = (kws: string[]) => {
      return headers.findIndex(h => kws.some(kw => h.includes(kw)));
    };

    const dateIdx = getColumnIndex(dateKws);
    const nameIdx = getColumnIndex(nameKws);
    const purposeIdx = getColumnIndex(purposeKws);
    const amountIdx = getColumnIndex(amountKws);

    if (amountIdx === -1) {
      toast.error("Betrag-Spalte konnte im CSV-Kontoauszug nicht automatisch ermittelt werden.");
      return;
    }

    const parsedTxs: BankTx[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      if (cells.length === 0) continue;

      const dateVal = dateIdx !== -1 ? cells[dateIdx] || '' : new Date().toISOString().split('T')[0];
      const partnerVal = nameIdx !== -1 ? cells[nameIdx] || '' : 'Unbekannter Partner';
      const purposeVal = purposeIdx !== -1 ? cells[purposeIdx] || '' : '';
      const amountVal = parseAmount(cells[amountIdx] || '0');

      // Reconcile incoming positive bank transfers only (meaning income)
      if (amountVal <= 0) continue;

      // Smart matching against unpaid invoices
      let matchedInv: Invoice | undefined;
      let conf: BankTx["confidence"] = "NONE";
      let confLabel = "";

      for (const inv of unpaidInvoices) {
        const invIdUpper = inv.id.toUpperCase();
        const purposeUpper = purposeVal.toUpperCase();
        const custNameUpper = inv.customerName.toUpperCase();
        const partnerUpper = partnerVal.toUpperCase();

        const cleanInvId = inv.id.replace(/[^0-9]/g, '');
        const hasInvNumberInPurpose = cleanInvId && purposeUpper.includes(cleanInvId);

        const amountMatches = Math.abs(amountVal - inv.amountGross) < 0.05;

        if (amountMatches && (purposeUpper.includes(invIdUpper) || hasInvNumberInPurpose)) {
          matchedInv = inv;
          conf = "EXACT";
          confLabel = "Exakte ID & Betrag";
          break; // Perfect match, stop searching
        } else if (amountMatches && (purposeUpper.includes(custNameUpper) || partnerUpper.includes(custNameUpper))) {
          matchedInv = inv;
          conf = "HIGH";
          confLabel = "Kunde & Betrag";
        } else if (amountMatches && conf === "NONE") {
          matchedInv = inv;
          conf = "LOW";
          confLabel = "Nur Betrag";
        } else if ((purposeUpper.includes(invIdUpper) || hasInvNumberInPurpose) && conf === "NONE") {
          matchedInv = inv;
          conf = "MEDIUM";
          confLabel = "Abweichender Betrag";
        }
      }

      parsedTxs.push({
        id: `TX-${i}-${Math.random().toString(36).substr(2, 4)}`,
        date: dateVal,
        partnerName: partnerVal,
        purpose: purposeVal,
        amount: amountVal,
        matchedInvoice: matchedInv,
        confidence: conf,
        confidenceLabel: confLabel || "Keine Übereinstimmung",
        status: "PENDING"
      });
    }

    setTransactions(parsedTxs);
    toast.success(`${parsedTxs.length} eingehende Transaktionen geladen!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSVContent(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSVContent(text);
      };
      reader.readAsText(file, "UTF-8");
    } else {
      toast.error("Bitte laden Sie nur gültige CSV-Dateien hoch.");
    }
  };

  const simulateDemoData = () => {
    setFileName("kontoauszug_simuliert.csv");
    
    // Let's build demo data that matches some unpaid invoices if they exist
    const demoTxs: BankTx[] = [];
    
    if (unpaidInvoices.length > 0) {
      unpaidInvoices.forEach((inv, index) => {
        // EXACT match
        if (index === 0) {
          demoTxs.push({
            id: `TX-DEMO-${inv.id}`,
            date: new Date().toISOString().split('T')[0],
            partnerName: inv.customerName,
            purpose: `Rechnung ${inv.id} - Trada Space CRM`,
            amount: inv.amountGross,
            matchedInvoice: inv,
            confidence: "EXACT",
            confidenceLabel: "Exakte ID & Betrag",
            status: "PENDING"
          });
        } 
        // HIGH match
        else if (index === 1) {
          demoTxs.push({
            id: `TX-DEMO-${inv.id}`,
            date: new Date().toISOString().split('T')[0],
            partnerName: inv.customerName,
            purpose: `Dienstleistungen Social Media Consulting`,
            amount: inv.amountGross,
            matchedInvoice: inv,
            confidence: "HIGH",
            confidenceLabel: "Kunde & Betrag",
            status: "PENDING"
          });
        }
        // LOW match
        else {
          demoTxs.push({
            id: `TX-DEMO-${inv.id}`,
            date: new Date().toISOString().split('T')[0],
            partnerName: "Andere Firma GmbH",
            purpose: "Monatspauschale Support",
            amount: inv.amountGross,
            matchedInvoice: inv,
            confidence: "LOW",
            confidenceLabel: "Nur Betrag",
            status: "PENDING"
          });
        }
      });
    }

    // Add some random unmatched transaction
    demoTxs.push({
      id: "TX-DEMO-UNMATCHED-1",
      date: new Date().toISOString().split('T')[0],
      partnerName: "Google Ireland Ltd.",
      purpose: "Rückerstattung Google Ads Gutschrift",
      amount: 150.00,
      confidence: "NONE",
      confidenceLabel: "Keine Übereinstimmung",
      status: "PENDING"
    });

    demoTxs.push({
      id: "TX-DEMO-UNMATCHED-2",
      date: new Date().toISOString().split('T')[0],
      partnerName: "Max Mustermann",
      purpose: "Private Zahlung",
      amount: 85.00,
      confidence: "NONE",
      confidenceLabel: "Keine Übereinstimmung",
      status: "PENDING"
    });

    setTransactions(demoTxs);
    toast.success("Demo-Kontoauszug erfolgreich simuliert!");
  };

  const reconcileSingle = (txId: string, invoiceId: string, txDate: string, amount: number) => {
    updateInvoice(invoiceId, {
      status: "BEZAHLT",
      amountPaid: amount,
      history: [
        {
          date: new Date().toISOString(),
          action: `Bankabgleich: Kontoauszug-Eingang am ${txDate} verbucht`,
          user: "System"
        }
      ]
    });

    setTransactions(prev => 
      prev.map(tx => tx.id === txId ? { ...tx, status: "RECONCILED" as const } : tx)
    );
    toast.success(`Rechnung ${invoiceId} erfolgreich als bezahlt markiert!`);
  };

  const reconcileAllMatches = () => {
    let count = 0;
    transactions.forEach(tx => {
      if (tx.status === "PENDING" && tx.matchedInvoice && (tx.confidence === "EXACT" || tx.confidence === "HIGH")) {
        updateInvoice(tx.matchedInvoice.id, {
          status: "BEZAHLT",
          amountPaid: tx.amount,
          history: [
            {
              date: new Date().toISOString(),
              action: `Bankabgleich: Automatische Sammelbuchung am ${tx.date}`,
              user: "System"
            }
          ]
        });
        count++;
      }
    });

    if (count > 0) {
      setTransactions(prev => 
        prev.map(tx => (tx.status === "PENDING" && tx.matchedInvoice && (tx.confidence === "EXACT" || tx.confidence === "HIGH")) ? { ...tx, status: "RECONCILED" as const } : tx)
      );
      toast.success(`${count} Rechnungen wurden automatisch abgeglichen!`);
    } else {
      toast.info("Keine eindeutigen Übereinstimmungen zum automatischen Buchen vorhanden.");
    }
  };

  const discardTransaction = (txId: string) => {
    setTransactions(prev => 
      prev.map(tx => tx.id === txId ? { ...tx, status: "IGNORED" as const } : tx)
    );
    toast.info("Transaktion ignoriert.");
  };

  const resetAll = () => {
    setTransactions([]);
    setFileName("");
  };

  const pendingMatches = transactions.filter(tx => tx.status === "PENDING" && tx.matchedInvoice);
  const pendingCount = pendingMatches.length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-brand-secondary" />
          Bankabgleich (Kontoauszug-Abstimmung)
        </h3>
        <p className="text-[11px] text-gray-400 mt-1 font-medium leading-relaxed">
          Laden Sie Ihre monatliche Bank-Exportdatei (CSV) hoch. Unser System gleicht eingehende Zahlungen mit Ihren offenen Rechnungen ab.
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Drag & Drop Upload Zone */}
          <div className="lg:col-span-2">
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`h-[240px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 transition-all ${
                dragActive 
                  ? "border-brand-secondary bg-brand-secondary/5 scale-98" 
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center mb-3 shadow-inner text-gray-400">
                <UploadCloud className="h-5 w-5 text-gray-400" />
              </div>
              <h4 className="text-xs font-bold text-gray-900">Kontoauszug hochladen (.CSV)</h4>
              <p className="text-[10px] text-gray-400 max-w-sm mt-1.5 leading-relaxed font-medium">
                Sparkasse, Deutsche Bank, Volksbank, N26, Stripe, etc. werden automatisch eingelesen.
              </p>
              
              <div className="mt-4 flex items-center gap-3">
                <label className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md cursor-pointer">
                  Datei Auswählen
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
                
                <button 
                  onClick={simulateDemoData}
                  className="px-4 py-2 bg-brand-secondary/5 text-brand-secondary border border-brand-secondary/15 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-secondary/10 transition-all flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Demo-Daten simulieren</span>
                </button>
              </div>
            </div>
          </div>

          {/* Help / Instructions panel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 border-b border-gray-50 pb-1.5">Wie funktioniert es?</h4>
            <div className="space-y-3">
              <div className="flex gap-2.5">
                <div className="h-5 w-5 bg-gray-50 rounded flex items-center justify-center text-[10px] font-black text-gray-900 shrink-0">1</div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  Exportieren Sie Ihren Kontoauszug bei Ihrer Bank als <strong>CSV-Datei</strong>.
                </p>
              </div>
              <div className="flex gap-2.5">
                <div className="h-5 w-5 bg-gray-50 rounded flex items-center justify-center text-[10px] font-black text-gray-900 shrink-0">2</div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  Spalten wie Buchungstext, Betrag und Verwendungszweck werden automatisch erkannt.
                </p>
              </div>
              <div className="flex gap-2.5">
                <div className="h-5 w-5 bg-gray-50 rounded flex items-center justify-center text-[10px] font-black text-gray-900 shrink-0">3</div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  Betrag und Verwendungszweck werden mit <strong>offenen Rechnungen ({unpaidInvoices.length})</strong> abgeglichen.
                </p>
              </div>
              <div className="flex gap-2.5">
                <div className="h-5 w-5 bg-gray-50 rounded flex items-center justify-center text-[10px] font-black text-gray-900 shrink-0">4</div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                  Sie verbuchen Zuweisungen mit einem Klick sofort als <strong>Bezahlt</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File loaded stats header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-brand-secondary/5 text-brand-secondary text-[8px] font-bold uppercase tracking-wider rounded flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> {fileName}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">({transactions.length} Zeilen eingelesen)</span>
              </div>
              <h4 className="text-sm font-bold text-gray-900">{pendingCount} Übereinstimmungen gefunden</h4>
            </div>

            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <button 
                  onClick={reconcileAllMatches}
                  className="px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-md flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Alle Verbuchen</span>
                </button>
              )}
              <button 
                onClick={resetAll}
                className="px-4 py-2 bg-gray-50 text-gray-500 hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-gray-100"
              >
                Zurücksetzen
              </button>
            </div>
          </div>

          {/* Matched Transactions List */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Vorschlagsliste & Abgleich</h4>
            
            {transactions.filter(t => t.status === "PENDING").map((tx) => (
              <div 
                key={tx.id} 
                className={`bg-white rounded-2xl border p-4 flex flex-col lg:flex-row items-center justify-between gap-4 transition-all hover:shadow-sm ${
                  tx.matchedInvoice 
                    ? tx.confidence === "EXACT" || tx.confidence === "HIGH" 
                      ? "border-emerald-100 hover:border-emerald-200" 
                      : "border-orange-100 hover:border-orange-200" 
                    : "border-gray-100 bg-gray-50/10"
                }`}
              >
                {/* Left: Bank statement details */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{tx.date}</span>
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-[8px] font-bold uppercase tracking-wider">Kontoauszug</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 truncate" title={tx.partnerName}>{tx.partnerName}</h5>
                    <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5" title={tx.purpose}>{tx.purpose || 'Kein Verwendungszweck angegeben'}</p>
                  </div>
                  <div className="text-xs font-black text-emerald-600">
                    + €{tx.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Middle: Connection line / Indicator */}
                <div className="hidden lg:flex flex-col items-center justify-center px-2">
                  {tx.matchedInvoice ? (
                    <div className="h-6 w-6 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="h-2 w-px bg-gray-100 my-0.5" />
                </div>

                {/* Right: Matched invoice card */}
                <div className="flex-1 space-y-2 w-full lg:w-auto">
                  {tx.matchedInvoice ? (
                    <div className={`p-3 rounded-xl border ${
                      tx.confidence === "EXACT" || tx.confidence === "HIGH" 
                        ? "bg-emerald-50/20 border-emerald-100" 
                        : "bg-orange-50/20 border-orange-100"
                    }`}>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-gray-900">{tx.matchedInvoice.id}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest ${
                          tx.confidence === "EXACT" 
                            ? "bg-emerald-500 text-white" 
                            : tx.confidence === "HIGH" 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-orange-100 text-orange-700"
                        }`}>
                          {tx.confidenceLabel}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-800">{tx.matchedInvoice.customerName}</p>
                      <div className="flex justify-between items-center mt-3 border-t border-gray-100/50 pt-2">
                        <div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Summe</p>
                          <p className="text-xs font-bold text-gray-900 mt-0.5">€{tx.matchedInvoice.amountGross.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => reconcileSingle(tx.id, tx.matchedInvoice!.id, tx.date, tx.amount)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[8px] font-bold uppercase tracking-wider hover:scale-105 transition-all shadow-sm"
                          >
                            Verbuchen
                          </button>
                          <button 
                            onClick={() => discardTransaction(tx.id)}
                            className="p-1 bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                            title="Ignorieren"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-[90px] space-y-1">
                      <AlertCircle className="h-4 w-4 text-gray-300" />
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kein Vorschlag</p>
                      <p className="text-[9px] text-gray-400 leading-normal">ID oder Kunde nicht gefunden.</p>
                      <button 
                        onClick={() => discardTransaction(tx.id)}
                        className="text-[8px] font-bold uppercase tracking-wider text-gray-400 hover:text-red-500 transition-colors mt-1"
                      >
                        Ignorieren
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {transactions.filter(t => t.status === "PENDING").length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center space-y-3 shadow-sm">
                <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Alles abgeglichen!</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Alle Transaktionen aus dieser Bankdatei wurden erfolgreich abgeglichen, verbucht oder verworfen.
                </p>
                <button 
                  onClick={resetAll}
                  className="mt-4 px-4 py-2 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                >
                  Neue CSV einlesen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
