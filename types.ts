
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
  coverFooter?: File;     // Footer image for cover page

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

// Asset Types for Asset Analysis
export interface Asset {
  id: string;
  name: string;
  location: string;
  type: 'Tank' | 'Pipework' | 'Pump' | 'Valve' | 'Cylinder' | 'Other';
  installDate?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
  condition: 'Good' | 'Fair' | 'Poor' | 'Critical';
  riskLevel: 'Low' | 'Medium' | 'High';
  notes?: string;
}

export interface AssetAnalysis {
  totalAssets: number;
  byCondition: { Good: number; Fair: number; Poor: number; Critical: number };
  byRiskLevel: { Low: number; Medium: number; High: number };
  byType: Record<string, number>;
}

// Monthly Jobs Types
export interface ScheduledJob {
  id: string;
  assetId: string;
  assetName: string;
  location: string;
  taskType: string;
  dueDate: string;
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  status: 'Pending' | 'Completed' | 'Overdue';
  assignedTo?: string;
  notes?: string;
}

// Management Structure Types
export interface ManagementPerson {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  responsibilities: string[];
}

export interface ManagementQuestion {
  id: string;
  category: string;
  question: string;
  response: 'Yes' | 'No' | 'Partial' | 'N/A' | '';
  evidence?: string;
  notes?: string;
}

export interface ManagementAssessment {
  assessmentDate: string;
  assessor: string;
  managementTeam: ManagementPerson[];
  questions: ManagementQuestion[];
  overallScore?: number;
  recommendations?: string;
}

// Non-Conformities and Actions Log Types
export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  completedDate?: string;
  notes?: string;
}

export interface NonConformity {
  id: string;
  dateIdentified: string;
  category: string;
  description: string;
  location: string;
  severity: 'Minor' | 'Major' | 'Critical';
  status: 'Open' | 'In Progress' | 'Closed';
  actions: ActionItem[];
  rootCause?: string;
  closedDate?: string;
}

// Risk Analysis Types
export interface ControlMeasure {
  id: string;
  hazard: string;
  riskDescription: string;
  currentControls: string;
  riskRating: 'Low' | 'Medium' | 'High' | 'Very High';
  additionalControls: string;
  responsiblePerson: string;
  targetDate: string;
  status: 'Pending' | 'Implemented' | 'Verified';
  verificationDate?: string;
}

export interface SiteRiskAnalysis {
  siteId: string;
  siteName: string;
  assessmentDate: string;
  assessor: string;
  controlMeasures: ControlMeasure[];
  overallRiskRating: 'Low' | 'Medium' | 'High';
  reviewDate: string;
}

// Extended Report Data to include new features
export interface ExtendedReportData extends ReportData {
  assets: Asset[];
  scheduledJobs: ScheduledJob[];
  managementAssessment?: ManagementAssessment;
  nonConformities: NonConformity[];
  siteRiskAnalysis?: SiteRiskAnalysis;
}
