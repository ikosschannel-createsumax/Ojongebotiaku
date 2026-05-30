/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MiningRig } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { Cpu, Layers, Zap, Bot, Shield, Rocket, ChevronsUp, AlertTriangle, Flame } from "lucide-react";

interface InteractiveRigProps {
  rigs: MiningRig[];
  ldrBalance: number;
  onBuyRig: (rigId: string) => void;
  onUpgradeRig: (rigId: string) => void;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
}

export default function InteractiveRig({
  rigs,
  ldrBalance,
  onBuyRig,
  onUpgradeRig
}: InteractiveRigProps) {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showDamageNotice, setShowDamageNotice] = useState(false);
  const [isSwinging, setIsSwinging] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Manual mineral clicker (classic idle mechanics)
  const handleManualClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    playClickSound();

    // Trigger tool swing animation
    setIsSwinging(true);
    setTimeout(() => setIsSwinging(false), 200);

    const now = Date.now();
    // Manual tapping speed limit check (anti-macro aesthetic warning)
    if (now - lastClickTime < 80) {
      setShowDamageNotice(true);
      setTimeout(() => setShowDamageNotice(false), 800);
    }
    setLastClickTime(now);

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);

    const pickaxeLevel = rigs.find(r => r.id === "pickaxe")?.level || 1;
    const clickPayoutVal = 0.001 * pickaxeLevel;

    // Track when coins are successfully mined (every 5 clicks)
    if (newClickCount > 0 && newClickCount % 5 === 0) {
      onUpgradeRig("manual_tap_payout"); // internal trigger caught in parent App
      
      // Floating text reward for successfully mining coins!
      const newFloat: FloatingText = {
        id: Date.now() + Math.random(),
        x: Math.random() * 80 - 40, // random offset
        y: Math.random() * 40 - 80,
        text: `🪙 +${clickPayoutVal.toFixed(3)} LDR`
      };
      setFloatingTexts((prev) => [...prev, newFloat]);
      
      // Clear after animation completes
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((f) => f.id !== newFloat.id));
      }, 1400);
    } else {
      // Small dust particle indicator on hits that are not full reward payouts
      const newFloat: FloatingText = {
        id: Date.now() + Math.random(),
        x: Math.random() * 60 - 30,
        y: -30,
        text: "⚡ HIT!"
      };
      setFloatingTexts((prev) => [...prev, newFloat]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((f) => f.id !== newFloat.id));
      }, 800);
    }
  };

  const getRigIcon = (iconName: string) => {
    switch (iconName) {
      case "Pickaxe": return Rocket; // Using Rocket / Layers instead
      case "Layers": return Layers;
      case "Cpu": return Cpu;
      case "Zap": return Zap;
      case "Bot": return Bot;
      default: return Cpu;
    }
  };

  const activeRigs = rigs.filter(r => r.category === "passive");
  const gearRigs = rigs.filter(r => r.category === "active");

  const totalPassiveLps = activeRigs.reduce((acc, r) => acc + (r.count * r.ldrPerSec * (r.level * 0.5 + 0.5)), 0);

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-5xl mx-auto py-2 font-sans">
      
      {/* Visual Animation & Clicker Column (Left side) */}
      <div className="flex-1 bg-[#111420] border border-gray-800 rounded-2xl p-5 flex flex-col justify-between items-center text-center relative overflow-hidden shrink-0 w-full max-w-[420px] mx-auto min-h-[460px]">
        {/* Decorative Grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        <div className="w-full relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono tracking-widest text-[#5c6a85] bg-[#0c0d15] px-2 py-1 rounded border border-gray-850">
              RIG STATUS: ACTIVE & OPERATIONAL
            </span>
            <span className="text-[10px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
              ⚡ LIVE: {totalPassiveLps.toFixed(1)} LDR/s
            </span>
          </div>

          <div className="h-px bg-gray-800/60 my-4" />
        </div>

        {/* Dynamic clicker element */}
        <div className="relative my-4 flex flex-col items-center">
          
          {/* Floating Indicators Container */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
            {floatingTexts.map((f) => (
              <span
                key={f.id}
                className="absolute font-mono text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 select-none animate-float-up text-center drop-shadow-md text-nowrap"
                style={{
                  left: `calc(50% + ${f.x}px)`,
                  top: `calc(40% + ${f.y}px)`,
                }}
              >
                {f.text}
              </span>
            ))}
          </div>

          {/* Animated Drilling lasers / energy rings */}
          {totalPassiveLps > 0 && (
            <div className="absolute -inset-10 bg-amber-500/5 rounded-full filter blur-xl animate-pulse pointer-events-none" />
          )}
          {totalPassiveLps > 5 && (
            <div className="absolute -inset-16 border border-dashed border-teal-500/15 rounded-full animate-spin pointer-events-none" />
          )}

          {/* Swinging Mining Tool Animation */}
          <div className="relative">
            <div 
              className={`absolute -top-6 -right-6 text-amber-400 transition-transform duration-100 origin-bottom-left z-35 pointer-events-none ${
                isSwinging ? "rotate-[-45deg] scale-125" : "rotate-[15deg] scale-100"
              }`}
            >
              <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/30 shadow-md">
                <Rocket className="w-8 h-8 rotate-45 text-amber-500" />
              </div>
            </div>

            {/* Central manual mining asteroid */}
            <button
              onClick={handleManualClick}
              className="w-44 h-44 rounded-full bg-gradient-to-br from-gray-805 via-zinc-800 to-stone-900 border-4 border-gray-700 shadow-xl shadow-black/80 flex flex-col items-center justify-center p-4 relative group hover:border-amber-500 active:scale-95 transition duration-150 relative z-20 outline-none"
              style={{
                boxShadow: totalPassiveLps > 0 ? "0 0 25px rgba(245, 158, 11, 0.15)" : ""
              }}
            >
              {/* Spinning inner drill overlay depending on passive rigs */}
              <div className={`absolute inset-4 border-2 border-dashed ${totalPassiveLps > 0 ? "border-amber-500/20 animate-spin" : "border-transparent"}`} />

              <Flame className="text-gray-500 group-hover:text-amber-400 group-hover:scale-110 transition duration-305 mb-1" size={28} />
              <span className="text-xs font-black text-white tracking-widest uppercase">MINE ORE</span>
              <span className="text-[9px] font-mono text-gray-400 mt-0.5 uppercase">Manual tap</span>

              {/* Click counts feedback bubble */}
              <span className="absolute bottom-4 bg-[#0d0f14] px-2 py-0.5 rounded-full border border-gray-750 font-mono text-[9px] text-amber-500 font-bold group-hover:bg-amber-500/10 group-hover:text-amber-400">
                Taps: {clickCount}
              </span>
            </button>
          </div>

          {/* Click Progress Indicator visual ring bar */}
          <div className="w-full max-w-[260px] bg-[#090b10] p-2.5 rounded-xl border border-gray-850 mt-5">
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-1 leading-none">
              <span>COIN INJECTION</span>
              <span className="text-amber-500 font-extrabold">{clickCount % 5} / 5 TAPS</span>
            </div>
            <div className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-850">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-505 rounded-full transition-all duration-150"
                style={{ width: `${(clickCount % 5) * 20}%` }}
              />
            </div>
          </div>

          {/* Anti-macro / high speed warning alert */}
          {showDamageNotice ? (
            <div className="absolute -bottom-8 bg-amber-950/95 border border-amber-500 text-amber-300 font-mono text-[9px] py-1 px-2.5 rounded shadow-lg z-30 animate-pulse flex items-center gap-1">
              <AlertTriangle size={11} />
              <span>DRILL OVERHEAT! CHILL TAP</span>
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 font-mono mt-4 max-w-[280px]">
              Every 5 taps rewards LDR Coins based on your Super Pickaxe level!
            </p>
          )}
        </div>

        {/* Schematic animated rigs statistics */}
        <div className="w-full bg-[#0d0f13] border border-gray-850 p-3 rounded-xl mt-4 text-left">
          <h4 className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">
            Active Mining Equipment:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {rigs.map((r) => (
              <div key={r.id} className="p-1.5 bg-[#141822] border border-gray-850 rounded flex justify-between items-center">
                <span className="text-gray-400 text-[11px] truncate">{r.localName}</span>
                <span className="text-amber-400 font-bold text-[11px]">
                  {r.id === "pickaxe" ? `Lv.${r.level}` : `x${r.count}`}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Upgrade Store List (Right column) */}
      <div className="flex-1 space-y-5 bg-[#131722] p-5 border border-gray-800 rounded-2xl">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 leading-none">
            <ChevronsUp className="text-amber-400" size={20} />
            <span>AUTO RIGS & UPGRADES</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1 leading-snug">
            Use your LDR Coins to install new passive mining automatic rigs, or upgrade your manual pickaxe efficiency.
          </p>
        </div>

        {/* Tab Group titles */}
        <div className="space-y-3">
          
          {/* Active pickaxe gear */}
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block mb-2 px-1">
              🛠️ MANUAL TOOLS & ACTIVE BUFFS:
            </span>
            {gearRigs.map((rig) => {
              const IconComp = getRigIcon(rig.icon);
              return (
                <div 
                  key={rig.id}
                  className="p-3.5 rounded-xl border border-gray-800 bg-[#171c2a] flex items-center justify-between gap-4"
                >
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <IconComp size={20} />
                  </div>
                  <div className="grow min-w-0">
                    <h4 className="text-sm font-bold text-white truncate leading-tight">
                      {rig.localName} <span className="text-xs font-mono text-amber-400 font-bold ml-1">Lv {rig.level}</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                       Effect: Active fusion coin bonus +{rig.level * 15}%. Clicker {(0.001 * rig.level).toFixed(3)} LDR per 5 clicks.
                    </p>
                  </div>
                  <button
                    onClick={() => { playUpgradeSound(); onUpgradeRig(rig.id); }}
                    disabled={ldrBalance < rig.cost * rig.level}
                    className={`py-2 px-3 rounded-lg text-xs font-bold shrink-0 transition flex flex-col items-center ${
                      ldrBalance >= rig.cost * rig.level
                        ? "bg-amber-500 text-[#0d0f14] hover:brightness-105 active:scale-95"
                        : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wide leading-none">UPGRADE</span>
                    <span className="font-mono text-[11px] mt-0.5 font-extrabold leading-none">
                      🪙 {(rig.cost * rig.level).toFixed(0)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="h-px bg-gray-800/50" />

          {/* Passive rig engines */}
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#3498db] uppercase block mb-2 px-1">
              🏭 PASSIVE RIG AUTOMATION (IDLE AUTO-YIELD):
            </span>
            <div className="space-y-3">
              {activeRigs.map((rig) => {
                const IconComp = getRigIcon(rig.icon);
                const currentYieldSpeed = rig.count * rig.ldrPerSec * (rig.level * 0.5 + 0.5);
                const isAffordableBuy = ldrBalance >= rig.cost;

                return (
                  <div 
                    key={rig.id} 
                    className="p-3.5 bg-[#171d2b] border border-gray-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 relative overflow-hidden"
                  >
                    {/* Background glow decoration if rig count > 0 */}
                    {rig.count > 0 && (
                      <div className="absolute top-0 right-0 w-12 h-12 bg-teal-500/5 rounded-full blur-lg pointer-events-none" />
                    )}

                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-lg shrink-0 ${
                        rig.count > 0 
                          ? "bg-teal-500/10 border border-teal-500/20 text-teal-400" 
                          : "bg-gray-800 text-gray-500 border border-gray-750"
                      }`}>
                        <IconComp size={20} className={rig.count > 0 ? "animate-pulse" : ""} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {rig.localName}
                          </h4>
                          {rig.count > 0 && (
                            <span className="text-[10px] font-mono font-black text-teal-400 bg-teal-500/10 p-0.5 px-1.5 rounded border border-teal-500/20">
                              Owned: x{rig.count}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-450 mt-1 leading-snug">
                          {rig.description}
                        </p>
                        <div className="flex items-center gap-3.5 mt-2 text-[10px] font-mono">
                          <span className="text-gray-450">Yield Speed: <span className="text-green-400 font-bold">+{rig.ldrPerSec} LDR/s</span></span>
                          {rig.count > 0 && (
                            <span className="text-teal-400 font-bold bg-teal-500/5 p-0.5 rounded leading-none border border-teal-500/10">
                              Total Yield: {currentYieldSpeed.toFixed(2)}/s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-stretch md:items-end justify-between md:justify-center gap-2.5 pt-2 border-t md:border-t-0 border-gray-800">
                      <div className="font-mono text-[10px] text-gray-500 self-center md:self-auto">
                        Unit Price: <span className="text-white font-bold">🪙 {rig.cost} LDR</span>
                      </div>
                      <button
                        onClick={() => { playUpgradeSound(); onBuyRig(rig.id); }}
                        disabled={!isAffordableBuy}
                        className={`py-2 px-3.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isAffordableBuy
                            ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:brightness-105 active:scale-95"
                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50"
                        }`}
                      >
                        <span>BUY RIG FOR</span>
                        <span className="font-mono">🪙{rig.cost}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
