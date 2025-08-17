"use client";
import { useEffect, useRef, useState } from "react";

const GAME_W = 360;
const GAME_H = 620;

const PLAYER_W = 50;
const PLAYER_H = 46;
const PLAYER_Y = GAME_H - PLAYER_H - 20;

const HEART_SIZE = 28;
const SPEED_BASE = 120;
const SPEED_VAR = 80;
const SPAWN_MS = 900;

const MESSAGES = [
  "Seni çoook çok çok özledim 💕",
  "Dünyadaki en salak insan olabilirim ✨",
  "Seni son nefesime kadar seveceğim 🌸",
  "Hayatımın tek aşkı olduğun için teşekkür ederim 💝",
  "İyi ki varsın... 💖",
];

/** Basit ve hızlı kalp çizici (emoji yerine) — her cihazda görünür */
function drawHeartTopLeft(ctx, x, y, size, fill = "#ff4d8d", shadow = true) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = fill;

  // kalbi merkezlemek için biraz kaydır
  ctx.translate(x + size / 2, y + size * 0.38);

  ctx.beginPath();
  const s = size;
  // üst sol kavis
  ctx.moveTo(0, s * 0.35);
  ctx.bezierCurveTo(0, 0, s * 0.5, 0, s * 0.5, s * 0.35);
  // alt uç
  ctx.bezierCurveTo(s * 0.5, s * 0.9, 0, s, 0, s * 1.15);
  ctx.bezierCurveTo(0, s, -s * 0.5, s * 0.9, -s * 0.5, s * 0.35);
  // üst sağ kavis
  ctx.bezierCurveTo(-s * 0.5, 0, 0, 0, 0, s * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export default function Page() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [flashMsg, setFlashMsg] = useState("");
  const [playerX, setPlayerX] = useState(GAME_W / 2 - PLAYER_W / 2);

  const heartsRef = useRef([]); // {x,y,speed}
  const lastTimeRef = useRef(0);
  const spawnAccRef = useRef(0);

  // en iyi skor
  useEffect(() => {
    const b = Number(localStorage.getItem("bestScore") || 0);
    setBest(b);
  }, []);
  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("bestScore", String(score));
    }
  }, [score, best]);

  // klavye kontrol
  useEffect(() => {
    const onKey = (e) => {
      if (!running) return;
      const step = 20;
      if (e.key === "ArrowLeft") setPlayerX((x) => Math.max(0, x - step));
      if (e.key === "ArrowRight") setPlayerX((x) => Math.min(GAME_W - PLAYER_W, x + step));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  const resetGame = () => {
    setScore(0);
    setFlashMsg("");
    setGameOver(false);
    heartsRef.current = [];
    spawnAccRef.current = 0;
    lastTimeRef.current = performance.now();
    setRunning(true);
  };

  // oyun döngüsü (canvas)
  useEffect(() => {
    if (!running) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // mobilde netlik için DPR ölçeklemesi
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GAME_W * dpr;
    canvas.height = GAME_H * dpr;
    canvas.style.width = GAME_W + "px";
    canvas.style.height = GAME_H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const loop = (now) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      spawnAccRef.current += dt * 1000;

      // kalpleri güncelle
      for (const h of heartsRef.current) h.y += h.speed * dt;

      // çarpışma & kaçırma kontrolü
      let caught = 0;
      heartsRef.current = heartsRef.current.filter((h) => {
        const collide =
          h.y + HEART_SIZE >= PLAYER_Y &&
          h.y <= PLAYER_Y + PLAYER_H &&
          h.x + HEART_SIZE >= playerX &&
          h.x <= playerX + PLAYER_W;

        if (collide) {
          caught++;
          return false;
        }
        if (h.y > GAME_H) {
          setRunning(false);
          setGameOver(true);
          return false;
        }
        return true;
      });

      if (caught > 0) {
        setScore((s) => {
          const ns = s + caught;
          if (ns % 7 === 0) {
            const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
            setFlashMsg(msg);
            setTimeout(() => setFlashMsg(""), 1600);
          }
          return ns;
        });
      }

      // yeni kalp
      if (spawnAccRef.current >= SPAWN_MS) {
        spawnAccRef.current = 0;
        heartsRef.current.push({
          x: Math.random() * (GAME_W - HEART_SIZE),
          y: -HEART_SIZE,
          speed: SPEED_BASE + Math.random() * SPEED_VAR,
        });
      }

      // çizim
      ctx.clearRect(0, 0, GAME_W, GAME_H);

      // arka plan
      const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
      grad.addColorStop(0, "#ffe6f0");
      grad.addColorStop(1, "#e6f0ff");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // düşen kalpler (pastel pembe)
      for (const h of heartsRef.current) {
        drawHeartTopLeft(ctx, h.x, h.y, HEART_SIZE, "#ff5fa2", true);
      }

      // oyuncu kalbi (daha sıcak renk, hafif büyük)
      drawHeartTopLeft(ctx, playerX, PLAYER_Y, 36, "#ff3b8d", true);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame((t) => {
      lastTimeRef.current = t;
      loop(t);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [running, playerX]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 font-[Quicksand] bg-gradient-to-b from-pink-100 via-rose-50 to-indigo-100">
      <div
        className="relative rounded-3xl shadow-2xl border border-pink-200 bg-white/70 backdrop-blur-lg text-center overflow-hidden"
        style={{ width: GAME_W, height: GAME_H }}
        onMouseMove={(e) =>
          running &&
          setPlayerX(
            Math.max(
              0,
              Math.min(GAME_W - PLAYER_W, e.nativeEvent.offsetX - PLAYER_W / 2)
            )
          )
        }
        onTouchMove={(e) => {
          if (!running) return;
          const t = e.touches?.[0];
          if (t) {
            const rect = canvasRef.current.getBoundingClientRect();
            const relX = t.clientX - rect.left;
            setPlayerX(
              Math.max(0, Math.min(GAME_W - PLAYER_W, relX - PLAYER_W / 2))
            );
          }
        }}
      >
        {/* skor bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-sm z-10">
          <div className="bg-pink-200 text-pink-800 font-medium rounded-full px-3 py-1 shadow">
            Skor: <b>{score}</b>
          </div>
          <div className="bg-pink-200 text-pink-800 font-medium rounded-full px-3 py-1 shadow">
            En İyi: <b>{best}</b>
          </div>
        </div>

        {/* mesaj */}
        {flashMsg && (
          <div className="absolute left-1/2 -translate-x-1/2 top-16 bg-white/90 rounded-2xl px-4 py-2 text-center text-pink-600 shadow-md z-10">
            {flashMsg}
          </div>
        )}

        {/* başlangıç ekranı */}
        {!running && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
            <div className="text-4xl animate-bounce">💝</div>
            <h1 className="text-2xl font-semibold text-pink-700 drop-shadow">
              Biricik Dilrubama Oyun
            </h1>
            <p className="text-pink-700/80 text-sm">Başlamak için tıkla</p>
            <button
              onClick={resetGame}
              className="mt-2 px-6 py-2 rounded-full bg-pink-500 text-white font-medium shadow hover:scale-105 active:scale-95 transition"
            >
              Başla
            </button>
          </div>
        )}

        {/* oyun bitti ekranı */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur rounded-3xl z-20">
            <div className="text-5xl">💔</div>
            <h2 className="text-xl font-semibold text-pink-700">Oyun Bitti</h2>
            <h1 className="text-xl text-pink-400 text-center px-4">
              Sen bir kalp kaçırdın.
              <br />
              Fakat ben birlikte geçirebileceğimiz tonla güzel zamanı kaçırmak istemiyorum.
              <br />
              Bu oyunu beni affet diye yapmadım; sadece belki bir nebze yumuşamanı sağlamıştır umarım.
              <br />
              YENİLERİ ÇOK YAKINDAAA!
            </h1>
            <p className="text-sm text-pink-700/70">Skorun: {score}</p>
            <button
              onClick={resetGame}
              className="mt-2 px-6 py-2 rounded-full bg-pink-500 text-white font-medium shadow hover:scale-105 active:scale-95 transition"
            >
              Tekrar Başla
            </button>
          </div>
        )}

        {/* canvas */}
        <canvas ref={canvasRef} width={GAME_W} height={GAME_H} className="absolute inset-0" />
      </div>
    </div>
  );
}
