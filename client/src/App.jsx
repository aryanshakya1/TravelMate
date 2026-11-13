import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { RouterProvider, useRouter } from './context/RouterContext.jsx';
import Navbar from './components/Navbar.jsx';

import DashboardPage from './pages/DashboardPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CreateGroupPage from './pages/CreateGroupPage.jsx';
import FindGroupsPage from './pages/FindGroupsPage.jsx';
import GroupDetailsPage from './pages/GroupDetailsPage.jsx';
import CommonGroupWorkspacePage from './pages/CommonGroupWorkspacePage.jsx';

function RouteSwitch() {
  const { currentPath } = useRouter();

  // Pattern matching for dynamic routes
  if (currentPath === '/' || currentPath === '/dashboard') {
    return <DashboardPage />;
  }
  if (currentPath === '/register') {
    return <RegisterPage />;
  }
  if (currentPath === '/create-group') {
    return <CreateGroupPage />;
  }
  if (currentPath === '/find-groups') {
    return <FindGroupsPage />;
  }

  // /groups/:id/workspace
  const workspaceMatch = currentPath.match(/^\/groups\/([^/]+)\/workspace$/);
  if (workspaceMatch) {
    return <CommonGroupWorkspacePage groupId={workspaceMatch[1]} />;
  }

  // /groups/:id
  const groupDetailsMatch = currentPath.match(/^\/groups\/([^/]+)$/);
  if (groupDetailsMatch) {
    return <GroupDetailsPage groupId={groupDetailsMatch[1]} />;
  }

  // Default fallback
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
          <Navbar />
          <main className="flex-1">
            <RouteSwitch />
          </main>
          <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="font-semibold text-slate-700">
                TravelMate — Smart Group Travel Matcher • Booking Holdings HACKCELLENCE
              </div>
              <div className="text-[11px] text-slate-400">
                All mock data covering Tokyo, Kyoto, Osaka, Dubai, Abu Dhabi (April 1–20, 2027)
              </div>
            </div>
          </footer>
        </div>
      </RouterProvider>
    </AuthProvider>
  );
}
