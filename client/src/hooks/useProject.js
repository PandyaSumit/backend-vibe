import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { projects as projectsApi, schemas as schemasApi, endpoints as endpointsApi } from '../services/api';

const ProjectContext = createContext(null);

export function ProjectProvider({ projectId, children }) {
  const project = useProjectData(projectId);
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  return useContext(ProjectContext);
}

function useProjectData(projectId) {
  const [project, setProject] = useState(null);
  const [schemaList, setSchemaList] = useState([]);
  const [customEndpoints, setCustomEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError('');
    try {
      const [proj, schemas, eps] = await Promise.all([
        projectsApi.get(projectId),
        schemasApi.listByProject(projectId),
        endpointsApi.listByProject(projectId),
      ]);
      setProject(proj);
      setSchemaList(schemas);
      setCustomEndpoints(eps);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshSchemas = useCallback(async () => {
    try {
      const schemas = await schemasApi.listByProject(projectId);
      setSchemaList(schemas);
    } catch {}
  }, [projectId]);

  const refreshEndpoints = useCallback(async () => {
    try {
      const eps = await endpointsApi.listByProject(projectId);
      setCustomEndpoints(eps);
    } catch {}
  }, [projectId]);

  return {
    project,
    schemaList,
    customEndpoints,
    loading,
    error,
    reload: load,
    refreshSchemas,
    refreshEndpoints,
    setSchemaList,
    setCustomEndpoints,
  };
}

export default useProjectData;
