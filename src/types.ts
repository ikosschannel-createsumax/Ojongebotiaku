/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MinerProfile {
  username: string;
  minerTag: string;
  avatar: string;
  role: string;
  level: number;
  experience: number;
  ldrBalance: number;
  rupiahBalance: number;
  highScore: number;
  registeredAt: string;
}

export interface OreDefinition {
  level: number;
  name: string;
  localName: string;
  color: string;
  borderColor: string;
  textColor: string;
  radius: number;
  points: number;
  coinReward: number;
  glow?: string;
  icon?: string;
}

export interface MiningRig {
  id: string;
  name: string;
  localName: string;
  description: string;
  cost: number;
  ldrPerSec: number;
  count: number;
  level: number;
  icon: string;
  category: 'passive' | 'active';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  current: number;
  completed: boolean;
  type: 'score' | 'balance' | 'merge_level' | 'rig_count';
  param?: number; // e.g. merge level 5 (Gold)
}

export interface PhysicsObject {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  oreLevel: number;
  angle: number;
  angularVelocity: number;
  isMerging: boolean;
  scale: number; // For merge/drop animation effects
  density: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

// Full game configuration of ores (levels 0-10) matching Suika Game mechanics
export const ORE_DEFINITIONS: OreDefinition[] = [
  {
    level: 0,
    name: "Coal",
    localName: "Batu Bara",
    color: "#2C3E50",
    borderColor: "#34495E",
    textColor: "#ECF0F1",
    radius: 18,
    points: 1,
    coinReward: 0.1,
  },
  {
    level: 1,
    name: "Copper",
    localName: "Bijih Tembaga",
    color: "#D35400",
    borderColor: "#E67E22",
    textColor: "#FDFEFE",
    radius: 25,
    points: 3,
    coinReward: 0.3,
  },
  {
    level: 2,
    name: "Iron",
    localName: "Bijih Besi",
    color: "#7F8C8D",
    borderColor: "#BDC3C7",
    textColor: "#1A252F",
    radius: 32,
    points: 6,
    coinReward: 0.6,
  },
  {
    level: 3,
    name: "Quartz",
    localName: "Kristal Kuarsa",
    color: "#AEB6BF",
    borderColor: "#D5D8DC",
    textColor: "#2C3E50",
    radius: 40,
    points: 10,
    coinReward: 1.2,
  },
  {
    level: 4,
    name: "Silver",
    localName: "Bijih Perak",
    color: "#85929E",
    borderColor: "#EBEDEF",
    textColor: "#2C3E50",
    radius: 48,
    points: 15,
    coinReward: 2.0,
    glow: "rgba(235, 237, 239, 0.4)"
  },
  {
    level: 5,
    name: "Gold",
    localName: "Emas Murni",
    color: "#F1C40F",
    borderColor: "#F39C12",
    textColor: "#1A252F",
    radius: 56,
    points: 25,
    coinReward: 3.5,
    glow: "rgba(241, 196, 15, 0.5)"
  },
  {
    level: 6,
    name: "Emerald",
    localName: "Batu Zamrud",
    color: "#2ECC71",
    borderColor: "#27AE60",
    textColor: "#1A252F",
    radius: 65,
    points: 38,
    coinReward: 6.0,
    glow: "rgba(46, 204, 113, 0.5)"
  },
  {
    level: 7,
    name: "Sapphire",
    localName: "Permata Safir",
    color: "#2980B9",
    borderColor: "#3498DB",
    textColor: "#FDFEFE",
    radius: 74,
    points: 55,
    coinReward: 10.0,
    glow: "rgba(52, 152, 219, 0.6)"
  },
  {
    level: 8,
    name: "Ruby",
    localName: "Permata Delima (Ruby)",
    color: "#C0392B",
    borderColor: "#E74C3C",
    textColor: "#FDFEFE",
    radius: 83,
    points: 80,
    coinReward: 18.0,
    glow: "rgba(231, 76, 60, 0.6)"
  },
  {
    level: 9,
    name: "Amethyst",
    localName: "Kristal Kecubung (Amethyst)",
    color: "#8E44AD",
    borderColor: "#9B59B6",
    textColor: "#FDFEFE",
    radius: 93,
    points: 120,
    coinReward: 32.0,
    glow: "rgba(155, 89, 182, 0.7)"
  },
  {
    level: 10,
    name: "LDR Coin",
    localName: "KOIN EMAS LDR 👑",
    color: "#D4AC0D",
    borderColor: "#F4D03F",
    textColor: "#1A252F",
    radius: 105,
    points: 250,
    coinReward: 100.0,
    glow: "rgba(244, 208, 63, 0.85)"
  }
];

export const INITIAL_RIGS: MiningRig[] = [
  {
    id: "pickaxe",
    name: "Hyper Pickaxe",
    localName: "Beliung Super",
    description: "Meningkatkan daya ketukan manual dan bonus koin penggabungan aktif sebesar +15%.",
    cost: 15,
    ldrPerSec: 0,
    count: 0,
    level: 1,
    icon: "Pickaxe",
    category: "active"
  },
  {
    id: "belt",
    name: "Conveyor Sifter",
    localName: "Konveyor Saringan",
    description: "Membantu menyeleksi material secara konvensional. Menghasilkan 0.2 Koin LDR/detik.",
    cost: 50,
    ldrPerSec: 0.2,
    count: 0,
    level: 1,
    icon: "Layers",
    category: "passive"
  },
  {
    id: "drill",
    name: "Steam-Powered Drill",
    localName: "Bor Tambang Uap",
    description: "Bor bertenaga uap berotasi tinggi untuk memecah batuan keras. Menghasilkan 1.5 Koin LDR/detik.",
    cost: 250,
    ldrPerSec: 1.5,
    count: 0,
    level: 1,
    icon: "Cpu",
    category: "passive"
  },
  {
    id: "laser",
    name: "Plasma Meltdown Rig",
    localName: "Rig Pelebur Plasma",
    description: "Sinar laser energi murni untuk melelehkan batuan luar angkasa. Menghasilkan 8.0 Koin LDR/detik.",
    cost: 1200,
    ldrPerSec: 8.0,
    count: 0,
    level: 1,
    icon: "Zap",
    category: "passive"
  },
  {
    id: "neural_miner",
    name: "Neural AI Miner Bot",
    localName: "Robot Penambang AI",
    description: "Robot pintar penjelajah kerak bumi dengan algoritma pengoptimalan laba. Menghasilkan 45.0 Koin LDR/detik.",
    cost: 6500,
    ldrPerSec: 45.0,
    count: 0,
    level: 1,
    icon: "Bot",
    category: "passive"
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_drop",
    title: "Penambang Pemula",
    description: "Mulai petualangan tambang dengan menjatuhkan mineral pertamamu.",
    target: 10,
    reward: 0.5,
    current: 0,
    completed: false,
    type: "score"
  },
  {
    id: "merge_iron",
    title: "Era Perunggu & Besi",
    description: "Berhasil menggabungkan bijih mineral hingga mencapai Bijih Besi (Level 2).",
    target: 2,
    reward: 1,
    current: 0,
    completed: false,
    type: "merge_level",
    param: 2
  },
  {
    id: "merge_gold",
    title: "Sentuhan Midar",
    description: "Dapatkan mineral Emas Murni (Level 5) melalui manipulasi fusi bijih.",
    target: 5,
    reward: 3.5,
    current: 0,
    completed: false,
    type: "merge_level",
    param: 5
  },
  {
    id: "ldr_miner_hero",
    title: "Sang Alkemis LDR",
    description: "Lahirkan Legenda! Berhasil melahirkan Koin LDR Utama (Level 10).",
    target: 10,
    reward: 20,
    current: 0,
    completed: false,
    type: "merge_level",
    param: 10
  },
  {
    id: "earn_100",
    title: "Kolektor Koin Makmur",
    description: "Kumpulkan saldo koin LDR hingga mencapai 100 🪙 LDR.",
    target: 100,
    reward: 2,
    current: 0,
    completed: false,
    type: "balance"
  },
  {
    id: "earn_5000",
    title: "Tuan Tanah LDR",
    description: "Kumpulkan kekayaan fantastis senilai 5,000 🪙 LDR.",
    target: 5000,
    reward: 50,
    current: 0,
    completed: false,
    type: "balance"
  },
  {
    id: "rig_operator",
    title: "Juragan Rig Tambang",
    description: "Miliki akumulasi total 5 unit rig pertambangan otomatis komersial.",
    target: 5,
    reward: 5,
    current: 0,
    completed: false,
    type: "rig_count"
  }
];
