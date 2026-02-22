import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectWorkspace from './pages/ProjectWorkspace';
import SchemaEditor from './pages/SchemaEditor';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/project/:projectId" element={<ProjectWorkspace />} />
      <Route path="/project/:projectId/schema/new" element={<SchemaEditor />} />
      <Route path="/project/:projectId/schema/:schemaId" element={<SchemaEditor />} />
    </Routes>
  );
}
