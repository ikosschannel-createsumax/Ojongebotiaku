/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  MinerProfile, 
  MiningRig, 
  Achievement, 
  ORE_DEFINITIONS, 
  INITIAL_RIGS, 
  INITIAL_ACHIEVEMENTS 
} from "./types";
import Registration from "./components/Registration";
import GameCanvas from "./components/GameCanvas";
import InteractiveRig from "./components/InteractiveRig";
import LeaderboardAndQuests from "./components/LeaderboardAndQuests";
import PayoutSystem from "./components/PayoutSystem";
import MarketAnalytics from "./components/MarketAnalytics";
import AdminPanel from "./components/AdminPanel";
import ReferralSystem from "./components/ReferralSystem";
import { setMuteState, getMuteState, playClickSound, playUpgradeSound } from "./utils/audio";
import { syncUserProfileToFirebase } from "./utils/firebase";
import { 
  Volume2, 
  VolumeX, 
  Award, 
  Zap, 
  RotateCw, 
  Power, 
  Skull, 
  Pickaxe, 
  Cpu, 
  Sparkles, 
  BookOpen, 
  AlertCircle,
  Wallet,
  Activity,
  Lock
} from "lucide-react";

export default function App() {
  const [profile, setProfile] = useState<MinerProfile | null>(null);
  const [rigs, setRigs] = useState<MiningRig[]>(INITIAL_RIGS);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [dynamiteCount, setDynamiteCount] = useState<number>(0); // starting tools reset to 0
  const [magnetCount, setMagnetCount] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'merge_game' | 'rigs_automation' | 'stats_shop' | 'payout_system' | 'market_analytics' | 'admin_panel' | 'referral'>('merge_game');
  
  // Admin Panel states
  const [adminQrisMethod, setAdminQrisMethod] = useState<'dynamic' | 'static'>(() => {
    return localStorage.getItem("ldr_admin_qris_method") as 'dynamic' | 'static' || 'dynamic';
  });
  const [adminQrisPayload, setAdminQrisPayload] = useState<string>(() => {
    return localStorage.getItem("ldr_admin_qris_payload") || 
      "00020101021240490011ID.DANA.WWW01189360091531399885810208WARISMAN5204482953033605802ID5908WARISMAN6015Kab. Deli";
  });
  const [adminDanaNo, setAdminDanaNo] = useState<string>(() => {
    return localStorage.getItem("ldr_admin_dana_no") || "083169046085";
  });
  const [adminBcaNo, setAdminBcaNo] = useState<string>(() => {
    return localStorage.getItem("ldr_admin_bca_no") || "1287 4049 0011";
  });
  const [adminMandiriNo, setAdminMandiriNo] = useState<string>(() => {
    return localStorage.getItem("ldr_admin_mandiri_no") || "8897 0011 3600";
  });

  const updateAdminQrisMethod = (val: 'dynamic' | 'static') => {
    setAdminQrisMethod(val);
    localStorage.setItem("ldr_admin_qris_method", val);
  };
  const updateAdminQrisPayload = (val: string) => {
    setAdminQrisPayload(val);
    localStorage.setItem("ldr_admin_qris_payload", val);
  };
  const updateAdminDanaNo = (val: string) => {
    setAdminDanaNo(val);
    localStorage.setItem("ldr_admin_dana_no", val);
  };
  const updateAdminBcaNo = (val: string) => {
    setAdminBcaNo(val);
    localStorage.setItem("ldr_admin_bca_no", val);
  };
  const updateAdminMandiriNo = (val: string) => {
    setAdminMandiriNo(val);
    localStorage.setItem("ldr_admin_mandiri_no", val);
  };

  // Flash notifications for levels up or big achieves
  const [notifMessage, setNotifMessage] = useState<string>("");
  const [notifTrigger, setNotifTrigger] = useState<boolean>(false);

  const getUserKey = (baseKey: string) => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    return activeEmail ? `${baseKey}_${activeEmail}` : baseKey;
  };

  // Load persistent miner data from localStorage on mount
  useEffect(() => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    
    const profileKey = activeEmail ? `ldr_miner_profile_${activeEmail}` : "ldr_miner_profile";
    const rigsKey = activeEmail ? `ldr_miner_rigs_${activeEmail}` : "ldr_miner_rigs";
    const achKey = activeEmail ? `ldr_miner_achievements_${activeEmail}` : "ldr_miner_achievements";
    const toolsKey = activeEmail ? `ldr_miner_tools_${activeEmail}` : "ldr_miner_tools";

    const savedProfile = localStorage.getItem(profileKey) || localStorage.getItem("ldr_miner_profile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Gagal memuat profil penambang:", e);
      }
    }

    const savedRigs = localStorage.getItem(rigsKey) || localStorage.getItem("ldr_miner_rigs");
    if (savedRigs) {
      try {
        setRigs(JSON.parse(savedRigs));
      } catch (e) {
        console.error("Gagal memuat data rig:", e);
      }
    } else {
      setRigs(INITIAL_RIGS);
    }

    const savedAchievements = localStorage.getItem(achKey) || localStorage.getItem("ldr_miner_achievements");
    if (savedAchievements) {
      try {
        const parsed = JSON.parse(savedAchievements) as Achievement[];
        const merged = parsed.map((ach) => {
          const base = INITIAL_ACHIEVEMENTS.find((a) => a.id === ach.id);
          return base ? { ...ach, reward: base.reward } : ach;
        });
        setAchievements(merged);
      } catch (e) {
        console.error("Gagal memuat pencapaian:", e);
      }
    } else {
      setAchievements(INITIAL_ACHIEVEMENTS);
    }

    const savedTools = localStorage.getItem(toolsKey) || localStorage.getItem("ldr_miner_tools");
    if (savedTools) {
      try {
        const parsed = JSON.parse(savedTools);
        setDynamiteCount(typeof parsed.dynamite === "number" ? parsed.dynamite : 0);
        setMagnetCount(typeof parsed.magnet === "number" ? parsed.magnet : 0);
      } catch (e) {}
    } else {
      setDynamiteCount(0); // toko-quest starts with 0 to comply with reset
      setMagnetCount(0);
    }

    // Audio init
    const muted = getMuteState();
    setIsMuted(muted);
  }, []);

  // Centralized Sync and Save Data Manager
  const syncAndSaveData = (
    nextProfile: MinerProfile | null,
    nextRigs: MiningRig[] | null,
    nextAch: Achievement[] | null,
    nextDyn: number | null,
    nextMag: number | null
  ) => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    
    // Fallbacks to current state if null
    const finalProfile = nextProfile || profile;
    const finalRigs = nextRigs || rigs;
    const finalAch = nextAch || achievements;
    const finalDyn = typeof nextDyn === "number" ? nextDyn : dynamiteCount;
    const finalMag = typeof nextMag === "number" ? nextMag : magnetCount;

    if (finalProfile) {
      setProfile(finalProfile);
      localStorage.setItem("ldr_miner_profile", JSON.stringify(finalProfile));
      if (activeEmail) {
        localStorage.setItem(`ldr_miner_profile_${activeEmail}`, JSON.stringify(finalProfile));
      }
    }

    if (finalRigs) {
      setRigs(finalRigs);
      localStorage.setItem("ldr_miner_rigs", JSON.stringify(finalRigs));
      if (activeEmail) {
        localStorage.setItem(`ldr_miner_rigs_${activeEmail}`, JSON.stringify(finalRigs));
      }
    }

    if (finalAch) {
      setAchievements(finalAch);
      localStorage.setItem("ldr_miner_achievements", JSON.stringify(finalAch));
      if (activeEmail) {
        localStorage.setItem(`ldr_miner_achievements_${activeEmail}`, JSON.stringify(finalAch));
      }
    }

    if (typeof finalDyn === "number" || typeof finalMag === "number") {
      if (typeof finalDyn === "number") setDynamiteCount(finalDyn);
      if (typeof finalMag === "number") setMagnetCount(finalMag);
      localStorage.setItem("ldr_miner_tools", JSON.stringify({ dynamite: finalDyn, magnet: finalMag }));
      if (activeEmail) {
        localStorage.setItem(`ldr_miner_tools_${activeEmail}`, JSON.stringify({ dynamite: finalDyn, magnet: finalMag }));
      }
    }

    if (activeEmail && finalProfile) {
      try {
        const savedUsers = localStorage.getItem("ldr_registered_users");
        if (savedUsers) {
          const users = JSON.parse(savedUsers) as any[];
          const userAccount = users.find(u => u.email.toLowerCase() === activeEmail);
          const passwordHash = userAccount?.passwordHash || "demo1234";

          // Update local list
          const updatedUsers = users.map(u => {
            if (u.email.toLowerCase() === activeEmail) {
              return { ...u, profile: finalProfile };
            }
            return u;
          });
          localStorage.setItem("ldr_registered_users", JSON.stringify(updatedUsers));

          // Sync out to Firebase database
          syncUserProfileToFirebase(activeEmail, passwordHash, finalProfile, finalRigs, finalAch, finalDyn, finalMag).catch(err => {
            console.warn("Could not sync state to Firebase:", err);
          });
        }
      } catch (err) {
        console.error("Failed to sync updated data:", err);
      }
    }
  };

  const saveProfileData = (updatedProfile: MinerProfile) => {
    syncAndSaveData(updatedProfile, null, null, null, null);
  };

  // Check if current user is authorized to access the Admin Panel
  const isAdminUser = () => {
    if (!profile) return false;
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    const hasAuthorizedEmail = activeEmail === "kusumaletterformee@gmail.com";
    const hasAuthorizedTag = profile.minerTag?.toLowerCase().trim() === "kusumax#8696";
    return hasAuthorizedEmail || hasAuthorizedTag;
  };

  // Redirect to merge game if they somehow end up in admin panel with no authorization
  useEffect(() => {
    if (activeTab === "admin_panel" && !isAdminUser()) {
      setActiveTab("merge_game");
    }
  }, [activeTab, profile]);

  const handleDeductBalance = (amount: number) => {
    if (!profile) return;
    const nextBalance = parseFloat((profile.ldrBalance - amount).toFixed(3));
    const nextProfile = { ...profile, ldrBalance: Math.max(0, nextBalance) };
    saveProfileData(nextProfile);
  };

  const handleRegistrationComplete = (newProfile: MinerProfile) => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim() || "";
    const emailSuffix = activeEmail ? `_${activeEmail}` : "";

    // Load or initialize user-specific rigs (clean 0 counts)
    const savedRigs = localStorage.getItem(`ldr_miner_rigs${emailSuffix}`);
    let userRigs = INITIAL_RIGS;
    if (savedRigs) {
      try {
        userRigs = JSON.parse(savedRigs);
      } catch (e) {}
    } else {
      userRigs = INITIAL_RIGS.map((r) => ({ ...r, count: 0 }));
    }

    // Load or initialize achievements (quests)
    const savedAchievements = localStorage.getItem(`ldr_miner_achievements${emailSuffix}`);
    let userAchievements = INITIAL_ACHIEVEMENTS;
    if (savedAchievements) {
      try {
        userAchievements = JSON.parse(savedAchievements);
      } catch (e) {}
    } else {
      userAchievements = INITIAL_ACHIEVEMENTS.map((a) => ({ ...a, current: 0, completed: false }));
    }

    // Load or initialize tools (starts at 0)
    const savedTools = localStorage.getItem(`ldr_miner_tools${emailSuffix}`);
    let dynamite = 0;
    let magnet = 0;
    if (savedTools) {
      try {
        const parsed = JSON.parse(savedTools);
        if (typeof parsed.dynamite === "number") dynamite = parsed.dynamite;
        if (typeof parsed.magnet === "number") magnet = parsed.magnet;
      } catch (e) {}
    }

    // Assign to state
    setRigs(userRigs);
    setAchievements(userAchievements);
    setDynamiteCount(dynamite);
    setMagnetCount(magnet);
    setProfile(newProfile);

    // Save user-specific localStorage copies
    localStorage.setItem(`ldr_miner_rigs${emailSuffix}`, JSON.stringify(userRigs));
    localStorage.setItem(`ldr_miner_achievements${emailSuffix}`, JSON.stringify(userAchievements));
    localStorage.setItem(`ldr_miner_tools${emailSuffix}`, JSON.stringify({ dynamite, magnet }));
    localStorage.setItem(`ldr_miner_profile${emailSuffix}`, JSON.stringify(newProfile));

    // Also update generic keys for fallback
    localStorage.setItem("ldr_miner_rigs", JSON.stringify(userRigs));
    localStorage.setItem("ldr_miner_achievements", JSON.stringify(userAchievements));
    localStorage.setItem("ldr_miner_tools", JSON.stringify({ dynamite, magnet }));
    localStorage.setItem("ldr_miner_profile", JSON.stringify(newProfile));

    // Try pulling state from database in non-blocking way to load cloud saves
    if (activeEmail) {
      import("./utils/firebase").then(({ fetchUserProfileFromFirebase }) => {
        fetchUserProfileFromFirebase(activeEmail).then((firebaseUser) => {
          if (firebaseUser) {
            const syncedProfile: MinerProfile = {
              username: firebaseUser.username,
              minerTag: firebaseUser.minerTag,
              avatar: firebaseUser.avatar,
              role: firebaseUser.role,
              level: firebaseUser.level,
              experience: firebaseUser.experience,
              ldrBalance: firebaseUser.ldrBalance,
              rupiahBalance: firebaseUser.rupiahBalance,
              highScore: firebaseUser.highScore,
              registeredAt: firebaseUser.registeredAt,
            };

            let syncedRigs = userRigs;
            if (firebaseUser.rigsJson) {
              try { syncedRigs = JSON.parse(firebaseUser.rigsJson); } catch (e) {}
            }

            let syncedAch = userAchievements;
            if (firebaseUser.achievementsJson) {
              try { syncedAch = JSON.parse(firebaseUser.achievementsJson); } catch (e) {}
            }

            const syncedDyn = typeof firebaseUser.dynamiteCount === "number" ? firebaseUser.dynamiteCount : dynamite;
            const syncedMag = typeof firebaseUser.magnetCount === "number" ? firebaseUser.magnetCount : magnet;

            // Update state
            setRigs(syncedRigs);
            setAchievements(syncedAch);
            setDynamiteCount(syncedDyn);
            setMagnetCount(syncedMag);
            setProfile(syncedProfile);

            // Save to localStorage too
            localStorage.setItem(`ldr_miner_rigs${emailSuffix}`, JSON.stringify(syncedRigs));
            localStorage.setItem(`ldr_miner_achievements${emailSuffix}`, JSON.stringify(syncedAch));
            localStorage.setItem(`ldr_miner_tools${emailSuffix}`, JSON.stringify({ dynamite: syncedDyn, magnet: syncedMag }));
            localStorage.setItem(`ldr_miner_profile${emailSuffix}`, JSON.stringify(syncedProfile));

            localStorage.setItem("ldr_miner_rigs", JSON.stringify(syncedRigs));
            localStorage.setItem("ldr_miner_achievements", JSON.stringify(syncedAch));
            localStorage.setItem("ldr_miner_tools", JSON.stringify({ dynamite: syncedDyn, magnet: syncedMag }));
            localStorage.setItem("ldr_miner_profile", JSON.stringify(syncedProfile));
          }
        }).catch((err) => {
          console.warn("Error loading cloud profile for", activeEmail, err);
        });
      });
    }

    triggerNotification(`Selamat Datang, ${newProfile.username}! Siap menyelam ke Deep Core.`);
  };

  // Helper flash notifier
  const triggerNotification = (message: string) => {
    setNotifMessage(message);
    setNotifTrigger(true);
    setTimeout(() => {
      setNotifTrigger(false);
    }, 4500);
  };

  // Continuous passive yield interval logic (Simulated idle extraction)
  useEffect(() => {
    if (!profile) return;

    const interval = setInterval(() => {
      // Calculate total passive output per second
      const passiveRigs = rigs.filter((r) => r.category === "passive");
      
      let baseLps = passiveRigs.reduce((acc, r) => {
        const multiplier = r.level * 0.5 + 0.5; // level modifications
        return acc + (r.count * r.ldrPerSec * multiplier);
      }, 0);

      // Drill Master Role Class gives +10% passive production boost
      if (profile.role === "driller") {
        baseLps *= 1.10;
      }

      if (baseLps <= 0) return;

      setProfile((prev) => {
        if (!prev) return null;
        const nextBalance = prev.ldrBalance + baseLps;
        const nextExp = prev.experience + (baseLps * 0.15); // passive experience

        // Formula for simple dynamic level calculations
        const calculatedLvl = Math.floor(1 + Math.sqrt(nextExp / 80));
        let updatedLvl = prev.level;
        if (calculatedLvl > prev.level) {
          updatedLvl = calculatedLvl;
          triggerNotification(`🎉 NAIK LEVEL TAMBANG! Anda sekarang Level ${calculatedLvl}!`);
          playUpgradeSound();
        }

        const freshProfile = {
          ...prev,
          ldrBalance: parseFloat(nextBalance.toFixed(3)),
          experience: parseFloat(nextExp.toFixed(3)),
          level: updatedLvl
        };

        // Cache update
        localStorage.setItem(getUserKey("ldr_miner_profile"), JSON.stringify(freshProfile));
        return freshProfile;
      });

      // Update achievements counts for LDR Balance
      setAchievements((prevAch) => {
        const next = prevAch.map((ach) => {
          if (ach.type === "balance" && !ach.completed) {
            const currentBal = profile.ldrBalance;
            return {
              ...ach,
              current: Math.max(ach.current, Math.floor(currentBal))
            };
          }
          return ach;
        });
        localStorage.setItem(getUserKey("ldr_miner_achievements"), JSON.stringify(next));
        return next;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [profile, rigs]);

  // Periodically check Firestore for external balance updates (e.g. approved deposit requests)
  useEffect(() => {
    if (!profile) return;
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    if (!activeEmail) return;

    const interval = setInterval(() => {
      import("./utils/firebase").then(({ fetchUserProfileFromFirebase }) => {
        fetchUserProfileFromFirebase(activeEmail).then((firebaseUser) => {
          if (firebaseUser) {
            setProfile((current) => {
              if (!current) return null;
              if (
                current.rupiahBalance !== firebaseUser.rupiahBalance || 
                current.ldrBalance !== firebaseUser.ldrBalance
              ) {
                const suffix = `_${activeEmail}`;
                const nextProfile = {
                  ...current,
                  rupiahBalance: firebaseUser.rupiahBalance,
                  ldrBalance: firebaseUser.ldrBalance
                };
                
                localStorage.setItem(`ldr_miner_profile${suffix}`, JSON.stringify(nextProfile));
                localStorage.setItem("ldr_miner_profile", JSON.stringify(nextProfile));
                
                triggerNotification(`🔔 Saldo Rupiah terupdate: Rp ${firebaseUser.rupiahBalance.toLocaleString("id-ID")}!`);
                return nextProfile;
              }
              return current;
            });
          }
        }).catch((err) => {
          console.warn("Error in periodic profile check:", err);
        });
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [profile]);

  const handleDeductRupiahBalance = (amount: number) => {
    if (!profile) return;
    const nextRupiah = (profile.rupiahBalance || 0) - amount;
    const nextProfile = { ...profile, rupiahBalance: Math.max(0, nextRupiah) };
    saveProfileData(nextProfile);
  };

  const handleDropOre = (): boolean => {
    if (!profile) return false;
    const currentRp = profile.rupiahBalance || 0;
    if (currentRp < 80) {
      triggerNotification("⚠️ Saldo tidak cukup! Biaya gas menjatuhkan ore adalah Rp 80. Silakan isi saldo di menu PAYOUT & CAIR.");
      return false;
    }
    const nextProfile = { ...profile, rupiahBalance: currentRp - 80 };
    saveProfileData(nextProfile);
    return true;
  };

  const handleAddBalances = (ldrDelta: number, rupiahDelta: number) => {
    if (!profile) return;
    const nextLdr = Math.max(0, profile.ldrBalance + ldrDelta);
    const nextRupiah = Math.max(0, (profile.rupiahBalance || 0) + rupiahDelta);
    const nextProfile = {
      ...profile,
      ldrBalance: parseFloat(nextLdr.toFixed(2)),
      rupiahBalance: nextRupiah
    };
    saveProfileData(nextProfile);
  };

  // Handle active merge items callbacks (Score triggers, combos, levels)
  const handleActiveMerge = (pointsAdded: number, coinsAdded: number, maxMergedLevel: number) => {
    if (!profile) return;

    // Gem Broker class yields +15% more active coins per fusi
    let actualCoins = coinsAdded;
    if (profile.role === "broker") {
      actualCoins = parseFloat((coinsAdded * 1.15).toFixed(2));
    }

    const nextScore = profile.highScore + pointsAdded; // session merges
    const updatedScore = Math.max(profile.highScore, nextScore);

    const nextBalance = profile.ldrBalance + actualCoins;
    const nextExp = profile.experience + (pointsAdded * 0.85); // gaming awards way more EXP!

    // Level up check
    const calculatedLvl = Math.floor(1 + Math.sqrt(nextExp / 80));
    let updatedLvl = profile.level;
    if (calculatedLvl > profile.level) {
      updatedLvl = calculatedLvl;
      triggerNotification(`🎉 NAIK LEVEL PENAMBANG! Sekarang Level ${calculatedLvl}!`);
      playUpgradeSound();
    }

    // BASE FUSION DROP REWARD is now 0 for levels < 7 because levels 0-6 are removed
    let fusiRupiahAdd = 0;
    let extraBonusMsg = "";

    // ADD EXTRA LEVEL SPECIFIC REWARDS (Only levels >= 7 have rewards as levels 0-6 are removed):
    // 7. Rp 600
    // 8. Rp 2.500
    // 9. Rp 5.000
    // 10. Rp 10.000
    if (maxMergedLevel === 7) {
      fusiRupiahAdd = 600;
      extraBonusMsg = "🔵 Fusi Permata Safir (Lv.7)!";
    } else if (maxMergedLevel === 8) {
      fusiRupiahAdd = 2500;
      extraBonusMsg = "🔴 Fusi Permata Delima (Lv.8)!";
    } else if (maxMergedLevel === 9) {
      fusiRupiahAdd = 5000;
      extraBonusMsg = "🟣 Fusi Kristal Kecubung (Lv.9)!";
    } else if (maxMergedLevel === 10) {
      fusiRupiahAdd = 10000;
      extraBonusMsg = "👑 Fusi KOIN EMAS LDR (Lv.10)!";
    }

    const nextRupiahBalance = (profile.rupiahBalance || 0) + fusiRupiahAdd;

    const updatedProfile: MinerProfile = {
      ...profile,
      ldrBalance: parseFloat(nextBalance.toFixed(2)),
      rupiahBalance: nextRupiahBalance,
      experience: parseFloat(nextExp.toFixed(2)),
      level: updatedLvl,
      highScore: updatedScore
    };

    saveProfileData(updatedProfile);

    // Toast alerts with specific rewards details
    if (fusiRupiahAdd > 0) {
      triggerNotification(`✨ ${extraBonusMsg} Bonus Hadiah +Rp ${fusiRupiahAdd.toLocaleString("id-ID")} ditambahkan.`);
      playUpgradeSound();
    } else {
      triggerNotification(`⛏️ Fusi Ore Berhasil!`);
    }

    // Update Achievement progress
    setAchievements((prevAch) => {
      const next = prevAch.map((ach) => {
        if (ach.completed) return ach;

        let cur = ach.current;
        if (ach.type === "score") {
          cur = Math.max(ach.current, nextScore);
        } else if (ach.type === "balance") {
          cur = Math.max(ach.current, Math.floor(nextBalance));
        } else if (ach.type === "merge_level" && ach.param === maxMergedLevel) {
          cur = ach.current + 1;
        }

        return {
          ...ach,
          current: cur
        };
      });
      localStorage.setItem(getUserKey("ldr_miner_achievements"), JSON.stringify(next));
      return next;
    });
  };

  // Upgrades purchase triggers
  const handleBuyPassiveRig = (rigId: string) => {
    const found = rigs.find((r) => r.id === rigId);
    if (!found || !profile) return;

    if (profile.ldrBalance < found.cost) {
      triggerNotification("⚠️ Saldo Koin LDR tidak mencukupi untuk membeli Rig ini.");
      return;
    }

    // Deduct coins
    const nextBalance = parseFloat((profile.ldrBalance - found.cost).toFixed(2));
    const nextProfile = { ...profile, ldrBalance: nextBalance };

    // Increment count
    const nextRigs = rigs.map((r) => r.id === rigId ? { ...r, count: r.count + 1, cost: Math.floor(r.cost * 1.35) } : r);

    // Update quest counts
    const totalRigUnits = nextRigs.filter(r => r.category === "passive").reduce((acc, r) => acc + r.count, 0);
    const nextAch = achievements.map((ach) => {
      if (ach.type === "rig_count" && !ach.completed) {
        return { ...ach, current: totalRigUnits };
      }
      return ach;
    });

    // Atomic Sync
    syncAndSaveData(nextProfile, nextRigs, nextAch, null, null);
    triggerNotification(`🔩 Rig Otomatis Berhasil Terpasang: ${found.localName}!`);
  };

  // Upgrades manual gear level triggers
  const handleUpgradeRig = (rigId: string) => {
    if (!profile) return;

    // Handle manual clicker multi-tap payout hook
    if (rigId === "manual_tap_payout") {
      const pickaxeLevel = rigs.find(r => r.id === "pickaxe")?.level || 1;
      const payoutVal = Number((0.001 * pickaxeLevel).toFixed(4));
      const nextBal = parseFloat((profile.ldrBalance + payoutVal).toFixed(4));
      const expBoost = parseFloat((profile.experience + 1).toFixed(2));
      saveProfileData({ ...profile, ldrBalance: nextBal, experience: expBoost });
      return;
    }

    const found = rigs.find((r) => r.id === rigId);
    if (!found) return;

    const actualCost = found.cost * found.level;
    if (profile.ldrBalance < actualCost) {
      triggerNotification("⚠️ Saldo Koin LDR tidak mencukupi untuk modul Upgrade.");
      return;
    }

    // Deduct coins
    const nextBalance = parseFloat((profile.ldrBalance - actualCost).toFixed(2));
    const nextProfile = { ...profile, ldrBalance: nextBalance };

    // Level up gear
    const nextRigs = rigs.map((r) => r.id === rigId ? { ...r, level: r.level + 1 } : r);

    // Atomic Sync
    syncAndSaveData(nextProfile, nextRigs, null, null, null);
    triggerNotification(`📈 Transmisi Upgrade Sukses! ${found.localName} sekarang Level ${found.level + 1}!`);
  };

  // Claim quest gains
  const handleClaimQuestRewards = (achId: string, rewardValue: number) => {
    if (!profile) return;

    const updatedAchievements = achievements.map((ach) => 
      ach.id === achId ? { ...ach, completed: true } : ach
    );

    // Award rewards balance + random companion tool bonus!
    const nextBalance = parseFloat((profile.ldrBalance + rewardValue).toFixed(2));
    const nextProfile = { ...profile, ldrBalance: nextBalance };

    // Gift random drop tools!
    const randomRoll = Math.random();
    let nextDyn = dynamiteCount;
    let nextMag = magnetCount;

    if (randomRoll < 0.5) {
      nextDyn = dynamiteCount + 1;
      triggerNotification(`🎁 Klaim Berhasil! Dapatkan 🪙+${rewardValue} LDR dan bonus +1 Dinamit Tambah.`);
    } else {
      nextMag = magnetCount + 1;
      triggerNotification(`🎁 Klaim Berhasil! Dapatkan 🪙+${rewardValue} LDR dan bonus +1 Magnet Fusi.`);
    }

    // Atomic Sync
    syncAndSaveData(nextProfile, null, updatedAchievements, nextDyn, nextMag);
  };

  const handleUseDynamite = (): boolean => {
    if (dynamiteCount <= 0) return false;
    const nextDyn = dynamiteCount - 1;
    syncAndSaveData(null, null, null, nextDyn, magnetCount);
    return true;
  };

  const handleUseMagnet = (): boolean => {
    if (magnetCount <= 0) return false;
    const nextMag = magnetCount - 1;
    syncAndSaveData(null, null, null, dynamiteCount, nextMag);
    return true;
  };

  const handleBuyShopTool = (toolId: 'dynamite' | 'magnet', cost: number) => {
    if (!profile || profile.ldrBalance < cost) return;

    const nextBal = parseFloat((profile.ldrBalance - cost).toFixed(2));
    const nextProfile = { ...profile, ldrBalance: nextBal };

    let nextDyn = dynamiteCount;
    let nextMag = magnetCount;

    if (toolId === "dynamite") {
      nextDyn = dynamiteCount + 1;
      triggerNotification("🧨 Membeli 1 unit Dinamit Tambah.");
    } else {
      nextMag = magnetCount + 1;
      triggerNotification("🧲 Membeli 1 unit Magnet Fusi.");
    }

    // Atomic Sync
    syncAndSaveData(nextProfile, null, null, nextDyn, nextMag);
  };

  // Reset and clear profile accounts
  const handleClearDataAndReset = () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus seluruh data profil dan menghentikan penambangan?")) return;
    playClickSound();

    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    if (activeEmail) {
      const emailSuffix = `_${activeEmail}`;
      localStorage.removeItem(`ldr_miner_profile${emailSuffix}`);
      localStorage.removeItem(`ldr_miner_rigs${emailSuffix}`);
      localStorage.removeItem(`ldr_miner_achievements${emailSuffix}`);
      localStorage.removeItem(`ldr_miner_tools${emailSuffix}`);
    }

    localStorage.removeItem("ldr_active_email");
    localStorage.removeItem("ldr_miner_profile");
    localStorage.removeItem("ldr_miner_rigs");
    localStorage.removeItem("ldr_miner_achievements");
    localStorage.removeItem("ldr_miner_tools");
    setProfile(null);
    setRigs(INITIAL_RIGS);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setDynamiteCount(0); // reset should restore default tool size of 0
    setMagnetCount(0);
    setActiveTab("merge_game");
  };

  const handleToggleMuted = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    setMuteState(nextMute);
  };

  // If no user is registered, display Registration onboarding page
  if (!profile) {
    return (
      <Registration 
        onComplete={handleRegistrationComplete} 
        isMuted={isMuted} 
        onToggleMute={handleToggleMuted} 
      />
    );
  }

  // Calculate current active experiences details
  const hasClaimableAchievement = achievements.some(ach => !ach.completed && ach.current >= ach.target);
  const currentLvlExpBase = (profile.level - 1) * (profile.level - 1) * 80;
  const targetLvlExpNext = profile.level * profile.level * 80;
  const expProgressPct = Math.min(100, Math.floor(
    ((profile.experience - currentLvlExpBase) / ((targetLvlExpNext - currentLvlExpBase) || 1)) * 100
  ));

  return (
    <div className="min-h-screen bg-[#0d0f14] text-gray-100 font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Dynamic top bar notifier */}
      {notifTrigger && (
        <div className="fixed top-24 inset-x-0 mx-auto max-w-sm bg-gradient-to-r from-amber-500 to-orange-500 text-[#07090d] font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl z-50 text-center animate-bounce flex items-center justify-center gap-1.5 border border-amber-400 font-mono">
          <Sparkles size={14} className="animate-spin" />
          <span>{notifMessage}</span>
        </div>
      )}
 
      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 pt-14 pb-4 md:pt-6 md:pb-6 space-y-4">
        
        {/* Upper Dashboard Terminal Header (Cyberpunk-styled) */}
        <header className="bg-[#141822] border border-gray-800 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
          {/* Top orange gradient boundary */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400" />
          
          <div className="flex items-center gap-3.5">
            {/* Robo profile avatar */}
            <div className="relative shrink-0">
              <img 
                src={profile.avatar} 
                alt={profile.username} 
                className="w-14 h-14 rounded-xl bg-gray-900 border-2 border-amber-500 pointer-events-none p-1 shadow-md"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-[#0d0f14] text-[10px] font-bold font-mono p-0.5 px-1.5 rounded border border-[#141822] shadow">
                Lv.{profile.level}
              </span>
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-lg leading-tight uppercase tracking-tight">
                  {profile.username}
                </span>
                <span className="text-[10px] font-mono text-gray-500 bg-[#0d0f14] p-0.5 px-1.5 rounded border border-gray-850">
                  {profile.minerTag}
                </span>
              </div>
              <p className="text-[11px] font-mono text-amber-500/80 mt-1 uppercase tracking-wide">
                Spesialisasi: {
                  profile.role === 'driller' ? "Drill Master (+10% Rig Yield)" :
                  profile.role === 'geologist' ? "Geologist (Mulai dgn Sifter)" : "Gem Broker (+15% Active Coins)"
                }
              </p>

              {/* EXP progress bar */}
              <div className="mt-2.5 flex items-center gap-2">
                <div className="w-28 h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-800 shrink-0">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${expProgressPct}%` }} />
                </div>
                <span className="text-[9px] text-gray-500 font-mono">
                  EXP PROGRESS: {expProgressPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Central LDR Coin Balances counter */}
          <div className="bg-[#0b0c13] border border-gray-850 p-3 px-4 rounded-xl flex items-center justify-between md:justify-center gap-6">
            <div className="text-left">
              <span className="text-[9px] font-mono text-gray-500 block uppercase tracking-wider">SALDO KEBANGGAAN</span>
              <div className="text-xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500 flex items-center gap-1">
                <span>🪙</span>
                <span>{profile.ldrBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} LDR</span>
              </div>
            </div>

            <div className="h-9 w-px bg-gray-800" />

            <div className="text-left">
              <span className="text-[9px] font-mono text-gray-500 block uppercase tracking-wider">SALDO ASSET (RP)</span>
              <div className="text-xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500 flex items-center gap-1">
                <span>💸</span>
                <span>Rp {(profile.rupiahBalance || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>
            
            <div className="h-9 w-px bg-gray-800" />

            <div className="text-left">
              <span className="text-[9px] font-mono text-gray-500 block uppercase tracking-wider">KONDISI YIELD RIGS</span>
              <span className="text-sm font-bold font-mono text-teal-400 mt-1 block">
                +{(rigs.filter(r => r.category === "passive").reduce((acc, r) => acc + r.count * r.ldrPerSec * (r.level * 0.5 + 0.5), 0) * (profile.role === "driller" ? 1.10 : 1.0)).toFixed(1)}/s
              </span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => { playClickSound(); handleToggleMuted(); }}
              className="p-3 rounded-xl bg-[#1d2334] border border-gray-750 text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition shadow"
              title={isMuted ? "Aktifkan suara" : "Bisukan suara"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <button 
              onClick={handleClearDataAndReset}
              className="p-3 rounded-xl bg-red-950/15 border border-red-900/30 text-rose-500 hover:bg-red-950/40 hover:border-red-900 transition shadow flex items-center gap-2 text-xs font-mono font-bold"
              title="Reset data penambang"
            >
              <Power size={14} />
              <span className="hidden md:inline">STOP PROFIL</span>
            </button>
          </div>

        </header>

        {/* Navigation Tabs (Cyberpunk Button Rails) */}
        <nav className="flex flex-wrap bg-[#141822] border border-gray-850 rounded-2xl p-1.5 gap-2 select-none shadow">
          <button
            onClick={() => { playClickSound(); setActiveTab("merge_game"); }}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 ${
              activeTab === "merge_game"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold"
                : "text-gray-400 hover:bg-[#1a202c] hover:text-gray-200"
            }`}
          >
            <Pickaxe size={16} />
            <span>🌌 Fusi Tambang</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab("rigs_automation"); }}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 ${
              activeTab === "rigs_automation"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold"
                : "text-gray-400 hover:bg-[#1a202c] hover:text-gray-200"
            }`}
          >
            <Cpu size={16} />
            <span>🏭 RIG & KLIKER</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab("stats_shop"); }}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 relative ${
              activeTab === "stats_shop"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold"
                : "text-gray-400 hover:bg-[#1a202c] hover:text-gray-200"
            }`}
          >
            <Award size={16} />
            <span>🛒 TOKO & QUEST</span>
            {hasClaimableAchievement && (
              <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab("payout_system"); }}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 ${
              activeTab === "payout_system"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold"
                : "text-gray-400 hover:bg-[#1a202c] hover:text-gray-200"
            }`}
          >
            <Wallet size={16} />
            <span>💸 PAYOUT & CAIR</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab("market_analytics"); }}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 ${
              activeTab === "market_analytics"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold"
                : "text-gray-400 hover:bg-[#1a202c] hover:text-gray-200"
            }`}
          >
            <Activity size={16} />
            <span>📈 ANALISIS PASAR</span>
          </button>

          <button
            onClick={() => { playClickSound(); setActiveTab("referral"); }}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 ${
              activeTab === "referral"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md font-bold"
                : "text-gray-400 hover:bg-[#1a202c] hover:text-gray-200"
            }`}
          >
            <Sparkles size={16} className="text-amber-400" />
            <span>🔗 REFERRAL</span>
          </button>

          {isAdminUser() && (
            <button
              onClick={() => { playClickSound(); setActiveTab("admin_panel"); }}
              className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 ${
                activeTab === "admin_panel"
                  ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md font-bold border border-amber-500"
                  : "text-red-400 hover:bg-red-950/20 hover:text-rose-300"
              }`}
            >
              <Lock size={15} />
              <span>🔐 PANEL ADMIN</span>
            </button>
          )}
        </nav>

        {/* Display Screen tab components */}
        <main className="transition-all duration-300">
          {activeTab === "merge_game" && (
            <GameCanvas 
              onMerge={handleActiveMerge}
              // Active multiplier based on pickaxe level gear
              coinsMultiplier={((rigs.find(r => r.id === "pickaxe")?.level || 1) * 0.15 + 0.85)}
              dynamiteCount={dynamiteCount}
              magnetCount={magnetCount}
              useDynamite={handleUseDynamite}
              useMagnet={handleUseMagnet}
              highScore={profile.highScore}
              onGameOver={(score) => triggerNotification(`Sektor Runtuh! Sesi permainan ditutup pada ${score} Pts.`)}
              isMuted={isMuted}
              onToggleMute={handleToggleMuted}
              onDrop={handleDropOre}
            />
          )}

          {activeTab === "rigs_automation" && (
            <InteractiveRig 
              rigs={rigs}
              ldrBalance={profile.ldrBalance}
              onBuyRig={handleBuyPassiveRig}
              onUpgradeRig={handleUpgradeRig}
            />
          )}

          {activeTab === "stats_shop" && (
            <LeaderboardAndQuests 
              profile={profile}
              achievements={achievements}
              onClaimAchievement={handleClaimQuestRewards}
              onBuyTool={handleBuyShopTool}
              dynamiteCount={dynamiteCount}
              magnetCount={magnetCount}
              onAddBalances={handleAddBalances}
              triggerNotification={triggerNotification}
            />
          )}

          {activeTab === "payout_system" && (
            <PayoutSystem 
              profile={profile}
              deductBalance={handleDeductBalance}
              deductRupiahBalance={handleDeductRupiahBalance}
              onAddBalances={handleAddBalances}
              triggerNotification={triggerNotification}
              adminQrisMethod={adminQrisMethod}
              adminQrisPayload={adminQrisPayload}
              adminDanaNo={adminDanaNo}
              adminBcaNo={adminBcaNo}
              adminMandiriNo={adminMandiriNo}
              isAdmin={isAdminUser()}
            />
          )}

          {activeTab === "market_analytics" && (
            <MarketAnalytics />
          )}

          {profile && activeTab === "referral" && (
            <ReferralSystem 
              profile={profile}
              onAddBalances={handleAddBalances}
              triggerNotification={triggerNotification}
            />
          )}

          {isAdminUser() && activeTab === "admin_panel" && (
            <AdminPanel 
              adminQrisMethod={adminQrisMethod}
              setAdminQrisMethod={updateAdminQrisMethod}
              adminQrisPayload={adminQrisPayload}
              setAdminQrisPayload={updateAdminQrisPayload}
              adminDanaNo={adminDanaNo}
              setAdminDanaNo={updateAdminDanaNo}
              adminBcaNo={adminBcaNo}
              setAdminBcaNo={updateAdminBcaNo}
              adminMandiriNo={adminMandiriNo}
              setAdminMandiriNo={updateAdminMandiriNo}
              triggerNotification={triggerNotification}
            />
          )}
        </main>

        {/* App Footer */}
        <footer className="text-center py-6 border-t border-gray-800/25 text-[10px] font-mono text-gray-600 flex flex-col md:flex-row justify-between items-center gap-2">
          <p>© 2026 LDR COIN MINER FUSION - KEKINGPINAN GALAKTIS DIGITAL INDONESIA</p>
          <div className="flex items-center gap-3.5">
            <span className="text-teal-500">DEEP CORE STATUS: 100% OPERATIONAL</span>
            <span className="text-gray-600">|</span>
            <span className="text-amber-400">COINS RATE: REALTIME PASSIF AUTO-SYNC</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
