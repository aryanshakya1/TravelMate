import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import api from '../services/api.js';
import Notification from '../components/Notification.jsx';
import { 
  Compass, 
  Search, 
  PlusCircle, 
  Users, 
  MapPin, 
  Calendar, 
  Wallet, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function DashboardPage() {
  const { currentTraveller } = useAuth();
  const { navigate } = useRouter();

  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getGroups();
      if (data && data.groups) {
        setAllGroups(data.groups);
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to load groups.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const activeId = currentTraveller?.traveller_id;
  const ownedGroups = allGroups.filter(g => g.owner_id === activeId);
  const joinedGroups = allGroups.filter(g => g.owner_id !== activeId && (g.member_ids || []).includes(activeId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Hero Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-700 via-brand-800 to-slate-900 p-8 sm:p-10 text-white shadow-xl shadow-brand-900/10 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-brand-200 border border-white/10 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Active Persona: {currentTraveller ? currentTraveller.name : 'Guest'} ({currentTraveller?.traveller_id})</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Find Your Group. Split Costs. Travel Together.
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Welcome to TravelMate. We pair solo travellers through 6 strict compatibility rules—matching destinations, overlapping dates, budget similarity, shared interests, and mutual safety preferences.
          </p>

          {/* Quick CTA Actions */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/find-groups')}
              className="px-6 py-3.5 rounded-2xl bg-white text-brand-800 font-bold text-sm hover:bg-brand-50 transition shadow-lg shadow-black/10 flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-brand-600" />
              <span>Find Travel Groups (Seeker)</span>
              <ArrowRight className="w-4 h-4 text-brand-400" />
            </button>
            <button
              onClick={() => navigate('/create-group')}
              className="px-6 py-3.5 rounded-2xl bg-brand-600/80 hover:bg-brand-600 text-white font-bold text-sm border border-brand-400/30 transition flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Group Trip (Creator)</span>
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Active Profile Info Card */}
      {currentTraveller && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold text-white shadow-md ${
              currentTraveller.gender === 'FEMALE' ? 'bg-pink-600 shadow-pink-500/20' : 'bg-brand-600 shadow-brand-500/20'
            }`}>
              {currentTraveller.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{currentTraveller.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {currentTraveller.traveller_id}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  currentTraveller.gender === 'FEMALE' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {currentTraveller.gender} ({currentTraveller.age}y)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500">
                <span>Origin: <strong className="text-slate-700">{currentTraveller.home_city} ({currentTraveller.home_airport || 'BLR'})</strong></span>
                <span>•</span>
                <span>Preference: <strong className="text-slate-700">{currentTraveller.gender_preference}</strong></span>
              </div>
            </div>
          </div>

          {/* Interests Chips */}
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {currentTraveller.interests.map((interest) => (
              <span key={interest} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                #{interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* My Owned Groups & Joined Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">My Travel Groups</h2>
            <p className="text-xs text-slate-500">Groups you created or have been approved to join.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
            {ownedGroups.length + joinedGroups.length} Active
          </span>
        </div>

        {ownedGroups.length === 0 && joinedGroups.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-200">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">You haven't joined or created any groups yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Start by searching for matching trips in Kyoto, Tokyo, or Dubai, or post your own trip plan.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => navigate('/find-groups')}
                className="px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition"
              >
                Find Compatible Groups
              </button>
              <button
                onClick={() => navigate('/create-group')}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition"
              >
                Create a Trip
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Owned Groups */}
            {ownedGroups.map((g) => (
              <div 
                key={g.group_id}
                className="bg-white rounded-2xl p-5 border border-brand-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      Trip Owner
                    </span>
                    <span className="font-mono text-xs text-slate-400">{g.group_id}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{g.name}</h3>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      <span>{g.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g.check_in} → {g.check_out}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>₹{g.budget_inr.toLocaleString('en-IN')} approx budget</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>{g.currentMembersCount} / {g.max_size} members</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/groups/${g.group_id}`)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
                  >
                    <span>Manage Requests</span>
                  </button>
                  <button
                    onClick={() => navigate(`/groups/${g.group_id}/workspace`)}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                  >
                    <span>Group Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Joined Groups */}
            {joinedGroups.map((g) => (
              <div 
                key={g.group_id}
                className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Approved Member
                    </span>
                    <span className="font-mono text-xs text-slate-400">{g.group_id}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{g.name}</h3>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" />
                      <span>{g.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{g.check_in} → {g.check_out}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>{g.currentMembersCount} / {g.max_size} members</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/groups/${g.group_id}/workspace`)}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Open Common Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Available Travel Groups in Catalog */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Explore Open Trips</h2>
            <p className="text-xs text-slate-500">All registered group trips open for travellers in April 2027.</p>
          </div>
          <button
            onClick={() => navigate('/find-groups')}
            className="text-xs font-bold text-brand-600 hover:text-brand-800 transition flex items-center gap-1"
          >
            <span>Run Rule-Based Match Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading catalog groups...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allGroups.map((group) => {
              const isOwner = group.owner_id === activeId;
              const isMember = (group.member_ids || []).includes(activeId);
              return (
                <div
                  key={group.group_id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {group.city}
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-400">{group.group_id}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug">{group.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.itinerary}</p>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Dates:</span>
                        <span className="font-medium">{group.check_in} → {group.check_out}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Budget:</span>
                        <span className="font-bold text-slate-800">₹{group.budget_inr.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Owner:</span>
                        <span className="font-medium text-slate-700">{group.owner ? group.owner.name : group.owner_id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Capacity:</span>
                        <span className={`font-semibold ${group.isFull ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {group.currentMembersCount} / {group.max_size} members {group.isFull ? '(Full)' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/groups/${group.group_id}`)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 transition"
                    >
                      View Details
                    </button>
                    {isMember ? (
                      <button
                        onClick={() => navigate(`/groups/${group.group_id}/workspace`)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition"
                      >
                        Open Workspace
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/groups/${group.group_id}`)}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 text-xs font-bold hover:bg-brand-100 transition"
                      >
                        Interested
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
