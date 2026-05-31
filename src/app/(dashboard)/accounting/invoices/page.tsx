"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  useDataStore, 
  Invoice, 
  InvoiceStatus, 
  RecurringInvoice,
  BankTransaction
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
  status: "PENDING" | "RECONCILED";
}

function BankReconciliationView({ invoices, updateInvoice }: { invoices: Invoice[]; updateInvoice: any }) {
  const { 
    bankTransactions = [], 
    addBankTransactions, 
    updateBankTransaction, 
    deleteBankTransaction, 
    clearBankTransactions 
  } = useDataStore();

  const [activeSubView, setActiveSubView] = useState<"IMPORT" | "MANUAL" | "AUTO" | "UNASSIGNED" | "HISTORY">("IMPORT");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [recentImportSummary, setRecentImportSummary] = useState<any | null>(null);
  
  // Search & Filter for History
  const [searchHistoryTerm, setSearchHistoryTerm] = useState("");
  const [filterHistoryStatus, setFilterHistoryStatus] = useState<string>("ALL");

  // Dropdown for manually assigning a different invoice
  const [assigningTxId, setAssigningTxId] = useState<string | null>(null);

  // Unpaid invoices for manual mapping
  const openInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status === "OFFEN" || inv.status === "OVERDUE");
  }, [invoices]);

  const parseAmountVal = (valStr: string): number => {
    if (!valStr) return 0;
    let clean = valStr.trim();
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(/,/g, '.');
    }
    clean = clean.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  };

  // String resemblance check
  const JaroWinklerDistance = (s1: string, s2: string): number => {
    const m1 = s1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const m2 = s2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (m1 === m2) return 1.0;
    if (m1.includes(m2) || m2.includes(m1)) return 0.85;
    return 0.0;
  };

  const findInvoiceByReference = (tx: Partial<BankTransaction>, openInvoices: Invoice[]) => {
    const searchTexts = [
      tx.paymentReference || '',
      tx.purpose || '',
      tx.bookingText || '',
      tx.documentData || ''
    ].map(t => t.toUpperCase());

    for (const inv of openInvoices) {
      const invIdUpper = inv.id.toUpperCase();
      const cleanInvId = inv.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const rawNum = inv.id.replace(/[^0-9]/g, '');

      for (const text of searchTexts) {
        if (!text) continue;
        const cleanText = text.replace(/[^a-zA-Z0-9]/g, '');
        
        if (
          text.includes(invIdUpper) ||
          (cleanInvId && cleanText.includes(cleanInvId)) ||
          (rawNum && rawNum.length >= 3 && cleanText.includes(rawNum))
        ) {
          return inv;
        }
      }
    }
    return null;
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
    
    const getColumnIndex = (kws: string[]) => {
      return headers.findIndex(h => kws.some(kw => h.includes(kw)));
    };

    const dateIdx = getColumnIndex(['buchungsdatum', 'buchung-datum', 'date', 'tag']);
    const valutaIdx = getColumnIndex(['valutadatum', 'valuta-datum', 'valuta']);
    const textIdx = getColumnIndex(['buchungstext', 'buchungs-text']);
    const currencyIdx = getColumnIndex(['währung', 'currency']);
    const amountIdx = getColumnIndex(['betrag', 'amount', 'umsatz']);
    const docDataIdx = getColumnIndex(['belegdaten', 'beleg-daten']);
    const docNumIdx = getColumnIndex(['belegnummer', 'beleg-nummer']);
    const partnerNameIdx = getColumnIndex(['auftraggebername', 'auftraggeber-name', 'name', 'sender']);
    const partnerAccIdx = getColumnIndex(['auftraggeberkonto', 'auftraggeber-konto', 'konto']);
    const partnerBlzIdx = getColumnIndex(['auftraggeber blz', 'auftraggeber-blz', 'blz']);
    const recNameIdx = getColumnIndex(['empfängername', 'empfänger-name']);
    const recAccIdx = getColumnIndex(['empfängerkonto', 'empfänger-konto']);
    const recBlzIdx = getColumnIndex(['empfänger blz', 'empfänger-blz']);
    const purposeIdx = getColumnIndex(['zahlungsgrund', 'zahlungs-grund', 'verwendungszweck']);
    const refIdx = getColumnIndex(['zahlungsreferenz', 'zahlungs-referenz', 'referenz']);
    const noteIdx = getColumnIndex(['interne notiz', 'notiz']);
    const realTimeIdx = getColumnIndex(['echtzeit', 'realtime']);

    if (amountIdx === -1) {
      toast.error("Betrag-Spalte konnte im CSV-Kontoauszug nicht automatisch ermittelt werden.");
      return;
    }

    const newTxs: BankTransaction[] = [];
    const openInvs = invoices.filter(inv => inv.status === "OFFEN" || inv.status === "OVERDUE");

    let countImported = 0;
    let countAlreadyExists = 0;
    let countIncome = 0;
    let countAutoConfirmed = 0;
    let countManualReview = 0;
    let countUnassigned = 0;
    let countIgnoredExpenses = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = parseLine(lines[i]);
      if (cells.length === 0) continue;

      const amountVal = parseAmountVal(cells[amountIdx] || '0');
      
      const tx: Partial<BankTransaction> = {
        bookingDate: dateIdx !== -1 ? cells[dateIdx] || '' : new Date().toISOString().split('T')[0],
        valueDate: valutaIdx !== -1 ? cells[valutaIdx] || '' : new Date().toISOString().split('T')[0],
        bookingText: textIdx !== -1 ? cells[textIdx] || '' : '',
        currency: currencyIdx !== -1 ? cells[currencyIdx] || 'EUR' : 'EUR',
        amount: amountVal,
        partnerName: partnerNameIdx !== -1 ? cells[partnerNameIdx] || 'Unbekannter Partner' : 'Unbekannter Partner',
        partnerAccount: partnerAccIdx !== -1 ? cells[partnerAccIdx] || '' : '',
        partnerBankCode: partnerBlzIdx !== -1 ? cells[partnerBlzIdx] || '' : '',
        recipientName: recNameIdx !== -1 ? cells[recNameIdx] || '' : '',
        recipientAccount: recAccIdx !== -1 ? cells[recAccIdx] || '' : '',
        recipientBankCode: recBlzIdx !== -1 ? cells[recBlzIdx] || '' : '',
        purpose: purposeIdx !== -1 ? cells[purposeIdx] || '' : '',
        paymentReference: refIdx !== -1 ? cells[refIdx] || '' : '',
        documentNumber: docNumIdx !== -1 ? cells[docNumIdx] || '' : '',
        documentData: docDataIdx !== -1 ? cells[docDataIdx] || '' : '',
        internalNote: noteIdx !== -1 ? cells[noteIdx] || '' : '',
        realTime: realTimeIdx !== -1 ? cells[realTimeIdx] || '' : ''
      };

      // Prevent Duplicates check
      const compositeHash = `${tx.bookingDate}_${tx.valueDate}_${tx.amount}_${tx.partnerName}_${tx.purpose}`.replace(/\s+/g, '');
      const isDuplicate = bankTransactions.some(existing => {
        const existingHash = `${existing.bookingDate}_${existing.valueDate}_${existing.amount}_${existing.partnerName}_${existing.purpose}`.replace(/\s+/g, '');
        return existingHash === compositeHash;
      });

      if (isDuplicate) {
        countAlreadyExists++;
        continue;
      }

      tx.id = `TX-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`;

      // Filter incoming positive bank transfers
      if (amountVal <= 0) {
        tx.matchStatus = "Ignoriert";
        tx.matchReason = "Ausgabe / negativer Betrag ignoriert";
        tx.confidenceScore = 0;
        countIgnoredExpenses++;
        newTxs.push(tx as BankTransaction);
        continue;
      }

      countIncome++;

      // Priority 1: Reference matching
      const matchedInv = findInvoiceByReference(tx, openInvs);

      if (matchedInv) {
        const amountMatches = Math.abs(amountVal - matchedInv.amountGross) < 0.05;
        if (amountMatches) {
          tx.matchStatus = "Automatisch bestätigt";
          tx.matchReason = "Referenznummer und Betrag stimmen überein";
          tx.confidenceScore = 100;
          tx.matchedInvoiceId = matchedInv.id;
          countAutoConfirmed++;

          // Auto Reconcile the invoice!
          updateInvoice(matchedInv.id, {
            status: "BEZAHLT_BANK",
            paymentMethod: "Bank transfer",
            amountPaid: amountVal,
            history: [
              {
                date: new Date().toISOString(),
                action: `Automatisch durch Bankabgleich am ${tx.bookingDate} als bezahlt verbucht`,
                user: "System"
              }
            ]
          });
        } else {
          tx.matchStatus = "Manuelle Prüfung";
          tx.matchReason = "Referenz gefunden, Betrag weicht ab";
          tx.confidenceScore = 80;
          tx.matchedInvoiceId = matchedInv.id;
          countManualReview++;
        }
      } else {
        // Priority 2: Amount matching
        const matchingAmountInvoices = openInvs.filter(inv => Math.abs(amountVal - inv.amountGross) < 0.05);

        if (matchingAmountInvoices.length === 1) {
          const inv = matchingAmountInvoices[0];
          const hasNameMatch = JaroWinklerDistance(tx.partnerName || '', inv.customerName) > 0.6;

          tx.matchStatus = "Vorschlag";
          tx.matchedInvoiceId = inv.id;

          if (hasNameMatch) {
            tx.matchReason = "Betrag stimmt exakt überein, Auftraggebername ähnelt dem Kundennamen";
            tx.confidenceScore = 70;
          } else {
            tx.matchReason = "Betrag stimmt exakt überein, aber keine Referenz gefunden";
            tx.confidenceScore = 50;
          }
          countManualReview++;
        } else if (matchingAmountInvoices.length > 1) {
          tx.matchStatus = "Mehrere mögliche Treffer";
          tx.matchReason = "Mehrere offene Rechnungen mit gleichem Betrag vorhanden";
          tx.confidenceScore = 40;
          tx.matchedInvoiceIds = matchingAmountInvoices.map(inv => inv.id);
          countManualReview++;
        } else {
          tx.matchStatus = "Nicht zugeordnet";
          tx.matchReason = "Kein passender Betrag oder Referenz gefunden";
          tx.confidenceScore = 0;
          countUnassigned++;
        }
      }

      newTxs.push(tx as BankTransaction);
      countImported++;
    }

    if (newTxs.length > 0) {
      addBankTransactions(newTxs);
    }

    setRecentImportSummary({
      imported: countImported,
      alreadyExists: countAlreadyExists,
      income: countIncome,
      autoConfirmed: countAutoConfirmed,
      manualReview: countManualReview,
      unassigned: countUnassigned,
      ignoredExpenses: countIgnoredExpenses
    });

    setActiveSubView("MANUAL");
    toast.success(`CSV Import abgeschlossen! ${countImported} neue Zeilen verbucht.`);
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
    setFileName("kontoauszug_österreich_simuliert.csv");
    const demoTxs: BankTransaction[] = [];
    const openInvs = invoices.filter(inv => inv.status === "OFFEN" || inv.status === "OVERDUE");

    if (openInvs.length > 0) {
      openInvs.forEach((inv, index) => {
        if (index === 0) {
          // Exact Reference & Amount Match (100% Auto Confirmed)
          demoTxs.push({
            id: `TX-SIM-${inv.id}`,
            bookingDate: new Date().toISOString().split('T')[0],
            valueDate: new Date().toISOString().split('T')[0],
            bookingText: "GUTSCHRIFT ONLINE BANKING",
            currency: "EUR",
            amount: inv.amountGross,
            partnerName: inv.customerName,
            purpose: `Rechnung ${inv.id} - Trada Space CRM`,
            matchStatus: "Automatisch bestätigt",
            matchReason: "Referenznummer und Betrag stimmen überein",
            confidenceScore: 100,
            matchedInvoiceId: inv.id
          });
          
          // Auto reconcile for demo
          updateInvoice(inv.id, {
            status: "BEZAHLT_BANK",
            paymentMethod: "Bank transfer",
            amountPaid: inv.amountGross,
            history: [
              {
                date: new Date().toISOString(),
                action: `Automatisch durch Bankabgleich als bezahlt verbucht`,
                user: "System"
              }
            ]
          });
        } else if (index === 1) {
          // Reference Found, Amount Differs (80% Manual Review)
          demoTxs.push({
            id: `TX-SIM-${inv.id}`,
            bookingDate: new Date().toISOString().split('T')[0],
            valueDate: new Date().toISOString().split('T')[0],
            bookingText: "SEPA-GUTSCHRIFT OB",
            currency: "EUR",
            amount: inv.amountGross + 10.00, // diff amount
            partnerName: inv.customerName,
            purpose: `Zahlungsref.: ${inv.id}`,
            matchStatus: "Manuelle Prüfung",
            matchReason: "Referenz gefunden, Betrag weicht ab",
            confidenceScore: 80,
            matchedInvoiceId: inv.id
          });
        } else if (index === 2) {
          // Amount matches, name resembles (70% suggestion)
          demoTxs.push({
            id: `TX-SIM-${inv.id}`,
            bookingDate: new Date().toISOString().split('T')[0],
            valueDate: new Date().toISOString().split('T')[0],
            bookingText: "ONLINE-UEBERWEISUNG",
            currency: "EUR",
            amount: inv.amountGross,
            partnerName: inv.customerName.slice(0, 8) + " Ltd.", // resembles name
            purpose: "Monatliche Betreuungspauschale Social Media",
            matchStatus: "Vorschlag",
            matchReason: "Betrag stimmt exakt überein, Auftraggebername ähnelt dem Kundennamen",
            confidenceScore: 70,
            matchedInvoiceId: inv.id
          });
        } else {
          // Only amount matches (50% suggestion)
          demoTxs.push({
            id: `TX-SIM-${inv.id}`,
            bookingDate: new Date().toISOString().split('T')[0],
            valueDate: new Date().toISOString().split('T')[0],
            bookingText: "SAMMEL-GUTSCHRIFT",
            currency: "EUR",
            amount: inv.amountGross,
            partnerName: "Andere Unbekannte GmbH",
            purpose: "Projektpauschale",
            matchStatus: "Vorschlag",
            matchReason: "Betrag stimmt exakt überein, aber keine Referenz gefunden",
            confidenceScore: 50,
            matchedInvoiceId: inv.id
          });
        }
      });
    }

    // Unmatched Google Refund (None)
    demoTxs.push({
      id: "TX-SIM-UNMATCHED-1",
      bookingDate: new Date().toISOString().split('T')[0],
      valueDate: new Date().toISOString().split('T')[0],
      bookingText: "GOOGLE IRELAND REFUND",
      currency: "EUR",
      amount: 150.00,
      partnerName: "Google Ireland Ltd.",
      purpose: "Google Ads Promo Ref",
      matchStatus: "Nicht zugeordnet",
      matchReason: "Kein passender Betrag oder Referenz gefunden",
      confidenceScore: 0
    });

    // Ignored negative expense
    demoTxs.push({
      id: "TX-SIM-IGNORED-1",
      bookingDate: new Date().toISOString().split('T')[0],
      valueDate: new Date().toISOString().split('T')[0],
      bookingText: "INTERNETANSCHLUSS KABEL",
      currency: "EUR",
      amount: -49.90,
      partnerName: "A1 Telekom Austria",
      purpose: "Monatsrechnung Internet Büro",
      matchStatus: "Ignoriert",
      matchReason: "Ausgabe / negativer Betrag ignoriert",
      confidenceScore: 0
    });

    addBankTransactions(demoTxs);
    
    setRecentImportSummary({
      imported: demoTxs.length,
      alreadyExists: 0,
      income: demoTxs.length - 1,
      autoConfirmed: openInvs.length > 0 ? 1 : 0,
      manualReview: Math.max(0, openInvs.length - 1),
      unassigned: 1,
      ignoredExpenses: 1
    });

    setActiveSubView("MANUAL");
    toast.success("Österreichischer Demo-Kontoauszug erfolgreich simuliert!");
  };

  const handleManualAction = (txId: string, invoiceId: string, action: "CONFIRM" | "UNASSIGN" | "IGNORE") => {
    const tx = bankTransactions.find(t => t.id === txId);
    if (!tx) return;

    if (action === "CONFIRM") {
      updateInvoice(invoiceId, {
        status: "BEZAHLT_BANK",
        paymentMethod: "Bank transfer",
        amountPaid: tx.amount,
        history: [
          {
            date: new Date().toISOString(),
            action: `Bankabgleich: Manuell bestätigt und am ${tx.bookingDate} verbucht`,
            user: "Admin"
          }
        ]
      });

      updateBankTransaction(txId, {
        matchStatus: "Automatisch bestätigt", // mark as reconciled / confirmed
        matchedInvoiceId: invoiceId,
        matchReason: "Manuell bestätigt"
      });

      toast.success(`Rechnung ${invoiceId} erfolgreich als bezahlt markiert!`);
    } else if (action === "UNASSIGN") {
      updateBankTransaction(txId, {
        matchStatus: "Nicht zugeordnet",
        matchedInvoiceId: undefined,
        matchedInvoiceIds: undefined,
        matchReason: "Vom Benutzer als nicht zugeordnet markiert",
        confidenceScore: 0
      });
      toast.info("Transaktion als nicht zugeordnet markiert.");
    } else if (action === "IGNORE") {
      updateBankTransaction(txId, {
        matchStatus: "Ignoriert",
        matchReason: "Vom Benutzer manuell ignoriert"
      });
      toast.info("Transaktion ignoriert.");
    }

    setAssigningTxId(null);
  };

  const resetAllTransactions = () => {
    if (confirm("Möchten Sie wirklich die gesamte Import-Historie löschen?")) {
      clearBankTransactions();
      setFileName("");
      setRecentImportSummary(null);
      setActiveSubView("IMPORT");
      toast.success("Import-Historie vollständig zurückgesetzt.");
    }
  };

  // Grouped Filter lists based on subviews
  const manualList = useMemo(() => {
    return bankTransactions.filter(t => 
      t.matchStatus === "Manuelle Prüfung" || 
      t.matchStatus === "Vorschlag" || 
      t.matchStatus === "Mehrere mögliche Treffer"
    );
  }, [bankTransactions]);

  const autoList = useMemo(() => {
    return bankTransactions.filter(t => t.matchStatus === "Automatisch bestätigt");
  }, [bankTransactions]);

  const unassignedList = useMemo(() => {
    return bankTransactions.filter(t => t.matchStatus === "Nicht zugeordnet");
  }, [bankTransactions]);

  const historyList = useMemo(() => {
    return bankTransactions.filter(t => {
      const matchesSearch = 
        t.partnerName.toLowerCase().includes(searchHistoryTerm.toLowerCase()) ||
        t.purpose.toLowerCase().includes(searchHistoryTerm.toLowerCase()) ||
        t.bookingText.toLowerCase().includes(searchHistoryTerm.toLowerCase());
      
      const matchesStatus = filterHistoryStatus === "ALL" || t.matchStatus === filterHistoryStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [bankTransactions, searchHistoryTerm, filterHistoryStatus]);

  const getStatusPillColor = (status: string) => {
    switch (status) {
      case "Automatisch bestätigt": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Manuelle Prüfung": return "bg-orange-50 text-orange-600 border-orange-100";
      case "Vorschlag": return "bg-blue-50 text-blue-600 border-blue-100";
      case "Mehrere mögliche Treffer": return "bg-purple-50 text-purple-600 border-purple-100";
      case "Nicht zugeordnet": return "bg-gray-50 text-gray-500 border-gray-100";
      case "Ignoriert": return "bg-red-50 text-red-400 border-red-100";
      default: return "bg-gray-50 text-gray-400 border-gray-100";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Intro Header */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-brand-secondary animate-pulse" />
            Kontoauszug-Abgleich (Bank Reconciliation)
          </h3>
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-2xl">
            Importieren Sie Ihre Bankauszüge im CSV-Format. Unser System gleicht Zahlungseingänge automatisch über Rechnungsnummern und Beträge mit offenen Rechnungen ab.
          </p>
        </div>
        {bankTransactions.length > 0 && (
          <button 
            onClick={resetAllTransactions}
            className="px-4 py-2 border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0"
          >
            Historie Löschen
          </button>
        )}
      </div>

      {/* Subnavigation Tabs */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-px overflow-x-auto whitespace-nowrap hide-scrollbar">
        {[
          { id: "IMPORT", label: "CSV-Import", count: null },
          { id: "MANUAL", label: "Manuelle Prüfung", count: manualList.length },
          { id: "AUTO", label: "Automatisch bestätigt", count: autoList.length },
          { id: "UNASSIGNED", label: "Nicht zugeordnet", count: unassignedList.length },
          { id: "HISTORY", label: "Import-Historie", count: bankTransactions.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubView(tab.id as any)}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeSubView === tab.id 
                ? "text-black border-black" 
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                activeSubView === tab.id ? "bg-black text-white" : "bg-gray-50 text-gray-400 border border-gray-100"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* VIEW: CSV IMPORT */}
      {activeSubView === "IMPORT" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`h-[280px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 transition-all ${
                dragActive 
                  ? "border-brand-secondary bg-brand-secondary/5 scale-98 shadow-inner" 
                  : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
              }`}
            >
              <div className="h-14 w-14 bg-neutral-900/5 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
                <UploadCloud className="h-7 w-7 text-neutral-800" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">Kontoauszug-Datei hochladen (.CSV)</h4>
              <p className="text-[10px] text-gray-400 max-w-sm mt-2 leading-relaxed font-medium">
                Verwenden Sie den CSV-Export Ihrer Bank (z.B. Sparkasse, Erste Bank, Raiffeisen, Deutsche Bank). Die Datei wird per Semikolon und mit robustem Zeichen-Encoding eingelesen.
              </p>
              
              <div className="mt-6 flex items-center gap-3">
                <label className="px-5 py-3 bg-black text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer">
                  Datei Auswählen
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                </label>
                
                <button 
                  onClick={simulateDemoData}
                  className="px-5 py-3 bg-brand-secondary/5 text-brand-secondary border border-brand-secondary/15 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-secondary/10 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                  <span>Demo-Daten simulieren</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 shadow-sm text-xs">
            <h4 className="text-xs font-black text-gray-900 border-b border-gray-50 pb-2 uppercase tracking-wider">Verarbeitete Spalten</h4>
            <p className="text-[10px] text-gray-400 leading-normal font-medium">Die CSV-Datei sollte Semikolon-getrennt vorliegen. Folgende Felder werden für den automatischen Abgleich ausgewertet:</p>
            <ul className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-bold">
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Buchungsdatum</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Valutadatum</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Betrag (positive Werte)</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Auftraggebername</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Zahlungsgrund</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Zahlungsreferenz</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Buchungstext</li>
               <li className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Belegnummer</li>
            </ul>
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-[10px] text-blue-600 leading-normal font-semibold">
               <strong>Hinweis:</strong> Nur Kombinationen aus passender Referenz/Rechnungsnummer + übereinstimmendem Betrag werden automatisch freigegeben. Reine Betrag-Matches bedürfen stets einer Freigabe.
            </div>
          </div>
        </div>
      )}

      {/* VIEW: RECENT IMPORT SUMMARY */}
      {recentImportSummary && (
        <div className="bg-gray-50/70 border border-gray-100 rounded-3xl p-6 grid grid-cols-2 md:grid-cols-7 gap-4 text-center items-center shadow-inner animate-in fade-in duration-200">
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Neu Importiert</p>
              <h4 className="text-xl font-black text-gray-900">{recentImportSummary.imported}</h4>
           </div>
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Duplikate (Übersprungen)</p>
              <h4 className="text-xl font-black text-gray-500">{recentImportSummary.alreadyExists}</h4>
           </div>
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Zahlungseingänge</p>
              <h4 className="text-xl font-black text-emerald-600">{recentImportSummary.income}</h4>
           </div>
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Automatisch Verbucht</p>
              <h4 className="text-xl font-black text-emerald-600 flex items-center justify-center gap-1">
                 {recentImportSummary.autoConfirmed}
                 <Check className="h-4 w-4 text-emerald-500" />
              </h4>
           </div>
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Prüfvorschläge</p>
              <h4 className="text-xl font-black text-orange-500">{recentImportSummary.manualReview}</h4>
           </div>
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Nicht Zugeordnet</p>
              <h4 className="text-xl font-black text-gray-400">{recentImportSummary.unassigned}</h4>
           </div>
           <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Ignorierte Ausgaben</p>
              <h4 className="text-xl font-black text-red-400">{recentImportSummary.ignoredExpenses}</h4>
           </div>
        </div>
      )}

      {/* VIEW: MANUELLE PRÜFUNG */}
      {activeSubView === "MANUAL" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auszustehende manuelle Bestätigungen ({manualList.length})</h4>
          </div>

          {manualList.length > 0 ? (
            <div className="space-y-4">
              {manualList.map((tx) => {
                const suggestedInv = invoices.find(inv => inv.id === tx.matchedInvoiceId);
                const isMultiple = tx.matchStatus === "Mehrere mögliche Treffer";
                const possibleInvoices = tx.matchedInvoiceIds ? invoices.filter(inv => tx.matchedInvoiceIds?.includes(inv.id)) : [];

                return (
                  <div 
                    key={tx.id} 
                    className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col xl:flex-row justify-between gap-6 hover:shadow-md transition-all border-l-4 border-l-orange-500"
                  >
                     {/* Left: Transaction details */}
                     <div className="flex-1 space-y-4 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="text-[10px] font-extrabold text-gray-400">{tx.bookingDate}</span>
                           <span className="text-[8px] px-1.5 py-0.5 font-bold uppercase tracking-wider bg-gray-50 border border-gray-100 rounded text-gray-400">SEPA-Eingang</span>
                        </div>
                        <div className="space-y-1">
                           <h5 className="text-sm font-black text-gray-900 truncate">{tx.partnerName}</h5>
                           {tx.partnerAccount && <p className="text-[9px] font-bold text-gray-400 uppercase">Konto: {tx.partnerAccount} {tx.partnerBankCode ? `• BLZ: ${tx.partnerBankCode}` : ''}</p>}
                           <p className="text-xs text-gray-500 leading-normal whitespace-pre-line bg-gray-50 p-3 rounded-2xl border border-gray-50 mt-2 font-medium" title={tx.purpose}>
                              {tx.purpose || 'Kein Verwendungszweck angegeben'}
                           </p>
                        </div>
                        <div className="text-base font-extrabold text-emerald-600">
                           + {formatCurrency(tx.amount)}
                        </div>
                     </div>

                     {/* Right: Suggested Invoice / Matching Card */}
                     <div className="flex-1 w-full xl:max-w-md bg-gray-50/50 border border-gray-100/50 p-5 rounded-3xl flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                           <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Abgleichvorschlag</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${getStatusPillColor(tx.matchStatus)}`}>
                                 {tx.matchStatus} ({tx.confidenceScore}%)
                              </span>
                           </div>
                           <p className="text-[10px] text-gray-500 font-bold italic leading-relaxed">
                              Match-Grund: {tx.matchReason}
                           </p>
                        </div>

                        {/* Multiple potential matches choice */}
                        {isMultiple && possibleInvoices.length > 0 && (
                          <div className="space-y-2 mt-2">
                             <p className="text-[9px] font-black text-gray-400 uppercase">Bitte Rechnung manuell auswählen:</p>
                             <div className="space-y-1.5">
                                {possibleInvoices.map(inv => (
                                   <button
                                     key={inv.id}
                                     onClick={() => handleManualAction(tx.id, inv.id, "CONFIRM")}
                                     className="w-full text-left bg-white border border-gray-100 hover:border-brand-secondary/40 p-2.5 rounded-xl transition-all flex items-center justify-between text-xs font-bold group"
                                   >
                                      <div>
                                         <p className="text-gray-900">{inv.id} ({inv.customerName})</p>
                                         <p className="text-[9px] text-gray-400 font-medium">Datum: {inv.date}</p>
                                      </div>
                                      <span className="text-brand-secondary group-hover:underline text-[10px]">Auswählen</span>
                                   </button>
                                ))}
                             </div>
                          </div>
                        )}

                        {/* Single matched invoice */}
                        {!isMultiple && suggestedInv && (
                          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2 text-xs">
                             <div className="flex justify-between items-center font-bold text-gray-900">
                                <span>{suggestedInv.id}</span>
                                <span>{formatCurrency(suggestedInv.amountGross)}</span>
                             </div>
                             <p className="font-extrabold text-gray-800">{suggestedInv.customerName}</p>
                             <p className="text-[9px] text-gray-400 font-semibold">Netto: {formatCurrency(suggestedInv.amountNet)} • Erstellt am: {suggestedInv.date}</p>
                             
                             <div className="pt-3 flex gap-2 border-t border-gray-50 mt-2">
                                <button
                                  onClick={() => handleManualAction(tx.id, suggestedInv.id, "CONFIRM")}
                                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                                >
                                   Bestätigen
                                </button>
                                <button
                                  onClick={() => setAssigningTxId(assigningTxId === tx.id ? null : tx.id)}
                                  className="px-2.5 py-2 border border-gray-100 bg-gray-50 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-gray-100 transition-all"
                                >
                                   Abweichend zuordnen
                                </button>
                             </div>
                          </div>
                        )}

                        {/* Assign Different Invoice Dropdown panel */}
                        {(assigningTxId === tx.id || (!suggestedInv && !isMultiple)) && (
                          <div className="space-y-2 bg-white border border-gray-100 p-4 rounded-2xl">
                             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rechnung manuell zuweisen</label>
                             <select
                               onChange={(e) => {
                                 if (e.target.value) {
                                   handleManualAction(tx.id, e.target.value, "CONFIRM");
                                 }
                               }}
                               defaultValue=""
                               className="w-full bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-2 py-2 outline-none"
                             >
                                <option value="" disabled>Rechnung auswählen...</option>
                                {openInvoices.map(inv => (
                                   <option key={inv.id} value={inv.id}>
                                      {inv.id} - {inv.customerName} ({formatCurrency(inv.amountGross)})
                                   </option>
                                ))}
                             </select>
                          </div>
                        )}

                        <div className="flex gap-2 justify-end text-[9px] font-black uppercase mt-1">
                           <button 
                             onClick={() => handleManualAction(tx.id, '', "UNASSIGN")}
                             className="text-gray-400 hover:text-gray-600 transition-colors"
                           >
                              Als nicht zugeordnet markieren
                           </button>
                           <span className="text-gray-200">•</span>
                           <button 
                             onClick={() => handleManualAction(tx.id, '', "IGNORE")}
                             className="text-red-400 hover:text-red-650 transition-colors"
                           >
                              Ignorieren
                           </button>
                        </div>
                     </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center space-y-3 shadow-sm">
               <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                  <Check className="h-6 w-6" />
               </div>
               <h4 className="text-sm font-bold text-gray-900">Keine Prüffälle offen!</h4>
               <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  Alle importierten Zahlungseingänge sind entweder bereits automatisch bestätigt, manuell verbucht oder ignoriert.
               </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW: AUTOMATISCH BESTÄTIGT */}
      {activeSubView === "AUTO" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Automatisch oder manuell verarbeitete Zahlungen ({autoList.length})</h4>
          </div>

          {autoList.length > 0 ? (
            <div className="overflow-x-auto border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
               <table className="w-full text-left text-xs">
                  <thead>
                     <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Datum</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Auftraggeber</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Zahlungsgrund / Verwendungszweck</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Zugeordnete Rechnung</th>
                        <th className="px-5 py-3.5 text-right font-bold text-gray-400 uppercase tracking-wider">Betrag</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                     {autoList.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors">
                           <td className="px-5 py-4 text-gray-400 font-bold">{tx.bookingDate}</td>
                           <td className="px-5 py-4 font-bold text-gray-900">{tx.partnerName}</td>
                           <td className="px-5 py-4 text-[10px] leading-relaxed max-w-xs truncate" title={tx.purpose}>{tx.purpose || "-"}</td>
                           <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-[10px] font-bold text-emerald-600 border border-emerald-100/50">
                                 <Check className="h-3 w-3" />
                                 {tx.matchedInvoiceId}
                              </span>
                           </td>
                           <td className="px-5 py-4 text-right font-extrabold text-emerald-600">+ {formatCurrency(tx.amount)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center space-y-3 shadow-sm">
               <AlertCircle className="h-10 w-10 text-gray-200 mx-auto" />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Noch keine bestätigten Zahlungen vorhanden.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW: NICHT ZUGEORDNET */}
      {activeSubView === "UNASSIGNED" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nicht zugeordnete Banktransaktionen ({unassignedList.length})</h4>
          </div>

          {unassignedList.length > 0 ? (
            <div className="space-y-4">
              {unassignedList.map((tx) => (
                <div 
                  key={tx.id} 
                  className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                   <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-bold text-gray-400">{tx.bookingDate}</span>
                         <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[8px] font-bold text-gray-400 uppercase">Nicht Zugewiesen</span>
                      </div>
                      <h5 className="text-xs font-black text-gray-900 truncate">{tx.partnerName}</h5>
                      <p className="text-[10px] text-gray-400 leading-normal truncate">{tx.purpose || 'Kein Verwendungszweck'}</p>
                      <p className="text-xs font-extrabold text-gray-900">+ {formatCurrency(tx.amount)}</p>
                   </div>
                   
                   <div className="w-full md:w-auto flex items-center gap-3 shrink-0">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleManualAction(tx.id, e.target.value, "CONFIRM");
                          }
                        }}
                        defaultValue=""
                        className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-xl px-3 py-2.5 outline-none cursor-pointer"
                      >
                         <option value="" disabled>Rechnung zuweisen...</option>
                         {openInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>
                               {inv.id} - {inv.customerName} ({formatCurrency(inv.amountGross)})
                            </option>
                         ))}
                      </select>
                      <button 
                        onClick={() => handleManualAction(tx.id, '', "IGNORE")}
                        className="px-3 py-2.5 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                         Verwerfen
                      </button>
                   </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center space-y-3 shadow-sm">
               <Check className="h-10 w-10 text-emerald-500 mx-auto bg-emerald-50 rounded-full p-2" />
               <h4 className="text-sm font-bold text-gray-900">Keine nicht-zugeordneten Umsätze</h4>
               <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">Alle Zahlungseingänge konnten erfolgreich mit Rechnungen verknüpft werden.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW: IMPORT HISTORY */}
      {activeSubView === "HISTORY" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 px-1">
            <div>
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alle importierten Transaktionen ({historyList.length})</h4>
            </div>
            
            {/* Filter Panel inside History */}
            <div className="flex flex-wrap items-center gap-3">
               <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Suche..."
                    value={searchHistoryTerm}
                    onChange={(e) => setSearchHistoryTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-black shadow-sm"
                  />
               </div>
               <select
                 value={filterHistoryStatus}
                 onChange={(e) => setFilterHistoryStatus(e.target.value)}
                 className="bg-white border border-gray-100 text-xs font-bold rounded-xl px-3 py-2 outline-none shadow-sm cursor-pointer"
               >
                  <option value="ALL">Alle Stati</option>
                  <option value="Automatisch bestätigt">Bestätigt</option>
                  <option value="Manuelle Prüfung">Manuelle Prüfung</option>
                  <option value="Vorschlag">Vorschlag</option>
                  <option value="Mehrere mögliche Treffer">Mehrere Treffer</option>
                  <option value="Nicht zugeordnet">Nicht zugeordnet</option>
                  <option value="Ignoriert">Ignoriert</option>
               </select>
            </div>
          </div>

          {historyList.length > 0 ? (
            <div className="overflow-x-auto border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
               <table className="w-full text-left text-xs">
                  <thead>
                     <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Datum</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Auftraggeber</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Buchungstext / Zweck</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider">Abgleich Status</th>
                        <th className="px-5 py-3.5 font-bold text-gray-400 uppercase tracking-wider text-right">Betrag</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                     {historyList.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50/30 transition-colors">
                           <td className="px-5 py-4 text-gray-400 font-bold">{tx.bookingDate}</td>
                           <td className="px-5 py-4 font-bold text-gray-900">{tx.partnerName}</td>
                           <td className="px-5 py-4 text-[10px] leading-relaxed max-w-xs truncate" title={tx.purpose}>
                              <p className="font-bold text-gray-800">{tx.bookingText || "-"}</p>
                              <p className="text-gray-400 mt-0.5 font-medium">{tx.purpose || "-"}</p>
                           </td>
                           <td className="px-5 py-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getStatusPillColor(tx.matchStatus)}`}>
                                 {tx.matchStatus}
                              </span>
                           </td>
                           <td className={`px-5 py-4 text-right font-extrabold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tx.amount > 0 ? `+ ${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center space-y-3 shadow-sm">
               <AlertCircle className="h-10 w-10 text-gray-200 mx-auto" />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keine Transaktionen gefunden.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
