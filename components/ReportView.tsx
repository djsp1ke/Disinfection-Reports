
import React from 'react';
import { ReportData, ReportImages } from '../types';

interface ReportViewProps {
  data: ReportData;
  images: ReportImages;
  onEdit: () => void;
}

// Stable Image Component
const FileImage = ({ file, className, alt, fallbackSrc }: { file?: File, className?: string, alt?: string, fallbackSrc?: string }) => {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      if (fallbackSrc) setSrc(fallbackSrc);
      else setSrc(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSrc(reader.result as string);
    };
    reader.readAsDataURL(file);

    return () => reader.abort();
  }, [file, fallbackSrc]);

  if (!src) return null;

  return <img src={src} className={className} alt={alt || "Report image"} />;
};

interface PageProps {
  children: React.ReactNode;
  pageNum?: number;
  className?: string;
}

// A4 Page Container Component
const Page: React.FC<PageProps> = ({ children, pageNum, className = '' }) => (
  <div className={`w-[210mm] h-[297mm] mx-auto bg-white shadow-xl mb-8 relative flex flex-col print:shadow-none print:mb-0 print:break-after-page overflow-hidden ${className}`}>
     <div className="flex-grow p-12 flex flex-col relative h-full z-10">
        {children}
     </div>
     {pageNum && (
       <div className="absolute bottom-4 left-8 text-sm font-bold text-slate-900 print:block">
          {pageNum}
       </div>
     )}
  </div>
);

const ReportView: React.FC<ReportViewProps> = ({ data, images, onEdit }) => {
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix = ["th", "st", "nd", "rd"][((day % 100) - 20) % 10] || ["th", "st", "nd", "rd"][day % 100] || "th";
    return `${day}${suffix} ${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  };

  const LogoImage = () => <FileImage file={images.companyLogo} fallbackSrc="wcs-logo.png" className="w-48 mb-8 object-contain" alt="WCS Logo" />;
  const HeaderImage = () => <FileImage file={images.companyHeader} fallbackSrc="wcs-header.png" className="h-16 object-contain" alt="WCS Header" />;
  const CertImage = () => <FileImage file={images.certificate} fallbackSrc="certificate.jpg" className="max-h-[800px] max-w-full object-contain border border-slate-200 shadow-sm" alt="Certificate" />;

  const PageHeader = ({ title, showLogo = true }: { title?: string, showLogo?: boolean }) => (
    <div className="flex justify-between items-start mb-8 pt-4 min-h-[60px]">
      {title ? <h2 className="text-2xl font-bold text-slate-900">{title}</h2> : <div></div>}
      {showLogo && <HeaderImage />}
    </div>
  );

  const getPhotoPages = () => {
    const allPhotos: { file: File, caption: string }[] = [];
    if (data.jobType === 'Pipework' && images.dosingSetup) {
      allPhotos.push({ file: images.dosingSetup, caption: 'View of dosing pump set up' });
    }
    if (data.jobType === 'Tank') {
       data.tanks.forEach((tank, idx) => {
          const photoSet = images.tankPhotos.find(tp => tp.tankId === tank.id);
          if (photoSet?.before) {
             allPhotos.push({ file: photoSet.before, caption: `${tank.description} - Before` });
          }
          if (photoSet?.after) {
             allPhotos.push({ file: photoSet.after, caption: `${tank.description} - After` });
          }
       });
    }
    if (images.initialChemical) {
      allPhotos.push({ file: images.initialChemical, caption: 'Initial Chemical Level within dosing equipment' });
    }
    images.evidencePhotos.forEach((photo, idx) => {
      allPhotos.push({ file: photo.file, caption: photo.caption || `Evidence Photo ${idx + 1}` });
    });
    const pages = [];
    for (let i = 0; i < allPhotos.length; i += 4) {
      pages.push(allPhotos.slice(i, i + 4));
    }
    return pages;
  };

  const photoPages = getPhotoPages();
  let currentPage = 4;

  const handleDownloadHtml = () => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    const actionBar = clone.querySelector('.no-print');
    if (actionBar) actionBar.remove();
    const htmlContent = clone.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${data.siteName.replace(/\s+/g, '_')}_${data.serviceDate}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-200 min-h-screen font-sans print:bg-white pb-20">
      
      {/* --- Print Action Bar --- */}
      <div className="sticky top-4 z-50 flex justify-between items-center bg-white/90 backdrop-blur-md p-4 shadow-lg rounded-xl mb-8 border border-slate-200 print:hidden w-full max-w-4xl mx-auto no-print">
        <h2 className="text-lg font-bold text-slate-800">Report Preview</h2>
        <div className="flex gap-3">
          <button onClick={onEdit} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Edit Report
          </button>
          <button onClick={handleDownloadHtml} className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 border border-blue-200">
            Download Source
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 text-sm font-medium text-white bg-[#0070c0] rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print to PDF
          </button>
        </div>
      </div>

      {/* --- PAGE 1: COVER --- */}
      <Page>
        <div className="absolute top-[8mm] bottom-[8mm] left-[8mm] right-[8mm] border-[3mm] border-[#0070c0] pointer-events-none"></div>

        <div className="h-full flex flex-col justify-between">
            <div className="flex justify-center pt-12">
            <div className="flex flex-col items-center w-full">
                <LogoImage />
                <h1 className="text-4xl font-bold text-[#1a237e] text-center mb-4">
                    {data.jobType === 'Tank' ? 'Cold Water Storage Tank' : 'Pipework Disinfection'}
                </h1>
                <h1 className="text-4xl font-bold text-[#1a237e] text-center mb-16">Post Works Report</h1>
                
                <h2 className="text-2xl font-bold text-center mb-8">{data.clientName}</h2>
                
                {images.coverPhoto && (
                    <div className="w-64 h-48 bg-slate-100 mb-8 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                      <FileImage file={images.coverPhoto} className="w-full h-full object-cover" />
                    </div>
                )}
                
                <h3 className="text-xl font-bold text-center">{data.siteName}</h3>
                <h3 className="text-xl font-bold text-center">{formatDate(data.serviceDate)}</h3>
            </div>
            </div>
            
            <div className="flex justify-center gap-4 pb-8 grayscale opacity-70">
            <div className="h-12 w-24 border border-slate-400 flex items-center justify-center text-[10px] text-center font-bold text-slate-500">Legionella Control<br/>Association</div>
            <div className="h-12 w-12 border border-slate-400 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">Water<br/>Safe</div>
            <div className="h-12 w-32 border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-500">Constructionline</div>
            </div>
        </div>
      </Page>
      
      {/* --- PAGE 2: CONTENTS --- */}
      <Page pageNum={2}>
        <PageHeader showLogo={true} />
        <h2 className="text-3xl font-bold text-[#1a237e] text-center mb-24 mt-12">Report Contents</h2>
        <div className="max-w-md mx-auto space-y-4 text-xl font-bold text-[#1a237e]">
          <div className="flex gap-4"><span className="w-8">1.</span> <span>Legislation + Client Obligations</span></div>
          <div className="flex gap-4"><span className="w-8">2.</span> <span>Scope of Works</span></div>
          <div className="flex gap-4"><span className="w-8">3.</span> <span>Certificate of Disinfection</span></div>
          <div className="flex gap-4"><span className="w-8">4.</span> <span>Disinfection Level Records</span></div>
          <div className="flex gap-4"><span className="w-8">5.</span> <span>Water Sample Analysis</span></div>
          <div className="flex gap-4"><span className="w-8">6.</span> <span>Photographic Evidence</span></div>
          <div className="flex gap-4"><span className="w-8">7.</span> <span>Training and Membership</span></div>
          <div className="flex gap-4"><span className="w-8">8.</span> <span>Comments + Recommendations</span></div>
          <div className="flex gap-4"><span className="w-8">9.</span> <span>Company Information + Services</span></div>
        </div>
      </Page>

      {/* --- PAGE 3: LEGISLATION --- */}
      <Page pageNum={3}>
        <PageHeader showLogo={true} />
        <h2 className="text-3xl font-bold text-center mb-12">1. Legislation and Client Obligations</h2>
        <div className="text-justify text-sm leading-relaxed space-y-6">
          <p>
            To comply with the British Standard BS 8558, and its published document, the PD855468:2015 every new
            water service, cistern, distributing pipe, hot water cylinder or other appliance, and any extension or modification
            to such a service should be thoroughly flushed with wholesome water before being put into service. The
            primary reason for this process is to remove any debris and organic matter, which encourages the growth of
            biofilms and subsequent deterioration of water quality.
          </p>
          <p>Additionally, the process removes any excess of flux, which can cause corrosion of copper pipes if left in place under conditions of low or no flow.</p>
          <p>A disinfection of the pipework will help remove all the above deposits and allow the client to provide evidence that the water being supplied to site via these newly installed pipework / items of plant is compliant with the Private Drinking Water Regulations.</p>
          <p>The HSE guidance document, the HSG 274 Part 2, Paragraph 2.127 states :-</p>
          <p>Where necessary, hot and cold water services should be cleaned, flushed and disinfected in the following situations, as specified in BS 8558:</p>
          <ul className="list-disc pl-8 space-y-2">
            <li>on completion of a new water installation or refurbishment of a hot and cold water system;</li>
            <li>on installation of new components, especially those which have been pressure tested using water by the manufacturer;</li>
            <li>where the hot and cold water is not used for a prolonged period and has not been flushed as recommended;</li>
            <li>on routine inspection of the water storage tanks, where there is evidence of significant contamination or stagnation;</li>
            <li>if the system or part of it has been substantially altered or entered for maintenance purposes that may introduce contamination;</li>
            <li>following water sampling results that indicate evidence of microbial contamination of the water system;</li>
            <li>during, or following an outbreak or suspected outbreak of legionellosis linked to the system;</li>
            <li>or where indicated by the risk assessment.</li>
          </ul>
        </div>
      </Page>

      {/* --- PAGE 4: SCOPE OF WORKS --- */}
      <Page pageNum={4}>
        <PageHeader showLogo={true} />
        <h2 className="text-3xl font-bold text-center mb-12">2. Scope of Works</h2>
        <div className="text-justify text-base leading-loose space-y-6">
           <p>{data.scopeOfWorks || "Scope of works content will be generated here based on job details."}</p>
        </div>
      </Page>

       {/* --- PAGE 5+ : CERTIFICATE(S) --- */}
       {(() => {
          const tanksToCertify = (data.jobType === 'Tank' && data.tanks.length > 0) 
            ? data.tanks 
            : [{ description: 'Water Systems', location: data.injectionPoint || 'Site', id: 'default' } as any];

          return tanksToCertify.map((tank: any, idx: number) => {
            currentPage++;
            const isTankMode = data.jobType === 'Tank' && data.tanks.length > 0;
            
            return (
              <Page pageNum={currentPage} key={`cert-${idx}`}>
                <PageHeader showLogo={true} />
                <h2 className="text-3xl font-bold text-center mb-12">3. Certificate of Disinfection {tanksToCertify.length > 1 ? `(${idx + 1}/${tanksToCertify.length})` : ''}</h2>
                
                <div className="text-center space-y-6 max-w-2xl mx-auto">
                  <p className="text-lg font-bold text-[#1a237e]">
                    This certificate is to certify that {isTankMode ? `the ${tank.description}` : 'the water systems'} at the location below were disinfected in line with HSG 274 Part 2 and PD855468:2015 guidelines.
                  </p>

                  <div className="py-2">
                    <p className="font-bold text-lg text-[#1a237e] mb-1">
                      {isTankMode ? 'Tank Location / Description' : 'Point of injection'}
                    </p>
                    <p className="text-xl">
                      {isTankMode ? `${tank.description} located in ${tank.location}` : data.injectionPoint}
                    </p>
                  </div>

                  <div className="py-2">
                    <p className="font-bold text-lg text-[#1a237e] mb-1">Works carried out on</p>
                    <p className="text-xl">{formatDate(data.serviceDate)}</p>
                  </div>

                  <div className="py-2">
                    <p className="font-bold text-lg text-[#1a237e] mb-1">Located at:</p>
                    <p className="text-xl">{data.siteName}</p>
                    <p className="text-lg">{data.siteAddress}</p>
                  </div>

                  <div className="py-2">
                    <p className="font-bold text-lg text-[#1a237e] mb-1">For and on behalf of</p>
                    <p className="text-xl">{data.commissionedBy}</p>
                    <p className="text-lg">{data.clientName}</p>
                  </div>

                  <div className="py-2">
                    <p className="font-bold text-lg text-[#1a237e] mb-1">Carried out by:</p>
                    <p className="text-xl">{data.technicianName} of Water Compliance Services Ltd</p>
                  </div>

                  <div className="py-2">
                    <p className="font-bold text-lg text-[#1a237e] mb-1">Disinfectant Used:</p>
                    <p className="text-xl">{data.disinfectant} at {data.concentrationTarget} ({data.amountAdded || 'Unknown Vol'} added)</p>
                    <p className="text-xl">for a period of {data.contactTime}</p>
                  </div>
                  
                  <div className="py-6 flex justify-center items-end gap-4 mt-4">
                    <span className="font-bold text-lg text-[#1a237e]">Authorised by Martin Hillam M.W.M.Soc ( Snr )</span>
                    <span className="font-cursive text-2xl text-slate-600 border-b border-black px-4">M.Hillam</span>
                  </div>
                </div>
              </Page>
            );
          });
       })()}

      {/* --- LEVEL RECORDS --- */}
      {(() => { currentPage++; return (
      <Page pageNum={currentPage}>
        <PageHeader showLogo={true} />
        <h2 className="text-3xl font-bold text-center mb-8">4.0 Disinfection Level Records</h2>
        
        <div className="mb-6 text-sm grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200">
           <div><span className="font-bold">Date and Time:</span> {formatDate(data.serviceDate)}</div>
           <div><span className="font-bold">Disinfectant:</span> {data.disinfectant}</div>
           <div><span className="font-bold">Concentration Target:</span> {data.concentrationTarget}</div>
           <div><span className="font-bold">Amount Added:</span> {data.amountAdded || 'N/A'}</div>
           <div><span className="font-bold">Contact Time:</span> {data.contactTime}</div>
           <div><span className="font-bold">Pre-Flush Duration:</span> {data.preFlushDuration || 'N/A'}</div>
           <div><span className="font-bold">Neutralising Agent:</span> {data.neutralisingAgent || 'None'}</div>
        </div>

        <table className="w-full text-xs text-left mb-8">
           <thead className="font-bold text-slate-900 border-b-2 border-slate-900">
             <tr>
               <th className="py-2">TEST POINT LOCATIONS</th>
               <th className="py-2">SYSTEM</th>
               <th className="py-2">TIME</th>
               <th className="py-2">pH LEVEL</th>
             </tr>
           </thead>
           <tbody>
             <tr className="border-b border-slate-200">
               <td className="py-2">Incoming mains water supply</td>
               <td className="py-2">MCWS</td>
               <td className="py-2">-</td>
               <td className="py-2">{data.incomingMainsPh || 'N/A'}</td>
             </tr>
           </tbody>
        </table>

        <table className="w-full text-xs text-center">
          <thead className="font-bold text-slate-900 border-b-2 border-slate-900">
             <tr>
               <th className="py-2 text-left">LOCATION</th>
               <th className="py-2 w-24">INITIAL (PPM)</th>
               <th className="py-2 w-24">30 MIN (PPM)</th>
               <th className="py-2 w-24">1 HOUR (PPM)</th>
             </tr>
           </thead>
           <tbody>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold">
               <td className="py-3 text-left">Dosing Pump (Mains Injection)</td>
               <td className="py-3">{data.concentrationTarget.replace('PPM', '').trim()}</td>
               <td className="py-3">N/A</td>
               <td className="py-3">N/A</td>
             </tr>
             {data.testPoints.map((tp, idx) => (
               <tr key={tp.id} className="border-b border-slate-200">
                 <td className="py-3 text-left">{tp.location}</td>
                 <td className="py-3">{tp.initialPpm}</td>
                 <td className="py-3">{tp.midPpm}</td>
                 <td className="py-3">{tp.finalPpm}</td>
               </tr>
             ))}
           </tbody>
        </table>

        <div className="mt-8 text-sm flex justify-between font-bold border-t pt-4">
           <span>Residual chemical level after disinfection (MCWS)</span>
           <span>{data.residualChlorine} PPM</span>
        </div>
      </Page>
      ); })()}
      
      {/* --- SAMPLE ANALYSIS --- */}
      {(() => { currentPage++; return (
      <Page pageNum={currentPage}>
         <PageHeader showLogo={true} />
         <h2 className="text-3xl font-bold text-center mb-8">5.0 Sample Analysis</h2>
         <p className="mb-4">Sample analysis was taken after 48 hours upon completion of the works and delivered to a UKAS accredited lab.</p>
         <p className="mb-8">The analysis taken was for TVC, E.Coli, Total Coliforms, Pseudomonas aeruginosa.</p>
         
         <div className="border border-slate-300 h-[600px] flex items-center justify-center bg-slate-50 overflow-hidden relative">
            {images.labResults ? (
               <FileImage file={images.labResults} className="w-full h-full object-contain" />
            ) : (
              <div className="text-center p-8 border-2 border-dashed border-slate-300 rounded-lg">
                <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Results Pending</h3>
                <p className="text-slate-400 mt-2">Certificate of Analysis to be inserted upon receipt.</p>
              </div>
            )}
         </div>
      </Page>
       ); })()}

      {/* --- PHOTOS --- */}
      {photoPages.map((chunk, index) => {
         currentPage++;
         return (
          <Page pageNum={currentPage} key={`photos-${index}`}>
            <PageHeader showLogo={true} />
            <h2 className="text-3xl font-bold text-center mb-8">6. Photographic Evidence {photoPages.length > 1 ? `(${index + 1}/${photoPages.length})` : ''}</h2>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-12">
                {chunk.map((photo, pIdx) => (
                  <div key={pIdx} className="break-inside-avoid mb-4">
                    <div className="border border-slate-800 h-64 flex items-center justify-center bg-black/5 overflow-hidden mb-2">
                        <FileImage file={photo.file} className="w-full h-full object-contain" alt={photo.caption} />
                    </div>
                    <p className="text-center font-bold text-sm border-t border-slate-800 pt-2">{photo.caption}</p>
                  </div>
                ))}
            </div>
          </Page>
         );
      })}

      {/* --- TRAINING & MEMBERSHIP --- */}
      {(() => { currentPage++; return (
      <Page pageNum={currentPage}>
         <PageHeader showLogo={true} />
         <h2 className="text-3xl font-bold text-center mb-12">7. Training and Membership</h2>
         <div className="flex-grow flex items-center justify-center">
             <CertImage />
         </div>
      </Page>
      ); })()}

      {/* --- COMMENTS & RECS --- */}
      {(() => { currentPage++; return (
      <Page pageNum={currentPage}>
         <PageHeader showLogo={true} />
         <h2 className="text-3xl font-bold text-center mb-12">8. Comments and Recommendations</h2>
         
         <div className="text-lg space-y-6">
            <p>{data.comments || "No specific comments."}</p>
            <p className="mt-12 font-bold">Thank you for the works. WCS Team.</p>
         </div>
      </Page>
       ); })()}
      
      {/* --- COMPANY INFO --- */}
      {(() => { currentPage++; return (
      <Page pageNum={currentPage}>
         <PageHeader showLogo={true} />
         <h2 className="text-3xl font-bold text-center mb-12">9. Company Information and Services</h2>
         
         <div className="text-xs space-y-4">
            <p className="font-bold mb-2">Water Compliance Services undertake the following legionella control, water treatment and water regulations compliance services :-</p>
            
            <h3 className="font-bold">Legionella Control – HSE ACoP L8 + HSG 274 Parts 1 – 3 + HTM 04:01</h3>
            <ul className="list-disc pl-4 space-y-1">
              <li>Legionella Risk Assessments – BS8580:2019</li>
              <li>Legionella Written Schemes</li>
              <li>Legionella Control Monitoring to HSG 274 – Part 1-3</li>
              <li>Legionella Sampling – BS7592:2022</li>
              <li>Cooling Tower Clean + Chlorinations</li>
              <li>Disinfection of mains fed cold and hot water services including unvented hot water cylinders</li>
            </ul>

            <h3 className="font-bold mt-4">Water Regulations</h3>
             <ul className="list-disc pl-4 space-y-1">
              <li>Clean and disinfection of newly installed boosted water services</li>
              <li>Disinfection of hot and cold water services following refurbishment works</li>
              <li>New build – disinfection works</li>
              <li>RPZ valve installation, testing and certification</li>
            </ul>
         </div>

         <div className="mt-12 text-center text-sm font-bold text-[#0070c0]">
            <p>Tel: 0800 130 3221 | Email: Info@watercompliance.co.uk | Web: www.watercompliance.co.uk</p>
         </div>
      </Page>
       ); })()}

    </div>
  );
};

export default ReportView;
