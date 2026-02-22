import { useState, useCallback } from 'react';

let logIdCounter = 0;

export default function useConsole() {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addLog = useCallback((entry) => {
    const log = {
      id: ++logIdCounter,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setLogs((prev) => [log, ...prev].slice(0, 200));
    if (!isOpen && entry.type === 'error') {
      setIsOpen(true);
    }
  }, [isOpen]);

  const logRequest = useCallback((method, path, response) => {
    addLog({
      type: 'request',
      method,
      path,
      status: response?.status,
      duration: response?.duration,
      size: response?.size,
    });
  }, [addLog]);

  const logInfo = useCallback((message) => {
    addLog({ type: 'info', message });
  }, [addLog]);

  const logError = useCallback((message) => {
    addLog({ type: 'error', message });
  }, [addLog]);

  const logSuccess = useCallback((message) => {
    addLog({ type: 'success', message });
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    isOpen,
    setIsOpen,
    addLog,
    logRequest,
    logInfo,
    logError,
    logSuccess,
    clearLogs,
  };
}
