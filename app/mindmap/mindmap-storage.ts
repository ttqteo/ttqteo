"use client";

import {
  MindmapItem,
  MindmapStorage,
  MindmapNode,
  DEFAULT_MINDMAP,
} from "./types";

const STORAGE_KEY = "mindmap-storage";
const OLD_STORAGE_KEY = "mindmap-tree";

/**
 * Generate a unique ID for mindmaps
 */
export function generateMindmapId(): string {
  return `mindmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new mindmap item
 */
export function createMindmapItem(
  name: string,
  tree?: MindmapNode
): MindmapItem {
  const now = Date.now();
  return {
    id: generateMindmapId(),
    name,
    tree: tree || { ...DEFAULT_MINDMAP, id: "root" },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create default storage with one mindmap
 */
function createDefaultStorage(): MindmapStorage {
  const defaultMindmap = createMindmapItem("Mindmap 1");
  return {
    currentId: defaultMindmap.id,
    mindmaps: [defaultMindmap],
  };
}

/**
 * Migrate from old single mindmap format
 */
function migrateFromOldFormat(): MindmapStorage | null {
  if (typeof window === "undefined") return null;

  const oldData = localStorage.getItem(OLD_STORAGE_KEY);
  if (!oldData) return null;

  try {
    const tree = JSON.parse(oldData) as MindmapNode;
    if (tree && tree.id && tree.text) {
      const migratedMindmap = createMindmapItem("Mindmap 1", tree);
      // Remove old storage
      localStorage.removeItem(OLD_STORAGE_KEY);
      return {
        currentId: migratedMindmap.id,
        mindmaps: [migratedMindmap],
      };
    }
  } catch {
    // Invalid old data
  }
  return null;
}

/**
 * Load mindmap storage from localStorage
 */
export function loadMindmapStorage(): MindmapStorage {
  if (typeof window === "undefined") {
    return createDefaultStorage();
  }

  // Try to load existing storage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as MindmapStorage;
      if (
        parsed &&
        parsed.currentId &&
        Array.isArray(parsed.mindmaps) &&
        parsed.mindmaps.length > 0
      ) {
        return parsed;
      }
    } catch {
      // Invalid storage
    }
  }

  // Try migration from old format
  const migrated = migrateFromOldFormat();
  if (migrated) {
    saveMindmapStorage(migrated);
    return migrated;
  }

  // Create default
  const defaultStorage = createDefaultStorage();
  saveMindmapStorage(defaultStorage);
  return defaultStorage;
}

/**
 * Save mindmap storage to localStorage
 */
export function saveMindmapStorage(storage: MindmapStorage): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

/**
 * Get current mindmap from storage
 */
export function getCurrentMindmap(
  storage: MindmapStorage
): MindmapItem | undefined {
  return storage.mindmaps.find((m) => m.id === storage.currentId);
}

/**
 * Update tree for specific mindmap
 */
export function updateMindmapTree(
  storage: MindmapStorage,
  mindmapId: string,
  tree: MindmapNode
): MindmapStorage {
  return {
    ...storage,
    mindmaps: storage.mindmaps.map((m) =>
      m.id === mindmapId ? { ...m, tree, updatedAt: Date.now() } : m
    ),
  };
}

/**
 * Add new mindmap to storage
 */
export function addMindmap(
  storage: MindmapStorage,
  name: string
): MindmapStorage {
  const newMindmap = createMindmapItem(name);
  return {
    currentId: newMindmap.id,
    mindmaps: [...storage.mindmaps, newMindmap],
  };
}

/**
 * Delete mindmap from storage
 */
export function deleteMindmap(
  storage: MindmapStorage,
  mindmapId: string
): MindmapStorage {
  const remaining = storage.mindmaps.filter((m) => m.id !== mindmapId);

  // Ensure at least one mindmap exists
  if (remaining.length === 0) {
    const newMindmap = createMindmapItem("Mindmap 1");
    return {
      currentId: newMindmap.id,
      mindmaps: [newMindmap],
    };
  }

  // If deleted current, switch to first remaining
  const newCurrentId =
    mindmapId === storage.currentId ? remaining[0].id : storage.currentId;

  return {
    currentId: newCurrentId,
    mindmaps: remaining,
  };
}

/**
 * Rename mindmap
 */
export function renameMindmap(
  storage: MindmapStorage,
  mindmapId: string,
  newName: string
): MindmapStorage {
  return {
    ...storage,
    mindmaps: storage.mindmaps.map((m) =>
      m.id === mindmapId ? { ...m, name: newName, updatedAt: Date.now() } : m
    ),
  };
}

/**
 * Switch to different mindmap
 */
export function switchMindmap(
  storage: MindmapStorage,
  mindmapId: string
): MindmapStorage {
  if (!storage.mindmaps.find((m) => m.id === mindmapId)) {
    return storage;
  }
  return {
    ...storage,
    currentId: mindmapId,
  };
}
