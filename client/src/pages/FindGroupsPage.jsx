import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import api from '../services/api.js';
import Notification from '../components/Notification.jsx';
import MemberProfileModal from '../components/MemberProfileModal.jsx';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Wallet, 
  Users, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  HelpCircle,
  Percent,
  CheckCircle2,
  Clock,
  Filter,
  SlidersHorizontal,
  User
} from 'lucide-react';

export default function FindGroupsPage() {
  const { currentTraveller } = useAuth();
  const { navigate } = useRouter();

  // Search form criteria (defaults to Priya's scenario if Priya is active, or Kyoto demo)
  const [city, setCity] = useState('Kyoto');
  const [checkIn, setCheckIn] = useState('2027-04-09');
  const [checkOut, setCheckOut] = useState('2027-04-16');
  const [budget, setBudget] = useState(62000);
  const [selectedInterests, setSelectedInterests] = useState(['TEMPLES', 'STREET_FOOD', 'ADVENTURE']);
  const [genderPreference, setGenderPreference] = useState(currentTraveller?.gender_preference || 'SAME_GENDER');

  const [availableInterests, setAvailableInterests] = useState([]);
  const [supportedCities, setSupportedCities] = useState([]);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState(null);

  // Result Filters
  const [interestFilter, setInterestFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('COMPATIBILITY');

  // Selected Profile Modal
  const [selectedProfileTraveller, setSelectedProfileTraveller] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync with current traveller when persona changes
  useEffect(() => {
    if (currentTraveller) {
      if (currentTraveller.interests && currentTraveller.interests.length > 0) {
        setSelectedInterests(currentTraveller.interests);
      }
      if (currentTraveller.gender_preference) {
        setGenderPreference(currentTraveller.gender_preference);
      }
    }
  }, [currentTraveller]);

  // Load catalog options
  useEffect(() => {
    async function loadData() {
      try {
        const [destData, intData] = await Promise.all([
          api.getDestinations(),
          api.getInterests()
        ]);
        if (destData && destData.supportedCities) setSupportedCities(destData.supportedCities);
        if (intData && intData.interests) setAvailableInterests(intData.interests);
      } catch (err) {
        console.error('Failed to load catalog data:', err);
      }
    }
    loadData();
  }, []);

  const toggleInterest = (interestId) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setNotification(null);

    if (checkOut <= checkIn) {
      setNotification({ type: 'error', message: 'Check-out date must be strictly after check-in date.' });
      return;
    }

    if (selectedInterests.length === 0) {
      setNotification({ type: 'error', message: 'Please select at least one travel interest.' });
      return;
    }

    setSearching(true);
    try {
      const payload = {
        traveller_id: currentTraveller?.traveller_id,
        destination: city,
        check_in: checkIn,
        check_out: checkOut,
        budget_inr: Number(budget),
        interests: selectedInterests,
        gender: currentTraveller?.gender || 'FEMALE',
        gender_preference: genderPreference
      };

      const data = await api.findMatches(payload);
      setResults(data);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Error executing matching query.' });
    } finally {
      setSearching(false);
    }
  };

  // Run search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  // Quick preset helper for judge demo
  const loadPriyaScenario = () => {
    setCity('Kyoto');
    setCheckIn('2027-04-09');
    setCheckOut('2027-04-16');
    setBudget(62000);
    setSelectedInterests(['TEMPLES', 'STREET_FOOD', 'ADVENTURE']);
    setGenderPreference('SAME_GENDER');
    setTimeout(() => handleSearch(), 50);
  };

  const loadTokyoScenario = () => {
    setCity('Tokyo');
    setCheckIn('2027-04-05');
    setCheckOut('2027-04-10');
    setBudget(70000);
    setSelectedInterests(['STREET_FOOD', 'SHOPPING', 'NIGHTLIFE']);
    setGenderPreference('ANY');
    setTimeout(() => handleSearch(), 50);
  };

  // Filter and sort matches
  const filteredMatches = results?.matches ? results.matches.filter(m => {
    if (interestFilter === 'ALL') return true;
    return m.matchReasons?.sharedInterests?.includes(interestFilter);
  }).sort((a, b) => {
    if (sortBy === 'BUDGET_LOW') return a.budget - b.budget;
    if (sortBy === 'OVERLAP_HIGH') return b.matchReasons.overlapNights - a.matchReasons.overlapNights;
    return b.compatibilityScore - a.compatibilityScore;
  }) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Presets */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-xs font-semibold text-brand-700 border border-brand-200 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Group Seeker Matching Engine (Scenario B: Priya)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Find Compatible Travel Groups
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Searches across open groups applying the 6 mandatory rules, explainable ranking, and transparent criteria breakdowns.
          </p>
        </div>

        {/* Demo Scenario Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadPriyaScenario}
            className="px-3.5 py-1.5 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 text-xs font-bold hover:bg-pink-100 transition shadow-sm"
          >
            ⚡ Load Scenario B (Priya in Kyoto)
          </button>
          <button
            onClick={loadTokyoScenario}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
          >
            ⚡ Load Tokyo Food Crawl
          </button>
        </div>
      </div>

      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Search Criteria Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Destination City</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium bg-white"
              >
                {supportedCities.map(c => (
                  <option key={c.name} value={c.name}>{c.name}, {c.country}</option>
                ))}
              </select>
            </div>

            {/* Check-In */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Check-In</span>
              </label>
              <input
                type="date"
                min="2027-04-01"
                max="2027-04-19"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium bg-white"
              />
            </div>

            {/* Check-Out */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Check-Out</span>
              </label>
              <input
                type="date"
                min="2027-04-02"
                max="2027-04-20"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium bg-white"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Budget (INR)</span>
              </label>
              <input
                type="number"
                step="500"
                min="1000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium"
              />
            </div>
          </div>

          {/* Interests & Gender Preference */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Travel Interests (Minimum 2 shared with group owner)
              </label>
              <span className="text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                {selectedInterests.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableInterests.map(item => {
                const isSelected = selectedInterests.includes(item.interest);
                return (
                  <button
                    key={item.interest}
                    type="button"
                    onClick={() => toggleInterest(item.interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{searching ? 'Evaluating 6 Rules...' : 'Find Compatible Groups'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Header and Optional Filters (G1) */}
      {results && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Matching Groups ({filteredMatches.length} of {results.totalMatches})
              </h2>
              <p className="text-xs text-slate-500">
                Ranked by 40% Interest Similarity + 35% Date Overlap + 25% Budget Similarity.
              </p>
            </div>

            {/* Optional G1 Filters */}
            {results.matches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-slate-500 font-medium">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter Interest:</span>
                </div>
                <select
                  value={interestFilter}
                  onChange={(e) => setInterestFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="ALL">All Shared Interests</option>
                  <option value="TEMPLES">Temples</option>
                  <option value="STREET_FOOD">Street Food</option>
                  <option value="PHOTOGRAPHY">Photography</option>
                  <option value="ADVENTURE">Adventure</option>
                </select>

                <div className="flex items-center gap-1 text-slate-500 font-medium ml-2">
                  <span>Sort By:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white font-medium"
                >
                  <option value="COMPATIBILITY">Compatibility %</option>
                  <option value="BUDGET_LOW">Lowest Budget</option>
                  <option value="OVERLAP_HIGH">Most Overlapping Nights</option>
                </select>
              </div>
            )}
          </div>

          {/* Matches List */}
          {filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMatches.map((match) => (
                <div
                  key={match.groupId}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-brand-300 transition flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Score Pill Banner */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                          {match.city}
                        </span>
                        <span className="font-mono text-xs text-slate-400 font-semibold">{match.groupId}</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-1">{match.groupName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{match.itinerary}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm shadow-sm">
                        <Percent className="w-3.5 h-3.5" />
                        <span>{match.compatibilityScore}% Match</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Rule-Based Score</div>
                    </div>
                  </div>

                  {/* Trip Details Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-slate-50 text-xs text-slate-700 mb-4 border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Trip Dates:</span>
                      <strong className="font-semibold">{match.checkIn} → {match.checkOut}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Group Budget:</span>
                      <strong className="font-semibold text-emerald-700">₹{match.budget.toLocaleString('en-IN')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Trip Creator:</span>
                      <button
                        onClick={() => {
                          setSelectedProfileTraveller(match.owner);
                          setIsProfileModalOpen(true);
                        }}
                        className="font-bold text-brand-600 hover:text-brand-800 transition flex items-center gap-1"
                      >
                        <User className="w-3 h-3" />
                        <span>{match.owner?.name}</span>
                      </button>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Capacity:</span>
                      <strong className="font-semibold text-purple-700">{match.currentMembers} / {match.maxSize} members</strong>
                    </div>
                  </div>

                  {/* Explainable Match Reason Checklist (Unique MVP Feature 1) */}
                  <div className="space-y-1.5 py-3 border-t border-slate-100 text-xs text-slate-600 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Compatibility Breakdown
                    </span>
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Same Destination: <strong>{match.city}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{match.matchReasons.overlapNights} overlapping nights ({match.matchReasons.overlapStart} to {match.matchReasons.overlapEnd})</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        {match.matchReasons.sharedInterestsCount} shared interests with owner: 
                        <strong className="ml-1 text-slate-800">
                          {match.matchReasons.sharedInterests.join(', ')}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Compatible budget (Difference: ₹{match.matchReasons.budgetDifference.toLocaleString('en-IN')} ≤ 40%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Mutual safety & gender preference compatible</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{match.matchReasons.availableSeats} seat(s) available</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/groups/${match.groupId}`)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
                    >
                      <span>Group Details</span>
                    </button>
                    <button
                      onClick={() => navigate(`/groups/${match.groupId}`)}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-brand-500/20"
                    >
                      <span>View & Express Interest</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Helpful No-Match Results State (Unique MVP Feature 2) */
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-extrabold text-slate-900">No compatible groups found</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  None of the existing groups met all 6 strict matching rules. Try adjusting your dates, budget, or interests to discover more groups.
                </p>
              </div>

              {/* Diagnostic Breakdown from Backend */}
              {results.diagnostics && (
                <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-brand-600" />
                    <span>Backend Eligibility Diagnostics</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    {results.diagnostics.destinationMismatch > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span><strong>{results.diagnostics.destinationMismatch}</strong> groups have different destinations</span>
                      </div>
                    )}
                    {results.diagnostics.insufficientOverlap > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span><strong>{results.diagnostics.insufficientOverlap}</strong> groups have &lt; 2 shared nights</span>
                      </div>
                    )}
                    {results.diagnostics.budgetIncompatible > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span><strong>{results.diagnostics.budgetIncompatible}</strong> groups differ by &gt; 40% budget</span>
                      </div>
                    )}
                    {results.diagnostics.insufficientInterests > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span><strong>{results.diagnostics.insufficientInterests}</strong> groups share &lt; 2 interests</span>
                      </div>
                    )}
                    {results.diagnostics.genderIncompatible > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span><strong>{results.diagnostics.genderIncompatible}</strong> groups had gender preference mismatch</span>
                      </div>
                    )}
                    {results.diagnostics.groupFull > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span><strong>{results.diagnostics.groupFull}</strong> groups are at full capacity</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions to Fix */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setCheckIn('2027-04-10');
                    setCheckOut('2027-04-16');
                    setBudget(65000);
                    setSelectedInterests([...selectedInterests, 'STREET_FOOD', 'TEMPLES', 'PHOTOGRAPHY']);
                    setTimeout(() => handleSearch(), 50);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold transition"
                >
                  Widen Dates & Add Common Interests
                </button>
                <button
                  onClick={() => navigate('/create-group')}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Create Your Own Group in {city}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Member Profile Modal (Optional G2) */}
      <MemberProfileModal
        traveller={selectedProfileTraveller}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
