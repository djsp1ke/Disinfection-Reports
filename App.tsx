import React, { useState, useEffect, useRef } from 'react';
import ImageUpload from './components/ImageUpload';
import ReportView from './components/ReportView';
import { generateReportAnalysis } from './services/geminiService';
import { ReportData, ReportImages, TestPoint, ReportPhoto, JobType, Tank, TankPhotoSet } from './types';

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
  disinfectant: 'Sodium Hypochlorite 12.5%',
  concentrationTarget: '50 PPM',
  contactTime: '1 Hour',
  injectionPoint: '',
  tanks: [],
  testPoints: [],
  incomingMainsPh: '7.0',
  residualChlorine: '<10 PPM',
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
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [images, setImages] = useState<ReportImages>({ evidencePhotos: [], tankPhotos: [] });
  const [phWarning, setPhWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to check pH levels for Sodium Hypochlorite
  useEffect(() => {
    if (data.disinfectant.includes('Sodium Hypochlorite')) {
      const ph = parseFloat(data.incomingMainsPh);
      if (!isNaN(ph) && ph > 7.6) {
        setPhWarning('pH > 7.6 detected. BS 8558 recommends increasing contact time by 15 minutes.');
      } else {
        setPhWarning(null);
      }
    } else {
      setPhWarning(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
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

  // Update a specific tank photo
  const handleTankPhotoUpdate = (tankId: string, type: 'before' | 'after', file: File | undefined) => {
    setImages(prev => ({
      ...prev,
      tankPhotos: prev.tankPhotos.map(tp => 
        tp.tankId === tankId ? { ...tp, [type]: file } : tp
      )
    }));
  };

  const handleJobTypeChange = (type: JobType) => {
    if (data.jobType === type) return;

    setData(prev => {
      // If switching TO tank mode and no tanks exist, add one default tank
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
    setIsGenerating(true);
    try {
      const result = await generateReportAnalysis(data);
      setData(prev => ({
        ...prev,
        scopeOfWorks: result.scopeOfWorks || prev.scopeOfWorks,
        comments: result.comments || prev.comments
      }));
      setView('report');
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate AI analysis. Opening manual view.");
      setView('report');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- SAVE / LOAD PROJECT ---
  const handleSaveProject = async () => {
    setIsGenerating(true);
    try {
      // Convert all images to Base64 strings for JSON storage
      const serializedImages: any = {
        evidencePhotos: [],
        tankPhotos: []
      };

      // Single Files
      if (images.companyLogo) serializedImages.companyLogo = await fileToBase64(images.companyLogo);
      if (images.companyHeader) serializedImages.companyHeader = await fileToBase64(images.companyHeader);
      if (images.certificate) serializedImages.certificate = await fileToBase64(images.certificate);
      if (images.coverPhoto) serializedImages.coverPhoto = await fileToBase64(images.coverPhoto);
      if (images.labResults) serializedImages.labResults = await fileToBase64(images.labResults);
      if (images.dosingSetup) serializedImages.dosingSetup = await fileToBase64(images.dosingSetup);
      if (images.initialChemical) serializedImages.initialChemical = await fileToBase64(images.initialChemical);

      // Evidence Photos array
      for (const p of images.evidencePhotos) {
        serializedImages.evidencePhotos.push({
          id: p.id,
          caption: p.caption,
          file: await fileToBase64(p.file)
        });
      }

      // Tank Photos array
      for (const t of images.tankPhotos) {
        serializedImages.tankPhotos.push({
          tankId: t.tankId,
          before: t.before ? await fileToBase64(t.before) : null,
          after: t.after ? await fileToBase64(t.after) : null
        });
      }

      const exportObj = {
        version: "1.0",
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

    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save project.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadProjectClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleLoadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.data || !parsed.images) {
        throw new Error("Invalid file format");
      }

      // Restore Data
      setData(parsed.data);

      // Restore Images (Convert Base64 back to File objects)
      const restoredImages: ReportImages = {
        evidencePhotos: [],
        tankPhotos: []
      };

      if (parsed.images.companyLogo) restoredImages.companyLogo = await base64ToFile(parsed.images.companyLogo, 'logo.png');
      if (parsed.images.companyHeader) restoredImages.companyHeader = await base64ToFile(parsed.images.companyHeader, 'header.png');
      if (parsed.images.certificate) restoredImages.certificate = await base64ToFile(parsed.images.certificate, 'cert.png');
      if (parsed.images.coverPhoto) restoredImages.coverPhoto = await base64ToFile(parsed.images.coverPhoto, 'cover.jpg');
      if (parsed.images.labResults) restoredImages.labResults = await base64ToFile(parsed.images.labResults, 'lab.jpg');
      if (parsed.images.dosingSetup) restoredImages.dosingSetup = await base64ToFile(parsed.images.dosingSetup, 'dosing.jpg');
      if (parsed.images.initialChemical) restoredImages.initialChemical = await base64ToFile(parsed.images.initialChemical, 'chem.jpg');

      // Evidence
      if (parsed.images.evidencePhotos) {
        for (const p of parsed.images.evidencePhotos) {
          restoredImages.evidencePhotos.push({
            id: p.id,
            caption: p.caption,
            file: await base64ToFile(p.file, 'evidence.jpg')
          });
        }
      }

      // Tank Photos
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
      alert("Project loaded successfully!");

    } catch (err) {
      console.error("Load failed", err);
      alert("Failed to load project file. It may be corrupted.");
    } finally {
      setIsGenerating(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
    }
  };
  // -----------------------------

  if (view === 'report') {
    return <ReportView data={data} images={images} onEdit={() => setView('form')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Hidden File Input for Loading */}
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
            
            {/* Save/Load Buttons */}
            <div className="flex gap-2 mr-2 border-r pr-4 border-slate-200">
              <button 
                onClick={handleSaveProject} 
                disabled={isGenerating}
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-[#0070c0] flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save
              </button>
              <button 
                onClick={handleLoadProjectClick}
                disabled={isGenerating}
                className="text-xs sm:text-sm font-medium text-slate-600 hover:text-[#0070c0] flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Load
              </button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => handleJobTypeChange('Pipework')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${data.jobType === 'Pipework' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Pipework
              </button>
              <button 
                onClick={() => handleJobTypeChange('Tank')}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-all ${data.jobType === 'Tank' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Tank
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Section 0: Company Branding */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-slate-200 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">0</span>
              Company Branding
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
             <ImageUpload 
                label="Company Square Logo" 
                id="logo"
                file={images.companyLogo} 
                onFileChange={(f) => setImages(prev => ({ ...prev, companyLogo: f }))}
              />
              <ImageUpload 
                label="Company Header Logo (Wide)" 
                id="header"
                file={images.companyHeader} 
                onFileChange={(f) => setImages(prev => ({ ...prev, companyHeader: f }))}
              />
              <ImageUpload 
                label="Accreditation Certificate" 
                id="cert"
                file={images.certificate} 
                onFileChange={(f) => setImages(prev => ({ ...prev, certificate: f }))}
              />
          </div>
        </section>
        
        {/* Section 1: Job Info */}
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
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Client Company</label>
               <input type="text" name="clientName" value={data.clientName} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. ECS Yorkshire" />
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

        {/* Section 2: Process Info */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              Process Configuration
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Disinfectant Used</label>
               <select name="disinfectant" value={data.disinfectant} onChange={handleInputChange} className="w-full input-field border rounded p-2 bg-white">
                 <option value="Sodium Hypochlorite">Sodium Hypochlorite</option>
                 <option value="Hydrogen Peroxide">Hydrogen Peroxide</option>
                 <option value="Chlorine Dioxide">Chlorine Dioxide</option>
               </select>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Concentration Target</label>
               <input type="text" name="concentrationTarget" value={data.concentrationTarget} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. 50 PPM" />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Contact Time</label>
               <input type="text" name="contactTime" value={data.contactTime} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. 1 Hour" />
               {phWarning && (
                 <p className="text-amber-600 text-xs mt-1 font-bold flex items-center gap-1">
                   <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                   {phWarning}
                 </p>
               )}
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Injection Point Location</label>
               <input type="text" name="injectionPoint" value={data.injectionPoint} onChange={handleInputChange} className="w-full input-field border rounded p-2" placeholder="e.g. Outside plant room / Toilet" />
             </div>
          </div>
        </section>

        {/* Section 2.5: Tank Details (Conditional) */}
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
                    <input 
                      type="text" 
                      value={tank.description} 
                      onChange={(e) => handleUpdateTank(tank.id, 'description', e.target.value)} 
                      className="w-full input-field border rounded p-2" 
                      placeholder="e.g. Main CWST" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                    <input 
                      type="text" 
                      value={tank.location} 
                      onChange={(e) => handleUpdateTank(tank.id, 'location', e.target.value)} 
                      className="w-full input-field border rounded p-2" 
                      placeholder="e.g. Plant Room" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Capacity</label>
                    <input 
                      type="text" 
                      value={tank.capacity} 
                      onChange={(e) => handleUpdateTank(tank.id, 'capacity', e.target.value)} 
                      className="w-full input-field border rounded p-2" 
                      placeholder="e.g. 1000 Litres" 
                    />
                  </div>
                  {data.tanks.length > 1 && (
                    <button 
                      onClick={() => handleRemoveTank(tank.id)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm hover:bg-red-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                  <div className="absolute top-2 right-2 text-xs font-bold text-slate-300 pointer-events-none">#{index + 1}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Test Points */}
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
                 <input 
                  type="number" 
                  step="0.1"
                  name="incomingMainsPh" 
                  value={data.incomingMainsPh} 
                  onChange={handleInputChange} 
                  className={`border rounded p-1 w-24 ${phWarning ? 'border-amber-500 bg-amber-50 text-amber-900' : ''}`} 
                 />
                 {phWarning && <span className="text-xs text-amber-600 font-bold ml-2">High pH</span>}
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
                       <input 
                        type="text" 
                        value={tp.location} 
                        onChange={(e) => handleUpdateTestPoint(tp.id, 'location', e.target.value)}
                        placeholder="e.g. Staff Kitchen Tap"
                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1"
                       />
                     </td>
                     <td className="py-2 pr-2">
                       <input 
                        type="text" 
                        value={tp.initialPpm} 
                        onChange={(e) => handleUpdateTestPoint(tp.id, 'initialPpm', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1"
                       />
                     </td>
                     <td className="py-2 pr-2">
                       <input 
                        type="text" 
                        value={tp.midPpm} 
                        onChange={(e) => handleUpdateTestPoint(tp.id, 'midPpm', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1"
                       />
                     </td>
                     <td className="py-2 pr-2">
                       <input 
                        type="text" 
                        value={tp.finalPpm} 
                        onChange={(e) => handleUpdateTestPoint(tp.id, 'finalPpm', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none py-1"
                       />
                     </td>
                     <td className="py-2 text-right">
                       <button onClick={() => handleRemoveTestPoint(tp.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                     </td>
                   </tr>
                 ))}
                 {data.testPoints.length === 0 && (
                   <tr><td colSpan={5} className="text-center py-4 text-slate-400 italic">No test points added yet.</td></tr>
                 )}
               </tbody>
             </table>
          </div>
        </section>

        {/* Section 4: Photos */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
              Evidence Photos
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <ImageUpload 
                label="Front Cover Photo" 
                id="cover"
                file={images.coverPhoto} 
                onFileChange={(f) => setImages(prev => ({ ...prev, coverPhoto: f }))}
              />
              <ImageUpload 
                label="Lab Results Certificate" 
                id="lab"
                file={images.labResults} 
                onFileChange={(f) => setImages(prev => ({ ...prev, labResults: f }))}
              />
              <ImageUpload 
                label="Initial Chemical Level" 
                id="initialChem"
                file={images.initialChemical} 
                onFileChange={(f) => setImages(prev => ({ ...prev, initialChemical: f }))}
              />

              {/* Conditional Photos based on Job Type */}
              {data.jobType === 'Pipework' && (
                <ImageUpload 
                  label="Dosing Equipment Setup" 
                  id="dosingSetup"
                  file={images.dosingSetup} 
                  onFileChange={(f) => setImages(prev => ({ ...prev, dosingSetup: f }))}
                />
              )}

              {/* Dynamic Tank Photos */}
              {data.jobType === 'Tank' && data.tanks.map((tank, idx) => {
                 const photoSet = images.tankPhotos.find(tp => tp.tankId === tank.id);
                 return (
                    <React.Fragment key={tank.id}>
                      <ImageUpload 
                        label={`${tank.description || `Tank ${idx+1}`} - Before`}
                        id={`tank_before_${tank.id}`}
                        file={photoSet?.before} 
                        onFileChange={(f) => handleTankPhotoUpdate(tank.id, 'before', f)}
                        className="border-blue-100 bg-blue-50/50 p-2 rounded"
                      />
                      <ImageUpload 
                        label={`${tank.description || `Tank ${idx+1}`} - After`}
                        id={`tank_after_${tank.id}`}
                        file={photoSet?.after} 
                        onFileChange={(f) => handleTankPhotoUpdate(tank.id, 'after', f)}
                        className="border-blue-100 bg-blue-50/50 p-2 rounded"
                      />
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
                     <ImageUpload 
                        label={`Extra Photo ${idx + 1}`}
                        id={photo.id}
                        file={photo.file}
                        caption={photo.caption}
                        onFileChange={() => {}} // Read-only file, use remove button
                        onCaptionChange={(c) => handleUpdatePhotoCaption(photo.id, c)}
                     />
                     <button 
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-8 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                       ×
                     </button>
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
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !data.clientName}
                className={`px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all flex items-center gap-2
                  ${isGenerating || !data.clientName
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-[#0070c0] hover:bg-blue-700 transform hover:-translate-y-0.5'
                  }`}
              >
                {isGenerating ? (
                  <>Processing...</>
                ) : (
                  <>Generate Report</>
                )}
              </button>
           </div>
        </div>

      </main>
    </div>
  );
};

export default App;