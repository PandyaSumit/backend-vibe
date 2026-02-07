import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import {
  Database,
  FolderOpen,
  Code2,
  Zap,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Projects', icon: FolderOpen, exact: true },
];

const PROJECT_NAV = [
  { path: '', label: 'Schemas', icon: Database },
  { path: '/api', label: 'API Explorer', icon: Zap },
  { path: '/export', label: 'Export Code', icon: Code2 },
];

export default function Layout() {
  const location = useLocation();
  const { projectId } = useParams();

  const isProjectRoute = !!projectId;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Database size={16} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-zinc-100">SchemaForge</div>
              <div className="text-[10px] text-zinc-500 tracking-wide uppercase">Backend Builder</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {isProjectRoute && (
            <>
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 rounded-md transition-colors"
              >
                <ArrowLeft size={14} />
                All Projects
              </Link>
              <div className="h-px bg-zinc-800 my-2" />
              {PROJECT_NAV.map((item) => {
                const fullPath = `/project/${projectId}${item.path}`;
                const isActive =
                  item.path === ''
                    ? location.pathname === fullPath
                    : location.pathname.startsWith(fullPath);

                return (
                  <Link
                    key={item.path}
                    to={fullPath}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          {!isProjectRoute &&
            NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-600 text-center">
            SchemaForge v1.0
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
