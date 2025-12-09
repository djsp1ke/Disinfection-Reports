
export type JobType = 'Pipework' | 'Tank';

export interface Tank {
  id: string;
  description: string; // e.g. "Main CWST", "Header Tank"
  location: string;    // e.g. "Plant Room", "Roof Space"
  capacity: string;    // e.g. "1000 Litres"
}

export interface TestPoint {
  id: string;
  location: string;
  system: string; // e.g. MCWS, Hot, Cold
  time: string;
  ph: string;
  initialPpm: string;
  midPpm: string; // 30 min
  finalPpm: string; // 1 hour
}

export interface ReportPhoto {
  id: string;
  file: File;
  caption: string;
}

export interface TankPhotoSet {
  tankId: string;
  before?: File;
  after?: File;
}

export interface ReportData {
  jobType: JobType; 

  // Job Info
  clientName: string;
  commissionedBy: string;
  siteName: string;
  siteAddress: string;
  serviceDate: string;
  
  // Technician
  technicianName: string;

  // Process & Calculations (PD 855468)
  disinfectant: string;
  chemicalStrength: string; // e.g. 14%
  concentrationTarget: string; // e.g. 50 PPM
  contactTime: string; // e.g. 1 Hour
  
  systemVolume: string; // Litres
  amountAdded: string; // Calculated amount of chemical added
  
  neutralisingAgent: string; // e.g. Sodium Thiosulfate
  preFlushDuration: string; // e.g. 10 mins

  injectionPoint: string;

  // Tank Details (For Tank Mode)
  tanks: Tank[];

  // Data
  testPoints: TestPoint[];
  incomingMainsPh: string;
  residualChlorine: string; // Level after disinfection
  
  // Text Content (AI Generated or Manual)
  scopeOfWorks: string;
  comments: string;
}

export interface ReportImages {
  // Branding (Optional Uploads)
  companyLogo?: File;     
  companyHeader?: File;   
  certificate?: File;     

  coverPhoto?: File;
  labResults?: File;
  
  // Specific required photos based on job type
  dosingSetup?: File;      // Pipework
  initialChemical?: File;  // Both
  
  // Dynamic Tank Photos
  tankPhotos: TankPhotoSet[];

  evidencePhotos: ReportPhoto[];
}

export interface GeneratedContent {
  scopeOfWorks: string;
  comments: string;
  status: 'draft' | 'generated';
}
