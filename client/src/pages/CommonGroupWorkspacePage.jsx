import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../context/RouterContext.jsx';
import api from '../services/api.js';
import Notification from '../components/Notification.jsx';
import Modal from '../components/Modal.jsx';
import { 
  Building, 
  Users, 
  MapPin, 
  Calendar, 
  Wallet, 
  Star, 
  Bookmark, 
  BookmarkCheck, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  Divide, 
  ShieldAlert, 
  CreditCard,
  MessageSquare,
  Send,
  ThumbsUp,
  Info,
  LogOut,
  AlertTriangle,
  Crown
} from 'lucide-react';

export default function CommonGroupWorkspacePage({ groupId }) {
  const { currentTraveller } = useAuth();
  const { navigate } = useRouter();

  const [group, setGroup] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [savedHotels, setSavedHotels] = useState([]);
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Booking Modal
  const [selectedOptionForBooking, setSelectedOptionForBooking] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Leave Group Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);

  // Owner Actions Modal (transfer or disband)
  const [isOwnerActionModalOpen, setIsOwnerActionModalOpen] = useState(false);
  const [ownerAction, setOwnerAction] = useState(null); // 'transfer' | 'disband'
  const [selectedNewOwner, setSelectedNewOwner] = useState('');

  const activeId = currentTraveller?.traveller_id;

  const loadData = async () => {
    try {
      setLoading(true);
      const groupData = await api.getGroupById(groupId);
      if (groupData && groupData.group) {
        setGroup(groupData.group);
      }

      // Check existing finalized booking
      const bookingData = await api.getGroupBooking(groupId);
      if (bookingData && bookingData.booking) {
        setBooking(bookingData.booking);
      }

      // Load saved hotels
      const savedData = await api.getSavedHotels(groupId);
      if (savedData && savedData.savedHotels) {
        setSavedHotels(savedData.savedHotels);
      }

      // Load messages
      const msgData = await api.getMessages(groupId);
      if (msgData && msgData.messages) {
        setMessages(msgData.messages);
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Error loading group workspace.' });
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogHotels = async () => {
    try {
      setLoadingHotels(true);
      const hotelData = await api.getGroupHotels(groupId);
      if (hotelData && hotelData.options) {
        setHotels(hotelData.options);
      }
    } catch (err) {
      console.error('Failed to search hotels:', err);
    } finally {
      setLoadingHotels(false);
    }
  };

  useEffect(() => {
    loadData();
    loadCatalogHotels();
  }, [groupId, activeId]);

  const isMember = group && activeId && (group.member_ids || []).includes(activeId);

  // Save hotel to shortlist
  const handleSaveHotel = async (option) => {
    setNotification(null);
    try {
      const res = await api.saveHotelOption(groupId, {
        hotel_id: option.hotelId,
        room_id: option.roomId,
        traveller_id: activeId
      });

      setNotification({
        type: 'success',
        message: `${option.hotelName} (${option.roomName}) saved to group shortlist!`
      });

      // Reload saved shortlist & catalog options
      const savedData = await api.getSavedHotels(groupId);
      if (savedData && savedData.savedHotels) setSavedHotels(savedData.savedHotels);
      loadCatalogHotels();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to save hotel.' });
    }
  };

  // Remove saved hotel
  const handleRemoveSaved = async (savedId) => {
    setNotification(null);
    try {
      await api.removeSavedHotel(groupId, savedId, activeId);
      setNotification({ type: 'info', message: 'Option removed from shortlist.' });
      const savedData = await api.getSavedHotels(groupId);
      if (savedData && savedData.savedHotels) setSavedHotels(savedData.savedHotels);
      loadCatalogHotels();
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to remove option.' });
    }
  };

  // Trigger Booking Confirmation Modal
  const openBookingConfirmation = (option) => {
    setSelectedOptionForBooking(option);
    setIsBookingModalOpen(true);
  };

  // Finalize Mock Booking
  const handleConfirmBooking = async () => {
    if (!selectedOptionForBooking) return;
    setNotification(null);
    setActionLoading(true);

    try {
      const res = await api.finalizeBooking(groupId, {
        room_id: selectedOptionForBooking.roomId || selectedOptionForBooking.room_id,
        traveller_id: activeId
      });

      if (res && res.booking) {
        setBooking(res.booking);
        setIsBookingModalOpen(false);
        setNotification({
          type: 'success',
          message: `Booking Finalized! Reference: ${res.booking.booking_reference}. Total: ₹${res.booking.total_cost.toLocaleString('en-IN')}.`
        });
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Could not finalize booking.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const res = await api.sendMessage(groupId, {
        sender_id: activeId,
        text: chatInput.trim()
      });
      if (res && res.message) {
        setMessages([...messages, res.message]);
        setChatInput('');
      }
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  // --- LEAVE GROUP (non-owner member) ---
  const handleLeaveGroup = async () => {
    setIsLeavingGroup(true);
    try {
      await api.leaveGroup(group.group_id, activeId);
      setIsLeaveModalOpen(false);
      setNotification({
        type: 'success',
        message: `You have left "${group.name}". The workspace is now closed for you.`
      });
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setIsLeaveModalOpen(false);
      setNotification({ type: 'error', message: err.message || 'Could not leave the group.' });
    } finally {
      setIsLeavingGroup(false);
    }
  };

  // --- DISBAND GROUP (owner) ---
  const handleDisbandGroup = async () => {
    setIsLeavingGroup(true);
    try {
      await api.disbandGroup(group.group_id, activeId);
      setIsOwnerActionModalOpen(false);
      setNotification({ type: 'success', message: `"${group.name}" has been disbanded.` });
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setIsOwnerActionModalOpen(false);
      setNotification({ type: 'error', message: err.message || 'Could not disband the group.' });
    } finally {
      setIsLeavingGroup(false);
    }
  };

  // --- TRANSFER OWNERSHIP (owner) ---
  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      setNotification({ type: 'error', message: 'Please select a member to transfer leadership to.' });
      return;
    }
    setIsLeavingGroup(true);
    try {
      await api.transferOwnership(group.group_id, {
        current_owner_id: activeId,
        new_owner_id: selectedNewOwner
      });
      setIsOwnerActionModalOpen(false);
      setNotification({ type: 'success', message: 'Leadership transferred! You have left the group.' });
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setIsOwnerActionModalOpen(false);
      setNotification({ type: 'error', message: err.message || 'Could not transfer ownership.' });
    } finally {
      setIsLeavingGroup(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-slate-400">
        Loading shared workspace...
      </div>
    );
  }

  // Access Control: Only approved members allowed
  if (!isMember) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Members-Only Private Workspace</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          You must be an approved member of <strong>{group?.name || 'this group'}</strong> to access shared hotel shortlists, live cost calculations, and booking actions.
        </p>
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition"
        >
          View Group Details & Request to Join
        </button>
      </div>
    );
  }

  const memberCount = (group.member_ids || []).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header Workspace Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                Common Workspace
              </span>
              <span className="text-xs font-mono text-slate-400 font-semibold">{group.group_id}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {group.city}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{group.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Collaborative hotel comparison, transparent equal cost splitting, and group booking finalization.
            </p>
          </div>

          {/* Member Avatars + Leave/Owner Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex -space-x-2 overflow-hidden">
              {(group.members || []).map((m) => (
                <div
                  key={m.traveller_id}
                  title={`${m.name || m.traveller_id} (${m.home_city || 'India'})`}
                  className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                    m.gender === 'FEMALE' ? 'bg-pink-600' : 'bg-brand-600'
                  }`}
                >
                  {m.name ? m.name.charAt(0) : '?'}
                </div>
              ))}
            </div>
            <div className="text-left text-xs text-slate-500 pl-2">
              <div className="font-bold text-slate-800">{memberCount} of {group.max_size} Travellers</div>
              <div className="text-[10px]">Approved Members</div>
            </div>

            {/* Leave / Transfer / Disband — only before a booking is finalized */}
            {!booking && (
              <>
                {group.owner_id !== activeId && (
                  <button
                    onClick={() => setIsLeaveModalOpen(true)}
                    className="ml-2 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5"
                    title="Leave this group"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave</span>
                  </button>
                )}
                {group.owner_id === activeId && (
                  <button
                    onClick={() => { setOwnerAction(null); setSelectedNewOwner(''); setIsOwnerActionModalOpen(true); }}
                    className="ml-2 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5"
                    title="Transfer or disband group"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Transfer / Disband</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Dynamic Group Cost Split Formula Card (Unique MVP Feature 4) */}
        <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-brand-50 border border-brand-200/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-extrabold text-brand-900 uppercase tracking-wider">
                Dynamic Group Cost Split (M6 & Feature 4)
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Accommodation prices are dynamically split equally across all {memberCount} approved members. As more members join, the per-person cost share decreases!
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-5 py-3 rounded-xl border border-brand-200">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Group Stay</span>
              <strong className="text-sm font-black text-slate-900">{group.check_in} → {group.check_out}</strong>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Approved Travellers</span>
              <strong className="text-sm font-black text-brand-600">{memberCount} members</strong>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Per-Person Split</span>
              <strong className="text-sm font-black text-emerald-600">Total ÷ {memberCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FINALIZED BOOKING BANNER (If Booked) */}
      {booking && (
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-700/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Group Booking Finalized & Confirmed</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight">{booking.hotel_name}</h2>
              <p className="text-xs text-emerald-100 mt-1">
                {booking.room_name} ({booking.room_type}) • {booking.rooms_needed} room(s) for {booking.nights_count} nights
              </p>
            </div>

            <div className="text-right bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
              <span className="text-[10px] text-emerald-200 uppercase font-bold block">Booking Reference</span>
              <span className="font-mono text-xl font-black tracking-wider text-white">{booking.booking_reference}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-black/10 backdrop-blur-sm text-xs text-white/90 border border-white/10">
            <div>
              <span className="text-white/60 block text-[10px]">Total Group Cost</span>
              <strong className="font-bold text-sm text-white">₹{booking.total_cost.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span className="text-white/60 block text-[10px]">Equal Share Per Person</span>
              <strong className="font-bold text-sm text-amber-300">₹{booking.cost_per_person.toLocaleString('en-IN')} each</strong>
            </div>
            <div>
              <span className="text-white/60 block text-[10px]">Stay Window</span>
              <strong className="font-semibold text-white">{booking.check_in} → {booking.check_out}</strong>
            </div>
            <div>
              <span className="text-white/60 block text-[10px]">Status</span>
              <strong className="font-bold text-emerald-300">LOCKED (CONFIRMED)</strong>
            </div>
          </div>

          <div className="text-[11px] text-emerald-100 italic flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5" />
            <span>{booking.disclaimer}</span>
          </div>
        </div>
      )}

      {/* COLLABORATIVE HOTEL SHORTLIST (Unique MVP Feature 5) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-brand-600" />
              <span>Group Hotel Shortlist ({savedHotels.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Hotels saved by group members. Compare room options and per-person splits before locking the booking.
            </p>
          </div>
        </div>

        {savedHotels.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No hotel options saved yet. Browse the catalog options below and click "Save Option" to add to this shortlist!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedHotels.map((item) => (
              <div
                key={item.saved_id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                        {item.room_type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{item.hotel_name}</h4>
                      <p className="text-xs text-slate-500">{item.room_name} • {item.rooms_needed} room(s) needed</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Total Group</div>
                      <div className="font-extrabold text-sm text-slate-900">₹{item.total_cost.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Equal Cost Split Pill */}
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-medium">Cost Per Person ({memberCount} members):</span>
                    <strong className="text-emerald-700 font-extrabold text-sm">₹{item.cost_per_person.toLocaleString('en-IN')}</strong>
                  </div>

                  {/* Saved By Members */}
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-brand-600" />
                    <span>Saved by: <strong>{(item.saved_by_names || []).join(', ')}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <button
                    onClick={() => handleRemoveSaved(item.saved_id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                  >
                    Remove
                  </button>

                  {!booking && (
                    <button
                      onClick={() => openBookingConfirmation(item)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Finalize Booking for Group</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CATALOG HOTEL SEARCH & COMPARISON (Unique MVP Feature 3) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-brand-600" />
              <span>Available Hotels in {group.city} ({hotels.length} Options)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Verified availability from catalog for {group.check_in} to {group.check_out} ({group.check_in && group.check_out ? (new Date(group.check_out) - new Date(group.check_in)) / (1000 * 60 * 60 * 24) : 0} nights).
            </p>
          </div>
        </div>

        {loadingHotels ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading catalog hotels and checking nightly room inventory...</div>
        ) : hotels.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No hotel rooms with sufficient inventory found for this stay window.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((option) => (
              <div
                key={`${option.hotelId}_${option.roomId}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                {/* Photo & Badge */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  <img
                    src={`/${option.image}`}
                    alt={option.hotelName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                      {option.area}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      {option.rating}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3 flex-1">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{option.hotelName}</h3>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {option.roomName} ({option.roomType})
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 space-y-1 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rooms Needed:</span>
                      <strong>{option.roomsNeeded} room(s) (holds {option.roomsNeeded * option.maxAdults} adults)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nightly Rate:</span>
                      <span>₹{option.nightlyPrice.toLocaleString('en-IN')} / night</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total for Stay:</span>
                      <strong className="text-slate-800">₹{option.totalCost.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  {/* Equal Per Person Split Badge */}
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Equal Per Person Share</span>
                      <span className="text-[11px] text-emerald-700">Split by {memberCount} member(s)</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-lg font-black text-emerald-700">₹{option.costPerPerson.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleSaveHotel(option)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save Option</span>
                  </button>

                  {!booking && (
                    <button
                      onClick={() => openBookingConfirmation(option)}
                      className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Finalize Booking</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GROUP DISCUSSION CHAT (Stretch Feature S1) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Group Coordination Board</h2>
        </div>
        <p className="text-xs text-slate-500">
          Discuss offline preferences, agree on hotel choices, and align plans before finalizing the booking.
        </p>

        {/* Message Feed */}
        <div className="h-48 overflow-y-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No messages yet. Start the conversation with your companions!
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === activeId;
              return (
                <div key={m.message_id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="text-[10px] text-slate-400 mb-0.5 font-medium">
                    {m.sender_name} ({m.sender_id})
                  </div>
                  <div className={`px-4 py-2 rounded-2xl text-xs max-w-sm ${
                    isMe ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    {m.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message to your group members..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-xs transition"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* FINAL CONFIRMATION MODAL */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Finalize Mock Group Booking"
      >
        {selectedOptionForBooking && (
          <div className="space-y-4 text-xs text-slate-700">
            <p className="text-slate-600 leading-relaxed">
              You are locking in the accommodation choice for <strong>{group.name}</strong>. Once confirmed, this booking becomes immutable and will be visible to all approved group members.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Hotel:</span>
                <strong className="text-slate-900">{selectedOptionForBooking.hotelName || selectedOptionForBooking.hotel_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Room:</span>
                <span>{selectedOptionForBooking.roomName || selectedOptionForBooking.room_name} ({selectedOptionForBooking.roomType || selectedOptionForBooking.room_type})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stay Duration:</span>
                <span>{group.check_in} → {group.check_out}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rooms Required:</span>
                <span>{selectedOptionForBooking.roomsNeeded || selectedOptionForBooking.rooms_needed} room(s)</span>
              </div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between font-bold text-sm">
                <span>Total Accommodation:</span>
                <span className="text-slate-900">₹{(selectedOptionForBooking.totalCost || selectedOptionForBooking.total_cost).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-emerald-700">
                <span>Equal Per-Person Share:</span>
                <span>₹{(selectedOptionForBooking.costPerPerson || selectedOptionForBooking.cost_per_person).toLocaleString('en-IN')} / person</span>
              </div>
            </div>

            {/* Member Allocation Breakdown */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Deterministic Allocation Breakdown
              </span>
              {(group.members || []).map((m, idx) => (
                <div key={m.traveller_id} className="flex justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                  <span>{m.name || m.traveller_id}</span>
                  <strong className="font-mono">₹{(selectedOptionForBooking.costPerPerson || selectedOptionForBooking.cost_per_person).toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </div>

            {/* Hackathon Mock Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
              <strong>Hackathon Note:</strong> This is a mock booking. No real hotel reservation or credit card payment will be processed.
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmBooking}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading ? 'Confirming...' : 'Confirm & Finalize Booking'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Leave Group Confirmation Modal (non-owner member) ── */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Leave Group?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Are you sure you want to leave <strong>{group?.name}</strong>?
              Your reserved seat will reopen for other travellers immediately.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              disabled={isLeavingGroup}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              Stay in Group
            </button>
            <button
              onClick={handleLeaveGroup}
              disabled={isLeavingGroup}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLeavingGroup ? 'Leaving...' : 'Yes, Leave Group'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Owner Actions Modal: Transfer Leadership or Disband ── */}
      <Modal
        isOpen={isOwnerActionModalOpen}
        onClose={() => setIsOwnerActionModalOpen(false)}
        title="Owner Options"
      >
        <div className="space-y-4">
          {!ownerAction && (
            <>
              <p className="text-xs text-slate-500">
                As the trip owner, you can't simply leave. Choose one of the options below:
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setOwnerAction('transfer')}
                  className="p-4 rounded-xl border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 text-left transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-bold text-brand-800">Transfer Leadership</span>
                  </div>
                  <p className="text-xs text-slate-500">Hand ownership to another member. You will leave the group after transferring.</p>
                </button>
                <button
                  onClick={() => setOwnerAction('disband')}
                  className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-left transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-sm font-bold text-rose-800">Disband Group</span>
                  </div>
                  <p className="text-xs text-slate-500">Permanently delete this group, all requests, shortlists, and messages.</p>
                </button>
              </div>
            </>
          )}

          {ownerAction === 'transfer' && (
            <>
              <p className="text-xs text-slate-500">Select a current member to become the new trip owner. You will leave the group.</p>
              <select
                value={selectedNewOwner}
                onChange={(e) => setSelectedNewOwner(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
              >
                <option value="">— Select new owner —</option>
                {(group?.members || [])
                  .filter(m => m.traveller_id !== activeId)
                  .map(m => (
                    <option key={m.traveller_id} value={m.traveller_id}>
                      {m.name} ({m.traveller_id})
                    </option>
                  ))
                }
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOwnerAction(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition">Back</button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={isLeavingGroup || !selectedNewOwner}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{isLeavingGroup ? 'Transferring...' : 'Transfer & Leave'}</span>
                </button>
              </div>
            </>
          )}

          {ownerAction === 'disband' && (
            <>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-800">
                  This will <strong>permanently delete</strong> "{group?.name}" along with all join requests, saved hotels, and messages. This cannot be undone.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOwnerAction(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition">Back</button>
                <button
                  onClick={handleDisbandGroup}
                  disabled={isLeavingGroup}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isLeavingGroup ? 'Disbanding...' : 'Yes, Disband Group'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
