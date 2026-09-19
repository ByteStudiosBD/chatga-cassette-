"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListMusic, Map, Maximize2, Minimize2, Pause, Play, RotateCcw, Settings2, SkipBack, SkipForward, Timer, VolumeX, X } from "lucide-react";
import { defaultScenes } from "@/lib/default-scenes";
import type { PublicConfig, Scene } from "@/lib/types";

type Panel = "scenes" | "playlist" | "timer" | "sound" | null;

const bnDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
const media = (key: string | null) => key ? `/api/media/${encodeURIComponent(key)}` : "";

function clockParts() {
  const now = new Date();
  return {
    time: new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true }).format(now),
    date: new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" }).format(now),
  };
}

function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${bnDigits(Math.floor(safe / 60))}:${bnDigits(String(Math.floor(safe % 60)).padStart(2, "0"))}`;
}

export function ExperienceApp({ initialSlug }: { initialSlug: string | null }) {
  const [config, setConfig] = useState<PublicConfig>({ scenes: defaultScenes, tracks: [] });
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [panel, setPanel] = useState<Panel>(null);
  const [immersive, setImmersive] = useState(false);
  const [clock, setClock] = useState(clockParts);
  const [trackIndex, setTrackIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [ambiencePlaying, setAmbiencePlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.55);
  const [ambienceVolume, setAmbienceVolume] = useState(0.42);
  const [musicProgress, setMusicProgress] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);

  const activeScene = useMemo(() => config.scenes.find((scene) => scene.slug === slug) ?? config.scenes[0] ?? defaultScenes[0], [config.scenes, slug]);
  const activeTrack = config.tracks[trackIndex] ?? null;
  const isHome = slug === null;

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as PublicConfig : Promise.reject())
      .then((data: PublicConfig) => setConfig(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const music = new Audio();
    const ambience = new Audio();
    music.preload = "metadata";
    ambience.preload = "none";
    ambience.loop = true;
    music.volume = musicVolume;
    ambience.volume = ambienceVolume;
    const update = () => {
      setMusicProgress(music.currentTime || 0);
      setMusicDuration(music.duration || 0);
    };
    music.addEventListener("timeupdate", update);
    music.addEventListener("loadedmetadata", update);
    music.addEventListener("ended", () => setTrackIndex((current) => config.tracks.length ? (current + 1) % config.tracks.length : 0));
    musicRef.current = music;
    ambienceRef.current = ambience;
    return () => { music.pause(); ambience.pause(); };
  }, [config.tracks.length]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music || !activeTrack) return;
    const wasPlaying = musicPlaying;
    music.src = media(activeTrack.fileKey);
    music.load();
    if (wasPlaying) music.play().catch(() => setMusicPlaying(false));
  }, [activeTrack?.id]);

  useEffect(() => { if (musicRef.current) musicRef.current.volume = musicVolume; }, [musicVolume]);
  useEffect(() => { if (ambienceRef.current) ambienceRef.current.volume = ambienceVolume; }, [ambienceVolume]);

  useEffect(() => {
    const ambience = ambienceRef.current;
    if (!ambience) return;
    ambience.pause();
    setAmbiencePlaying(false);
    if (activeScene.ambienceKey) {
      ambience.src = media(activeScene.ambienceKey);
      ambience.load();
    } else {
      ambience.removeAttribute("src");
    }
  }, [activeScene.slug, activeScene.ambienceKey]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(clockParts()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const interval = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) { setTimerRunning(false); return 0; }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, timerSeconds > 0]);

  useEffect(() => {
    const onBack = () => {
      const match = window.location.pathname.match(/^\/scene\/([^/]+)/);
      setSlug(match ? decodeURIComponent(match[1]) : null);
      setPanel(null);
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  const go = useCallback((nextSlug: string | null) => {
    setSlug(nextSlug);
    setPanel(null);
    window.history.pushState({}, "", nextSlug ? `/scene/${encodeURIComponent(nextSlug)}` : "/");
  }, []);

  function toggleMusic() {
    const audio = musicRef.current;
    if (!audio || !activeTrack) { setPanel("playlist"); return; }
    if (musicPlaying) audio.pause(); else audio.play().catch(() => undefined);
    setMusicPlaying(!musicPlaying);
  }

  function changeTrack(direction: number) {
    if (!config.tracks.length) return;
    setTrackIndex((trackIndex + direction + config.tracks.length) % config.tracks.length);
    setMusicProgress(0);
  }

  function toggleAmbience() {
    const audio = ambienceRef.current;
    if (!audio || !activeScene.ambienceKey) return;
    if (ambiencePlaying) audio.pause(); else audio.play().catch(() => undefined);
    setAmbiencePlaying(!ambiencePlaying);
  }

  function chooseTrack(index: number) {
    setTrackIndex(index);
    setMusicPlaying(true);
    setPanel(null);
    window.setTimeout(() => musicRef.current?.play().catch(() => setMusicPlaying(false)), 30);
  }

  const sceneIndex = Math.max(0, config.scenes.findIndex((scene) => scene.slug === activeScene.slug));

  return (
    <main className={`memory-app ${immersive ? "is-immersive" : ""}`}>
      <div className="scene-stage" aria-hidden={isHome}>
        <div className="scene-blur" style={{ backgroundImage: `url(${activeScene.imageUrl})` }} />
        <img className="scene-full-image" src={activeScene.imageUrl} alt={`${activeScene.title} দৃশ্য`} />
        <div className="scene-treatment" />
      </div>

      {!isHome && <>
        <header className="memory-topbar">
          <button className="memory-brand" onClick={() => go(null)} aria-label="হোমে ফিরুন"><span className="memory-mark" /><span>চট্টগ্রামের স্মৃতি</span></button>
          <nav className="top-controls" aria-label="প্রধান নিয়ন্ত্রণ">
            <button className="text-control" onClick={() => setPanel("scenes")}><Map size={17} /><span>অন্য কোথাও</span></button>
            <button className="round-control" onClick={() => setPanel("timer")} aria-label="টাইমার"><Timer size={18} /></button>
            <button className="round-control" onClick={() => setPanel("sound")} aria-label="ভলিউম"><Settings2 size={18} /></button>
            <button className="round-control" onClick={() => setImmersive(!immersive)} aria-label="ইমার্সিভ মোড">{immersive ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          </nav>
        </header>
        <div className="chattogram-clock"><strong>{clock.time}</strong><span>{clock.date}</span><span>চট্টগ্রাম</span></div>
        <section className="scene-words">
          <span className="scene-count">স্মৃতি {bnDigits(String(sceneIndex + 1).padStart(2, "0"))}</span>
          <h1>{activeScene.title}</h1>
          {activeScene.subtitle && <p>{activeScene.subtitle}</p>}
        </section>
        <button className={`ambience-control ${ambiencePlaying ? "playing" : ""}`} onClick={toggleAmbience} disabled={!activeScene.ambienceKey} aria-label={ambiencePlaying ? "চারপাশের শব্দ থামান" : "চারপাশের শব্দ চালান"} title={activeScene.ambienceKey ? "চারপাশের শব্দ" : "এই scene-এ ambience এখনো যোগ হয়নি"}>
          <span className="ambience-bars"><i /><i /><i /></span>{ambiencePlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <section className="global-player" aria-label="গানের প্লেয়ার">
          <button className="track-meta" onClick={() => setPanel("playlist")}><span>{activeTrack?.title ?? "গান যোগ করা হয়নি"}</span><small>{activeTrack?.artist || "Admin থেকে MP3 যোগ করুন"}</small></button>
          <div className="player-buttons">
            <button onClick={() => changeTrack(-1)} disabled={!config.tracks.length} aria-label="আগের গান"><SkipBack size={17} /></button>
            <button className="main-play" onClick={toggleMusic} disabled={!config.tracks.length} aria-label={musicPlaying ? "গান থামান" : "গান চালান"}>{musicPlaying ? <Pause size={17} /> : <Play size={17} />}</button>
            <button onClick={() => changeTrack(1)} disabled={!config.tracks.length} aria-label="পরের গান"><SkipForward size={17} /></button>
            <button onClick={() => setPanel("playlist")} aria-label="গানের তালিকা"><ListMusic size={17} /></button>
          </div>
          <div className="player-progress"><span>{formatTime(musicProgress)}</span><input type="range" min="0" max={musicDuration || 1} value={Math.min(musicProgress, musicDuration || 1)} onChange={(event) => { const value = Number(event.target.value); if (musicRef.current) musicRef.current.currentTime = value; setMusicProgress(value); }} aria-label="গানের সময়" /><span>{formatTime(musicDuration)}</span></div>
        </section>
      </>}

      {isHome && <Home scenes={config.scenes} go={go} />}
      <div className={`panel-scrim ${panel ? "visible" : ""}`} onClick={() => setPanel(null)} />
      {panel && <aside className="memory-panel" aria-label="নিয়ন্ত্রণ প্যানেল">
        <div className="panel-heading"><h2>{panel === "scenes" ? "অন্য কোথাও" : panel === "playlist" ? "গানের তালিকা" : panel === "timer" ? "টাইমার" : "শব্দ"}</h2><button onClick={() => setPanel(null)} aria-label="বন্ধ করুন"><X size={19} /></button></div>
        {panel === "scenes" && <div className="location-list">{config.scenes.map((scene, index) => <button key={scene.slug} className={scene.slug === activeScene.slug ? "active" : ""} onClick={() => go(scene.slug)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{scene.title}</strong></button>)}</div>}
        {panel === "playlist" && <div className="playlist-list">{config.tracks.length ? config.tracks.map((track, index) => <button key={track.id} className={index === trackIndex ? "active" : ""} onClick={() => chooseTrack(index)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{track.title}<small>{track.artist}</small></strong>{index === trackIndex && musicPlaying ? <Pause size={15} /> : <Play size={15} />}</button>) : <div className="quiet-empty"><ListMusic size={27} /><p>এখনো কোনো গান যোগ করা হয়নি।</p><small>Admin dashboard থেকে MP3 upload করুন।</small></div>}</div>}
        {panel === "timer" && <TimerPanel seconds={timerSeconds} running={timerRunning} setSeconds={setTimerSeconds} setRunning={setTimerRunning} />}
        {panel === "sound" && <div className="sound-settings"><label><span>গানের ভলিউম</span><input type="range" min="0" max="1" step="0.01" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /></label><label><span>চারপাশের ভলিউম</span><input type="range" min="0" max="1" step="0.01" value={ambienceVolume} onChange={(event) => setAmbienceVolume(Number(event.target.value))} /></label><button onClick={() => { musicRef.current?.pause(); ambienceRef.current?.pause(); setMusicPlaying(false); setAmbiencePlaying(false); }}><VolumeX size={17} />সব শব্দ বন্ধ করুন</button></div>}
      </aside>}
      <div className="film-grain" />
    </main>
  );
}

function Home({ scenes, go }: { scenes: Scene[]; go: (slug: string | null) => void }) {
  const hero = scenes.find((scene) => scene.slug === "hatchi-ami-bhabchi-kotha") ?? scenes[0] ?? defaultScenes[0];
  return <section className="memory-home">
    <div className="home-background" style={{ backgroundImage: `url(${hero.imageUrl})` }} />
    <a className="admin-link" href="/admin">Admin</a>
    <div className="home-content"><span className="home-kicker">চেনা শহর • পুরোনো সময়</span><h1>আজ কোথায়<br />হারিয়ে যাবেন?</h1><p>একটা জায়গা বেছে নিন। তারপর শহরের শব্দ, পুরোনো সুর আর একটু অবসর—বাকিটা স্মৃতি নিজেই বলবে।</p>
      <div className="memory-grid">{scenes.map((scene, index) => <button key={scene.slug} onClick={() => go(scene.slug)}><img src={scene.imageUrl} alt="" /><span>{String(index + 1).padStart(2, "0")}</span><strong>{scene.title}</strong></button>)}</div>
    </div>
  </section>;
}

function TimerPanel({ seconds, running, setSeconds, setRunning }: { seconds: number; running: boolean; setSeconds: (value: number) => void; setRunning: (value: boolean) => void }) {
  return <div className="timer-panel"><p>কিছুক্ষণের জন্য শহরে থাকুন।</p><div className="timer-options">{[15, 30, 45, 60, 90].map((minutes) => <button key={minutes} onClick={() => { setSeconds(minutes * 60); setRunning(true); }}>{bnDigits(minutes)} মিনিট</button>)}</div><strong className="timer-readout">{formatTime(seconds)}</strong><div className="timer-actions"><button onClick={() => seconds && setRunning(!running)}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? "থামান" : "শুরু করুন"}</button><button onClick={() => { setSeconds(0); setRunning(false); }}><RotateCcw size={16} />রিসেট</button></div></div>;
}
