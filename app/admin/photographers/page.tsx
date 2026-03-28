"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import type { Photographer, Album } from "@/types";

export default function PhotographersManagementPage() {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    const supabase = createClient();
    const [photoResult, albumResult, assignResult] = await Promise.all([
      supabase.from("photographers").select("*").order("created_at", { ascending: false }),
      supabase.from("albums").select("*").order("event_date", { ascending: false }),
      supabase.from("album_photographers").select("*"),
    ]);

    setPhotographers(photoResult.data || []);
    setAlbums(albumResult.data || []);

    // Group assignments by photographer
    const grouped: Record<string, string[]> = {};
    (assignResult.data || []).forEach((a) => {
      if (!grouped[a.photographer_id]) grouped[a.photographer_id] = [];
      grouped[a.photographer_id].push(a.album_id);
    });
    setAssignments(grouped);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) return;
    setIsSaving(true);
    setError("");

    try {
      // Create auth user via API route (service role needed)
      const response = await fetch("/api/admin/create-photographer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          displayName: formName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create photographer");
        setIsSaving(false);
        return;
      }

      setShowForm(false);
      setFormName("");
      setFormEmail("");
      setFormPassword("");
      fetchData();
    } catch {
      setError("Something went wrong");
    }
    setIsSaving(false);
  };

  const toggleActive = async (photographer: Photographer) => {
    const supabase = createClient();
    await supabase
      .from("photographers")
      .update({ is_active: !photographer.is_active })
      .eq("id", photographer.id);
    fetchData();
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
    fetchData();
  };

  return (
    <div className="flex-1">
      <header className="flex items-center justify-between px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <h1 className="heading-display text-2xl">Photographers</h1>
        <Button variant="ruby" onClick={() => setShowForm(true)}>
          + ONBOARD NEW
        </Button>
      </header>

      <div className="px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {photographers.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-bf-gray-200/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-lg">{p.display_name}</h3>
                  <p className="text-sm text-bf-gray-400 font-sans">{p.id}</p>
                </div>
                <Toggle
                  checked={p.is_active}
                  onChange={() => toggleActive(p)}
                  label={p.is_active ? "Active" : "Inactive"}
                />
              </div>

              <div>
                <p className="label-ui text-bf-gray-400 text-[0.65rem] mb-2">ASSIGNED ALBUMS</p>
                <div className="flex flex-wrap gap-2">
                  {albums.map((album) => {
                    const isAssigned = (assignments[p.id] || []).includes(album.id);
                    return (
                      <button
                        key={album.id}
                        onClick={() => toggleAssignment(p.id, album.id)}
                        className={`text-xs font-sans px-3 py-1.5 rounded-full border transition-colors ${
                          isAssigned
                            ? "bg-rosegold text-white border-transparent"
                            : "border-bf-gray-200 text-bf-gray-400 hover:border-bf-gray-400"
                        }`}
                      >
                        {album.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {photographers.length === 0 && !isLoading && (
            <p className="text-editorial text-bf-gray-400 italic text-center py-16">
              No photographers onboarded yet.
            </p>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Onboard Photographer">
        <div className="space-y-4">
          <Input label="Display Name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Marco Di Luca" />
          <Input label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="photographer@email.com" />
          <Input label="Temporary Password" type="text" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Min 8 characters" error={error} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button variant="gradient" onClick={handleCreate} disabled={isSaving} className="flex-1">
              {isSaving ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
