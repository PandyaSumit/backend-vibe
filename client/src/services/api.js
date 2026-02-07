const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.headers.get('content-type')?.includes('application/json')) {
    return res.json();
  }
  return res;
}

// Projects
export const projects = {
  list: () => request('/projects'),
  get: (id) => request(`/projects/${id}`),
  create: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
};

// Schemas
export const schemas = {
  listByProject: (projectId) => request(`/schemas/project/${projectId}`),
  get: (id) => request(`/schemas/${id}`),
  create: (data) => request('/schemas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/schemas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/schemas/${id}`, { method: 'DELETE' }),
  preview: (id) => request(`/schemas/${id}/preview`),
};

// Custom Endpoints (AI-powered)
export const endpoints = {
  listByProject: (projectId) => request(`/endpoints/project/${projectId}`),
  get: (id) => request(`/endpoints/${id}`),
  generate: (data) => request('/endpoints/generate', { method: 'POST', body: JSON.stringify(data) }),
  save: (data) => request('/endpoints', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/endpoints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/endpoints/${id}`, { method: 'DELETE' }),
};

// Code Generation
export const generate = {
  project: (projectId) =>
    request(`/generate/${projectId}`, { method: 'POST' }),
  downloadUrl: (projectId) => `${BASE}/generate/${projectId}/download`,
};
