/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Achievement, MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { Award, Shield, Search, CheckCircle, Gift, Bomb, Zap, TrendingUp, Sparkles } from "lucide-react";

interface LeaderboardAndQuestsProps {
  profile: MinerProfile;
  achievements: Achievement[];
  onClaimAchievement: (id: string, reward: number) => void;
  onBuyTool: (toolId: 'dynamite' | 'magnet', cost: number) => void;
  dynamiteCount: number;
  magnetCount: number;
  onAddBalances: (ldrDelta: number, rupiahDelta: number) => void;
  triggerNotification?: (message: string) => void;
}

interface Competitor {
  rank: number;
  username: string;
  minerTag: string;
  avatar: string;
  role: string;
  score: number;
  ldrBalance: number;
}

export default function LeaderboardAndQuests({
  profile,
  achievements,
  onClaimAchievement,
  onBuyTool,
  dynamiteCount,
  magnetCount,
  onAddBalances,
  triggerNotification
}: LeaderboardAndQuestsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'quests' | 'shop'>('leaderboard');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recentGains, setRecentGains] = useState<Record<string, { score: number; coins: number; expiry: number }>>({});

  // Social media task states
  const [tgChannelClaimed, setTgChannelClaimed] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_channel_claimed_${profile.minerTag}` : "ldr_social_channel_claimed";
    return localStorage.getItem(key) === "true";
  });
  const [tgGroupClaimed, setTgGroupClaimed] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_group_claimed_${profile.minerTag}` : "ldr_social_group_claimed";
    return localStorage.getItem(key) === "true";
  });
  const [tgChannelClicked, setTgChannelClicked] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_channel_clicked_${profile.minerTag}` : "ldr_social_channel_clicked";
    return localStorage.getItem(key) === "true";
  });
  const [tgGroupClicked, setTgGroupClicked] = useState<boolean>(() => {
    const key = profile.minerTag ? `ldr_social_group_clicked_${profile.minerTag}` : "ldr_social_group_clicked";
    return localStorage.getItem(key) === "true";
  });

  const handleClaimChannelReward = () => {
    if (tgChannelClaimed) return;
    playUpgradeSound();
    onAddBalances(0, 5000);
    setTgChannelClaimed(true);
    const key = profile.minerTag ? `ldr_social_channel_claimed_${profile.minerTag}` : "ldr_social_channel_claimed";
    localStorage.setItem(key, "true");
    if (triggerNotification) {
      triggerNotification("🎉 Successfully claimed Social Media Join reward of Rp 5,000!");
    }
  };

  const handleClaimGroupReward = () => {
    if (tgGroupClaimed) return;
    playUpgradeSound();
    onAddBalances(0, 1000);
    setTgGroupClaimed(true);
    const key = profile.minerTag ? `ldr_social_group_claimed_${profile.minerTag}` : "ldr_social_group_claimed";
    localStorage.setItem(key, "true");
    if (triggerNotification) {
      triggerNotification("🎉 Successfully claimed Network Building reward of Rp 1,000!");
    }
  };

  // Cost configs matching actions
  const DYNAMITE_COST = 12;
  const MAGNET_COST = 18;

  // Generate rival competitor profiles and update their scores dynamically over time
  useEffect(() => {
    const defaultCompetitors: Competitor[] = [
      { rank: 1, username: "Sultan_Kaltim", minerTag: "sultan#8812", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sultan", role: "driller", score: 18500, ldrBalance: 12450 },
      { rank: 2, username: "CryptoDrill", minerTag: "cryptodrill#2291", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cryptodrill", role: "broker", score: 12100, ldrBalance: 6120 },
      { rank: 3, username: "ZekeXMiner", minerTag: "zekex#4492", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=zekex", role: "geologist", score: 9800, ldrBalance: 3220 },
      { rank: 4, username: "NusaCore_Master", minerTag: "nusacore#5561", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=nusa", role: "driller", score: 7150, ldrBalance: 1180 },
      { rank: 5, username: "IdMiner_Max", minerTag: "idminer#9902", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=idminermax", role: "broker", score: 4300, ldrBalance: 980 },
      { rank: 6, username: "BorSakti", minerTag: "borsakti#1032", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=borsakti", role: "geologist", score: 2800, ldrBalance: 450 },
      { rank: 7, username: "GemLuster", minerTag: "gemluster#7705", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=gemluster", role: "broker", score: 1200, ldrBalance: 180 }
    ];

    // Load persisted leaderboard data
    let currentComps = defaultCompetitors;
    const cached = localStorage.getItem("ldr_leaderboard_competitors");
    if (cached) {
      try {
        currentComps = JSON.parse(cached);
      } catch (e) {
        currentComps = defaultCompetitors;
      }
    }

    // Daily offline progression increment calculation
    const lastUpdateStr = localStorage.getItem("ldr_leaderboard_last_update");
    const nowTime = Date.now();
    
    if (lastUpdateStr) {
      const lastUpdate = parseInt(lastUpdateStr, 10);
      const elapsedMs = nowTime - lastUpdate;
      // Define a "day" as elapsed fraction or hours. 
      // Add realistic offline progression based on days passed (min 0 to prevent issues)
      const elapsedDays = Math.max(0, elapsedMs / (24 * 60 * 60 * 1000));
      
      if (elapsedDays > 0.01) { // Apply progression even if user was away for more than ~15 mins
        currentComps = currentComps.map((comp) => {
          // Proportionate mock values per day depending on role/rank tier
          const multiplier = comp.rank === 1 ? 2.0 : comp.rank <= 3 ? 1.5 : 1.0;
          const scorePerDay = (Math.floor(Math.random() * 800) + 400) * multiplier;
          const coinsPerDay = (Math.floor(Math.random() * 50) + 20) * multiplier;

          const addedScore = Math.floor(scorePerDay * elapsedDays);
          const addedCoin = Math.floor(coinsPerDay * elapsedDays);

          return {
            ...comp,
            score: comp.score + addedScore,
            ldrBalance: comp.ldrBalance + addedCoin
          };
        });
      }
    }

    setCompetitors(currentComps);
    localStorage.setItem("ldr_leaderboard_competitors", JSON.stringify(currentComps));
    localStorage.setItem("ldr_leaderboard_last_update", nowTime.toString());

    // Dynamic timer ticker to increase competitors score simulating active online miners
    const interval = setInterval(() => {
      setCompetitors((prev) => {
        const updated = prev.map((comp) => {
          // 45% chance of competitor gaining points/coins
          if (Math.random() < 0.45) {
            const addedScore = Math.floor(Math.random() * 120) + 20;
            const addedCoin = Math.floor(Math.random() * 8) + 2;

            // Trigger visual gain toast for this specific competitor tag
            setRecentGains((prevGains) => ({
              ...prevGains,
              [comp.minerTag]: {
                score: addedScore,
                coins: addedCoin,
                expiry: Date.now() + 2500
              }
            }));

            return {
              ...comp,
              score: comp.score + addedScore,
              ldrBalance: comp.ldrBalance + addedCoin
            };
          }
          return comp;
        });

        localStorage.setItem("ldr_leaderboard_competitors", JSON.stringify(updated));
        localStorage.setItem("ldr_leaderboard_last_update", Date.now().toString());
        return updated;
      });
    }, 5000); // Trigger every 5 seconds for visual and lively updating experience!

    // Clear expired gains
    const cleanInterval = setInterval(() => {
      setRecentGains((prev) => {
        const next: Record<string, any> = {};
        let updated = false;
        const now = Date.now();
        Object.keys(prev).forEach((k) => {
          if (prev[k].expiry > now) {
            next[k] = prev[k];
          } else {
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanInterval);
    };
  }, []);

  // Merge the user profile into the ranks list and sort them dynamically!
  const getLeaderboardRanks = (): Competitor[] => {
    const userCompetitor: Competitor = {
      rank: 0, // calculated later
      username: `${profile.username} (You)`,
      minerTag: profile.minerTag,
      avatar: profile.avatar,
      role: profile.role,
      score: profile.highScore,
      ldrBalance: Math.floor(profile.ldrBalance)
    };

    const combined = [...competitors, userCompetitor];
    // Sort descending by highest score
    combined.sort((a, b) => b.score - a.score);

    // Re-assign ranks
    return combined.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  };

  const currentRankedList = getLeaderboardRanks();
  const userRankPosition = currentRankedList.findIndex(c => c.minerTag === profile.minerTag) + 1;

  const handlePurchaseTool = (toolId: 'dynamite' | 'magnet', cost: number) => {
    if (profile.ldrBalance < cost) return;
    playClickSound();
    onBuyTool(toolId, cost);
  };

  return (
    <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 max-w-5xl mx-auto font-sans">
      
      {/* Sub tabs navigation */}
      <div className="flex border-b border-gray-800 mb-5">
        <button
          onClick={() => { playClickSound(); setActiveSubTab('leaderboard'); }}
          className={`pb-3 px-4 text-sm font-bold tracking-tight transition border-b-2 ${
            activeSubTab === 'leaderboard'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🏆 LIVE LEADERBOARD
        </button>
        <button
          onClick={() => { playClickSound(); setActiveSubTab('quests'); }}
          className={`pb-3 px-4 text-sm font-bold tracking-tight transition border-b-2 ${
            activeSubTab === 'quests'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🎁 CLAIMS & ACHIEVEMENTS
        </button>
        <button
          onClick={() => { playClickSound(); setActiveSubTab('shop'); }}
          className={`pb-3 px-4 text-sm font-bold tracking-tight transition border-b-2 ${
            activeSubTab === 'shop'
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🛒 EMERGENCY GEAR SHOP
        </button>
      </div>

      {/* RENDER TAB CONTENTS */}

      {/* 1. Leaderboard panel */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-amber-500/5 p-4 border border-amber-500/25 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <Award size={20} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-mono text-gray-400 uppercase tracking-wide">YOUR INSTANT RANK STATUS:</h4>
                <div className="text-sm font-bold text-white mt-0.5">
                  Ranked <span className="text-amber-400">#{userRankPosition} globally</span> with a High Score of {profile.highScore.toLocaleString()} Pts!
                </div>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 font-mono hidden md:inline">UPDATES: LIVE DATA SYNC</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] font-mono text-gray-500 uppercase">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Miner</th>
                  <th className="py-2.5 px-3">Specialization</th>
                  <th className="py-2.5 px-3 text-right">High Score</th>
                  <th className="py-2.5 px-3 text-right">Estimated Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {currentRankedList.map((item) => {
                  const isUser = item.minerTag === profile.minerTag;
                  return (
                    <tr 
                      key={item.minerTag}
                      className={`hover:bg-gray-800/25 transition ${
                        isUser ? "bg-amber-500/5 text-amber-300 font-semibold border-y border-amber-500/20" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold leading-none ${
                          item.rank === 1 ? "bg-yellow-500 text-black px-1.5" :
                          item.rank === 2 ? "bg-gray-400 text-black px-1.5" :
                          item.rank === 3 ? "bg-amber-600 text-black px-1.5" : "text-gray-500"
                        }`}>
                          #{item.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={item.avatar} 
                            alt={item.username} 
                            className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 pointer-events-none" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className={`block truncate ${isUser ? "text-amber-400 font-bold" : "text-white"}`}>
                              {item.username}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              {item.minerTag}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-mono uppercase bg-gray-900 border border-gray-800 p-0.5 px-1.5 rounded text-gray-400">
                          {item.role === 'driller' ? "Drill Master" : item.role === 'geologist' ? "Geologist" : "Gem Broker"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-gray-200">
                        <div className="flex flex-col items-end justify-center min-h-[36px]">
                          <span className="transition-all duration-300">{item.score.toLocaleString()} Pts</span>
                          {recentGains[item.minerTag] && (
                            <span className="text-[10px] text-emerald-400 font-bold animate-bounce block shrink-0 select-none">
                              +{recentGains[item.minerTag].score} Pts
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-500 font-semibold">
                        <div className="flex flex-col items-end justify-center min-h-[36px]">
                          <span className="transition-all duration-300">🪙 {item.ldrBalance.toLocaleString()} LDR</span>
                          {recentGains[item.minerTag] && (
                            <span className="text-[10px] text-amber-300 font-bold animate-pulse block shrink-0 select-none">
                              +{recentGains[item.minerTag].coins} LDR
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Quests / Achievements claim panel */}
      {activeSubTab === 'quests' && (
        <div className="space-y-4">
          <div className="text-left mb-2">
            <h4 className="text-sm font-bold text-white">Daily Quests & Mining Achievements</h4>
            <p className="text-xs text-gray-400">Fulfill the mineral targets below to claim additional LDR coin subsidies from the central headquarters.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {achievements.map((ach) => {
              // Calculate percent progress
              const progressPct = Math.min(100, Math.floor((ach.current / ach.target) * 100));
              const isFinished = ach.current >= ach.target;

              return (
                <div 
                  key={ach.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    ach.completed 
                      ? "border-gray-800 bg-[#0d0f14]' bg-opacity-40" 
                      : isFinished 
                        ? "border-green-500 bg-green-500/5 animate-pulse" 
                        : "border-gray-800 bg-[#161a29]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <h4 className={`text-sm font-bold ${ach.completed ? "text-gray-500 line-through" : "text-white"}`}>
                        {ach.title}
                      </h4>
                      <p className="text-xs text-gray-450 mt-1 leading-snug">
                        {ach.description}
                      </p>
                    </div>
                    {ach.completed ? (
                      <span className="p-1 rounded-full bg-gray-900 border border-gray-850 text-gray-600 shrink-0">
                        <CheckCircle size={16} />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                        <Gift size={16} />
                      </span>
                    )}
                  </div>

                  {/* Progress bar info */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mb-1">
                      <span>Target Progress: {ach.current.toLocaleString()}/{ach.target.toLocaleString()}</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-805">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          ach.completed ? "bg-gray-700" : isFinished ? "bg-green-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim Button */}
                  <div className="mt-4 flex justify-between items-center pt-2 border-t border-gray-800/50">
                    <span className="text-[10px] font-mono font-bold text-green-400">
                      REWARD: 🪙 +{ach.reward} LDR
                    </span>

                    {ach.completed ? (
                      <button 
                        disabled 
                        className="py-1 px-3 rounded bg-gray-900 border border-gray-850 text-gray-600 text-xs font-mono cursor-not-allowed font-medium"
                      >
                        CLAIMED
                      </button>
                    ) : isFinished ? (
                      <button 
                        onClick={() => { playUpgradeSound(); onClaimAchievement(ach.id, ach.reward); }}
                        className="py-1 px-3 rounded bg-green-500 text-[#0d0f14] hover:brightness-105 active:scale-95 text-xs font-mono font-bold transition shadow"
                      >
                        CLAIM NOW!
                      </button>
                    ) : (
                      <button 
                        disabled 
                        className="py-1 px-3 rounded bg-gray-800 text-gray-500 text-xs font-mono cursor-not-allowed border border-gray-750 font-medium"
                      >
                        LOCKED
                      </button>
                    )}
                  </div>

                </div>
              );
            })}

            {/* Social Quest 1 */}
            <div 
              className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                tgChannelClaimed 
                  ? "border-gray-850 bg-gray-950/25 opacity-75" 
                  : tgChannelClicked
                    ? "border-green-500 bg-green-500/5 animate-pulse" 
                    : "border-gray-800 bg-[#161a29]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                  <h4 className={`text-sm font-bold ${tgChannelClaimed ? "text-gray-500 line-through" : "text-white"}`}>
                    Telegram Channel Quest
                  </h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                    Open Telegram and follow the official Galaxxe Tambang channel to receive the newest mining updates and alerts.
                  </p>
                </div>
                {tgChannelClaimed ? (
                  <span className="p-1 rounded-full bg-gray-900 border border-gray-850 text-emerald-500 shrink-0">
                    <CheckCircle size={16} />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                    <Sparkles size={14} />
                  </span>
                )}
              </div>

              {/* Progress info */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mb-1">
                  <span>Target Progress: {tgChannelClicked ? "1" : "0"}/1</span>
                  <span>{tgChannelClicked ? "100" : "0"}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-805">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      tgChannelClaimed ? "bg-gray-700" : tgChannelClicked ? "bg-green-500" : "bg-amber-500"
                    }`}
                    style={{ width: tgChannelClicked ? "100%" : "0%" }}
                  />
                </div>
              </div>

              {/* Claim Button */}
              <div className="mt-4 flex justify-between items-center pt-2.5 border-t border-gray-800/50">
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  REWARD: 💸 +Rp 5,000 (Rupiah)
                </span>

                <div className="flex gap-2 shrink-0">
                  {!tgChannelClaimed && !tgChannelClicked && (
                    <a
                      href="https://t.me/galaxxetambang"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playClickSound();
                        setTgChannelClicked(true);
                        const key = profile.minerTag ? `ldr_social_channel_clicked_${profile.minerTag}` : "ldr_social_channel_clicked";
                        localStorage.setItem(key, "true");
                      }}
                      className="py-1 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition shadow text-center flex items-center"
                    >
                      OPEN TASK
                    </a>
                  )}

                  {tgChannelClaimed ? (
                    <button 
                      disabled 
                      className="py-1 px-3 rounded bg-gray-900 border border-gray-850 text-gray-600 text-xs font-mono cursor-not-allowed font-medium"
                    >
                      CLAIMED
                    </button>
                  ) : tgChannelClicked ? (
                    <button 
                      onClick={handleClaimChannelReward}
                      className="py-1 px-3 rounded bg-green-500 text-black hover:bg-green-400 active:scale-95 text-xs font-mono font-black transition shadow animate-pulse"
                    >
                      CLAIM RP 5,000!
                    </button>
                  ) : (
                    <button 
                      disabled 
                      className="py-1 px-3 rounded bg-gray-800 text-gray-500 text-xs font-mono cursor-not-allowed border border-gray-750 font-medium"
                    >
                      LOCKED
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Social Quest 2 */}
            <div 
              className={`p-4 rounded-xl border flex flex-col justify-between transition ${
                tgGroupClaimed 
                  ? "border-gray-850 bg-gray-950/25 opacity-75" 
                  : tgGroupClicked
                    ? "border-green-500 bg-green-500/5 animate-pulse" 
                    : "border-gray-805 bg-[#161a29]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 text-left">
                <div className="min-w-0">
                  <h4 className={`text-sm font-bold ${tgGroupClaimed ? "text-gray-500 line-through" : "text-white"}`}>
                    Telegram Community Group Quest
                  </h4>
                  <p className="text-xs text-gray-400 mt-1.5 leading-snug">
                    Share and join our secondary community chat group to enhance real-time coin indexing correlation stability.
                  </p>
                </div>
                {tgGroupClaimed ? (
                  <span className="p-1 rounded-full bg-gray-900 border border-gray-850 text-emerald-500 shrink-0">
                    <CheckCircle size={16} />
                  </span>
                ) : (
                  <span className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
                    <Sparkles size={14} />
                  </span>
                )}
              </div>

              {/* Progress info */}
              <div className="mt-4">
                <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mb-1">
                  <span>Target Progress: {tgGroupClicked ? "1" : "0"}/1</span>
                  <span>{tgGroupClicked ? "100" : "0"}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-805">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      tgGroupClaimed ? "bg-gray-700" : tgGroupClicked ? "bg-green-500" : "bg-amber-500"
                    }`}
                    style={{ width: tgGroupClicked ? "100%" : "0%" }}
                  />
                </div>
              </div>

              {/* Claim Button */}
              <div className="mt-4 flex justify-between items-center pt-2.5 border-t border-gray-800/50">
                <span className="text-[10px] font-mono font-bold text-emerald-400">
                  REWARD: 💸 +Rp 1,000 (Rupiah)
                </span>

                <div className="flex gap-2 shrink-0">
                  {!tgGroupClaimed && !tgGroupClicked && (
                    <a
                      href="https://t.me/+q55cAm07WI1lZjk1"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        playClickSound();
                        setTgGroupClicked(true);
                        const key = profile.minerTag ? `ldr_social_group_clicked_${profile.minerTag}` : "ldr_social_group_clicked";
                        localStorage.setItem(key, "true");
                      }}
                      className="py-1 px-3 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition shadow text-center flex items-center"
                    >
                      OPEN TASK
                    </a>
                  )}

                  {tgGroupClaimed ? (
                    <button 
                      disabled 
                      className="py-1 px-3 rounded bg-gray-900 border border-gray-850 text-gray-600 text-xs font-mono cursor-not-allowed font-medium"
                    >
                      CLAIMED
                    </button>
                  ) : tgGroupClicked ? (
                    <button 
                      onClick={handleClaimGroupReward}
                      className="py-1 px-3 rounded bg-green-500 text-black hover:bg-green-400 active:scale-95 text-xs font-mono font-black transition shadow animate-pulse"
                    >
                      CLAIM RP 1,000!
                    </button>
                  ) : (
                    <button 
                      disabled 
                      className="py-1 px-3 rounded bg-gray-800 text-gray-500 text-xs font-mono cursor-not-allowed border border-gray-750 font-medium"
                    >
                      LOCKED
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. Items / Booster Shop panel */}
      {activeSubTab === 'shop' && (
        <div className="space-y-4 text-left">
          <div className="mb-2">
            <h4 className="text-sm font-bold text-white">Tactical Mining Inventory</h4>
            <p className="text-xs text-gray-400">Purchase tool resources like dynamite detonators and electromagnetic decoders to employ directly in game mode!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Dynamite Card item */}
            <div className="p-4 rounded-xl border border-gray-855 bg-[#161a29] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl shrink-0">
                  <Bomb size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                     <h4 className="text-sm font-bold text-white">Item: Mining Dynamite Grenade</h4>
                     <span className="text-[9px] font-mono bg-red-500/10 border border-red-500/20 text-red-400 p-0.5 px-2 rounded-full">
                       Owned: {dynamiteCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">
                     Deploys in the merge game to detonate and purify all level 0 (Coal) & 1 (Copper) nodes blocking the reactor funnel.
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 border-t sm:border-t-0 border-gray-800/60 pt-2.5 sm:pt-0 shrink-0">
                <div className="font-mono text-xs font-semibold text-gray-400">
                  Cost: 🪙 {DYNAMITE_COST} LDR
                </div>
                <button
                  onClick={() => handlePurchaseTool('dynamite', DYNAMITE_COST)}
                  disabled={profile.ldrBalance < DYNAMITE_COST}
                  className={`w-full sm:w-auto py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profile.ldrBalance >= DYNAMITE_COST
                      ? "bg-red-500 text-white hover:bg-red-600 active:scale-95 shadow"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-750"
                  }`}
                >
                  <span>BUY 1 UNIT</span>
                </button>
              </div>
            </div>

            {/* Magnet Card item */}
            <div className="p-4 rounded-xl border border-gray-805 bg-[#161a29] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl shrink-0">
                  <Zap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Item: Fusion Electromagnet</h4>
                    <span className="text-[9px] font-mono bg-blue-500/10 border border-blue-500/25 text-blue-400 p-0.5 px-2 rounded-full">
                      Owned: {magnetCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-450 mt-1 leading-snug">
                     Draws two nearby moderate minerals of the same kind together to trigger immediate fusion and unlock combos!
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 border-t sm:border-t-0 border-gray-800/60 pt-2.5 sm:pt-0 shrink-0">
                <div className="font-mono text-xs font-semibold text-gray-400">
                  Cost: 🪙 {MAGNET_COST} LDR
                </div>
                <button
                  onClick={() => handlePurchaseTool('magnet', MAGNET_COST)}
                  disabled={profile.ldrBalance < MAGNET_COST}
                  className={`w-full sm:w-auto py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    profile.ldrBalance >= MAGNET_COST
                      ? "bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-750"
                  }`}
                >
                  <span>BUY 1 UNIT</span>
                </button>
              </div>
            </div>

          </div>

          <div className="bg-[#181d2c] border border-gray-805 p-4 rounded-xl mt-4 flex items-start gap-4">
            <span className="p-1 px-2.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-mono text-[11px] rounded uppercase font-bold tracking-widest shrink-0 mt-0.5">
              LOGISTICS TIPS:
            </span>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Dynamite is absolutely crucial when piling rocks near the <span className="text-red-450">Red Danger Line</span>. Never let the reactor collapse or your mining metrics will abruptly cease! You receive complimentary Dynamite/Magnets upon securing Achievement milestones in the tab above.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
