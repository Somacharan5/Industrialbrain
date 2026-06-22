import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import QueryPage from '@/pages/QueryPage'
import KnowledgeGraphPage from '@/pages/KnowledgeGraphPage'
import CompliancePage from '@/pages/CompliancePage'
import RCAPage from '@/pages/RCAPage'
import IngestPage from '@/pages/IngestPage'
import MaintenancePage from '@/pages/MaintenancePage'
import DocumentsPage from '@/pages/DocumentsPage'
import KnowledgeHealthPage from '@/pages/KnowledgeHealthPage'
import FieldAssistPage from '@/pages/FieldAssistPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="query"       element={<QueryPage />} />
          <Route path="graph"       element={<KnowledgeGraphPage />} />
          <Route path="compliance"  element={<CompliancePage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="rca"         element={<RCAPage />} />
          <Route path="ingest"      element={<IngestPage />} />
          <Route path="documents"   element={<DocumentsPage />} />
          <Route path="health"      element={<KnowledgeHealthPage />} />
          <Route path="field"       element={<FieldAssistPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
