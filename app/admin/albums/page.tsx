"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { slugify, formatDateShort } from "@/lib/utils";
import type { Album } from "@/types";

export default function AlbumsManagementPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchAlbums = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("albums")
      .select("*")
      .order("event_date", { ascending: false });
    setAlbums(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchAlbums(); }, []);

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    const supabase = createClient();

    if (editingAlbum) {
      await supabase
        .from("albums")
        .update({
          name: formName,
          slug: slugify(formName),
          event_date: formDate || null,
        })
        .eq("id", editingAlbum.id);
    } else {
      await supabase.from("albums").insert({
        name: formName,
        slug: slugify(formName),
        event_date: formDate || null,
      });
    }

    setShowForm(false);
    setEditingAlbum(null);
    setFormName("");
    setFormDate("");
    setIsSaving(false);
    fetchAlbums();
  };

  const handleDelete = async (albumId: string) => {
    if (!confirm("Delete this album and all its images?")) return;
    const supabase = createClient();
    await supabase.from("albums").delete().eq("id", albumId);
    fetchAlbums();
  };

  const openEdit = (album: Album) => {
    setEditingAlbum(album);
    setFormName(album.name);
    setFormDate(album.event_date || "");
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingAlbum(null);
    setFormName("");
    setFormDate("");
    setShowForm(true);
  };

  return (
    <div className="flex-1">
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <h1 className="heading-display text-2xl">Albums</h1>
        <Button variant="ruby" onClick={openCreate}>
          + CREATE NEW ALBUM
        </Button>
      </header>

      <div className="px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-bf-gray-200/50 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bf-gray-200">
                <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">NAME</th>
                <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3 hidden md:table-cell">DATE</th>
                <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">PUBLISHED</th>
                <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">BULK DL</th>
                <th className="text-left label-ui text-bf-gray-400 text-[0.65rem] px-6 py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.id} className="border-b border-bf-gray-200/50">
                  <td className="px-6 py-4 font-serif">{album.name}</td>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(album)} className="label-ui text-xs text-bf-gray-400 hover:text-bf-black">Edit</button>
                      <button onClick={() => handleDelete(album.id)} className="label-ui text-xs text-bf-ruby hover:text-bf-ruby-dark">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingAlbum ? "Edit Album" : "Create Album"}>
        <div className="space-y-4">
          <Input label="Album Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Golden Hour Brunch" />
          <Input label="Event Date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button variant="gradient" onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? "Saving..." : editingAlbum ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
