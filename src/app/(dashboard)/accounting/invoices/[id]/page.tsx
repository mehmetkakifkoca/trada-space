"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  useDataStore, 
  Invoice, 
  InvoicePosition, 
  InvoiceType, 
  Customer, 
  Product,
  SavedPosition,
  SYSTEM_CATEGORIES,
  LEISTUNGS_CATEGORIES
} from "@/store/data-store";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  ArrowLeft, 
  Search, 
  ChevronDown, 
  Layout, 
  Type, 
  Euro, 
  Globe, 
  Calendar as CalendarIcon,
  UserPlus,
  Package,
  Settings,
  FileText,
  Percent,
  CheckCircle2,
  X,
  Copy,
  Printer,
  Eye,
  Clock,
  Star,
  Bookmark
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const UNITS = ["hour", "piece", "day", "month", "project", "package"] as const;
const LANGUAGES = ["German", "English", "Turkish"] as const;
const TAX_MODES = ["Austria", "Germany", "EU", "non-EU"] as const;
const INVOICE_TYPES = [
  "Standardrechnung", 
  "Angebot", 
  "Anzahlung", 
  "Teilrechnung", 
  "Schlussrechnung", 
  "Wiederkehrende Rechnung", 
  "Gutschrift", 
  "Stornorechnung"
];

export default function InvoiceEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const printFlag = searchParams.get("print") === "true";
  const isNew = id === "new";

  const { 
    invoices, 
    deleteInvoice, 
    updateInvoice, 
    addInvoice,
    invoiceSettings,
    customers,
    addCustomer,
    products,
    savedPositions,
    addSavedPosition,
    deleteSavedPosition
  } = useDataStore();

  // Selected PDF Design Template
  const [selectedTemplate, setSelectedTemplate] = useState<"modern" | "classic" | "creative">("modern");

  // State
  const [invoice, setInvoice] = useState<Partial<Invoice>>({
    id: "",
    type: "Standardrechnung" as any,
    customerId: "",
    customerName: "",
    email: "",
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: "14 Tage netto",
    currency: "EUR",
    language: "German",
    taxMode: "Austria",
    amountNet: 0,
    amountVat: 0,
    amountGross: 0,
    amountPaid: 0,
    status: "ENTWURF",
    positions: [],
    introText: "",
    footerText: "",
    pdfTemplate: "modern"
  });

  const [activeTab, setActiveTab] = useState<"data" | "payments" | "history">("data");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSavedPositionsModalOpen, setIsSavedPositionsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Dirty State Exit Warnings
  const [isDirty, setIsDirty] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const shouldIgnoreDirtyRef = useRef(true);

  // Hydrate from existing invoice
  useEffect(() => {
    if (!isNew && invoices.length > 0) {
      const existing = invoices.find(inv => inv.id === id);
      if (existing) {
        setInvoice(existing);
        if (existing.pdfTemplate) {
          setSelectedTemplate(existing.pdfTemplate as any);
        }
        setTimeout(() => {
          setIsDirty(false);
          shouldIgnoreDirtyRef.current = false;
        }, 100);
      }
    }
  }, [id, isNew, invoices]);

  // Set default settings for new invoice
  useEffect(() => {
    if (isNew && invoiceSettings) {
      const date = new Date();
      const year = date.getFullYear();
      const num = String(invoiceSettings.nextNumber || 1).padStart(3, '0');
      setInvoice(prev => ({
        ...prev,
        id: `RE-${year}-${num}`,
        paymentTerms: invoiceSettings.defaultPaymentTerms,
        currency: invoiceSettings.defaultCurrency,
        language: invoiceSettings.defaultLanguage,
        footerText: invoiceSettings.defaultFooter
      }));
      setTimeout(() => {
        setIsDirty(false);
        shouldIgnoreDirtyRef.current = false;
      }, 100);
    }
  }, [isNew, invoiceSettings]);

  // Track Unsaved Changes
  useEffect(() => {
    if (shouldIgnoreDirtyRef.current) {
      return;
    }
    setIsDirty(true);
  }, [invoice]);

  // Browser Exit Warnings (Tab closure / page reload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Sie haben ungespeicherte Änderungen. Möchten Sie diese als Entwurf speichern?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Exit Prompt helper with saving options
  const handleExitPrompt = (targetUrl: string) => {
    const confirmExit = confirm(
      "Sie haben ungespeicherte Änderungen.\n\nMöchten Sie diese Änderungen jetzt als ENTWURF speichern?\n\n[OK] = Als Entwurf speichern & verlassen\n[Abbrechen] = Änderungen verwerfen & verlassen"
    );
    if (confirmExit) {
      saveAsDraftAndRedirect(targetUrl);
    } else {
      setIsDirty(false);
      router.push(targetUrl);
    }
  };

  // Client-side Navigation Guard (Sidebar, top links, etc.)
  useEffect(() => {
    if (!isDirty) return;

    const handleAnchorClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement;
      while (target && target.tagName !== "A") {
        target = target.parentElement as HTMLElement;
      }

      if (target && target.tagName === "A") {
        const href = target.getAttribute("href");
        if (href && !href.startsWith("#") && target.getAttribute("target") !== "_blank") {
          e.preventDefault();
          e.stopPropagation();
          handleExitPrompt(href);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => document.removeEventListener("click", handleAnchorClick, true);
  }, [isDirty, invoice, selectedTemplate]);

  // Print on direct flag
  useEffect(() => {
    if (printFlag && invoice.id) {
      setTimeout(() => window.print(), 1000);
    }
  }, [printFlag, invoice.id]);

  // Calculations (Dynamic subtotal based on Price and Discount, quantity is hidden and defaulted to 1)
  const getPositionNetSubtotal = (pos: InvoicePosition) => {
    const itemTotal = pos.priceNet;
    if (pos.discountType === "FIXED") {
      return Math.max(0, itemTotal - (pos.discountValue || 0));
    } else {
      const discountPercent = pos.discountValue !== undefined ? pos.discountValue : pos.discountPercent;
      return itemTotal * (1 - (discountPercent || 0) / 100);
    }
  };

  const totals = useMemo(() => {
    const net = invoice.positions?.reduce((acc, pos) => {
      if (pos.type !== 'item') return acc;
      return acc + getPositionNetSubtotal(pos);
    }, 0) || 0;

    const vat = invoice.positions?.reduce((acc, pos) => {
      if (pos.type !== 'item') return acc;
      const netSub = getPositionNetSubtotal(pos);
      return acc + (netSub * (pos.vatRate / 100));
    }, 0) || 0;

    return { net, vat, gross: net + vat };
  }, [invoice.positions]);

  useEffect(() => {
    setInvoice(prev => ({
      ...prev,
      amountNet: totals.net,
      amountVat: totals.vat,
      amountGross: totals.gross
    }));
  }, [totals]);

  // Actions
  const handleAddPosition = (type: InvoicePosition['type'] = 'item') => {
    const newPos: InvoicePosition = {
      id: Math.random().toString(36).substr(2, 9),
      name: type === 'item' ? "" : type.toUpperCase(),
      description: "",
      quantity: 1,
      unit: "piece",
      priceNet: 0,
      vatRate: invoiceSettings.defaultVatRate === 19 ? 20 : (invoiceSettings.defaultVatRate || 20),
      discountPercent: 0,
      type,
      category: "",
      priceGross: 0,
      priceType: "NET",
      discountType: "PERCENT",
      discountValue: 0
    };
    setInvoice(prev => ({
      ...prev,
      positions: [...(prev.positions || []), newPos]
    }));
  };

  const updatePosition = (id: string, updates: Partial<InvoicePosition>) => {
    setInvoice(prev => ({
      ...prev,
      positions: prev.positions?.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const removePosition = (id: string) => {
    setInvoice(prev => ({
      ...prev,
      positions: prev.positions?.filter(p => p.id !== id)
    }));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(invoice.positions || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setInvoice(prev => ({ ...prev, positions: items }));
  };

  // Saved Positions Library handlers
  const handleAddSavedPosition = (sp: SavedPosition) => {
    const newPos: InvoicePosition = {
      id: Math.random().toString(36).substr(2, 9),
      name: sp.name,
      description: sp.description,
      quantity: 1,
      unit: "piece",
      priceNet: sp.priceNet,
      vatRate: sp.vatRate,
      category: sp.category || "",
      priceType: sp.priceType || "NET",
      priceGross: sp.priceGross || (sp.priceNet * (1 + sp.vatRate / 100)),
      discountPercent: 0,
      discountType: "PERCENT",
      discountValue: 0,
      type: "item"
    };
    setInvoice(prev => ({
      ...prev,
      positions: [...(prev.positions || []), newPos]
    }));
    setIsSavedPositionsModalOpen(false);
    toast.success("Position aus Dienstleistungs-Bibliothek eingefügt!");
  };

  const handleSaveToLibrary = (pos: InvoicePosition) => {
    const newSaved: SavedPosition = {
      id: "sp-" + Date.now(),
      name: pos.name,
      description: pos.description,
      priceNet: pos.priceNet,
      vatRate: pos.vatRate,
      category: pos.category || "",
      priceType: pos.priceType || "NET",
      priceGross: pos.priceGross || (pos.priceNet * (1 + pos.vatRate / 100))
    };
    addSavedPosition(newSaved);
    toast.success("Als fertige Dienstleistungsvorlage gespeichert!");
  };

  const saveAsDraftAndRedirect = (redirectTo: string) => {
    const draftInvoice = {
      ...invoice,
      id: invoice.id || `RE-DRAFT-${Date.now()}`,
      customerId: invoice.customerId || "c_draft",
      customerName: invoice.customerName || "Entwurf Kunde",
      email: invoice.email || "draft@trada.space",
      date: invoice.date || new Date().toISOString().split('T')[0],
      dueDate: invoice.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentTerms: invoice.paymentTerms || "14 Tage netto",
      positions: invoice.positions || [],
      amountNet: totals.net,
      amountVat: totals.vat,
      amountGross: totals.gross,
      status: "ENTWURF" as const,
      pdfTemplate: selectedTemplate
    } as Invoice;

    if (isNew) {
      addInvoice(draftInvoice);
    } else {
      // Use original URL param `id` to find record, not the potentially-changed draftInvoice.id
      updateInvoice(id, draftInvoice);
    }
    
    setIsDirty(false); // Reset dirty state
    toast.success("Änderungen als Entwurf gespeichert!");
    router.push(redirectTo);
  };

  // Unsaved Prompt on Back
  const handleBack = () => {
    if (isDirty) {
      const confirmExit = confirm(
        "Sie haben ungespeicherte Änderungen.\n\nMöchten Sie diese Änderungen jetzt als ENTWURF speichern?\n\n[OK] = Als Entwurf speichern & verlassen\n[Abbrechen] = Änderungen verwerfen & verlassen"
      );
      if (confirmExit) {
        saveAsDraftAndRedirect("/accounting/invoices");
      } else {
        setIsDirty(false);
        router.push("/accounting/invoices");
      }
    } else {
      router.push("/accounting/invoices");
    }
  };

  // Validation
  const validate = () => {
    if (!invoice.customerId) return "Bitte wählen Sie einen Kunden aus.";
    if (!invoice.id) return "Rechnungsnummer fehlt.";
    if (!invoice.date) return "Rechnungsdatum fehlt.";
    if (!invoice.positions?.length) return "Mindestens eine Position erforderlich.";
    const emptyPos = invoice.positions.find(p => p.type === 'item' && !p.name);
    if (emptyPos) return "Name der Position fehlt.";
    return null;
  };

  const handleSave = () => {
    const error = validate();
    if (error) return toast.error(error);
    
    // Save template style selection
    const finalInvoice = {
      ...invoice,
      pdfTemplate: selectedTemplate
    } as Invoice;

    if (isNew) {
      addInvoice({ ...finalInvoice, status: "ENTWURF" });
    } else {
      // Use the original URL param `id` to find the record in the store,
      // not `invoice.id` which may have been changed by the user.
      // The spread in updateInvoice will overwrite the old id with the new one.
      updateInvoice(id, finalInvoice);
    }
    
    setIsDirty(false); // Clear dirty state
    toast.success(isNew ? "Rechnung als Entwurf gespeichert" : "Rechnung aktualisiert");
    router.push("/accounting/invoices");
  };

  const handleAddProduct = (p: Product) => {
    const newPos: InvoicePosition = {
      id: Math.random().toString(36).substr(2, 9),
      productId: p.id,
      name: p.name,
      description: p.description,
      quantity: 1,
      unit: p.unit,
      priceNet: p.defaultPrice,
      vatRate: p.vatRate,
      discountPercent: 0,
      type: "item",
      category: p.category || "",
      priceGross: p.defaultPrice * (1 + p.vatRate / 100),
      priceType: "NET",
      discountType: "PERCENT",
      discountValue: 0
    };
    setInvoice(prev => ({
      ...prev,
      positions: [...(prev.positions || []), newPos]
    }));
    setIsProductModalOpen(false);
  };

  const handleAddPayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat((e.currentTarget.elements.namedItem('amount') as HTMLInputElement).value);
    const newPaid = (invoice.amountPaid || 0) + amount;
    setInvoice({ ...invoice, amountPaid: newPaid, status: newPaid >= (invoice.amountGross || 0) ? "BEZAHLT" : "OFFEN" });
    toast.success("Zahlung erfasst");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: invoice.currency || 'EUR' }).format(val);
  };

  const getDocumentTitle = (type: string) => {
    if (type === "Angebot") return "ANGEBOT";
    if (type === "Anzahlung") return "ANZAHLUNGSRECHNUNG";
    if (type === "Teilrechnung") return "TEILRECHNUNG";
    if (type === "Schlussrechnung") return "SCHLUSSRECHNUNG";
    if (type === "Gutschrift") return "GUTSCHRIFT";
    if (type === "Stornorechnung") return "STORNORECHNUNG";
    return "RECHNUNG";
  };

  // Reusable PDF content layout supporting multiple designs
  const InvoicePdfContent = () => {
    const docTitle = getDocumentTitle(invoice.type || "");
    const selectedCustomerObj = customers.find(c => c.id === invoice.customerId);
    
    // Modern Minimalist Template
    if (selectedTemplate === "modern") {
      return (
        <div className="bg-white p-8 sm:p-12 text-left text-gray-800 text-[11px] leading-relaxed shadow-sm min-h-[297mm] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-14">
              <div>
                {invoiceSettings.systemLogo || "/logo.png" ? (
                  <img src={invoiceSettings.systemLogo || "/logo.png"} alt="Logo" className="h-12 w-auto max-h-12 object-contain mb-4" />
                ) : (
                  <>
                    <div className="h-12 w-12 bg-neutral-900 rounded-xl mb-4 flex items-center justify-center text-white font-bold text-sm">TM</div>
                    <p className="font-bold text-gray-900 text-xs">{invoiceSettings.companyName}</p>
                  </>
                )}
                <p className="text-[9px] text-gray-400 mt-1 whitespace-pre-line">{invoiceSettings.companyAddress}</p>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 mb-1">{docTitle}</h1>
                <p className="text-[10px] font-bold text-gray-400">Nr. {invoice.id}</p>
              </div>
            </div>

            <div className="flex justify-between mb-12">
              <div className="max-w-[240px] space-y-0.5">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1.5 border-b border-gray-100 pb-0.5">Empfänger</p>
                <p className="text-xs font-bold text-gray-900">{selectedCustomerObj?.company || invoice.customerName}</p>
                {selectedCustomerObj?.contactPerson && (
                  <p className="text-[10px] text-gray-600 font-medium">z.H. {selectedCustomerObj.contactPerson}</p>
                )}
                {selectedCustomerObj?.address ? (
                  <p className="text-[10px] text-gray-500 whitespace-pre-line leading-relaxed">{selectedCustomerObj.address}</p>
                ) : (
                  <p className="text-[10px] text-gray-500">{selectedCustomerObj?.name || invoice.customerName}</p>
                )}
                {selectedCustomerObj?.vatId && (
                  <p className="text-[9px] text-gray-400 font-semibold pt-0.5">UID: {selectedCustomerObj.vatId}</p>
                )}
                <div className="text-[9px] text-gray-400 pt-1">
                  {selectedCustomerObj?.phone && <p>Tel: {selectedCustomerObj.phone}</p>}
                  <p>E-Mail: {selectedCustomerObj?.email || invoice.email}</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-right">
                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Datum</p>
                   <p className="text-[10px] font-bold text-gray-900">{invoice.date}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Fällig am</p>
                   <p className="text-[10px] font-bold text-gray-900">{invoice.dueDate}</p>
                </div>
              </div>
            </div>

            {invoice.introText && (
              <p className="mb-8 text-gray-600 font-medium whitespace-pre-line leading-relaxed">{invoice.introText}</p>
            )}

            <table className="w-full text-left mb-10">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Leistungsbeschreibung / Position</th>
                  <th className="py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {invoice.positions?.map((pos) => (
                  <tr key={pos.id} className="border-b border-gray-100">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-900">{pos.name}</p>
                        {pos.category && (
                          <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 text-[7px] font-black uppercase tracking-wider rounded border border-gray-100/50">{pos.category}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed whitespace-pre-line">{pos.description}</p>
                    </td>
                    <td className="py-4 text-right text-xs font-bold text-gray-900">{formatCurrency(getPositionNetSubtotal(pos))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-12">
              <div className="w-56 space-y-2">
                <div className="flex justify-between text-[10px] font-medium text-gray-500">
                   <span>Zwischensumme (Netto)</span>
                   <span>{formatCurrency(invoice.amountNet || 0)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-medium text-gray-500">
                   <span>USt. ({invoiceSettings.defaultVatRate === 19 ? 20 : (invoiceSettings.defaultVatRate || 20)}%)</span>
                   <span>{formatCurrency(invoice.amountVat || 0)}</span>
                </div>
                <div className="h-px bg-gray-100 my-2" />
                <div className="flex justify-between text-sm font-black text-gray-950">
                   <span>Gesamtbetrag</span>
                   <span>{formatCurrency(invoice.amountGross || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            {invoice.footerText && (
              <p className="text-[9px] text-gray-400 italic mb-8 border-t border-gray-50 pt-3 leading-relaxed">{invoice.footerText}</p>
            )}

            <div className="border-t border-gray-100 pt-6 text-[8px] text-gray-400 grid grid-cols-3 gap-6">
              <div>
                <p className="font-bold text-gray-800 uppercase tracking-widest mb-1.5">Zahlungsdetails</p>
                <p>Konto: {invoiceSettings.bankOwner}</p>
                <p>Bank: {invoiceSettings.bankName}</p>
                <p>IBAN: {invoiceSettings.bankIban}</p>
                <p>BIC: {invoiceSettings.bankBic}</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 uppercase tracking-widest mb-1.5">Unternehmensdaten</p>
                <p>{invoiceSettings.companyName}</p>
                <p>Steuer-Nr: {invoiceSettings.companyTaxId}</p>
                <p>UID: {invoiceSettings.companyVatId}</p>
                <p>Firmenbuch: {invoiceSettings.firmenbuch}</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 uppercase tracking-widest mb-1.5">Bedingungen</p>
                <p>{invoice.paymentTerms}</p>
                <p className="mt-1">Vielen Dank für das Vertrauen!</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Corporate Classic (Navy Accent)
    if (selectedTemplate === "classic") {
      return (
        <div className="bg-white text-left text-gray-800 text-[11px] leading-relaxed shadow-sm min-h-[297mm] flex flex-col justify-between relative border-t-8 border-indigo-900">
          
          <div className="p-8 sm:p-12 pt-10">
            <div className="flex justify-between items-start mb-12">
              <div>
                {invoiceSettings.systemLogo || "/logo.png" ? (
                  <img src={invoiceSettings.systemLogo || "/logo.png"} alt="Logo" className="h-12 w-auto max-h-12 object-contain mb-4" />
                ) : (
                  <div className="text-xl font-black text-indigo-900 tracking-tight flex items-center gap-1.5 mb-2">
                    <Bookmark className="h-5 w-5 text-indigo-900" />
                    {invoiceSettings.companyName}
                  </div>
                )}
                <p className="text-[9px] text-gray-400 whitespace-pre-line leading-relaxed">{invoiceSettings.companyAddress}</p>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-black tracking-tight text-indigo-900 leading-none mb-1">{docTitle}</h1>
                <p className="text-[10px] font-bold text-gray-400 mt-1">Rechnungsnummer: # {invoice.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="bg-indigo-50/15 border border-indigo-50 rounded-xl p-4 space-y-1">
                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Empfängerdaten</p>
                <p className="text-xs font-bold text-gray-900">{selectedCustomerObj?.company || invoice.customerName}</p>
                {selectedCustomerObj?.contactPerson && (
                  <p className="text-[10px] text-gray-700 font-medium">z.H. {selectedCustomerObj.contactPerson}</p>
                )}
                {selectedCustomerObj?.address ? (
                  <p className="text-[10px] text-gray-500 whitespace-pre-line leading-relaxed">{selectedCustomerObj.address}</p>
                ) : (
                  <p className="text-[10px] text-gray-500">{selectedCustomerObj?.name || invoice.customerName}</p>
                )}
                {selectedCustomerObj?.vatId && (
                  <p className="text-[9px] text-indigo-900 font-semibold pt-0.5">UID: {selectedCustomerObj.vatId}</p>
                )}
                <div className="text-[9px] text-gray-400 pt-0.5">
                  {selectedCustomerObj?.phone && <p>Tel: {selectedCustomerObj.phone}</p>}
                  <p>E-Mail: {selectedCustomerObj?.email || invoice.email}</p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-1.5 text-right pr-2">
                <div className="flex justify-end gap-4 text-[10px]">
                   <span className="font-bold text-gray-400 uppercase tracking-wider">Erstellt:</span>
                   <span className="font-bold text-gray-900">{invoice.date}</span>
                </div>
                <div className="flex justify-end gap-4 text-[10px]">
                   <span className="font-bold text-gray-400 uppercase tracking-wider">Fälligkeit:</span>
                   <span className="font-bold text-indigo-600">{invoice.dueDate}</span>
                </div>
              </div>
            </div>

            {invoice.introText && (
              <p className="mb-6 text-gray-600 whitespace-pre-line leading-relaxed border-l-2 border-indigo-100 pl-4">{invoice.introText}</p>
            )}

            <table className="w-full text-left mb-10">
              <thead>
                <tr className="bg-indigo-50/40 text-indigo-900 border-b border-indigo-100">
                  <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-widest rounded-l-lg">Position / Beschreibung</th>
                  <th className="py-2.5 px-3 text-[9px] font-black uppercase tracking-widest text-right rounded-r-lg">Betrag (Netto)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.positions?.map((pos) => (
                  <tr key={pos.id} className="border-b border-gray-100/70 hover:bg-gray-50/30">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-900">{pos.name}</p>
                        {pos.category && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[7px] font-black uppercase tracking-wider rounded">{pos.category}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-0.5 whitespace-pre-line leading-relaxed">{pos.description}</p>
                    </td>
                    <td className="py-4 px-3 text-right text-xs font-bold text-gray-900">{formatCurrency(getPositionNetSubtotal(pos))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-10">
              <div className="w-56 space-y-2 bg-indigo-50/10 border border-indigo-50/20 p-3 rounded-xl">
                <div className="flex justify-between text-[10px] font-medium text-gray-500">
                   <span>Nettobetrag</span>
                   <span>{formatCurrency(invoice.amountNet || 0)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-medium text-gray-500">
                   <span>USt. ({invoiceSettings.defaultVatRate === 19 ? 20 : (invoiceSettings.defaultVatRate || 20)}%)</span>
                   <span>{formatCurrency(invoice.amountVat || 0)}</span>
                </div>
                <div className="h-px bg-indigo-100/50 my-1.5" />
                <div className="flex justify-between text-sm font-black text-indigo-900">
                   <span>Rechnungsbetrag</span>
                   <span>{formatCurrency(invoice.amountGross || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12 pt-0">
            {invoice.footerText && (
              <p className="text-[9px] text-gray-400 italic mb-8 border-t border-gray-100 pt-3">{invoice.footerText}</p>
            )}

            <div className="border-t border-indigo-50 pt-6 text-[8px] text-gray-400 grid grid-cols-3 gap-6">
              <div>
                <p className="font-bold text-indigo-900 uppercase tracking-widest mb-1">Zahlungsdetails</p>
                <p>IBAN: {invoiceSettings.bankIban}</p>
                <p>BIC: {invoiceSettings.bankBic}</p>
                <p>Bank: {invoiceSettings.bankName}</p>
              </div>
              <div>
                <p className="font-bold text-indigo-900 uppercase tracking-widest mb-1">Unternehmensinfo</p>
                <p>Steuer-Nr: {invoiceSettings.companyTaxId}</p>
                <p>UID-Nr: {invoiceSettings.companyVatId}</p>
              </div>
              <div>
                <p className="font-bold text-indigo-900 uppercase tracking-widest mb-1">Bedingungen</p>
                <p>{invoice.paymentTerms}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Creative Elegant (Charcoal Left Sidebar + White Right Column)
    if (selectedTemplate === "creative") {
      return (
        <div className="bg-white text-left text-gray-800 text-[11px] leading-relaxed shadow-sm min-h-[297mm] flex print:block">
          {/* Dark Sidebar Panel */}
          <div className="w-[32%] bg-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between shrink-0 print:hidden">
            <div>
              {invoiceSettings.systemLogo || "/logo.png" ? (
                <img src={invoiceSettings.systemLogo || "/logo.png"} alt="Logo" className="h-10 w-auto max-h-10 object-contain mb-12 bg-white/90 p-1 rounded-lg" />
              ) : (
                <div className="h-10 w-10 bg-white text-slate-950 font-black rounded-xl mb-12 flex items-center justify-center text-sm shadow-lg">TM</div>
              )}
              
              <h1 className="text-xl font-black tracking-tight text-white mb-1.5 uppercase leading-none">{docTitle}</h1>
              <p className="text-[9px] font-bold text-slate-400 mb-8">Nr. {invoice.id}</p>

              <div className="space-y-4 text-[9px]">
                <div>
                  <p className="font-black text-slate-500 uppercase tracking-widest mb-0.5">Ausstellungsdatum</p>
                  <p className="font-bold text-white">{invoice.date}</p>
                </div>
                <div>
                  <p className="font-black text-slate-500 uppercase tracking-widest mb-0.5">Zahlungsfrist</p>
                  <p className="font-bold text-white">{invoice.dueDate}</p>
                </div>
                <div className="pt-4 border-t border-slate-800 mt-4 space-y-1">
                  <p className="font-black text-slate-500 uppercase tracking-widest mb-1">Rechnungsempfänger</p>
                  <p className="text-xs font-black text-white">{selectedCustomerObj?.company || invoice.customerName}</p>
                  {selectedCustomerObj?.contactPerson && (
                    <p className="text-[10px] text-slate-300 font-medium">z.H. {selectedCustomerObj.contactPerson}</p>
                  )}
                  {selectedCustomerObj?.address ? (
                    <p className="text-[10px] text-slate-400 whitespace-pre-line leading-relaxed">{selectedCustomerObj.address}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">{selectedCustomerObj?.name || invoice.customerName}</p>
                  )}
                  {selectedCustomerObj?.vatId && (
                    <p className="text-[9px] text-slate-400 font-semibold pt-0.5">UID: {selectedCustomerObj.vatId}</p>
                  )}
                  <div className="text-[9px] text-slate-400 pt-1">
                    {selectedCustomerObj?.phone && <p>Tel: {selectedCustomerObj.phone}</p>}
                    <p>E-Mail: {selectedCustomerObj?.email || invoice.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[8px] text-slate-500 space-y-1.5 leading-relaxed">
              <p className="font-black text-slate-400 uppercase tracking-widest">Support & Kontakt</p>
              <p>Mail: {invoiceSettings.companyEmail || "billing@trada.space"}</p>
              <p>Web: trada.space</p>
            </div>
          </div>

          {/* White Main Column */}
          <div className="flex-1 p-8 sm:p-10 flex flex-col justify-between min-h-full">
            <div>
              <div className="flex justify-between items-start mb-12">
                <div>
                  {invoiceSettings.systemLogo || "/logo.png" ? (
                    <img src={invoiceSettings.systemLogo || "/logo.png"} alt="Logo" className="h-12 w-auto max-h-12 object-contain mb-4" />
                  ) : (
                    <p className="font-bold text-slate-900 text-xs">{invoiceSettings.companyName}</p>
                  )}
                  <p className="text-[9px] text-slate-400 mt-1 whitespace-pre-line leading-relaxed">{invoiceSettings.companyAddress}</p>
                </div>
                <div className="text-right hidden print:block">
                  <h1 className="text-xl font-black text-slate-900 leading-none">{docTitle}</h1>
                  <p className="text-[8px] text-slate-400 mt-1">Nr. {invoice.id}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Datum: {invoice.date}</p>
                </div>
              </div>

              {invoice.introText && (
                <p className="mb-8 text-slate-600 whitespace-pre-line leading-relaxed">{invoice.introText}</p>
              )}

              <table className="w-full text-left mb-8">
                <thead>
                  <tr className="border-b border-slate-900">
                    <th className="py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Dienstleistung / Beschreibung</th>
                    <th className="py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Summe</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.positions?.map((pos) => (
                    <tr key={pos.id} className="border-b border-slate-100">
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{pos.name}</p>
                          {pos.category && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[7px] font-black uppercase tracking-wider rounded">{pos.category}</span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 whitespace-pre-line leading-relaxed">{pos.description}</p>
                      </td>
                      <td className="py-4 text-right text-xs font-bold text-slate-900">{formatCurrency(getPositionNetSubtotal(pos))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-48 space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                     <span>Netto</span>
                     <span>{formatCurrency(invoice.amountNet || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                     <span>MwSt. ({invoiceSettings.defaultVatRate === 19 ? 20 : (invoiceSettings.defaultVatRate || 20)}%)</span>
                     <span>{formatCurrency(invoice.amountVat || 0)}</span>
                  </div>
                  <div className="h-px bg-slate-900 my-2" />
                  <div className="flex justify-between text-xs font-black text-slate-950">
                     <span>Gesamtsumme</span>
                     <span>{formatCurrency(invoice.amountGross || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {invoice.footerText && (
                <p className="text-[9px] text-slate-400 italic mb-6 border-t border-slate-50 pt-3">{invoice.footerText}</p>
              )}

              <div className="border-t border-slate-100 pt-6 text-[8px] text-slate-400 grid grid-cols-2 gap-6">
                <div>
                  <p className="font-bold text-slate-900 uppercase tracking-widest mb-1">Zahlung an</p>
                  <p>Inhaber: {invoiceSettings.bankOwner}</p>
                  <p>IBAN: {invoiceSettings.bankIban}</p>
                  <p>BIC: {invoiceSettings.bankBic}</p>
                  <p>Bank: {invoiceSettings.bankName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-900 uppercase tracking-widest mb-1">Steuerdaten</p>
                  <p>USt-IdNr: {invoiceSettings.companyVatId}</p>
                  <p>Steuer-Nr: {invoiceSettings.companyTaxId}</p>
                  <p>Konditionen: {invoice.paymentTerms}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="h-8 w-8 flex items-center justify-center bg-gray-50 rounded-lg hover:bg-gray-100 transition-all border border-gray-100/50">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">{isNew ? "Neue Rechnung" : `Bearbeite ${invoice.id}`}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{invoice.type}</p>
               <span className="h-1 w-1 bg-gray-200 rounded-full" />
               <span className={`text-[8px] font-bold uppercase tracking-widest ${invoice.status?.startsWith('BEZAHLT') ? 'text-emerald-500' : 'text-orange-500'}`}>{invoice.status}</span>
               {isDirty && (
                 <>
                   <span className="h-1 w-1 bg-gray-200 rounded-full" />
                   <span className="text-[8px] font-bold text-amber-500 bg-amber-50 px-1.5 rounded border border-amber-100">Ungespeicherte Änderungen</span>
                 </>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-all border border-gray-100/50"
          >
            <Eye className="h-3.5 w-3.5" /> Vollbild
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all shadow-md"
          >
            <Save className="h-3.5 w-3.5" /> {isNew ? "Entwurf Speichern" : "Aktualisieren"}
          </button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-100 px-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
        <button onClick={() => setActiveTab("data")} className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${activeTab === "data" ? "text-black border-black" : "text-gray-400 border-transparent hover:text-gray-600"}`}>Rechnungsdaten</button>
        {!isNew && (
          <>
            <button onClick={() => setActiveTab("payments")} className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${activeTab === "payments" ? "text-black border-black" : "text-gray-400 border-transparent hover:text-gray-600"}`}>Zahlungen</button>
            <button onClick={() => setActiveTab("history")} className={`pb-2.5 text-xs font-bold transition-all border-b-2 ${activeTab === "history" ? "text-black border-black" : "text-gray-400 border-transparent hover:text-gray-600"}`}>Historie</button>
          </>
        )}
      </div>

      {activeTab === "data" ? (
        /* Real-time Side-by-Side Live Split Screen Layout */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Left Column: Form Editor Panel */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Section: Items Table */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-gray-400" /> Positionen
                </h2>
                <div className="flex flex-wrap items-center gap-1.5">
                   <button 
                     onClick={() => setIsSavedPositionsModalOpen(true)} 
                     className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200/50 text-[8px] font-bold rounded hover:bg-amber-100 transition-all uppercase tracking-wider"
                   >
                     <Star className="h-2.5 w-2.5" /> Hizmet Şablonları
                   </button>
                   <button onClick={() => setIsProductModalOpen(true)} className="flex items-center gap-1 px-2 py-1 bg-gray-900 text-white text-[8px] font-bold rounded hover:bg-gray-800 transition-all uppercase tracking-wider">
                      <Search className="h-2.5 w-2.5" /> Produkt-Datenbank
                   </button>
                   <button onClick={() => handleAddPosition('separator')} className="px-2 py-1 bg-gray-50 text-[8px] font-bold text-gray-500 rounded hover:bg-gray-100 transition-all uppercase tracking-wider">Trenner</button>
                   <button onClick={() => handleAddPosition('note')} className="px-2 py-1 bg-gray-50 text-[8px] font-bold text-gray-500 rounded hover:bg-gray-100 transition-all uppercase tracking-wider">Textzeile</button>
                </div>
              </div>

              <div className="p-1">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="positions">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0.5">
                        {invoice.positions?.map((pos, index) => (
                          <Draggable key={pos.id} draggableId={pos.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`p-2.5 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50/30 transition-all group flex items-start gap-2.5 ${pos.type !== 'item' ? 'bg-gray-50/15' : ''}`}
                              >
                                <div {...provided.dragHandleProps} className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                  <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                                </div>

                                <div className="flex-1 grid grid-cols-12 gap-3">
                                  {pos.type === 'item' ? (
                                    <>
                                      <div className="col-span-12 md:col-span-7 space-y-1">
                                        <input 
                                          type="text" 
                                          placeholder="Leistungsname / Servicebezeichnung" 
                                          className="w-full bg-transparent font-bold text-xs outline-none border-b border-transparent focus:border-black/5 pb-0.5"
                                          value={pos.name}
                                          onChange={(e) => updatePosition(pos.id, { name: e.target.value })}
                                        />
                                        
                                        {/* Spacious description textarea */}
                                        <textarea 
                                          placeholder="Ausführliche Beschreibung der erbrachten Leistung (optional)..." 
                                          className="w-full bg-gray-50/35 border border-gray-100/50 rounded-lg p-2 text-[10px] text-gray-505 outline-none resize-y min-h-[70px] font-medium leading-relaxed"
                                          rows={4}
                                          value={pos.description}
                                          onChange={(e) => updatePosition(pos.id, { description: e.target.value })}
                                        />
                                        
                                        <div className="flex items-center gap-1.5 mt-1 bg-gray-50/50 px-2 py-0.5 rounded-lg w-max border border-gray-100/50">
                                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kategorie:</span>
                                          <select 
                                            className="bg-transparent text-[9px] font-bold text-gray-600 outline-none cursor-pointer hover:text-black appearance-none"
                                            value={pos.category || ""}
                                            onChange={(e) => updatePosition(pos.id, { category: e.target.value })}
                                          >
                                            <option value="">Keine Kategorie</option>
                                            {LEISTUNGS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                        </div>
                                      </div>
                                      
                                      {/* Price Input Column with Netto/Brutto selection */}
                                      <div className="col-span-6 md:col-span-3">
                                        <input 
                                          type="number" 
                                          className="w-full bg-transparent text-xs text-right outline-none border-b border-transparent focus:border-black/5 pb-0.5 font-bold"
                                          value={pos.priceType === "GROSS" ? (pos.priceGross !== undefined ? pos.priceGross : (pos.priceNet * (1 + pos.vatRate / 100))) : pos.priceNet}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value) || 0;
                                            if (pos.priceType === "GROSS") {
                                              const calcNet = val / (1 + pos.vatRate / 100);
                                              updatePosition(pos.id, { priceGross: val, priceNet: calcNet });
                                            } else {
                                              const calcGross = val * (1 + pos.vatRate / 100);
                                              updatePosition(pos.id, { priceNet: val, priceGross: calcGross });
                                            }
                                          }}
                                        />
                                        
                                        <div className="flex items-center justify-end gap-1.5 mt-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newType = pos.priceType === "GROSS" ? "NET" : "GROSS";
                                              if (newType === "GROSS") {
                                                const calcGross = pos.priceNet * (1 + pos.vatRate / 100);
                                                updatePosition(pos.id, { priceType: newType, priceGross: calcGross });
                                              } else {
                                                updatePosition(pos.id, { priceType: newType });
                                              }
                                            }}
                                            className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider transition-all ${
                                              pos.priceType === "GROSS"
                                                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            }`}
                                          >
                                            {pos.priceType === "GROSS" ? "Brutto" : "Netto"}
                                          </button>
                                          
                                          <span className="text-[8px] text-gray-400 uppercase font-bold">USt.</span>
                                          <select 
                                            className="bg-transparent text-[8px] font-bold outline-none font-black"
                                            value={pos.vatRate}
                                            onChange={(e) => {
                                              const newVat = parseInt(e.target.value);
                                              if (pos.priceType === "GROSS") {
                                                const currentGross = pos.priceGross !== undefined ? pos.priceGross : (pos.priceNet * (1 + pos.vatRate / 100));
                                                const calcNet = currentGross / (1 + newVat / 100);
                                                updatePosition(pos.id, { vatRate: newVat, priceNet: calcNet });
                                              } else {
                                                const calcGross = pos.priceNet * (1 + newVat / 100);
                                                updatePosition(pos.id, { vatRate: newVat, priceGross: calcGross });
                                              }
                                            }}
                                          >
                                            <option value={20}>20%</option>
                                            <option value={19}>19%</option>
                                            <option value={7}>7%</option>
                                            <option value={0}>0%</option>
                                          </select>
                                        </div>
                                      </div>

                                      {/* Rabatt input with type selection */}
                                      <div className="col-span-3 md:col-span-1 border-r border-transparent">
                                        <div className="flex items-center gap-0.5 border-b border-transparent focus-within:border-black/5 justify-end">
                                          <input 
                                            type="number" 
                                            className="w-full bg-transparent text-xs text-right outline-none pb-0.5 font-medium max-w-[30px]"
                                            value={pos.discountValue !== undefined ? pos.discountValue : pos.discountPercent}
                                            onChange={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              updatePosition(pos.id, { 
                                                discountValue: val,
                                                discountPercent: pos.discountType !== "FIXED" ? val : 0 
                                              });
                                            }}
                                          />
                                          <select
                                            className="bg-transparent text-[8px] font-bold outline-none cursor-pointer appearance-none text-right font-black"
                                            value={pos.discountType || "PERCENT"}
                                            onChange={(e) => {
                                              const nextType = e.target.value as "PERCENT" | "FIXED";
                                              const currentVal = pos.discountValue !== undefined ? pos.discountValue : pos.discountPercent;
                                              updatePosition(pos.id, { 
                                                discountType: nextType,
                                                discountValue: currentVal,
                                                discountPercent: nextType === "PERCENT" ? currentVal : 0
                                              });
                                            }}
                                          >
                                            <option value="PERCENT">%</option>
                                            <option value="FIXED">€</option>
                                          </select>
                                        </div>
                                        <p className="text-[7px] text-gray-300 text-right mt-0.5 font-bold">RABATT</p>
                                      </div>

                                      {/* Subtotal Display */}
                                      <div className="col-span-3 md:col-span-1 text-right pt-0.5 pr-1">
                                        <p className="text-xs font-bold text-gray-900">
                                          {formatCurrency(getPositionNetSubtotal(pos))}
                                        </p>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="col-span-12">
                                      <input 
                                        type="text" 
                                        className={`w-full bg-transparent outline-none font-bold text-xs ${pos.type === 'separator' ? 'text-gray-900' : 'text-gray-400 italic'}`}
                                        placeholder={pos.type === 'separator' ? "Überschrift..." : "Hinweistext hinzufügen..."}
                                        value={pos.name}
                                        onChange={(e) => updatePosition(pos.id, { name: e.target.value })}
                                      />
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col gap-1 items-center shrink-0">
                                  <button onClick={() => removePosition(pos.id)} className="p-1 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  {pos.type === 'item' && (
                                    <button 
                                      onClick={() => handleSaveToLibrary(pos)} 
                                      className="p-1 text-gray-200 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all"
                                      title="In Hizmet Şablonları Kütüphanesine Kaydet"
                                    >
                                      <Star className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <div className="p-3 sm:p-4 border-t border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/20">
                 <button 
                  onClick={() => handleAddPosition('item')}
                  className="flex items-center gap-1 text-xs font-bold text-black hover:opacity-70 transition-all self-start sm:self-auto uppercase tracking-wider"
                 >
                   <Plus className="h-4 w-4" /> Position hinzufügen
                 </button>
                 
                 <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Zwischensumme (Netto)</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.amountNet || 0)}</p>
                    </div>
                 </div>
              </div>
            </section>

            {/* Section: Texts */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
               <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Type className="h-3.5 w-3.5 text-gray-300" /> Einleitungstext
                  </label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-black/5 min-h-[60px] font-medium placeholder-gray-300"
                    placeholder="z.B. Anbei erhalten Sie die Rechnung für die erbrachten Leistungen."
                    value={invoice.introText}
                    onChange={(e) => setInvoice({...invoice, introText: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-gray-300" /> Fußzeilentext / Rechtliches
                  </label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-black/5 min-h-[60px] font-medium placeholder-gray-300"
                    placeholder="z.B. Kleinunternehmerregelung gemäß § 19 UStG..."
                    value={invoice.footerText}
                    onChange={(e) => setInvoice({...invoice, footerText: e.target.value})}
                  />
               </div>
            </section>

            {/* Customer & Basics details (compacted in mobile view on left) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer selection */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                 <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Empfänger (Kunde)</h3>
                 <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300" />
                      <select 
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs appearance-none outline-none focus:ring-1 focus:ring-black/5 font-bold"
                        value={invoice.customerId}
                        onChange={(e) => {
                          const c = customers.find(cust => cust.id === e.target.value);
                          if (c) {
                            setInvoice(prev => ({ 
                              ...prev, 
                              customerId: c.id, 
                              customerName: c.name, 
                              email: c.email,
                              paymentTerms: c.paymentTerms || prev.paymentTerms || "14 Tage netto"
                            }));
                          }
                        }}
                      >
                        <option value="">Kunde auswählen...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-200 rounded-xl text-[9px] font-bold text-gray-400 hover:border-black hover:text-black transition-all uppercase tracking-widest"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Neuen Kunden anlegen
                    </button>
                 </div>
              </div>

              {/* Invoice settings selection */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rechnungs-Eigenschaften</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vorlage wählen</span>
                    <select
                      className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none font-bold text-gray-800"
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value as any)}
                    >
                      <option value="modern">Modern Minimalist</option>
                      <option value="classic">Corporate Classic</option>
                      <option value="creative">Creative Elegant</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dokumententyp</span>
                    <select
                      className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs outline-none font-bold text-gray-800"
                      value={invoice.type}
                      onChange={(e) => setInvoice({...invoice, type: e.target.value as any})}
                    >
                      {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details Basics */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
               <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Dokumentdetails</h3>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Dokumentennummer</label>
                     <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                      value={invoice.id}
                      onChange={(e) => setInvoice({...invoice, id: e.target.value})}
                     />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Rechnungsdatum</label>
                    <input 
                      type="date" 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                      value={invoice.date}
                      onChange={(e) => setInvoice({...invoice, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Fälligkeit</label>
                    <input 
                      type="date" 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none"
                      value={invoice.dueDate}
                      onChange={(e) => setInvoice({...invoice, dueDate: e.target.value})}
                    />
                  </div>
               </div>
            </section>
          </div>

          {/* Right Column: Live PDF Document Preview Panel (Sticky on Desktop) */}
          <div className="xl:col-span-5 hidden xl:block sticky top-20 h-[calc(100vh-120px)] overflow-y-auto bg-gray-50 border border-gray-100/80 rounded-2xl p-4 shadow-inner">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-gray-400" />
                Live PDF-Dokument Vorschau
              </h3>
              <span className="px-2 py-0.5 bg-white border border-gray-100 text-gray-400 text-[8px] font-bold rounded uppercase shadow-sm">Real-time</span>
            </div>
            
            {/* Elegant preview viewport container */}
            <div className="border border-gray-100/50 rounded-xl overflow-hidden shadow-md scale-[0.98] origin-top bg-white">
              <InvoicePdfContent />
            </div>
          </div>
        </div>
      ) : activeTab === "payments" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center animate-in fade-in duration-200">
           <div className="h-14 w-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Euro className="h-6 w-6 text-emerald-500" />
           </div>
           <h3 className="text-base font-bold text-gray-900">Zahlungserfassung</h3>
           <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">Erfassen Sie hier Teil- oder Vollzahlungen für diese Rechnung.</p>
           <form onSubmit={handleAddPayment} className="mt-6 max-w-xs mx-auto flex gap-3">
              <input name="amount" type="number" step="0.01" required className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold outline-none" placeholder="Betrag in €" />
              <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all">Verbuchen</button>
           </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center animate-in fade-in duration-200">
           <div className="h-14 w-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Clock className="h-6 w-6 text-blue-500" />
           </div>
           <h3 className="text-base font-bold text-gray-900">Rechnungshistorie</h3>
           <p className="text-xs text-gray-400 mt-1">Alle Änderungen und Ereignisse werden hier protokolliert.</p>
           <div className="mt-6 space-y-3 max-w-md mx-auto text-left">
              {(invoice.history || []).map((h, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                   <div className="text-[8px] font-bold text-gray-400 w-16 uppercase tracking-wider">{h.date.split('T')[0]}</div>
                   <div className="text-xs font-semibold text-gray-700 leading-snug">{h.action} von {h.user}</div>
                </div>
              ))}
              {(!invoice.history || invoice.history.length === 0) && <p className="text-center text-[10px] text-gray-300 italic">Noch keine Einträge vorhanden.</p>}
           </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Kunden hinzufügen</h2>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const name = (e.currentTarget.elements.namedItem('name') as HTMLInputElement).value;
              const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
              const newC: Customer = {
                id: "c" + Date.now(),
                name,
                email,
                status: "Active",
                color: "#000000"
              };
              addCustomer(newC);
              setInvoice({ ...invoice, customerId: newC.id, customerName: newC.name, email: newC.email });
              setIsCustomerModalOpen(false);
              toast.success("Kunde erfolgreich angelegt");
            }} className="p-4 sm:p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Firmenname *</label>
                <input name="name" required className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none" placeholder="e.g. Future Tech Ltd." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">E-Mail-Adresse *</label>
                <input name="email" type="email" required className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none" placeholder="billing@company.com" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-black text-white rounded-xl text-[10px] font-bold hover:bg-gray-800 transition-all uppercase tracking-wider">Erstellen & Auswählen</button>
            </form>
          </div>
        </div>
      )}

      {/* Product selection search modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Produkt-Datenbank</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              {products.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleAddProduct(p)}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-black cursor-pointer transition-all flex justify-between items-center"
                >
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{p.name}</h4>
                    <p className="text-[9px] text-gray-400 mt-0.5">{p.description}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(p.defaultPrice)}</span>
                </div>
              ))}
              {products.length === 0 && <p className="text-center text-[10px] text-gray-300 italic">Keine Produkte vorhanden.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Saved Positions Library modal */}
      {isSavedPositionsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" />
                Hizmet Şablonları Kütüphanesi
              </h2>
              <button onClick={() => setIsSavedPositionsModalOpen(false)} className="text-gray-400 hover:text-black transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-[10px] text-gray-400 leading-relaxed font-medium mb-3">
                Zuvor gespeicherte Dienstleistungen und standardisierte Festpreise. Klicken Sie auf eine Vorlage, um sie in den Editor einzufügen.
              </p>
              
              <div className="space-y-2">
                {savedPositions.map(sp => (
                  <div 
                    key={sp.id}
                    className="p-3 bg-gray-50 hover:bg-gray-100/50 rounded-xl border border-gray-100 hover:border-amber-200 transition-all flex items-start justify-between gap-4 group cursor-pointer"
                    onClick={() => handleAddSavedPosition(sp)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-gray-900">{sp.name}</h4>
                        {sp.category && (
                          <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 text-[7px] font-black uppercase tracking-wider rounded">{sp.category}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1 whitespace-pre-line leading-relaxed">{sp.description}</p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span className="text-xs font-bold text-gray-900">{formatCurrency(sp.priceNet)}</span>
                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-0.5">USt. {sp.vatRate}%</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedPosition(sp.id);
                          toast.info("Vorlage gelöscht");
                        }}
                        className="p-1.5 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-gray-200/50"
                        title="Vorlage löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {savedPositions.length === 0 && (
                  <p className="text-center text-[10px] text-gray-300 italic py-8">Keine gespeicherten Dienstleistungen vorhanden.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-md z-[100] flex flex-col animate-in fade-in duration-200">
          <div className="h-16 bg-white border-b border-gray-200 px-6 sm:px-8 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold text-gray-900">Vollbild PDF-Vorschau</h2>
                <span className="px-2 py-1 bg-neutral-900 text-white text-[8px] font-black rounded uppercase tracking-wider">Entwurf</span>
             </div>
             <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all shadow-md">
                  <Printer className="h-4 w-4" /> Drucken / Export
                </button>
                <button onClick={() => setIsPreviewOpen(false)} className="h-10 w-10 flex items-center justify-center bg-gray-50 rounded-xl hover:bg-gray-100 transition-all text-gray-500 border border-gray-100/50">
                  <X className="h-5 w-5" />
                </button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-900/50 p-6 sm:p-12">
             <div className="max-w-[210mm] mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white">
                <InvoicePdfContent />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
