import React from 'react';
import { Star, MapPin, Info, Sparkles, Video } from 'lucide-react';
import { Stay } from '../types';
import { getStayInsights } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface StayCardProps {
  stay: Stay;
  onClick: () => void;
}

export const StayCard: React.FC<StayCardProps> = ({ stay, onClick }) => {
  const [insight, setInsight] = React.useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = React.useState(false);

  const fetchInsight = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (insight) return;
    setLoadingInsight(true);
    const text = await getStayInsights(stay);
    setInsight(text);
    setLoadingInsight(false);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {stay.mediaType === 'video' ? (
          <video 
            src={stay.mediaUrl} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            muted
            loop
            onMouseOver={e => (e.target as HTMLVideoElement).play()}
            onMouseOut={e => (e.target as HTMLVideoElement).pause()}
          />
        ) : (
          <img 
            src={stay.image} 
            alt={stay.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <div className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-slate-700 shadow-sm">
            {stay.type}
          </div>
          {stay.approved === false && (
            <div className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <Info className="w-3 h-3" />
              PENDING APPROVAL
            </div>
          )}
        </div>
        {stay.mediaType === 'video' && (
          <div className="absolute top-3 left-20 px-2 py-1 bg-slate-900/60 backdrop-blur-sm text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
            <Video className="w-3 h-3" />
            VIDEO
          </div>
        )}
        <div className="absolute top-3 right-3 px-2 py-1 bg-brand-500 text-white rounded-lg text-xs font-bold shadow-sm">
          Rs. {stay.price}/night
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{stay.name}</h3>
            <div className="flex items-center text-slate-500 text-sm mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              {stay.location}
            </div>
          </div>
          <div className="flex items-center bg-slate-50 px-2 py-1 rounded-lg">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
            <span className="text-xs font-bold text-slate-700">{stay.rating}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {stay.amenities.slice(0, 3).map(amenity => (
            <span key={amenity} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
              {amenity}
            </span>
          ))}
          {stay.amenities.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
              +{stay.amenities.length - 3}
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100">
          <AnimatePresence mode="wait">
            {!insight ? (
              <button 
                onClick={fetchInsight}
                disabled={loadingInsight}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors disabled:opacity-50"
              >
                {loadingInsight ? (
                  <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Get AI Deal Insight
                  </>
                )}
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-brand-50 p-3 rounded-xl"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-brand-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed text-brand-800 italic">
                    {insight}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
