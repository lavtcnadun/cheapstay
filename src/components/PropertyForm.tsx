import React from 'react';
import { X, Upload, ImageIcon, Video, MapPin, Coins, Type, Sparkles, Loader2, CheckCircle, Smartphone } from 'lucide-react';
import { db, auth, collection, addDoc, serverTimestamp, storage, ref, uploadBytes, getDownloadURL, OperationType, handleFirestoreError, updateDoc, doc } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Stay } from '../types';

interface PropertyFormProps {
  onClose: () => void;
  initialData?: Stay | null;
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, initialData }) => {
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    location: initialData?.location || '',
    price: initialData?.price?.toString() || '',
    type: initialData?.type || 'Hotel',
    description: initialData?.description || '',
    amenities: initialData?.amenities?.join(', ') || '',
  });
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [mediaType, setMediaType] = React.useState<'image' | 'video'>(initialData?.mediaType || 'image');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    const path = 'stays';
    try {
      let downloadUrl = initialData?.mediaUrl || initialData?.image || '';
      let currentMediaType = mediaType;

      // 1. Upload Media to Firebase Storage if a new file is selected
      if (mediaFile) {
        const storageRef = ref(storage, `stays/${auth.currentUser.uid}/${Date.now()}_${mediaFile.name}`);
        const uploadResult = await uploadBytes(storageRef, mediaFile);
        downloadUrl = await getDownloadURL(uploadResult.ref);
        currentMediaType = mediaType;
      }

      // 2. Save to Firestore
      const stayData: any = {
        name: formData.name,
        location: formData.location,
        price: Number(formData.price),
        type: formData.type,
        description: formData.description,
        amenities: formData.amenities.split(',').map(s => s.trim()).filter(Boolean),
        image: currentMediaType === 'image' ? downloadUrl : 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800',
        mediaUrl: downloadUrl,
        mediaType: currentMediaType,
        updatedAt: serverTimestamp(),
      };

      if (initialData) {
        await updateDoc(doc(db, path, initialData.id), stayData);
        onClose();
      } else {
        stayData.authorId = auth.currentUser.uid;
        stayData.authorName = auth.currentUser.displayName || 'Anonymous';
        stayData.rating = 5.0;
        stayData.reviews = 0;
        stayData.approved = false;
        stayData.isPaid = false;
        stayData.createdAt = serverTimestamp();
        await addDoc(collection(db, path), stayData);
        setSubmitted(true);
      }
    } catch (error) {
      handleFirestoreError(error, initialData ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Property Submitted!</h2>
            <p className="text-slate-500">Your property is pending approval. Please complete the payment to activate your listing.</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="text-sm font-bold text-slate-500 uppercase">Advertisement Fee</span>
              <span className="text-xl font-bold text-brand-600">500/= Rupees</span>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bank Details</h4>
              <div className="text-sm space-y-1">
                <p className="flex justify-between"><span className="text-slate-500">Bank:</span> <span className="font-bold text-slate-900">People's Bank</span></p>
                <p className="flex justify-between"><span className="text-slate-500">Branch:</span> <span className="font-bold text-slate-900">Ratmalana</span></p>
                <p className="flex justify-between"><span className="text-slate-500">Account:</span> <span className="font-bold text-slate-900">080200186339354</span></p>
              </div>
            </div>

            <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-900 leading-relaxed">
                Please pay and send the bank slip to <span className="font-bold">+94770205124</span> via WhatsApp for quick approval.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors"
          >
            Got it, thanks!
          </button>
        </motion.div>
      </div>
    );
  }

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
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Post Your Property</h2>
            <p className="text-sm text-slate-500">Share your budget stay with the community</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            {/* Media Upload */}
            <div className="relative group">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Photo or Video</label>
              <div className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden ${
                mediaFile ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-400 bg-slate-50'
              }`}>
                {mediaFile ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    {mediaType === 'image' ? <ImageIcon className="w-12 h-12 text-brand-500 mb-2" /> : <Video className="w-12 h-12 text-brand-500 mb-2" />}
                    <p className="text-sm font-bold text-brand-700 truncate max-w-full">{mediaFile.name}</p>
                    <button 
                      type="button"
                      onClick={() => setMediaFile(null)}
                      className="mt-4 px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-50"
                    >
                      Change File
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-300 mb-2 group-hover:text-brand-400 transition-colors" />
                    <p className="text-sm font-medium text-slate-500">Click to upload image or video</p>
                    <p className="text-[10px] text-slate-400 mt-1">Max size: 10MB</p>
                  </>
                )}
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Property Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Sunny Beach Villa"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="City, Country"
                  />
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price per Night (Rs.)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                  />
                  <Coins className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Property Type</label>
                <div className="relative">
                  <select 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: formData.type})}
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amenities (comma separated)</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.amenities}
                onChange={e => setFormData({...formData, amenities: e.target.value})}
                placeholder="WiFi, Kitchen, Pool, AC..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
              <textarea 
                rows={3}
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Tell us about your property..."
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !mediaFile}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading Property...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-brand-400" />
                Post Property
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
