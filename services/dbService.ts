
import { ReportData, ReportImages } from '../types';

const DB_NAME = 'puretank-reports';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const AUTOSAVE_KEY = 'autosave-draft';

export interface SavedProject {
  id: string;
  name: string;
  clientName: string;
  siteName: string;
  createdAt: string;
  updatedAt: string;
  data: ReportData;
  images: SerializedImages;
}

interface SerializedImages {
  companyLogo?: string;
  companyHeader?: string;
  certificate?: string;
  coverFooter?: string;
  coverPhoto?: string;
  labResults?: string;
  dosingSetup?: string;
  initialChemical?: string;
  tankPhotos: { tankId: string; before?: string; after?: string }[];
  evidencePhotos: { id: string; file: string; caption: string }[];
}

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Helper to convert base64 to File
const base64ToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
};

// Open or create the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create projects store
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const store = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('clientName', 'clientName', { unique: false });
      }
    };
  });
};

// Serialize images for storage
const serializeImages = async (images: ReportImages): Promise<SerializedImages> => {
  const serialized: SerializedImages = {
    tankPhotos: [],
    evidencePhotos: [],
  };

  if (images.companyLogo) serialized.companyLogo = await fileToBase64(images.companyLogo);
  if (images.companyHeader) serialized.companyHeader = await fileToBase64(images.companyHeader);
  if (images.certificate) serialized.certificate = await fileToBase64(images.certificate);
  if (images.coverFooter) serialized.coverFooter = await fileToBase64(images.coverFooter);
  if (images.coverPhoto) serialized.coverPhoto = await fileToBase64(images.coverPhoto);
  if (images.labResults) serialized.labResults = await fileToBase64(images.labResults);
  if (images.dosingSetup) serialized.dosingSetup = await fileToBase64(images.dosingSetup);
  if (images.initialChemical) serialized.initialChemical = await fileToBase64(images.initialChemical);

  for (const photo of images.evidencePhotos) {
    serialized.evidencePhotos.push({
      id: photo.id,
      file: await fileToBase64(photo.file),
      caption: photo.caption,
    });
  }

  for (const tankPhoto of images.tankPhotos) {
    serialized.tankPhotos.push({
      tankId: tankPhoto.tankId,
      before: tankPhoto.before ? await fileToBase64(tankPhoto.before) : undefined,
      after: tankPhoto.after ? await fileToBase64(tankPhoto.after) : undefined,
    });
  }

  return serialized;
};

// Deserialize images from storage
const deserializeImages = async (serialized: SerializedImages): Promise<ReportImages> => {
  const images: ReportImages = {
    tankPhotos: [],
    evidencePhotos: [],
  };

  if (serialized.companyLogo) images.companyLogo = await base64ToFile(serialized.companyLogo, 'logo.png');
  if (serialized.companyHeader) images.companyHeader = await base64ToFile(serialized.companyHeader, 'header.png');
  if (serialized.certificate) images.certificate = await base64ToFile(serialized.certificate, 'cert.png');
  if (serialized.coverFooter) images.coverFooter = await base64ToFile(serialized.coverFooter, 'footer.png');
  if (serialized.coverPhoto) images.coverPhoto = await base64ToFile(serialized.coverPhoto, 'cover.jpg');
  if (serialized.labResults) images.labResults = await base64ToFile(serialized.labResults, 'lab.jpg');
  if (serialized.dosingSetup) images.dosingSetup = await base64ToFile(serialized.dosingSetup, 'dosing.jpg');
  if (serialized.initialChemical) images.initialChemical = await base64ToFile(serialized.initialChemical, 'chem.jpg');

  for (const photo of serialized.evidencePhotos) {
    images.evidencePhotos.push({
      id: photo.id,
      file: await base64ToFile(photo.file, 'evidence.jpg'),
      caption: photo.caption,
    });
  }

  for (const tankPhoto of serialized.tankPhotos) {
    images.tankPhotos.push({
      tankId: tankPhoto.tankId,
      before: tankPhoto.before ? await base64ToFile(tankPhoto.before, 'before.jpg') : undefined,
      after: tankPhoto.after ? await base64ToFile(tankPhoto.after, 'after.jpg') : undefined,
    });
  }

  return images;
};

// Save a project
export const saveProject = async (
  data: ReportData,
  images: ReportImages,
  projectId?: string
): Promise<string> => {
  const db = await openDB();
  const id = projectId || `project-${Date.now()}`;
  const now = new Date().toISOString();

  const serializedImages = await serializeImages(images);

  const project: SavedProject = {
    id,
    name: data.siteName || 'Untitled Project',
    clientName: data.clientName,
    siteName: data.siteName,
    createdAt: projectId ? (await getProject(projectId))?.createdAt || now : now,
    updatedAt: now,
    data,
    images: serializedImages,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.put(project);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
};

// Get a single project
export const getProject = async (id: string): Promise<SavedProject | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

// Load a project and return data + images
export const loadProject = async (
  id: string
): Promise<{ data: ReportData; images: ReportImages } | null> => {
  const project = await getProject(id);
  if (!project) return null;

  const images = await deserializeImages(project.images);
  return { data: project.data, images };
};

// Get all projects (summary only, no images)
export const getAllProjects = async (): Promise<Omit<SavedProject, 'images' | 'data'>[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly');
    const store = transaction.objectStore(PROJECTS_STORE);
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // Sort by updatedAt descending

    const projects: Omit<SavedProject, 'images' | 'data'>[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const { id, name, clientName, siteName, createdAt, updatedAt } = cursor.value;
        projects.push({ id, name, clientName, siteName, createdAt, updatedAt });
        cursor.continue();
      } else {
        resolve(projects);
      }
    };

    request.onerror = () => reject(request.error);
  });
};

// Delete a project
export const deleteProject = async (id: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Auto-save draft (using localStorage for simplicity, smaller data)
export const saveAutoDraft = async (data: ReportData, images: ReportImages): Promise<void> => {
  try {
    const serializedImages = await serializeImages(images);
    const draft = {
      timestamp: new Date().toISOString(),
      data,
      images: serializedImages,
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Auto-save failed:', error);
  }
};

// Load auto-saved draft
export const loadAutoDraft = async (): Promise<{ data: ReportData; images: ReportImages } | null> => {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return null;

    const draft = JSON.parse(saved);
    const images = await deserializeImages(draft.images);
    return { data: draft.data, images };
  } catch (error) {
    console.warn('Failed to load auto-draft:', error);
    return null;
  }
};

// Clear auto-saved draft
export const clearAutoDraft = (): void => {
  localStorage.removeItem(AUTOSAVE_KEY);
};

// Check if auto-draft exists
export const hasAutoDraft = (): boolean => {
  return localStorage.getItem(AUTOSAVE_KEY) !== null;
};

// Get auto-draft timestamp
export const getAutoDraftTimestamp = (): string | null => {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return null;
    const draft = JSON.parse(saved);
    return draft.timestamp;
  } catch {
    return null;
  }
};
