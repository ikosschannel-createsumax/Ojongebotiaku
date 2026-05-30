/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MinerProfile } from "../types";
import { playClickSound, playUpgradeSound } from "../utils/audio";
import { createDepositRequestInFirebase } from "../utils/firebase";
import { 
  Landmark, 
  Wallet, 
  Coins, 
  ArrowRight, 
  ArrowUpRight, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Bell, 
  Check, 
  ShieldAlert, 
  RefreshCw,
  Eye,
  Trash2
} from "lucide-react";

interface PayoutSystemProps {
  profile: MinerProfile;
  deductBalance: (amount: number) => void;
  deductRupiahBalance: (amount: number) => void;
  onAddBalances: (ldrDelta: number, rupiahDelta: number) => void;
  triggerNotification: (message: string) => void;
  adminQrisMethod: 'dynamic' | 'static';
  adminQrisPayload: string;
  adminDanaNo: string;
  adminBcaNo: string;
  adminMandiriNo: string;
  isAdmin?: boolean;
}

interface TransactionRecord {
  id: string;
  timestamp: string;
  method: string;
  destination: string;
  amountLdr?: number;
  amountRupiah?: number; // supporting withdrawal in raw Rp
  amountFiatCurrency: string;
  status: 'pending' | 'completed' | 'failed';
}

interface AccountAlert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'security' | 'market' | 'payout';
  isRead: boolean;
}

export default function PayoutSystem({
  profile,
  deductBalance,
  deductRupiahBalance,
  onAddBalances,
  triggerNotification,
  adminQrisMethod,
  adminQrisPayload,
  adminDanaNo,
  adminBcaNo,
  adminMandiriNo,
  isAdmin = false
}: PayoutSystemProps) {
  const getUserKey = (baseKey: string) => {
    const activeEmail = localStorage.getItem("ldr_active_email")?.toLowerCase().trim();
    return activeEmail ? `${baseKey}_${activeEmail}` : baseKey;
  };

  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'ewallet' | 'crypto'>('ewallet');
  const [selectedProvider, setSelectedProvider] = useState<string>("DANA");
  const [destinationAccount, setDestinationAccount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawSource] = useState<'ldr' | 'rupiah'>('ldr');

  // Deposit & Swap states
  const [depositAmount, setDepositAmount] = useState<string>("25000");
  const [depositMethod, setDepositMethod] = useState<string>("QRIS");
  const [swapDirection, setSwapDirection] = useState<'ldrToRp' | 'rpToLdr'>('ldrToRp');
  const [swapAmount, setSwapAmount] = useState<string>("");

  // State to handle deposit invoice overlay
  const [activeDepositAmount, setActiveDepositAmount] = useState<number | null>(null);
  const [activeDepositMethod, setActiveDepositMethod] = useState<string>("");
  const [showNoDepositModal, setShowNoDepositModal] = useState<boolean>(false);
  
  // Local transaction and notification states
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [alerts, setAlerts] = useState<AccountAlert[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Simulated rates
  const RATE_RP_PER_LDR = 12500; // Rp 12,500
  const RATE_USDT_PER_LDR = 0.85; // 0.85 USDT

  const handleDepositRupiah = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerNotification("⚠️ Masukkan jumlah deposit Rupiah yang valid!");
      return;
    }
    if (amt < 5000) {
      triggerNotification("⚠️ Minimum deposit Rupiah adalah Rp 5.000!");
      return;
    }

    // Set active deposit to trigger invoice display
    setActiveDepositAmount(amt);
    setActiveDepositMethod(depositMethod);
    triggerNotification(`📄 Faktur deposit Rp ${amt.toLocaleString("id-ID")} dibuat! Selesaikan pembayaran di bawah.`);
    playClickSound();
  };

  const handleConfirmDepositPaid = async () => {
    if (!activeDepositAmount) return;
    const amt = activeDepositAmount;
    const method = activeDepositMethod;
    const newTxId = `DEP-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isAdmin) {
      // Admin: Instant direct processing
      onAddBalances(0, amt);

      // Add transaction
      const newTx: TransactionRecord = {
        id: newTxId,
        timestamp: new Date().toISOString(),
        method: `DEPOSIT (${method})`,
        destination: "Reaktor Tambang (Instan Admin)",
        amountRupiah: amt,
        amountFiatCurrency: `Rp ${amt.toLocaleString("id-ID")}`,
        status: 'completed'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

      // Create Notification Alert
      const newAlert: AccountAlert = {
        id: `ALERT-${newTxId}`,
        title: "⚡ [ADMIN] Deposit Sukses Terverifikasi!",
        description: `Pengisian Saldo Rupiah via ${method} sebesar Rp ${amt.toLocaleString("id-ID")} telah berhasil terverifikasi otomatis secara instan oleh sistem admin.`,
        timestamp: new Date().toISOString(),
        type: "payout",
        isRead: false
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

      setActiveDepositAmount(null);
      setDepositAmount("25000");
      playUpgradeSound();
      triggerNotification(`✅ [ADMIN] Sukses mengisi saldo Rp ${amt.toLocaleString("id-ID")} via ${method}!`);
    } else {
      // User Member: Needs System/CS approval and pending state in Admin Panel & Firestore
      setIsProcessing(true);
      const email = localStorage.getItem("ldr_active_email") || profile.username.toLowerCase();
      
      try {
        const success = await createDepositRequestInFirebase(
          newTxId,
          email,
          profile.username,
          amt,
          method
        );

        if (!success) {
          triggerNotification("❌ Gagal mengirim pengajuan deposit ke CS. Silakan coba lagi.");
          setIsProcessing(false);
          return;
        }

        // Add pending transaction locally
        const newTx: TransactionRecord = {
          id: newTxId,
          timestamp: new Date().toISOString(),
          method: `DEPOSIT (${method})`,
          destination: "Verifikasi (Sistem/CS)",
          amountRupiah: amt,
          amountFiatCurrency: `Rp ${amt.toLocaleString("id-ID")}`,
          status: 'pending'
        };
        const updatedTx = [newTx, ...transactions];
        setTransactions(updatedTx);
        localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

        // Create Pending Alert
        const newAlert: AccountAlert = {
          id: `ALERT-${newTxId}`,
          title: "⏳ Deposit Diproses Sistem/CS",
          description: `Pengisian Saldo Rupiah via ${method} sebesar Rp ${amt.toLocaleString("id-ID")} telah dikirim ke CS/Sistem. Menunggu persetujuan admin.`,
          timestamp: new Date().toISOString(),
          type: "payout",
          isRead: false
        };
        const updatedAlerts = [newAlert, ...alerts];
        setAlerts(updatedAlerts);
        localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

        setActiveDepositAmount(null);
        setDepositAmount("25000");
        playUpgradeSound();
        triggerNotification(`⏳ Sukses mengajukan deposit Rp ${amt.toLocaleString("id-ID")} via ${method}! Menunggu persetujuan admin.`);
      } catch (err) {
        console.error("Deposit request error:", err);
        triggerNotification("❌ Terjadi kesalahan jaringan saat mengajukan deposit.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSwapLdr = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(swapAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerNotification("⚠️ Masukkan jumlah swap yang valid!");
      return;
    }

    if (swapDirection === 'ldrToRp') {
      if (profile.ldrBalance < amt) {
        triggerNotification("⚠️ Saldo Koin LDR Anda tidak mencukupi untuk melakukan swap!");
        return;
      }
      const yieldedRp = amt * RATE_RP_PER_LDR;
      // Deduct LDR, Add Rp
      onAddBalances(-amt, yieldedRp);

      // Create Tx
      const newTxId = `SWP-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTx: TransactionRecord = {
        id: newTxId,
        timestamp: new Date().toISOString(),
        method: `SWAP (LDR ➡️ Rp)`,
        destination: "Dompet Internal",
        amountLdr: amt,
        amountRupiah: yieldedRp,
        amountFiatCurrency: `Rp ${yieldedRp.toLocaleString("id-ID")}`,
        status: 'completed'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

      // Create Alert
      const newAlert: AccountAlert = {
        id: `ALERT-${newTxId}`,
        title: "🔄 Swapping Asset Sukses!",
        description: `Berhasil menukarkan ${amt} LDR menjadi Rp ${yieldedRp.toLocaleString("id-ID")} dengan kurs stabil 1 LDR = Rp 12.500.`,
        timestamp: new Date().toISOString(),
        type: "market",
        isRead: false
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

      setSwapAmount("");
      playUpgradeSound();
      triggerNotification(`✅ Sukses swap ${amt} LDR menjadi Rp ${yieldedRp.toLocaleString("id-ID")}!`);
    } else {
      const neededRp = amt * RATE_RP_PER_LDR;
      const playerRp = profile.rupiahBalance || 0;
      if (playerRp < neededRp) {
        triggerNotification(`⚠️ Saldo Rupiah Anda tidak mencukupi! Butuh Rp ${neededRp.toLocaleString("id-ID")} untuk ditukarkan menjadi ${amt} LDR.`);
        return;
      }
      // Add LDR, Deduct Rp
      onAddBalances(amt, -neededRp);

      // Create Tx
      const newTxId = `SWP-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTx: TransactionRecord = {
        id: newTxId,
        timestamp: new Date().toISOString(),
        method: `SWAP (Rp ➡️ LDR)`,
        destination: "Dompet Internal",
        amountLdr: amt,
        amountRupiah: neededRp,
        amountFiatCurrency: `${amt} LDR`,
        status: 'completed'
      };
      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedTx));

      // Create Alert
      const newAlert: AccountAlert = {
        id: `ALERT-${newTxId}`,
        title: "🔄 Pembelian LDR Sukses!",
        description: `Berhasil membeli ${amt} LDR dengan pengeluaran Rp ${neededRp.toLocaleString("id-ID")}.`,
        timestamp: new Date().toISOString(),
        type: "market",
        isRead: false
      };
      const updatedAlerts = [newAlert, ...alerts];
      setAlerts(updatedAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));

      setSwapAmount("");
      playUpgradeSound();
      triggerNotification(`✅ Sukses swap Rp ${neededRp.toLocaleString("id-ID")} menjadi ${amt} LDR!`);
    }
  };

  // Initialize pre-seeded lists of transactions & system notifications
  useEffect(() => {
    // Load existing transactions or set default pre-seeded ones
    const savedTx = localStorage.getItem(getUserKey("ldr_miner_transactions"));
    if (savedTx) {
      try {
        setTransactions(JSON.parse(savedTx));
      } catch (e) {
        console.error("Gagal memuat riwayat transaksi:", e);
      }
    } else {
      const initialTx: TransactionRecord[] = [
        {
          id: "TX-991823",
          timestamp: new Date(Date.now() - 365 * 60000 * 24).toISOString(), // 1 day ago
          method: "E-Wallet (GOPAY)",
          destination: "0812****8821",
          amountLdr: 30,
          amountFiatCurrency: "Rp 375,000",
          status: "completed"
        },
        {
          id: "TX-987102",
          timestamp: new Date(Date.now() - 600 * 60000).toISOString(), // 10 hours ago
          method: "Crypto (USDT TRC-20)",
          destination: "TWhq...881aPX",
          amountLdr: 15,
          amountFiatCurrency: "12.75 USDT",
          status: "completed"
        }
      ];
      setTransactions(initialTx);
      localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(initialTx));
    }

    // Load alerts or set default pre-seeded ones
    const savedAlerts = localStorage.getItem(getUserKey("ldr_miner_alerts"));
    if (savedAlerts) {
      try {
        setAlerts(JSON.parse(savedAlerts));
      } catch (e) {
        console.error("Gagal memuat notifikasi akun:", e);
      }
    } else {
      const initialAlerts: AccountAlert[] = [
        {
          id: "ALERT-1",
          title: "🔐 Protokol Enkripsi Ganda Aktif",
          description: "Sistem otentikasi pertambangan koin LDR pada server lokal Anda telah berhasil diperkuat dengan enkripsi SHA-256.",
          timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
          type: "security",
          isRead: false
        },
        {
          id: "ALERT-2",
          title: "📈 Fluktuasi Pasar Koin LDR (+6.8%)",
          description: "Indeks penukaran LDR ke Fiat melambung menyusul fusi mineral kelas Emerald oleh operator galaksi.",
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          type: "market",
          isRead: false
        }
      ];
      setAlerts(initialAlerts);
      localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(initialAlerts));
    }
  }, []);

  // Auto-complete pending deposits if user has a non-zero rupiahBalance or if a balance sync occurred
  useEffect(() => {
    if (profile && profile.rupiahBalance > 0 && transactions.length > 0) {
      const hasPendingDeposit = transactions.some(
        (tx) => tx.method.toUpperCase().includes("DEPOSIT") && tx.status === "pending"
      );
      if (hasPendingDeposit) {
        const updated = transactions.map((tx) => {
          if (tx.method.toUpperCase().includes("DEPOSIT") && tx.status === "pending") {
            return { ...tx, status: "completed" as const };
          }
          return tx;
        });
        saveTransactionsToStorage(updated);
        triggerNotification("🎉 Pembayaran Terdeteksi! Deposit Anda sukses diverifikasi secara otomatis.");
      }
    }
  }, [profile?.rupiahBalance, transactions.length]);

  // Sync states utility
  const saveTransactionsToStorage = (updatedList: TransactionRecord[]) => {
    setTransactions(updatedList);
    localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updatedList));
  };

  const saveAlertsToStorage = (updatedList: AccountAlert[]) => {
    setAlerts(updatedList);
    localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedList));
  };

  // Switch payout channels
  const handleMethodChange = (method: 'bank' | 'ewallet' | 'crypto') => {
    playClickSound();
    setPayoutMethod(method);
    setDestinationAccount("");
    if (method === 'bank') {
      setSelectedProvider("BCA");
    } else if (method === 'ewallet') {
      setSelectedProvider("DANA");
    } else {
      setSelectedProvider("USDT (TRC-20)");
    }
  };

  // Submit withdrawal form
  const handleWithdrawClaim = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    // Check if user has active or completed deposit transactions, or positive rupiah balance
    const totalDeposit = transactions
      .filter((tx) => tx.method.toUpperCase().includes("DEPOSIT") && (tx.status === "completed" || tx.status === "pending"))
      .reduce((sum, tx) => sum + (tx.amountRupiah || 0), 0);

    const hasAccess = totalDeposit > 0 || (profile.rupiahBalance && profile.rupiahBalance > 0);

    if (!hasAccess) {
      window.alert("pertambangan akun harus memiliki jumlah deposit untuk melakukan penarikan");
      triggerNotification("⚠️ pertambangan akun harus memiliki jumlah deposit untuk melakukan penarikan");
      setShowNoDepositModal(true);
      return;
    }

    const amt = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amt) || amt <= 0) {
      triggerNotification("⚠️ Harap masukkan jumlah penarikan yang valid!");
      return;
    }

    if (withdrawSource === 'ldr') {
      // Constraints check for LDR
      const minWithdrawal = 20;
      if (amt < minWithdrawal) {
        triggerNotification(`⚠️ Minimum penarikan koin adalah ${minWithdrawal} LDR!`);
        return;
      }

      if (profile.ldrBalance < amt) {
        triggerNotification("⚠️ Saldo koin LDR Anda tidak mencukupi untuk melakukan penarikan.");
        return;
      }
    } else {
      // Constraints check for Rupiah (Rp)
      const minWithdrawalRupiah = 10000;
      if (amt < minWithdrawalRupiah) {
        triggerNotification(`⚠️ Minimum penarikan saldo adalah Rp ${minWithdrawalRupiah.toLocaleString("id-ID")}!`);
        return;
      }

      const playerRp = profile.rupiahBalance || 0;
      if (playerRp < amt) {
        triggerNotification("⚠️ Saldo Rupiah Anda tidak mencukupi untuk melakukan penarikan.");
        return;
      }
    }

    const trimmedDest = destinationAccount.trim();
    if (!trimmedDest) {
      triggerNotification("⚠️ Nomor rekening, e-wallet, atau alamat crypto tidak boleh kosong!");
      return;
    }

    if (payoutMethod === "crypto" && trimmedDest.length < 15) {
      triggerNotification("⚠️ Alamat Crypto Wallet TRC-20 terdeteksi tidak valid!");
      return;
    }

    if ((payoutMethod === "bank" || payoutMethod === "ewallet") && (trimmedDest.length < 8 || isNaN(Number(trimmedDest.replace(/\s+/g, ""))))) {
      triggerNotification("⚠️ Nomor rekening atau nomor e-wallet harus berupa angka numerik valid (minimal 8 digit)!");
      return;
    }

    // Formulate conversion rates
    let convertedText = "";
    if (withdrawSource === 'ldr') {
      if (payoutMethod === "crypto") {
        convertedText = `${(amt * RATE_USDT_PER_LDR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
      } else {
        convertedText = `Rp ${(amt * RATE_RP_PER_LDR).toLocaleString("id-ID")}`;
      }
      // Deduct LDR coins from parent
      deductBalance(amt);
    } else {
      if (payoutMethod === "crypto") {
        const estUsdt = (amt / RATE_RP_PER_LDR) * RATE_USDT_PER_LDR;
        convertedText = `${estUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
      } else {
        convertedText = `Rp ${amt.toLocaleString("id-ID")}`;
      }
      // Deduct Rp from parent
      deductRupiahBalance(amt);
    }

    const newTxId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newTx: TransactionRecord = {
      id: newTxId,
      timestamp: new Date().toISOString(),
      method: `${payoutMethod.toUpperCase()} (${selectedProvider})`,
      destination: trimmedDest,
      amountLdr: withdrawSource === 'ldr' ? amt : parseFloat((amt / RATE_RP_PER_LDR).toFixed(2)),
      amountRupiah: withdrawSource === 'rupiah' ? amt : amt * RATE_RP_PER_LDR,
      amountFiatCurrency: convertedText,
      status: 'pending'
    };

    const nextTxList = [newTx, ...transactions];
    saveTransactionsToStorage(nextTxList);

    // Reset inputs
    setWithdrawAmount("");
    setDestinationAccount("");
    const unitText = withdrawSource === 'ldr' ? `${amt} LDR` : `Rp ${amt.toLocaleString("id-ID")}`;
    triggerNotification(`💸 Permintaan penarikan ${unitText} berhasil diajukan! Stasiun pertambangan mulai memproses...`);

    // Simulated pending-to-success background worker (10 seconds timeout)
    setTimeout(() => {
      // Find and update TX status
      setTransactions((prevTx) => {
        const updated = prevTx.map((tx) => {
          if (tx.id === newTxId) {
            return { ...tx, status: 'completed' as const };
          }
          return tx;
        });
        localStorage.setItem(getUserKey("ldr_miner_transactions"), JSON.stringify(updated));
        return updated;
      });

      // Insert new success payout notification alert
      const newAlert: AccountAlert = {
        id: `ALERT-TX-${newTxId}`,
        title: "🎉 Payout Sukses Diproses!",
        description: `Penarikan koin senilai ${unitText} (${convertedText}) ke akun ${selectedProvider} (${trimmedDest}) berhasil masuk ke jaringan pembayaran.`,
        timestamp: new Date().toISOString(),
        type: "payout",
        isRead: false
      };

      setAlerts((prevAlerts) => {
        const updatedAlerts = [newAlert, ...prevAlerts];
        localStorage.setItem(getUserKey("ldr_miner_alerts"), JSON.stringify(updatedAlerts));
        return updatedAlerts;
      });

      playUpgradeSound();
      triggerNotification(`✅ PAYOUT SELESAI: Koin senilai ${convertedText} diteruskan ke pemilik.`);
    }, 10000);
  };

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    playClickSound();
    const updated = alerts.map(a => ({ ...a, isRead: true }));
    saveAlertsToStorage(updated);
    triggerNotification("All notifications marked as read.");
  };

  // Clear all notifications
  const handleClearAlerts = () => {
    playClickSound();
    if (window.confirm("Apakah Anda ingin menghapus semua history notifikasi penting akun?")) {
      saveAlertsToStorage([]);
      triggerNotification("History notifikasi dihapus.");
    }
  };

  const getAlertIcon = (type: 'security' | 'market' | 'payout') => {
    switch (type) {
      case "security": return ShieldAlert;
      case "market": return Sparkles;
      case "payout": return Coins;
      default: return Bell;
    }
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto py-2 font-sans animate-fade-in">
      
      {/* Deposit vs Swap LDR System Section */}
      <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Fill Balance / Simulated Deposit Wallet */}
        <div id="deposit-section" className="bg-[#111625] border border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="text-emerald-400 shrink-0" size={20} />
            <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider font-mono">
              ⚡ ISI SALDO RUPIAH (DEPOSIT INSTAN)
            </h3>
          </div>
          
          <p className="text-xs text-gray-400 mb-4 font-normal leading-relaxed">
            Butuh Rupiah untuk membackup biaya gas reaktor (Rp 80 per Drop)? Gunakan pengisian instan via QRIS gratis untuk terus memproduksi mineral berkelas!
          </p>

          {activeDepositAmount !== null ? (
            <div className="space-y-4 pt-1">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">STATUS BILLING:</span>
                  <span className="text-[10px] bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 px-2 py-0.5 rounded font-mono font-bold animate-pulse">MENUNGGU TRANSFER</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white font-bold">TOTAL BAYAR:</span>
                  <span className="text-emerald-400 font-mono font-black">Rp {activeDepositAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed font-mono mt-1 bg-black/40 p-2.5 rounded-lg border border-gray-800">
                  METODE: <strong className="text-white">{activeDepositMethod}</strong>
                </div>
              </div>

              {/* QRIS Layout */}
              {activeDepositMethod === "QRIS" && (
                <div className="bg-gray-950/80 border border-gray-850 p-5 rounded-2xl text-center space-y-4 flex flex-col items-center">
                  <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-black bg-amber-500/10 px-2.5 py-1 rounded-md">
                    ⚡ PINDAI KODE QRIS MERCHANT DANA:
                  </p>
                  <div className="bg-white p-4 rounded-2xl border-4 border-amber-500/80 shadow-xl transition hover:scale-102 duration-300">
                    {adminQrisMethod === 'dynamic' ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(adminQrisPayload)}`} 
                        alt="Merchant QRIS" 
                        className="w-52 h-52 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-zinc-100 flex flex-col items-center justify-center text-center text-zinc-850 p-3 rounded-xl border border-dashed border-gray-300">
                        <span className="text-2xl font-black">📷 STATIC QR</span>
                        <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed font-sans">
                          Gunakan kode QRIS statis di galeri HP Anda
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 bg-[#090b11] p-3 rounded-lg border border-gray-850 max-w-xs">
                    <p className="text-[9.5px] text-zinc-400 font-mono leading-relaxed">
                      💡 <strong>TIPS PINDAI:</strong> Jika gagal, naikkan kecerahan layar HP Anda atau bersihkan lensa kamera sebelum melakukan scan e-wallet.
                    </p>
                  </div>
                  <p className="text-[9px] text-gray-450 font-mono leading-relaxed max-w-xs">
                    Screenshot layar ini lalu scan menggunakan Pemindai Pintar pada aplikasi <strong>DANA, ShopeePay, GoPay, OVO, LinkAja</strong> atau M-Banking Anda.
                  </p>
                </div>
              )}

              {/* GOPAY / DANA Method */}
              {activeDepositMethod === "GOPAY/DANA" && (
                <div className="bg-gray-950/80 border border-gray-850 p-5 rounded-2xl space-y-4 flex flex-col items-center text-center">
                  <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-black bg-blue-500/10 px-2.5 py-1 rounded-md">
                    📲 SCAN BARCODE DANA INSTANT:
                  </p>
                  
                  {/* Generated DANA Barcode for Direct Scanning */}
                  <div className="bg-white p-4 rounded-2xl border-4 border-blue-500 shadow-xl transition hover:scale-102 duration-300">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(`https://qr.dana.id/v1/2` + adminDanaNo.replace(/[^0-9]/g, ''))}`} 
                      alt="DANA Transfer Barcode" 
                      className="w-51 h-51 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <p className="text-[10px] text-gray-300 font-mono leading-relaxed max-w-xs bg-blue-950/20 p-2.5 rounded-lg border border-blue-900/30">
                    🤖 <strong>KODE TRANSFER COCOK DANA:</strong> Scan barcode di atas langsung lewat kamera pemindai aplikasi DANA Anda untuk deteksi otomatis tujuan pembayaran.
                  </p>

                  <div className="space-y-2.5 text-xs font-mono w-full text-left">
                    <div className="bg-[#0e1017] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block">NOMER DANA TUJUAN:</span>
                        <span className="text-white font-bold text-sm tracking-wide">{adminDanaNo}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(adminDanaNo); triggerNotification("Nomor DANA tersalin!"); }}
                        className="px-3 py-1.5 bg-blue-950/50 hover:bg-blue-900 border border-blue-800 text-blue-300 font-bold rounded-lg text-[10px] uppercase transition active:scale-95"
                      >
                        SALIN NOMOR
                      </button>
                    </div>
                    
                    <p className="text-[9.5px] text-gray-500 mt-1 italic text-center font-sans">
                      *Atau masukkan nominal transfer sejumlah <strong>Rp {activeDepositAmount.toLocaleString("id-ID")}</strong> ke nomor akun DANA admin di atas.
                    </p>
                  </div>
                </div>
              )}

              {/* Bank Transfer Method */}
              {activeDepositMethod === "BANK TRANSFER" && (
                <div className="bg-gray-950/80 border border-gray-850 p-4 rounded-xl space-y-3">
                  <p className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">REKENING TRANSFER BANK ADMIN:</p>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="bg-[#0e1017] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block">BANK BCA:</span>
                        <span className="text-white font-bold">{adminBcaNo}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(adminBcaNo); triggerNotification("No Rekening BCA tersalin!"); }}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-[9px]"
                      >
                        SALIN
                      </button>
                    </div>
                    <div className="bg-[#0e1017] p-3 rounded-lg border border-gray-800 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-gray-500 block">BANK MANDIRI:</span>
                        <span className="text-white font-bold">{adminMandiriNo}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(adminMandiriNo); triggerNotification("No Rekening Mandiri tersalin!"); }}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded text-[9px]"
                      >
                        SALIN
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1 italic">
                      *Lakukan pembayaran sesuai detail di atas untuk pengisian saldo Anda.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { playClickSound(); setActiveDepositAmount(null); }}
                  className="py-2 px-3 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white font-bold rounded-xl text-[10px] font-mono uppercase tracking-wider transition"
                >
                  BATAL
                </button>
                <button
                  type="button"
                  onClick={() => { playClickSound(); handleConfirmDepositPaid(); }}
                  className="py-2 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-extrabold rounded-xl text-[10px] font-mono uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition"
                >
                  KONFIRMASI BAYAR
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDepositRupiah} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  PILIH METODE PEMBAYARAN:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['QRIS', 'GOPAY/DANA', 'BANK TRANSFER'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { playClickSound(); setDepositMethod(m); }}
                      className={`py-2 px-2 rounded-lg text-[10px] font-bold font-mono transition text-center ${
                        depositMethod === m
                          ? "bg-emerald-500 text-black shadow-md border border-emerald-400"
                          : "bg-gray-950 text-gray-400 hover:text-white border border-gray-850"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  JUMLAH DEPOSIT (NOMINAL RP):
                </label>
                
                {/* Preset Deposit Nominal Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {["10000", "25000", "50000", "100000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { playClickSound(); setDepositAmount(preset); }}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold font-mono transition text-center border ${
                        depositAmount === preset
                          ? "bg-emerald-500 text-black shadow-md border-emerald-400 font-extrabold"
                          : "bg-gray-950 text-gray-400 hover:text-white hover:bg-gray-900 border-gray-800"
                      }`}
                    >
                      Rp {parseInt(preset).toLocaleString("id-ID")}
                    </button>
                  ))}
                </div>

                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500 font-mono text-xs">
                    Rp
                  </div>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Min. Rp 5.000"
                    min="5000"
                    step="1000"
                    className="w-full bg-gray-950 border border-gray-805 rounded-lg pl-9 pr-24 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-1 right-1 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-md text-[10px] font-mono uppercase transition"
                  >
                    ISI SALDO
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 font-mono mt-1">Saldo langsung ditambahkan ke akun untuk langsung digunakan bermain game.</p>
              </div>
            </form>
          )}
        </div>

        {/* Swap LDR vs Rupiah Dashboard */}
        <div className="bg-[#111625] border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="text-amber-400 shrink-0 animate-spin animate-duration-8000" size={18} />
            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider font-mono">
              🔄 SWAP ASSET ASING (LDR 🔁 RUPIAH)
            </h3>
          </div>
          
          <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-850 mb-4 text-xs font-bold font-mono">
            <button
              type="button"
              onClick={() => { playClickSound(); setSwapDirection('ldrToRp'); setSwapAmount(""); }}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                swapDirection === 'ldrToRp'
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400"
              }`}
            >
              LDR ➡️ Rupiah
            </button>
            <button
              type="button"
              onClick={() => { playClickSound(); setSwapDirection('rpToLdr'); setSwapAmount(""); }}
              className={`flex-1 py-1.5 rounded-lg text-center transition ${
                swapDirection === 'rpToLdr'
                  ? "bg-amber-500 text-black font-extrabold"
                  : "text-gray-400"
              }`}
            >
              Rupiah ➡️ LDR
            </button>
          </div>

          <form onSubmit={handleSwapLdr} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5 font-medium">
                  {swapDirection === 'ldrToRp' ? "JUMLAH SWAP LDR:" : "JUMLAH BELI LDR:"}
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500 font-mono text-xs">
                    🪙
                  </div>
                  <input
                    type="number"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    placeholder={swapDirection === 'ldrToRp' ? "LDR Koin" : "Beli LDR"}
                    min="0.1"
                    step="0.1"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-lg text-xs font-sans tracking-wide transition flex items-center justify-center gap-1"
                >
                  <span>KONVERSI SEKARANG</span>
                </button>
              </div>
            </div>

            {/* Live Swap Multiplier Calculation */}
            {swapAmount && !isNaN(parseFloat(swapAmount)) && parseFloat(swapAmount) > 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl text-[11px] font-mono leading-normal">
                <div className="flex justify-between">
                  <span className="text-gray-400">Kurs Konversi:</span>
                  <span className="text-white font-bold">1 LDR = Rp {(RATE_RP_PER_LDR).toLocaleString("id-ID")}</span>
                </div>
                <div className="h-px bg-gray-800 my-1 px-1" />
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">Hasil Swap Estimasi:</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 font-black">
                    {swapDirection === 'ldrToRp'
                      ? `Rp ${(parseFloat(swapAmount) * RATE_RP_PER_LDR).toLocaleString("id-ID")}`
                      : `Rp ${(parseFloat(swapAmount) * RATE_RP_PER_LDR).toLocaleString("id-ID")} (Memotong Saldo)`
                    }
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>

      </div>

      {/* Left Column: Form & Conversion Rate (8 cols on large screens, or 7) */}
      <div className="lg:col-span-7 space-y-5 text-left">
        
        {/* Core Withdrawal Widget Card */}
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2.5 mb-1">
            <Coins className="text-amber-400 shrink-0" size={24} />
            <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">
              Sistem Penarikan Koin LDR & Payout
            </h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xl mb-6">
            Konversikan hasil pertambangan koin LDR Anda langsung menjadi mata uang fiat atau aset digital. Pilih channel yang andal di bawah ini dan masukkan rincian pengiriman dengan benar.
          </p>

          {/* Quick Balance Preview Card */}
          <div className="bg-gray-950/75 border border-gray-850 p-4 rounded-xl flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Saldo Tambang LDR</span>
              <span className="text-lg font-bold font-mono text-amber-500 mt-1 block">
                🪙 {profile.ldrBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 })} LDR
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-gray-400 block uppercase tracking-wide">Saldo Hadiah Rp</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block font-mono">
                💸 Rp {(profile.rupiahBalance || 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Selector Tabs: Bank, EWallet, Crypto */}
          <div className="grid grid-cols-3 gap-2 bg-[#0d0f14] p-1.5 rounded-xl border border-gray-850 mb-5">
            <button
              onClick={() => handleMethodChange('ewallet')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                payoutMethod === "ewallet"
                  ? "bg-amber-500 text-black font-extrabold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Wallet size={16} />
              <span>E-Wallet</span>
            </button>

            <button
              onClick={() => handleMethodChange('bank')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                payoutMethod === "bank"
                  ? "bg-amber-500 text-black font-extrabold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Landmark size={16} />
              <span>Transfer Bank</span>
            </button>

            <button
              onClick={() => handleMethodChange('crypto')}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                payoutMethod === "crypto"
                  ? "bg-amber-500 text-black font-extrabold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Coins size={16} />
              <span>Aset Crypto Wallet</span>
            </button>
          </div>

          {/* Main Form Fields */}
          <form onSubmit={handleWithdrawClaim} className="space-y-4">
            
            {/* Field: Provider Options Dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                  METODE TUJUAN PAYOUT:
                </label>
                {payoutMethod === "ewallet" && (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-700 text-white text-xs rounded-lg py-2.5 px-3 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="DANA">DANA INDONESIA 🟢</option>
                    <option value="GOPAY">GO-PAY MULTIPAY 🔵</option>
                    <option value="OVO">OVO POINT PURPLE 🟣</option>
                    <option value="SHOPEEPAY">SHOPEE-PAY ORANGE 🟠</option>
                    <option value="LINKAJA">LINKAJA RED 🔴</option>
                  </select>
                )}

                {payoutMethod === "bank" && (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-700 text-white text-xs rounded-lg py-2.5 px-3 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="BCA">BANK BCA (Asia Central) 🏦</option>
                    <option value="MANDIRI">BANK MANDIRI 🏦</option>
                    <option value="BRI">BANK RAKYAT INDONESIA 🏦</option>
                    <option value="BNI">BANK NEGARA INDONESIA 🏦</option>
                    <option value="CIMB">CIMB NIAGA INDONESIA 🏦</option>
                  </select>
                )}

                {payoutMethod === "crypto" && (
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full bg-[#0d0f14] border border-gray-700 text-white text-xs rounded-lg py-2.5 px-3 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="USDT (TRC-20)">Tether USDT (TRC-20 Network) 🟢</option>
                    <option value="USDT (ERC-20)">Tether USDT (Ethereum ERC-20) 🔵</option>
                    <option value="SOLANA SOL">Solana Sol Wallet Address 🟣</option>
                    <option value="BINANCE BNB">Binance Smart Chain BNB Tracker 🟡</option>
                    <option value="BITCOIN BTC">Bitcoin Core Network BTC Wallet 🟠</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                  {withdrawSource === 'ldr' ? "JUMLAH KOIN UNTUK DITARIK:" : "JUMLAH RP UNTUK DITARIK:"}
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 font-mono text-xs">
                    {withdrawSource === 'ldr' ? "🪙" : "💸"}
                  </div>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={withdrawSource === 'ldr' ? "Min. 20 LDR" : "Min. Rp 10.000"}
                    min={withdrawSource === 'ldr' ? "20" : "10000"}
                    step={withdrawSource === 'ldr' ? "0.1" : "100"}
                    className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg pl-9 pr-14 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs font-semibold"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-orange-400 font-mono text-[9px] font-bold">
                    {withdrawSource === 'ldr' ? "LDR COIN" : "RUPIAH (IDR)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Account address input */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-1.5">
                {payoutMethod === "crypto" ? "ALAMAT REKENING DOMPET CRYPTO (CRYPTO ADDRESS):" : "NOMOR HANDPHONE / REKENING PENERIMA:"}
              </label>
              <input
                type="text"
                value={destinationAccount}
                onChange={(e) => setDestinationAccount(e.target.value)}
                placeholder={
                  payoutMethod === "crypto" 
                    ? "Contoh address: TWhqtS8nKqf881aPXmW9Lh77X2mB (Harus jaringan TRC-20)" 
                    : payoutMethod === "bank" 
                      ? "Contoh nomor rek: 8810237719 (BCA) - Tanpa tanda baca"
                      : "Contoh No Telp E-Wallet: 08123456789 - Terdaftar"
                }
                className="w-full bg-[#0d0f14] border border-gray-700 rounded-lg py-2.5 px-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            {/* Realtime Yield Calculations Preview */}
            {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-1.5 text-xs font-mono animate-fade-in text-left">
                <div className="flex justify-between">
                  <span className="text-gray-400">Jumlah Penarikan:</span>
                  <span className="text-white font-bold">
                    {withdrawSource === 'ldr'
                      ? `${parseFloat(withdrawAmount).toFixed(1)} LDR`
                      : `Rp ${parseFloat(withdrawAmount).toLocaleString("id-ID")}`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Komisi Administrasi:</span>
                  <span className="text-green-400 font-bold">0% (GALAKTIK FREE)</span>
                </div>
                <div className="h-px bg-gray-800" />
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400 font-bold">Diterima Pengguna (Estimasi):</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-green-400 font-black">
                    {payoutMethod === "crypto" 
                      ? withdrawSource === 'ldr'
                        ? `${(parseFloat(withdrawAmount) * RATE_USDT_PER_LDR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                        : `${((parseFloat(withdrawAmount) / RATE_RP_PER_LDR) * RATE_USDT_PER_LDR).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                      : withdrawSource === 'ldr'
                        ? `Rp ${(parseFloat(withdrawAmount) * RATE_RP_PER_LDR).toLocaleString("id-ID")}`
                        : `Rp ${parseFloat(withdrawAmount).toLocaleString("id-ID")}`
                    }
                  </span>
                </div>
                <p className="text-[9px] text-gray-500 text-center pt-1 italic">
                  *Dana akan diproses oleh stasiun reaktor penambangan. Status transaksi akan selesai dalam waktu singkat.
                </p>
              </div>
            )}

            {/* Error alerts warnings */}
            <div className="p-3.5 bg-gray-950/70 border border-gray-850 rounded-xl flex items-start gap-2 text-[11px] leading-snug text-gray-400 text-left">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                {withdrawSource === 'ldr' ? (
                  <span>Minimum pencairan adalah <strong>20 LDR COIN</strong>. Pengiriman sedang berjalan otomatis menggunakan blockchain LDR Core. Pastikan rincian tidak salah.</span>
                ) : (
                  <span>Minimum pencairan adalah <strong>Rp 10.000</strong>. Saldo bonus fusi ore dicairkan otomatis ke rekening bank atau e-wallet pilihan Anda.</span>
                )}
              </span>
            </div>

            {/* Submit Payout Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-black py-3 px-6 rounded-xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition"
            >
              <span>BUAT AJUAN PENARIKAN (WITHDRAWAL REQUISITION)</span>
              <ArrowUpRight size={16} />
            </button>

          </form>
        </div>

        {/* Transaction History Sub-Section */}
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2 font-mono">
              <Clock size={16} className="text-amber-400" />
              <span>LOG TRANSAKSI WITHDRAWAL</span>
            </h4>
            <span className="text-[10px] font-mono text-gray-500">
              Total ajuan: {transactions.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-xs text-gray-500 font-mono text-center py-6 block bg-gray-950/50 rounded-xl border border-gray-850">
                Belum ada transaksi keluar yang tercatat.
              </p>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="bg-gray-950/80 border border-gray-850 p-3 rounded-xl flex items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-extrabold">{tx.method}</span>
                      <span className="text-[10px] text-gray-500">ID: {tx.id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span>Penerima: <strong className="text-white">{tx.destination}</strong></span>
                      <span>•</span>
                      <span>{new Date(tx.timestamp).toLocaleString("id-ID", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute:"2-digit" })}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-amber-500 pointer-events-none block font-mono">
                      -{tx.amountLdr} LDR
                    </span>
                    <span className="text-[10px] font-extrabold text-teal-400 block">
                      ≈ {tx.amountFiatCurrency}
                    </span>

                    {/* Status badges */}
                    <div className="mt-1 flex justify-end">
                      {tx.status === "pending" ? (
                        <span className="text-[9px] font-bold uppercase p-0.5 px-2 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400 animate-pulse flex items-center gap-1 leading-none">
                          <span className="w-1 h-1 rounded-full bg-orange-400 animate-ping" />
                          <span>PROSES</span>
                        </span>
                      ) : tx.status === "completed" ? (
                        <span className="text-[9px] font-bold uppercase p-0.5 px-2 rounded-full bg-green-500/15 border border-green-500/25 text-green-400 flex items-center gap-1 leading-none">
                          <Check size={9} />
                          <span>SUKSES</span>
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase p-0.5 px-2 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 leading-none">
                          GAGAL
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Dynamic System / Account Alerts */}
      <div className="lg:col-span-12 xl:col-span-5 space-y-5">

        {/* Important Account Notifications Widget Widget */}
        <div className="bg-[#111420] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[480px]">
          
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-850 pb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-amber-400 animate-swing" />
                <h4 className="text-sm font-black text-white tracking-widest uppercase font-mono">
                  NOTIFIKASI PENTING AKUN
                </h4>
              </div>
              
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white font-mono font-black text-[10px] p-0.5 px-2 rounded-full">
                  {unreadCount} BARU
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-2.5 justify-end mb-4 text-[10px] font-mono">
              <button 
                onClick={handleMarkAllRead} 
                disabled={alerts.length === 0}
                className="text-gray-400 hover:text-amber-400 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={12} />
                <span>Tandai Dibaca</span>
              </button>
              <span className="text-gray-700">|</span>
              <button 
                onClick={handleClearAlerts}
                disabled={alerts.length === 0}
                className="text-gray-400 hover:text-rose-400 flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} />
                <span>Bersihkan</span>
              </button>
            </div>

            {/* List block */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="text-center py-10 font-mono text-gray-500 flex flex-col items-center justify-center gap-2.5 structure">
                  <Bell size={24} className="text-gray-700 pointer-events-none" />
                  <p className="text-xs">Stasiun tenang. Tidak ada notifikasi atau peringatan keamanan baru saat ini.</p>
                </div>
              ) : (
                alerts.map((al) => {
                  const Icon = getAlertIcon(al.type);
                  return (
                    <div 
                      key={al.id} 
                      className={`p-3.5 border rounded-xl flex gap-3 transition ${
                        al.isRead 
                          ? "bg-gray-950/40 border-gray-850/50 opacity-75" 
                          : "bg-gray-950/90 border-amber-500/25 shadow-md"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 h-8 w-8 flex items-center justify-center ${
                        al.type === "security" 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : al.type === "market" 
                            ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        <Icon size={16} />
                      </div>

                      <div className="grow min-w-0">
                        <div className="flex justify-between items-start gap-2 flex-wrap sm:flex-nowrap">
                          <h5 className="text-xs font-bold text-white tracking-tight leading-tight uppercase">
                            {al.title}
                          </h5>
                          <span className="text-[9px] font-mono text-gray-500 whitespace-nowrap">
                            {new Date(al.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                          {al.description}
                        </p>
                      </div>

                      {!al.isRead && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0 animate-ping" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="w-full bg-[#0d0f13] border border-gray-850 p-3.5 rounded-xl text-left mt-6 font-mono text-[10px] text-gray-500 space-y-1 structure">
            <span className="text-amber-500 font-bold block mb-1">📢 ATURAN KEAMANAN BLOK INTERSTELLAR:</span>
            <p className="leading-tight">
              1. Payout diproses terurut berbasis tumpukan blockchain (FIFO).
            </p>
            <p className="leading-tight">
              2. Data akun disimpan eksklusif pada storage enkripsi stasiun peramban lokal Anda demi kepatuhan kedaulatan koin pribadi.
            </p>
          </div>

        </div>

      </div>

      {showNoDepositModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-[#111625] border border-red-500/40 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            <div className="absolute -top-16 inset-x-0 h-32 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="w-14 h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ShieldAlert size={28} />
            </div>

            <h3 className="text-md font-bold text-white uppercase tracking-wider font-mono mb-2">
              🚨 AKSES DEPOSIT TERBATAS
            </h3>

            <p className="text-xs text-gray-300 font-mono leading-relaxed mb-6">
              pertambangan akun harus memiliki jumlah deposit untuk melakukan penarikan
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowNoDepositModal(false);
                  const depEl = document.getElementById("deposit-section");
                  if (depEl) {
                    depEl.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-650 hover:to-amber-650 text-white font-extrabold rounded-xl text-[10px] font-mono uppercase tracking-wider transition"
              >
                Isi Saldo Rupiah Sekarang
              </button>
              
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setShowNoDepositModal(false);
                }}
                className="w-full py-2 bg-gray-900 hover:bg-gray-850 text-gray-400 font-bold rounded-xl text-[10px] font-mono uppercase tracking-wider transition"
              >
                Tutup Peringatan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
