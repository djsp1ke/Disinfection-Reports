
import { ReportData, ReportImages } from '../types';

// Word Document Export
export const exportToWord = async (data: ReportData, images: ReportImages): Promise<void> => {
  // Dynamic import for docx (tree-shaking)
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = await import('docx');

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix = ["th", "st", "nd", "rd"][((day % 100) - 20) % 10] || ["th", "st", "nd", "rd"][day % 100] || "th";
    return `${day}${suffix} ${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  };

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title Page
          new Paragraph({
            children: [
              new TextRun({
                text: 'Water Compliance Services Ltd',
                bold: true,
                size: 32,
                color: '0070c0',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.jobType === 'Tank' ? 'Cold Water Storage Tank' : 'Pipework Disinfection',
                bold: true,
                size: 48,
                color: '1a237e',
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Post Works Report',
                bold: true,
                size: 48,
                color: '1a237e',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.clientName,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: data.siteName,
                bold: true,
                size: 28,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: formatDate(data.serviceDate),
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
          }),

          // Scope of Works Section
          new Paragraph({
            text: '2. Scope of Works',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: data.scopeOfWorks || 'Scope of works content will be generated here based on job details.',
            spacing: { after: 400 },
          }),

          // Certificate of Disinfection
          new Paragraph({
            text: '3. Certificate of Disinfection',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `This certificate is to certify that the water systems at the location below were disinfected in line with HSG 274 Part 2 and PD855468:2015 guidelines.`,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Site Name:', children: [new TextRun({ text: 'Site Name:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: data.siteName })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Site Address:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: data.siteAddress })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Service Date:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: formatDate(data.serviceDate) })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Client:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: data.clientName })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Technician:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: data.technicianName })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Disinfectant:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: `${data.disinfectant} at ${data.concentrationTarget} PPM` })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Contact Time:', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ text: data.contactTime })] }),
                ],
              }),
            ],
          }),

          // Disinfection Level Records
          new Paragraph({
            text: '4. Disinfection Level Records',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Location', bold: true })] })],
                    shading: { fill: 'f0f0f0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Initial PPM', bold: true })] })],
                    shading: { fill: 'f0f0f0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: '30 Min PPM', bold: true })] })],
                    shading: { fill: 'f0f0f0' },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: '1 Hour PPM', bold: true })] })],
                    shading: { fill: 'f0f0f0' },
                  }),
                ],
              }),
              ...data.testPoints.map(tp => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: tp.location })] }),
                  new TableCell({ children: [new Paragraph({ text: tp.initialPpm })] }),
                  new TableCell({ children: [new Paragraph({ text: tp.midPpm })] }),
                  new TableCell({ children: [new Paragraph({ text: tp.finalPpm })] }),
                ],
              })),
            ],
          }),

          // Comments
          new Paragraph({
            text: '8. Comments and Recommendations',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: data.comments || 'No specific comments.',
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'Thank you for the works. WCS Team.',
            spacing: { before: 400 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Report_${data.siteName.replace(/\s+/g, '_')}_${data.serviceDate}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Excel Export
export const exportToExcel = async (data: ReportData): Promise<void> => {
  // Dynamic import for xlsx
  const XLSX = await import('xlsx');

  // Job Info Sheet
  const jobInfoData = [
    ['PureTank Report Generator - Data Export'],
    [],
    ['Job Information'],
    ['Field', 'Value'],
    ['Job Type', data.jobType],
    ['Client Name', data.clientName],
    ['Commissioned By', data.commissionedBy],
    ['Site Name', data.siteName],
    ['Site Address', data.siteAddress],
    ['Service Date', data.serviceDate],
    ['Technician', data.technicianName],
    [],
    ['Process Information'],
    ['Field', 'Value'],
    ['Disinfectant', data.disinfectant],
    ['Chemical Strength (%)', data.chemicalStrength],
    ['Target Concentration (PPM)', data.concentrationTarget],
    ['Contact Time', data.contactTime],
    ['System Volume (L)', data.systemVolume],
    ['Amount Added', data.amountAdded],
    ['Neutralising Agent', data.neutralisingAgent],
    ['Pre-Flush Duration', data.preFlushDuration],
    ['Injection Point', data.injectionPoint],
    [],
    ['Water Quality'],
    ['Field', 'Value'],
    ['Incoming Mains pH', data.incomingMainsPh],
    ['Residual Chlorine', data.residualChlorine],
  ];

  // Test Points Sheet
  const testPointsData = [
    ['Disinfection Level Records'],
    [],
    ['Location', 'System', 'pH', 'Initial PPM', '30 Min PPM', '1 Hour PPM'],
    ...data.testPoints.map(tp => [
      tp.location,
      tp.system,
      tp.ph,
      tp.initialPpm,
      tp.midPpm,
      tp.finalPpm,
    ]),
  ];

  // Tanks Sheet (if Tank mode)
  const tanksData = [
    ['Tank Information'],
    [],
    ['Description', 'Location', 'Capacity'],
    ...data.tanks.map(tank => [
      tank.description,
      tank.location,
      tank.capacity,
    ]),
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();

  const jobInfoSheet = XLSX.utils.aoa_to_sheet(jobInfoData);
  jobInfoSheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, jobInfoSheet, 'Job Info');

  const testPointsSheet = XLSX.utils.aoa_to_sheet(testPointsData);
  testPointsSheet['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, testPointsSheet, 'Test Points');

  if (data.jobType === 'Tank' && data.tanks.length > 0) {
    const tanksSheet = XLSX.utils.aoa_to_sheet(tanksData);
    tanksSheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, tanksSheet, 'Tanks');
  }

  // Generate and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Report_Data_${data.siteName.replace(/\s+/g, '_')}_${data.serviceDate}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
