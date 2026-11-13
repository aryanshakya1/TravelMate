import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import api from '../services/api.js';
import Notification from '../components/Notification.jsx';
import { PlusCircle, MapPin, Calendar, Wallet, Users, FileText, ArrowRight, Sparkles } from 'lucide-react';

export default function CreateGroupPage() {
  const { currentTraveller } = useAuth();
  const { navigate } = useRouter();

  const [name, setName] = useState('Kyoto Spring Temples & Culture');
  const [city, setCity] = useState('Kyoto');
  const [checkIn, setCheckIn] = useState('2027-04-10');
  const [checkOut, setCheckOut] = useState('2027-04-15');
  const [budget, setBudget] = useState(60000);
  const [maxSize, setMaxSize] = useState(3);
  const [itinerary, setItinerary] = useState('Fushimi Inari at sunrise, Nishiki Market street food crawl, Gion historic walk, photo day in Arashiyama bamboo forest.');

  const [supportedCities, setSupportedCities] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    async function loadCities() {
      try {
        const data = await api.getDestinations();
        if (data && data.supportedCities) {
          setSupportedCities(data.supportedCities);
        }
      } catch (err) {
        console.error('Failed to load supported cities:', err.message);
      }
    }
    loadCities();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification(null);

    if (!currentTraveller) {
      setNotification({ type: 'error', message: 'Please select or register a traveller persona first.' });
      return;
    }

    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Group name is required.' });
      return;
    }

    if (!checkIn || !checkOut) {
      setNotification({ type: 'error', message: 'Check-in and check-out dates are required.' });
      return;
    }

    if (checkOut <= checkIn) {
      setNotification({ type: 'error', message: 'Check-out date must be strictly after check-in date.' });
      return;
    }

    if (checkIn < '2027-04-01' || checkOut > '2027-04-20') {
      setNotification({
        type: 'error',
        message: 'Dates must fall within the catalog period (April 1 to April 20, 2027).'
      });
      return;
    }

    if (Number(budget) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid positive budget in INR.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createGroup({
        name: name.trim(),
        owner_id: currentTraveller.traveller_id,
        city,
        check_in: checkIn,
        check_out: checkOut,
        budget_inr: Number(budget),
        max_size: Number(maxSize),
        itinerary: itinerary.trim()
      });

      if (res && res.group) {
        setNotification({
          type: 'success',
          message: `Group "${res.group.name}" created successfully with ID ${res.group.group_id}!`
        });

        setTimeout(() => {
          navigate(`/groups/${res.group.group_id}`);
        }, 1200);
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to create group.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 px-8 py-8 text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-brand-100 mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Group Creator Workflow (Scenario A: Sarah)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create a Group Trip Post</h1>
          <p className="text-brand-100 text-sm mt-1 max-w-xl">
            Post your upcoming trip plan. Compatible solo travellers can discover your post, view mutual match scores, and request to join.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {notification && (
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          )}

          {/* Active Creator Info */}
          <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                {currentTraveller?.name?.charAt(0) || '?'}
              </div>
              <div>
                <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">Trip Creator / Owner</span>
                <span className="text-sm font-bold text-slate-800">{currentTraveller?.name} ({currentTraveller?.traveller_id})</span>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">{currentTraveller?.home_city} • {currentTraveller?.gender_preference}</span>
          </div>

          {/* Group Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Trip Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kyoto Spring Temples"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
            />
          </div>

          {/* Destination & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>Destination City *</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition bg-white"
              >
                {supportedCities.length > 0 ? (
                  supportedCities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}, {c.country}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Kyoto">Kyoto, Japan</option>
                    <option value="Tokyo">Tokyo, Japan</option>
                    <option value="Osaka">Osaka, Japan</option>
                    <option value="Dubai">Dubai, UAE</option>
                    <option value="Abu Dhabi">Abu Dhabi, UAE</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Approx. Per-Person Budget (INR) *</span>
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                required
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 60000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Check-In Date *</span>
              </label>
              <input
                type="date"
                min="2027-04-01"
                max="2027-04-19"
                required
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Check-Out Date *</span>
              </label>
              <input
                type="date"
                min="2027-04-02"
                max="2027-04-20"
                required
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition bg-white"
              />
            </div>
          </div>

          {/* Max Capacity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Target Group Size (Including You, 1–4 travellers) *</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setMaxSize(size)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition text-center ${
                    Number(maxSize) === size
                      ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm ring-1 ring-brand-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {size} {size === 1 ? 'person' : 'people'}
                </button>
              ))}
            </div>
          </div>

          {/* Itinerary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Proposed Itinerary & Activity Highlights</span>
            </label>
            <textarea
              rows={3}
              value={itinerary}
              onChange={(e) => setItinerary(e.target.value)}
              placeholder="Describe what you plan to do (e.g. temples, food street crawl, day hikes)..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Creating Group...' : 'Publish Group Trip'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
