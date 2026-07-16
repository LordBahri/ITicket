import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { TicketList } from "./pages/TicketList";
import { TicketDetail } from "./pages/TicketDetail";
import { NewTicket } from "./pages/NewTicket";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeArticleDetail } from "./pages/KnowledgeArticleDetail";
import { AdminTicketTypes } from "./pages/AdminTicketTypes";
import { AdminCategories } from "./pages/AdminCategories";
import { AdminPriorities } from "./pages/AdminPriorities";
import { AdminUsers } from "./pages/AdminUsers";
import { UserDetail } from "./pages/UserDetail";
import { AdminCompanies } from "./pages/AdminCompanies";
import { CompanyDetail } from "./pages/CompanyDetail";
import { AdminAssets } from "./pages/AdminAssets";
import { AdminLicenses } from "./pages/AdminLicenses";
import { AdminProcesses } from "./pages/AdminProcesses";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/knowledge/:id" element={<KnowledgeArticleDetail />} />

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin/ticket-types" element={<AdminTicketTypes />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
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
