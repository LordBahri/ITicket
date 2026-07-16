export type Role = "ADMIN" | "AGENT" | "USER";

export type CompanyType = "HOLDING" | "FILIALE";

export type TicketStatus = "PENDING_APPROVAL" | "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED" | "CLOSED";

export type TicketChannel = "WEB" | "EMAIL" | "CHAT" | "API" | "PHONE" | "SLACK" | "TEAMS";

export interface Service {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; type: CompanyType } | null;
  services?: Service[];
  users?: OrgUser[];
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  managerId: string | null;
  service: Service | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  service: Service | null;
  manager?: { id: string; name: string } | null;
  company: Company;
  isActive: boolean;
  isDepartmentHead?: boolean;
  createdAt?: string;
  matricule?: string | null;
  phone?: string | null;
  pcName?: string | null;
  anydeskId?: string | null;
  teamviewerId?: string | null;
  ultraviewerId?: string | null;
}

export interface RemoteAccessUser {
  id: string;
  name: string;
  email: string;
  pcName: string | null;
  anydeskId: string | null;
  teamviewerId: string | null;
  ultraviewerId: string | null;
  company: { id: string; name: string };
  service: { id: string; name: string } | null;
}

export interface TicketType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface SubCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  categoryId: string;
}

export interface Priority {
  id: string;
  name: string;
  level: number;
  color: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
}

export interface Comment {
  id: string;
  ticketId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; name: string; role: Role };
}

export interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  url: string;
  createdAt: string;
}

export type ProcessCategory =
  | "CHANGE_ENABLEMENT"
  | "REQUEST_FULFILLMENT"
  | "ACCESS_MANAGEMENT"
  | "ASSET_MANAGEMENT"
  | "ONBOARDING"
  | "OFFBOARDING";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProcessStep {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  processId: string;
}

export interface Process {
  id: string;
  name: string;
  category: ProcessCategory;
  description: string | null;
  requiresManagerApproval: boolean;
  requiresPhysicalForm: boolean;
  formTemplateUrl: string | null;
  isActive: boolean;
  steps: ProcessStep[];
}

export interface ProcessApproval {
  id: string;
  status: ApprovalStatus;
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string; email: string };
}

export interface ProcessStepCompletion {
  id: string;
  isDone: boolean;
  doneAt: string | null;
  note: string | null;
  processStep: ProcessStep;
  doneBy: { id: string; name: string } | null;
}

export interface Ticket {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: TicketStatus;
  channel: TicketChannel;
  type: TicketType;
  category: Category;
  subCategory: SubCategory | null;
  priority: Priority;
  requester: { id: string; name: string; email: string; service: Service | null; company: Company };
  assignee: { id: string; name: string; email: string } | null;
  process?: { id: string; name: string; category: ProcessCategory; requiresManagerApproval: boolean; requiresPhysicalForm: boolean; formTemplateUrl: string | null } | null;
  approval?: ProcessApproval | null;
  stepCompletions?: ProcessStepCompletion[];
  physicalFormArchivedAt?: string | null;
  physicalFormArchivedBy?: { id: string; name: string } | null;
  dueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  comments?: Comment[];
  attachments?: Attachment[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  category: Category | null;
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export type AssetStatus = "EN_SERVICE" | "EN_STOCK" | "EN_MAINTENANCE" | "RETIRE";

export interface AssetType {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Asset {
  id: string;
  name: string;
  serialNumber: string | null;
  model: string | null;
  status: AssetStatus;
  purchaseDate: string | null;
  warrantyEndDate: string | null;
  notes: string | null;
  createdAt: string;
  assetType: AssetType;
  company: { id: string; name: string } | null;
  assignee: { id: string; name: string; email: string } | null;
}

export interface License {
  id: string;
  name: string;
  vendor: string | null;
  licenseKey: string | null;
  seats: number;
  startDate: string | null;
  expiryDate: string;
  notes: string | null;
  createdAt: string;
  company: { id: string; name: string } | null;
}

export type ChangelogType = "FEATURE" | "IMPROVEMENT" | "FIX";

export interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  type: ChangelogType;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string | null;
  fetchedAt: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<string, number>;
  overdueCount: number;
  avgResolutionHours: number | null;
}
