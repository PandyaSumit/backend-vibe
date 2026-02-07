import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import SchemaEditor from './pages/SchemaEditor';
import ApiExplorer from './pages/ApiExplorer';
import EndpointBuilder from './pages/EndpointBuilder';
import CodeExport from './pages/CodeExport';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
      </Route>
      <Route path="/project/:projectId" element={<Layout />}>
        <Route index element={<ProjectDetail />} />
        <Route path="schema/new" element={<SchemaEditor />} />
        <Route path="schema/:schemaId" element={<SchemaEditor />} />
        <Route path="api" element={<ApiExplorer />} />
        <Route path="endpoints" element={<EndpointBuilder />} />
        <Route path="export" element={<CodeExport />} />
      </Route>
    </Routes>
  );
}
