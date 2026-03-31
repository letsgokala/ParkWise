import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Users, CreditCard, TrendingUp, Save, AlertCircle, CheckCircle, Plus, Minus } from 'lucide-react';
import { getAssignedFacility, ParkingLocation, updateAssignedFacility } from '../lib/api';

const AdminDashboard = () => {
  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [newAvailable, setNewAvailable] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [isAssigned, setIsAssigned] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const loadFacility = async () => {
      try {
        const response = await getAssignedFacility();
        setFacility(response.facility);
        setIsAssigned(Boolean(response.facility));
        if (response.facility && !hasUnsavedChanges) {
          setNewAvailable(response.facility.availableSpaces);
          setNewPrice(response.facility.pricePerHour);
        }
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message || 'Failed to load assigned facility.' });
      } finally {
        setLoading(false);
      }
    };

    loadFacility();
    const intervalId = window.setInterval(loadFacility, 5000);
    return () => window.clearInterval(intervalId);
  }, [hasUnsavedChanges]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await updateAssignedFacility({
        availableSpaces: newAvailable,
        pricePerHour: newPrice,
      });
      setFacility(response.facility);
      setNewAvailable(response.facility.availableSpaces);
      setNewPrice(response.facility.pricePerHour);
      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'Facility updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update facility.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-gray-200 text-center space-y-6">
        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Building2 className="h-10 w-10 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">{isAssigned ? 'Facility Unavailable' : 'Waiting For Assignment'}</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            {isAssigned
              ? 'Your assigned facility could not be loaded right now. Please ask the system administrator to verify that the facility still exists.'
              : 'Your parking admin account is ready. A system administrator still needs to assign you to one of the available parking facilities before this dashboard unlocks.'}
          </p>
        </div>
      </div>
    );
  }

  const occupancyRate = ((facility.totalSpaces - facility.availableSpaces) / facility.totalSpaces) * 100;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900">{facility.facilityName}</h1>
          <p className="text-gray-500 font-medium flex items-center">
            <Building2 className="h-4 w-4 mr-2 text-orange-600" />
            {facility.address}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-2xl font-bold text-sm flex items-center space-x-2 ${facility.status === 'Verified' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
          <div className={`h-2 w-2 rounded-full ${facility.status === 'Verified' ? 'bg-green-600' : 'bg-red-600'} animate-pulse`} />
          <span>{facility.status}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center">
            <Users className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Occupancy</p>
            <p className="text-3xl font-black text-gray-900">{Math.round(occupancyRate)}%</p>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${occupancyRate}%` }}
              className={`h-full ${occupancyRate > 90 ? 'bg-red-500' : occupancyRate > 70 ? 'bg-orange-500' : 'bg-orange-600'}`}
            />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Available Spots</p>
            <p className="text-3xl font-black text-gray-900">{facility.availableSpaces} / {facility.totalSpaces}</p>
          </div>
          <p className="text-xs text-gray-500 font-medium italic">Updated in real-time</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
          <div className="bg-purple-50 w-12 h-12 rounded-2xl flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Current Tariff</p>
            <p className="text-3xl font-black text-gray-900">{facility.pricePerHour} <span className="text-sm font-bold text-gray-400">ETB/hr</span></p>
          </div>
          <p className="text-xs text-gray-500 font-medium italic">Adjustable based on demand</p>
        </div>
      </div>

      {/* Update Form */}
      <div className="max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-orange-100/50"
        >
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Update Operations</h3>
          
          {message && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-2xl flex items-center space-x-3 mb-8 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
            >
              {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </motion.div>
          )}

          <form onSubmit={handleUpdate} className="space-y-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-lg font-bold text-gray-900">Available Spaces</label>
                  <p className="text-sm text-gray-500 font-medium">Manually adjust the current count</p>
                </div>
                <div className="flex items-center space-x-6 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAvailable(Math.max(0, newAvailable - 1));
                      setHasUnsavedChanges(true);
                    }}
                    className="p-3 bg-white rounded-xl shadow-sm hover:bg-red-50 hover:text-red-600 transition-all border border-gray-100"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="text-2xl font-black w-12 text-center text-gray-900">{newAvailable}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAvailable(Math.min(facility.totalSpaces, newAvailable + 1));
                      setHasUnsavedChanges(true);
                    }}
                    className="p-3 bg-white rounded-xl shadow-sm hover:bg-green-50 hover:text-green-600 transition-all border border-gray-100"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-lg font-bold text-gray-900">Hourly Price (ETB)</label>
                  <p className="text-sm text-gray-500 font-medium">Set the current rental rate</p>
                </div>
                <div className="flex items-center space-x-4 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                  <input
                    type="number"
                    min="0"
                    value={newPrice}
                    onChange={(e) => {
                      setNewPrice(Number(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    className="w-24 bg-transparent border-none focus:ring-0 text-2xl font-black text-orange-600 text-right"
                  />
                  <span className="text-sm font-bold text-gray-400">ETB</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-orange-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-3"
            >
              {saving ? (
                <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="h-6 w-6" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
