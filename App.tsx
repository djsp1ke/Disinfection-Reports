
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ImageUpload from './components/ImageUpload';
import ReportView from './components/ReportView';
import LoadingOverlay from './components/LoadingOverlay';
import OfflineIndicator from './components/OfflineIndicator';
import ProjectsList from './components/ProjectsList';
import ShareDialog from './components/ShareDialog';
import { useToast } from './components/Toast';
import { useOffline } from './hooks/useOffline';
import { generateReportAnalysis } from './services/geminiService';
import { saveProject, saveAutoDraft, loadAutoDraft, hasAutoDraft, getAutoDraftTimestamp, clearAutoDraft } from './services/dbService';
import { parseShareableUrl, clearShareParameter } from './services/collaborationService';
import { ReportData, ReportImages, TestPoint, ReportPhoto, JobType, Tank, TankPhotoSet } from './types';

const CLIENT_LIST = [
  "NHS Property Services",
  "Balfour Beatty",
  "Kier Construction",
  "Mitie Facilities Management",
  "CBRE",
  "Engie",
  "Local Council",
  "University Estates Dept"
];

const INITIAL_TEST_POINT: TestPoint = {
  id: '', 
  location: '',
  system: 'Hot',
  time: '',
  ph: '7.0',
  initialPpm: '50',
  midPpm: '50',
  finalPpm: '50'
};

const INITIAL_TANK: Tank = {
  id: '',
  description: '',
  location: '',
  capacity: ''
};

const INITIAL_DATA: ReportData = {
  jobType: 'Pipework',
  clientName: '',
  commissionedBy: '',
  siteName: '',
  siteAddress: '',
  serviceDate: new Date().toISOString().split('T')[0],
  technicianName: '',
  disinfectant: 'Sodium Hypochlorite',
  chemicalStrength: '14', // Default %
  concentrationTarget: '50', // PPM
  contactTime: '1 Hour',
  systemVolume: '',
  amountAdded: '',
  neutralisingAgent: 'Sodium Thiosulfate',
  preFlushDuration: '10 Minutes',
  injectionPoint: '',
  tanks: [],
  testPoints: [],
  incomingMainsPh: '7.0',
  residualChlorine: '<0.5',
  scopeOfWorks: '',
  comments: ''
};

// --- Helpers for Save/Load ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const base64ToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
};
// -----------------------------

const App: React.FC = () => {
  const [view, setView] = useState<'form' | 'report'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [loadingSubMessage, setLoadingSubMessage] = useState<string | undefined>(undefined);
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [images, setImages] = useState<ReportImages>({ evidencePhotos: [], tankPhotos: [] });
  const [phWarning, setPhWarning] = useState<string | null>(null);
  const [recommendedTime, setRecommendedTime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const { isOffline, updateAvailable, updateServiceWorker } = useOffline();
  const [showProjectsList, setShowProjectsList] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // --- Auto-Calculate Dosage ---
  useEffect(() => {
    const vol = parseFloat(data.systemVolume);
    const target = parseFloat(data.concentrationTarget);
    const strength = parseFloat(data.chemicalStrength);

    if (!isNaN(vol) && !isNaN(target) && !isNaN(strength) && strength > 0) {
      // Formula: (Volume (L) * Target (mg/L)) / (Strength (%) * 10,000) = Litres of Chemical
      const litresRequired = (vol * target) / (strength * 10000);
      
      let displayAmount = "";
      if (litresRequired < 1) {
        displayAmount = `${Math.round(litresRequired * 1000)} ml`;
      } else {
        displayAmount = `${litresRequired.toFixed(2)} Litres`;
      }
      
      setData(prev => ({ ...prev, amountAdded: displayAmount }));
    }
  }, [data.systemVolume, data.concentrationTarget, data.chemicalStrength]);


  // --- pH & Contact Time Logic (PD 855468 Table 2) ---
  useEffect(() => {
    // Only apply pH logic to Sodium Hypochlorite as it's pH dependent
    if (data.disinfectant.includes('Sodium Hypochlorite')) {
      const ph = parseFloat(data.incomingMainsPh);
      
      if (isNaN(ph)) {
        setPhWarning(null);
        setRecommendedTime(null);
        return;
      }

      // Logic from Table 2 of PD 855468
      if (ph < 7.6) {
        setPhWarning(null);
        setRecommendedTime(null); // Standard 1 hour applies
      } else {
        let msg = '';
        let time = '';

        if (ph >= 7.6 && ph < 7.7) {
          msg = "pH 7.6 detected. Increase contact time.";
          time = "1.00 Hour"; // Strictly table says 1.00, but logic implies sensitivity
        } else if (ph >= 7.7 && ph < 7.85) {
          msg = "pH ≥ 7.7 detected. High pH reduces chlorine efficacy.";
          time = "1.25 Hours (1h 15m)";
        } else if (ph >= 7.85 && ph < 8.0) {
           msg = "pH ≥ 7.85 detected. Significant efficacy loss.";
           time = "1.67 Hours (1h 40m)";
        } else if (ph >= 8.0 && ph < 8.45) {
           msg = "pH ≥ 8.0 detected. Severe efficacy loss.";
           time = "2.50 Hours (2h 30m)";
        } else if (ph >= 8.45) {
           msg = "pH ≥ 8.45 detected. Chlorine not recommended without pH correction.";
           time = "5.00 Hours";
        }

        setPhWarning(msg);
        setRecommendedTime(time);
      }
    } else {
      setPhWarning(null);
      setRecommendedTime(null);
    }
  }, [data.incomingMainsPh, data.disinfectant]);

  // Ensure tankPhotos array matches tanks array
  useEffect(() => {
    if (data.jobType === 'Tank') {
      setImages(prev => {
        const existingMap = new Map(prev.tankPhotos.map(tp => [tp.tankId, tp]));
        const newTankPhotos: TankPhotoSet[] = data.tanks.map(tank => {
           return existingMap.get(tank.id) || { tankId: tank.id };
        });
        return { ...prev, tankPhotos: newTankPhotos };
      });
    }
  }, [data.tanks, data.jobType]);

  // Check for draft recovery on initial load
  useEffect(() => {
    if (hasAutoDraft()) {
      setShowDraftRecovery(true);
    }
  }, []);

  // Check for incoming share URL
  useEffect(() => {
    const sharedData = parseShareableUrl();
    if (sharedData) {
      setData(sharedData);
      clearShareParameter();
      addToast({
        type: 'success',
        title: 'Project Imported',
        message: 'Shared project data has been loaded. Add images as needed.',
        duration: 6000,
      });
    }
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (data.clientName || data.siteName) {
        saveAutoDraft(data, images).catch(console.error);
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [data, images]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleChemicalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const chem = e.target.value;
     let newStrength = data.chemicalStrength;
     let newTarget = data.concentrationTarget;

     // Set defaults based on common industry products
     if (chem === 'Sodium Hypochlorite') {
       newStrength = '14';
       newTarget = '50';
     } else if (chem === 'Hydrogen Peroxide (Silver Stabilised)') {
       newStrength = '35'; // Common commercial strength
       newTarget = '150';  // Common target for Silver Peroxide
     } else if (chem === 'Chlorine Dioxide') {
       newStrength = '0.3'; // Often generated at low %
       newTarget = '50';
     }

     setData(prev => ({ 
       ...prev, 
       disinfectant: chem,
       chemicalStrength: newStrength,
       concentrationTarget: newTarget
     }));
  };

  // --- Tank Management ---
  const handleAddTank = () => {
    const newTank: Tank = { ...INITIAL_TANK, id: Date.now().toString() };
    setData(prev => ({ ...prev, tanks: [...prev.tanks, newTank] }));
  };

  const handleUpdateTank = (id: string, field: keyof Tank, value: string) => {
    setData(prev => ({
      ...prev,
      tanks: prev.tanks.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleRemoveTank = (id: string) => {
    setData(prev => ({ ...prev, tanks: prev.tanks.filter(t => t.id !== id) }));
  };
  // -----------------------

  const handleAddTestPoint = () => {
    const newPoint = { ...INITIAL_TEST_POINT, id: Date.now().toString() };
    setData(prev => ({ ...prev, testPoints: [...prev.testPoints, newPoint] }));
  };

  const handleUpdateTestPoint = (id: string, field: keyof TestPoint, value: string) => {
    setData(prev => ({
      ...prev,
      testPoints: prev.testPoints.map(tp => tp.id === id ? { ...tp, [field]: value } : tp)
    }));
  };

  const handleRemoveTestPoint = (id: string) => {
    setData(prev => ({ ...prev, testPoints: prev.testPoints.filter(tp => tp.id !== id) }));
  };

  const handleAddPhoto = (file: File) => {
    const newPhoto: ReportPhoto = {
      id: Date.now().toString(),
      file,
      caption: ''
    };
    setImages(prev => ({ ...prev, evidencePhotos: [...prev.evidencePhotos, newPhoto] }));
  };

  const handleUpdatePhotoCaption = (id: string, caption: string) => {
    setImages(prev => ({
      ...prev,
      evidencePhotos: prev.evidencePhotos.map(p => p.id === id ? { ...p, caption } : p)
    }));
  };

  const handleRemovePhoto = (id: string) => {
    setImages(prev => ({ ...prev, evidencePhotos: prev.evidencePhotos.filter(p => p.id !== id) }));
  };

  const handleTankPhotoUpdate = (tankId: string, type: 'before' | 'after', file: File | undefined) => {
    setImages(prev => ({
      ...prev,
      tankPhotos: prev.tankPhotos.map(tp =>
        tp.tankId === tankId ? { ...tp, [type]: file } : tp
      )
    }));
  };

  // --- Draft Recovery ---
  const handleRecoverDraft = async () => {
    setIsGenerating(true);
    setLoadingMessage('Recovering Draft');
    setLoadingSubMessage('Restoring your unsaved work...');
    try {
      const draft = await loadAutoDraft();
      if (draft) {
        setData(draft.data);
        setImages(draft.images);
        addToast({
          type: 'success',
          title: 'Draft Recovered',
          message: 'Your unsaved work has been restored.',
        });
      }
    } catch (error) {
      console.error('Failed to recover draft:', error);
      addToast({
        type: 'error',
        title: 'Recovery Failed',
        message: 'Could not recover your draft.',
      });
    } finally {
      setShowDraftRecovery(false);
      setIsGenerating(false);
      setLoadingSubMessage(undefined);
    }
  };

  const handleDismissDraft = () => {
    clearAutoDraft();
    setShowDraftRecovery(false);
    addToast({
      type: 'info',
      title: 'Draft Dismissed',
      message: 'Starting with a fresh form.',
    });
  };

  // --- Save to Database ---
  const handleSaveToDB = async () => {
    setIsGenerating(true);
    setLoadingMessage('Saving Project');
    setLoadingSubMessage('Storing your project locally...');
    try {
      const projectId = await saveProject(data, images, currentProjectId || undefined);
      setCurrentProjectId(projectId);
      clearAutoDraft();
      addToast({
        type: 'success',
        title: 'Project Saved',
        message: `Saved "${data.siteName || 'Untitled'}" to local storage.`,
      });
    } catch (error) {
      console.error('Failed to save project:', error);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save the project to local storage.',
      });
    } finally {
      setIsGenerating(false);
      setLoadingSubMessage(undefined);
    }
  };

  // --- Load Project from List ---
  const handleLoadFromProjectsList = (loadedData: ReportData, loadedImages: ReportImages) => {
    setData(loadedData);
    setImages(loadedImages);
    clearAutoDraft();
    addToast({
      type: 'success',
      title: 'Project Loaded',
      message: `Loaded "${loadedData.siteName || 'Untitled'}" from local storage.`,
    });
  };

  // --- New Project ---
  const handleNewProject = () => {
    if (data.clientName || data.siteName) {
      if (!confirm('Start a new project? Any unsaved changes will be lost.')) return;
    }
    setData(INITIAL_DATA);
    setImages({ evidencePhotos: [], tankPhotos: [] });
    setCurrentProjectId(null);
    clearAutoDraft();
    addToast({
      type: 'info',
      title: 'New Project',
      message: 'Started a fresh project.',
    });
  };

  const handleJobTypeChange = (type: JobType) => {
    if (data.jobType === type) return;

    setData(prev => {
      const newTanks = (type === 'Tank' && prev.tanks.length === 0) 
        ? [{ ...INITIAL_TANK, id: Date.now().toString() }] 
        : prev.tanks;

      return { ...prev, jobType: type, tanks: newTanks };
    });

    setImages(prev => ({
      ...prev,
      dosingSetup: undefined,
      tankPhotos: []
    }));
  };

  const handleGenerate = async () => {
    // Check if offline - skip AI generation
    if (isOffline) {
      addToast({
        type: 'info',
        title: 'Offline Mode',
        message: 'AI generation skipped. You can still view and edit your report manually.',
      });
      setView('report');
      return;
    }

    setIsGenerating(true);
    setLoadingMessage('Generating Report');
    setLoadingSubMessage('AI is analyzing your data and generating professional content...');
    try {
      const result = await generateReportAnalysis(data);
      setData(prev => ({
        ...prev,
        scopeOfWorks: result.scopeOfWorks || prev.scopeOfWorks,
        comments: result.comments || prev.comments
      }));
      addToast({
        type: 'success',
        title: 'Report Generated',
        message: 'Your report has been successfully generated with AI content.',
      });
      setView('report');
    } catch (error) {
      console.error("Error generating report:", error);
      addToast({
        type: 'warning',
        title: 'AI Generation Failed',
        message: 'Could not generate AI content. Opening manual view instead.',
        duration: 6000,
      });
      setView('report');
    } finally {
      setIsGenerating(false);
      setLoadingSubMessage(undefined);
    }
  };

  // --- SAVE / LOAD PROJECT ---
  const handleSaveProject = async () => {
    setIsGenerating(true);
    setLoadingMessage('Saving Project');
    setLoadingSubMessage('Packaging your project files...');
    try {
      const serializedImages: any = {
        evidencePhotos: [],
        tankPhotos: []
      };

      if (images.companyLogo) serializedImages.companyLogo = await fileToBase64(images.companyLogo);
      if (images.companyHeader) serializedImages.companyHeader = await fileToBase64(images.companyHeader);
      if (images.certificate) serializedImages.certificate = await fileToBase64(images.certificate);
      if (images.coverFooter) serializedImages.coverFooter = await fileToBase64(images.coverFooter);
      if (images.coverPhoto) serializedImages.coverPhoto = await fileToBase64(images.coverPhoto);
      if (images.labResults) serializedImages.labResults = await fileToBase64(images.labResults);
      if (images.dosingSetup) serializedImages.dosingSetup = await fileToBase64(images.dosingSetup);
      if (images.initialChemical) serializedImages.initialChemical = await fileToBase64(images.initialChemical);

      for (const p of images.evidencePhotos) {
        serializedImages.evidencePhotos.push({
          id: p.id,
          caption: p.caption,
          file: await fileToBase64(p.file)
        });
      }

      for (const t of images.tankPhotos) {
        serializedImages.tankPhotos.push({
          tankId: t.tankId,
          before: t.before ? await fileToBase64(t.before) : null,
          after: t.after ? await fileToBase64(t.after) : null
        });
      }

      const exportObj = {
        version: "1.2",
        timestamp: new Date().toISOString(),
        data,
        images: serializedImages
      };

      const jsonString = JSON.stringify(exportObj);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WCS_Project_${data.siteName || 'Untitled'}_${new Date().toISOString().slice(0,10)}.wcs`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Project Saved',
        message: `Saved as WCS_Project_${data.siteName || 'Untitled'}.wcs`,
      });

    } catch (err) {
      console.error("Save failed", err);
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save the project. Please try again.',
      });
    } finally {
      setIsGenerating(false);
      setLoadingSubMessage(undefined);
    }
  };

  const handleLoadProjectClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleLoadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    setLoadingMessage('Loading Project');
    setLoadingSubMessage('Restoring your project data and images...');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.data || !parsed.images) {
        throw new Error("Invalid file format");
      }

      setData(parsed.data);

      const restoredImages: ReportImages = {
        evidencePhotos: [],
        tankPhotos: []
      };

      if (parsed.images.companyLogo) restoredImages.companyLogo = await base64ToFile(parsed.images.companyLogo, 'logo.png');
      if (parsed.images.companyHeader) restoredImages.companyHeader = await base64ToFile(parsed.images.companyHeader, 'header.png');
      if (parsed.images.certificate) restoredImages.certificate = await base64ToFile(parsed.images.certificate, 'cert.png');
      if (parsed.images.coverFooter) restoredImages.coverFooter = await base64ToFile(parsed.images.coverFooter, 'footer.png');
      if (parsed.images.coverPhoto) restoredImages.coverPhoto = await base64ToFile(parsed.images.coverPhoto, 'cover.jpg');
      if (parsed.images.labResults) restoredImages.labResults = await base64ToFile(parsed.images.labResults, 'lab.jpg');
      if (parsed.images.dosingSetup) restoredImages.dosingSetup = await base64ToFile(parsed.images.dosingSetup, 'dosing.jpg');
      if (parsed.images.initialChemical) restoredImages.initialChemical = await base64ToFile(parsed.images.initialChemical, 'chem.jpg');

      if (parsed.images.evidencePhotos) {
        for (const p of parsed.images.evidencePhotos) {
          restoredImages.evidencePhotos.push({
            id: p.id,
            caption: p.caption,
            file: await base64ToFile(p.file, 'evidence.jpg')
          });
        }
      }

      if (parsed.images.tankPhotos) {
        for (const t of parsed.images.tankPhotos) {
          restoredImages.tankPhotos.push({
            tankId: t.tankId,
            before: t.before ? await base64ToFile(t.before, 'before.jpg') : undefined,
            after: t.after ? await base64ToFile(t.after, 'after.jpg') : undefined
          });
        }
      }

      setImages(restoredImages);
      addToast({
        type: 'success',
        title: 'Project Loaded',
        message: `Successfully loaded ${file.name}`,
      });

    } catch (err) {
      console.error("Load failed", err);
      addToast({
        type: 'error',
        title: 'Load Failed',
        message: 'Could not load the project file. It may be corrupted or in an invalid format.',
        duration: 6000,
      });
    } finally {
      setIsGenerating(false);
      setLoadingSubMessage(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (view === 'report') {
    return <ReportView data={data} images={images} onEdit={() => setView('form')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

      <LoadingOverlay
        isVisible={isGenerating}
        message={loadingMessage}
        subMessage={loadingSubMessage}
      />

      <OfflineIndicator
        isOffline={isOffline}
        updateAvailable={updateAvailable}
        onUpdate={updateServiceWorker}
      />

      <ProjectsList
        isOpen={showProjectsList}
        onClose={() => setShowProjectsList(false)}
        onLoadProject={handleLoadFromProjectsList}
      />

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        data={data}
      />

      {/* Draft Recovery Dialog */}
      {showDraftRecovery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Unsaved Draft Found</h3>
                <p className="text-sm text-slate-600">Would you like to recover your previous work?</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Last saved: {getAutoDraftTimestamp() ? new Date(getAutoDraftTimestamp()!).toLocaleString() : 'Unknown'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRecoverDraft}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700"
              >
                Recover Draft
              </button>
              <button
                onClick={handleDismissDraft}
                className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-300"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadProjectFile}
        accept=".wcs,.json"
        className="hidden"
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#0070c0] text-white p-1 px-2 font-bold text-xs rounded">WCS</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Report Generator</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex gap-1 sm:gap-2 mr-2 border-r pr-2 sm:pr-4 border-slate-200">
              <button onClick={handleNewProject} disabled={isGenerating} className="text-xs sm:text-sm font-medium text-slate-600 hover:text-[#0070c0] flex items-center gap-1 px-1 sm:px-2" title="New Project">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">New</span>
              </button>
              <button onClick={() => setShowProjectsList(true)} disabled={isGenerating} className="text-xs sm:text-sm font-medium text-slate-600 hover:text-[#0070c0] flex items-center gap-1 px-1 sm:px-2" title="Browse Projects">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                <span className="hidden sm:inline">Projects</span>
              </button>
              <button onClick={handleSaveToDB} disabled={isGenerating} className="text-xs sm:text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1 px-1 sm:px-2" title="Save to Local Storage">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="hidden sm:inline">Save</span>
              </button>
              <button onClick={() => setShowShareDialog(true)} disabled={isGenerating || !data.siteName} className="text-xs sm:text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1 px-1 sm:px-2" title="Share Project">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
            <div className="flex gap-1 sm:gap-2 mr-2 border-r pr-2 sm:pr-4 border-slate-200">
              <button onClick={handleSaveProject} disabled={isGenerating} className="text-xs sm:text-sm font-medium text-slate-500 hover:text-[#0070c0] flex items-center gap-1 px-1 sm:px-2" title="Export as .wcs file">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={handleLoadProjectClick} disabled={isGenerating} className="text-xs sm:text-sm font-medium text-slate-500 hover:text-[#0070c0] flex items-center gap-1 px-1 sm:px-2" title="Import .wcs file">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="hidden sm:inline">Import</span>
              </button>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => handleJobTypeChange('Pipework')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${data.jobType === 'Pipework' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Pipework</button>
              <button onClick={() => handleJobTypeChange('Tank')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${data.jobType === 'Tank' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Tank</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Branding */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-slate-200 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">0</span>
              Company Branding
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
             <ImageUpload label="Company Square Logo" id="logo" file={images.companyLogo} onFileChange={(f) => setImages(prev => ({ ...prev, companyLogo: f }))} />
              <ImageUpload label="Company Header Logo (Wide)" id="header" file={images.companyHeader} onFileChange={(f) => setImages(prev => ({ ...prev, companyHeader: f }))} />
              <ImageUpload label="Cover Page Footer (Wide)" id="coverFooter" file={images.coverFooter} onFileChange={(f) => setImages(prev => ({ ...prev, coverFooter: f }))} />
              <ImageUpload label="Accreditation Certificate" id="cert" file={images.certificate} onFileChange={(f) => setImages(prev => ({ ...prev, certificate: f }))} />
          </div>
        </section>
        
        {/* Job Info */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Job Details
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Commissioned By (Person)</label>
               <input type="text" name="commissionedBy" value={data.commissionedBy} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. Scott Hartley" />
             </div>
             
             {/* Client Automated Dropdown */}
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Client Company</label>
               <input 
                list="client-options" 
                type="text" 
                name="clientName" 
                value={data.clientName} 
                onChange={handleInputChange} 
                className="w-full input-field border rounded p-2" 
                placeholder="Select or Type Client..." 
               />
               <datalist id="client-options">
                 {CLIENT_LIST.map((client, i) => <option key={i} value={client} />)}
               </datalist>
             </div>

             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Site Name</label>
               <input type="text" name="siteName" value={data.siteName} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. Lidl - Tamebridge" />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Site Address (Full)</label>
               <input type="text" name="siteAddress" value={data.siteAddress} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. Walsall WS5 4QL, UK" />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Service Date</label>
               <input type="date" name="serviceDate" value={data.serviceDate} onChange={handleInputChange} className="w-full input-field border rounded p-2" />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Technician Name</label>
               <input type="text" name="technicianName" value={data.technicianName} onChange={handleInputChange} className="w-full input-field border rounded p-2" />
             </div>
          </div>
        </section>

        {/* Process Info - UPDATED with Calculator & pH Logic */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              Process & Automation
            </h2>
          </div>
          <div className="p-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Disinfectant Used</label>
                <select name="disinfectant" value={data.disinfectant} onChange={handleChemicalChange} className="w-full input-field border rounded p-2 bg-white">
                  <option value="Sodium Hypochlorite">Sodium Hypochlorite</option>
                  <option value="Hydrogen Peroxide (Silver Stabilised)">Hydrogen Peroxide (Silver Stabilised)</option>
                  <option value="Chlorine Dioxide">Chlorine Dioxide</option>
                  <option value="Thermal Disinfection">Thermal Disinfection</option>
                </select>
              </div>
              <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Injection Point Location</label>
                 <input type="text" name="injectionPoint" value={data.injectionPoint} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. Outside plant room / Toilet" />
              </div>
            </div>

            {/* Automation Area for Calculation */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
               <h3 className="text-sm font-bold text-[#1a237e] mb-4 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                 Dosage Calculator (PD 855468)
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">System Volume (Litres)</label>
                    <input type="number" name="systemVolume" value={data.systemVolume} onChange={handleInputChange} className="w-full border rounded p-2 border-blue-200" placeholder="e.g. 1000" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Chem Strength (%)</label>
                    <input type="number" name="chemicalStrength" value={data.chemicalStrength} onChange={handleInputChange} className="w-full border rounded p-2 border-blue-200" placeholder="e.g. 14" />
                  </div>
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Target PPM</label>
                    <input type="number" name="concentrationTarget" value={data.concentrationTarget} onChange={handleInputChange} className="w-full border rounded p-2 border-blue-200" placeholder="e.g. 50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-green-700 uppercase">Calculated Dosage</label>
                    <input type="text" name="amountAdded" value={data.amountAdded} readOnly className="w-full border rounded p-2 bg-green-50 border-green-200 text-green-800 font-bold" />
                  </div>
               </div>
               <p className="text-[10px] text-slate-400 mt-2">Formula: (Vol × PPM) / (Strength% × 10,000)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase">Contact Time</label>
                <input type="text" name="contactTime" value={data.contactTime} onChange={handleInputChange} className={`w-full input-field border rounded p-2 ${phWarning ? 'border-amber-400 bg-amber-50' : ''}`} placeholder="e.g. 1 Hour" />
                {recommendedTime && (
                   <button 
                    onClick={() => setData(prev => ({ ...prev, contactTime: recommendedTime }))}
                    className="absolute right-2 top-8 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded hover:bg-amber-600"
                   >
                     Apply {recommendedTime}
                   </button>
                )}
                {phWarning && <p className="text-amber-600 text-xs mt-1 font-bold">{phWarning}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Pre-Flush Duration</label>
                <input type="text" name="preFlushDuration" value={data.preFlushDuration} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. 10 Mins" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Neutralising Agent</label>
                <input type="text" name="neutralisingAgent" value={data.neutralisingAgent} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. Sodium Thiosulfate" />
              </div>
            </div>

          </div>
        </section>

        {/* Tank Details */}
        {data.jobType === 'Tank' && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">T</span>
                Tank Details
              </h2>
              <button onClick={handleAddTank} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ Add Tank</button>
            </div>
            <div className="p-6 space-y-4">
              {data.tanks.map((tank, index) => (
                <div key={tank.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg relative bg-slate-50/50">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Description / Name</label>
                    <input type="text" value={tank.description} onChange={(e) => handleUpdateTank(tank.id, 'description', e.target.value)} className="w-full input-field border rounded p-2" placeholder="e.g. Main CWST" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                    <input type="text" value={tank.location} onChange={(e) => handleUpdateTank(tank.id, 'location', e.target.value)} className="w-full input-field border rounded p-2" placeholder="e.g. Plant Room" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Capacity</label>
                    <input type="text" value={tank.capacity} onChange={(e) => handleUpdateTank(tank.id, 'capacity', e.target.value)} className="w-full input-field border rounded p-2" placeholder="e.g. 1000 Litres" />
                  </div>
                  {data.tanks.length > 1 && (
                    <button onClick={() => handleRemoveTank(tank.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-600 text-xs">×</button>
                  )}
                  <div className="absolute top-2 right-2 text-xs font-bold text-slate-300 pointer-events-none">#{index + 1}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Test Points */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
              Disinfection Levels (Table)
            </h2>
            <button onClick={handleAddTestPoint} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">+ Add Point</button>
          </div>
          <div className="p-6 overflow-x-auto">
             <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded border border-slate-200">
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mains pH Level</label>
                 <input type="number" step="0.1" name="incomingMainsPh" value={data.incomingMainsPh} onChange={handleInputChange} className={`border rounded p-1 w-24 ${phWarning ? 'border-amber-500 bg-amber-50 text-amber-900' : ''}`} />
                 {phWarning && <span className="text-xs text-amber-600 font-bold ml-2">Check Contact Time!</span>}
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Final Residual Cl2</label>
                 <input type="text" name="residualChlorine" value={data.residualChlorine} onChange={handleInputChange} className="border rounded p-1 w-24" />
               </div>
             </div>
             <table className="w-full min-w-[600px] text-sm text-left">
               <thead>
                 <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
                   <th className="pb-2 w-1/3">Location</th>
                   <th className="pb-2 w-24">Initial (PPM)</th>
                   <th className="pb-2 w-24">30 Min (PPM)</th>
                   <th className="pb-2 w-24">1 Hour (PPM)</th>
                   <th className="pb-2 w-10"></th>
                 </tr>
               </thead>
               <tbody>
                 {data.testPoints.map((tp) => (
                   <tr key={tp.id} className="border-b border-slate-100 last:border-0 group hover:bg-slate-50">
                     <td className="py-2 pr-2">
                       <input type="text" value={tp.location} onChange={(e) => handleUpdateTestPoint(tp.id, 'location', e.target.value)} placeholder="e.g. Staff Kitchen Tap" className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1" />
                     </td>
                     <td className="py-2 pr-2">
                       <input type="text" value={tp.initialPpm} onChange={(e) => handleUpdateTestPoint(tp.id, 'initialPpm', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1" />
                     </td>
                     <td className="py-2 pr-2">
                       <input type="text" value={tp.midPpm} onChange={(e) => handleUpdateTestPoint(tp.id, 'midPpm', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1" />
                     </td>
                     <td className="py-2 pr-2">
                       <input type="text" value={tp.finalPpm} onChange={(e) => handleUpdateTestPoint(tp.id, 'finalPpm', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1" />
                     </td>
                     <td className="py-2 text-right">
                       <button onClick={() => handleRemoveTestPoint(tp.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                     </td>
                   </tr>
                 ))}
                 {data.testPoints.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-slate-400 italic">No test points added yet.</td></tr>}
               </tbody>
             </table>
          </div>
        </section>

        {/* Photos */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
              Evidence Photos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <ImageUpload label="Front Cover Photo" id="cover" file={images.coverPhoto} onFileChange={(f) => setImages(prev => ({ ...prev, coverPhoto: f }))} />
              
              {/* Optional Lab Results */}
              <ImageUpload label="Lab Results (Optional)" id="lab" file={images.labResults} onFileChange={(f) => setImages(prev => ({ ...prev, labResults: f }))} />
              
              <ImageUpload label="Initial Chemical Level" id="initialChem" file={images.initialChemical} onFileChange={(f) => setImages(prev => ({ ...prev, initialChemical: f }))} />

              {data.jobType === 'Pipework' && (
                <ImageUpload label="Dosing Equipment Setup" id="dosingSetup" file={images.dosingSetup} onFileChange={(f) => setImages(prev => ({ ...prev, dosingSetup: f }))} />
              )}

              {data.jobType === 'Tank' && data.tanks.map((tank, idx) => {
                 const photoSet = images.tankPhotos.find(tp => tp.tankId === tank.id);
                 return (
                    <React.Fragment key={tank.id}>
                      <ImageUpload label={`${tank.description || `Tank ${idx+1}`} - Before`} id={`tank_before_${tank.id}`} file={photoSet?.before} onFileChange={(f) => handleTankPhotoUpdate(tank.id, 'before', f)} className="border-blue-100 bg-blue-50/50 p-2 rounded" />
                      <ImageUpload label={`${tank.description || `Tank ${idx+1}`} - After`} id={`tank_after_${tank.id}`} file={photoSet?.after} onFileChange={(f) => handleTankPhotoUpdate(tank.id, 'after', f)} className="border-blue-100 bg-blue-50/50 p-2 rounded" />
                    </React.Fragment>
                 );
              })}

              <div className="border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-50 relative">
                 <span className="text-4xl text-slate-300 mb-2">+</span>
                 <span className="text-sm font-medium text-slate-600">Add Extra Photo</span>
                 <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                   if (e.target.files?.[0]) handleAddPhoto(e.target.files[0]);
                 }} />
              </div>
            </div>

            {images.evidencePhotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
                {images.evidencePhotos.map((photo, idx) => (
                  <div key={photo.id} className="relative group">
                     <ImageUpload label={`Extra Photo ${idx + 1}`} id={photo.id} file={photo.file} caption={photo.caption} onFileChange={() => {}} onCaptionChange={(c) => handleUpdatePhotoCaption(photo.id, c)} />
                     <button onClick={() => handleRemovePhoto(photo.id)} className="absolute top-8 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-40">
           <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="text-sm text-slate-500 hidden sm:block">
                 {data.jobType} Mode • {data.testPoints.length} test points • {images.evidencePhotos.length} extra photos
              </div>
              <button onClick={handleGenerate} disabled={isGenerating || !data.clientName} className={`px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all flex items-center gap-2 ${isGenerating || !data.clientName ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0070c0] hover:bg-blue-700 transform hover:-translate-y-0.5'}`}>
                {isGenerating ? <>Processing...</> : <>Generate Report</>}
              </button>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;
