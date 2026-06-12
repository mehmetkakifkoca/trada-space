import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PaymentStatus {
  month: string; // "YYYY-MM"
  status: "PAID" | "UNPAID" | "PENDING" | "FUTURE";
}

export const SYSTEM_CATEGORIES = [
  "Grafik/Druck",
  "Web Design/SEO",
  "Online Marketing",
  "Foto/Video",
  "Medya Avusturya"
] as const;

export const LEISTUNGS_CATEGORIES = [
  "Grafik/Druck",
  "Web Design/SEO",
  "Online Marketing",
  "Foto/Video",
  "Medya Avusturya"
] as const;

export type SystemCategory = string; // Using string to ensure legacy data does not break TS, but UI will map over SYSTEM_CATEGORIES

export interface MonthlyReport {
  id: string;
  month: string; // "YYYY-MM"
  type: "PREP" | "FINAL";
  title: string;
  subtitle: string;
  dateRange: string;
  content: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: "Active" | "Lead" | "Inactive";
  color: string;
  assignedEmployeeId?: string; // Sorumlu çalışan
  socialPlan?: {
    isActive: boolean;
    price: number;
    paymentDay: number;
    weeklyPosts: number;
    monthlyPosts: number;
    services: string[];
    reportsToGive: string;
    infoToReceive: string;
  };
  payments?: PaymentStatus[];
  reports?: MonthlyReport[];
  
  company?: string;
  contactPerson?: string;
  vatId?: string;
  paymentTerms?: string;
  notes?: string;
}

export type InvoiceType = 
  | "Standard invoice" 
  | "Recurring invoice" 
  | "Partial invoice" 
  | "Final invoice" 
  | "Down payment invoice" 
  | "Proforma invoice" 
  | "Credit note" 
  | "Cancellation invoice";

export type InvoiceStatus = "ENTWURF" | "OFFEN" | "BEZAHLT" | "BEZAHLT_BAR" | "BEZAHLT_BANK" | "STORNIERT" | "OVERDUE" | "CREDITED";

export interface InvoicePosition {
  id: string;
  productId?: string;
  name: string;
  description: string;
  quantity: number;
  unit: "hour" | "piece" | "day" | "month" | "project" | "package";
  priceNet: number;
  vatRate: number;
  discountPercent: number;
  type: "item" | "note" | "separator" | "subtotal";
  
  category?: string;
  priceGross?: number;
  priceType?: "NET" | "GROSS";
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
}

export interface Invoice {
  id: string; // Invoice Number
  type: InvoiceType;
  customerId: string;
  customerName: string;
  email: string;
  date: string;
  deliveryDate?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  dueDate: string;
  paymentTerms: string;
  currency: string;
  language: "German" | "English" | "Turkish";
  taxMode: "Austria" | "Germany" | "EU" | "non-EU";
  category?: SystemCategory;
  amountNet: number;
  amountVat: number;
  amountGross: number;
  amountPaid: number;
  status: InvoiceStatus;
  positions: InvoicePosition[];
  introText?: string;
  footerText?: string;
  paymentInstruction?: string;
  legalNote?: string;
  internalNote?: string;
  skontoPercent?: number;
  skontoDays?: number;
  paymentMethod: "Bank transfer" | "Cash" | "Card" | "PayPal" | "Stripe" | "Other";
  history?: Array<{ date: string; action: string; user: string }>;
  pdfTemplate?: "modern" | "classic" | "creative";
}

export interface Product {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  unit: InvoicePosition["unit"];
  vatRate: number;
  category: SystemCategory;
}

export interface SavedPosition {
  id: string;
  name: string;
  description: string;
  priceNet: number;
  vatRate: number;
  category?: string;
  priceType?: "NET" | "GROSS";
  priceGross?: number;
}

export interface RecurringInvoice {
  id: string;
  configId: string;
  customerId: string;
  templateInvoice: Partial<Invoice>;
  startDate: string;
  endDate?: string;
  interval: "weekly" | "monthly" | "quarterly" | "yearly";
  nextGenerationDate: string;
  isActive: boolean;
  history: string[]; // IDs of generated invoices
}

export interface InvoiceSettings {
  numberFormat: string;
  nextNumber: number;
  defaultPaymentTerms: string;
  defaultVatRate: number;
  defaultCurrency: string;
  defaultLanguage: Invoice["language"];
  companyLogo?: string;
  companyName: string;
  companyAddress: string;
  companyTaxId: string;
  companyVatId: string;
  bankIban: string;
  bankBic: string;
  bankName: string;
  bankOwner: string;
  defaultFooter: string;
  systemLogo?: string;
  favicon?: string;
  googleCalendarUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  firmenbuch: string;
  backupTime?: string;
  enableAutoBackup?: boolean;
  companyPhone: string;
  companyEmail: string;
}

export interface Expense {
  id: string;
  title: string;
  category: SystemCategory;
  date: string;
  amount: number;
  status: "Erfasst" | "Bezahlt";
  projectId?: string;
  projectName?: string;
  customerId?: string;
  customerName?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  username: string;
  role: string;
  colorTag: string;
  skills: string[];
  permissions: string[];
  avatarUrl?: string;
  password?: string;
  weeklyTargetHours?: number;
  hourlyCost?: number;
  costMultiplier?: number;
}

export type ProjectStatus = "Draft" | "Active" | "Waiting for client" | "Finished" | "Cancelled";
export type ProjectCategory = SystemCategory;

export interface Project {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  category: ProjectCategory;
  categories?: ProjectCategory[];
  description: string;
  status: ProjectStatus;
  revenue: number;
  startDate: string;
  deadline: string;
  finishedDate?: string;
  notes?: string;
  internalCode?: string;
  createdAt: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  status: "Open" | "In progress" | "Waiting" | "Done";
  assignedMemberIds: string[];
  estimatedHours: number;
  dueDate: string;
  internalNotes?: string;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  title: string;
  category: SystemCategory;
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string;
  status: "Paid" | "Unpaid";
}

export interface AdminProjectHour {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  hourlyCost: number;
  description: string;
}

export interface TimeAllocation {
  id: string;
  workerId: string;
  projectId: string;
  taskId?: string;
  date: string;
  hours: number;
  timestamp: number;
  notes?: string;
}

export interface UnassignedWorkTime {
  id: string;
  workerId: string;
  date: string;
  hours: number;
  timestamp: number;
}

export interface ProductionTask {
  id: string;
  customerId: string;
  title: string;
  type: "SHOOT" | "DESIGN" | "EDIT" | "OTHER";
  deadline: string; // "YYYY-MM-DD"
  status: "TODO" | "IN_PROGRESS" | "DONE";
  isArchived: boolean;
  month: string; // "YYYY-MM" for archiving
}

export interface SocialPost {
  id: string;
  customerId: string;
  campaignId?: string;
  title: string;
  platform: "Instagram" | "TikTok" | "Facebook" | "LinkedIn" | "Twitter";
  postType: "Feed Post" | "Carousel" | "Reel" | "Story" | "Video";
  status: "Idea" | "Draft" | "Production" | "Internal Review" | "Client Review" | "Revisions" | "Approved" | "Scheduled" | "Published" | "Archived";
  date: string;
  time?: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  cta?: string;
  firstComment?: string;
  media: string[]; // URLs/IDs
  thumbnail?: string;
  assignedTo?: string; // TeamMember ID
  internalNotes?: string;
  clientNotes?: string;
  revisionNotes?: string;
  history: Array<{ date: string; action: string; user: string; notes?: string }>;
  analytics?: {
    reach: number;
    impressions: number;
    engagement: number;
    saves: number;
    shares: number;
    comments: number;
  };
}

export interface Campaign {
  id: string;
  customerId: string;
  name: string;
  goal: string;
  status: "Planning" | "Active" | "Completed" | "Paused";
  startDate: string;
  endDate: string;
  budget: number;
  platforms: string[];
  kpiTargets: Record<string, number>;
  notes?: string;
}

export interface MediaAsset {
  id: string;
  customerId: string;
  campaignId?: string;
  name: string;
  type: "Image" | "Video" | "Graphic" | "Logo";
  url: string;
  size: number;
  folder: string;
  tags: string[];
  createdAt: string;
}

export interface SocialIdea {
  id: string;
  customerId: string;
  title: string;
  concept: string;
  platform: string;
  status: "Idea" | "Researching" | "Planned" | "Scripting" | "Production" | "Ready";
  referenceLinks: string[];
  trendTags: string[];
  assignedTo?: string;
  dueDate?: string;
}

export interface SocialTask {
  id: string;
  postId?: string;
  title: string;
  description: string;
  status: "Todo" | "In Progress" | "Review" | "Blocked" | "Completed";
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignedTo: string;
  dueDate: string;
  checklist: Array<{ id: string; text: string; completed: boolean }>;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: "Caption" | "CTA" | "Hashtag Group" | "Response";
  content: string;
  tags: string[];
}

export interface Shooting {
  id: string;
  customerId: string;
  title: string;
  location: string;
  date: string;
  time: string;
  status: "Geplant" | "Bestätigt" | "Abgeschlossen";
}

export interface Todo {
  id: string;
  customerId: string;
  task: string;
  completed: boolean;
  dueDate: string;
}

export interface AttendanceLog {
  id: string;
  workerId: string;
  workerName: string;
  action: "Clock In" | "Clock Out";
  time: string;
  date: string;
  timestamp: number;
  status: string;
  color: string;
}


export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  date: string;
  read: boolean;
}

export interface FreelancerTag {
  id: string;
  freelancerId: string;
  name: string;
  hourlyRate: number;
  color: string;
}

export interface FreelancerWorkLog {
  id: string;
  freelancerId: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  type: "HOURLY" | "PAUSCHAL";
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  durationHours?: number;
  tagId?: string;
  pauschalAmount?: number;
  description: string;
  totalCost: number;
}

export interface BankTransaction {
  id: string; // Unique transaction identifier
  realTime?: string;
  bookingDate: string; // Buchungsdatum
  valueDate: string; // Valutadatum
  purpose: string; // Zahlungsgrund / Verwendungszweck
  bookingText: string; // Buchungstext
  currency: string; // Währung
  amount: number; // Betrag (positive for incoming)
  partnerName: string; // Auftraggebername / Empfängername
  partnerAccount?: string; // Auftraggeberkonto
  partnerBankCode?: string; // Auftraggeber BLZ
  recipientName?: string; // Empfängername
  recipientAccount?: string; // Empfängerkonto
  recipientBankCode?: string; // Empfänger BLZ
  paymentReference?: string; // Zahlungsreferenz
  documentNumber?: string; // Belegnummer
  documentData?: string; // Belegdaten
  internalNote?: string; // Interne Notiz

  // Match / Reconciliation Metadata
  matchedInvoiceId?: string;
  matchedInvoiceIds?: string[]; // multiple matches
  matchStatus: "Automatisch bestätigt" | "Manuelle Prüfung" | "Vorschlag" | "Mehrere mögliche Treffer" | "Nicht zugeordnet" | "Bereits importiert" | "Ignoriert";
  matchReason?: string;
  confidenceScore: number; // 0 to 100
  reconciledAt?: string;
}

interface DataState {
  bankTransactions: BankTransaction[];
  addBankTransactions: (txs: BankTransaction[]) => void;
  updateBankTransaction: (id: string, updates: Partial<BankTransaction>) => void;
  deleteBankTransaction: (id: string) => void;
  clearBankTransactions: () => void;

  customers: Customer[];
  invoices: Invoice[];
  expenses: Expense[];
  teamMembers: TeamMember[];
  socialPosts: SocialPost[];
  campaigns: Campaign[];
  mediaAssets: MediaAsset[];
  socialIdeas: SocialIdea[];
  socialTasks: SocialTask[];
  contentTemplates: ContentTemplate[];
  shootings: Shooting[];
  todos: Todo[];
  attendanceLogs: AttendanceLog[];
  notifications: Notification[];
  products: Product[];
  recurringConfigs: RecurringInvoice[];
  invoiceSettings: InvoiceSettings;

  productionTasks: ProductionTask[];
  
  // Projects
  projects: Project[];
  projectTasks: ProjectTask[];
  projectExpenses: ProjectExpense[];
  adminProjectHours: AdminProjectHour[];
  timeAllocations: TimeAllocation[];
  unassignedWorkTimes: UnassignedWorkTime[];
  
  // Freelancer Features
  freelancerTags: FreelancerTag[];
  freelancerWorkLogs: FreelancerWorkLog[];
  
  savedPositions: SavedPosition[];
  
  // Actions
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addProductionTask: (task: ProductionTask) => void;
  updateProductionTask: (id: string, task: Partial<ProductionTask>) => void;
  archiveMonthTasks: (month: string) => void;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  addTeamMember: (member: TeamMember) => void;
  updateTeamMember: (id: string, member: Partial<TeamMember>) => void;
  deleteTeamMember: (id: string) => void;

  addSocialPost: (post: SocialPost) => void;
  updateSocialPost: (id: string, post: Partial<SocialPost>) => void;
  deleteSocialPost: (id: string) => void;

  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, campaign: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  addMediaAsset: (asset: MediaAsset) => void;
  updateMediaAsset: (id: string, asset: Partial<MediaAsset>) => void;
  deleteMediaAsset: (id: string) => void;

  addSocialIdea: (idea: SocialIdea) => void;
  updateSocialIdea: (id: string, idea: Partial<SocialIdea>) => void;
  deleteSocialIdea: (id: string) => void;

  addSocialTask: (task: SocialTask) => void;
  updateSocialTask: (id: string, task: Partial<SocialTask>) => void;
  deleteSocialTask: (id: string) => void;

  addContentTemplate: (template: ContentTemplate) => void;
  updateContentTemplate: (id: string, template: Partial<ContentTemplate>) => void;
  deleteContentTemplate: (id: string) => void;

  addShooting: (shooting: Shooting) => void;
  updateShooting: (id: string, shooting: Partial<Shooting>) => void;
  deleteShooting: (id: string) => void;

  addTodo: (todo: Todo) => void;
  updateTodo: (id: string, todo: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;

  addAttendanceLog: (log: AttendanceLog) => void;
  updateAttendanceLog: (id: string, updates: Partial<AttendanceLog>) => void;
  deleteAttendanceLog: (id: string) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addRecurringConfig: (config: RecurringInvoice) => void;
  updateRecurringConfig: (id: string, config: Partial<RecurringInvoice>) => void;
  deleteRecurringConfig: (id: string) => void;

  updateInvoiceSettings: (settings: Partial<InvoiceSettings>) => void;

  // Projects Actions
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addProjectTask: (task: ProjectTask) => void;
  updateProjectTask: (id: string, task: Partial<ProjectTask>) => void;
  deleteProjectTask: (id: string) => void;

  addProjectExpense: (expense: ProjectExpense) => void;
  updateProjectExpense: (id: string, expense: Partial<ProjectExpense>) => void;
  deleteProjectExpense: (id: string) => void;

  addAdminProjectHour: (hour: AdminProjectHour) => void;
  deleteAdminProjectHour: (id: string) => void;

  addTimeAllocation: (allocation: TimeAllocation) => void;
  updateTimeAllocation: (id: string, allocation: Partial<TimeAllocation>) => void;
  deleteTimeAllocation: (id: string) => void;
  addUnassignedWorkTime: (time: UnassignedWorkTime) => void;

  // Freelancer Actions
  addFreelancerTag: (tag: FreelancerTag) => void;
  updateFreelancerTag: (id: string, tag: Partial<FreelancerTag>) => void;
  deleteFreelancerTag: (id: string) => void;

  addFreelancerWorkLog: (log: FreelancerWorkLog) => void;
  updateFreelancerWorkLog: (id: string, log: Partial<FreelancerWorkLog>) => void;
  deleteFreelancerWorkLog: (id: string) => void;
  
  addSavedPosition: (pos: SavedPosition) => void;
  deleteSavedPosition: (id: string) => void;
}


export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      bankTransactions: [],
      customers: [
        { id: "c1", name: "TechFlow Solutions", email: "contact@techflow.com", status: "Active", color: "#3B82F6", phone: "+49 171 1234567", socialPlan: { isActive: true, price: 2500, paymentDay: 1, weeklyPosts: 3, monthlyPosts: 12, services: ["Reels", "Stories"], reportsToGive: "Monatlich", infoToReceive: "Wöchentlich" } },
        { id: "c2", name: "Creative Mind AG", email: "billing@creativemind.ag", status: "Active", color: "#EC4899" },
        { id: "c3", name: "Urban Design Co.", email: "info@urbandesign.co", status: "Active", color: "#10B981" },
        { id: "c4", name: "NexGen Media", email: "media@nexgen.com", status: "Lead", color: "#F59E0B" },
      ],
      productionTasks: [],
      invoices: [
        { 
          id: "RE-2024-001", 
          type: "Standard invoice",
          customerId: "c1", 
          customerName: "TechFlow Solutions", 
          email: "contact@techflow.com", 
          date: "2024-05-10", 
          dueDate: "2024-05-24",
          amountNet: 35462.18,
          amountVat: 6737.82,
          amountGross: 42200,
          amountPaid: 42200,
          status: "BEZAHLT",
          currency: "EUR",
          language: "German",
          taxMode: "Germany",
          paymentTerms: "14 Tage netto",
          paymentMethod: "Bank transfer",
          positions: [
            { id: "pos1", name: "Social Media Betreuung", description: "Monatliche Pauschale Mai", quantity: 1, unit: "month", priceNet: 35462.18, vatRate: 19, discountPercent: 0, type: "item" }
          ]
        },
        { 
          id: "RE-2024-002", 
          type: "Standard invoice",
          customerId: "c2", 
          customerName: "Creative Mind AG", 
          email: "billing@creativemind.ag", 
          date: "2024-05-12", 
          dueDate: "2024-05-26",
          amountNet: 15478.99,
          amountVat: 2941.01,
          amountGross: 18420,
          amountPaid: 0,
          status: "OFFEN",
          currency: "EUR",
          language: "German",
          taxMode: "Germany",
          paymentTerms: "14 Tage netto",
          paymentMethod: "Bank transfer",
          positions: [
            { id: "pos2", name: "Video Produktion", description: "Imagefilm 'New Horizons'", quantity: 1, unit: "project", priceNet: 15478.99, vatRate: 19, discountPercent: 0, type: "item" }
          ]
        },
      ],
      products: [
        { id: "p1", name: "Social Media Pauschale", description: "Vollständige Betreuung inkl. Content-Erstellung", defaultPrice: 2500, unit: "month", vatRate: 19, category: "Service" },
        { id: "p2", name: "Video-Tag", description: "Tagespauschale für Videodreh vor Ort", defaultPrice: 1200, unit: "day", vatRate: 19, category: "Production" },
      ],
      recurringConfigs: [],
      invoiceSettings: {
        numberFormat: "RE-{YYYY}-{NNN}",
        nextNumber: 3,
        defaultPaymentTerms: "Zahlbar innerhalb von 14 Tagen ohne Abzug.",
        defaultVatRate: 19,
        defaultCurrency: "EUR",
        defaultLanguage: "German",
        companyName: "Trada Media GmbH",
        companyAddress: "Musterstraße 123, 10115 Berlin",
        companyTaxId: "12/345/67890",
        companyVatId: "DE123456789",
        bankIban: "DE12 3456 7890 1234 5678 90",
        bankBic: "ABCDEFGHXXX",
        bankName: "Musterbank Berlin",
        bankOwner: "Trada Media GmbH",
        defaultFooter: "Vielen Dank für Ihre Bestellung!",
        primaryColor: "#000000",
        secondaryColor: "#3B82F6",
        tertiaryColor: "#94A3B8",
        firmenbuch: "FN 123456 x",
        companyPhone: "+49 30 12345678",
        companyEmail: "info@trada-media.de",
        backupTime: "00:00",
        enableAutoBackup: true
      },
      expenses: [
        { id: "ex1", title: "Adobe Creative Cloud", category: "Software", date: "2023-10-10", amount: 59.90, status: "Bezahlt" },
        { id: "ex2", title: "Starbucks Client Meeting", category: "Bewirtung", date: "2023-10-12", amount: 24.50, status: "Bezahlt" },
        { id: "ex3", title: "Apple Store - Monitor", category: "Hardware", date: "2023-10-14", amount: 899.00, status: "Bezahlt" },
        { id: "ex4", title: "Marketing Campaign A", category: "Marketing", date: "2023-10-15", amount: 22850.00, status: "Bezahlt" },
      ],
      teamMembers: [
        { id: "e1", fullName: "Nisa", username: "nisa", password: "Nisa123", role: "Mitarbeiter", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", colorTag: "#8B5CF6", skills: ["Social Media", "Content"], permissions: ["att", "proj", "cal"] },
        { id: "e2", fullName: "Arda Turan", username: "arda", password: "Arda123", role: "Mitarbeiter", avatarUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150", colorTag: "#2563EB", skills: ["Ads", "Marketing"], permissions: ["att", "proj", "cal"] },
        { id: "e3", fullName: "Emre Kuvvet", username: "emre", password: "Emre123", role: "Co Founder", avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150", colorTag: "#10B981", skills: ["Strategy", "Management"], permissions: ["att", "proj", "cal"] },
        { id: "e4", fullName: "Yalcin Okur", username: "yalcin", password: "Yalcin123", role: "Mitarbeiter", avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150", colorTag: "#F97316", skills: ["Sales", "CRM"], permissions: ["att", "proj", "cal"] },
        { id: "e5", fullName: "Steffanie Floimayer", username: "steffie", password: "Steffie123", role: "Mitarbeiter", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150", colorTag: "#EC4899", skills: ["Design", "Creative"], permissions: ["att", "proj", "cal"] },

        { id: "e7", fullName: "Mehmet Akif Koca", username: "akif", password: "Akif123", role: "CEO", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", colorTag: "#8B5CF6", skills: ["Executive", "Vision"], permissions: ["acc", "crm", "team", "att", "cal", "soc"] },
        { id: "e_super", fullName: "Trada Admin", username: "trada", password: "trada123", role: "SUPERADMIN", colorTag: "#000000", skills: ["System", "Security"], permissions: ["acc", "crm", "team", "att", "cal", "soc"] },
      ],
      socialPosts: [
        { 
          id: "sp1", 
          customerId: "c1", 
          title: "Premium Office Tour", 
          platform: "Instagram", 
          postType: "Reel",
          status: "Scheduled", 
          date: "2024-05-15", 
          time: "10:00",
          caption: "Welcome to our new space! 🚀 #AgencyLife #OfficeTour",
          hashtags: ["AgencyLife", "OfficeTour"],
          mentions: ["techflow"],
          media: ["https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300&h=300"],
          thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300&h=300",
          assignedTo: "e1",
          history: [{ date: "2024-05-10", action: "Created", user: "Admin" }],
          analytics: { reach: 1250, impressions: 1500, engagement: 85, saves: 12, shares: 5, comments: 8 }
        },
        { 
          id: "sp2", 
          customerId: "c2", 
          title: "Design Tips Carousel", 
          platform: "Instagram", 
          postType: "Carousel",
          status: "Client Review", 
          date: "2024-05-18", 
          caption: "5 Tips for better UI Design! 🎨",
          hashtags: ["Design", "UI"],
          media: ["https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?auto=format&fit=crop&q=80&w=300&h=300"],
          mentions: [],
          assignedTo: "e5",
          history: [{ date: "2024-05-12", action: "Drafted", user: "Steffie" }]
        }
      ],
      campaigns: [
        { id: "cp1", customerId: "c1", name: "Summer Launch 2024", goal: "Awareness", status: "Active", startDate: "2024-05-01", endDate: "2024-06-01", budget: 5000, platforms: ["Instagram", "TikTok"], kpiTargets: { reach: 50000 } }
      ],
      mediaAssets: [
        { id: "ma1", customerId: "c1", name: "Logo_White.png", type: "Logo", url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=150&h=150", size: 102400, folder: "Logos", tags: ["branding"], createdAt: "2024-05-10" }
      ],
      socialIdeas: [
        { id: "id1", customerId: "c1", title: "Day in the life", concept: "Follow Arda for a day", platform: "TikTok", status: "Planned", referenceLinks: [], trendTags: ["vlog"], assignedTo: "e2" }
      ],
      socialTasks: [
        { id: "st1", title: "Edit Office Reel", description: "Color grade and add music", status: "In Progress", priority: "High", assignedTo: "e1", dueDate: "2024-05-14", checklist: [{ id: "cl1", text: "Choose Music", completed: true }] }
      ],
      contentTemplates: [
        { id: "ct1", name: "Standard CTA", type: "CTA", content: "Link in Bio! 🔗", tags: ["engagement"] }
      ],
      shootings: [
        { id: "s1", customerId: "c1", title: "Sommer Kampagne Shoot", location: "Studio Berlin", time: "09:00 - 18:00", date: "2024-05-22", status: "Bestätigt" },
      ],
      todos: [
        { id: "t1", customerId: "c1", task: "Briefing für Juni finalisieren", completed: true, dueDate: "2024-05-13" },
        { id: "t2", customerId: "c1", task: "Shooting Assets sortieren", completed: true, dueDate: "2024-05-14" },
      ],
      attendanceLogs: [
        { id: "al1", workerId: "e1", workerName: "Nisa", action: "Clock In", time: "08:12", date: "13. Mai 2024", timestamp: 1715580720000, status: "On Time", color: "#8B5CF6" },
        { id: "al2", workerId: "e2", workerName: "Arda Turan", action: "Clock In", time: "08:45", date: "13. Mai 2024", timestamp: 1715582700000, status: "Late", color: "#2563EB" },
      ],
      notifications: [
        { id: "n1", title: "Neue Rechnung", message: "Eine neue Rechnung für TechFlow wurde erstellt.", type: "info", date: "Vor 5 Min", read: false },
        { id: "n2", title: "Shooting Bestätigt", message: "Arda hat das Shooting for Creative Mind bestätigt.", type: "success", date: "Vor 1 Std", read: true },
      ],
      projects: [],
      projectTasks: [],
      projectExpenses: [],
      adminProjectHours: [],
      timeAllocations: [],
      unassignedWorkTimes: [],
      freelancerTags: [],
      freelancerWorkLogs: [],
      savedPositions: [
        { id: "sp-template-1", name: "Grafik-Design Dienstleistung", description: "Erstellung von Corporate Identity, Logos und Drucksorten.", priceNet: 150, vatRate: 20, category: "Grafik/Druck", priceType: "NET", priceGross: 180 },
        { id: "sp-template-2", name: "Web Design & SEO Optimierung", description: "Design einer modernen Landingpage und Suchmaschinenoptimierung.", priceNet: 1200, vatRate: 20, category: "Web Design/SEO", priceType: "NET", priceGross: 1440 },
        { id: "sp-template-3", name: "Online Marketing Kampagne", description: "Konzeption und Schaltung von Werbeanzeigen auf Google Ads & Meta.", priceNet: 850, vatRate: 20, category: "Online Marketing", priceType: "NET", priceGross: 1020 },
      ],

      setCustomers: (customers) => set({ customers }),
      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (id, updated) => set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      })),
      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter((c) => (c.id !== id)),
      })),

      addProductionTask: (task) => set((state) => ({
        productionTasks: [...state.productionTasks, task]
      })),
      updateProductionTask: (id, updated) => set((state) => ({
        productionTasks: state.productionTasks.map((t) => (t.id === id ? { ...t, ...updated } : t))
      })),
      archiveMonthTasks: (month) => set((state) => ({
        productionTasks: state.productionTasks.map((t) => 
          t.month === month ? { ...t, isArchived: true } : t
        )
      })),

      addInvoice: (invoice) => set((state) => ({ invoices: [invoice, ...state.invoices] })),
      updateInvoice: (id, updated) => set((state) => ({
        invoices: state.invoices.map((i) => (i.id === id ? { ...i, ...updated } : i)),
      })),
      deleteInvoice: (id) => set((state) => ({
        invoices: state.invoices.filter((i) => (i.id !== id)),
      })),

      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (id, updated) => set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updated } : e)),
      })),
      deleteExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => (e.id !== id)),
      })),

      addTeamMember: (member) => set((state) => ({ teamMembers: [...state.teamMembers, member] })),
      updateTeamMember: (id, updated) => set((state) => ({
        teamMembers: state.teamMembers.map((m) => (m.id === id ? { ...m, ...updated } : m)),
      })),
      deleteTeamMember: (id) => set((state) => ({
        teamMembers: state.teamMembers.filter((m) => (m.id !== id)),
      })),

      addSocialPost: (post) => set((state) => ({ socialPosts: [post, ...state.socialPosts] })),
      updateSocialPost: (id, updated) => set((state) => ({
        socialPosts: state.socialPosts.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      })),
      deleteSocialPost: (id) => set((state) => ({
        socialPosts: state.socialPosts.filter((p) => (p.id !== id)),
      })),

      addCampaign: (campaign) => set((state) => ({ campaigns: [...state.campaigns, campaign] })),
      updateCampaign: (id, updated) => set((state) => ({
        campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      })),
      deleteCampaign: (id) => set((state) => ({
        campaigns: state.campaigns.filter((c) => (c.id !== id)),
      })),

      addMediaAsset: (asset) => set((state) => ({ mediaAssets: [...state.mediaAssets, asset] })),
      updateMediaAsset: (id, updated) => set((state) => ({
        mediaAssets: state.mediaAssets.map((a) => (a.id === id ? { ...a, ...updated } : a)),
      })),
      deleteMediaAsset: (id) => set((state) => ({
        mediaAssets: state.mediaAssets.filter((a) => (a.id !== id)),
      })),

      addSocialIdea: (idea) => set((state) => ({ socialIdeas: [...state.socialIdeas, idea] })),
      updateSocialIdea: (id, updated) => set((state) => ({
        socialIdeas: state.socialIdeas.map((i) => (i.id === id ? { ...i, ...updated } : i)),
      })),
      deleteSocialIdea: (id) => set((state) => ({
        socialIdeas: state.socialIdeas.filter((i) => (i.id !== id)),
      })),

      addSocialTask: (task) => set((state) => ({ socialTasks: [...state.socialTasks, task] })),
      updateSocialTask: (id, updated) => set((state) => ({
        socialTasks: state.socialTasks.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      })),
      deleteSocialTask: (id) => set((state) => ({
        socialTasks: state.socialTasks.filter((t) => (t.id !== id)),
      })),

      addContentTemplate: (template) => set((state) => ({ contentTemplates: [...state.contentTemplates, template] })),
      updateContentTemplate: (id, updated) => set((state) => ({
        contentTemplates: state.contentTemplates.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      })),
      deleteContentTemplate: (id) => set((state) => ({
        contentTemplates: state.contentTemplates.filter((t) => (t.id !== id)),
      })),

      addShooting: (shooting) => set((state) => ({ shootings: [...state.shootings, shooting] })),
      updateShooting: (id, updated) => set((state) => ({
        shootings: state.shootings.map((s) => (s.id === id ? { ...s, ...updated } : s)),
      })),
      deleteShooting: (id) => set((state) => ({
        shootings: state.shootings.filter((s) => (s.id !== id)),
      })),

      addTodo: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
      updateTodo: (id, updated) => set((state) => ({
        todos: state.todos.map((t) => (t.id === id ? { ...t, ...updated } : t)),
      })),
      deleteTodo: (id) => set((state) => ({
        todos: state.todos.filter((t) => (t.id !== id)),
      })),

      addAttendanceLog: (log) => set((state) => ({
        attendanceLogs: [log, ...state.attendanceLogs]
      })),
      updateAttendanceLog: (id, updates) => set((state) => ({
        attendanceLogs: state.attendanceLogs.map(log => log.id === id ? { ...log, ...updates } : log)
      })),
      deleteAttendanceLog: (id) => set((state) => ({
        attendanceLogs: state.attendanceLogs.filter(log => log.id !== id)
      })),
      addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications] })),
      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),

      addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
      updateProduct: (id, updated) => set((state) => ({
        products: state.products.map(p => p.id === id ? { ...p, ...updated } : p)
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter(p => p.id !== id)
      })),

      addRecurringConfig: (config) => set((state) => ({ recurringConfigs: [...state.recurringConfigs, config] })),
      updateRecurringConfig: (id, updated) => set((state) => ({
        recurringConfigs: state.recurringConfigs.map(c => c.id === id ? { ...c, ...updated } : c)
      })),
      deleteRecurringConfig: (id) => set((state) => ({
        recurringConfigs: state.recurringConfigs.filter(c => c.id !== id)
      })),

      updateInvoiceSettings: (updated) => set((state) => ({
        invoiceSettings: { ...state.invoiceSettings, ...updated }
      })),

      // Project Actions Implementation
      addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
      updateProject: (id, updated) => set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, ...updated } : p))
      })),
      deleteProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        projectTasks: state.projectTasks.filter((t) => t.projectId !== id),
        projectExpenses: state.projectExpenses.filter((e) => e.projectId !== id),
        adminProjectHours: state.adminProjectHours.filter((h) => h.projectId !== id),
        timeAllocations: state.timeAllocations.filter((a) => a.projectId !== id)
      })),

      addProjectTask: (task) => set((state) => ({ projectTasks: [...state.projectTasks, task] })),
      updateProjectTask: (id, updated) => set((state) => ({
        projectTasks: state.projectTasks.map((t) => (t.id === id ? { ...t, ...updated } : t))
      })),
      deleteProjectTask: (id) => set((state) => ({
        projectTasks: state.projectTasks.filter((t) => t.id !== id),
        timeAllocations: state.timeAllocations.map(a => a.taskId === id ? { ...a, taskId: undefined } : a)
      })),

      addProjectExpense: (expense) => set((state) => ({ projectExpenses: [...state.projectExpenses, expense] })),
      updateProjectExpense: (id, updated) => set((state) => ({
        projectExpenses: state.projectExpenses.map((e) => (e.id === id ? { ...e, ...updated } : e))
      })),
      deleteProjectExpense: (id) => set((state) => ({
        projectExpenses: state.projectExpenses.filter((e) => e.id !== id)
      })),

      addAdminProjectHour: (hour) => set((state) => ({ adminProjectHours: [...state.adminProjectHours, hour] })),
      deleteAdminProjectHour: (id) => set((state) => ({
        adminProjectHours: state.adminProjectHours.filter((h) => h.id !== id)
      })),

      addTimeAllocation: (allocation) => set((state) => ({ timeAllocations: [...state.timeAllocations, allocation] })),
      updateTimeAllocation: (id, updated) => set((state) => ({
        timeAllocations: state.timeAllocations.map(a => a.id === id ? { ...a, ...updated } : a)
      })),
      deleteTimeAllocation: (id) => set((state) => ({
        timeAllocations: state.timeAllocations.filter(a => a.id !== id)
      })),
      addUnassignedWorkTime: (time) => set((state) => ({ unassignedWorkTimes: [...state.unassignedWorkTimes, time] })),

      addFreelancerTag: (tag) => set((state) => ({ freelancerTags: [...state.freelancerTags, tag] })),
      updateFreelancerTag: (id, updated) => set((state) => ({
        freelancerTags: state.freelancerTags.map((t) => t.id === id ? { ...t, ...updated } : t)
      })),
      deleteFreelancerTag: (id) => set((state) => ({
        freelancerTags: state.freelancerTags.filter((t) => t.id !== id)
      })),

      addFreelancerWorkLog: (log) => set((state) => ({ freelancerWorkLogs: [...state.freelancerWorkLogs, log] })),
      updateFreelancerWorkLog: (id, updated) => set((state) => ({
        freelancerWorkLogs: state.freelancerWorkLogs.map((l) => l.id === id ? { ...l, ...updated } : l)
      })),
      deleteFreelancerWorkLog: (id) => set((state) => ({
        freelancerWorkLogs: state.freelancerWorkLogs.filter((l) => l.id !== id)
      })),
      
      addSavedPosition: (pos) => set((state) => {
        if (state.savedPositions.some(p => p.name === pos.name)) return {};
        return { savedPositions: [...state.savedPositions, pos] };
      }),
      deleteSavedPosition: (id) => set((state) => ({
        savedPositions: state.savedPositions.filter(p => p.id !== id)
      })),

      addBankTransactions: (txs) => set((state) => ({
        bankTransactions: [...state.bankTransactions, ...txs]
      })),
      updateBankTransaction: (id, updates) => set((state) => ({
        bankTransactions: state.bankTransactions.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
      })),
      deleteBankTransaction: (id) => set((state) => ({
        bankTransactions: state.bankTransactions.filter(tx => tx.id !== id)
      })),
      clearBankTransactions: () => set(() => ({
        bankTransactions: []
      })),

    }),
    {
      name: "trada-data-storage",
    }
  )
);
