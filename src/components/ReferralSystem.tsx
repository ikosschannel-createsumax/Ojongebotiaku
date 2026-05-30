/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { Copy, Gift, Users, Coins, Share2, Sparkles, CheckCircle2, ChevronRight, Award } from "lucide-react";

interface ReferralSystemProps {
  profile: MinerProfile;
  onAddBalances: (ldr: number, rp: number) => void;
  triggerNotification: (msg: string) => void;
}

interface ReferralRecord {
  id: string;
  username: string;
  registeredAt: string;
  depositAmount: number;
  commissionEarned: number;
  status: 'active' | 'pending';
}

export default function ReferralSystem({
  profile,
  onAddBalances,
  triggerNotification
}: ReferralSystemProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [claimableCommission, setClaimableCommission] = useState<number>(0);
  const [claimedTotal, setClaimedTotal] = useState<number>(0);

  const referralLinkBase = "https://tewnoxmy.vercel.app/";
  const referralLink = `${referralLinkBase}?ref=${profile.minerTag || profile.username.toLowerCase().replace(/\s+/g, "")}`;

  // Helper key for localStorage
  const getUserKey = (baseKey: string) => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    return activeEmail ? `${baseKey}_${activeEmail}` : baseKey;
  };

  useEffect(() => {
    // Load existing referrals or generate standard initial mock of real-looking active referrals to show user the system in action
    const savedReferrals = localStorage.getItem(getUserKey("ldr_referrals_list"));
    const savedClaimable = localStorage.getItem(getUserKey("ldr_referrals_claimable"));
    const savedClaimed = localStorage.getItem(getUserKey("ldr_referrals_claimed"));

    if (savedReferrals) {
      try {
        setReferrals(JSON.parse(savedReferrals));
      } catch (e) {}
    } else {
      // Setup some initial realistic partners
      const initialReferrals: ReferralRecord[] = [
        {
          id: "REF-4019",
          username: "xRayMiner_99",
          registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          depositAmount: 50000,
          commissionEarned: 10000, // 20%
          status: 'active'
        },
        {
          id: "REF-7810",
          username: "FusionQueen",
          registeredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          depositAmount: 100000,
          commissionEarned: 20000, // 20%
          status: 'active'
        },
        {
          id: "REF-1192",
          username: "CyberDigger",
          registeredAt: new Date().toISOString().split("T")[0],
          depositAmount: 25000,
          commissionEarned: 5000, // 20%
          status: 'pending'
        }
      ];
      setReferrals(initialReferrals);
      localStorage.setItem(getUserKey("ldr_referrals_list"), JSON.stringify(initialReferrals));
    }

    if (savedClaimable) {
      setClaimableCommission(parseFloat(savedClaimable));
    } else {
      // Sum active commissions (e.g. 10000 + 20000 = 30000)
      setClaimableCommission(30000);
      localStorage.setItem(getUserKey("ldr_referrals_claimable"), "30000");
    }

    if (savedClaimed) {
      setClaimedTotal(parseFloat(savedClaimed));
    } else {
      setClaimedTotal(0);
    }
  }, []);

  const handleCopyLink = () => {
    playClickSound();
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    triggerNotification("📋 Link Referral tersalin ke papan klip!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaimCommission = () => {
    if (claimableCommission <= 0) {
      triggerNotification("⚠️ Belum ada komisi penambang referral yang tersedia untuk dicairkan!");
      return;
    }

    playUpgradeSound();
    const claimAmt = claimableCommission;
    
    // FITUR SIMULASI DEPOSIT TEMAN HANYA SEBAGAI UJI COBA - DANA KLAIM TIDAK MASUK KE SALDO ASET RUPIAH
    // onAddBalances(0, claimAmt); // Disabled as requested so simulated trial funds aren't added to real assets
    
    // Move statistics
    const nextClaimed = claimedTotal + claimAmt;
    setClaimedTotal(nextClaimed);
    setClaimableCommission(0);

    // Save
    localStorage.setItem(getUserKey("ldr_referrals_claimable"), "0");
    localStorage.setItem(getUserKey("ldr_referrals_claimed"), nextClaimed.toString());

    // Update statuses in log lists
    const updatedRefs = referrals.map(r => r.status === 'active' ? { ...r, status: 'pending' as const } : r);
    setReferrals(updatedRefs);
    localStorage.setItem(getUserKey("ldr_referrals_list"), JSON.stringify(updatedRefs));

    triggerNotification(`💸 [UJI COBA & SIMULASI] Komisi virtual sebesar Rp ${claimAmt.toLocaleString("id-ID")} berhasil terproses! (Sesuai mode uji coba, dana ini tidak masuk ke saldo Rupiah riil akun Anda).`);
  };

  // Allow generating a mock new referral registration randomly for test and interaction!
  const handleSimulateNewReferral = () => {
    playClickSound();
    const usernames = ["AstroBoy", "CryptoLord", "GigaMiner", "KoinStar", "BlockMaster", "LunaHunter"];
    const selectedUsername = usernames[Math.floor(Math.random() * usernames.length)] + "_" + Math.floor(10 + Math.random() * 90);
    
    // Random deposit (Rp 25.000 / Rp 50.000 / Rp 100.000)
    const depositPresets = [25000, 50000, 100000];
    const randDeposit = depositPresets[Math.floor(Math.random() * depositPresets.length)];
    const commEarned = randDeposit * 0.20; // 20% commission

    const newRef: ReferralRecord = {
      id: `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      username: selectedUsername,
      registeredAt: new Date().toISOString().split("T")[0],
      depositAmount: randDeposit,
      commissionEarned: commEarned,
      status: 'active'
    };

    const nextList = [newRef, ...referrals];
    setReferrals(nextList);
    localStorage.setItem(getUserKey("ldr_referrals_list"), JSON.stringify(nextList));

    const nextClaimable = claimableCommission + commEarned;
    setClaimableCommission(nextClaimable);
    localStorage.setItem(getUserKey("ldr_referrals_claimable"), nextClaimable.toString());

    triggerNotification(`🔔 Referensi Baru Bergabung! ${selectedUsername} melakukan deposit Rp ${randDeposit.toLocaleString("id-ID")}. Komisi 20% (Rp ${commEarned.toLocaleString("id-ID")}) ditambahkan ke saldo klaim Anda.`);
  };

  const totalDepositReferrals = referrals.reduce((sum, r) => sum + r.depositAmount, 0);

  return (
    <div id="referral-system-container" className="space-y-6 max-w-5xl mx-auto py-2 font-sans animate-fade-in text-left">
      
      {/* Mega Hero Frame Card */}
      <div className="bg-gradient-to-br from-[#12192c] via-[#111625] to-[#090b11] border border-amber-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="space-y-3 shrink text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] md:text-xs font-mono font-bold text-amber-400">
              <Sparkles size={12} className="animate-pulse" />
              <span>SISTEM KEMITRAAN AFFILIATE LDR</span>
            </div>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tight uppercase leading-none">
              Dapatkan <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300">Komisi 20%</span>
            </h2>
            <p className="text-xs text-gray-300 max-w-lg leading-relaxed font-normal">
              Bagikan tautan referral akun reaktor tambang Anda kepada rekan fusi, dan dapatkan bonus saldo fusi rupiah langsung sebesar <strong>20% (KOMISI 20%)</strong> dari setiap isi saldo rupiah yang diajukan teman Anda!
            </p>
          </div>

          <div className="w-20 h-20 md:w-28 md:h-28 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 text-amber-400 shadow-lg animate-bounce animate-duration-3000">
            <Gift size={44} className="md:size-52" />
          </div>
        </div>

        {/* Action Link Row Frame */}
        <div className="mt-8 pt-6 border-t border-gray-800/60">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-amber-500 mb-2 font-bold select-none">
            🚀 TAUTAN REFERRAL REAKTOR ANDA:
          </label>
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="grow bg-[#090b10] border border-gray-850 rounded-xl px-4 py-3 text-white flex items-center justify-between font-mono text-xs select-all text-ellipsis overflow-hidden">
              <span className="truncate text-teal-400 font-semibold">{referralLink}</span>
            </div>
            <button
              id="btn-copy-ref-link"
              onClick={handleCopyLink}
              className={`py-3 px-6 rounded-xl text-xs font-bold font-mono tracking-widest uppercase transition flex items-center justify-center gap-2 grow-0 ${
                copied
                  ? "bg-green-500 text-black font-extrabold"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-[#0d0f14] hover:brightness-105 active:scale-95 shadow-md"
              }`}
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              <span>{copied ? "TERSALIN" : "SALIN LINK"}</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-1 px-1">
            *Tautan merujuk ke situs utama afiliasi kami: <a href="https://tewnoxmy.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">https://tewnoxmy.vercel.app/</a>
          </p>
        </div>
      </div>

      {/* Referral Statistics Dash Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-[#111420] border border-gray-850 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Teman Terdaftar</p>
            <p className="text-lg font-black text-white font-mono leading-none mt-1">
              {referrals.length} <span className="text-xs text-gray-500 font-normal">MINERS</span>
            </p>
          </div>
        </div>

        <div className="bg-[#111420] border border-gray-850 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Coins size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Volume Fusi Teman</p>
            <p className="text-lg font-black text-white font-mono leading-none mt-1">
              Rp {totalDepositReferrals.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <div className="bg-[#111420] border border-gray-850 rounded-2xl p-4 flex items-center gap-4 shadow-md">
          <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Telah Dicairkan</p>
            <p className="text-lg font-black text-emerald-400 font-mono leading-none mt-1">
              Rp {claimedTotal.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

      </div>

      {/* Claimable Balance Frame Panel */}
      <div className="bg-[#111624] border border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center gap-6 justify-between text-left">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded inline-block">
            SALDO KOMISI AFFILIATE SAAT INI (Uji Coba Visual)
          </span>
          <h3 className="text-2xl font-black font-mono text-white pt-2.5">
            Rp {claimableCommission.toLocaleString("id-ID")}
          </h3>
          <p className="text-[11px] text-gray-450 leading-relaxed font-normal">
            Klaim komisi didapatkan otomatis setelah teman Anda sukses memverifikasi transfer isi saldo deposit! <strong className="text-amber-400 font-semibold">*Catatan: Karena simulasi pendaftaran & deposit teman ini hanya sebagai bantuan uji coba (trial), dana klaim simulasi ini tidak dimasukkan ke saldo aset Rupiah riil akun Anda.</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleSimulateNewReferral}
            className="px-4 py-2 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-gray-300 font-semibold font-mono text-[10px] uppercase rounded-xl transition shadow"
          >
            🧪 SIMULASI DEPOSIT TEMAN
          </button>
          
          <button
            type="button"
            onClick={handleClaimCommission}
            disabled={claimableCommission <= 0}
            className={`px-6 py-3.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition shadow-lg ${
              claimableCommission > 0
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-105 active:scale-95 text-black font-extrabold"
                : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-750"
            }`}
          >
            💰 Klaim Komisi ke Saldo Rupiah
          </button>
        </div>
      </div>

      {/* Referral Logs Grid */}
      <div className="bg-[#111420] border border-gray-850 rounded-2xl p-5 shadow">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-850">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Share2 size={14} className="text-amber-500" />
            <span>Riwayat Afiliasi Miners Terdaftar</span>
          </h4>
          <span className="text-[9px] font-mono text-gray-500 bg-[#0d0f14] px-2 py-0.5 rounded border border-gray-850">
            KOMISI KONSTAN: 20%
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-500 italic">Belum ada rujukan yang melakukan pendaftaran. Bagikan link referral di atas untuk memulai!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-gray-850 text-gray-400 text-[10px]">
                  <th className="py-2.5 font-bold uppercase">ID Referral</th>
                  <th className="py-2.5 font-bold uppercase">Nama Miner</th>
                  <th className="py-2.5 font-bold uppercase">Tanggal Gabung</th>
                  <th className="py-2.5 font-bold uppercase text-right">Volume Deposit</th>
                  <th className="py-2.5 font-bold uppercase text-right text-amber-400">Komisi (20%)</th>
                  <th className="py-2.5 font-bold uppercase text-center">Status Klaim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-[#141824]/40 transition duration-150">
                    <td className="py-3 text-gray-500 font-bold">{ref.id}</td>
                    <td className="py-3 text-white font-black truncate max-w-[120px]">{ref.username}</td>
                    <td className="py-3 text-gray-400 text-[11px]">{ref.registeredAt}</td>
                    <td className="py-3 text-right text-gray-300 font-bold">
                      Rp {ref.depositAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 text-right text-amber-400 font-extrabold">
                      Rp {ref.commissionEarned.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        ref.status === "active"
                          ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                          : "bg-green-500/10 text-green-500 border border-green-500/20"
                      }`}>
                        {ref.status === "active" ? "BELUM DEPOSIT/KLAIM" : "SUDAH DIKLAIM"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
