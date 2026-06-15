"use client";

import Link from "next/link";
import {
  Archive,
  BookOpen,
  Download,
  Eye,
  EyeOff,
  FileText,
  Home,
  Lock,
  Plus,
  Route,
  Save,
  Trash2,
  Unlock,
  Upload
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CampaignShell } from "@/components/campaign/CampaignShell";
import { MasterDetailLayout } from "@/components/campaign/MasterDetailLayout";
import type { SeatMode } from "@/components/campaign/SeatModeTabs";
import { GlassPanel } from "@/components/GlassPanel";
import { PathListPanel } from "@/components/paths/PathListPanel";
import { PathNodeCard } from "@/components/paths/PathNodeCard";
import { PathNodeDetail } from "@/components/paths/PathNodeDetail";
import { StorageStatusBadge } from "@/components/StorageStatusBadge";
import {
  failNode,
  getPathHistory,
  getVisibleNodes,
  hideNode,
  lockNode,
  resolveNode,
  revealNode,
  skipNode,
  unlockNode,
  visitNode
} from "@/lib/paths/pathEngine";
import {
  activatePath,
  archivePath,
  createEmptyPath,
  deletePath,
  getPathStorageMode,
  importPaths,
  importStarterPaths,
  listPaths,
  savePath
} from "@/lib/paths/pathRepository";
import {
  exportPathJson,
  validatePath,
  validatePathJson
} from "@/lib/paths/pathValidation";
import {
  LOCAL_DEMO_GAME_TABLE_ID,
  PATH_NODE_KINDS,
  PATH_NODE_STATUSES,
  PATH_STATUSES,
  PATH_VISIBILITIES,
  type BranchingPath,
  type PathEdge,
  type PathNode,
  type PathNodeKind,
  type PathNodeStatus,
  type PathStatus,
  type PathVisibility
} from "@/lib/paths/types";
import type { CharacterProfile } from "@/lib/sheets/types";
import { useCampaignSeat } from "@/lib/session/useCampaignSeat";
import { listCharacters } from "@/lib/storage/characterRepository";
import { isSupabaseConfigured } from "@/lib/storage/supabaseClient";
import type { AuthState } from "@/lib/auth/supabaseAuth";
import type { StorageMode } from "@/lib/storage/types";

type PathFormState = {
  name: string;
  description: string;
  status: PathStatus;
  visibility: PathVisibility;
  selectedPlayerIdsText: string;
  tagsText: string;
  gmNotes: string;
  startNodeId: string;
};

type NodeFormState = {
  id: string;
  title: string;
  subtitle: string;
  kind: PathNodeKind;
  status: PathNodeStatus;
  description: string;
  playerText: string;
  gmText: string;
  outcomesJson: string;
};

type EdgeFormState = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  locked: boolean;
};

const inputClass =
  "h-10 w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 text-sm text-foreground outline-none focus:border-violet-500/50";
const textAreaClass =
  "w-full rounded-md border border-slate-700/30 bg-slate-900/60 px-3 py-2 text-sm text-foreground outline-none focus:border-violet-500/50";

const emptyPathForm: PathFormState = {
  name: "",
  description: "",
  status: "draft",
  visibility: "gm_only",
  selectedPlayerIdsText: "",
  tagsText: "",
  gmNotes: "",
  startNodeId: ""
};

const emptyNodeForm: NodeFormState = {
  id: "",
  title: "",
  subtitle: "",
  kind: "story",
  status: "hidden",
  description: "",
  playerText: "",
  gmText: "",
  outcomesJson: "[]"
};

const emptyEdgeForm: EdgeFormState = {
  id: "",
  fromNodeId: "",
  toNodeId: "",
  label: "",
  locked: false
};

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function pathToForm(path: BranchingPath): PathFormState {
  return {
    name: path.name,
    description: path.description ?? "",
    status: path.status,
    visibility: path.visibility,
    selectedPlayerIdsText: (path.selectedPlayerIds ?? []).join(", "),
    tagsText: path.tags.join(", "),
    gmNotes: path.gmNotes ?? "",
    startNodeId: path.startNodeId ?? ""
  };
}

function nodeToForm(node: PathNode): NodeFormState {
  return {
    id: node.id,
    title: node.title,
    subtitle: node.subtitle ?? "",
    kind: node.kind,
    status: node.status,
    description: node.description ?? "",
    playerText: node.playerText ?? "",
    gmText: node.gmText ?? "",
    outcomesJson: JSON.stringify(node.outcomes ?? [], null, 2)
  };
}

function buildPathFromForm(
  form: PathFormState,
  existing: BranchingPath | null,
  gameTableId: string
): BranchingPath {
  const validation = existing ? validatePath(existing) : { valid: true, errors: [] };
  if (!validation.valid && existing) {
    throw new Error(validation.errors[0]);
  }

  return {
    ...(existing ?? {
      id: crypto.randomUUID(),
      gameTableId,
      currentNodeIds: [],
      nodes: [],
      edges: [],
      tags: []
    }),
    gameTableId,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    visibility: form.visibility,
    selectedPlayerIds: splitList(form.selectedPlayerIdsText),
    tags: splitList(form.tagsText),
    gmNotes: form.gmNotes.trim() || undefined,
    startNodeId: form.startNodeId || existing?.startNodeId
  };
}

function buildNodeFromForm(form: NodeFormState): PathNode {
  let outcomes: PathNode["outcomes"] = [];
  try {
    const parsed = JSON.parse(form.outcomesJson);
    outcomes = Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Outcomes JSON is invalid.");
  }

  return {
    id: form.id || crypto.randomUUID(),
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || undefined,
    kind: form.kind,
    status: form.status,
    description: form.description.trim() || undefined,
    playerText: form.playerText.trim() || undefined,
    gmText: form.gmText.trim() || undefined,
    outcomes
  };
}

export default function PathsPage() {
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

  const [paths, setPaths] = useState<BranchingPath[]>([]);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [selectedPathId, setSelectedPathId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [pathForm, setPathForm] = useState<PathFormState>(emptyPathForm);
  const [nodeForm, setNodeForm] = useState<NodeFormState>(emptyNodeForm);
  const [edgeForm, setEdgeForm] = useState<EdgeFormState>(emptyEdgeForm);
  const [targetCharacterIds, setTargetCharacterIds] = useState<string[]>([]);
  const [overrideExisting, setOverrideExisting] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const selectedPathIdRef = useRef("");

  useEffect(() => {
    selectedPathIdRef.current = selectedPathId;
  }, [selectedPathId]);

  const canManage = campaignSeat.canManage;
  const isManageMode = seatMode === "manage" && canManage;

  const selectedPath = useMemo(
    () => paths.find((path) => path.id === selectedPathId) ?? null,
    [paths, selectedPathId]
  );

  const filteredPaths = useMemo(() => {
    const applyPlayerVisibility = seatMode === "play" || !canManage;
    return paths.filter((path) => {
      if (applyPlayerVisibility) {
        if (path.status !== "active") return false;
        const userId = authState.user?.id;
        const visible =
          path.visibility === "public" ||
          path.visibility === "campaign" ||
          (path.visibility === "selected_players" &&
            Boolean(userId && path.selectedPlayerIds?.includes(userId)));
        if (!visible) return false;
      }
      return true;
    });
  }, [authState.user?.id, canManage, paths, seatMode]);

  const visibleNodes = useMemo(() => {
    if (!selectedPath) return [];
    const nodes = getVisibleNodes(selectedPath, campaignSeat.seatContext);
    if (isManageMode) return selectedPath.nodes;
    return nodes.filter((node) => node.status !== "hidden");
  }, [campaignSeat.seatContext, isManageMode, selectedPath]);

  const selectedNode = useMemo(() => {
    if (!selectedPath) return null;
    return selectedPath.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [selectedPath, selectedNodeId]);

  const pathHistory = useMemo(
    () => (selectedPath ? getPathHistory(selectedPath).slice(0, 20) : []),
    [selectedPath]
  );

  const refresh = useCallback(async () => {
    if (!gameTableId) {
      setPaths([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [nextPaths, nextCharacters] = await Promise.all([
      listPaths(gameTableId),
      listCharacters()
    ]);
    setPaths(nextPaths);
    setCharacters(nextCharacters);
    setStorageMode(getPathStorageMode());
    setSelectedPathId((current) => {
      return current && nextPaths.some((path) => path.id === current)
        ? current
        : (nextPaths[0]?.id ?? "");
    });
    const preservedId = selectedPathIdRef.current;
    const nextId =
      preservedId && nextPaths.some((path) => path.id === preservedId)
        ? preservedId
        : (nextPaths[0]?.id ?? "");
    const nextPath = nextPaths.find((path) => path.id === nextId);
    if (nextPath) {
      setPathForm(pathToForm(nextPath));
      const nextNodeId =
        nextPath.nodes.find((node) => node.status !== "hidden")?.id ??
        nextPath.nodes[0]?.id ??
        "";
      setSelectedNodeId(nextNodeId);
      const nextNode = nextPath.nodes.find((node) => node.id === nextNodeId);
      setNodeForm(nextNode ? nodeToForm(nextNode) : emptyNodeForm);
    }
    setLoading(false);
  }, [gameTableId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!gameTableId) {
        if (!cancelled) {
          setPaths([]);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);
      const [nextPaths, nextCharacters] = await Promise.all([
        listPaths(gameTableId),
        listCharacters()
      ]);
      if (cancelled) return;

      setPaths(nextPaths);
      setCharacters(nextCharacters);
      setStorageMode(getPathStorageMode());

      const preservedId = selectedPathIdRef.current;
      const nextId =
        preservedId && nextPaths.some((path) => path.id === preservedId)
          ? preservedId
          : (nextPaths[0]?.id ?? "");
      setSelectedPathId(nextId);

      const nextPath = nextPaths.find((path) => path.id === nextId);
      if (nextPath) {
        setPathForm(pathToForm(nextPath));
        const nextNodeId =
          nextPath.nodes.find((node) => node.status !== "hidden")?.id ??
          nextPath.nodes[0]?.id ??
          "";
        setSelectedNodeId(nextNodeId);
        const nextNode = nextPath.nodes.find((node) => node.id === nextNodeId);
        setNodeForm(nextNode ? nodeToForm(nextNode) : emptyNodeForm);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [gameTableId]);

  function selectPath(pathId: string, pathList: BranchingPath[] = paths) {
    setSelectedPathId(pathId);
    const path = pathList.find((entry) => entry.id === pathId);
    if (path) {
      setPathForm(pathToForm(path));
      const nextNodeId =
        path.nodes.find((node) => node.status !== "hidden")?.id ?? path.nodes[0]?.id ?? "";
      setSelectedNodeId(nextNodeId);
      const node = path.nodes.find((entry) => entry.id === nextNodeId);
      setNodeForm(node ? nodeToForm(node) : emptyNodeForm);
    }
  }

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    const node = selectedPath?.nodes.find((entry) => entry.id === nodeId);
    setNodeForm(node ? nodeToForm(node) : emptyNodeForm);
  }

  async function persistPath(nextPath: BranchingPath) {
    const validation = validatePath(nextPath);
    if (!validation.valid) throw new Error(validation.errors[0]);
    const saved = await savePath(nextPath);
    setPaths((current) => {
      const rest = current.filter((path) => path.id !== saved.id);
      return [saved, ...rest];
    });
    setSelectedPathId(saved.id);
    setPathForm(pathToForm(saved));
    return saved;
  }

  async function handleSavePath() {
    if (!selectedPath) return;
    setError(null);
    setMessage(null);
    try {
      const next = buildPathFromForm(pathForm, selectedPath, gameTableId);
      await persistPath({ ...selectedPath, ...next });
      setMessage("Path saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save path.");
    }
  }

  async function handleCreatePath() {
    setError(null);
    try {
      const created = await createEmptyPath(gameTableId);
      setPaths((current) => [created, ...current]);
      selectPath(created.id);
      setMessage("Created new path.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create path.");
    }
  }

  async function handleDeletePath() {
    if (!selectedPath || !window.confirm("Delete this path?")) return;
    await deletePath(selectedPath.id);
    setPaths((current) => current.filter((path) => path.id !== selectedPath.id));
    setSelectedPathId("");
    setMessage("Path deleted.");
  }

  async function handleActivatePath() {
    if (!selectedPath) return;
    const saved = await activatePath(selectedPath.id);
    setPaths((current) => current.map((path) => (path.id === saved.id ? saved : path)));
    setMessage("Path activated.");
  }

  async function handleArchivePath() {
    if (!selectedPath) return;
    const saved = await archivePath(selectedPath.id);
    setPaths((current) => current.map((path) => (path.id === saved.id ? saved : path)));
    setMessage("Path archived.");
  }

  async function handleSaveNode() {
    if (!selectedPath) return;
    setError(null);
    try {
      const node = buildNodeFromForm(nodeForm);
      const nodes = nodeForm.id
        ? selectedPath.nodes.map((entry) => (entry.id === node.id ? { ...entry, ...node } : entry))
        : [...selectedPath.nodes, node];
      await persistPath({ ...selectedPath, nodes });
      setSelectedNodeId(node.id);
      setMessage("Node saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save node.");
    }
  }

  async function handleDeleteNode(nodeId: string) {
    if (!selectedPath || !window.confirm("Delete this node and its edges?")) return;
    const nodes = selectedPath.nodes.filter((node) => node.id !== nodeId);
    const edges = selectedPath.edges.filter(
      (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId
    );
    const currentNodeIds = selectedPath.currentNodeIds.filter((id) => id !== nodeId);
    const startNodeId = selectedPath.startNodeId === nodeId ? undefined : selectedPath.startNodeId;
    await persistPath({ ...selectedPath, nodes, edges, currentNodeIds, startNodeId });
    setMessage("Node deleted.");
  }

  async function handleAddEdge() {
    if (!selectedPath) return;
    if (!edgeForm.fromNodeId || !edgeForm.toNodeId) {
      setError("Edge requires from and to nodes.");
      return;
    }
    const edge: PathEdge = {
      id: edgeForm.id || crypto.randomUUID(),
      fromNodeId: edgeForm.fromNodeId,
      toNodeId: edgeForm.toNodeId,
      label: edgeForm.label.trim() || undefined,
      locked: edgeForm.locked
    };
    const edges = [...selectedPath.edges, edge];
    await persistPath({ ...selectedPath, edges });
    setEdgeForm(emptyEdgeForm);
    setMessage("Edge added.");
  }

  async function handleDeleteEdge(edgeId: string) {
    if (!selectedPath) return;
    const edges = selectedPath.edges.filter((edge) => edge.id !== edgeId);
    await persistPath({ ...selectedPath, edges });
    setMessage("Edge removed.");
  }

  async function runNodeAction(
    action: (path: BranchingPath, nodeId: string) => BranchingPath,
    nodeId: string
  ) {
    if (!selectedPath) return;
    try {
      const updated = action(selectedPath, nodeId);
      await persistPath(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Node action failed.");
    }
  }

  async function handleImportStarter() {
    const result = await importStarterPaths(gameTableId);
    await refresh();
    setMessage(`Imported ${result.inserted} starter path(s), skipped ${result.skipped}.`);
  }

  function handleExport() {
    if (!selectedPath) return;
    const blob = new Blob([exportPathJson(selectedPath)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedPath.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    const result = validatePathJson(parsed);
    if (!result.path) {
      setError(result.errors.join(" "));
      return;
    }
    const imported = { ...result.path, gameTableId, id: crypto.randomUUID() };
    await importPaths([imported], gameTableId);
    await refresh();
    setMessage("Path imported.");
  }

  const displayPaths = isManageMode ? paths : filteredPaths;

  return (
    <CampaignShell
      error={error}
      header={{
        icon: Route,
        iconGradient: "from-violet-600/80 to-violet-900/80 shadow-violet-500/20",
        eyebrow: "Campaign Progression",
        title: "Paths",
        description:
          "Node-based campaign routes for travel, dungeons, story arcs, and progression choices.",
        storageMode,
        moduleLinks: [
          { href: "/", label: "Home", icon: Home },
          { href: "/handouts", label: "Handouts", icon: FileText },
          { href: "/codex", label: "Codex", icon: BookOpen }
        ]
      }}
      message={message}
      mode={seatMode}
      onAuthChange={setAuthState}
      onModeChange={setSeatMode}
      requireTable={isSupabaseConfigured()}
      seat={campaignSeat}
      toolbar={
        isManageMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-violet-500/35 bg-violet-950/40 px-3 text-sm font-semibold text-violet-100 hover:bg-violet-900/50"
              onClick={handleCreatePath}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New path
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-violet-500/35 bg-violet-950/40 px-3 text-sm font-semibold text-violet-100 hover:bg-violet-900/50"
              onClick={handleImportStarter}
              type="button"
            >
              <Upload className="h-4 w-4" />
              Import starters
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-600/40 bg-slate-900/50 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800/60"
              onClick={() => importInputRef.current?.click()}
              type="button"
            >
              <Upload className="h-4 w-4" />
              Import JSON
            </button>
            <input
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
                event.target.value = "";
              }}
              ref={importInputRef}
              type="file"
            />
            {selectedPath ? (
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-600/40 bg-slate-900/50 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800/60"
                onClick={handleExport}
                type="button"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>
            ) : null}
            <StorageStatusBadge mode={storageMode} />
          </div>
        ) : (
          <StorageStatusBadge mode={storageMode} />
        )
      }
    >
      {!gameTableId ? (
        <GlassPanel level="tertiary" className="p-6 text-sm text-muted-foreground">
          Select an active game table to view paths.
        </GlassPanel>
      ) : loading ? (
        <GlassPanel level="tertiary" className="p-6 text-sm text-muted-foreground">
          Loading paths…
        </GlassPanel>
      ) : (
        <MasterDetailLayout
          aside={
            <GlassPanel level="primary" className="space-y-4 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Paths
              </h2>
              <PathListPanel
                paths={displayPaths}
                selectedPathId={selectedPathId}
                onSelect={selectPath}
              />
            </GlassPanel>
          }
        >
          {!selectedPath ? (
            <GlassPanel level="tertiary" className="p-6 text-sm text-muted-foreground">
              Select or create a path.
            </GlassPanel>
          ) : (
            <div className="space-y-4">
              <GlassPanel level="secondary" className="space-y-4 p-6">
                {isManageMode ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Name</span>
                        <input
                          className={inputClass}
                          onChange={(e) => setPathForm({ ...pathForm, name: e.target.value })}
                          value={pathForm.name}
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <select
                          className={inputClass}
                          onChange={(e) =>
                            setPathForm({ ...pathForm, status: e.target.value as PathStatus })
                          }
                          value={pathForm.status}
                        >
                          {PATH_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="text-muted-foreground">Description</span>
                        <textarea
                          className={textAreaClass}
                          onChange={(e) =>
                            setPathForm({ ...pathForm, description: e.target.value })
                          }
                          rows={2}
                          value={pathForm.description}
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Visibility</span>
                        <select
                          className={inputClass}
                          onChange={(e) =>
                            setPathForm({
                              ...pathForm,
                              visibility: e.target.value as PathVisibility
                            })
                          }
                          value={pathForm.visibility}
                        >
                          {PATH_VISIBILITIES.map((visibility) => (
                            <option key={visibility} value={visibility}>
                              {visibility}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Start node</span>
                        <select
                          className={inputClass}
                          onChange={(e) =>
                            setPathForm({ ...pathForm, startNodeId: e.target.value })
                          }
                          value={pathForm.startNodeId}
                        >
                          <option value="">-</option>
                          {selectedPath.nodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="text-muted-foreground">Tags (comma-separated)</span>
                        <input
                          className={inputClass}
                          onChange={(e) => setPathForm({ ...pathForm, tagsText: e.target.value })}
                          value={pathForm.tagsText}
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="text-muted-foreground">Selected player IDs</span>
                        <input
                          className={inputClass}
                          onChange={(e) =>
                            setPathForm({ ...pathForm, selectedPlayerIdsText: e.target.value })
                          }
                          value={pathForm.selectedPlayerIdsText}
                        />
                      </label>
                      <label className="space-y-1 text-sm md:col-span-2">
                        <span className="text-muted-foreground">GM notes</span>
                        <textarea
                          className={textAreaClass}
                          onChange={(e) => setPathForm({ ...pathForm, gmNotes: e.target.value })}
                          rows={2}
                          value={pathForm.gmNotes}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-violet-500/35 bg-violet-950/40 px-3 text-sm font-semibold text-violet-100"
                        onClick={handleSavePath}
                        type="button"
                      >
                        <Save className="h-4 w-4" />
                        Save path
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-500/35 bg-emerald-950/40 px-3 text-sm font-semibold text-emerald-100"
                        onClick={handleActivatePath}
                        type="button"
                      >
                        Activate
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-600/40 bg-slate-900/50 px-3 text-sm font-semibold text-slate-200"
                        onClick={handleArchivePath}
                        type="button"
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-red-500/35 bg-red-950/40 px-3 text-sm font-semibold text-red-100"
                        onClick={handleDeletePath}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{selectedPath.name}</h2>
                    {selectedPath.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{selectedPath.description}</p>
                    ) : null}
                  </div>
                )}
              </GlassPanel>

              <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <GlassPanel level="primary" className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Nodes
                    </h3>
                    {isManageMode ? (
                      <button
                        className="text-xs font-semibold text-violet-300 hover:text-violet-100"
                        onClick={() => {
                          setNodeForm(emptyNodeForm);
                          setSelectedNodeId("");
                        }}
                        type="button"
                      >
                        + Add
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {visibleNodes.map((node) => (
                      <PathNodeCard
                        edgeCount={
                          selectedPath.edges.filter(
                            (edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id
                          ).length
                        }
                        key={node.id}
                        node={node}
                        onSelect={() => selectNode(node.id)}
                        selected={selectedNodeId === node.id}
                      />
                    ))}
                  </div>
                </GlassPanel>

                <GlassPanel level="secondary" className="space-y-4 p-6">
                  {selectedNode ? (
                    <>
                      {isManageMode ? (
                        <div className="space-y-3 rounded-lg border border-slate-700/30 bg-slate-950/40 p-4">
                          <h3 className="text-sm font-semibold text-foreground">Edit node</h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="space-y-1 text-sm md:col-span-2">
                              <span className="text-muted-foreground">Title</span>
                              <input
                                className={inputClass}
                                onChange={(e) =>
                                  setNodeForm({ ...nodeForm, title: e.target.value })
                                }
                                value={nodeForm.title}
                              />
                            </label>
                            <label className="space-y-1 text-sm">
                              <span className="text-muted-foreground">Kind</span>
                              <select
                                className={inputClass}
                                onChange={(e) =>
                                  setNodeForm({
                                    ...nodeForm,
                                    kind: e.target.value as PathNodeKind
                                  })
                                }
                                value={nodeForm.kind}
                              >
                                {PATH_NODE_KINDS.map((kind) => (
                                  <option key={kind} value={kind}>
                                    {kind}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1 text-sm">
                              <span className="text-muted-foreground">Status</span>
                              <select
                                className={inputClass}
                                onChange={(e) =>
                                  setNodeForm({
                                    ...nodeForm,
                                    status: e.target.value as PathNodeStatus
                                  })
                                }
                                value={nodeForm.status}
                              >
                                {PATH_NODE_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1 text-sm md:col-span-2">
                              <span className="text-muted-foreground">Player text</span>
                              <textarea
                                className={textAreaClass}
                                onChange={(e) =>
                                  setNodeForm({ ...nodeForm, playerText: e.target.value })
                                }
                                rows={2}
                                value={nodeForm.playerText}
                              />
                            </label>
                            <label className="space-y-1 text-sm md:col-span-2">
                              <span className="text-muted-foreground">GM text</span>
                              <textarea
                                className={textAreaClass}
                                onChange={(e) =>
                                  setNodeForm({ ...nodeForm, gmText: e.target.value })
                                }
                                rows={2}
                                value={nodeForm.gmText}
                              />
                            </label>
                            <label className="space-y-1 text-sm md:col-span-2">
                              <span className="text-muted-foreground">Outcomes JSON</span>
                              <textarea
                                className={textAreaClass}
                                onChange={(e) =>
                                  setNodeForm({ ...nodeForm, outcomesJson: e.target.value })
                                }
                                rows={4}
                                value={nodeForm.outcomesJson}
                              />
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-violet-500/35 bg-violet-950/40 px-3 text-xs font-semibold text-violet-100"
                              onClick={handleSaveNode}
                              type="button"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save node
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-red-500/35 bg-red-950/40 px-3 text-xs font-semibold text-red-100"
                              onClick={() => handleDeleteNode(selectedNode.id)}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                            <button
                              className="inline-flex h-9 items-center rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(visitNode, selectedNode.id)}
                              type="button"
                            >
                              Visit
                            </button>
                            <button
                              className="inline-flex h-9 items-center rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(resolveNode, selectedNode.id)}
                              type="button"
                            >
                              Resolve
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(revealNode, selectedNode.id)}
                              type="button"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Reveal
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(hideNode, selectedNode.id)}
                              type="button"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                              Hide
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(lockNode, selectedNode.id)}
                              type="button"
                            >
                              <Lock className="h-3.5 w-3.5" />
                              Lock
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(unlockNode, selectedNode.id)}
                              type="button"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              Unlock
                            </button>
                            <button
                              className="inline-flex h-9 items-center rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(failNode, selectedNode.id)}
                              type="button"
                            >
                              Fail
                            </button>
                            <button
                              className="inline-flex h-9 items-center rounded-md border border-slate-600/40 px-3 text-xs font-semibold text-slate-200"
                              onClick={() => runNodeAction(skipNode, selectedNode.id)}
                              type="button"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <PathNodeDetail
                        characters={characters}
                        isManageMode={isManageMode}
                        node={selectedNode}
                        onError={setError}
                        onMessage={setMessage}
                        onOverrideExistingChange={setOverrideExisting}
                        onPathUpdated={persistPath}
                        onTargetCharacterIdsChange={setTargetCharacterIds}
                        overrideExisting={overrideExisting}
                        path={selectedPath}
                        targetCharacterIds={targetCharacterIds}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Select a node.</p>
                  )}
                </GlassPanel>
              </div>

              {isManageMode ? (
                <GlassPanel level="primary" className="space-y-4 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Edges
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {selectedPath.edges.map((edge) => {
                      const from = selectedPath.nodes.find((n) => n.id === edge.fromNodeId);
                      const to = selectedPath.nodes.find((n) => n.id === edge.toNodeId);
                      return (
                        <li
                          className="flex items-center justify-between rounded border border-slate-700/30 px-3 py-2"
                          key={edge.id}
                        >
                          <span>
                            {from?.title ?? edge.fromNodeId} -&gt; {to?.title ?? edge.toNodeId}
                            {edge.label ? ` (${edge.label})` : ""}
                            {edge.locked ? " [locked]" : ""}
                          </span>
                          <button
                            className="text-xs text-red-300 hover:text-red-100"
                            onClick={() => handleDeleteEdge(edge.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="grid gap-2 md:grid-cols-4">
                    <select
                      className={inputClass}
                      onChange={(e) => setEdgeForm({ ...edgeForm, fromNodeId: e.target.value })}
                      value={edgeForm.fromNodeId}
                    >
                      <option value="">From node</option>
                      {selectedPath.nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                    </select>
                    <select
                      className={inputClass}
                      onChange={(e) => setEdgeForm({ ...edgeForm, toNodeId: e.target.value })}
                      value={edgeForm.toNodeId}
                    >
                      <option value="">To node</option>
                      {selectedPath.nodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      onChange={(e) => setEdgeForm({ ...edgeForm, label: e.target.value })}
                      placeholder="Label"
                      value={edgeForm.label}
                    />
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-md border border-violet-500/35 bg-violet-950/40 px-3 text-sm font-semibold text-violet-100"
                      onClick={handleAddEdge}
                      type="button"
                    >
                      Add edge
                    </button>
                  </div>
                </GlassPanel>
              ) : null}

              {pathHistory.length > 0 ? (
                <GlassPanel level="primary" className="space-y-2 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    History
                  </h3>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {pathHistory.map((entry) => (
                      <li key={entry.id}>
                        {new Date(entry.createdAt).toLocaleString()} - {entry.summary}
                      </li>
                    ))}
                  </ul>
                </GlassPanel>
              ) : null}
            </div>
          )}
        </MasterDetailLayout>
      )}
    </CampaignShell>
  );
}
