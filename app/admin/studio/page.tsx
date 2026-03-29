"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { slugify, formatDateShort } from "@/lib/utils";
import Image from "next/image";
import type { Album, Photographer } from "@/types";

// ─── Avatar colour helper ───

function getAvatarColor(name: string): string {
  const colors = [
    "#C43D5C", "#C8956C", "#7B6B8D", "#4A8B7F", "#B85C3A",
    "#6B7DB3", "#9B6B5C", "#5B8A72", "#A0526B", "#7C8C5B",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ─── Recent activity formatter ───

function formatActivity(dateStr: string | null): string {
  if (!dateStr) return "No uploads yet";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Last upload today";
  if (diffDays === 1) return "Last upload yesterday";
  return `Last upload ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// ─── Album summary helper ───

function albumSummary(photographerId: string, assignedIds: string[], albumMap: Map<string, Album>): { text: string; count: number } {
  const assigned = assignedIds.filter((id) => albumMap.has(id));
  if (assigned.length === 0) return { text: "No albums assigned", count: 0 };

  const firstName = albumMap.get(assigned[0])?.name || "Unknown";
  if (assigned.length === 1) return { text: `1 album — ${firstName}`, count: 1 };
  return { text: `${assigned.length} albums — ${firstName} +${assigned.length - 1} more`, count: assigned.length };
}

// ─── Studio page ───

type Tab = "albums" | "photographers";
type StatusFilter = "all" | "active" | "inactive";
type SortMode = "recent" | "name";

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("albums");

  // ─── Album state ───
  const [albums, setAlbums] = useState<Album[]>([]);
  const [imageCounts, setImageCounts] = useState<Record<string, number>>({});
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [albumFormName, setAlbumFormName] = useState("");
  const [albumFormDescription, setAlbumFormDescription] = useState("");
  const [albumFormDate, setAlbumFormDate] = useState("");
  const [isAlbumSaving, setIsAlbumSaving] = useState(false);

  // ─── Photographer state ───
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [lastUploads, setLastUploads] = useState<Record<string, string>>({});
  const [isLoadingPhotographers, setIsLoadingPhotographers] = useState(true);
  const [showPhotographerForm, setShowPhotographerForm] = useState(false);
  const [photographerName, setPhotographerName] = useState("");
  const [photographerUsername, setPhotographerUsername] = useState("");
  const [photographerPassword, setPhotographerPassword] = useState("");
  const [isPhotographerSaving, setIsPhotographerSaving] = useState(false);
  const [photographerError, setPhotographerError] = useState("");

  // ─── Photographer filters & search ───
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  // ─── Detail drawer & Confirmations ───
  const [drawerPhotographer, setDrawerPhotographer] = useState<Photographer | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [photographerToDelete, setPhotographerToDelete] = useState<Photographer | null>(null);

  // ─── Album map for quick lookup ───
  const albumMap = useMemo(() => {
    const m = new Map<string, Album>();
    albums.forEach((a) => m.set(a.id, a));
    return m;
  }, [albums]);

  // ─── Filtered & sorted photographers ───
  const filteredPhotographers = useMemo(() => {
    let list = [...photographers];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.display_name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter === "active") list = list.filter((p) => p.is_active);
    if (statusFilter === "inactive") list = list.filter((p) => !p.is_active);

    // Sort
    if (sortMode === "name") {
      list.sort((a, b) => a.display_name.localeCompare(b.display_name));
    } else {
      // Sort by recent activity (most recent first, no uploads last)
      list.sort((a, b) => {
        const aDate = lastUploads[a.id] || "";
        const bDate = lastUploads[b.id] || "";
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate.localeCompare(aDate);
      });
    }

    return list;
  }, [photographers, searchQuery, statusFilter, sortMode, lastUploads]);

  // ─── Fetch all data ───

  const fetchAlbums = async () => {
    const supabase = createClient();
    const [albumResult, imageResult] = await Promise.all([
      supabase.from("albums").select("*").order("event_date", { ascending: false }),
      supabase.from("images").select("album_id"),
    ]);
    setAlbums(albumResult.data || []);

    const counts: Record<string, number> = {};
    (imageResult.data || []).forEach((img) => {
      counts[img.album_id] = (counts[img.album_id] || 0) + 1;
    });
    setImageCounts(counts);
    setIsLoadingAlbums(false);
  };

  const fetchPhotographers = async () => {
    const supabase = createClient();
    const [photoResult, assignResult, activityResult] = await Promise.all([
      supabase.from("photographers").select("*").order("created_at", { ascending: false }),
      supabase.from("album_photographers").select("*"),
      // Get most recent upload per photographer
      supabase.from("images").select("uploaded_by, created_at").order("created_at", { ascending: false }),
    ]);

    setPhotographers(photoResult.data || []);

    const grouped: Record<string, string[]> = {};
    (assignResult.data || []).forEach((a) => {
      if (!grouped[a.photographer_id]) grouped[a.photographer_id] = [];
      grouped[a.photographer_id].push(a.album_id);
    });
    setAssignments(grouped);

    // Build last upload map (first occurrence = most recent due to sort order)
    const uploads: Record<string, string> = {};
    (activityResult.data || []).forEach((img) => {
      if (img.uploaded_by && !uploads[img.uploaded_by]) {
        uploads[img.uploaded_by] = img.created_at;
      }
    });
    setLastUploads(uploads);
    setIsLoadingPhotographers(false);
  };

  useEffect(() => {
    async function loadInitialData() {
      await Promise.all([fetchAlbums(), fetchPhotographers()]);
    }
    loadInitialData();
  }, []);

  // ─── Album handlers ───

  const handleAlbumSave = async () => {
    if (!albumFormName.trim()) return;
    setIsAlbumSaving(true);
    const supabase = createClient();

    if (editingAlbum) {
      await supabase
        .from("albums")
        .update({
          name: albumFormName,
          slug: slugify(albumFormName),
          description: albumFormDescription || null,
          event_date: albumFormDate || null,
        })
        .eq("id", editingAlbum.id);
    } else {
      await supabase.from("albums").insert({
        name: albumFormName,
        slug: slugify(albumFormName),
        description: albumFormDescription || null,
        event_date: albumFormDate || null,
      });
    }

    setShowAlbumForm(false);
    setEditingAlbum(null);
    setAlbumFormName("");
    setAlbumFormDescription("");
    setAlbumFormDate("");
    setIsAlbumSaving(false);
    fetchAlbums();
  };

  const handleAlbumDelete = (albumId: string) => {
    setAlbumToDelete(albumId);
  };
  
  const executeAlbumDelete = async () => {
    if (!albumToDelete) return;
    const supabase = createClient();
    await supabase.from("albums").delete().eq("id", albumToDelete);
    setAlbumToDelete(null);
    fetchAlbums();
  };

  const openAlbumEdit = (album: Album) => {
    setEditingAlbum(album);
    setAlbumFormName(album.name);
    setAlbumFormDescription(album.description || "");
    setAlbumFormDate(album.event_date || "");
    setShowAlbumForm(true);
  };

  const openAlbumCreate = () => {
    setEditingAlbum(null);
    setAlbumFormName("");
    setAlbumFormDescription("");
    setAlbumFormDate("");
    setShowAlbumForm(true);
  };

  // ─── Photographer handlers ───

  const handlePhotographerCreate = async () => {
    if (!photographerName || !photographerUsername || !photographerPassword) return;
    setIsPhotographerSaving(true);
    setPhotographerError("");

    try {
      const response = await fetch("/api/admin/create-photographer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: photographerUsername,
          password: photographerPassword,
          displayName: photographerName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setPhotographerError(data.error || "Failed to create photographer");
        setIsPhotographerSaving(false);
        return;
      }

      setShowPhotographerForm(false);
      setPhotographerName("");
      setPhotographerUsername("");
      setPhotographerPassword("");
      fetchPhotographers();
    } catch {
      setPhotographerError("Something went wrong");
    }
    setIsPhotographerSaving(false);
  };

  const togglePhotographerActive = async (photographer: Photographer) => {
    const supabase = createClient();
    await supabase
      .from("photographers")
      .update({ is_active: !photographer.is_active })
      .eq("id", photographer.id);
    fetchPhotographers();
  };

  const toggleAssignment = async (photographerId: string, albumId: string) => {
    const supabase = createClient();
    const current = assignments[photographerId] || [];

    if (current.includes(albumId)) {
      await supabase
        .from("album_photographers")
        .delete()
        .eq("photographer_id", photographerId)
        .eq("album_id", albumId);
    } else {
      await supabase
        .from("album_photographers")
        .insert({ photographer_id: photographerId, album_id: albumId });
    }
    fetchPhotographers();
  };

  const deletePhotographer = (photographer: Photographer) => {
    setPhotographerToDelete(photographer);
  };

  const executePhotographerDelete = async () => {
    if (!photographerToDelete) return;
    
    try {
      const res = await fetch("/api/admin/delete-photographer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photographerToDelete.id }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete photographer");
        return;
      }
      
      setDrawerPhotographer(null);
      setPhotographerToDelete(null);
      fetchPhotographers();
    } catch {
      alert("Something went wrong deleting the photographer");
    }
  };

  // ─── Render ───

  return (
    <div className="flex-1 p-8 max-w-[1360px]">
      <PageHeader
        title="Studio"
        subtitle="Create and manage albums and photographers in one place."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="ruby" onClick={openAlbumCreate}>New Album</Button>
            <Button variant="ruby" onClick={() => setShowPhotographerForm(true)}>Add Photographer</Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-bf-gray-200">
        {(["albums", "photographers"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-sans font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-bf-ruby text-bf-black"
                : "border-transparent text-bf-gray-400 hover:text-bf-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Albums tab ─── */}
      {activeTab === "albums" && (
        <div className="bg-white rounded-xl border border-bf-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bf-gray-200">
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-6 py-3">Name</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-6 py-3 hidden md:table-cell">Date</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-6 py-3">Published</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-6 py-3">Bulk DL</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-6 py-3 hidden md:table-cell">Images</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {albums.map((album) => (
                  <tr key={album.id} className="border-b border-bf-gray-200/50 hover:bg-bf-cream/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {album.cover_image_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-bf-cream shrink-0 relative">
                            <Image
                              src={
                                album.cover_image_url.startsWith("http")
                                  ? album.cover_image_url
                                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${album.cover_image_url}`
                              }
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-bf-cream shrink-0" />
                        )}
                        <span className="font-serif">{album.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-sans text-bf-gray-400 hidden md:table-cell">
                      {album.event_date ? formatDateShort(album.event_date) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <Toggle
                        checked={album.is_published}
                        onChange={async (val) => {
                          const supabase = createClient();
                          await supabase.from("albums").update({ is_published: val }).eq("id", album.id);
                          fetchAlbums();
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Toggle
                        checked={album.bulk_download}
                        onChange={async (val) => {
                          const supabase = createClient();
                          await supabase.from("albums").update({ bulk_download: val }).eq("id", album.id);
                          fetchAlbums();
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-sans tabular-nums hidden md:table-cell">
                      {imageCounts[album.id] || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openAlbumEdit(album)} className="text-xs font-sans text-bf-rosegold-flat hover:underline">Edit</button>
                        <button onClick={() => handleAlbumDelete(album.id)} className="text-xs font-sans text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {albums.length === 0 && !isLoadingAlbums && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-bf-gray-400 italic font-serif">
                      No albums yet. Create your first event.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Photographers tab ─── */}
      {activeTab === "photographers" && (
        <div>
          {/* Utility bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-bf-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photographers"
                className="w-full pl-9 pr-3 py-2 text-sm font-sans border border-bf-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat placeholder:text-bf-gray-300"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center border border-bf-gray-200 rounded-lg overflow-hidden">
              {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-2 text-xs font-sans font-medium capitalize transition-colors ${
                    statusFilter === f
                      ? "bg-bf-cream text-bf-black"
                      : "text-bf-gray-400 hover:text-bf-black"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 text-xs font-sans border border-bf-gray-200 rounded-lg bg-white text-bf-gray-400 focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat"
            >
              <option value="name">Sort by name</option>
              <option value="recent">Sort by activity</option>
            </select>
          </div>

          {/* Compact table */}
          <div className="bg-white rounded-xl border border-bf-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bf-gray-200">
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-5 py-2.5">Photographer</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-5 py-2.5">Status</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-5 py-2.5 hidden md:table-cell">Assigned Albums</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-5 py-2.5 hidden lg:table-cell">Recent Activity</th>
                  <th className="text-left text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 px-5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPhotographers.map((p) => {
                  const initial = (p.display_name || "?")[0].toUpperCase();
                  const avatarColor = getAvatarColor(p.display_name || p.id);
                  const summary = albumSummary(p.id, assignments[p.id] || [], albumMap);
                  const activity = formatActivity(lastUploads[p.id] || null);

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-bf-gray-200/50 hover:bg-bf-cream/30 transition-colors cursor-pointer"
                      onClick={() => setDrawerPhotographer(p)}
                    >
                      {/* Photographer */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-sans font-bold text-xs shrink-0"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initial}
                          </div>
                          <span className="font-sans text-sm font-medium">{p.display_name}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-sans font-medium px-2 py-0.5 rounded-full ${
                            p.is_active
                              ? "bg-green-50 text-green-700"
                              : "bg-bf-gray-100 text-bf-gray-400"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? "bg-green-500" : "bg-bf-gray-300"}`} />
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Assigned Albums */}
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className={`text-sm font-sans ${summary.count === 0 ? "text-bf-gray-300 italic" : "text-bf-text-secondary"}`}>
                          {summary.text}
                        </span>
                      </td>

                      {/* Recent Activity */}
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className={`text-sm font-sans ${activity === "No uploads yet" ? "text-bf-gray-300 italic" : "text-bf-text-secondary"}`}>
                          {activity}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setDrawerPhotographer(p)}
                            className="text-xs font-sans text-bf-rosegold-flat hover:underline"
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => togglePhotographerActive(p)}
                            className="text-xs font-sans text-bf-gray-400 hover:text-bf-black hover:underline"
                          >
                            {p.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deletePhotographer(p)}
                            className="text-xs font-sans text-red-400 hover:text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPhotographers.length === 0 && !isLoadingPhotographers && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      {photographers.length === 0 ? (
                        <div>
                          <p className="text-bf-gray-400 font-sans text-sm mb-1">No photographers added yet.</p>
                          <p className="text-bf-gray-300 font-sans text-xs">Add your first photographer to start assigning albums.</p>
                        </div>
                      ) : (
                        <p className="text-bf-gray-400 font-sans text-sm italic">No photographers match your current filters.</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Photographer detail drawer ─── */}
      {drawerPhotographer && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setDrawerPhotographer(null)}
          />
          <aside className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-fade-in-up">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-bf-gray-200">
              <h2 className="font-sans font-semibold text-sm">Photographer Details</h2>
              <button
                onClick={() => setDrawerPhotographer(null)}
                className="w-8 h-8 rounded-full hover:bg-bf-cream flex items-center justify-center text-bf-gray-400"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-sans font-bold text-xl shrink-0"
                  style={{ backgroundColor: getAvatarColor(drawerPhotographer.display_name || drawerPhotographer.id) }}
                >
                  {(drawerPhotographer.display_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-xl">{drawerPhotographer.display_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-sans font-medium px-2 py-0.5 rounded-full ${
                        drawerPhotographer.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-bf-gray-100 text-bf-gray-400"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${drawerPhotographer.is_active ? "bg-green-500" : "bg-bf-gray-300"}`} />
                      {drawerPhotographer.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity */}
              <div>
                <p className="text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 mb-1">Activity</p>
                <p className="text-sm font-sans text-bf-text-secondary">
                  {formatActivity(lastUploads[drawerPhotographer.id] || null)}
                </p>
              </div>

              {/* System ID */}
              <div>
                <p className="text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 mb-1">System ID</p>
                <p className="text-xs font-sans text-bf-gray-300 font-mono break-all">{drawerPhotographer.id}</p>
              </div>

              {/* Assigned Albums — full management */}
              <div>
                <p className="text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 mb-2">
                  Assigned Albums ({(assignments[drawerPhotographer.id] || []).length})
                </p>
                <div className="space-y-1.5">
                  {albums.map((album) => {
                    const isAssigned = (assignments[drawerPhotographer.id] || []).includes(album.id);
                    return (
                      <button
                        key={album.id}
                        onClick={() => toggleAssignment(drawerPhotographer.id, album.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-sans transition-colors ${
                          isAssigned
                            ? "bg-bf-cream/80 text-bf-black"
                            : "text-bf-gray-400 hover:bg-bf-cream/40"
                        }`}
                      >
                        <span>{album.name}</span>
                        {isAssigned ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bf-ruby)" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <span className="text-xs text-bf-gray-300">Add</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-bf-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    togglePhotographerActive(drawerPhotographer);
                    setDrawerPhotographer(null);
                  }}
                  className="flex-1"
                >
                  {drawerPhotographer.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="gradient" onClick={() => setDrawerPhotographer(null)} className="flex-1">
                  Done
                </Button>
              </div>
              <button
                onClick={() => deletePhotographer(drawerPhotographer)}
                className="w-full text-center text-xs font-sans text-red-400 hover:text-red-600 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete photographer
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ─── Album modal ─── */}
      <Modal isOpen={showAlbumForm} onClose={() => setShowAlbumForm(false)} title={editingAlbum ? "Edit Album" : "New Album"}>
        <div className="space-y-4">
          <Input label="Album Name" value={albumFormName} onChange={(e) => setAlbumFormName(e.target.value)} placeholder="e.g. Golden Hour Brunch" />
          <div>
            <label className="text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 block mb-1">Description</label>
            <textarea
              value={albumFormDescription}
              onChange={(e) => setAlbumFormDescription(e.target.value)}
              placeholder="e.g. A curated editorial of moments captured at the scenic waterfront."
              className="w-full flex min-h-[80px] rounded-xl border border-bf-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-bf-gray-300 focus:outline-none focus:ring-2 focus:ring-bf-rosegold-flat transition-shadow resize-none"
            />
          </div>
          <Input label="Event Date" type="date" value={albumFormDate} onChange={(e) => setAlbumFormDate(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAlbumForm(false)} className="flex-1">Cancel</Button>
            <Button variant="gradient" onClick={handleAlbumSave} disabled={isAlbumSaving} className="flex-1">
              {isAlbumSaving ? "Saving..." : editingAlbum ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Photographer modal ─── */}
      <Modal isOpen={showPhotographerForm} onClose={() => setShowPhotographerForm(false)} title="Add Photographer">
        <div className="space-y-4">
          <Input label="Display Name" value={photographerName} onChange={(e) => setPhotographerName(e.target.value)} placeholder="e.g. Marco Di Luca" />
          <Input label="Username" value={photographerUsername} onChange={(e) => setPhotographerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="e.g. marco_event1" />
          <Input label="Password" type="text" value={photographerPassword} onChange={(e) => setPhotographerPassword(e.target.value)} placeholder="Min 6 characters" error={photographerError} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowPhotographerForm(false)} className="flex-1">Cancel</Button>
            <Button variant="gradient" onClick={handlePhotographerCreate} disabled={isPhotographerSaving} className="flex-1">
              {isPhotographerSaving ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      </Modal>
      {/* ─── Confirmation Modals ─── */}
      <ConfirmModal
        isOpen={!!albumToDelete}
        onClose={() => setAlbumToDelete(null)}
        onConfirm={executeAlbumDelete}
        title="Delete Album"
        message="Are you sure you want to delete this album and all its images? This action cannot be undone."
        confirmText="Delete Album"
      />

      <ConfirmModal
        isOpen={!!photographerToDelete}
        onClose={() => setPhotographerToDelete(null)}
        onConfirm={executePhotographerDelete}
        title="Remove Photographer"
        message={
          photographerToDelete
            ? `Are you sure you want to remove ${photographerToDelete.display_name}? This will revoke their access and re-assign all their uploads to you.`
            : ""
        }
        confirmText="Remove Photographer"
      />
    </div>
  );
}
