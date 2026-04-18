import React from 'react';
import { X, Plus, Trash2, Edit2, Save, Image as ImageIcon, MapPin, Coins, Star, Type, CheckCircle, Info, Settings, Loader2, Upload, Clock, LayoutDashboard, TrendingUp, Users, DollarSign, Calendar, Check } from 'lucide-react';
import { Stay, Booking } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, OperationType, handleFirestoreError, setDoc, onSnapshot, storage, ref, uploadBytes, getDownloadURL, query, orderBy } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  stays: Stay[];
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ stays, onClose }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'approved' | 'expired'>('all');
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'stays' | 'bookings' | 'settings'>('dashboard');
  const [heroImageUrl, setHeroImageUrl] = React.useState('');
  const [bookings, setBookings] = React.useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = React.useState(true);
  const [heroFile, setHeroFile] = React.useState<File | null>(null);
  const [updatingHero, setUpdatingHero] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Stay>>({
    name: '',
    location: '',
    price: 0,
    rating: 4.5,
    reviews: 0,
    image: '',
    type: 'Hotel',
    amenities: [],
    description: '',
    approved: false
  });

  React.useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'hero'), (docSnap) => {
      if (docSnap.exists()) {
        setHeroImageUrl(docSnap.data().heroImage || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/hero');
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      setBookings(data);
      setLoadingBookings(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateHero = async () => {
    if (!heroImageUrl.trim() && !heroFile) return;
    setUpdatingHero(true);
    try {
      let finalUrl = heroImageUrl;

      if (heroFile) {
        const storageRef = ref(storage, `settings/hero_${Date.now()}_${heroFile.name}`);
        const uploadResult = await uploadBytes(storageRef, heroFile);
        finalUrl = await getDownloadURL(uploadResult.ref);
      }

      await setDoc(doc(db, 'settings', 'hero'), {
        heroImage: finalUrl,
        updatedAt: new Date()
      });
      setHeroImageUrl(finalUrl);
      setHeroFile(null);
      alert('Hero image updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/hero');
    } finally {
      setUpdatingHero(false);
    }
  };

  const handleHeroFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setHeroFile(e.target.files[0]);
      setHeroImageUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSave = async () => {
    const path = 'stays';
    try {
      const data = {
        ...formData,
        createdAt: new Date(),
        price: Number(formData.price),
        rating: Number(formData.rating),
        reviews: Number(formData.reviews),
        amenities: typeof formData.amenities === 'string' 
          ? (formData.amenities as string).split(',').map(s => s.trim()) 
          : formData.amenities
      };

      if (editingId) {
        await updateDoc(doc(db, path, editingId), data);
      } else {
        await addDoc(collection(db, path), { ...data, approved: true }); // Admin posts are auto-approved
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        name: '',
        location: '',
        price: 0,
        rating: 4.5,
        reviews: 0,
        image: '',
        type: 'Hotel',
        amenities: [],
        description: '',
        approved: false
      });
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    const path = 'stays';
    try {
      await updateDoc(doc(db, path, id), { approved: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleTogglePaid = async (id: string, currentStatus: boolean) => {
    const path = 'stays';
    try {
      await updateDoc(doc(db, path, id), { isPaid: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string) => {
    const path = 'bookings';
    try {
      await updateDoc(doc(db, path, id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'stays';
    if (!confirm('Are you sure you want to delete this stay?')) return;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const startEdit = (stay: Stay) => {
    setEditingId(stay.id);
    setFormData(stay);
    setIsAdding(true);
  };

  const filteredStays = stays.filter(s => {
    const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date((s.createdAt?.seconds || 0) * 1000);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const isExpired = (new Date().getTime() - date.getTime()) > thirtyDaysInMs;

    if (filter === 'pending') return !s.approved;
    if (filter === 'approved') return s.approved;
    if (filter === 'expired') return isExpired && !s.isPaid;
    return true;
  });

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
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Panel</h2>
            <p className="text-sm text-slate-500">Manage listings and site settings</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-slate-200 p-1 rounded-xl mr-4">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('stays')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'stays' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Stays
              </button>
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'bookings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Bookings
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Settings
              </button>
            </div>

            {activeTab === 'stays' && !isAdding && (
              <div className="flex bg-slate-200 p-1 rounded-xl">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'pending' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Pending
                </button>
                <button 
                  onClick={() => setFilter('approved')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'approved' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Approved
                </button>
                <button 
                  onClick={() => setFilter('expired')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'expired' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Expired
                </button>
              </div>
            )}
            
            {activeTab === 'stays' && (
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-colors"
              >
                {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAdding ? 'Cancel' : 'Add New Stay'}
              </button>
            )}
            
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-brand-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stays</p>
                      <p className="text-3xl font-bold text-slate-900">{stays.length}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approval</p>
                      <p className="text-3xl font-bold text-slate-900">{stays.filter(s => !s.approved).length}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                      <p className="text-3xl font-bold text-slate-900">Rs. {stays.filter(s => s.isPaid).length * 500}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired (Unpaid)</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {stays.filter(s => {
                          const date = s.createdAt?.toDate ? s.createdAt.toDate() : new Date((s.createdAt?.seconds || 0) * 1000);
                          const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                          return (new Date().getTime() - date.getTime()) > thirtyDaysInMs && !s.isPaid;
                        }).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-brand-500" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      {stays.slice(0, 5).map(stay => (
                        <div key={stay.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <img src={stay.image} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">{stay.name}</p>
                              <p className="text-[10px] text-slate-500">{stay.authorName || 'Anonymous'}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${stay.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {stay.approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-500" />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => { setActiveTab('stays'); setFilter('pending'); }}
                        className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-500 transition-all text-left group"
                      >
                        <Clock className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-sm font-bold text-slate-900">Review Stays</p>
                        <p className="text-[10px] text-slate-500">Check pending approvals</p>
                      </button>
                      <button 
                        onClick={() => setActiveTab('bookings')}
                        className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-brand-500 transition-all text-left group"
                      >
                        <Calendar className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-sm font-bold text-slate-900">Bookings</p>
                        <p className="text-[10px] text-slate-500">Manage {bookings.filter(b => b.status === 'pending').length} pending</p>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'bookings' ? (
              <motion.div 
                key="bookings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No bookings found.</div>
                ) : (
                  bookings.map(booking => (
                    <div key={booking.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-bold text-slate-900">{booking.stayName}</h4>
                        <p className="text-xs text-slate-500">By {booking.userName}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleString() : 'Recent'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {booking.status}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Confirm"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            ) : activeTab === 'settings' ? (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto space-y-8 py-8"
              >
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Hero Image</h3>
                      <p className="text-sm text-slate-500">Update the main background image of the homepage</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-brand-400 bg-slate-100 transition-all duration-300">
                      {heroImageUrl ? (
                        <img src={heroImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <Upload className="w-10 h-10 mb-2" />
                          <p className="text-sm font-medium">Click to upload hero image</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleHeroFileChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase">Or Image URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="https://images.unsplash.com/..."
                        value={heroImageUrl}
                        onChange={e => {
                          setHeroImageUrl(e.target.value);
                          setHeroFile(null);
                        }}
                      />
                    </div>

                    <button 
                      onClick={handleUpdateHero}
                      disabled={updatingHero || (!heroImageUrl && !heroFile)}
                      className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                    >
                      {updatingHero ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Hero Image
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : isAdding ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stay Name</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                      <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                      />
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (Rs.)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                        />
                        <Coins className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                      <div className="relative">
                        <select 
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
                          value={formData.type}
                          onChange={e => setFormData({...formData, type: e.target.value as any})}
                        >
                          <option value="Hotel">Hotel</option>
                          <option value="Hostel">Hostel</option>
                          <option value="Apartment">Apartment</option>
                          <option value="Guesthouse">Guesthouse</option>
                        </select>
                        <Type className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Image URL</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                      value={formData.image}
                      onChange={e => setFormData({...formData, image: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amenities (comma separated)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                      value={Array.isArray(formData.amenities) ? formData.amenities.join(', ') : formData.amenities}
                      onChange={e => setFormData({...formData, amenities: e.target.value as any})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                    <textarea 
                      rows={4}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rating</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          step="0.1"
                          max="5"
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                          value={formData.rating}
                          onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                        />
                        <Star className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reviews</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                        value={formData.reviews}
                        onChange={e => setFormData({...formData, reviews: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleSave}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update Stay' : 'Save Stay'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {filteredStays.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No stays found matching filter.</div>
                ) : (
                  filteredStays.map(stay => (
                    <div key={stay.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 transition-colors">
                      <div className="relative">
                        <img src={stay.image} className="w-16 h-16 object-cover rounded-xl shrink-0" referrerPolicy="no-referrer" />
                        {!stay.approved && (
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg">
                            <Info className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{stay.name}</h4>
                          {!stay.approved && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Pending</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{stay.location} • Rs. {stay.price}/night</p>
                        <div className="flex items-center gap-2 mt-1">
                          {stay.authorName && <p className="text-[10px] text-slate-400">By: {stay.authorName}</p>}
                          {stay.createdAt && (
                            <p className="text-[10px] text-slate-400">
                              Listed: {new Date(stay.createdAt.seconds * 1000).toLocaleDateString()}
                            </p>
                          )}
                          {stay.isPaid && <span className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded uppercase">Paid</span>}
                          {(() => {
                            const date = stay.createdAt?.toDate ? stay.createdAt.toDate() : new Date((stay.createdAt?.seconds || 0) * 1000);
                            const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                            const isExpired = (new Date().getTime() - date.getTime()) > thirtyDaysInMs;
                            if (isExpired && !stay.isPaid) {
                              return <span className="text-[8px] font-bold bg-red-100 text-red-700 px-1 py-0.5 rounded uppercase">Expired</span>;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleToggleApproval(stay.id, stay.approved)}
                          className={`p-2 rounded-lg transition-colors ${stay.approved ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                          title={stay.approved ? "Disable Listing" : "Approve Listing"}
                        >
                          {stay.approved ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleTogglePaid(stay.id, !!stay.isPaid)}
                          className={`p-2 rounded-lg transition-colors ${stay.isPaid ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
                          title={stay.isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                        >
                          <Coins className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => startEdit(stay)}
                          className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(stay.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
