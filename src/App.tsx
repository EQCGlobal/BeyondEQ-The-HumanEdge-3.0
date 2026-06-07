import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Globe } from 'lucide-react';
import Home from './components/Home';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Assessment from './components/Assessment';
import About from './components/About';
import WhatWeDo from './components/WhatWeDo';
import Contact from './components/Contact';
import BiasCodex from './components/BiasCodex';
import Pinwheel from './components/Pinwheel';
import ObserverAssessment from './components/ObserverAssessment';
import InstantAssessment from './components/InstantAssessment';
import ScrollToTop from './components/ScrollToTop';
import Blog from './components/Blog';
import SupportWidget from './components/SupportWidget';
import { AuthProvider, useAuth } from './context/AuthContext';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { fetchAppOrigin } from './lib/origin';

function Navigation() {
  const { user } = useAuth();
  const location = useLocation();

  const isAccountZone = ['/dashboard', '/bias-codex', '/assessment', '/pinwheel'].includes(location.pathname);

  return (
    <>
      <div className="fixed top-4 left-4 md:top-12 md:left-12 z-50 pointer-events-auto">
        <Link to="/">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-24 md:w-48 h-auto cursor-pointer" 
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }}
          />
        </Link>
      </div>

      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 md:px-10 py-3 bg-white/40 backdrop-blur-md border border-gray-200/50 rounded-full shadow-[0_4px_4px_rgba(0,0,0,0.15)] flex items-center gap-6 md:gap-10 max-w-[95vw] md:max-w-none pointer-events-auto overflow-x-auto"
      >
        {isAccountZone ? (
          /* Account/Dashboard Zone Menu Items */
          <>
            <Link 
              to="/" 
              title="Go back to Website" 
              className="flex items-center gap-2 text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:bg-[#104C64]/5 px-3 py-1.5 rounded-full transition-all whitespace-nowrap"
            >
              <Globe className="w-4 h-4 text-[#104C64] stroke-[2.5]" />
              <span className="hidden sm:inline">Website</span>
            </Link>

            {location.pathname !== '/dashboard' && (
              <Link to="/dashboard" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">Dashboard</Link>
            )}

            {location.pathname !== '/bias-codex' && (
              <Link to="/bias-codex" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap italic">Bias Codex</Link>
            )}

            <button 
              onClick={() => signOut(auth)}
              className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-red-600 hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              Sign Out
            </button>
          </>
        ) : (
          /* External Website Zone Menu Items */
          <>
            {location.pathname !== '/' && (
              <Link to="/" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">Home</Link>
            )}
            {location.pathname !== '/about' && (
              <Link to="/about" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">About</Link>
            )}
            {location.pathname !== '/what-we-do' && (
              <Link to="/what-we-do" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">What We Do</Link>
            )}
            {location.pathname !== '/blog' && (
              <Link to="/blog" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">Blog</Link>
            )}
            {location.pathname !== '/contact' && (
              <Link to="/contact" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">Contact</Link>
            )}

            {user ? (
              <>
                <Link to="/dashboard" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-teal-600 hover:opacity-70 transition-opacity whitespace-nowrap italic">My Account</Link>
                <button 
                  onClick={() => signOut(auth)}
                  className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-red-600 hover:opacity-70 transition-opacity whitespace-nowrap"
                >
                  Sign Out
                </button>
              </>
            ) : (
              location.pathname !== '/login' && (
                <Link to="/login" className="text-[9px] md:text-xs uppercase tracking-[0.2em] font-bold text-[#104C64] hover:opacity-70 transition-opacity whitespace-nowrap">Login</Link>
              )
            )}
          </>
        )}
      </motion.nav>
    </>
  );
}

function CursorManager() {
  const location = useLocation();

  React.useEffect(() => {
    const isHeartPage = ['/about', '/what-we-do'].includes(location.pathname);
    const root = document.documentElement;
    if (isHeartPage) {
      root.classList.remove('cursor-brain');
      root.classList.add('cursor-heart');
    } else {
      root.classList.remove('cursor-heart');
      root.classList.add('cursor-brain');
    }
  }, [location.pathname]);

  return null;
}

export default function App() {
  React.useEffect(() => {
    // Proactively fetch and cache correct public deployment origin
    fetchAppOrigin().catch(err => console.error("Origin fetch failed:", err));

    // Store invitedBy from URL query parameters globally if present
    const params = new URLSearchParams(window.location.search);
    const urlInvitedBy = params.get('invitedBy');
    if (urlInvitedBy) {
      localStorage.setItem('pending_invitedBy', urlInvitedBy);
    }

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent copying / cutting text unless programmatic or copying invite link
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString();
      if (!selection || selection.includes('register?invitedBy')) {
        return; // Let programmatic or specific invite link copy flow naturally
      }
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'Copying content from this website is disabled.');
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString();
      if (!selection) return;
      e.preventDefault();
    };

    // Prevent dragging images or text
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Block keyboard shortcuts (Ctrl+C, Cmd+C, Ctrl+P, Cmd+P, Ctrl+U, Cmd+U, F12, Ctrl+Shift+I)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Copy: Ctrl+C or Cmd+C / Cut: Ctrl+X or Cmd+X
      if (metaOrCtrl && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
      }

      // Print: Ctrl+P or Cmd+P
      if (metaOrCtrl && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
      }

      // Save: Ctrl+S or Cmd+S
      if (metaOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
      }

      // View Source: Ctrl+U or Cmd+U
      if (metaOrCtrl && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
      }

      // Inspect: F12 or Ctrl+Shift+I / Cmd+Option+I (I key code)
      if (e.key === 'F12' || (metaOrCtrl && e.shiftKey && (e.key === 'i' || e.key === 'I'))) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <CursorManager />
        <div className="relative bg-white min-h-screen font-sans overflow-x-hidden w-full">
          <Navigation />
          <SupportWidget />
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/what-we-do" element={<WhatWeDo />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/bias-codex" element={<BiasCodex />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pinwheel" element={<Pinwheel />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/observer-assessment" element={<ObserverAssessment />} />
            <Route path="/instant-assessment" element={<InstantAssessment />} />
          </Routes>

          {/* SEO/GEO Mission Block (Hidden) */}
          <section className="sr-only">
            BeyondEQ 3.0 assessment portal. Emotional Intelligence capability maturity model consultancy.
          </section>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
