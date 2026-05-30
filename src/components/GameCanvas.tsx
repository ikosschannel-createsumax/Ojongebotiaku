/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { ORE_DEFINITIONS, OreDefinition, PhysicsObject, Particle } from "../types";
import { playDropSound, playMergeSound, playPowerupSound, playGameOverSound, playUpgradeSound } from "../utils/audio";
import { Zap, Landmark, Award, Bomb, RefreshCw, Volume2, VolumeX, ArrowDownCircle } from "lucide-react";

interface GameCanvasProps {
  onMerge: (points: number, coins: number, maxMergedLevel: number) => void;
  coinsMultiplier: number;
  dynamiteCount: number;
  magnetCount: number;
  useDynamite: () => boolean;
  useMagnet: () => boolean;
  highScore: number;
  onGameOver: (score: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onDrop: () => boolean;
}

export default function GameCanvas({
  onMerge,
  coinsMultiplier,
  dynamiteCount,
  magnetCount,
  useDynamite,
  useMagnet,
  highScore,
  onGameOver,
  isMuted,
  onToggleMute,
  onDrop
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Canvas size coordinates
  const WIDTH = 380;
  const HEIGHT = 540;
  const DANGER_LINE_Y = 100;
  const DROP_SPAWN_Y = 55;

  // Game state
  const [currentScore, setCurrentScore] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [comboText, setComboText] = useState("");
  const [comboTimer, setComboTimer] = useState(0);

  // Active Ores state
  const [currentDropLevel, setCurrentDropLevel] = useState<number>(0);
  const [nextDropLevel, setNextDropLevel] = useState<number>(1);
  const [dropX, setDropX] = useState<number>(WIDTH / 2);
  const [isReadyToDrop, setIsReadyToDrop] = useState(true);
  const [dropCooldown, setDropCooldown] = useState(0);

  // Active tools
  const [isDynamiteActive, setIsDynamiteActive] = useState(false);
  const [isMagnetActive, setIsMagnetActive] = useState(false);

  // Game Over tracker
  const [isGameOverState, setIsGameOverState] = useState(false);
  const [dangerTimer, setDangerTimer] = useState<number>(0); // countdown in frames/seconds
  const [showDangerWarning, setShowDangerWarning] = useState(false);

  // Physics engine entities refs to prevent state-stale lag inside animation frame
  const objectsRef = useRef<PhysicsObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastScoreRef = useRef(0);
  const dangerTimerRef = useRef(0);
  const isGameOverStateRef = useRef(false);

  // Initialize drop queue
  useEffect(() => {
    generateNextDrop();
  }, []);

  const getRandomSpawnLevel = (): number => {
    // Drop tier ranges from 0 (Coal) to 4 (Silver) to keep merging challenging
    const roll = Math.random();
    if (roll < 0.35) return 0; // Coal (35%)
    if (roll < 0.65) return 1; // Copper (30%)
    if (roll < 0.82) return 2; // Iron (17%)
    if (roll < 0.93) return 3; // Quartz (11%)
    return 4; // Silver (7%)
  };

  const generateNextDrop = () => {
    setCurrentDropLevel(nextDropLevel);
    setNextDropLevel(getRandomSpawnLevel());
  };

  // Sound and feedback for score triggers
  const handleScoreAdd = (points: number, baseCoin: number, mergedLevel: number) => {
    lastScoreRef.current += points;
    setCurrentScore(lastScoreRef.current);

    const actualCoin = Number((baseCoin * coinsMultiplier).toFixed(2));
    onMerge(points, actualCoin, mergedLevel);

    // Dynamic combo counter
    setComboCount((prev) => {
      const nextCombo = prev + 1;
      setComboTimer(120); // 2 seconds at 60fps
      if (nextCombo > 1) {
        setComboText(`Combo x${nextCombo}! +${points * nextCombo} Pts`);
      }
      return nextCombo;
    });
  };

  // Drop execution
  const triggerDrop = () => {
    if (!isReadyToDrop || isGameOverState || isDynamiteActive || isMagnetActive) return;

    // Check gas fee of Rp 80
    if (onDrop && !onDrop()) {
      return; // Abort because user can't afford Rp 80 gas fee
    }

    // Spawn physics ball
    const definition = ORE_DEFINITIONS[currentDropLevel];
    const newObj: PhysicsObject = {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.max(definition.radius + 10, Math.min(WIDTH - definition.radius - 10, dropX)),
      y: DROP_SPAWN_Y,
      vx: (Math.random() - 0.5) * 0.4, // micro-random drift
      vy: 2.0, // initial downward slide
      radius: definition.radius,
      oreLevel: currentDropLevel,
      angle: Math.random() * Math.PI,
      angularVelocity: (Math.random() - 0.5) * 0.04,
      isMerging: false,
      scale: 0.1, // starts small and scales up instantly
      density: definition.radius * definition.radius
    };

    objectsRef.current.push(newObj);
    playDropSound();

    // Spawn visual smoke puffs at dropping position
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        x: newObj.x,
        y: newObj.y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.0,
        color: "rgba(200, 200, 200, 0.3)",
        radius: 3 + Math.random() * 4,
        alpha: 1.0,
        life: 0,
        maxLife: 20 + Math.random() * 20
      });
    }

    // Hot cooldown
    setIsReadyToDrop(false);
    setDropCooldown(40); // speed barrier input
  };

  // Dynamite powerup triggered
  const handleDynamitePowerup = () => {
    if (dynamiteCount <= 0 || isGameOverState) return;

    const success = useDynamite();
    if (success) {
      setIsDynamiteActive(true);
      playPowerupSound();

      // Trigger massive flash explosion
      // Remove all elements of Level 0 and 1
      const countBefore = objectsRef.current.length;
      const targetObjects = objectsRef.current.filter(o => o.oreLevel <= 1);
      objectsRef.current = objectsRef.current.filter(o => o.oreLevel > 1);

      // Create burst particles
      targetObjects.forEach((obj) => {
        const color = ORE_DEFINITIONS[obj.oreLevel].color;
        for (let p = 0; p < 15; p++) {
          particlesRef.current.push({
            x: obj.x,
            y: obj.y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            color: color,
            radius: 2 + Math.random() * 5,
            alpha: 1.0,
            life: 0,
            maxLife: 40 + Math.random() * 25
          });
        }
      });

      // Award small point consolation
      const pointsConsolidation = targetObjects.length * 4;
      if (pointsConsolidation > 0) {
        handleScoreAdd(pointsConsolidation, targetObjects.length * 0.2, 0);
      }

      setTimeout(() => {
        setIsDynamiteActive(false);
      }, 450);
    }
  };

  // Magnet powerup triggered
  const handleMagnetPowerup = () => {
    if (magnetCount <= 0 || isGameOverState) return;

    const success = useMagnet();
    if (success) {
      setIsMagnetActive(true);
      playPowerupSound();

      // Search for the closest matching pair of ores to merge them
      let bestPair: [PhysicsObject, PhysicsObject] | null = null;
      let minDistance = Infinity;

      const objects = objectsRef.current;
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          if (objects[i].oreLevel === objects[j].oreLevel && objects[i].oreLevel < 9) {
            const dist = Math.hypot(objects[j].x - objects[i].x, objects[j].y - objects[i].y);
            if (dist < minDistance) {
              minDistance = dist;
              bestPair = [objects[i], objects[j]];
            }
          }
        }
      }

      if (bestPair) {
        const [objA, objB] = bestPair;
        // Gravitate them towards each other in the game loop
        objA.vx = (objB.x - objA.x) * 0.15;
        objA.vy = (objB.y - objA.y) * 0.15 - 2;
        objB.vx = (objA.x - objB.x) * 0.15;
        objB.vy = (objA.y - objB.y) * 0.15 - 2;

        // Magnet visual lines
        for (let i = 0; i < 8; i++) {
          particlesRef.current.push({
            x: (objA.x + objB.x) / 2 + (Math.random() - 0.5) * 40,
            y: (objA.y + objB.y) / 2 + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: "#3498db",
            radius: 2 + Math.random() * 3,
            alpha: 0.9,
            life: 0,
            maxLife: 30
          });
        }
      }

      setTimeout(() => {
        setIsMagnetActive(false);
      }, 600);
    }
  };

  // Restart trigger
  const handleRestart = () => {
    objectsRef.current = [];
    particlesRef.current = [];
    lastScoreRef.current = 0;
    setCurrentScore(0);
    setDangerTimer(0);
    dangerTimerRef.current = 0;
    setShowDangerWarning(false);
    setIsGameOverState(false);
    isGameOverStateRef.current = false;
    setIsReadyToDrop(true);
    generateNextDrop();
  };

  // Main high-performance render and physics simulation effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const gravityObj = 0.38;
    const restitution = 0.18; // Heavy metal bounce
    const damping = 0.992; // Slight general deceleration
    const collisionIterations = 4; // Keeps stacked piles structurally solid

    // Drawing helper: draw item gradients inside the canvas high performance
    const drawOreRepresentation = (ctx: CanvasRenderingContext2D, obj: PhysicsObject) => {
      const def = ORE_DEFINITIONS[obj.oreLevel];
      const scale = obj.scale;
      const radius = obj.radius * scale;

      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.angle);

      // Glow effect for rarer gems
      if (def.glow) {
        ctx.shadowColor = def.glow;
        ctx.shadowBlur = 12 * scale;
      }

      // Outer metallic container
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
      gradient.addColorStop(0, def.borderColor);
      gradient.addColorStop(0.7, def.color);
      gradient.addColorStop(1, "#0a0a0c");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Specular highlight spot (makes it 3D glass-like)
      ctx.shadowBlur = 0; // reset
      ctx.beginPath();
      ctx.arc(-radius * 0.28, -radius * 0.28, radius * 0.26, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fill();

      // Inner ore outline
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Lettering/Decal (Symbol names matching gems)
      ctx.fillStyle = def.textColor;
      ctx.font = `bold ${Math.max(10, radius * 0.38)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Display emblem initials (e.g., C, Cu, Fe, Q, Ag, Au, Em, Sa, Rb, Am, LDR)
      const initials = 
        def.level === 0 ? "COAL" :
        def.level === 1 ? "Cu" :
        def.level === 2 ? "Fe" :
        def.level === 3 ? "QZ" :
        def.level === 4 ? "Ag" :
        def.level === 5 ? "Au" :
        def.level === 6 ? "EMR" :
        def.level === 7 ? "SAP" :
        def.level === 8 ? "RUB" :
        def.level === 9 ? "AMY" : "LDR";

      // Super crown overlay for Koin LDR
      if (def.level === 10) {
        ctx.fillStyle = "#F1C40F";
        ctx.fillText("🪙LDR", 0, 0);
      } else {
        ctx.fillText(initials, 0, 0);
      }

      ctx.restore();
    };

    // The physics loop
    const updatePhysics = () => {
      const objects = objectsRef.current;
      const particles = particlesRef.current;

      // 1. Cooldown & combo timer decay
      setDropCooldown((prev) => {
        if (prev > 0) {
          const next = prev - 1;
          if (next === 0) setIsReadyToDrop(true);
          return next;
        }
        return 0;
      });

      setComboTimer((prev) => {
        if (prev > 0) {
          return prev - 1;
        } else {
          setComboCount(0);
          setComboText("");
          return 0;
        }
      });

      // 2. Add scaling transitions of newly dropped materials
      objects.forEach((obj) => {
        if (obj.scale < 1.0) {
          obj.scale = Math.min(1.0, obj.scale + 0.18);
        }
      });

      // 3. Integrate gravity and velocity updates
      objects.forEach((obj) => {
        obj.vy += gravityObj;
        obj.vx *= damping;
        obj.vy *= damping;
        obj.x += obj.vx;
        obj.y += obj.vy;
        obj.angle += obj.angularVelocity;

        // Wall limits
        if (obj.x < obj.radius) {
          obj.x = obj.radius;
          obj.vx = -obj.vx * restitution;
          obj.angularVelocity += obj.vy * 0.01;
        } else if (obj.x > WIDTH - obj.radius) {
          obj.x = WIDTH - obj.radius;
          obj.vx = -obj.vx * restitution;
          obj.angularVelocity -= obj.vy * 0.01;
        }

        // Floor limits
        if (obj.y > HEIGHT - obj.radius) {
          obj.y = HEIGHT - obj.radius;
          obj.vy = -obj.vy * restitution;
          obj.vx *= 0.94; // additional slide floor friction
          obj.angularVelocity *= 0.95;
        }
      });

      // 4. Overlap solve iterations
      for (let iter = 0; iter < collisionIterations; iter++) {
        for (let i = 0; i < objects.length; i++) {
          const objA = objects[i];
          for (let j = i + 1; j < objects.length; j++) {
            const objB = objects[j];

            const dx = objB.x - objA.x;
            const dy = objB.y - objA.y;
            const dist = Math.hypot(dx, dy);
            const minDist = objA.radius + objB.radius;

            if (dist < minDist) {
              // Calculate overlap
              const overlap = minDist - dist;
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);

              // Push distance resolution
              const totalMass = objA.density + objB.density;
              const ratioA = objB.density / totalMass;
              const ratioB = objA.density / totalMass;

              objA.x -= overlap * nx * ratioA;
              objA.y -= overlap * ny * ratioA;
              objB.x += overlap * nx * ratioB;
              objB.y += overlap * ny * ratioB;

              // Check merge condition
              if (objA.oreLevel === objB.oreLevel && !objA.isMerging && !objB.isMerging) {
                const currentLvl = objA.oreLevel;
                
                // Let's merge standard tiers (up to level 9 -> level 10)
                if (currentLvl < 10) {
                  objA.isMerging = true;
                  objB.isMerging = true;

                  const midX = (objA.x + objB.x) / 2;
                  const midY = (objA.y + objB.y) / 2;
                  const nextLvl = currentLvl + 1;

                  // Create new merged object
                  setTimeout(() => {
                    // Filter out both merging items
                    objectsRef.current = objectsRef.current.filter(o => o.id !== objA.id && o.id !== objB.id);

                    // Add new upgraded ore
                    const nextDef = ORE_DEFINITIONS[nextLvl];
                    const mergedObj: PhysicsObject = {
                      id: Math.random().toString(36).substr(2, 9),
                      x: midX,
                      y: midY,
                      vx: (objA.vx + objB.vx) / 2,
                      vy: (objA.vy + objB.vy) / 2 - 1.5, // tiny upward pop/jump
                      radius: nextDef.radius,
                      oreLevel: nextLvl,
                      angle: Math.random() * Math.PI,
                      angularVelocity: (Math.random() - 0.5) * 0.05,
                      isMerging: false,
                      scale: 0.1,
                      density: nextDef.radius * nextDef.radius
                    };
                    objectsRef.current.push(mergedObj);

                    // Sound
                    playMergeSound(nextLvl);

                    // Stats payoff calculation
                    handleScoreAdd(nextDef.points, nextDef.coinReward, nextLvl);
                  }, 1);

                  // Burst aesthetic particles
                  const color = ORE_DEFINITIONS[currentLvl].color;
                  for (let p = 0; p < 12; p++) {
                    particles.push({
                      x: midX,
                      y: midY,
                      vx: (Math.random() - 0.5) * 6,
                      vy: (Math.random() - 0.5) * 6 - 2,
                      color: color,
                      radius: 2.5 + Math.random() * 4,
                      alpha: 1.0,
                      life: 0,
                      maxLife: 35 + Math.random() * 20
                    });
                  }
                  break; // exit inner nested iteration to prevent invalid indices
                } else {
                  // Max level collision bounce
                }
              }

              // Apply standard physical elastic bounce
              const rvx = objB.vx - objA.vx;
              const rvy = objB.vy - objA.vy;
              const velAlongNormal = rvx * nx + rvy * ny;

              if (velAlongNormal < 0) {
                const res = 0.22; // collision restitution
                const impulseScalar = -(1 + res) * velAlongNormal / (1 / objA.radius + 1 / objB.radius);

                objA.vx -= (impulseScalar / objA.radius) * nx;
                objA.vy -= (impulseScalar / objA.radius) * ny;
                objB.vx += (impulseScalar / objB.radius) * nx;
                objB.vy += (impulseScalar / objB.radius) * ny;
              }
            }
          }
        }
      }

      // 5. Update particles life
      particlesRef.current = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // tiny gravity on particles
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
        return p.life < p.maxLife;
      });

      // 6. Check Danger Line settlement (if ores pile up and break danger line)
      let dangerousSettled = false;
      objects.forEach((obj) => {
        // If an ore is settled above the danger line
        if (obj.y - obj.radius < DANGER_LINE_Y && obj.scale >= 0.9) {
          // Verify if it is standing relatively still or has been there
          if (Math.hypot(obj.vx, obj.vy) < 1.2) {
            dangerousSettled = true;
          }
        }
      });

      if (dangerousSettled && objects.length > 2) {
        dangerTimerRef.current += 1;
        const currentSeconds = Math.ceil((180 - dangerTimerRef.current) / 60);
        if (currentSeconds <= 0 && !isGameOverStateRef.current) {
          // Trigger Game Over!
          isGameOverStateRef.current = true;
          setIsGameOverState(true);
          playGameOverSound();
          onGameOver(lastScoreRef.current);
        } else {
          setDangerTimer(Math.max(0, currentSeconds));
          setShowDangerWarning(true);
        }
      } else {
        dangerTimerRef.current = Math.max(0, dangerTimerRef.current - 1);
        if (dangerTimerRef.current === 0) {
          setShowDangerWarning(false);
        }
      }
    };

    // Screen Render drawing frame
    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // A. Draw background grid cavern panel
      ctx.fillStyle = "#111420";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Aesthetic metallic background gird lines
      ctx.strokeStyle = "rgba(120, 160, 200, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < WIDTH; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < HEIGHT; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      }

      // B. Draw Spawn Area separator line (dashed)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, DROP_SPAWN_Y + 18);
      ctx.lineTo(WIDTH, DROP_SPAWN_Y + 18);
      ctx.stroke();

      // C. Draw Danger Line (high emphasis red line from the video)
      ctx.strokeStyle = showDangerWarning ? "rgba(231, 76, 60, 0.65)" : "rgba(231, 76, 60, 0.25)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, DANGER_LINE_Y);
      ctx.lineTo(WIDTH, DANGER_LINE_Y);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Label "DANGER LIMIT"
      ctx.fillStyle = showDangerWarning ? "#ef4444" : "rgba(239, 68, 68, 0.35)";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "right";
      ctx.fillText("WARN: MINE COLLISION LIMIT", WIDTH - 12, DANGER_LINE_Y - 6);

      // D. Draw drop placement pointer guide line
      if (isReadyToDrop && !isGameOverState && !isDynamiteActive && !isMagnetActive) {
        ctx.strokeStyle = "rgba(241, 196, 15, 0.2)";
        ctx.setLineDash([3, 10]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dropX, DROP_SPAWN_Y + 10);
        ctx.lineTo(dropX, HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]); // reset

        // Ready dropping sphere preview
        const previewDef = ORE_DEFINITIONS[currentDropLevel];
        ctx.save();
        ctx.translate(dropX, DROP_SPAWN_Y);
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.arc(0, 0, previewDef.radius, 0, Math.PI * 2);
        ctx.fillStyle = previewDef.color;
        ctx.fill();
        ctx.strokeStyle = previewDef.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // E. Draw active physics entities
      objectsRef.current.forEach((obj) => {
        drawOreRepresentation(ctx, obj);
      });

      // F. Draw particles
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // G. Dynamite / Magnet overlay feedback
      if (isDynamiteActive) {
        ctx.fillStyle = "rgba(231, 76, 60, 0.12)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.strokeStyle = "#e74c3c";
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, WIDTH, HEIGHT);
      }
      if (isMagnetActive) {
        ctx.fillStyle = "rgba(52, 152, 219, 0.08)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.strokeStyle = "#3498db";
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, WIDTH, HEIGHT);
      }
    };

    // The game loops core tickers
    const loop = () => {
      if (!isGameOverStateRef.current) {
        updatePhysics();
      }
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [currentDropLevel, dropX, isReadyToDrop, isGameOverState, showDangerWarning, isDynamiteActive, isMagnetActive]);

  // Pointer event handlers for dropping control
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isGameOverState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const boundedX = Math.max(25, Math.min(WIDTH - 25, clientX));
    setDropX(boundedX);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isGameOverState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const boundedX = Math.max(25, Math.min(WIDTH - 25, clientX));
    setDropX(boundedX);
  };

  const handlePointerUp = () => {
    triggerDrop();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center max-w-5xl mx-auto py-2">
      
      {/* High-fidelity physics canvas column */}
      <div className="flex flex-col items-center select-none bg-[#111420] border-2 border-gray-800 rounded-2xl shadow-xl p-4 w-full max-w-[420px] mx-auto shrink-0 relative overflow-hidden">
        
        {/* Background glow lines */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-amber-400 to-orange-500" />
        
        {/* Statistics Head Area */}
        <div className="w-full flex justify-between items-center mb-3">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-gray-500 block">CELESTIAL SCORE</span>
            <div className="text-2xl font-black font-mono text-white tracking-tight flex items-center gap-1">
              <Landmark className="text-amber-400 shrink-0" size={18} />
              <span>{currentScore.toLocaleString()}</span>
            </div>
          </div>

          {/* Combo overlay */}
          <div className="h-10 flex items-center text-right">
            {comboCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded text-xs font-mono text-amber-400 font-bold animate-bounce leading-none">
                {comboText || `Combo x${comboCount}`}
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono tracking-widest text-gray-500 block uppercase">YOUR RECORD</span>
            <div className="font-mono font-bold text-gray-300 text-sm flex items-center justify-end gap-1">
              <Award className="text-yellow-500 shrink-0" size={14} />
              <span>{Math.max(highScore, currentScore).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Next and Drop Previews box */}
        <div className="w-full bg-[#161a29] border border-gray-850 p-2.5 rounded-xl flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full animate-ping" style={{ backgroundColor: ORE_DEFINITIONS[currentDropLevel]?.color || "#fff" }} />
            <div className="leading-tight">
              <span className="text-[9px] font-mono text-gray-500 block">READY TO DROP</span>
              <span className="text-xs font-bold text-gray-200">
                {ORE_DEFINITIONS[currentDropLevel]?.localName} (Lv {currentDropLevel})
              </span>
            </div>
          </div>

          <div className="text-[9px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-md font-bold shrink-0 animate-pulse">
            💸 Gas: Rp 80 / Drop
          </div>

          {/* Next Queue Frame */}
          <div className="bg-gray-900/80 border border-gray-700 p-1.5 px-3 rounded-lg flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 font-bold">NEXT:</span>
            <div className="w-5 h-5 rounded-full border shadow" style={{ backgroundColor: ORE_DEFINITIONS[nextDropLevel]?.color || "#fff", borderColor: ORE_DEFINITIONS[nextDropLevel]?.borderColor || "#fff" }} />
            <span className="text-xs font-mono text-gray-400">
              Lv {nextDropLevel}
            </span>
          </div>
        </div>

        {/* The Actual canvas component */}
        <div 
          ref={containerRef} 
          className="relative bg-gray-950 rounded-xl overflow-hidden border border-gray-800 cursor-crosshair group shadow-inner shadow-black/80"
          style={{ width: `${WIDTH}px`, height: `${HEIGHT}px` }}
        >
          {/* Sektor Warning Screen alerts inside container */}
          {showDangerWarning && (
            <div className="absolute top-28 inset-x-0 mx-auto max-w-[280px] bg-red-950/90 border border-red-500 text-red-200 px-3 py-2 rounded-lg text-center animate-pulse z-30 shadow-lg font-mono">
              <p className="text-xs font-bold uppercase tracking-widest">⚠️ DANGER RADAR FULL ⚠️</p>
              <p className="text-[10px] text-red-400 mt-0.5 leading-tight">
                Clear the mine top in {dangerTimer} seconds before sector collapse!
              </p>
            </div>
          )}

          {/* Custom start instructions when empty */}
          {objectsRef.current.length === 0 && !isGameOverState && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center bg-transparent z-10">
              <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 text-amber-400 animate-pulse mb-3">
                <ArrowDownCircle size={32} />
              </div>
              <p className="text-sm font-bold text-gray-200">Touch Screen To Drop Minerals</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[240px]">
                Slide your finger or cursor sideways and release to drop minerals into the reactor.
              </p>
            </div>
          )}

          {/* Game Over Modal overlay */}
          {isGameOverState && (
            <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center p-6 text-center z-40 transition-all font-sans">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-full text-red-500 mb-2 animate-bounce">
                <Bomb size={40} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">Sector Collapsed!</h3>
              <p className="text-xs text-rose-500 font-mono mt-1">MINING SECTOR SUSPENDED</p>
              
              <div className="w-full bg-[#161a29] border border-gray-850 p-4 rounded-xl my-5 space-y-2 max-w-[260px] mx-auto text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Merging Points:</span>
                  <span className="font-mono text-white font-bold">{currentScore} Pts</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Rig Multiplier:</span>
                  <span className="font-mono text-amber-400 font-bold">x{(coinsMultiplier).toFixed(1)} Gain</span>
                </div>
                <div className="h-px bg-gray-800 my-1" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-500 font-semibold">Claimed LDR:</span>
                  <span className="font-mono text-green-400 font-bold text-sm">
                    🪙 +{(currentScore * 0.15 * coinsMultiplier).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => { playUpgradeSound(); handleRestart(); }}
                className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 text-[#0d0f14] hover:brightness-105 active:scale-95 font-bold rounded-xl text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 w-full max-w-[240px]"
              >
                <RefreshCw size={16} className="animate-spin" />
                <span>RESTART MINING</span>
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className="w-full h-full block"
          />
        </div>

        {/* Visual guide and tools panel at internal container footer */}
        <div className="w-full mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleDynamitePowerup}
            disabled={dynamiteCount <= 0 || isGameOverState || isDynamiteActive}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 border text-xs font-mono transition font-bold select-none ${
              dynamiteCount > 0 && !isGameOverState
                ? "bg-red-500/10 border-red-500/40 text-red-500 hover:bg-red-500/20 active:scale-95"
                : "bg-gray-900 border-gray-800 text-gray-500 cursor-not-allowed"
            }`}
            title="Meledakkan semua Batu Bara & Tembaga kecil agar lapang"
          >
            <Bomb size={16} />
            <span>DYNAMITE ({dynamiteCount})</span>
          </button>

          <button
            onClick={handleMagnetPowerup}
            disabled={magnetCount <= 0 || isGameOverState || isMagnetActive}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 border text-xs font-mono transition font-bold select-none ${
              magnetCount > 0 && !isGameOverState
                ? "bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20 active:scale-95"
                : "bg-gray-900 border-gray-800 text-gray-500 cursor-not-allowed"
            }`}
            title="Menarik dua mineral sejenis yang berdekatan agar segera membaur"
          >
            <Zap size={16} />
            <span>MAGNET ({magnetCount})</span>
          </button>
        </div>

      </div>

      {/* Instructional / Ore Upgrade Index Chart (Right columns in desktop, bottom in mobile) */}
      <div className="grow bg-[#141822] p-5 rounded-2xl border border-gray-800 w-full max-w-[500px] lg:max-w-none">
        <h3 className="text-sm font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-3">
          <span>📚 ORE EVOLUTION INDEX (LDR FUSION):</span>
        </h3>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed font-sans">
          Combine two mineral ores of the same kind to trigger them to evolve to a higher level. Merging high-value minerals generates large scores and instant LDR coins!
        </p>

        {/* Index timeline layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {ORE_DEFINITIONS.map((def) => {
            return (
              <div 
                key={def.level} 
                className="flex items-center gap-2.5 p-2 bg-[#181d2a] border border-gray-850 rounded-xl text-left"
              >
                {/* Visual Circle Representation */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow shrink-0 border-2"
                  style={{ 
                    backgroundColor: def.color, 
                    borderColor: def.borderColor,
                    color: def.textColor
                  }}
                >
                  <span className="scale-90 font-mono">
                    {def.level === 10 ? "🪙" : def.level}
                  </span>
                </div>
                <div className="overflow-hidden min-w-0 font-sans">
                  <h4 className="text-[11px] font-bold text-white truncate leading-tight">
                    {def.name}
                  </h4>
                  <span className="text-[10px] text-gray-500 block truncate leading-none mt-0.5 font-mono">
                    {def.localName}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 font-mono text-[9px]">
                    <span className="text-amber-400">+{def.points} Pts</span>
                    <span className="text-gray-400">🪙+{def.coinReward}</span>
                    {def.level >= 7 && (
                      <span className="text-emerald-400 font-bold block">
                        💸 +Rp {def.level === 7 ? "600" : def.level === 8 ? "2,500" : def.level === 9 ? "5,000" : "10,000"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-yellow-900/10 border border-yellow-700/20 p-3.5 rounded-xl mt-5 font-sans">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
            <span>🔥 DIAMOND STRATEGY:</span>
          </h4>
          <p className="text-xs text-gray-400 mt-1.5 leading-snug">
            Use the <span className="text-amber-400 font-medium">Super Pickaxe</span> in the mining rigs to accelerate your coin multiplier obtained from manual ore drops! Balance manual gameplay with purchasing automatic rigs to optimize your LDR coin flow.
          </p>
        </div>
      </div>

    </div>
  );
}
