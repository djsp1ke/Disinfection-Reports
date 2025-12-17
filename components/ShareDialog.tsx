
import React, { useState, useEffect } from 'react';
import { ReportData } from '../types';
import {
  generateShareableUrl,
  copyToClipboard,
  createCollaborationSession,
} from '../services/collaborationService';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportData;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, data }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'collaborate'>('link');
  const [collaborationUrl, setCollaborationUrl] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    if (isOpen && data.siteName) {
      const url = generateShareableUrl(data);
      setShareUrl(url);
    }
  }, [isOpen, data]);

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateCollaboration = async () => {
    setIsCreatingSession(true);
    try {
      const { shareUrl } = await createCollaborationSession();
      setCollaborationUrl(shareUrl);
    } catch (error) {
      console.error('Failed to create collaboration session:', error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleCopyCollaborationLink = async () => {
    const success = await copyToClipboard(collaborationUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Disinfection Report - ${data.siteName}`,
          text: `View the disinfection report for ${data.siteName}`,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Share Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'link'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Share Link
          </button>
          <button
            onClick={() => setActiveTab('collaborate')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'collaborate'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Collaborate
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">
                  Share this link to allow others to view and import your project data:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {navigator.share && (
                <button
                  onClick={handleShareViaWebShare}
                  className="w-full bg-slate-100 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share via Device
                </button>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Note</p>
                    <p className="text-xs text-amber-700">
                      This link contains project data only (no images). Images must be
                      re-uploaded by the recipient.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collaborate' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-800 mb-2">Real-time Collaboration</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Work together with your team in real-time. Changes sync automatically
                  across all connected users.
                </p>

                {!collaborationUrl ? (
                  <button
                    onClick={handleCreateCollaboration}
                    disabled={isCreatingSession}
                    className="bg-blue-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreatingSession ? 'Creating Session...' : 'Start Collaboration Session'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={collaborationUrl}
                        readOnly
                        className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-slate-600 truncate"
                      />
                      <button
                        onClick={handleCopyCollaborationLink}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                          copied
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-blue-600">
                      Share this link with collaborators to join the session
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Coming Soon</p>
                    <p className="text-xs text-slate-500">
                      Full real-time collaboration requires a backend server. This feature
                      is a preview of what's possible with WebSocket integration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Project: {data.siteName || 'Untitled'}
            </p>
            <button
              onClick={onClose}
              className="text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
