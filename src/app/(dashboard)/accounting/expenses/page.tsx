"use client";

import { useState, useMemo } from "react";
import { useDataStore, Expense, SYSTEM_CATEGORIES } from "@/store/data-store";
import { 
  Plus, 
  Search, 
  ShoppingBag,
  Zap,
  Coffee,
  Car,
  X,
  Trash2,
  Save,
  Loader2,
  UploadCloud,
  Paperclip,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Client-side image compression using canvas
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log(`[Compression] Original: ${(file.size / 1024).toFixed(1)} KB, Compressed: ${(blob.size / 1024).toFixed(1)} KB`);
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = (err) => reject(err);
  });
};

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, projects, customers } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewExpense, setPreviewExpense] = useState<Expense | null>(null);
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  const [formData, setFormData] = useState<Partial<Expense>>({
    title: "",
    category: "Grafik/Druck",
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: "Bezahlt",
    projectId: "",
    projectName: "",
    customerId: "",
    customerName: "",
    fileUrl: "",
    fileName: "",
    fileSize: "",
    fileType: ""
  });

  const categories = SYSTEM_CATEGORIES.map(name => {
    let icon = ShoppingBag;
    let color = "text-gray-500 bg-gray-50";
    if (name === "Grafik/Druck") { icon = Zap; color = "text-pink-500 bg-pink-50"; }
    else if (name === "Web Design/SEO") { icon = Zap; color = "text-blue-500 bg-blue-50"; }
    else if (name === "Online Marketing") { icon = Zap; color = "text-orange-500 bg-orange-50"; }
    else if (name === "Foto/Video") { icon = Zap; color = "text-purple-500 bg-purple-50"; }
    else if (name === "Medya Avusturya") { icon = Zap; color = "text-emerald-500 bg-emerald-50"; }
    return { name, icon, color };
  });

  const filteredExpenses = expenses.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024 && file.type === "application/pdf") {
      toast.error("PDF-Dateien dürfen maximal 2 MB groß sein.");
      return;
    }

    setIsUploading(true);
    try {
      let finalBlob: Blob = file;
      let finalName = file.name;
      let finalType = file.type;

      if (file.type.startsWith("image/")) {
        try {
          finalBlob = await compressImage(file);
          if (finalBlob.size > 2 * 1024 * 1024) {
            toast.error("Das Bild ist auch nach der Komprimierung zu groß (> 2 MB).");
            setIsUploading(false);
            return;
          }
          finalType = "image/jpeg";
          if (!finalName.toLowerCase().endsWith(".jpg") && !finalName.toLowerCase().endsWith(".jpeg")) {
            finalName = finalName.split(".")[0] + ".jpg";
          }
        } catch (err) {
          console.error("Compression error:", err);
          finalBlob = file;
        }
      }

      const sizeStr = finalBlob.size > 1024 * 1024 
        ? `${(finalBlob.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(finalBlob.size / 1024)} KB`;

      const storageRef = ref(storage, `expenses/${Date.now()}_${finalName}`);
      const metadata = { contentType: finalType };
      const snapshot = await uploadBytes(storageRef, finalBlob, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      setFormData(prev => ({
        ...prev,
        fileUrl: downloadUrl,
        fileName: finalName,
        fileSize: sizeStr,
        fileType: finalType
      }));
      setUploadProgress(true);
      toast.success("Beleg erfolgreich verarbeitet und hochgeladen!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload fehlgeschlagen: ${error.message || error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      toast.error("Titel und Betrag sind erforderlich.");
      return;
    }

    const newExpense: Expense = {
      ...formData as Expense,
      id: "ex" + Date.now(),
    };
    addExpense(newExpense);
    toast.success("Ausgabe erfasst");
    
    // Reset Form
    setFormData({
      title: "",
      category: "Grafik/Druck",
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      status: "Bezahlt",
      projectId: "",
      projectName: "",
      customerId: "",
      customerName: "",
      fileUrl: "",
      fileName: "",
      fileSize: "",
      fileType: ""
    });
    setUploadProgress(false);
    setIsModalOpen(false);
  };

  const getCategoryTotal = (cat: string) => {
    return expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ausgaben</h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">Erfassen und kategorisieren Sie Ihre betrieblichen Ausgaben.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-md"
        >
          <Plus className="h-4 w-4" />
          Ausgabe erfassen
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.slice(0, 4).map((cat, i) => {
          const total = getCategoryTotal(cat.name);
          return (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">{cat.name}</p>
                <h3 className="text-base font-bold mt-1 tracking-tight text-gray-900">{formatCurrency(total)}</h3>
              </div>
              <div className="mt-3.5 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                <div className={`h-full ${cat.color.split(' ')[0]} w-[60%] rounded-full`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Suche..." 
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-black/5 outline-none font-bold text-gray-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filteredExpenses.map((exp) => {
            const cat = categories.find(c => c.name === exp.category) || categories[5];
            return (
              <div key={exp.id} className="py-2.5 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                    <cat.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate leading-snug">{exp.title}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>{exp.category}</span>
                      <span>•</span>
                      <span>{exp.date}</span>
                      {exp.projectName && (
                        <>
                          <span>•</span>
                          <span className="text-blue-500">PROJEKT: {exp.projectName}</span>
                        </>
                      )}
                      {exp.customerName && (
                        <>
                          <span>•</span>
                          <span className="text-violet-500">KUNDE: {exp.customerName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {exp.fileUrl && (
                    <button 
                      onClick={() => setPreviewExpense(exp)}
                      className="p-1 bg-gray-50 hover:bg-black hover:text-white rounded text-gray-400 transition-all shrink-0 border border-gray-100 flex items-center gap-1"
                      title="Beleg anzeigen"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">Beleg</span>
                    </button>
                  )}
                  <span className="text-xs font-bold text-red-500">-{formatCurrency(exp.amount)}</span>
                  <button 
                    onClick={() => { if(confirm("Ausgabe löschen?")) deleteExpense(exp.id); }}
                    className="text-red-200 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredExpenses.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-xs font-medium">Keine Ausgaben gefunden.</div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
             <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between bg-white">
                <h2 className="text-sm font-bold text-gray-900">Ausgabe erfassen</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black transition-all"><X className="h-5 w-5" /></button>
             </div>
             <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Zweck / Titel *</label>
                   <input 
                    type="text" required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-black/5 outline-none font-bold text-gray-800"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                   />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Kategorie</label>
                     <select 
                      className="w-full px-2.5 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none appearance-none font-bold text-gray-800"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                     >
                       {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Datum</label>
                     <input 
                       type="date" required
                       className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-black/5 outline-none font-bold text-gray-800"
                       value={formData.date}
                       onChange={(e) => setFormData({...formData, date: e.target.value})}
                     />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Projekt (Optional)</label>
                     <select 
                      className="w-full px-2.5 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none appearance-none font-bold text-gray-800"
                      value={formData.projectId || ""}
                      onChange={(e) => {
                        const p = projects.find(proj => proj.id === e.target.value);
                        setFormData({
                          ...formData, 
                          projectId: e.target.value,
                          projectName: p ? p.name : ""
                        });
                      }}
                     >
                       <option value="">Kein Projekt</option>
                       {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Kunde (Optional)</label>
                     <select 
                      className="w-full px-2.5 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none appearance-none font-bold text-gray-800"
                      value={formData.customerId || ""}
                      onChange={(e) => {
                        const c = customers.find(cust => cust.id === e.target.value);
                        setFormData({
                          ...formData, 
                          customerId: e.target.value,
                          customerName: c ? c.name : ""
                        });
                      }}
                     >
                       <option value="">Kein Kunde</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Betrag (€) *</label>
                   <input 
                     type="number" step="0.01" required
                     className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-black/5 outline-none font-bold text-gray-800"
                     value={formData.amount || ""}
                     onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                   />
                </div>

                {/* File Attachment Upload */}
                <div className="space-y-1.5">
                   <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">Beleg / Rechnung (PDF / JPG - Max 2MB)</label>
                   
                   {isUploading ? (
                     <div className="w-full py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5">
                       <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Wird verarbeitet...</span>
                     </div>
                   ) : uploadProgress ? (
                     <div className="w-full py-2 px-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between gap-3">
                       <div className="flex items-center gap-2 min-w-0">
                         <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center border border-emerald-100 shrink-0 text-emerald-500 font-bold text-[10px] uppercase">
                           {formData.fileType?.includes("pdf") ? "PDF" : "JPG"}
                         </div>
                         <div className="min-w-0">
                           <p className="text-[10px] font-bold text-emerald-800 truncate leading-snug">{formData.fileName}</p>
                           <p className="text-[8px] font-bold text-emerald-600 uppercase mt-0.5">{formData.fileSize}</p>
                         </div>
                       </div>
                       <button 
                         type="button"
                         onClick={() => {
                           setFormData(prev => ({
                             ...prev,
                             fileUrl: "",
                             fileName: "",
                             fileSize: "",
                             fileType: ""
                           }));
                           setUploadProgress(false);
                         }}
                         className="p-1 bg-white text-red-500 rounded border border-red-100 hover:scale-105 transition-all shrink-0"
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                       </button>
                     </div>
                   ) : (
                     <label className="w-full py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-gray-300 hover:bg-gray-100/50 transition-all">
                       <UploadCloud className="h-5 w-5 text-gray-400" />
                       <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">Datei auswählen / Kamera</span>
                       <input 
                         type="file" 
                         accept="image/*,application/pdf"
                         className="hidden"
                         onChange={handleFileChange}
                       />
                     </label>
                   )}
                </div>

                <button type="submit" className="w-full py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 shadow-md transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider">
                   <Save className="h-3.5 w-3.5" /> Ausgabe speichern
                </button>
             </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-gray-100">
            <div className="p-4 border-b border-gray-50 flex items-start justify-between shrink-0 gap-4 bg-white">
              <div>
                <h2 className="text-sm font-bold text-gray-900 truncate max-w-md">{previewExpense.title}</h2>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  <span>{previewExpense.category}</span>
                  <span>•</span>
                  <span>{previewExpense.date}</span>
                  <span>•</span>
                  <span>{previewExpense.fileSize}</span>
                  {previewExpense.projectName && (
                    <>
                      <span>•</span>
                      <span className="text-blue-500">PROJEKT: {previewExpense.projectName}</span>
                    </>
                  )}
                  {previewExpense.customerName && (
                    <>
                      <span>•</span>
                      <span className="text-violet-500">KUNDE: {previewExpense.customerName}</span>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setPreviewExpense(null)} 
                className="h-8 w-8 bg-gray-50 hover:bg-black hover:text-white rounded-full flex items-center justify-center text-gray-400 transition-all shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex items-center justify-center">
              {previewExpense.fileType?.includes("pdf") ? (
                <iframe 
                  src={previewExpense.fileUrl} 
                  className="w-full h-[55vh] border-none rounded-xl bg-white shadow-inner" 
                />
              ) : (
                <div className="max-w-full max-h-[55vh] overflow-hidden rounded-xl shadow-md border border-gray-100 flex items-center justify-center bg-white p-1.5">
                  <img 
                    src={previewExpense.fileUrl} 
                    alt="Beleg Vorschau" 
                    className="max-w-full max-h-[53vh] object-contain rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-50 flex items-center justify-between shrink-0 bg-white">
              <span className="text-xs font-bold text-red-500">-{formatCurrency(previewExpense.amount)}</span>
              <a 
                href={previewExpense.fileUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
              >
                <Eye className="h-3.5 w-3.5" /> In neuem Tab öffnen
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
