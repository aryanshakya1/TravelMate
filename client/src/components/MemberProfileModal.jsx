import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import Modal from './Modal.jsx';
import { User, MapPin, Shield, Calendar, Users, Heart, Sparkles } from 'lucide-react';

export default function MemberProfileModal({ traveller, travellerId, isOpen, onClose }) {
  const [profile, setProfile] = useState(traveller || null);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const id = traveller?.traveller_id || travellerId;
      if (!id || !isOpen) return;

      try {
        setLoading(true);
        if (!profile || profile.traveller_id !== id) {
          const res = await api.getTravellerById(id);
          if (res && res.traveller) setProfile(res.traveller);
        }

        const groupsRes = await api.getTravellerGroups(id);
        if (groupsRes && groupsRes.groups) {
          setJoinedGroups(groupsRes.groups);
        }
      } catch (err) {
        console.error('Failed to load traveller profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [traveller, travellerId, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Traveller Profile">
      {loading && !profile ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading profile...</div>
      ) : profile ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shadow-md ${
              profile.gender === 'FEMALE' ? 'bg-pink-600 shadow-pink-500/20' : 'bg-brand-600 shadow-brand-500/20'
            }`}>
              {profile.name ? profile.name.charAt(0) : '?'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">{profile.name}</h3>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                  {profile.traveller_id}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brand-600" />
                  {profile.home_city} ({profile.home_airport || 'BLR'})
                </span>
                <span>•</span>
                <span>{profile.age} years old</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">{profile.gender}</span>
              </div>
            </div>
          </div>

          {/* Safety Preference */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Shield className="w-4 h-4 text-brand-600" />
              <span>Gender Preference:</span>
            </div>
            <strong className="text-brand-700 font-bold">
              {profile.gender_preference === 'SAME_GENDER' ? 'Same Gender Only (Female-only/Male-only)' : 'Any Gender'}
            </strong>
          </div>

          {/* Interests */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Travel Interests & Trip Styles
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(profile.interests || []).map((interest) => (
                <span
                  key={interest}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200"
                >
                  #{interest}
                </span>
              ))}
            </div>
          </div>

          {/* Joined Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Joined / Created Groups ({joinedGroups.length})
              </span>
            </div>

            {joinedGroups.length === 0 ? (
              <div className="p-3 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                No active groups yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {joinedGroups.map((g) => (
                  <div
                    key={g.group_id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{g.name}</div>
                      <div className="text-[10px] text-slate-400">{g.city} • {g.check_in} to {g.check_out}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      {g.isOwner ? 'Owner' : 'Member'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
