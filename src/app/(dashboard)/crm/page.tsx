"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore, Customer } from "@/store/data-store";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin, 
  ChevronRight,
  X,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export default function CRMPage() {
  const { user } = useAuthStore();
  const { customers, addCustomer, updateCustomer, deleteCustomer, teamMembers } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const canEditPayments = user?.role === "CEO" || user?.role === "Buchhaltung";
  
  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    email: "",
    status: "Active",
    color: "#3B82F6"
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
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
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Der Kundenname ist ein Pflichtfeld.");
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
      toast.success("Kunde erfolgreich aktualisiert");
    } else {
      const newCustomer: Customer = {
        ...formData as Customer,
        id: "c" + Date.now(),
      };
      addCustomer(newCustomer);
      toast.success("Kunde erfolgreich hinzugefügt");
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Möchten Sie diesen Kunden wirklich löschen?")) {
      deleteCustomer(id);
      toast.success("Kunde gelöscht");
    }
  };

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Kunden (CRM)</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Verwalten Sie Ihre Kundenbeziehungen und Leads zentral.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-brand-secondary text-white px-6 py-3 rounded-2xl text-sm font-bold hover:scale-105 transition-all shadow-lg shadow-brand-secondary/20"
        >
          <Plus className="h-5 w-5" />
          Kunde hinzufügen
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Suchen nach Name oder E-Mail..." 
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filter
           </button>
           <div className="h-10 w-px bg-gray-100 mx-2" />
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{filteredCustomers.length} Ergebnisse</p>
        </div>
      </div>

      {/* Customer List Card Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kunde / Firma</th>
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
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: customer.color }} />
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
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleOpenModal(customer)}
                      className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-all border border-gray-100"
                      title="Bearbeiten"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(customer.id)}
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 sm:p-8 border-b border-gray-50 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{editingCustomer ? "Kunde bearbeiten" : "Neuer Kunde"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-black transition-all">
                   <X className="h-5 w-5" />
                </button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kundenname (Ansprechpartner) *</label>
                       <input 
                        type="text" 
                        required
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                       />
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Firma (Company)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        value={formData.company || ""}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ansprechpartner (Details)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="z.B. Sarah Schmidt"
                        value={formData.contactPerson || ""}
                        onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">E-Mail Adresse</label>
                       <input 
                        type="email" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Telefonnummer</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="+43 664 1234567"
                        value={formData.phone || ""}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">UID-Nummer (VAT-ID)</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="ATU12345678"
                        value={formData.vatId || ""}
                        onChange={(e) => setFormData({...formData, vatId: e.target.value})}
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
                        value={formData.address || ""}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Zahlungsbedingungen</label>
                       <input 
                        type="text" 
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-bold"
                        placeholder="z.B. Zahlbar innerhalb von 14 Tagen"
                        value={formData.paymentTerms || ""}
                        onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                       />
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Notizen</label>
                       <textarea 
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs outline-none border border-transparent focus:border-black/5 focus:bg-white transition-all font-medium resize-none"
                        placeholder="Zusätzliche Infos..."
                        value={formData.notes || ""}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                       />
                    </div>

                    <div className="pt-2 space-y-3">
                      <label className="text-[10px] font-bold text-black uppercase tracking-widest">Social Media Plan</label>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-gray-400 uppercase">Monatlicher Preis (€)</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs outline-none font-bold"
                              value={formData.socialPlan?.price || ""}
                              onChange={(e) => setFormData({
                                ...formData, 
                                socialPlan: { ...formData.socialPlan!, price: Number(e.target.value) }
                              })}
                            />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-gray-400 uppercase">Wöchentliche Posts</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-gray-50 rounded-lg text-xs outline-none font-bold"
                              value={formData.socialPlan?.weeklyPosts || ""}
                              onChange={(e) => setFormData({
                                ...formData, 
                                socialPlan: { ...formData.socialPlan!, weeklyPosts: Number(e.target.value) }
                              })}
                            />
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-4 border-t border-gray-100">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-50 rounded-2xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-all">
                      Abbrechen
                   </button>
                   <button type="submit" className="flex-1 py-3 bg-brand-secondary text-white rounded-2xl text-xs font-bold hover:scale-[1.02] shadow-lg shadow-brand-secondary/20 transition-all flex items-center justify-center gap-2">
                      <Save className="h-4 w-4" />
                      {editingCustomer ? "Speichern" : "Erstellen"}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
      {/* Detail Modal */}
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
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verantwortlicher Mitarbeiter</p>
                     <p className="text-lg font-bold">
                        {teamMembers.find(m => m.id === selectedCustomer.assignedEmployeeId)?.fullName || "Nicht zugewiesen"}
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
                           className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${getStatusStyles(status)} ${canEditPayments ? 'hover:scale-105 active:scale-95' : 'cursor-default'}`}
                         >
                           <span className="text-[10px] font-bold uppercase">{monthNames[i]}</span>
                           <div className={`h-1.5 w-1.5 rounded-full ${status === 'FUTURE' ? 'bg-gray-200' : 'bg-white'}`} />
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
                 onClick={() => { setEditingCustomer(selectedCustomer); setFormData(selectedCustomer); setIsModalOpen(true); setSelectedCustomer(null); }}
                 className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
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
    </div>
  );
}
