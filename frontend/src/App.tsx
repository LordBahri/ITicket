import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { TicketList } from "./pages/TicketList";
import { TicketDetail } from "./pages/TicketDetail";
import { NewTicket } from "./pages/NewTicket";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeArticleDetail } from "./pages/KnowledgeArticleDetail";
import { ManualHub } from "./pages/ManualHub";
import { ManualUser } from "./pages/ManualUser";
import { ManualAgent } from "./pages/ManualAgent";
import { ManualAdmin } from "./pages/ManualAdmin";
import { AdminTicketTypes } from "./pages/AdminTicketTypes";
import { TicketTypeDetail } from "./pages/TicketTypeDetail";
import { AdminCategories } from "./pages/AdminCategories";
import { CategoryDetail } from "./pages/CategoryDetail";
import { SubCategoryDetail } from "./pages/SubCategoryDetail";
import { AdminPriorities } from "./pages/AdminPriorities";
import { AdminUsers } from "./pages/AdminUsers";
import { UserDetail } from "./pages/UserDetail";
import { AdminCompanies } from "./pages/AdminCompanies";
import { CompanyDetail } from "./pages/CompanyDetail";
import { AdminAssets } from "./pages/AdminAssets";
import { AdminLicenses } from "./pages/AdminLicenses";
import { AdminProcesses } from "./pages/AdminProcesses";
import { Account } from "./pages/Account";
import { RemoteAccess } from "./pages/RemoteAccess";
import { Chat } from "./pages/Chat";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/knowledge/:id" element={<KnowledgeArticleDetail />} />
          <Route path="/manual" element={<ManualHub />} />
          <Route path="/account" element={<Account />} />
          <Route path="/chat" element={<Chat />} />

          <Route element={<ProtectedRoute roles={["USER", "ADMIN"]} />}>
            <Route path="/manual/user" element={<ManualUser />} />
          </Route>

          <Route element={<ProtectedRoute roles={["AGENT", "ADMIN"]} />}>
            <Route path="/remote-access" element={<RemoteAccess />} />
            <Route path="/manual/agent" element={<ManualAgent />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/manual/admin" element={<ManualAdmin />} />
            <Route path="/admin/ticket-types" element={<AdminTicketTypes />} />
            <Route path="/admin/ticket-types/:id" element={<TicketTypeDetail />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/categories/:id" element={<CategoryDetail />} />
            <Route path="/admin/subcategories/:id" element={<SubCategoryDetail />} />
            <Route path="/admin/priorities" element={<AdminPriorities />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:id" element={<UserDetail />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
            <Route path="/admin/companies/:id" element={<CompanyDetail />} />
            <Route path="/admin/assets" element={<AdminAssets />} />
            <Route path="/admin/licenses" element={<AdminLicenses />} />
            <Route path="/admin/processes" element={<AdminProcesses />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
