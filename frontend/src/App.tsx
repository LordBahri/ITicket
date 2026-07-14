import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { TicketList } from "./pages/TicketList";
import { TicketDetail } from "./pages/TicketDetail";
import { NewTicket } from "./pages/NewTicket";
import { KnowledgeBase } from "./pages/KnowledgeBase";
import { KnowledgeArticleDetail } from "./pages/KnowledgeArticleDetail";
import { AdminCategories } from "./pages/AdminCategories";
import { AdminPriorities } from "./pages/AdminPriorities";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminCompanies } from "./pages/AdminCompanies";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<TicketList />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/knowledge/:id" element={<KnowledgeArticleDetail />} />

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/priorities" element={<AdminPriorities />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/companies" element={<AdminCompanies />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
