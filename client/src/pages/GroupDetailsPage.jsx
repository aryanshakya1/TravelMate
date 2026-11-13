import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import api from '../services/api.js';
import Notification from '../components/Notification.jsx';
import Modal from '../components/Modal.jsx';
import MemberProfileModal from '../components/MemberProfileModal.jsx';
import { 
  Users, 
  MapPin, 
  Calendar, 
  Wallet, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  ArrowRight, 
  Sparkles,
  Lock,
  Building,
  Check
} from 'lucide-react';

export default function GroupDetailsPage({ groupId }) {
  const { currentTraveller } = useAuth();
  const { navigate } = useRouter();

  const [group, setGroup] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [notification, setNotification] = useState(null);

  // Interest Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [interestMsg, setInterestMsg] = useState('Hi! Excited to join this trip. My dates and interests align well with your itinerary!');

  // Profile Modal
  const [selectedProfileTraveller, setSelectedProfileTraveller] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const activeId = currentTraveller?.traveller_id;

  const loadGroupDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getGroupById(groupId);
      if (data && data.group) {
        setGroup(data.group);
      }

      // If user is owner, load pending join requests
      if (data.group && data.group.owner_id === activeId) {
        const reqData = await api.getGroupRequests(groupId);
        if (reqData && reqData.requests) {
          setRequests(reqData.requests);
        }
      } else {
        // Also check if current user has a pending request
        const reqData = await api.getGroupRequests(groupId);
        if (reqData && reqData.requests) {
          setRequests(reqData.requests);
        }
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to load group details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [groupId, activeId]);

  const isOwner = group && activeId && group.owner_id === activeId;
  const isMember = group && activeId && (group.member_ids || []).includes(activeId);
  const userRequest = requests.find(r => r.traveller_id === activeId);

  const handleExpressInterest = async (e) => {
    e.preventDefault();
    setNotification(null);
    setSubmittingAction(true);

    try {
      const res = await api.expressInterest(groupId, {
        traveller_id: activeId,
        message: interestMsg
      });

      setNotification({
        type: 'success',
        message: 'Your join request was submitted! The group creator will review it.'
      });
      setIsModalOpen(false);
      await loadGroupDetails();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Could not express interest.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRequestStatusChange = async (requestId, action) => {
    setNotification(null);
    setSubmittingAction(true);

    try {
      const res = await api.updateRequestStatus(requestId, {
        action,
        owner_id: activeId
      });

      setNotification({
        type: 'success',
        message: action === 'approve'
          ? 'Request approved! Traveller is now an official member of the group.'
          : 'Request declined.'
      });

      await loadGroupDetails();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || `Failed to ${action} request.` });
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-400">
        Loading group information...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Group not found</h2>
        <button onClick={() => navigate('/')} className="text-sm font-semibold text-brand-600 hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Group Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                {group.city}
              </span>
              <span className="font-mono text-xs text-slate-400 font-semibold">{group.group_id}</span>
              {isOwner && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  You are the Trip Owner
                </span>
              )}
              {isMember && !isOwner && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  You are an Approved Member
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{group.name}</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-2xl">{group.itinerary}</p>
          </div>

          {/* Action CTA */}
          <div className="flex-shrink-0 flex sm:flex-col items-center sm:items-end gap-3">
            {isMember ? (
              <button
                onClick={() => navigate(`/groups/${group.group_id}/workspace`)}
                className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center gap-2"
              >
                <Building className="w-4 h-4" />
                <span>Open Common Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : userRequest?.status === 'pending' ? (
              <div className="px-5 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pending Owner Approval</span>
              </div>
            ) : group.isFull ? (
              <div className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Group is Full ({group.max_size}/{group.max_size})</span>
              </div>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Express Interest to Join</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[11px]">Travel Dates</span>
            <strong className="font-bold text-slate-800 text-sm">{group.check_in} → {group.check_out}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Approx Budget</span>
            <strong className="font-bold text-emerald-700 text-sm">₹{group.budget_inr.toLocaleString('en-IN')}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Capacity</span>
            <strong className="font-bold text-purple-700 text-sm">{group.currentMembersCount} / {group.max_size} travellers</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Owner / Creator</span>
            <strong className="font-bold text-slate-800 text-sm">{group.owner ? group.owner.name : group.owner_id}</strong>
          </div>
        </div>
      </div>

      {/* Owner-Only Pending Join Requests Panel (FR-05: Creator Approval Flow) */}
      {isOwner && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>Pending Join Requests ({pendingRequests.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Review applicant profiles, check mutual compatibility, and approve companions to fill available seats.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
              {group.availableSeats} seat(s) left
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No pending join requests right now. Compatible seekers can discover your post and express interest.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.request_id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">{req.applicant?.name || req.traveller_id}</h4>
                      <span className="text-[10px] font-mono text-slate-400">{req.traveller_id}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {req.applicant?.gender} • {req.applicant?.home_city}
                      </span>
                    </div>

                    {req.message && (
                      <p className="text-xs text-slate-600 italic">"{req.message}"</p>
                    )}

                    {/* Compatibility Summary */}
                    {req.compatibility && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {req.compatibility.score}% Match
                        </span>
                        <span>•</span>
                        <span>{req.compatibility.matchReasons?.overlapNights} overlapping nights</span>
                        <span>•</span>
                        <span>{req.compatibility.matchReasons?.sharedInterests?.length} shared interests</span>
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRequestStatusChange(req.request_id, 'reject')}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRequestStatusChange(req.request_id, 'approve')}
                      disabled={submittingAction || group.isFull}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Member</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current Group Members */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Current Trip Members ({group.members?.length || 1})</h2>
          <p className="text-xs text-slate-500">Travellers confirmed on this trip who can access the shared workspace.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(group.members || []).map((m) => {
            const isMemberOwner = m.traveller_id === group.owner_id;
            return (
              <div
                key={m.traveller_id}
                onClick={() => {
                  setSelectedProfileTraveller(m);
                  setIsProfileModalOpen(true);
                }}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white ${
                  m.gender === 'FEMALE' ? 'bg-pink-600' : 'bg-brand-600'
                }`}>
                  {m.name ? m.name.charAt(0) : '?'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">{m.name || m.traveller_id}</span>
                    {isMemberOwner && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-brand-100 text-brand-800">
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {m.home_city || 'India'} • {m.gender || 'Solo'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Express Interest Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Join Request: ${group.name}`}
      >
        <form onSubmit={handleExpressInterest} className="space-y-4">
          <p className="text-xs text-slate-500">
            Send a join request to <strong>{group.owner ? group.owner.name : group.owner_id}</strong>. The backend will evaluate all 6 compatibility rules and verify capacity before notifying the creator.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Message to Trip Creator
            </label>
            <textarea
              rows={3}
              value={interestMsg}
              onChange={(e) => setInterestMsg(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs transition"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAction}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingAction ? 'Sending...' : 'Submit Request'}</span>
            </button>
          </div>
        </form>
      </Modal>
      {/* Member Profile Modal */}
      <MemberProfileModal
        traveller={selectedProfileTraveller}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
