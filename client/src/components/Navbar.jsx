import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Compass, PlusCircle, Search, UserCheck, ChevronDown, Bell, Shield, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { currentPath, navigate } = useRouter();
  const { travellers, currentTraveller, switchTraveller, pendingRequestsCount } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: Compass },
    { label: 'Find Groups', path: '/find-groups', icon: Search },
    { label: 'Create Group', path: '/create-group', icon: PlusCircle },
    { label: 'Register Profile', path: '/register', icon: UserCheck }
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:bg-brand-700 transition">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">TravelMate</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 border border-brand-200">
                  HACKCELLENCE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Smart Group Travel Matcher</p>
            </div>
          </div>

          {/* Navigation items */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentPath === link.path || (link.path === '/' && currentPath === '/dashboard');
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Right Section: Active Traveller Persona Switcher & Notification Badge */}
          <div className="flex items-center gap-3">
            {pendingRequestsCount > 0 && (
              <div 
                onClick={() => navigate('/')}
                title={`${pendingRequestsCount} pending requests require your approval`}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold cursor-pointer hover:bg-amber-100 transition animate-pulse"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>{pendingRequestsCount} Pending</span>
              </div>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-slate-200 hover:border-brand-300 hover:bg-slate-50 transition bg-white shadow-sm"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                  currentTraveller?.gender === 'FEMALE' ? 'bg-pink-600' : 'bg-brand-600'
                }`}>
                  {currentTraveller ? currentTraveller.name.charAt(0) : '?'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentTraveller ? currentTraveller.name : 'Select Traveller'}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight flex items-center gap-1">
                    <span>{currentTraveller?.home_city || 'India'}</span>
                    <span>•</span>
                    <span className="font-semibold">{currentTraveller?.traveller_id}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Switch Active Profile</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">Demo Personas</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Switch between Sarah (Creator), Priya (Seeker), or any registered traveller.
                      </p>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1">
                      {travellers.map((t) => {
                        const isSelected = currentTraveller?.traveller_id === t.traveller_id;
                        return (
                          <button
                            key={t.traveller_id}
                            onClick={() => {
                              switchTraveller(t.traveller_id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs transition ${
                              isSelected ? 'bg-brand-50 text-brand-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white ${
                                t.gender === 'FEMALE' ? 'bg-pink-500' : 'bg-brand-500'
                              }`}>
                                {t.name.charAt(0)}
                              </span>
                              <div>
                                <div className="font-medium">{t.name}</div>
                                <div className="text-[10px] text-slate-400">{t.home_city} • {t.gender_preference}</div>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">{t.traveller_id}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/register');
                        }}
                        className="w-full text-center py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        + Register New Traveller
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
