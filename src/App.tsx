import React from 'react';
import { Search, X, MessageSquare, Send, Sparkles, MapPin, Star, Info, Lock, LogOut, User as UserIcon, Plus, Loader2 } from 'lucide-react';
import { Stay, MOCK_STAYS } from './types';
import { StayCard } from './components/StayCard';
import { AdminPanel } from './components/AdminPanel';
import { UserDashboard } from './components/UserDashboard';
import { PropertyForm } from './components/PropertyForm';
import { getTravelAdvice } from './services/geminiService';
import { 
  auth, db, collection, onSnapshot, query, orderBy, 
  signInWithPopup, googleProvider, signOut, onAuthStateChanged, User, doc,
  OperationType, handleFirestoreError
} from './firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStay, setSelectedStay] = React.useState<Stay | null>(null);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [chatInput, setChatInput] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  
  // Firebase State
  const [user, setUser] = React.useState<User | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = React.useState(false);
  const [userDashboardOpen, setUserDashboardOpen] = React.useState(false);
  const [propertyFormOpen, setPropertyFormOpen] = React.useState(false);
  const [editingStay, setEditingStay] = React.useState<Stay | null>(null);
  const [firestoreStays, setFirestoreStays] = React.useState<Stay[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [heroImage, setHeroImage] = React.useState('https://images.unsplash.com/photo-1586902197503-e71026292412?auto=format&fit=crop&q=80&w=2000');

  // Combine Mock and Firestore Stays
  const allStays = [...MOCK_STAYS, ...firestoreStays];

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Simple admin check based on email provided in prompt
        setIsAdmin(currentUser.email === 'nadunrosh@gmail.com');
      } else {
        setIsAdmin(false);
      }
    });

    const q = query(collection(db, 'stays'), orderBy('createdAt', 'desc'));
    const unsubscribeStays = onSnapshot(q, (snapshot) => {
      const staysData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Stay[];
      setFirestoreStays(staysData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stays');
    });

    // Fetch Site Settings (Hero Image)
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'hero'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.heroImage) {
          setHeroImage(data.heroImage);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/hero');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStays();
      unsubscribeSettings();
    };
  }, []);

  const handleLogin = async () => {
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Show dashboard after successful login
      setUserDashboardOpen(true);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log("Login popup already open, ignoring duplicate request.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log("User closed the login popup.");
      } else {
        console.error("Login failed", error);
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAdminPanelOpen(false);
      setPropertyFormOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const isExpired = (createdAt: any) => {
    if (!createdAt) return false;
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds * 1000);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return (new Date().getTime() - date.getTime()) > thirtyDaysInMs;
  };

  const filteredStays = allStays.filter(stay => {
    const matchesSearch = stay.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stay.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stay.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Only show approved stays that are either paid or not yet expired
    const isActive = stay.approved && (stay.isPaid || !isExpired(stay.createdAt));
    
    // Admins can see everything in the main view too? 
    // Usually better to keep the main view clean and let admins use the panel.
    return matchesSearch && (isActive || isAdmin);
  });

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    const aiResponse = await getTravelAdvice(userMsg, filteredStays);
    setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
    setIsTyping(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">CheapStay</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Destinations</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Deals</a>
            {isAdmin && (
              <button 
                onClick={() => setAdminPanelOpen(true)}
                className="text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
              >
                <Lock className="w-4 h-4" />
                Admin
              </button>
            )}
            {user && (
              <button 
                onClick={() => setPropertyFormOpen(true)}
                className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Post Property
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setUserDashboardOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-slate-500" />
                  )}
                  <span className="text-xs font-bold text-slate-700">{user.displayName?.split(' ')[0]}</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                disabled={loggingIn}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Search */}
      <section className="relative py-12 md:py-20 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img 
            src={heroImage} 
            className="w-full h-full object-cover"
            alt="Hero background"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold text-white leading-tight"
          >
            Stay more, <span className="text-brand-400">spend less.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-300"
          >
            AI-powered budget travel discovery. Find the best value stays across the globe.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-xl mx-auto"
          >
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Where are you going? (e.g. Ella, Kandy, Galle...)"
              className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-2xl focus:ring-2 focus:ring-brand-500 outline-none text-slate-900 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            {searchQuery ? `Results for "${searchQuery}"` : 'Top Value Stays'}
          </h2>
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredStays.length} budget options
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredStays.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredStays.map(stay => (
                <StayCard 
                  key={stay.id} 
                  stay={stay} 
                  onClick={() => setSelectedStay(stay)} 
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No stays found</h3>
            <p className="text-slate-500">Try searching for a different city or property type.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-brand-600 font-semibold hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">CheapStay</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Making travel accessible for everyone by finding the hidden gems that don't break the bank.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Explore</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-brand-600">Top Destinations</a></li>
              <li><a href="#" className="hover:text-brand-600">Budget Tips</a></li>
              <li><a href="#" className="hover:text-brand-600">Travel Guides</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="#" className="hover:text-brand-600">About Us</a></li>
              <li><a href="#" className="hover:text-brand-600">Careers</a></li>
              <li><a href="#" className="hover:text-brand-600">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Newsletter</h4>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email" 
                className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1">
            © 2026 CheapStay AI. All rights reserved.
            {/* Hidden Admin Lock Icon */}
            <button 
              onClick={user ? () => setAdminPanelOpen(true) : handleLogin}
              className="text-slate-50 hover:text-slate-200 transition-colors opacity-50 hover:opacity-100"
            >
              <Lock className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {chatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[500px]"
            >
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span className="font-bold">CheapStay AI Assistant</span>
                </div>
                <button onClick={() => setChatOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-4 space-y-4 no-scrollbar min-h-[300px]">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare className="w-6 h-6 text-brand-500" />
                    </div>
                    <p className="text-sm text-slate-500 px-4">
                      Ask me anything! "Where is the cheapest place in Europe?" or "Which stay has a pool?"
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-brand-500 text-white rounded-tr-none' 
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask for advice..."
                  className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
        >
          {chatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>

      {/* User Dashboard */}
      <AnimatePresence>
        {userDashboardOpen && user && (
          <UserDashboard 
            userStays={firestoreStays.filter(s => s.authorId === user.uid)}
            onClose={() => setUserDashboardOpen(false)}
            onAddProperty={() => {
              setEditingStay(null);
              setPropertyFormOpen(true);
            }}
            onEditProperty={(stay) => {
              setEditingStay(stay);
              setPropertyFormOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Admin Panel */}
      <AnimatePresence>
        {adminPanelOpen && isAdmin && (
          <AdminPanel 
            stays={firestoreStays} 
            onClose={() => setAdminPanelOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Property Form */}
      <AnimatePresence>
        {propertyFormOpen && user && (
          <PropertyForm 
            initialData={editingStay}
            onClose={() => {
              setPropertyFormOpen(false);
              setEditingStay(null);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Stay Detail Modal */}
      <AnimatePresence>
        {selectedStay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStay(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedStay(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
              >
                <X className="w-5 h-5 text-slate-900" />
              </button>

              <div className="w-full md:w-1/2 h-64 md:h-auto">
                <img 
                  src={selectedStay.image} 
                  alt={selectedStay.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-brand-600 font-bold text-sm uppercase tracking-wider">
                    {selectedStay.type}
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900">{selectedStay.name}</h2>
                  <div className="flex items-center text-slate-500">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedStay.location}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-amber-50 px-3 py-1.5 rounded-xl">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1.5" />
                    <span className="text-sm font-bold text-amber-900">{selectedStay.rating}</span>
                    <span className="text-xs text-amber-700 ml-1">({selectedStay.reviews} reviews)</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    Rs. {selectedStay.price}<span className="text-sm font-normal text-slate-500">/night</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900">Description</h4>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedStay.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStay.amenities.map(amenity => (
                      <span key={amenity} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-4">
                  <button className="flex-grow py-4 bg-brand-500 text-white font-bold rounded-2xl hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20">
                    Book Now
                  </button>
                  <button className="p-4 bg-slate-100 text-slate-900 rounded-2xl hover:bg-slate-200 transition-colors">
                    <Info className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
