import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [travellers, setTravellers] = useState([]);
  const [currentTraveller, setCurrentTraveller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Load travellers list
  const loadTravellers = async () => {
    try {
      const data = await api.getTravellers();
      if (data && data.travellers) {
        setTravellers(data.travellers);

        // Check stored traveller ID
        const storedId = localStorage.getItem('travelmate_active_traveller_id');
        let active = null;
        if (storedId) {
          active = data.travellers.find(t => t.traveller_id === storedId);
        }
        // Default to Sarah Thomas (T-001) if none selected
        if (!active) {
          active = data.travellers.find(t => t.traveller_id === 'T-001') || data.travellers[0] || null;
        }

        setCurrentTraveller(active);
        if (active) {
          localStorage.setItem('travelmate_active_traveller_id', active.traveller_id);
        }
      }
    } catch (err) {
      console.error('Failed to load travellers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTravellers();
  }, []);

  // Update pending requests badge for groups owned by current traveller
  useEffect(() => {
    if (!currentTraveller) {
      setPendingRequestsCount(0);
      return;
    }

    const checkPending = async () => {
      try {
        const groupsData = await api.getGroups();
        if (groupsData && groupsData.groups) {
          const ownedGroups = groupsData.groups.filter(g => g.owner_id === currentTraveller.traveller_id);
          let totalPending = 0;
          for (const g of ownedGroups) {
            const reqs = await api.getGroupRequests(g.group_id);
            if (reqs && reqs.requests) {
              totalPending += reqs.requests.filter(r => r.status === 'pending').length;
            }
          }
          setPendingRequestsCount(totalPending);
        }
      } catch (err) {
        // quiet error in background badge polling
      }
    };

    checkPending();
  }, [currentTraveller]);

  const switchTraveller = (travellerId) => {
    const found = travellers.find(t => t.traveller_id === travellerId);
    if (found) {
      setCurrentTraveller(found);
      localStorage.setItem('travelmate_active_traveller_id', found.traveller_id);
    }
  };

  const registerUser = async (profileData) => {
    const res = await api.registerTraveller(profileData);
    if (res && res.traveller) {
      await loadTravellers();
      setCurrentTraveller(res.traveller);
      localStorage.setItem('travelmate_active_traveller_id', res.traveller.traveller_id);
      return res.traveller;
    }
    throw new Error('Registration failed');
  };

  return (
    <AuthContext.Provider value={{
      travellers,
      currentTraveller,
      loading,
      pendingRequestsCount,
      switchTraveller,
      registerUser,
      refreshTravellers: loadTravellers
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
