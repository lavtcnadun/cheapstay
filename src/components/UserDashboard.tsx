import React from 'react';
import { X, Plus, Trash2, Edit2, MapPin, Coins, Star, Info, CheckCircle, Clock } from 'lucide-react';
import { Stay } from '../types';
import { db, collection, deleteDoc, doc, OperationType, handleFirestoreError } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface UserDashboardProps {
  userStays: Stay[];
  onClose: () => void;
  onAddProperty: () => void;
  onEditProperty: (stay: Stay) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ userStays, onClose, onAddProperty, onEditProperty }) => {
  const handleDelete = async (id: string) => {
    const path = 'stays';
    if (!confirm('Are you sure you want to delete this stay?')) return;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">My Dashboard</h2>
            <p className="text-sm text-slate-500">Manage your property listings</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onAddProperty}
              className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Stay
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          {userStays.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No listings yet</h3>
              <p className="text-slate-500 mb-6">Start by adding your first property to CheapStay.</p>
              <button 
                onClick={onAddProperty}
                className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
              >
                Add My First Stay
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {userStays.map(stay => (
                <div key={stay.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 transition-all group">
                  <div className="relative shrink-0">
                    <img src={stay.image} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                    {!stay.approved && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg" title="Pending Approval">
                        <Clock className="w-3 h-3" />
                      </div>
                    )}
                    {stay.approved && (
                      <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-lg" title="Approved">
                        <CheckCircle className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-slate-900">{stay.name}</h4>
                      {!stay.approved && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Pending</span>
                      )}
                      {stay.approved && !stay.isPaid && (
                        (() => {
                          const date = stay.createdAt?.toDate ? stay.createdAt.toDate() : new Date((stay.createdAt?.seconds || 0) * 1000);
                          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                          const isExpired = (new Date().getTime() - date.getTime()) > thirtyDaysInMs;
                          return isExpired ? (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Expired</span>
                          ) : (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Active</span>
                          );
                        })()
                      )}
                      {stay.isPaid && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Paid</span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-slate-500 gap-3">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {stay.location}</span>
                      <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Rs. {stay.price}/night</span>
                    </div>
                    {stay.approved && !stay.isPaid && (() => {
                      const date = stay.createdAt?.toDate ? stay.createdAt.toDate() : new Date((stay.createdAt?.seconds || 0) * 1000);
                      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                      const isExpired = (new Date().getTime() - date.getTime()) > thirtyDaysInMs;
                      if (isExpired) {
                        return (
                          <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                            <p className="text-[10px] text-red-800 font-medium">Listing expired. Pay Rs. 500 to reactivate.</p>
                            <button className="text-[10px] font-bold text-red-600 hover:underline">Pay Now</button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditProperty(stay)}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Edit Stay"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(stay.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Stay"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
