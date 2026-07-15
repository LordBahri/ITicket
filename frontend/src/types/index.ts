export type Role = "ADMIN" | "AGENT" | "USER";

export type CompanyType = "HOLDING" | "FILIALE";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED" | "CLOSED";

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
  createdAt?: string;
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

export interface DashboardStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<string, number>;
  overdueCount: number;
  avgResolutionHours: number | null;
}
