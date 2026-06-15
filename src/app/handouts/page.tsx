"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Eye,
  FileText,
  Gift,
  Home,
  ImageIcon,
  PackagePlus,
  Plus,
  Route,
  Save,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CampaignShell } from "@/components/campaign/CampaignShell";
import { MasterDetailLayout } from "@/components/campaign/MasterDetailLayout";
import type { SeatMode } from "@/components/campaign/SeatModeTabs";
import { GlassPanel } from "@/components/GlassPanel";
import { listCodexEntries } from "@/lib/codex/codexRepository";
import type { CodexEntry } from "@/lib/codex/types";
import { createRollLogEntry } from "@/lib/dice/log";
import {
  applyHandoutRewards,
  describeRewardGrant,
  summarizeRewardPayloads
} from "@/lib/handouts/applyHandoutRewards";
import {
  deleteHandout,
  getHandoutStorageMode,
  importStarterHandouts,
  listHandoutRewardApplications,
  listHandouts,
  revealHandout,
  saveHandout
} from "@/lib/handouts/handoutRepository";
import {
  HANDOUT_KINDS,
  HANDOUT_VISIBILITIES,
  LOCAL_DEMO_GAME_TABLE_ID,
  type Handout,
  type HandoutKind,
  type HandoutRewardApplication,
  type HandoutVisibility
} from "@/lib/handouts/types";
import type { RewardGrant } from "@/lib/loot/types";
import { DEFAULT_ROOM_SLUG } from "@/lib/rollLog/constants";
import type { CharacterProfile } from "@/lib/sheets/types";
import { useCampaignSeat } from "@/lib/session/useCampaignSeat";
import { listCharacters } from "@/lib/storage/characterRepository";
import {
  deleteHandoutFile,
  getHandoutFileUrl,
  uploadHandoutAttachment,
  uploadHandoutImage
} from "@/lib/storage/handoutFileStorage";
import { saveRollLog } from "@/lib/storage/rollLogRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import type { StorageMode } from "@/lib/storage/types";

type HandoutFormState = {
  id: string;
  kind: HandoutKind;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  imagePath: string;
  attachmentUrl: string;
  attachmentPath: string;
  attachmentName: string;
  attachmentMimeType: string;
  attachmentSize: string;
  visibility: HandoutVisibility;
  selectedPlayerIdsText: string;
  tagsText: string;
  gmNotes: string;
  rewardPayloadsJson: string;
  codexEntryIdsText: string;
  revealedAt: string;
};

type RewardBuilderState = {
  type: RewardGrant["type"];
  gp: string;
  sp: string;
  cp: string;
  xp: string;
  customKey: string;
  customValue: string;
  itemName: string;
  itemQuantity: string;
  itemRarity: string;
  itemNotes: string;
  itemCodexEntryId: string;
  conditionName: string;
  conditionDescription: string;
  conditionCodexEntryId: string;
  codexEntryId: string;
  noteTitle: string;
  noteBody: string;
};

const inputClass =
  "h-10 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-cyan-500/50";
const textAreaClass =
  "w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-500/50";

const emptyForm: HandoutFormState = {
  id: "",
  kind: "lore",
  title: "",
  subtitle: "",
  body: "",
  imageUrl: "",
  imagePath: "",
  attachmentUrl: "",
  attachmentPath: "",
  attachmentName: "",
  attachmentMimeType: "",
  attachmentSize: "",
  visibility: "gm_only",
  selectedPlayerIdsText: "",
  tagsText: "",
  gmNotes: "",
  rewardPayloadsJson: "[]",
  codexEntryIdsText: "",
  revealedAt: ""
};

const emptyRewardBuilder: RewardBuilderState = {
  type: "currency",
  gp: "",
  sp: "",
  cp: "",
  xp: "",
  customKey: "",
  customValue: "",
  itemName: "",
  itemQuantity: "1",
  itemRarity: "",
  itemNotes: "",
  itemCodexEntryId: "",
  conditionName: "",
  conditionDescription: "",
  conditionCodexEntryId: "",
  codexEntryId: "",
  noteTitle: "",
  noteBody: ""
};

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function numberFromInput(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed !== 0 ? parsed : undefined;
}

function formFromHandout(handout: Handout): HandoutFormState {
  return {
    id: handout.id,
    kind: handout.kind ?? "lore",
    title: handout.title,
    subtitle: handout.subtitle ?? "",
    body: handout.body ?? "",
    imageUrl: handout.imageUrl ?? "",
    imagePath: handout.imagePath ?? "",
    attachmentUrl: handout.attachmentUrl ?? "",
    attachmentPath: handout.attachmentPath ?? "",
    attachmentName: handout.attachmentName ?? "",
    attachmentMimeType: handout.attachmentMimeType ?? "",
    attachmentSize: handout.attachmentSize ? String(handout.attachmentSize) : "",
    visibility: handout.visibility,
    selectedPlayerIdsText: (handout.selectedPlayerIds ?? []).join(", "),
    tagsText: handout.tags.join(", "),
    gmNotes: handout.gmNotes ?? "",
    rewardPayloadsJson: JSON.stringify(handout.rewardPayloads ?? [], null, 2),
    codexEntryIdsText: (handout.codexEntryIds ?? []).join(", "),
    revealedAt: handout.revealedAt ?? ""
  };
}

function parseRewardPayloads(value: string): RewardGrant[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Reward payloads must be a JSON array.");
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object" || typeof (entry as RewardGrant).type !== "string") {
      throw new Error(`Reward payload ${index + 1} is missing a type.`);
    }
    return entry as RewardGrant;
  });
}

function parseRewardsSafely(value: string): { rewards: RewardGrant[]; error?: string } {
  try {
    return { rewards: parseRewardPayloads(value) };
  } catch (error) {
    return {
      rewards: [],
      error: error instanceof Error ? error.message : "Invalid reward payload JSON."
    };
  }
}

function handoutFromForm(form: HandoutFormState, gameTableId: string, existing: Handout | null): Handout {
  const now = new Date().toISOString();
  return {
    id: form.id || existing?.id || crypto.randomUUID(),
    gameTableId,
    kind: form.kind,
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || undefined,
    body: form.body.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    imagePath: form.imagePath.trim() || undefined,
    attachmentUrl: form.attachmentUrl.trim() || undefined,
    attachmentPath: form.attachmentPath.trim() || undefined,
    attachmentName: form.attachmentName.trim() || undefined,
    attachmentMimeType: form.attachmentMimeType.trim() || undefined,
    attachmentSize: Number(form.attachmentSize) || undefined,
    visibility: form.visibility,
    selectedPlayerIds: splitList(form.selectedPlayerIdsText),
    tags: splitList(form.tagsText),
    gmNotes: form.gmNotes.trim() || undefined,
    rewardPayloads: parseRewardPayloads(form.rewardPayloadsJson),
    codexEntryIds: splitList(form.codexEntryIdsText),
    revealedAt: form.revealedAt || existing?.revealedAt || null,
    createdBy: existing?.createdBy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function formatDate(value?: string | null): string {
  if (!value) return "Unrevealed";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function buildReward(builder: RewardBuilderState): RewardGrant {
  if (builder.type === "currency") {
    const walletDelta: Record<string, number> = {};
    const gp = numberFromInput(builder.gp);
    const sp = numberFromInput(builder.sp);
    const cp = numberFromInput(builder.cp);
    const xp = numberFromInput(builder.xp);
    const custom = numberFromInput(builder.customValue);
    if (gp) walletDelta.gp = gp;
    if (sp) walletDelta.sp = sp;
    if (cp) walletDelta.cp = cp;
    if (xp) walletDelta.xp = xp;
    if (custom && builder.customKey.trim()) walletDelta[builder.customKey.trim().toLowerCase()] = custom;
    if (Object.keys(walletDelta).length === 0) throw new Error("Add at least one currency or XP value.");
    return { type: "currency", walletDelta };
  }

  if (builder.type === "xp") {
    const amount = Number(builder.xp);
    if (!Number.isFinite(amount) || amount === 0) throw new Error("XP amount is required.");
    return { type: "xp", amount };
  }

  if (builder.type === "item") {
    if (!builder.itemName.trim()) throw new Error("Item name is required.");
    const quantity = Number(builder.itemQuantity);
    return {
      type: "item",
      item: {
        id: builder.itemName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: builder.itemName.trim(),
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        rarity: builder.itemRarity.trim() || undefined,
        notes: builder.itemNotes.trim() || undefined,
        codexEntryId: builder.itemCodexEntryId.trim() || undefined,
        sourceCodexEntryId: builder.itemCodexEntryId.trim() || undefined
      }
    };
  }

  if (builder.type === "condition") {
    if (!builder.conditionName.trim()) throw new Error("Condition name is required.");
    return {
      type: "condition",
      condition: {
        id: builder.conditionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        codexEntryId: builder.conditionCodexEntryId.trim() || undefined,
        name: builder.conditionName.trim(),
        description: builder.conditionDescription.trim() || undefined,
        expiresAt: null
      }
    };
  }

  if (builder.type === "codex") {
    if (!builder.codexEntryId.trim()) throw new Error("Codex entry is required.");
    return { type: "codex", codexEntryId: builder.codexEntryId.trim() };
  }

  if (!builder.noteTitle.trim()) throw new Error("Note title is required.");
  return {
    type: "note",
    title: builder.noteTitle.trim(),
    body: builder.noteBody.trim()
  };
}

function bountyLabel(rewards: RewardGrant[]): string | null {
  const currency = rewards.find((reward): reward is Extract<RewardGrant, { type: "currency" }> => {
    return reward.type === "currency" && Object.keys(reward.walletDelta).length > 0;
  });
  if (!currency) return null;
  return Object.entries(currency.walletDelta)
    .map(([key, value]) => `${value > 0 ? "+" : ""}${value} ${titleCase(key)}`)
    .join(", ");
}

function formatFileSize(bytes?: number | string): string {
  const value = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!value || !Number.isFinite(value)) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HandoutsPage() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null
  });
  const campaignSeat = useCampaignSeat(authState);
  const [seatMode, setSeatMode] = useState<SeatMode>("play");
  const gameTableId =
    campaignSeat.activeTableId ??
    (isSupabaseConfigured() ? "" : LOCAL_DEMO_GAME_TABLE_ID);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [applications, setApplications] = useState<HandoutRewardApplication[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
  const [selectedHandoutId, setSelectedHandoutId] = useState("");
  const [form, setForm] = useState<HandoutFormState>(emptyForm);
  const [rewardBuilder, setRewardBuilder] = useState<RewardBuilderState>(emptyRewardBuilder);
  const [targetCharacterIds, setTargetCharacterIds] = useState<string[]>([]);
  const [revealVisibility, setRevealVisibility] = useState<HandoutVisibility>("campaign");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<HandoutVisibility | "all">("all");
  const [kindFilter, setKindFilter] = useState<HandoutKind | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [overrideExisting, setOverrideExisting] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [handoutImageUrls, setHandoutImageUrls] = useState<Record<string, string>>({});
  const [handoutAttachmentUrls, setHandoutAttachmentUrls] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = campaignSeat.canManage;
  const isManageMode = seatMode === "manage" && canManage;
  const selectedHandout = useMemo(
    () => handouts.find((handout) => handout.id === selectedHandoutId) ?? null,
    [handouts, selectedHandoutId]
  );
  const formRewards = useMemo(() => parseRewardsSafely(form.rewardPayloadsJson), [form.rewardPayloadsJson]);
  const selectedRewards = selectedHandout?.rewardPayloads ?? [];
  const selectedImageUrl = selectedHandout
    ? handoutImageUrls[selectedHandout.id] || selectedHandout.imageUrl || ""
    : "";
  const selectedAttachmentUrl = selectedHandout
    ? handoutAttachmentUrls[selectedHandout.id] || selectedHandout.attachmentUrl || ""
    : "";
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const handout of handouts) for (const tag of handout.tags) tags.add(tag);
    return Array.from(tags).sort();
  }, [handouts]);
  const applicationsForSelected = useMemo(() => {
    if (!selectedHandout) return [];
    return applications.filter((application) => application.handoutId === selectedHandout.id);
  }, [applications, selectedHandout]);
  const duplicateTargetIds = useMemo(() => {
    if (!selectedHandout) return [];
    return targetCharacterIds.filter((characterId) =>
      applicationsForSelected.some((application) => application.characterId === characterId)
    );
  }, [applicationsForSelected, selectedHandout, targetCharacterIds]);

  const playerOptions = useMemo(() => {
    if (campaignSeat.members.length > 0) {
      return campaignSeat.members
        .filter((member) => member.userLevel === "player")
        .map((member) => ({
          id: member.userId,
          label: `Player ${member.userId.slice(0, 8)}`
        }));
    }

    const players = new Map<string, string>();
    for (const character of characters) {
      if (!character.ownerUserId) continue;
      players.set(character.ownerUserId, character.ownerLabel ?? `${character.name} owner`);
    }
    return Array.from(players.entries()).map(([id, label]) => ({ id, label }));
  }, [characters, campaignSeat.members]);

  const filteredHandouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const applyPlayerVisibility = seatMode === "play" || !canManage;
    return handouts.filter((handout) => {
      if (applyPlayerVisibility) {
        const userId = authState.user?.id;
        const visible =
          handout.visibility === "public" ||
          handout.visibility === "campaign" ||
          (handout.visibility === "selected_players" &&
            Boolean(userId && handout.selectedPlayerIds?.includes(userId)));
        if (!visible) return false;
      }
      if (visibilityFilter !== "all" && handout.visibility !== visibilityFilter) return false;
      if (kindFilter !== "all" && handout.kind !== kindFilter) return false;
      if (tagFilter !== "all" && !handout.tags.includes(tagFilter)) return false;
      if (!query) return true;
      return [handout.title, handout.subtitle, handout.body, handout.tags.join(" ")]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [
    authState.user?.id,
    canManage,
    handouts,
    kindFilter,
    searchQuery,
    seatMode,
    tagFilter,
    visibilityFilter
  ]);

  useEffect(() => {
    if (!gameTableId) {
      queueMicrotask(() => {
        setHandouts([]);
        setApplications([]);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;

    Promise.all([
      listHandouts(gameTableId),
      listCharacters(),
      listCodexEntries(),
      listHandoutRewardApplications(gameTableId)
    ])
      .then(([nextHandouts, nextCharacters, nextCodex, nextApplications]) => {
        if (cancelled) return;
        setHandouts(nextHandouts);
        setCharacters(nextCharacters);
        setCodexEntries(nextCodex);
        setApplications(nextApplications);
        setStorageMode(getHandoutStorageMode());
        setSelectedHandoutId((current) => {
          if (current && nextHandouts.some((handout) => handout.id === current)) return current;
          return nextHandouts[0]?.id ?? "";
        });
        setForm((current) => {
          if (current.id && nextHandouts.some((handout) => handout.id === current.id)) return current;
          return nextHandouts[0] ? formFromHandout(nextHandouts[0]) : emptyForm;
        });
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load handouts.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameTableId]);

  useEffect(() => {
    let cancelled = false;

    async function resolveHandoutFiles() {
      const imageEntries = await Promise.all(
        handouts.map(async (handout) => [
          handout.id,
          handout.imagePath ? await getHandoutFileUrl(handout.imagePath) : handout.imageUrl ?? ""
        ] as const)
      );
      const attachmentEntries = await Promise.all(
        handouts.map(async (handout) => [
          handout.id,
          handout.attachmentPath
            ? await getHandoutFileUrl(handout.attachmentPath)
            : handout.attachmentUrl ?? ""
        ] as const)
      );

      if (cancelled) return;
      setHandoutImageUrls(Object.fromEntries(imageEntries));
      setHandoutAttachmentUrls(Object.fromEntries(attachmentEntries));
    }

    resolveHandoutFiles();

    return () => {
      cancelled = true;
    };
  }, [handouts]);

  function updateForm<K extends keyof HandoutFormState>(key: K, value: HandoutFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateRewardBuilder<K extends keyof RewardBuilderState>(key: K, value: RewardBuilderState[K]) {
    setRewardBuilder((current) => ({ ...current, [key]: value }));
  }

  async function refresh() {
    try {
      const [nextHandouts, nextCharacters, nextCodex, nextApplications] = await Promise.all([
        listHandouts(gameTableId),
        listCharacters(),
        listCodexEntries(),
        listHandoutRewardApplications(gameTableId)
      ]);
      setHandouts(nextHandouts);
      setCharacters(nextCharacters);
      setCodexEntries(nextCodex);
      setApplications(nextApplications);
      setStorageMode(getHandoutStorageMode());
      setLoading(false);
      return nextHandouts;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load handouts.");
      setLoading(false);
      return [];
    }
  }

  function selectHandout(handout: Handout) {
    setSelectedHandoutId(handout.id);
    setForm(formFromHandout(handout));
    setRevealVisibility(handout.visibility === "gm_only" ? "campaign" : handout.visibility);
    setPreviewOpen(false);
    setOverrideExisting(false);
  }

  function startNewHandout() {
    setSelectedHandoutId("");
    setForm(emptyForm);
    setPreviewOpen(false);
    setMessage(null);
    setError(null);
  }

  async function handleImportStarter() {
    if (!canManage) return;
    setMessage(null);
    setError(null);
    const result = await importStarterHandouts(gameTableId);
    const next = await refresh();
    setSelectedHandoutId(next[0]?.id ?? "");
    if (next[0]) setForm(formFromHandout(next[0]));
    setMessage(`Imported ${result.inserted} handout(s). Skipped ${result.skipped} duplicate(s).`);
  }

  async function handleSave() {
    if (!canManage) return;
    setMessage(null);
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      const saved = await saveHandout(handoutFromForm(form, gameTableId, selectedHandout));
      const next = await refresh();
      setSelectedHandoutId(saved.id);
      setForm(formFromHandout(next.find((handout) => handout.id === saved.id) ?? saved));
      setMessage(`Saved handout: ${saved.title}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save handout.");
    }
  }

  async function ensureSavedHandoutForUpload(): Promise<Handout | null> {
    if (!canManage) return null;
    if (!form.title.trim()) {
      setError("Title is required before uploading files.");
      return null;
    }

    const uploadForm = form.id ? form : { ...form, id: crypto.randomUUID() };
    const saved = await saveHandout(handoutFromForm(uploadForm, gameTableId, selectedHandout));
    const next = await refresh();
    const hydrated = next.find((handout) => handout.id === saved.id) ?? saved;
    setSelectedHandoutId(saved.id);
    setForm(formFromHandout(hydrated));
    return hydrated;
  }

  async function handleImageUpload(file: File | null) {
    if (!file || !canManage) return;
    setUploadingImage(true);
    setMessage(null);
    setError(null);

    try {
      const saved = await ensureSavedHandoutForUpload();
      if (!saved) return;

      if (saved.imagePath) await deleteHandoutFile(saved.imagePath);
      const imagePath = await uploadHandoutImage(file, saved.gameTableId, saved.id);
      const nextForm = {
        ...formFromHandout(saved),
        imagePath,
        imageUrl: imagePath.startsWith("data:") ? imagePath : ""
      };
      const updated = await saveHandout(handoutFromForm(nextForm, gameTableId, saved));
      const next = await refresh();
      setSelectedHandoutId(updated.id);
      setForm(formFromHandout(next.find((handout) => handout.id === updated.id) ?? updated));
      setMessage(`Uploaded image: ${file.name}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAttachmentUpload(file: File | null) {
    if (!file || !canManage) return;
    setUploadingAttachment(true);
    setMessage(null);
    setError(null);

    try {
      const saved = await ensureSavedHandoutForUpload();
      if (!saved) return;

      if (saved.attachmentPath) await deleteHandoutFile(saved.attachmentPath);
      const attachmentPath = await uploadHandoutAttachment(file, saved.gameTableId, saved.id);
      const nextForm = {
        ...formFromHandout(saved),
        attachmentPath,
        attachmentUrl: attachmentPath.startsWith("data:") ? attachmentPath : "",
        attachmentName: file.name,
        attachmentMimeType: file.type,
        attachmentSize: String(file.size)
      };
      const updated = await saveHandout(handoutFromForm(nextForm, gameTableId, saved));
      const next = await refresh();
      setSelectedHandoutId(updated.id);
      setForm(formFromHandout(next.find((handout) => handout.id === updated.id) ?? updated));
      setMessage(`Uploaded attachment: ${file.name}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleRemoveUploadedFile(kind: "image" | "attachment") {
    if (!canManage) return;
    setMessage(null);
    setError(null);

    try {
      const path = kind === "image" ? form.imagePath : form.attachmentPath;
      if (path) await deleteHandoutFile(path);

      const nextForm =
        kind === "image"
          ? { ...form, imagePath: "", imageUrl: "" }
          : {
              ...form,
              attachmentPath: "",
              attachmentUrl: "",
              attachmentName: "",
              attachmentMimeType: "",
              attachmentSize: ""
            };
      setForm(nextForm);

      if (selectedHandout) {
        const saved = await saveHandout(handoutFromForm(nextForm, gameTableId, selectedHandout));
        const next = await refresh();
        setForm(formFromHandout(next.find((handout) => handout.id === saved.id) ?? saved));
      }

      setMessage(kind === "image" ? "Removed uploaded image." : "Removed uploaded attachment.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove file.");
    }
  }

  async function handleDelete() {
    if (!canManage || !selectedHandout) return;
    setMessage(null);
    setError(null);
    await deleteHandout(selectedHandout.id);
    const next = await refresh();
    setSelectedHandoutId(next[0]?.id ?? "");
    setForm(next[0] ? formFromHandout(next[0]) : emptyForm);
    setMessage(`Deleted handout: ${selectedHandout.title}`);
  }

  async function handleReveal() {
    if (!canManage || !selectedHandout) return;
    setMessage(null);
    setError(null);
    const selectedPlayerIds = revealVisibility === "selected_players" ? splitList(form.selectedPlayerIdsText) : [];
    const revealed = await revealHandout(selectedHandout.id, revealVisibility, selectedPlayerIds);
    const next = await refresh();
    setSelectedHandoutId(revealed.id);
    setForm(formFromHandout(next.find((handout) => handout.id === revealed.id) ?? revealed));

    if (revealVisibility === "campaign" || revealVisibility === "public") {
      await saveRollLog(
        DEFAULT_ROOM_SLUG,
        createRollLogEntry({
          kind: "system",
          actionLabel: `Handout Revealed: ${revealed.title}`,
          resultText: `Handout revealed: ${revealed.title}`,
          details: [revealed.subtitle, revealed.tags.length ? `Tags: ${revealed.tags.join(", ")}` : ""]
            .filter(Boolean)
            .join("\n")
        })
      );
    }

    setMessage(
      `Revealed ${revealed.title} as ${titleCase(revealVisibility)}.${
        revealVisibility === "campaign" || revealVisibility === "public"
          ? " Logged to campaign roll log."
          : " Not written to shared roll log."
      }`
    );
  }

  function addRewardFromBuilder() {
    setMessage(null);
    setError(null);
    try {
      const reward = buildReward(rewardBuilder);
      const nextRewards = [...formRewards.rewards, reward];
      updateForm("rewardPayloadsJson", JSON.stringify(nextRewards, null, 2));
      setRewardBuilder({ ...emptyRewardBuilder, type: rewardBuilder.type });
    } catch (builderError) {
      setError(builderError instanceof Error ? builderError.message : "Unable to add reward.");
    }
  }

  function removeReward(index: number) {
    const nextRewards = formRewards.rewards.filter((_, currentIndex) => currentIndex !== index);
    updateForm("rewardPayloadsJson", JSON.stringify(nextRewards, null, 2));
  }

  function openRewardPreview() {
    setMessage(null);
    setError(null);
    if (!selectedHandout) return;
    if (targetCharacterIds.length === 0) {
      setError("Select at least one target character.");
      return;
    }
    if (!selectedHandout.rewardPayloads?.length) {
      setError("This handout has no reward payloads.");
      return;
    }
    setPreviewOpen(true);
  }

  async function confirmApplyRewards() {
    if (!canManage || !selectedHandout) return;
    setMessage(null);
    setError(null);
    if (duplicateTargetIds.length > 0 && !overrideExisting) {
      setError("Some selected characters already received this handout. Confirm override to apply again.");
      return;
    }

    const result = await applyHandoutRewards(selectedHandout, targetCharacterIds, {
      overrideExisting
    });
    if (selectedHandout.visibility === "campaign" || selectedHandout.visibility === "public") {
      const names = targetCharacterIds
        .map((id) => characters.find((character) => character.id === id)?.name ?? id)
        .join(", ");
      await saveRollLog(
        DEFAULT_ROOM_SLUG,
        createRollLogEntry({
          kind: "system",
          actionLabel: `Handout Rewards: ${selectedHandout.title}`,
          resultText: `Handout rewards applied: ${selectedHandout.title}`,
          details: [
            `Targets: ${names}`,
            `Rewards: ${summarizeRewardPayloads(selectedHandout.rewardPayloads ?? [], codexEntries)}`
          ].join("\n")
        })
      );
    }
    await refresh();
    setPreviewOpen(false);
    setMessage(
      `Applied handout rewards to ${result.applications.length} character(s). ${
        result.skippedCharacterIds.length
          ? `Skipped ${result.skippedCharacterIds.length} previously applied target(s).`
          : ""
      }`
    );
  }

  function addCodexEntryId(entryId: string) {
    if (!entryId) return;
    const current = new Set(splitList(form.codexEntryIdsText));
    current.add(entryId);
    updateForm("codexEntryIdsText", Array.from(current).join(", "));
  }

  function toggleSelectedPlayer(playerId: string, checked: boolean) {
    const current = new Set(splitList(form.selectedPlayerIdsText));
    if (checked) current.add(playerId);
    else current.delete(playerId);
    updateForm("selectedPlayerIdsText", Array.from(current).join(", "));
  }

  const adaptiveActionLabel =
    selectedHandout?.kind === "wanted_poster"
      ? "Claim Bounty"
      : selectedHandout?.kind === "spell_scroll"
        ? "Add Spell/Power to Character"
        : selectedHandout?.kind === "treasure_note"
          ? "Distribute Treasure"
          : selectedHandout?.kind === "condition_notice"
            ? "Apply Condition"
            : "Apply Rewards";

  return (
    <CampaignShell
      error={error}
      header={{
        icon: FileText,
        iconGradient: "from-cyan-500 to-emerald-700 shadow-cyan-500/20",
        eyebrow: "Campaign Lore",
        title: "Handouts",
        description:
          "Reward-bearing documents for bounties, scrolls, treasure notes, conditions, contracts, clues, and faction letters.",
        storageMode,
        moduleLinks: [
          { href: "/", label: "Characters", icon: Home },
          { href: "/paths", label: "Paths", icon: Route },
          { href: "/codex", label: "Codex", icon: BookOpen },
          { href: "/loot", label: "Loot", icon: Gift }
        ]
      }}
      message={message}
      mode={seatMode}
      onAuthChange={setAuthState}
      onModeChange={setSeatMode}
      seat={campaignSeat}
      toolbar={
        isManageMode ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-600/20 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-600/30"
            onClick={handleImportStarter}
            type="button"
          >
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            Import Starter Handouts
          </button>
        ) : null
      }
    >
      <MasterDetailLayout
        aside={
            <GlassPanel level="secondary" className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Handouts</h2>
                {isManageMode ? (
                  <button
                    className="rounded-md border border-slate-700/40 bg-slate-900/60 p-2 text-slate-100 transition hover:bg-slate-800/80"
                    onClick={startNewHandout}
                    type="button"
                    aria-label="Create handout"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                <input
                  className={inputClass}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search handouts"
                  value={searchQuery}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      setVisibilityFilter(event.target.value as HandoutVisibility | "all")
                    }
                    value={visibilityFilter}
                  >
                    <option value="all">All visibility</option>
                    {HANDOUT_VISIBILITIES.map((visibility) => (
                      <option key={visibility} value={visibility}>
                        {titleCase(visibility)}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    onChange={(event) => setKindFilter(event.target.value as HandoutKind | "all")}
                    value={kindFilter}
                  >
                    <option value="all">All kinds</option>
                    {HANDOUT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {titleCase(kind)}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  className={inputClass}
                  onChange={(event) => setTagFilter(event.target.value)}
                  value={tagFilter}
                >
                  <option value="all">All tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <p className="rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
                    Loading handouts...
                  </p>
                ) : filteredHandouts.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
                    No matching handouts.
                  </p>
                ) : (
                  filteredHandouts.map((handout) => {
                    const appliedCount = applications.filter(
                      (application) => application.handoutId === handout.id
                    ).length;
                    const imageUrl = handoutImageUrls[handout.id] || handout.imageUrl;
                    return (
                      <button
                        className={[
                          "w-full overflow-hidden rounded-md border text-left transition",
                          selectedHandoutId === handout.id
                            ? "border-cyan-500/45 bg-cyan-500/15"
                            : "border-slate-700/25 bg-slate-950/30 hover:bg-slate-900/50"
                        ].join(" ")}
                        key={handout.id}
                        onClick={() => selectHandout(handout)}
                        type="button"
                      >
                        {imageUrl ? (
                          <Image
                            alt=""
                            className="h-28 w-full object-cover"
                            height={112}
                            src={imageUrl}
                            unoptimized
                            width={340}
                          />
                        ) : null}
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">{handout.title}</span>
                            <span className="shrink-0 rounded-full border border-slate-700/30 px-2 py-0.5 text-xs text-muted-foreground">
                              {titleCase(handout.kind)}
                            </span>
                          </div>
                          {handout.subtitle ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {handout.subtitle}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-1">
                            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-100">
                              {titleCase(handout.visibility)}
                            </span>
                            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-100">
                              {(handout.rewardPayloads ?? []).length} rewards
                            </span>
                            <span className="rounded-full border border-slate-700/25 px-2 py-0.5 text-xs text-slate-300">
                              {appliedCount} applied
                            </span>
                            <span className="rounded-full border border-slate-700/25 px-2 py-0.5 text-xs text-slate-300">
                              {handout.revealedAt ? "Revealed" : "Unrevealed"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </GlassPanel>
        }
      >
          <section className="space-y-6">
            {isManageMode ? (
              <GlassPanel level="secondary" className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedHandout ? "Edit Handout" : "Create Handout"}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/45"
                      onClick={handleSave}
                      type="button"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save
                    </button>
                    {selectedHandout ? (
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-red-500/35 bg-red-950/35 px-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/45"
                        onClick={handleDelete}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px]">
                  <input
                    className={inputClass}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="Title"
                    value={form.title}
                  />
                  <select
                    className={inputClass}
                    onChange={(event) => updateForm("kind", event.target.value as HandoutKind)}
                    value={form.kind}
                  >
                    {HANDOUT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {titleCase(kind)}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClass}
                    onChange={(event) =>
                      updateForm("visibility", event.target.value as HandoutVisibility)
                    }
                    value={form.visibility}
                  >
                    {HANDOUT_VISIBILITIES.map((visibility) => (
                      <option key={visibility} value={visibility}>
                        {titleCase(visibility)}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  className={`${inputClass} mt-3 w-full`}
                  onChange={(event) => updateForm("subtitle", event.target.value)}
                  placeholder="Subtitle"
                  value={form.subtitle}
                />
                <textarea
                  className={`${textAreaClass} mt-3 min-h-32`}
                  onChange={(event) => updateForm("body", event.target.value)}
                  placeholder="Body"
                  value={form.body}
                />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-200">Image</p>
                      {form.imagePath || form.imageUrl ? (
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-200"
                          onClick={() => handleRemoveUploadedFile("image")}
                          type="button"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {selectedImageUrl || form.imageUrl ? (
                      <Image
                        alt=""
                        className="mt-3 h-36 w-full rounded-md object-cover"
                        height={144}
                        src={selectedImageUrl || form.imageUrl}
                        unoptimized
                        width={480}
                      />
                    ) : (
                      <p className="mt-3 rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
                        No image attached.
                      </p>
                    )}
                    <label className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/45">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {uploadingImage ? "Uploading..." : "Upload Image"}
                      <input
                        accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                        className="sr-only"
                        disabled={uploadingImage}
                        onChange={(event) => {
                          void handleImageUpload(event.target.files?.[0] ?? null);
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <input
                      className={`${inputClass} mt-3 w-full`}
                      onChange={(event) => updateForm("imageUrl", event.target.value)}
                      placeholder="Image URL fallback"
                      value={form.imageUrl}
                    />
                  </div>

                  <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-200">Attachment</p>
                      {form.attachmentPath || form.attachmentUrl ? (
                        <button
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-200"
                          onClick={() => handleRemoveUploadedFile("attachment")}
                          type="button"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {form.attachmentName || form.attachmentUrl ? (
                      <div className="mt-3 rounded-md border border-slate-700/25 bg-slate-900/50 px-3 py-2 text-sm text-slate-200">
                        <p className="font-semibold">
                          {form.attachmentName || "External attachment"}
                        </p>
                        {form.attachmentSize ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatFileSize(form.attachmentSize)}
                            {form.attachmentMimeType ? ` · ${form.attachmentMimeType}` : ""}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md border border-dashed border-slate-700/30 p-4 text-center text-sm text-muted-foreground">
                        No attachment uploaded.
                      </p>
                    )}
                    <label className="mt-3 inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/30 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/45">
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {uploadingAttachment ? "Uploading..." : "Upload Attachment"}
                      <input
                        accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.json,application/pdf,application/json,text/plain,text/markdown,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingAttachment}
                        onChange={(event) => {
                          void handleAttachmentUpload(event.target.files?.[0] ?? null);
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <input
                      className={`${inputClass} mt-3 w-full`}
                      onChange={(event) => updateForm("attachmentUrl", event.target.value)}
                      placeholder="Attachment URL fallback"
                      value={form.attachmentUrl}
                    />
                  </div>
                </div>
                <input
                  className={`${inputClass} mt-3 w-full`}
                  onChange={(event) => updateForm("tagsText", event.target.value)}
                  placeholder="Tags, comma separated"
                  value={form.tagsText}
                />
                <textarea
                  className={`${textAreaClass} mt-3 min-h-20`}
                  onChange={(event) => updateForm("gmNotes", event.target.value)}
                  placeholder="GM notes"
                  value={form.gmNotes}
                />

                <div className="mt-5 rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Reward Builder</h3>
                    {formRewards.error ? (
                      <span className="text-xs font-semibold text-red-200">{formRewards.error}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                    <select
                      className={inputClass}
                      onChange={(event) =>
                        updateRewardBuilder("type", event.target.value as RewardGrant["type"])
                      }
                      value={rewardBuilder.type}
                    >
                      <option value="currency">Currency</option>
                      <option value="xp">XP</option>
                      <option value="item">Item</option>
                      <option value="condition">Condition</option>
                      <option value="codex">Codex</option>
                      <option value="note">Note</option>
                    </select>

                    <div className="grid gap-2">
                      {rewardBuilder.type === "currency" ? (
                        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
                          {(["gp", "sp", "cp", "xp"] as const).map((key) => (
                            <input
                              className={inputClass}
                              key={key}
                              onChange={(event) => updateRewardBuilder(key, event.target.value)}
                              placeholder={key.toUpperCase()}
                              type="number"
                              value={rewardBuilder[key]}
                            />
                          ))}
                          <input
                            className={inputClass}
                            onChange={(event) => updateRewardBuilder("customKey", event.target.value)}
                            placeholder="Custom key"
                            value={rewardBuilder.customKey}
                          />
                          <input
                            className={inputClass}
                            onChange={(event) => updateRewardBuilder("customValue", event.target.value)}
                            placeholder="Value"
                            type="number"
                            value={rewardBuilder.customValue}
                          />
                        </div>
                      ) : null}

                      {rewardBuilder.type === "xp" ? (
                        <input
                          className={inputClass}
                          onChange={(event) => updateRewardBuilder("xp", event.target.value)}
                          placeholder="XP amount"
                          type="number"
                          value={rewardBuilder.xp}
                        />
                      ) : null}

                      {rewardBuilder.type === "item" ? (
                        <div className="grid gap-2 md:grid-cols-[1fr_90px_160px]">
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("itemName", event.target.value)} placeholder="Item name" value={rewardBuilder.itemName} />
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("itemQuantity", event.target.value)} placeholder="Qty" type="number" value={rewardBuilder.itemQuantity} />
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("itemRarity", event.target.value)} placeholder="Rarity" value={rewardBuilder.itemRarity} />
                          <input className={`${inputClass} md:col-span-2`} onChange={(event) => updateRewardBuilder("itemNotes", event.target.value)} placeholder="Notes" value={rewardBuilder.itemNotes} />
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("itemCodexEntryId", event.target.value)} placeholder="Codex ID optional" value={rewardBuilder.itemCodexEntryId} />
                        </div>
                      ) : null}

                      {rewardBuilder.type === "condition" ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("conditionName", event.target.value)} placeholder="Condition name" value={rewardBuilder.conditionName} />
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("conditionCodexEntryId", event.target.value)} placeholder="Codex ID optional" value={rewardBuilder.conditionCodexEntryId} />
                          <input className={`${inputClass} md:col-span-2`} onChange={(event) => updateRewardBuilder("conditionDescription", event.target.value)} placeholder="Description" value={rewardBuilder.conditionDescription} />
                        </div>
                      ) : null}

                      {rewardBuilder.type === "codex" ? (
                        <div className="grid gap-2 md:grid-cols-[1fr_180px]">
                          <select className={inputClass} onChange={(event) => updateRewardBuilder("codexEntryId", event.target.value)} value={rewardBuilder.codexEntryId}>
                            <option value="">Select codex entry...</option>
                            {codexEntries.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name} ({entry.system})
                              </option>
                            ))}
                          </select>
                          <select className={inputClass} value="attach" onChange={() => undefined}>
                            <option value="attach">Attach entry grants</option>
                          </select>
                        </div>
                      ) : null}

                      {rewardBuilder.type === "note" ? (
                        <div className="grid gap-2">
                          <input className={inputClass} onChange={(event) => updateRewardBuilder("noteTitle", event.target.value)} placeholder="Note title" value={rewardBuilder.noteTitle} />
                          <textarea className={`${textAreaClass} min-h-20`} onChange={(event) => updateRewardBuilder("noteBody", event.target.value)} placeholder="Note body" value={rewardBuilder.noteBody} />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <button
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/25 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/40"
                    onClick={addRewardFromBuilder}
                    type="button"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Reward
                  </button>

                  <div className="mt-4 space-y-2">
                    {formRewards.rewards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No rewards configured.</p>
                    ) : (
                      formRewards.rewards.map((reward, index) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-md border border-slate-700/25 bg-slate-900/50 px-3 py-2"
                          key={`${reward.type}-${index}`}
                        >
                          <span className="text-sm text-slate-200">
                            {describeRewardGrant(reward, codexEntries)}
                          </span>
                          <button
                            className="text-xs font-semibold text-red-200"
                            onClick={() => removeReward(index)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <textarea
                    className={`${textAreaClass} mt-4 min-h-32 font-mono text-xs`}
                    onChange={(event) => updateForm("rewardPayloadsJson", event.target.value)}
                    spellCheck={false}
                    value={form.rewardPayloadsJson}
                  />
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
                  <input
                    className={inputClass}
                    onChange={(event) => updateForm("codexEntryIdsText", event.target.value)}
                    placeholder="Codex entry IDs"
                    value={form.codexEntryIdsText}
                  />
                  <select
                    className={inputClass}
                    onChange={(event) => {
                      addCodexEntryId(event.target.value);
                      event.target.value = "";
                    }}
                  >
                    <option value="">Attach codex...</option>
                    {codexEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
                  <p className="text-sm font-semibold text-slate-200">Selected Players</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {playerOptions.map((player) => (
                      <label className="flex items-center gap-2 text-sm text-slate-300" key={player.id}>
                        <input
                          checked={splitList(form.selectedPlayerIdsText).includes(player.id)}
                          className="accent-cyan-400"
                          onChange={(event) => toggleSelectedPlayer(player.id, event.target.checked)}
                          type="checkbox"
                        />
                        <span className="min-w-0 truncate">{player.label}</span>
                      </label>
                    ))}
                    {playerOptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No player owners found. Paste user IDs below if needed.
                      </p>
                    ) : null}
                  </div>
                  <input
                    className={`${inputClass} mt-3 w-full`}
                    onChange={(event) => updateForm("selectedPlayerIdsText", event.target.value)}
                    placeholder="Selected player user IDs"
                    value={form.selectedPlayerIdsText}
                  />
                </div>
              </GlassPanel>
            ) : null}

            <GlassPanel level="secondary" className="overflow-hidden p-5">
              {selectedHandout ? (
                <div>
                  {selectedImageUrl ? (
                    <Image alt="" className="-mx-5 -mt-5 mb-5 max-h-80 w-[calc(100%+2.5rem)] object-cover" height={320} src={selectedImageUrl} unoptimized width={960} />
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold text-foreground">
                          {selectedHandout.title}
                        </h2>
                        <span className="rounded-full border border-slate-700/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {titleCase(selectedHandout.kind)}
                        </span>
                        <span className="rounded-full border border-slate-700/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {titleCase(selectedHandout.visibility)}
                        </span>
                        <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                          {selectedHandout.revealedAt ? "Revealed" : "Unrevealed"}
                        </span>
                      </div>
                      {selectedHandout.subtitle ? (
                        <p className="mt-2 text-sm text-muted-foreground">{selectedHandout.subtitle}</p>
                      ) : null}
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {formatDate(selectedHandout.revealedAt)}
                    </time>
                  </div>

                  {selectedHandout.kind !== "lore" ? (
                    <div className="mt-5 rounded-md border border-cyan-500/25 bg-cyan-500/10 p-4">
                      <p className="text-xs font-semibold uppercase text-cyan-100">
                        {titleCase(selectedHandout.kind)}
                      </p>
                      {selectedHandout.kind === "wanted_poster" && bountyLabel(selectedRewards) ? (
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          Bounty {bountyLabel(selectedRewards)}
                        </p>
                      ) : null}
                      {selectedHandout.kind === "spell_scroll" ? (
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          Scroll Reward: {summarizeRewardPayloads(selectedRewards, codexEntries)}
                        </p>
                      ) : null}
                      {selectedHandout.kind === "treasure_note" ? (
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          Treasure: {summarizeRewardPayloads(selectedRewards, codexEntries)}
                        </p>
                      ) : null}
                      {selectedHandout.kind === "condition_notice" ? (
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          Condition Notice
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedHandout.tags.map((tag) => (
                      <span className="rounded-full border border-slate-700/30 px-3 py-1 text-xs text-slate-300" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {selectedHandout.body ? (
                    <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                      {selectedHandout.body}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-muted-foreground">No body text.</p>
                  )}

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {selectedImageUrl ? (
                      <a className="inline-flex items-center gap-2 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/80" href={selectedImageUrl} rel="noreferrer" target="_blank">
                        <ImageIcon className="h-4 w-4" aria-hidden="true" />
                        Open Image
                      </a>
                    ) : null}
                    {selectedAttachmentUrl ? (
                      <a className="inline-flex items-center gap-2 rounded-md border border-slate-700/30 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800/80" href={selectedAttachmentUrl} rel="noreferrer" target="_blank">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {selectedHandout.attachmentName
                          ? `Open ${selectedHandout.attachmentName}`
                          : "Open Attachment"}
                        {selectedHandout.attachmentSize
                          ? ` (${formatFileSize(selectedHandout.attachmentSize)})`
                          : ""}
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                      <h3 className="text-sm font-semibold text-foreground">Codex Links</h3>
                      <div className="mt-3 space-y-2">
                        {(selectedHandout.codexEntryIds ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No codex links.</p>
                        ) : (
                          selectedHandout.codexEntryIds?.map((entryId) => {
                            const entry = codexEntries.find((codex) => codex.id === entryId);
                            return <div className="rounded-md border border-slate-700/25 bg-slate-900/50 px-3 py-2 text-sm text-slate-200" key={entryId}>{entry?.name ?? entryId}</div>;
                          })
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                      <h3 className="text-sm font-semibold text-foreground">Reward Preview</h3>
                      <div className="mt-3 space-y-2">
                        {selectedRewards.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No reward payloads.</p>
                        ) : (
                          selectedRewards.map((reward, index) => (
                            <div className="rounded-md border border-slate-700/25 bg-slate-900/50 px-3 py-2 text-sm text-slate-200" key={`${reward.type}-${index}`}>
                              {describeRewardGrant(reward, codexEntries)}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                      <h3 className="text-sm font-semibold text-foreground">Applied To</h3>
                      <div className="mt-3 space-y-2">
                        {applicationsForSelected.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No applications recorded.</p>
                        ) : (
                          applicationsForSelected.map((application) => (
                            <div className="rounded-md border border-slate-700/25 bg-slate-900/50 px-3 py-2 text-sm text-slate-200" key={application.id}>
                              {characters.find((character) => character.id === application.characterId)?.name ?? application.characterId}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {isManageMode && selectedHandout.gmNotes ? (
                    <div className="mt-6 rounded-md border border-amber-500/25 bg-amber-500/10 p-4">
                      <h3 className="text-sm font-semibold text-amber-100">GM Notes</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-50/90">
                        {selectedHandout.gmNotes}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-700/30 p-8 text-center text-sm text-muted-foreground">
                  Select or create a handout.
                </p>
              )}
            </GlassPanel>

            {isManageMode && selectedHandout ? (
              <GlassPanel level="secondary" className="p-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Reveal</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Campaign and public reveals write to the shared roll log.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                      <select className={inputClass} onChange={(event) => setRevealVisibility(event.target.value as HandoutVisibility)} value={revealVisibility}>
                        {HANDOUT_VISIBILITIES.map((visibility) => (
                          <option key={visibility} value={visibility}>
                            {titleCase(visibility)}
                          </option>
                        ))}
                      </select>
                      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-700/35 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-700/55" onClick={handleReveal} type="button">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        Reveal
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{adaptiveActionLabel}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Preview rewards before applying them to selected characters.
                    </p>
                    <div className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-700/25 bg-slate-950/30 p-3">
                      {characters.map((character) => (
                        <label className="flex items-center gap-2 text-sm text-slate-200" key={character.id}>
                          <input
                            checked={targetCharacterIds.includes(character.id)}
                            className="accent-cyan-400"
                            onChange={(event) => {
                              setTargetCharacterIds((current) =>
                                event.target.checked
                                  ? [...current, character.id]
                                  : current.filter((id) => id !== character.id)
                              );
                            }}
                            type="checkbox"
                          />
                          <span className="min-w-0 truncate">{character.name}</span>
                          {applicationsForSelected.some((application) => application.characterId === character.id) ? (
                            <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-100">
                              Applied
                            </span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                    <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/30 px-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/45" onClick={openRewardPreview} type="button">
                      <Gift className="h-4 w-4" aria-hidden="true" />
                      Preview {adaptiveActionLabel}
                    </button>
                  </div>
                </div>
              </GlassPanel>
            ) : null}

            {previewOpen && selectedHandout ? (
              <GlassPanel level="secondary" className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Confirm Reward Application</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Applying rewards updates characters, records reward history, and writes application audit records.
                    </p>
                  </div>
                  <button
                    className="text-sm font-semibold text-muted-foreground hover:text-slate-100"
                    onClick={() => setPreviewOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                    <h3 className="text-sm font-semibold text-foreground">Applying To</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {targetCharacterIds.map((id) => {
                        const character = characters.find((entry) => entry.id === id);
                        const duplicate = duplicateTargetIds.includes(id);
                        return (
                          <li className="flex items-center justify-between gap-2" key={id}>
                            <span>{character?.name ?? id}</span>
                            {duplicate ? <span className="text-xs text-amber-100">Already applied</span> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="rounded-md border border-slate-700/25 bg-slate-950/30 p-4">
                    <h3 className="text-sm font-semibold text-foreground">Rewards</h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-200">
                      {selectedRewards.map((reward, index) => (
                        <li key={`${reward.type}-${index}`}>{describeRewardGrant(reward, codexEntries)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {duplicateTargetIds.length > 0 ? (
                  <label className="mt-4 flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">
                    <input
                      checked={overrideExisting}
                      className="accent-amber-400"
                      onChange={(event) => setOverrideExisting(event.target.checked)}
                      type="checkbox"
                    />
                    Apply again to characters that already received this handout.
                  </label>
                ) : null}

                <button
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-700/30 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-700/45"
                  onClick={confirmApplyRewards}
                  type="button"
                >
                  <Gift className="h-4 w-4" aria-hidden="true" />
                  Confirm Apply
                </button>
              </GlassPanel>
            ) : null}
          </section>
      </MasterDetailLayout>
    </CampaignShell>
  );
}
