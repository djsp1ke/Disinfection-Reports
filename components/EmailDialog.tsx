
import React, { useState } from 'react';
import { ReportData } from '../types';
import {
  generateEmailContent,
  openMailto,
  shareViaWebShare,
  canUseWebShare,
  generateEmailHtmlReport,
} from '../services/emailService';

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportData;
}

const EmailDialog: React.FC<EmailDialogProps> = ({ isOpen, onClose, data }) => {
  const [toEmail, setToEmail] = useState(data.commissionedBy ? '' : '');
  const [ccEmail, setCcEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { subject, body } = generateEmailContent(data);

  const handleSendViaMailto = () => {
    if (!toEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    openMailto({
      to: toEmail,
      cc: ccEmail || undefined,
      subject,
      body,
    });

    onClose();
  };

  const handleShareViaWebShare = async () => {
    setIsSending(true);
    try {
      // Create HTML file for attachment
      const htmlContent = generateEmailHtmlReport(data);
      const file = new File(
        [htmlContent],
        `Report_${data.siteName.replace(/\s+/g, '_')}_${data.serviceDate}.html`,
        { type: 'text/html' }
      );

      const shared = await shareViaWebShare(data, file);
      if (shared) {
        onClose();
      } else {
        // Fallback to mailto
        handleSendViaMailto();
      }
    } catch (error) {
      console.error('Share failed:', error);
      handleSendViaMailto();
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      alert('Email content copied to clipboard');
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `Subject: ${subject}\n\n${body}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Email content copied to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Send Report via Email</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Report Summary */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <h3 className="font-semibold text-slate-700 text-sm mb-2">Report Summary</h3>
            <p className="text-sm text-slate-600">
              <strong>{data.siteName}</strong> - {data.clientName}
            </p>
            <p className="text-xs text-slate-500 mt-1">{data.serviceDate}</p>
          </div>

          {/* Email Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                To Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                CC Email (Optional)
              </label>
              <input
                type="email"
                value={ccEmail}
                onChange={(e) => setCcEmail(e.target.value)}
                placeholder="cc@example.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Preview
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-sm text-slate-600 font-semibold mb-2">Subject: {subject}</p>
              <pre className="text-xs text-slate-500 whitespace-pre-wrap font-sans">
                {body.substring(0, 500)}...
              </pre>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex flex-col gap-2">
            {canUseWebShare() && (
              <button
                onClick={handleShareViaWebShare}
                disabled={isSending}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {isSending ? 'Sharing...' : 'Share (with attachment)'}
              </button>
            )}

            <button
              onClick={handleSendViaMailto}
              disabled={!toEmail}
              className="w-full bg-slate-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Open in Email Client
            </button>

            <button
              onClick={handleCopyToClipboard}
              className="w-full bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-300 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy Email Content
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center mt-3">
            Note: For attachments, use Print to PDF first then attach manually, or use Share if available.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailDialog;
