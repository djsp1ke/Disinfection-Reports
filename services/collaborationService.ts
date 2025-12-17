
import { ReportData, ReportImages } from '../types';

// Collaboration types
export interface ShareableProject {
  version: string;
  data: ReportData;
  sharedAt: string;
  expiresAt?: string;
}

export interface CollaboratorInfo {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'editor' | 'viewer';
  lastActive?: string;
}

// Compress data using LZ compression (basic implementation)
const compressData = (data: string): string => {
  // Using base64 for simple encoding - in production, use a proper compression library
  try {
    return btoa(encodeURIComponent(data));
  } catch {
    return data;
  }
};

const decompressData = (compressed: string): string => {
  try {
    return decodeURIComponent(atob(compressed));
  } catch {
    return compressed;
  }
};

// Generate a shareable URL with embedded data (for small projects)
export const generateShareableUrl = (data: ReportData): string => {
  // Only include essential data to keep URL manageable
  const essentialData = {
    v: '1',
    jt: data.jobType,
    cn: data.clientName,
    cb: data.commissionedBy,
    sn: data.siteName,
    sa: data.siteAddress,
    sd: data.serviceDate,
    tn: data.technicianName,
    dis: data.disinfectant,
    cs: data.chemicalStrength,
    ct: data.concentrationTarget,
    cTime: data.contactTime,
    sv: data.systemVolume,
    aa: data.amountAdded,
    na: data.neutralisingAgent,
    pfd: data.preFlushDuration,
    ip: data.injectionPoint,
    ph: data.incomingMainsPh,
    rc: data.residualChlorine,
    tp: data.testPoints.map(p => ({
      l: p.location,
      i: p.initialPpm,
      m: p.midPpm,
      f: p.finalPpm,
    })),
    tanks: data.tanks.map(t => ({
      d: t.description,
      l: t.location,
      c: t.capacity,
    })),
  };

  const compressed = compressData(JSON.stringify(essentialData));
  const baseUrl = window.location.origin + window.location.pathname;

  return `${baseUrl}?share=${compressed}`;
};

// Parse shareable URL data
export const parseShareableUrl = (): ReportData | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const shareData = urlParams.get('share');

  if (!shareData) return null;

  try {
    const decompressed = decompressData(shareData);
    const parsed = JSON.parse(decompressed);

    // Reconstruct full ReportData from compressed format
    const data: ReportData = {
      jobType: parsed.jt || 'Pipework',
      clientName: parsed.cn || '',
      commissionedBy: parsed.cb || '',
      siteName: parsed.sn || '',
      siteAddress: parsed.sa || '',
      serviceDate: parsed.sd || new Date().toISOString().split('T')[0],
      technicianName: parsed.tn || '',
      disinfectant: parsed.dis || 'Sodium Hypochlorite',
      chemicalStrength: parsed.cs || '14',
      concentrationTarget: parsed.ct || '50',
      contactTime: parsed.cTime || '1 Hour',
      systemVolume: parsed.sv || '',
      amountAdded: parsed.aa || '',
      neutralisingAgent: parsed.na || 'Sodium Thiosulfate',
      preFlushDuration: parsed.pfd || '10 Minutes',
      injectionPoint: parsed.ip || '',
      incomingMainsPh: parsed.ph || '7.0',
      residualChlorine: parsed.rc || '<0.5',
      scopeOfWorks: '',
      comments: '',
      testPoints: (parsed.tp || []).map((p: any, idx: number) => ({
        id: `tp-${idx}`,
        location: p.l || '',
        system: 'Hot',
        time: '',
        ph: '7.0',
        initialPpm: p.i || '',
        midPpm: p.m || '',
        finalPpm: p.f || '',
      })),
      tanks: (parsed.tanks || []).map((t: any, idx: number) => ({
        id: `tank-${idx}`,
        description: t.d || '',
        location: t.l || '',
        capacity: t.c || '',
      })),
    };

    return data;
  } catch (error) {
    console.error('Failed to parse share data:', error);
    return null;
  }
};

// Clear share parameter from URL without reload
export const clearShareParameter = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('share');
  window.history.replaceState({}, '', url.toString());
};

// Generate QR code data URL (using a simple SVG-based approach)
export const generateQRCodeSvg = async (text: string): Promise<string> => {
  // This is a placeholder - in production, use a QR library like 'qrcode'
  // For now, return a placeholder SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <rect x="20" y="20" width="160" height="160" fill="none" stroke="#333" stroke-width="2"/>
      <text x="100" y="100" text-anchor="middle" font-size="12" fill="#666">
        QR Code
      </text>
      <text x="100" y="120" text-anchor="middle" font-size="10" fill="#999">
        (Install qrcode library)
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Copy to clipboard helper
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
};

// Generate a unique session ID for potential real-time collaboration
export const generateSessionId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

// Collaboration status types
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Placeholder for WebSocket-based real-time collaboration
export interface CollaborationState {
  sessionId: string | null;
  status: ConnectionStatus;
  collaborators: CollaboratorInfo[];
  lastSync: string | null;
}

export const initialCollaborationState: CollaborationState = {
  sessionId: null,
  status: 'disconnected',
  collaborators: [],
  lastSync: null,
};

// This would connect to a WebSocket server for real-time collaboration
// Placeholder implementation - requires backend infrastructure
export const createCollaborationSession = async (): Promise<{ sessionId: string; shareUrl: string }> => {
  const sessionId = generateSessionId();
  const shareUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;

  console.log('Collaboration session created:', sessionId);
  console.log('Note: Real-time collaboration requires a WebSocket backend');

  return { sessionId, shareUrl };
};

// Check if we're joining a collaboration session
export const getSessionIdFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('session');
};
