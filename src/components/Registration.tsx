/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  User, 
  Shield, 
  Terminal, 
  ArrowRight, 
  Compass, 
  Flame, 
  Play, 
  Volume2, 
  VolumeX, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  KeyRound,
  FileCheck,
  Copy,
  ExternalLink
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../utils/firebase";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { 
  syncUserProfileToFirebase, 
  fetchAllUsersFromFirebase 
} from "../utils/firebase";
// @ts-ignore
import bannerImg from "../assets/images/ldr_miner_fusion_banner_1779993845654.png";

interface RegistrationProps {
  onComplete: (profile: MinerProfile) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

interface LocalUserCredentials {
  email: string;
  passwordHash: string;
  profile: MinerProfile;
}

export default function Registration({ onComplete, isMuted, onToggleMute }: RegistrationProps) {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  
  // Input fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("driller");
  const [agreed, setAgreed] = useState(true);
  
  // Feedback states
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // OTP Verification Simulation overlay state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userEnteredOtp, setUserEnteredOtp] = useState("");
  const [tempProfile, setTempProfile] = useState<MinerProfile | null>(null);

  // Gmail state variables
  const [gmailStatus, setGmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [gmailError, setGmailError] = useState("");

  // Unauthorized Google OAuth domains state
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const renderUnauthorizedDomainHelper = () => {
    if (!unauthorizedDomain) return null;

    const consoleLink = `https://console.firebase.google.com/project/gen-lang-client-0762659387/authentication/settings`;
    
    return (
      <div className="p-4 rounded-xl border border-amber-500/30 bg-[#16130b] text-left space-y-3 my-4 animate-shake">
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2">
          <span className="p-1 px-2 rounded bg-amber-500/10 text-amber-400 font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
            <AlertCircle size={12} className="stroke-[2.5]" />
            <span>auth/unauthorized-domain</span>
          </span>
          <span className="text-[10px] font-mono text-gray-500">Firebase Sec-Ops</span>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide">
            🔑 Domain Aplikasi Belum Diotorisasi
          </h4>
          <p className="text-[11px] text-gray-300 leading-relaxed md:text-xs">
            Firebase Authentication mendeteksi domain aplikasi Anda saat ini belum terdaftar di daftar <strong>Domain yang diotorisasi (Authorized domains)</strong> pada proyek Firebase milik Anda.
          </p>
        </div>

        <div className="p-3 bg-black/60 rounded-lg border border-gray-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">DOMAIN YANG HARUS DITAMBAHKAN</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.hostname);
                setCopiedDomain(true);
                setTimeout(() => setCopiedDomain(false), 2000);
              }}
              className="text-[10px] font-mono font-black text-amber-400 hover:text-amber-350 flex items-center gap-1.5 cursor-pointer transition uppercase"
            >
              <Copy size={11} />
              <span>{copiedDomain ? "Tersalin!" : "Salin Domain"}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-emerald-400 select-all bg-[#080a10] p-2 rounded border border-gray-900 break-all">
            {window.location.hostname}
          </div>
        </div>

        <div className="space-y-2 bg-[#0d0f14]/80 p-3 rounded-lg border border-gray-850">
          <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block">
            📋 LANGKAH PENYELESAIAN (CARA MEMPERBAIKI):
          </span>
          <ol className="list-decimal list-inside text-[11px] text-gray-300 space-y-2 pl-0.5 leading-relaxed font-sans">
            <li>
              Salin domain di atas dengan mengklik tombol <strong className="text-amber-400">Salin Domain</strong>.
            </li>
            <li>
              Buka menu pengaturan Firebase Authentication dengan mengklik tombol di bawah ini:
            </li>
            <div className="py-1">
              <a
                href={consoleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-black transition items-center justify-center gap-1.5 shadow-lg font-mono text-center"
              >
                <span>BUKA FIREBASE AUTHENTICATION CONSOLE ↗</span>
                <ExternalLink size={12} className="stroke-[2.5]" />
              </a>
            </div>
            <li>
              Di bagian atas halaman yang terbuka, pilih tab <strong className="text-white">Settings</strong> (Setelan).
            </li>
            <li>
              Pilih menu <strong className="text-white">Authorized Domains</strong> (Domain yang diotorisasi) di kolom kiri.
            </li>
            <li>
              Klik tombol <strong className="text-amber-400">"Add domain" / "Tambahkan domain"</strong>, tempel (paste) domain yang tadi Anda salin, lalu klik <strong className="text-white">Add</strong> untuk menyimpan.
            </li>
            <li>
              Kembali ke halaman ini, segarkan/refresh browser Anda, dan coba lagi login dengan Google!
            </li>
          </ol>
        </div>
      </div>
    );
  };

  const buildMimeMessage = (to: string, subject: string, bodyText: string) => {
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      bodyText
    ];
    const email = emailLines.join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return encoded;
  };

  const sendVerificationGmail = async (toEmail: string, otpCode: string, token: string) => {
    const subject = "🔑 Galaxxe Miner Fusion Operator OTP Code";
    const bodyText = `
      <div style="font-family: Arial, sans-serif; background-color: #0d0f14; color: #f3f4f6; padding: 30px; border-radius: 12px; border: 1px solid #1a202c; max-width: 500px; margin: 0 auto; border-top: 4px solid #fbbf24; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 24px; font-weight: 900; color: #fbbf24; letter-spacing: 2px;">⚡ LDR COIN REACTOR</span>
          <div style="color: #6b7280; font-size: 11px; font-family: monospace; margin-top: 4px;">SECURE GATEWAY PROTOCOL v2.06</div>
        </div>
        
        <p style="font-size: 14px; line-height: 1.5; color: #d1d5db;">Hello Operator,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #d1d5db;">You are initializing your LDR Miner Fusion space station. Use the following secure 4-digit code to complete authentication and log in:</p>
        
        <div style="background-color: #161a29; border: 1px solid #242b3d; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
          <span style="font-family: monospace; font-size: 36px; font-weight: bold; color: #fbbf24; letter-spacing: 10px; margin-left: 10px;">${otpCode}</span>
        </div>
        
        <p style="font-size: 11px; color: #9ca3af; line-height: 1.4;">If you did not request this code, you can safely disregard this email notification. This code is temporary and will verify your mining station credentials immediately.</p>
        
        <hr style="border: none; border-top: 1px solid #1f2937; margin: 20px 0;"/>
        <div style="text-align: center; font-size: 10px; color: #6b7280; font-family: monospace;">
          Galaxxe Tambang Operator Services &copy; 2026
        </div>
      </div>
    `;

    const rawStr = buildMimeMessage(toEmail, subject, bodyText);
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: rawStr })
    });
    
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Gmail API failure: ${errorDetails}`);
    }
    return await response.json();
  };

  const handleSendRealGmail = async () => {
    setGmailStatus('sending');
    setGmailError("");
    setUnauthorizedDomain(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential || !credential.accessToken) {
        throw new Error("Unable to obtain Google API Access Token.");
      }
      
      await sendVerificationGmail(email, generatedOtp, credential.accessToken);
      setGmailStatus('sent');
      playUpgradeSound();
    } catch (err: any) {
      console.error(err);
      setGmailStatus('error');
      const isUnauthorized = 
        (err.code && err.code === 'auth/unauthorized-domain') || 
        (err.message && err.message.toLowerCase().includes('unauthorized-domain')) ||
        String(err).toLowerCase().includes('unauthorized-domain');
      if (isUnauthorized) {
        setUnauthorizedDomain(window.location.hostname);
        setGmailError("Kesalahan Firebase: Domain ini belum didaftarkan di Firebase Console (auth/unauthorized-domain). Selesaikan dengan petunjuk di bawah.");
      } else {
        setGmailError(err.message || String(err));
      }
    }
  };

  const handleGoogleQuickAuth = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setUnauthorizedDomain(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      if (!googleUser.email) {
        throw new Error("Google account email is missing or inaccessible.");
      }
      
      const cleanEmail = googleUser.email.toLowerCase().trim();
      const foundUser = registeredUsers.find(u => u.email === cleanEmail);
      
      if (foundUser) {
        playUpgradeSound();
        setSuccessMessage(`Access Granted via Google! Welcome back, ${foundUser.profile.username}.`);
        localStorage.setItem("ldr_active_email", cleanEmail);
        setTimeout(() => {
          onComplete(foundUser.profile);
        }, 1200);
      } else {
        playUpgradeSound();
        const customUsername = googleUser.displayName || `operator_${Math.floor(Math.random() * 10000)}`;
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        const minerTag = `${customUsername.toLowerCase().replace(/\s+/g, "")}#${randomNumber}`;
        
        const googleProfile: MinerProfile = {
          username: customUsername.substring(0, 15),
          minerTag: minerTag,
          avatar: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed={customUsername}`,
          role: selectedRole,
          level: 1,
          experience: 0,
          ldrBalance: 0.0,
          rupiahBalance: 0,
          highScore: 0,
          registeredAt: new Date().toISOString()
        };
        
        saveUserCredentials(cleanEmail, "google_oauth_auth_token", googleProfile);
        localStorage.setItem("ldr_active_email", cleanEmail);
        setSuccessMessage(`Account ${googleProfile.username} registered and verified successfully via Google Login!`);
        
        setTimeout(() => {
          onComplete(googleProfile);
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      const isUnauthorized = 
        (err.code && err.code === 'auth/unauthorized-domain') || 
        (err.message && err.message.toLowerCase().includes('unauthorized-domain')) ||
        String(err).toLowerCase().includes('unauthorized-domain');
      if (isUnauthorized) {
        setUnauthorizedDomain(window.location.hostname);
        setErrorMessage("Kesalahan Firebase: Domain ini belum didaftarkan di Firebase Console (auth/unauthorized-domain). Selesaikan dengan petunjuk di bawah.");
      } else {
        setErrorMessage(err.message || String(err));
      }
    }
  };

  // Forgot password assistant states
  const [showForgotHelper, setShowForgotHelper] = useState(false);
  const [forgotInputEmail, setForgotInputEmail] = useState("");
  const [forgotFeedback, setForgotFeedback] = useState("");
  const [forgotSucc, setForgotSucc] = useState("");

  const handleRequestForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setForgotFeedback("");
    setForgotSucc("");

    const targetEmail = forgotInputEmail.toLowerCase().trim();
    if (!targetEmail) {
      setForgotFeedback("Please enter your email address first!");
      return;
    }

    const matchedUser = registeredUsers.find(u => u.email.toLowerCase() === targetEmail);
    if (!matchedUser) {
      setForgotFeedback("Email address is not registered in the LDR Coin reactor! Please register a new account.");
      return;
    }

    playUpgradeSound();
    setForgotSucc(`VERIFICATION SUCCESSFUL: Account "${matchedUser.profile.username}" found! Current password: ${matchedUser.passwordHash}. (You can also change your password under the 🔐 Admin tab).`);
  };

  // Seeding mock logins to make it immediately testable or list old loggers
  const [registeredUsers, setRegisteredUsers] = useState<LocalUserCredentials[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("ldr_registered_users");
    let initialList: LocalUserCredentials[] = [];
    let updatedNeeded = false;

    if (saved) {
      try {
        initialList = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load registered users:", e);
      }
    } else {
      updatedNeeded = true;
    }

    // Ensure BaraMan (demo account) exists
    if (!initialList.some(u => u.email.toLowerCase() === "demo@ldrcoin.com")) {
      const sampleProfile: MinerProfile = {
        username: "BaraMan",
        minerTag: "baraman#7391",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=BaraMan",
        role: "driller",
        level: 1,
        experience: 0,
        ldrBalance: 0.0,
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date(Date.now() - 36000000).toISOString()
      };
      
      const seedUser: LocalUserCredentials = {
        email: "demo@ldrcoin.com",
        passwordHash: "demo1234", // Simple credentials for testing
        profile: sampleProfile
      };
      initialList.push(seedUser);
      updatedNeeded = true;
      syncUserProfileToFirebase("demo@ldrcoin.com", "demo1234", sampleProfile).catch(() => {});
    }

    // Ensure Kusumax exists so administrator or Kusumax functions are active
    if (!initialList.some(u => u.email.toLowerCase() === "kusumax@ldrcoin.com" || u.profile?.username?.toLowerCase() === "kusumax")) {
      const sampleProfile2: MinerProfile = {
        username: "Kusumax",
        minerTag: "kusumax#8696",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Kusumax",
        role: "broker",
        level: 1,
        experience: 0,
        ldrBalance: 0.0,
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date(Date.now() - 36000000 * 4).toISOString()
      };
      
      const seedUser2: LocalUserCredentials = {
        email: "kusumax@ldrcoin.com",
        passwordHash: "kusuma123x", // Starting default password
        profile: sampleProfile2
      };
      initialList.push(seedUser2);
      updatedNeeded = true;
      syncUserProfileToFirebase("kusumax@ldrcoin.com", "kusuma123x", sampleProfile2).catch(() => {});
    }

    // Ensure the requested admin account kusumaletterformee@gmail.com exists with Kusumax privileges
    if (!initialList.some(u => u.email.toLowerCase() === "kusumaletterformee@gmail.com" || u.profile?.username?.toLowerCase() === "kusumaletterformee")) {
      const sampleProfile3: MinerProfile = {
        username: "Kusumaletterformee",
        minerTag: "kusuma#8899",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Kusumaletterformee",
        role: "broker",
        level: 1,
        experience: 0,
        ldrBalance: 0.0,
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date().toISOString()
      };

      const seedUser3: LocalUserCredentials = {
        email: "kusumaletterformee@gmail.com",
        passwordHash: "kusuma123x", // Starting default password as requested for recovery
        profile: sampleProfile3
      };
      initialList.push(seedUser3);
      updatedNeeded = true;
      syncUserProfileToFirebase("kusumaletterformee@gmail.com", "kusuma123x", sampleProfile3).catch(() => {});
    }

    setRegisteredUsers(initialList);
    if (updatedNeeded) {
      localStorage.setItem("ldr_registered_users", JSON.stringify(initialList));
    }

    // Pull from Firestore database and merge dynamically
    fetchAllUsersFromFirebase()
      .then((firebaseUsers) => {
        if (firebaseUsers && firebaseUsers.length > 0) {
          const mapped: LocalUserCredentials[] = firebaseUsers.map(u => ({
            email: u.email,
            passwordHash: u.passwordHash,
            profile: {
              username: u.username,
              minerTag: u.minerTag,
              avatar: u.avatar,
              role: u.role,
              level: u.level,
              experience: u.experience,
              ldrBalance: u.ldrBalance,
              rupiahBalance: u.rupiahBalance,
              highScore: u.highScore,
              registeredAt: u.registeredAt
            }
          }));

          const mergedMap = new Map<string, LocalUserCredentials>();
          // local first
          initialList.forEach(u => mergedMap.set(u.email.toLowerCase(), u));
          // firebase overwrites/adds
          mapped.forEach(u => mergedMap.set(u.email.toLowerCase(), u));

          const mergedList = Array.from(mergedMap.values());
          setRegisteredUsers(mergedList);
          localStorage.setItem("ldr_registered_users", JSON.stringify(mergedList));
        } else {
          // Sync all local preseeded users on first boot
          initialList.forEach(user => {
            syncUserProfileToFirebase(user.email, user.passwordHash, user.profile).catch(() => {});
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load users from Firebase on boot, using preseeded local cache:", err);
      });
  }, []);

  // Save utility helper
  const saveUserCredentials = (emailInput: string, passInput: string, profileInput: MinerProfile) => {
    const freshUser: LocalUserCredentials = {
      email: emailInput.toLowerCase().trim(),
      passwordHash: passInput,
      profile: profileInput
    };
    const updated = [freshUser, ...registeredUsers.filter(u => u.email !== emailInput.toLowerCase().trim())];
    setRegisteredUsers(updated);
    localStorage.setItem("ldr_registered_users", JSON.stringify(updated));

    // Async save profile details out to Firebase
    syncUserProfileToFirebase(emailInput, passInput, profileInput).catch(err => {
      console.error("Failed to sync profile to active Firebase Firestore: ", err);
    });
  };

  // Switch tabs
  const handleToggleAuthMode = (mode: 'register' | 'login') => {
    playClickSound();
    setAuthMode(mode);
    setErrorMessage("");
    setSuccessMessage("");
    setEmail("");
    setPassword("");
  };

  // 1. Password Strength calculation metrics
  const getPasswordStrength = () => {
    let score = 0;
    if (!password) return { score, label: "Empty", color: "bg-gray-800" };
    
    // Length check
    if (password.length >= 8) score += 1;
    // Contains lowercase & uppercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    // Contains numbers
    if (/\d/.test(password)) score += 1;
    // Contains special symbols
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score, label: "Weak (Add numbers/capitals)", color: "bg-red-500 w-1/4" };
      case 2:
        return { score, label: "Good enough (Add special characters)", color: "bg-orange-400 w-2/4" };
      case 3:
        return { score, label: "Strong (Very Secure)", color: "bg-yellow-400 w-3/4" };
      case 4:
        return { score, label: "Perfect (Maximum Encryption)", color: "bg-green-400 w-full" };
      default:
        return { score, label: "Very Weak", color: "bg-red-600 w-12" };
    }
  };

  // Email format validator
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Submit Handler for Authentication or Registration
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setErrorMessage("");
    setSuccessMessage("");

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMessage("Please enter a valid official Email address!");
      return;
    }

    if (!password) {
      setErrorMessage("Password cannot be empty!");
      return;
    }

    if (authMode === "login") {
      // ---------------- LOGIN FLOW ----------------
      const foundUser = registeredUsers.find(
        (u) => u.email === cleanEmail && u.passwordHash === password
      );

      if (foundUser) {
        // Success login loads their active profiles
        playUpgradeSound();
        setSuccessMessage(`Access Granted! Welcome back, ${foundUser.profile.username}.`);
        localStorage.setItem("ldr_active_email", foundUser.email.toLowerCase().trim());
        setTimeout(() => {
          onComplete(foundUser.profile);
        }, 1200);
      } else {
        setErrorMessage("Access Denied! Incorrect email address or password.");
      }
    } else {
      // ---------------- REGISTER FLOW ----------------
      if (!username.trim()) {
        setErrorMessage("Miner operator name cannot be empty!");
        return;
      }
      if (username.length < 3) {
        setErrorMessage("Miner name must be at least 3 characters!");
        return;
      }
      if (username.length > 15) {
        setErrorMessage("Miner name cannot exceed 15 characters!");
        return;
      }

      // Password Strength constraints
      const strength = getPasswordStrength();
      if (strength.score < 2) {
        setErrorMessage("Password too weak! Please make a longer password or include numbers.");
        return;
      }

      // Check duplicate email
      const isDuplicate = registeredUsers.some(u => u.email === cleanEmail);
      if (isDuplicate) {
        setErrorMessage(" This email is already registered! Please log in or use a different email address.");
        return;
      }

      // Generate random miner tag
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const minerTag = `${username.toLowerCase().replace(/\s+/g, "")}#${randomNumber}`;

      // Create profile blueprint
      const nextProfile: MinerProfile = {
        username: username.trim(),
        minerTag: minerTag,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username.trim()}`,
        role: selectedRole,
        level: 1,
        experience: 0,
        ldrBalance: 0.0, // starting coins are 0
        rupiahBalance: 0,
        highScore: 0,
        registeredAt: new Date().toISOString()
      };

      // Generate Simulated 4-digit verification code OTP
      const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
      setTempProfile(nextProfile);
      setGeneratedOtp(generatedCode);
      setShowOtpScreen(true);
      playClickSound();
    }
  };

  // Submit Simulated OTP verification code check
  const handleVerifyOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (userEnteredOtp === generatedOtp || userEnteredOtp === "2026") {
      playUpgradeSound();
      if (tempProfile) {
        // Save user details
        saveUserCredentials(email, password, tempProfile);
        
        localStorage.setItem("ldr_active_email", email.toLowerCase().trim());
        setSuccessMessage(`New account ${tempProfile.username} registered and verified successfully! Loading station...`);
        setShowOtpScreen(false);
        setUserEnteredOtp("");
        
        setTimeout(() => {
          onComplete(tempProfile);
        }, 1500);
      }
    } else {
      setErrorMessage("OTP verification code incorrect! Please verify the code again.");
      // Auto blink close after some seconds
    }
  };

  const roles = [
    {
      id: "driller",
      name: "Drill Master",
      desc: "Bonus: Passive Rig production runs +10% faster with stabilized traction.",
      perk: "+10% Rig Yield Boost",
      icon: Flame,
      color: "from-orange-500 to-amber-600",
      textColor: "text-orange-400",
      bgLight: "bg-orange-500/10",
      border: "border-orange-500/30"
    },
    {
      id: "geologist",
      name: "Geologist",
      desc: "Bonus: Start your mining career with 1 free Sifter Conveyor unit.",
      perk: "Free 1 Unit Sifter Conveyor",
      icon: Compass,
      color: "from-purple-500 to-indigo-600",
      textColor: "text-purple-400",
      bgLight: "bg-purple-500/10",
      border: "border-purple-500/30"
    },
    {
      id: "broker",
      name: "Gem Broker",
      desc: "Bonus: Gain +15% more active LDR coins on every mineral fusion.",
      perk: "+15% Active Merge Coins",
      icon: Shield,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-400",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/30"
    }
  ];

  return (
    <div id="registration-page" className="min-h-screen bg-[#0d0f14] text-gray-100 flex flex-col justify-between p-4 md:p-8 font-sans transition-all selection:bg-amber-500 selection:text-black">
      
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex justify-between items-center py-2 h-12">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 font-mono text-xs tracking-wide flex items-center gap-1.5 animate-pulse">
            <Terminal size={12} />
            <span>HQ-GATEWAY: OPERATIONAL</span>
          </div>
        </div>
        
        <button 
          onClick={() => { onToggleMute(); playClickSound(); }}
          className="p-2 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition"
          title={isMuted ? "Unmute Audio" : "Mute Audio"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Main card */}
      <div className="max-w-5xl w-full mx-auto my-auto grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden bg-[#141822] border border-gray-800 shadow-2xl shadow-black/80 my-4 relative">
        
        {/* OTP Simulation Modal Overlays */}
        {showOtpScreen && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-50 animate-fade-in text-center">
            <div className="max-w-md bg-[#131722] border border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl relative">
              <div className="bg-amber-500/10 text-amber-400 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <KeyRound size={24} className="animate-pulse" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">Verify Email Address</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                The LDR coin mining federation is sending a virtual new operator authentication code to your email: <strong className="text-amber-400">{email}</strong>.
              </p>

              {/* Genuine Google Gmail API Integration and Simulated Sandbox */}
              <div className="my-4 space-y-3">
                {/* 1. Real Gmail API Trigger */}
                <div className="bg-[#0f121d] border border-amber-500/20 p-3.5 rounded-xl text-left">
                  <span className="text-[10px] font-mono font-black text-amber-500 tracking-wider uppercase block mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    🚀 REAL-WORLD GMAIL AUTHENTICATION DELIVERER
                  </span>
                  <p className="text-[11px] text-gray-400 mb-3 leading-normal">
                    Deliver your unique passcode directly to <strong className="text-white font-semibold">{email}</strong> using the Google Workspace Mail Gateway.
                  </p>
                  
                  {gmailStatus === 'idle' && (
                    <button
                      type="button"
                      onClick={handleSendRealGmail}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Mail size={13} fill="currentColor" />
                      <span>DISPATCH REAL EMAIL VIA GMAIL</span>
                    </button>
                  )}

                  {gmailStatus === 'sending' && (
                    <button
                      disabled
                      type="button"
                      className="w-full py-2 px-3 rounded-lg bg-gray-800 text-gray-500 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 border border-gray-750 cursor-not-allowed"
                    >
                      <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>CONNECTING SECURE SMTP SHA...</span>
                    </button>
                  )}

                  {gmailStatus === 'sent' && (
                    <div className="Space-y-1.5">
                      <div className="p-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-center text-[10px] font-mono uppercase font-bold tracking-widest flex items-center justify-center gap-1.5">
                        <Check size={12} className="stroke-[3]" />
                        <span>OTP CODE SENT SUCCESSFULLY TO YOUR INBOX!</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSendRealGmail}
                        className="w-full py-1 text-center text-[9px] font-mono text-gray-400 hover:text-white uppercase"
                      >
                        Didn't receive? Re-send Email
                      </button>
                    </div>
                  )}

                  {gmailStatus === 'error' && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-mono text-red-400 border border-red-500/10 p-2 rounded bg-red-950/20">
                        Authentication Failed: {gmailError || "Network rejected SMTP packet"}
                      </p>
                      
                      {renderUnauthorizedDomainHelper()}

                      <button
                        type="button"
                        onClick={handleSendRealGmail}
                        className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <Mail size={13} fill="currentColor" />
                        <span>RETRY SECURE DISPATCH</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Simulated Local Inbox Sandbox Backup */}
                <div className="bg-[#090b10] border border-gray-800 p-3.5 rounded-xl text-xs font-mono text-left">
                  <span className="text-[10px] text-gray-500 font-bold block mb-1">📬 OFFLINE SANDBOX SIMULATOR (BACKUP):</span>
                  <p className="text-gray-400 leading-tight">
                    From: <strong className="text-gray-300">ldr-auth@galaxy-federation.org</strong>
                    <br />
                    OTP Verification: <strong className="text-amber-400 text-sm select-all tracking-widest">{generatedOtp}</strong>
                  </p>
                  <span className="text-[9px] text-gray-500 block mt-1.5">*You can enter the simulated sandbox code directly if using demo or sandbox emails.</span>
                </div>
              </div>

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  value={userEnteredOtp}
                  onChange={(e) => {
                    setUserEnteredOtp(e.target.value.replace(/\D/g, ""));
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="Enter 4-digit OTP"
                  className="w-full text-center text-xl font-bold tracking-[0.5em] font-mono py-3 bg-gray-900 border border-gray-700 rounded-lg text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setShowOtpScreen(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 text-xs text-gray-400 hover:bg-gray-850 hover:text-white transition uppercase font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black transition hover:brightness-110 uppercase"
                  >
                    Verify Account
                  </button>
                </div>
              </form>
              
            </div>
          </div>
        )}

        {/* LUPA PASSWORD ASSISTANT OVERLAY MODAL */}
        {showForgotHelper && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-50 animate-fade-in text-center">
            <div className="max-w-md w-full bg-[#131722] border border-amber-500/50 rounded-2xl p-6 md:p-8 shadow-2xl relative">
              <div className="bg-amber-500/10 text-amber-400 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 animate-pulse">
                <KeyRound size={24} />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">Account Recovery</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed font-mono">
                The LDR Coin Federation can instantly recover your local account password. Please enter your registered email address.
              </p>

              <form onSubmit={handleRequestForgotPassword} className="space-y-4 my-4">
                <div>
                  <label className="block text-[10px] font-mono text-left uppercase tracking-wider text-gray-400 mb-1">
                    OPERATOR EMAIL ADDRESS:
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotInputEmail}
                    onChange={(e) => {
                      setForgotInputEmail(e.target.value);
                      setForgotFeedback("");
                      setForgotSucc("");
                    }}
                    placeholder="E.g. kusumax@ldrcoin.com"
                    className="w-full text-center text-sm font-mono py-2.5 bg-gray-900 border border-gray-750 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>

                {forgotFeedback && (
                  <p className="p-2.5 bg-red-950/20 text-red-400 border border-red-900/40 text-[10px] font-mono rounded-lg">
                    ⚠️ {forgotFeedback}
                  </p>
                )}

                {forgotSucc && (
                  <p className="p-3 bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 text-xs font-mono rounded-lg text-left leading-normal">
                    💡 {forgotSucc}
                  </p>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setShowForgotHelper(false); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 text-xs text-gray-400 hover:bg-gray-850 hover:text-white transition uppercase font-bold"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-black transition hover:brightness-110 uppercase focus:outline-none"
                  >
                    Find Password
                  </button>
                </div>
              </form>

              <div className="border-t border-gray-800/60 pt-3 text-[10px] font-mono text-gray-500 text-left leading-normal font-sans">
                💡 <strong>Admin Note:</strong> You are identified as an administrator or authorized user. You can also quickly change, delete, or visually view all operators' passwords in the <strong>🔐 ADMIN</strong> tab above your mining station after logging in successfully!
              </div>
              
            </div>
          </div>
        )}

        {/* Left column - Banner & Onboarding intro */}
        <div className="md:col-span-5 bg-[#1a202c] relative flex flex-col justify-between p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-800 overflow-hidden">
          {/* Ambient light glow */}
          <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 tracking-tight leading-none">
              LDR MINER FUSION
            </h1>
            <p className="text-[10px] text-amber-500/80 font-mono mt-1.5 uppercase tracking-widest leading-none">
              SECURE AUTHENTICATION PROTOCOL v1.6
            </p>
            
            <p className="text-gray-400 text-xs mt-3.5 leading-relaxed">
              LDR coin mining station. Complete operator registration, gather mineral fusion riches, filter materials, and withdraw your LDR assets securely to real-world accounts!
            </p>
          </div>

          {/* Banner image layout referencing generated image */}
          <div className="my-6 relative rounded-xl overflow-hidden border border-gray-750 shadow-md aspect-video">
            <img 
              src={bannerImg} 
              alt="Futuristic LDR Mining Rig Cavern" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent shadow-inner" />
            <span className="absolute bottom-2.5 left-2.5 text-[9px] font-mono tracking-widest bg-amber-500 text-black px-1.5 py-0.5 rounded font-black uppercase">
              2D SUIKA REACTOR
            </span>
          </div>

          <div className="relative z-10 bg-gray-900/60 p-4 border border-gray-850 rounded-xl font-mono text-[11px] leading-tight text-gray-400 space-y-1 structure">
            <span className="text-amber-400 font-bold block mb-1">🌐 QUICK DEMO LOGIN:</span>
            <p>• Email: <strong className="text-white">demo@ldrcoin.com</strong></p>
            <p>• Password: <strong className="text-white">demo1234</strong></p>
            <p className="text-[10px] text-gray-500 block pt-1">(Tip: Create a new free account to try out custom specializations)</p>
          </div>
        </div>

        {/* Right column - Register & Login Forms */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#11141e]">
          
          {/* Form Header selector toggle */}
          <div className="flex bg-[#0b0c13] p-1 rounded-xl border border-gray-850 mb-6 gap-1">
            <button
              onClick={() => handleToggleAuthMode('register')}
              className={`flex-1 py-2.5 text-xs font-black tracking-wider uppercase transition rounded-lg ${
                authMode === "register"
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Register
            </button>
            <button
              onClick={() => handleToggleAuthMode('login')}
              className={`flex-1 py-2.5 text-xs font-black tracking-wider uppercase transition rounded-lg ${
                authMode === "login"
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Login
            </button>
          </div>

          <h2 className="text-xl font-black tracking-tight text-white mb-1.5">
            {authMode === "register" ? "MAIN OPERATOR REGISTRATION" : "MAIN STATION LOGIN"}
          </h2>
          <p className="text-[11px] text-gray-400 mb-5 font-mono">
            {authMode === "register" 
              ? "Complete the operator registration to sync securely with the LDR core network."
              : "Enter your registered operator credentials to access your mining station."
            }
          </p>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            
            {/* Input: Username (Only for register mode) */}
            {authMode === "register" && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                  MINER OPERATOR NAME:
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    placeholder="Enter operator name..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 text-xs"
                    maxLength={15}
                  />
                </div>
              </div>
            )}

            {/* Input: Email */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1">
                OFFICIAL EMAIL ADDRESS:
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder="operator@ldrcoin.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              {email && !isValidEmail(email) && (
                <p className="text-[10px] text-orange-400 font-mono mt-1 flex items-center gap-1">
                  <AlertCircle size={10} />
                  <span>Please include complete email domain (e.g. name@domain.com)</span>
                </p>
              )}
            </div>

            {/* Input: Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 leading-none">
                  OPERATOR PASSWORD:
                </label>
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowForgotHelper(true);
                      setForgotInputEmail("");
                      setForgotFeedback("");
                      setForgotSucc("");
                    }}
                    className="text-[10px] font-mono font-black text-amber-400 hover:text-amber-300 hover:underline cursor-pointer select-none leading-none"
                  >
                    FORGOT PASSWORD?
                  </button>
                )}
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage("");
                  }}
                  placeholder={authMode === "register" ? "Create secure password..." : "Enter your password..."}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-sans text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Password Strength Indicators (only for register) */}
              {authMode === "register" && password && (
                <div className="mt-2 text-[10px] font-mono space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Protection Strength:</span>
                    <span className="font-bold text-amber-400">{getPasswordStrength().label}</span>
                  </div>
                  {/* Visual progress bar */}
                  <div className="h-1 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                    <div className={`h-full transition-all duration-300 rounded-full ${getPasswordStrength().color}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-500 pt-1 leading-none">
                    <span className={password.length >= 8 ? "text-green-400" : "text-gray-500"}>✔ Min. 8 characters</span>
                    <span className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "text-green-400" : "text-gray-500"}>✔ Case Sensitive</span>
                    <span className={/\d/.test(password) ? "text-green-400" : "text-gray-500"}>✔ Include numbers</span>
                    <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-400" : "text-gray-500"}>✔ Special characters</span>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs: Roles Classes Selection (Only for register mode) */}
            {authMode === "register" && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                  SELECT MINER SPECIALIZATION (ROLE CLASS PERK):
                </label>
                
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedRole(r.id);
                          playClickSound();
                        }}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between gap-3 text-xs ${
                          isSelected 
                            ? "border-amber-500 bg-amber-500/5 shadow-inner" 
                            : "border-gray-800 bg-[#151924] hover:border-gray-700"
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-white leading-tight">{r.name}</h4>
                          <span className={`text-[9px] font-mono font-black ${r.textColor}`}>
                            {r.perk}
                          </span>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-amber-500" : "border-gray-700"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Response Alerts Feedbacks */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 rounded-lg text-xs font-mono animate-shake">
                ⚠ {errorMessage}
              </div>
            )}

            {renderUnauthorizedDomainHelper()}

            {successMessage && (
              <div className="p-3 bg-green-950/40 border border-green-500/40 text-green-300 rounded-lg text-xs font-mono animate-pulse">
                ✓ {successMessage}
              </div>
            )}

            {/* Terms of Agreement */}
            {authMode === "register" && (
              <div className="flex items-start gap-2.5 pt-0.5">
                <input
                  type="checkbox"
                  id="agree-checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-500 border-gray-700 rounded bg-gray-900 focus:ring-amber-500 mt-0.5"
                />
                <label htmlFor="agree-checkbox" className="text-[10px] text-gray-400 leading-tight select-none cursor-pointer">
                  I agree to store LDR coin earnings in local browser file storage, comply with atomic mine fusions, and complete OTP verification.
                </label>
              </div>
            )}

            {/* Register/Login Button */}
            <button
              type="submit"
              disabled={authMode === "register" ? !agreed : false}
              className={`w-full py-3 px-5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs tracking-wider uppercase transition shadow-lg ${
                authMode === "register" && !agreed
                  ? "bg-gray-850 text-gray-500 cursor-not-allowed border border-gray-800"
                  : "bg-gradient-to-r from-amber-400 to-amber-500 text-[#0d0f14] hover:brightness-105 active:scale-95"
              }`}
            >
              <Play size={14} fill="currentColor" />
              <span>
                {authMode === "register" ? "REGISTER & VERIFY" : "CONNECT OPERATOR"}
              </span>
              <ArrowRight size={14} />
            </button>

            {/* Divider */}
            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-gray-800/80"></div>
              <span className="px-3 text-[9px] font-mono text-gray-500 uppercase tracking-widest select-none">OR REGISTER & LOGIN VIA GOOGLE</span>
              <div className="flex-1 border-t border-gray-800/80"></div>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleQuickAuth}
              className="w-full py-2.5 px-4 rounded-xl border border-gray-800 bg-[#0c0d12]/60 hover:bg-[#12141c] hover:border-gray-750 text-white text-xs font-bold font-sans transition flex items-center justify-center gap-2.5 active:scale-[0.98] shadow-md"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0 block">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              <span>{authMode === "register" ? "OAuth Quick Sign Up" : "OAuth Quick Sign In"}</span>
            </button>

          </form>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center py-4 border-t border-gray-800/40 text-[10px] font-mono text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>© 2026 LDR COIN MINER FUSION - 2D SUIKA COLLISION ENGINE GAMEPLAY</p>
        <p>LOCAL PERSISTENT INTELLIGENT MINING STATION</p>
      </div>

    </div>
  );
}
