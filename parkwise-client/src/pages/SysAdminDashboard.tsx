import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Users, ShieldCheck, Plus, Trash2, Edit, Save, X, Search, MapPin, CreditCard, UserPlus } from 'lucide-react';
import { assignAdminToFacility, createFacility, CreateFacilityPayload, deleteFacility, getSysAdminOverview, ParkingAdminRecord, ParkingLocation, SysAdminUser } from '../lib/api';

const SysAdminDashboard = () => {
  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [users, setUsers] = useState<SysAdminUser[]>([]);
  const [admins, setAdmins] = useState<ParkingAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('facilities');
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [newFacility, setNewFacility] = useState<CreateFacilityPayload>({
    facilityName: '',
    address: '',
    latitude: 9.03,
    longitude: 38.74,
    totalSpaces: 50,
    pricePerHour: 15,
    status: 'Verified'
  });

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const response = await getSysAdminOverview();
        setFacilities(response.facilities);
        setUsers(response.users);
        setAdmins(response.admins);
      } catch (error) {
        console.error('Failed to load system admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
    const intervalId = window.setInterval(loadOverview, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

    const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await createFacility(newFacility);
      setFacilities((current) => [...current, response.facility]);
      setShowAddFacility(false);
      setNewFacility({
        facilityName: '',
        address: '',
        latitude: 9.03,
        longitude: 38.74,
        totalSpaces: 50,
        pricePerHour: 15,
        status: 'Verified'
      });
    } catch (err) {
      console.error("Error adding facility:", err);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this facility?")) {
      await deleteFacility(id);
      setFacilities((current) => current.filter((facility) => facility.facilityId !== id));
    }
  };

  const handleAssignAdmin = async (adminId: string, facilityId: string) => {
    try {
      await assignAdminToFacility(adminId, facilityId);
      setAdmins((current) =>
        current.map((admin) => {
          if (admin.adminId === adminId) return { ...admin, facilityID: facilityId };
          if (admin.facilityID === facilityId) return { ...admin, facilityID: null };
          return admin;
        })
      );
    } catch (err) {
      console.error("Error assigning admin:", err);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-4 border-orange-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">System Administration</h1>
          <p className="text-gray-500 font-medium">Manage the entire ParkWise ecosystem</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          <button
            onClick={() => setActiveTab('facilities')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'facilities' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Facilities
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-orange-600 text-white shadow-md shadow-orange-100' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Users
          </button>
        </div>
      </div>

      {activeTab === 'facilities' ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-orange-600" />
              <span>Parking Locations</span>
            </h2>
            <button
              onClick={() => setShowAddFacility(true)}
              className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
            >
              <Plus className="h-4 w-4" />
              <span>Add Facility</span>
            </button>
          </div>

          <AnimatePresence>
            {showAddFacility && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white p-8 rounded-[2.5rem] border border-orange-100 shadow-xl shadow-orange-50 overflow-hidden"
              >
                <form onSubmit={handleAddFacility} className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Facility Name</label>
                      <input
                        type="text"
                        required
                        value={newFacility.facilityName}
                        onChange={(e) => setNewFacility({...newFacility, facilityName: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all"
                        placeholder="Bole Mall Parking"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Address</label>
                      <input
                        type="text"
                        required
                        value={newFacility.address}
                        onChange={(e) => setNewFacility({...newFacility, address: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all"
                        placeholder="Bole Road, Addis Ababa"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Total Spaces</label>
                      <input
                        type="number"
                        required
                        value={newFacility.totalSpaces}
                        onChange={(e) => setNewFacility({...newFacility, totalSpaces: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Price (ETB/hr)</label>
                      <input
                        type="number"
                        required
                        value={newFacility.pricePerHour}
                        onChange={(e) => setNewFacility({...newFacility, pricePerHour: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newFacility.latitude}
                        onChange={(e) => setNewFacility({...newFacility, latitude: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 ml-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={newFacility.longitude}
                        onChange={(e) => setNewFacility({...newFacility, longitude: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddFacility(false)}
                      className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                    >
                      Create Facility
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-2 gap-6">
            {facilities.map(facility => (
              <div key={facility.facilityId} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900">{facility.facilityName}</h3>
                    <p className="text-sm text-gray-500 font-medium flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-orange-600" />
                      {facility.address}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteFacility(facility.facilityId)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Capacity</p>
                    <p className="text-lg font-black text-gray-900">{facility.availableSpaces} / {facility.totalSpaces}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tariff</p>
                    <p className="text-lg font-black text-orange-600">{facility.pricePerHour} ETB/hr</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Assigned Admin</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-orange-600 transition-all text-sm font-medium"
                    value={admins.find(a => a.facilityID === facility.facilityId)?.adminId || ''}
                    onChange={(e) => handleAssignAdmin(e.target.value, facility.facilityId)}
                  >
                    <option value="">Unassigned</option>
                    {admins.filter(a => !a.facilityID || a.facilityID === facility.facilityId).map(admin => (
                      <option key={admin.adminId} value={admin.adminId}>{admin.name} ({admin.email})</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold">
                          {user.displayName?.[0] || user.email?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.displayName || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'sys_admin' ? 'bg-purple-100 text-purple-600' :
                        user.role === 'parking_admin' ? 'bg-amber-100 text-amber-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-bold text-gray-900">Active</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="text-gray-400 hover:text-orange-600 transition-colors font-bold text-sm">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SysAdminDashboard;
