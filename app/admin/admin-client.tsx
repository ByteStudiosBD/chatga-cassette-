"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ImageUp, KeyRound, ListMusic, Loader2, LogOut, Music2, Plus, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { PublicConfig, Scene, Track } from "@/lib/types";

type Feedback = { type: "error" | "success"; text: string } | null;

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error || "কাজটি সম্পন্ন হয়নি");
  return data as T;
}

export function AdminClient({ initialSession, ownerName }: { initialSession: boolean; ownerName: string }) {
  const [loggedIn, setLoggedIn] = useState(initialSession);
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState<PublicConfig>({ scenes: [], tracks: [] });
  const [loading, setLoading] = useState(initialSession);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { if (loggedIn) loadData(); }, [loggedIn]);

  async function loadData() {
    setLoading(true);
    try { setConfig(await api<PublicConfig>("/api/admin/data", { cache: "no-store" })); }
    catch (error) { setFeedback({ type: "error", text: error instanceof Error ? error.message : "Data লোড হয়নি" }); }
    finally { setLoading(false); }
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy("login"); setFeedback(null);
    try {
      await api("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      setLoggedIn(true); setPassword("");
    } catch (error) { setFeedback({ type: "error", text: error instanceof Error ? error.message : "Login হয়নি" }); }
    finally { setBusy(null); }
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    setLoggedIn(false); setConfig({ scenes: [], tracks: [] });
  }

  if (!loggedIn) return <main className="admin-shell"><form className="admin-login" onSubmit={login}><ShieldCheck size={28} className="text-primary" /><h1>Admin</h1><p>Website manage করতে তোমার admin password লিখো।</p><Label htmlFor="admin-password">পাসওয়ার্ড</Label><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required className="mt-2" />{feedback && <p className={feedback.type === "error" ? "admin-error" : "admin-success"}>{feedback.text}</p>}<Button type="submit" className="mt-4 w-full" disabled={busy === "login"}>{busy === "login" && <Loader2 className="animate-spin" />}Login</Button><a href="/" className="mt-5 block text-center text-sm text-muted-foreground">হোমে ফিরুন</a></form></main>;

  return <main className="admin-shell">
    <header className="admin-header"><div><h1>চট্টগ্রামের স্মৃতি — Admin</h1><p>{ownerName}</p></div><div className="flex gap-2"><Button asChild variant="outline" size="sm"><a href="/"><ArrowLeft />Website</a></Button><Button variant="ghost" size="sm" onClick={logout}><LogOut />Logout</Button></div></header>
    <div className="admin-main">
      {feedback && <p className={feedback.type === "error" ? "admin-error" : "admin-success"}>{feedback.text}</p>}
      <Tabs defaultValue="scenes">
        <TabsList variant="line" className="mb-7"><TabsTrigger value="scenes"><ImageUp />Scenes</TabsTrigger><TabsTrigger value="music"><ListMusic />Music</TabsTrigger><TabsTrigger value="security"><KeyRound />Security</TabsTrigger></TabsList>
        <TabsContent value="scenes">
          <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-xl">Scene ও page</h2><p className="text-sm text-muted-foreground">ছবি, লেখা, ambience এবং visibility এখান থেকে বদলাও।</p></div><AddSceneDialog open={addOpen} setOpen={setAddOpen} onCreated={loadData} /></div>
          {loading ? <Loading /> : <div className="admin-grid">{config.scenes.map((scene) => <SceneEditor key={scene.slug} scene={scene} onChange={(updated) => setConfig((current) => ({ ...current, scenes: current.scenes.map((item) => item.slug === scene.slug ? updated : item) }))} onSaved={() => setFeedback({ type: "success", text: `${scene.title} update হয়েছে` })} onError={(text) => setFeedback({ type: "error", text })} busy={busy} setBusy={setBusy} />)}</div>}
        </TabsContent>
        <TabsContent value="music"><MusicAdmin tracks={config.tracks} setTracks={(tracks) => setConfig((current) => ({ ...current, tracks }))} feedback={setFeedback} busy={busy} setBusy={setBusy} /></TabsContent>
        <TabsContent value="security"><SecurityAdmin feedback={setFeedback} busy={busy} setBusy={setBusy} /></TabsContent>
      </Tabs>
    </div>
  </main>;
}

function SceneEditor({ scene, onChange, onSaved, onError, busy, setBusy }: { scene: Scene; onChange: (scene: Scene) => void; onSaved: () => void; onError: (text: string) => void; busy: string | null; setBusy: (value: string | null) => void }) {
  const key = `scene-${scene.slug}`;
  async function upload(file: File, kind: "image" | "audio") {
    setBusy(`${key}-${kind}`);
    try {
      const form = new FormData(); form.append("file", file); form.append("kind", kind);
      const result = await api<{ key: string; url: string }>("/api/admin/upload", { method: "POST", body: form });
      onChange(kind === "image" ? { ...scene, imageKey: result.key, imageUrl: result.url } : { ...scene, ambienceKey: result.key });
    } catch (error) { onError(error instanceof Error ? error.message : "Upload হয়নি"); }
    finally { setBusy(null); }
  }
  async function save() {
    setBusy(key);
    try {
      await api(`/api/admin/scenes/${encodeURIComponent(scene.slug)}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(scene) }); onSaved();
    } catch (error) { onError(error instanceof Error ? error.message : "Save হয়নি"); }
    finally { setBusy(null); }
  }
  return <article className="admin-scene-card"><div><img src={scene.imageUrl} alt="" /><p className="admin-upload-note mt-2">/{scene.slug}</p></div><div><div className="admin-form-grid"><label className="admin-field"><span>Page name</span><Input value={scene.title} onChange={(event) => onChange({ ...scene, title: event.target.value })} /></label><label className="admin-field"><span>Order</span><Input type="number" value={scene.sortOrder} onChange={(event) => onChange({ ...scene, sortOrder: Number(event.target.value) })} /></label><label className="admin-field full"><span>ছোট লেখা</span><Textarea value={scene.subtitle} onChange={(event) => onChange({ ...scene, subtitle: event.target.value })} rows={2} /></label></div><div className="admin-actions"><Button size="sm" variant="outline" asChild><label className="cursor-pointer"><Upload />ছবি বদলাও<input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "image")} /></label></Button><Button size="sm" variant="outline" asChild><label className="cursor-pointer"><Music2 />Ambience MP3<input className="hidden" type="file" accept="audio/*,.mp3" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "audio")} /></label></Button><span className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={scene.isActive} onCheckedChange={(checked) => onChange({ ...scene, isActive: checked })} />Visible</span><Button size="sm" className="ml-auto" onClick={save} disabled={busy?.startsWith(key)}>{busy?.startsWith(key) ? <Loader2 className="animate-spin" /> : <Save />}Save</Button></div>{scene.ambienceKey && <p className="admin-upload-note mt-2">Ambience যোগ হয়েছে ✓</p>}</div></article>;
}

function AddSceneDialog({ open, setOpen, onCreated }: { open: boolean; setOpen: (open: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState(""); const [subtitle, setSubtitle] = useState(""); const [error, setError] = useState("");
  async function create() { try { await api("/api/admin/scenes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, slug, subtitle, sortOrder: 99 }) }); setOpen(false); setTitle(""); setSlug(""); setSubtitle(""); onCreated(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Page তৈরি হয়নি"); } }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus />নতুন page</Button></DialogTrigger><DialogContent className="admin-dialog"><DialogHeader><DialogTitle>নতুন স্মৃতি যোগ করুন</DialogTitle></DialogHeader><div className="grid gap-4"><label className="admin-field"><span>Page name</span><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="যেমন: শীতের সকাল" /></label><label className="admin-field"><span>URL slug</span><Input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="shiter-shokal" /></label><label className="admin-field"><span>ছোট লেখা</span><Textarea value={subtitle} onChange={(event) => setSubtitle(event.target.value)} /></label>{error && <p className="admin-error">{error}</p>}</div><DialogFooter><Button onClick={create}>Page তৈরি করুন</Button></DialogFooter></DialogContent></Dialog>;
}

function MusicAdmin({ tracks, setTracks, feedback, busy, setBusy }: { tracks: Track[]; setTracks: (tracks: Track[]) => void; feedback: (value: Feedback) => void; busy: string | null; setBusy: (value: string | null) => void }) {
  const [title, setTitle] = useState(""); const [artist, setArtist] = useState(""); const [file, setFile] = useState<File | null>(null);
  async function addTrack(event: FormEvent) { event.preventDefault(); if (!file) return; setBusy("music"); try { const form = new FormData(); form.append("file", file); form.append("kind", "audio"); const uploaded = await api<{ key: string }>("/api/admin/upload", { method: "POST", body: form }); const result = await api<{ track: Track }>("/api/admin/tracks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, artist, fileKey: uploaded.key }) }); setTracks([...tracks, result.track]); setTitle(""); setArtist(""); setFile(null); feedback({ type: "success", text: "গান playlist-এ যোগ হয়েছে" }); } catch (error) { feedback({ type: "error", text: error instanceof Error ? error.message : "গান যোগ হয়নি" }); } finally { setBusy(null); } }
  async function remove(id: number) { try { await api("/api/admin/tracks", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); setTracks(tracks.filter((track) => track.id !== id)); } catch (error) { feedback({ type: "error", text: error instanceof Error ? error.message : "Delete হয়নি" }); } }
  return <><form className="upload-card" onSubmit={addTrack}><Music2 className="text-primary" /><h2>MP3 upload</h2><p>একবার upload করলে গানটি global playlist-এ থাকবে এবং scene বদলালেও চলতে থাকবে।</p><div className="admin-form-grid"><label className="admin-field"><span>গানের নাম</span><Input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="admin-field"><span>Artist</span><Input value={artist} onChange={(event) => setArtist(event.target.value)} /></label><label className="admin-field full"><span>MP3 file</span><Input type="file" accept="audio/*,.mp3" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label></div><Button className="mt-4" type="submit" disabled={busy === "music"}>{busy === "music" ? <Loader2 className="animate-spin" /> : <Upload />}Upload ও যোগ করুন</Button></form><div className="music-admin-list">{tracks.map((track, index) => <div className="music-admin-row" key={track.id}><span className="text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><div>{track.title}<small>{track.artist}</small></div><Button size="icon-sm" variant="ghost" onClick={() => remove(track.id)} aria-label="গান মুছুন"><Trash2 /></Button></div>)}</div></>;
}

function SecurityAdmin({ feedback, busy, setBusy }: { feedback: (value: Feedback) => void; busy: string | null; setBusy: (value: string | null) => void }) {
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirm, setConfirm] = useState("");
  async function change(event: FormEvent) { event.preventDefault(); if (newPassword !== confirm) { feedback({ type: "error", text: "নতুন পাসওয়ার্ড দুবার একইভাবে লিখুন" }); return; } setBusy("password"); try { await api("/api/admin/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) }); setCurrentPassword(""); setNewPassword(""); setConfirm(""); feedback({ type: "success", text: "Admin password বদলানো হয়েছে" }); } catch (error) { feedback({ type: "error", text: error instanceof Error ? error.message : "Password বদলানো যায়নি" }); } finally { setBusy(null); } }
  return <form className="security-card" onSubmit={change}><KeyRound className="text-primary" /><h2>Admin password বদলান</h2><p>কমপক্ষে ১০ অক্ষরের শক্ত পাসওয়ার্ড ব্যবহার করুন।</p><div className="grid gap-4"><label className="admin-field"><span>বর্তমান পাসওয়ার্ড</span><Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label className="admin-field"><span>নতুন পাসওয়ার্ড</span><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required /></label><label className="admin-field"><span>নতুন পাসওয়ার্ড আবার</span><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} minLength={10} required /></label></div><Button className="mt-4" type="submit" disabled={busy === "password"}>{busy === "password" ? <Loader2 className="animate-spin" /> : <KeyRound />}Password বদলান</Button></form>;
}

function Loading() { return <div className="flex items-center gap-2 py-16 text-muted-foreground"><Loader2 className="animate-spin" />লোড হচ্ছে…</div>; }
