
import React, { useState } from 'react';
import { ReportData, ReportImages } from '../types';
import {
  generateEmailContent,
  openMailto,
  shareViaWebShare,
  canUseWebShare,
  canShareFiles,
  downloadWordForEmail,
  generateWordBlobForEmail,
} from '../services/emailService';

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportData;
  images: ReportImages;
}

const EmailDialog: React.FC<EmailDialogProps> = ({ isOpen, onClose, data, images }) => {
  const [toEmail, setToEmail] = useState('');
  const [ccEmail, setCcEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'downloaded'>('input');

  const { subject, body } = generateEmailContent(data);

  const handleDownloadAndPrepare = async () => {
    if (!toEmail) {
      alert('Please enter a recipient email address');
      return;
    }

    setIsProcessing(true);
    try {
      const filename = await downloadWordForEmail(data, images);
      setDownloadedFile(filename);
      setStep('downloaded');
    } catch (error) {
      console.error('Failed to generate document:', error);
      alert('Failed to generate document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEmailClient = () => {
    openMailto({
      to: toEmail,
      cc: ccEmail || undefined,
      subject,
      body: body + '\n\n[Please attach the downloaded report file]',
    });
  };

  const handleShareWithAttachment = async () => {
    setIsProcessing(true);
    try {
      const blob = await generateWordBlobForEmail(data, images);
      const file = new File(
        [blob],
        `Report_${data.siteName.replace(/\s+/g, '_')}_${data.serviceDate}.docx`,
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: subject,
          text: body.substring(0, 200) + '...',
          files: [file],
        });
        onClose();
      } else {
        // Fall back to download workflow
        handleDownloadAndPrepare();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        // Fall back to download workflow
        handleDownloadAndPrepare();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      alert('Email content copied to clipboard!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = `Subject: ${subject}\n\n${body}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Email content copied to clipboard!');
    }
  };

  const handleReset = () => {
    setStep('input');
    setDownloadedFile(null);
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
          {step === 'input' && (
            <>
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
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-36 overflow-y-auto">
                  <p className="text-sm text-slate-600 font-semibold mb-2">Subject: {subject}</p>
                  <pre className="text-xs text-slate-500 whitespace-pre-wrap font-sans">
                    {body.substring(0, 400)}...
                  </pre>
                </div>
              </div>
            </>
          )}

          {step === 'downloaded' && (
            <>
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-green-800 mb-2">Report Downloaded!</h3>
                <p className="text-sm text-green-700 mb-2">
                  <strong>{downloadedFile}</strong>
                </p>
                <p className="text-xs text-green-600">
                  The report has been saved to your Downloads folder.
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Next Step
                </h4>
                <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                  <li>Click "Open Email Client" below</li>
                  <li>Attach the downloaded report file</li>
                  <li>Review and send your email</li>
                </ol>
              </div>

              {/* Recipient Info */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-sm text-slate-600">
                  <strong>To:</strong> {toEmail}
                  {ccEmail && <span className="ml-3"><strong>CC:</strong> {ccEmail}</span>}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex flex-col gap-2">
            {step === 'input' && (
              <>
                {/* Primary Action - Share with attachment on supported devices */}
                {canUseWebShare() && canShareFiles() && (
                  <button
                    onClick={handleShareWithAttachment}
                    disabled={isProcessing || !toEmail}
                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    {isProcessing ? 'Preparing...' : 'Share with Attachment'}
                  </button>
                )}

                {/* Download & Email workflow */}
                <button
                  onClick={handleDownloadAndPrepare}
                  disabled={isProcessing || !toEmail}
                  className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
                    canUseWebShare() && canShareFiles()
                      ? 'bg-slate-600 text-white hover:bg-slate-700 disabled:opacity-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isProcessing ? 'Generating Report...' : 'Download Report & Email'}
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="w-full bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy Email Text
                </button>
              </>
            )}

            {step === 'downloaded' && (
              <>
                <button
                  onClick={handleOpenEmailClient}
                  className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Open Email Client
                </button>

                <button
                  onClick={handleReset}
                  className="w-full bg-slate-200 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-300 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </button>
              </>
            )}
          </div>

          {step === 'input' && (
            <p className="text-xs text-slate-400 text-center mt-3">
              The report will be generated as a Word document for attachment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDialog;
