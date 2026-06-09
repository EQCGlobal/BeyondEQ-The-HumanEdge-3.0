import React from 'react';
import { ShieldAlert, ExternalLink, HelpCircle } from 'lucide-react';

interface FirebaseErrorAlertProps {
  error: string;
  onClear?: () => void;
  userType?: 'individual' | 'enterprise';
}

function translateError(errorMsg: string, userType: 'individual' | 'enterprise' = 'individual'): string {
  const lower = errorMsg.toLowerCase();

  // If the error is already a customized, friendly validation message that we manually set inside our forms, preserve it
  if (
    lower.includes('domain mismatch') || 
    lower.includes('official/corporate email') ||
    lower.includes('fill in physical details') ||
    lower.includes('compulsory')
  ) {
    return errorMsg;
  }

  // Handle operation action block (for development setup)
  if (lower.includes('auth/operation-not-allowed') || lower.includes('operation-not-allowed')) {
    return errorMsg; 
  }

  // 1. Password issues (wrong password or invalid credentials which covers wrong password in newer SDKs)
  if (lower.includes('wrong-password') || lower.includes('invalid-credential') || lower.includes('invalid_credential')) {
    if (userType === 'enterprise') {
      return "Wrong password or corporate email ID doesn't exist. Please check your credentials or contact your administrator.";
    }
    return "Wrong password or email ID doesn't exist. Please verify your credentials and try again.";
  }

  // 2. User/Email does not exist
  if (lower.includes('user-not-found') || lower.includes('user_not_found')) {
    if (userType === 'enterprise') {
      return "This email ID doesn't exist in our corporate database. Please declare a valid registered enterprise account or ask your workspace admin for an invitation.";
    }
    return "This email ID doesn't exist. Please check your spelling or register as a new user first.";
  }

  // 3. Email already in use
  if (lower.includes('email-already-in-use') || lower.includes('email_already_in_use') || lower.includes('email-already-exists')) {
    if (userType === 'enterprise') {
      return "This corporate email ID is already registered. Please login to access your executive dashboard.";
    }
    return "This email address is already registered. Please sign in instead.";
  }

  // 4. Weak password
  if (lower.includes('weak-password') || lower.includes('weak_password')) {
    return "Your password is too weak. For security, it must be at least 6 characters long.";
  }

  // 5. Invalid email format
  if (lower.includes('invalid-email') || lower.includes('invalid_email')) {
    return "Please enter a valid email address (e.g., name@example.com).";
  }

  // 6. Too many requests
  if (lower.includes('too-many-requests') || lower.includes('too_many_requests')) {
    return "Too many failed attempts. Access is temporarily disabled to protect this account. Please try again shortly.";
  }

  if (lower.includes('network-request-failed')) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  // Strip prefix like "Firebase:" if it starts with it
  let cleaned = errorMsg;
  if (/^firebase:\s*/i.test(cleaned)) {
    cleaned = cleaned.replace(/^firebase:\s*error\s*\((.*?)\):?/i, '$1').replace(/^firebase:\s*/i, '');
  }

  // Capitalize first letter neatly
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function FirebaseErrorAlert({ error, onClear, userType = 'individual' }: FirebaseErrorAlertProps) {
  const errorLower = error.toLowerCase();
  const isOperationNotAllowed = errorLower.includes('auth/operation-not-allowed') || errorLower.includes('operation-not-allowed');
  const isUnauthorizedDomain = errorLower.includes('auth/unauthorized-domain') || errorLower.includes('unauthorized-domain');

  const displayedError = translateError(error, userType);

  if (!isOperationNotAllowed && !isUnauthorizedDomain) {
    return (
      <div className="p-5 mb-6 bg-red-50 border border-red-250 text-red-700 text-xs font-bold rounded-2xl text-center leading-relaxed font-sans shadow-sm flex flex-col items-center justify-center gap-2">
        <ShieldAlert className="w-5 h-5 text-red-500" />
        <span>{displayedError}</span>
        {onClear && (
          <button 
            onClick={onClear} 
            className="mt-1 text-[9px] uppercase tracking-wider text-red-500 hover:underline cursor-pointer"
          >
            Clear error and retry
          </button>
        )}
      </div>
    );
  }

  if (isUnauthorizedDomain) {
    const authorizedDomainsUrl = "https://console.firebase.google.com/project/gen-lang-client-0131109540/authentication/settings";
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'beyondeq.org';

    return (
      <div id="firebase-domain-alert" className="p-6 mb-8 bg-[#fffbeb] border border-[#fef3c7] rounded-[32px] text-amber-950 font-sans shadow-md ring-4 ring-amber-500/5 hover:shadow-lg transition-all">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-750 shrink-0">
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="space-y-3 flex-1 text-left">
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5 font-sans">
              Firebase Domain Authorization Required
            </h4>
            <p className="text-xs text-amber-850 font-sans leading-relaxed">
              The domain <span className="font-bold underline decoration-amber-400">{currentHostname}</span> has not been authorized for Google Sign-in within your Firebase Authentication settings.
            </p>

            <div className="bg-amber-100/40 border border-amber-200/50 rounded-2xl p-4 space-y-2.5">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5 font-sans">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> How to authorize this domain (in 30 seconds):
              </h5>
              <ol className="list-decimal list-inside text-[11px] text-amber-900 space-y-1.5 leading-relaxed font-sans font-medium">
                <li>
                  Click the <span className="font-extrabold text-amber-950">"Authorize Domains In Console"</span> button below.
                </li>
                <li>
                  Scroll down to the <span className="font-bold text-amber-950">"Authorized domains"</span> section.
                </li>
                <li>
                  Click <span className="font-bold text-amber-950">"Add domain"</span>.
                </li>
                <li>
                  Enter exactly <span className="font-extrabold text-[#104C64]">{currentHostname}</span> (and also <span className="font-extrabold text-stone-700">beyondeq.org</span> if not already added) and click <span className="font-black">Add</span>.
                </li>
              </ol>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a 
                href={authorizedDomainsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-colors font-sans decoration-transparent active:scale-95 cursor-pointer border border-[#104C64]/10"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#41B1C2] stroke-[2.5]" />
                Authorize Domains In Console
              </a>
              
              {onClear && (
                <button
                  onClick={onClear}
                  className="px-4 py-3 text-stone-600 hover:text-stone-900 text-[10px] font-black uppercase tracking-wider bg-stone-100 border border-stone-200 hover:bg-stone-150 rounded-xl transition-all cursor-pointer text-center font-sans active:scale-95"
                >
                  Clear & Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exact Firebase Console Auth link for the current project:
  const firebaseConsoleUrl = "https://console.firebase.google.com/project/gen-lang-client-0131109540/authentication/providers";

  return (
    <div id="firebase-guide-alert" className="p-6 mb-8 bg-[#fffbeb] border border-[#fef3c7] rounded-[32px] text-amber-950 font-sans shadow-md ring-4 ring-amber-500/5 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-100 rounded-2xl text-amber-750 shrink-0">
          <ShieldAlert className="w-6 h-6 stroke-[2]" />
        </div>
        <div className="space-y-3 flex-1 text-left">
          <h4 className="text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5 font-sans">
            Firebase Sign-In Provider Required
          </h4>
          <p className="text-xs text-amber-850 font-sans leading-relaxed">
            The Firebase project has <span className="font-bold underline decoration-amber-400">Email/Password sign-in provider</span> disabled by default. You must enable it in your Firebase console to permit email registration.
          </p>

          <div className="bg-amber-100/40 border border-amber-200/50 rounded-2xl p-4 space-y-2.5">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5 font-sans">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> How to activate (in 20 seconds):
            </h5>
            <ol className="list-decimal list-inside text-[11px] text-amber-900 space-y-1.5 leading-relaxed font-sans font-medium">
              <li>
                Click the <span className="font-extrabold text-amber-950">"Configure Providers"</span> link below.
              </li>
              <li>
                Click <span className="font-bold text-amber-950">"Add new provider"</span> (or edit if already present).
              </li>
              <li>
                Select <span className="font-extrabold text-amber-950">Email/Password</span>.
              </li>
              <li>
                Toggle the switch to <span className="font-extrabold text-[#104C64]">"Enable"</span> and click <span className="font-bold">Save</span>.
              </li>
            </ol>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a 
              href={firebaseConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-[#104C64] hover:bg-[#0D3E52] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-colors font-sans decoration-transparent active:scale-95 cursor-pointer border border-[#104C64]/10"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#41B1C2] stroke-[2.5]" />
              Configure Providers In Console
            </a>
            
            {onClear && (
              <button
                onClick={onClear}
                className="px-4 py-3 text-stone-600 hover:text-stone-900 text-[10px] font-black uppercase tracking-wider bg-stone-100 border border-stone-200 hover:bg-stone-150 rounded-xl transition-all cursor-pointer text-center font-sans active:scale-95"
              >
                Clear & Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
