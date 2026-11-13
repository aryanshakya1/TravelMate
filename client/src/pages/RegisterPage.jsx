import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import api from '../services/api.js';
import Notification from '../components/Notification.jsx';
import { UserPlus, Sparkles, Check, Heart, Shield, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { registerUser } = useAuth();
  const { navigate } = useRouter();

  const [name, setName] = useState('');
  const [age, setAge] = useState(26);
  const [gender, setGender] = useState('FEMALE');
  const [homeCity, setHomeCity] = useState('Bengaluru');
  const [homeAirport, setHomeAirport] = useState('BLR');
  const [genderPreference, setGenderPreference] = useState('SAME_GENDER');
  const [selectedInterests, setSelectedInterests] = useState(['TEMPLES', 'STREET_FOOD']);

  const [availableInterests, setAvailableInterests] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await api.getInterests();
        if (data && data.interests) {
          setAvailableInterests(data.interests);
        }
      } catch (err) {
        console.error('Failed to load interests:', err.message);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const toggleInterest = (interestId) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotification(null);

    if (!name.trim()) {
      setNotification({ type: 'error', message: 'Please enter your full name.' });
      return;
    }

    if (selectedInterests.length === 0) {
      setNotification({ type: 'error', message: 'Please select at least one travel interest.' });
      return;
    }

    setSubmitting(true);
    try {
      const created = await registerUser({
        name: name.trim(),
        age: Number(age),
        gender,
        home_city: homeCity.trim(),
        home_airport: homeAirport.trim().toUpperCase(),
        interests: selectedInterests,
        gender_preference: genderPreference
      });

      setNotification({
        type: 'success',
        message: `Profile created successfully! Welcome to TravelMate, ${created.name} (${created.traveller_id}).`
      });

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to create profile.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 px-8 py-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-brand-100 mb-3 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 1: Join TravelMate</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Traveller Profile Registration</h1>
            <p className="text-brand-100 text-sm mt-1 max-w-xl">
              Create your solo traveller persona. Your interests and gender preferences will power the rule-based matching engine.
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {notification && (
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          )}

          {/* Basic Personal Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Thomas or Priya Shah"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Age
              </label>
              <input
                type="number"
                min="18"
                max="80"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Gender *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['FEMALE', 'MALE'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition text-center ${
                      gender === g
                        ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {g === 'FEMALE' ? 'Female' : 'Male'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Home City *
              </label>
              <select
                value={homeCity}
                onChange={(e) => {
                  setHomeCity(e.target.value);
                  const airportMap = { Bengaluru: 'BLR', Mumbai: 'BOM', Delhi: 'DEL', Chennai: 'MAA' };
                  if (airportMap[e.target.value]) {
                    setHomeAirport(airportMap[e.target.value]);
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition bg-white"
              >
                <option value="Bengaluru">Bengaluru (BLR)</option>
                <option value="Mumbai">Mumbai (BOM)</option>
                <option value="Delhi">Delhi (DEL)</option>
                <option value="Chennai">Chennai (MAA)</option>
              </select>
            </div>
          </div>

          {/* Gender Preference & Safety */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Mutual Safety & Gender Preference (Rule 5)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Matches require mutual consent. If set to "Same Gender", you will only be matched with travellers of the same gender who also consent.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'SAME_GENDER', title: 'Same Gender Only', desc: 'Travel strictly with women (if female) or men (if male)' },
                { id: 'ANY', title: 'Any Gender', desc: 'Comfortable travelling in mixed groups' }
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => setGenderPreference(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    genderPreference === p.id
                      ? 'bg-white border-brand-500 shadow-sm ring-1 ring-brand-500'
                      : 'bg-white/50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{p.title}</span>
                    {genderPreference === p.id && <Check className="w-4 h-4 text-brand-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Travel Interests (Rule 4: Shared Interests) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Personal Travel Interests *
                </label>
                <p className="text-xs text-slate-500">
                  Select tags representing your trip style. Groups require at least 2 shared interests with the owner.
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-brand-50 text-brand-700 border border-brand-200">
                {selectedInterests.length} selected
              </span>
            </div>

            {loadingCatalog ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading catalog interests...</div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {availableInterests.map((item) => {
                  const isSelected = selectedInterests.includes(item.interest);
                  return (
                    <button
                      key={item.interest}
                      type="button"
                      onClick={() => toggleInterest(item.interest)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit CTA */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancel and Return
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Registering...' : 'Complete Profile & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
