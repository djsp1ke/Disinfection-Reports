
import { ReportData, ReportImages } from '../types';

// Helper to convert File to base64 data
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Word Document Export with proper pages and images
export const exportToWord = async (data: ReportData, images: ReportImages): Promise<void> => {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    PageBreak,
    ImageRun,
    SectionType,
    Header,
    Footer,
    BorderStyle
  } = await import('docx');

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix = ["th", "st", "nd", "rd"][((day % 100) - 20) % 10] || ["th", "st", "nd", "rd"][day % 100] || "th";
    return `${day}${suffix} ${date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  };

  // Helper to create image run if file exists
  const createImageRun = async (file: File | undefined, width: number, height: number): Promise<ImageRun | null> => {
    if (!file) return null;
    try {
      const base64 = await fileToBase64(file);
      return new ImageRun({
        data: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
        transformation: { width, height },
        type: 'jpg',
      });
    } catch (error) {
      console.error('Failed to process image:', error);
      return null;
    }
  };

  // Build sections array
  const sections: any[] = [];

  // ============ SECTION 1: COVER PAGE ============
  const coverPageChildren: any[] = [
    new Paragraph({ text: '', spacing: { after: 600 } }), // Top spacing
    new Paragraph({
      children: [
        new TextRun({
          text: 'Water Compliance Services Ltd',
          bold: true,
          size: 36,
          color: '0070c0',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: data.jobType === 'Tank' ? 'Cold Water Storage Tank' : 'Pipework Disinfection',
          bold: true,
          size: 56,
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
          size: 56,
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
          size: 36,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  // Add cover photo if exists
  if (images.coverPhoto) {
    const coverImg = await createImageRun(images.coverPhoto, 300, 200);
    if (coverImg) {
      coverPageChildren.push(
        new Paragraph({
          children: [coverImg],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }
  }

  coverPageChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: data.siteName,
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
          text: data.siteAddress,
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: formatDate(data.serviceDate),
          size: 28,
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: coverPageChildren,
  });

  // ============ SECTION 2: TABLE OF CONTENTS ============
  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: 'Report Contents', bold: true, size: 40, color: '1a237e' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      ...[
        '1. Legislation and Client Obligations',
        '2. Scope of Works',
        '3. Certificate of Disinfection',
        '4. Disinfection Level Records',
        '5. Water Sample Analysis',
        '6. Photographic Evidence',
        '7. Training and Membership',
        '8. Comments and Recommendations',
        '9. Company Information',
      ].map(item => new Paragraph({
        children: [new TextRun({ text: item, size: 28 })],
        spacing: { after: 200 },
        indent: { left: 720 },
      })),
    ],
  });

  // ============ SECTION 3: LEGISLATION ============
  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: [
      new Paragraph({
        text: '1. Legislation and Client Obligations',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'To comply with the British Standard BS 8558, and its published document, the PD855468:2015 every new water service, cistern, distributing pipe, hot water cylinder or other appliance, and any extension or modification to such a service should be thoroughly flushed with wholesome water before being put into service.',
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'The primary reason for this process is to remove any debris and organic matter, which encourages the growth of biofilms and subsequent deterioration of water quality.',
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'Additionally, the process removes any excess of flux, which can cause corrosion of copper pipes if left in place under conditions of low or no flow.',
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: 'A disinfection of the pipework will help remove all the above deposits and allow the client to provide evidence that the water being supplied to site via these newly installed pipework / items of plant is compliant with the Private Drinking Water Regulations.',
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'The HSE guidance document, the HSG 274 Part 2, Paragraph 2.127 states:',
        spacing: { after: 200 },
        children: [new TextRun({ text: 'The HSE guidance document, the HSG 274 Part 2, Paragraph 2.127 states:', italics: true })],
      }),
      new Paragraph({
        text: 'Where necessary, hot and cold water services should be cleaned, flushed and disinfected in accordance with BS 8558.',
        spacing: { after: 200 },
      }),
    ],
  });

  // ============ SECTION 4: SCOPE OF WORKS ============
  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: [
      new Paragraph({
        text: '2. Scope of Works',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: data.scopeOfWorks || 'Scope of works content will be generated here based on job details. The disinfection was carried out in accordance with HSG 274 Part 2 and PD855468:2015 guidelines.',
        spacing: { after: 200 },
      }),
    ],
  });

  // ============ SECTION 5: CERTIFICATE OF DISINFECTION ============
  const certChildren: any[] = [
    new Paragraph({
      text: '3. Certificate of Disinfection',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'This certificate is to certify that the water systems at the location below were disinfected in line with HSG 274 Part 2 and PD855468:2015 guidelines.',
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Site Name:', bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.siteName })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Site Address:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.siteAddress })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Service Date:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: formatDate(data.serviceDate) })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Client:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.clientName })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Commissioned By:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.commissionedBy })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Technician:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.technicianName })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Disinfectant:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: `${data.disinfectant} at ${data.concentrationTarget} PPM` })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Contact Time:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.contactTime })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Amount Added:', bold: true })] })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ text: data.amountAdded || 'N/A' })],
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 400 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Authorised by: ', bold: true }),
        new TextRun({ text: 'Martin Hillam M.W.M.Soc (Snr)', italics: true }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ];

  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: certChildren,
  });

  // ============ SECTION 6: DISINFECTION LEVEL RECORDS ============
  const levelRecordsChildren: any[] = [
    new Paragraph({
      text: '4. Disinfection Level Records',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Parameter', bold: true })] })],
              shading: { fill: 'e0e0e0' },
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true })] })],
              shading: { fill: 'e0e0e0' },
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Date' })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            new TableCell({ children: [new Paragraph({ text: formatDate(data.serviceDate) })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Disinfectant' })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            new TableCell({ children: [new Paragraph({ text: data.disinfectant })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Concentration Target' })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            new TableCell({ children: [new Paragraph({ text: `${data.concentrationTarget} PPM` })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Contact Time' })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            new TableCell({ children: [new Paragraph({ text: data.contactTime })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'Incoming Mains pH' })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            new TableCell({ children: [new Paragraph({ text: data.incomingMainsPh })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 400 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Test Point Results:', bold: true, size: 28 })],
      spacing: { after: 200 },
    }),
  ];

  // Test points table
  if (data.testPoints.length > 0) {
    levelRecordsChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Location', bold: true })] })], shading: { fill: 'e0e0e0' }, borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Initial PPM', bold: true })] })], shading: { fill: 'e0e0e0' }, borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '30 Min PPM', bold: true })] })], shading: { fill: 'e0e0e0' }, borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1 Hour PPM', bold: true })] })], shading: { fill: 'e0e0e0' }, borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            ],
          }),
          ...data.testPoints.map(tp => new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: tp.location })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
              new TableCell({ children: [new Paragraph({ text: tp.initialPpm })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
              new TableCell({ children: [new Paragraph({ text: tp.midPpm })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
              new TableCell({ children: [new Paragraph({ text: tp.finalPpm })], borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } } }),
            ],
          })),
        ],
      })
    );
  }

  levelRecordsChildren.push(
    new Paragraph({ text: '', spacing: { after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Residual Chlorine after Disinfection: ', bold: true }),
        new TextRun({ text: `${data.residualChlorine} PPM` }),
      ],
    })
  );

  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: levelRecordsChildren,
  });

  // ============ SECTION 7: PHOTOGRAPHIC EVIDENCE ============
  const photoChildren: any[] = [
    new Paragraph({
      text: '6. Photographic Evidence',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
    }),
  ];

  // Collect all photos
  const allPhotos: { file: File; caption: string }[] = [];

  if (images.dosingSetup) {
    allPhotos.push({ file: images.dosingSetup, caption: 'Dosing Equipment Setup' });
  }
  if (images.initialChemical) {
    allPhotos.push({ file: images.initialChemical, caption: 'Initial Chemical Level' });
  }

  // Tank photos
  if (data.jobType === 'Tank') {
    for (const tank of data.tanks) {
      const photoSet = images.tankPhotos.find(tp => tp.tankId === tank.id);
      if (photoSet?.before) {
        allPhotos.push({ file: photoSet.before, caption: `${tank.description} - Before` });
      }
      if (photoSet?.after) {
        allPhotos.push({ file: photoSet.after, caption: `${tank.description} - After` });
      }
    }
  }

  // Evidence photos
  for (const photo of images.evidencePhotos) {
    allPhotos.push({ file: photo.file, caption: photo.caption || 'Evidence Photo' });
  }

  // Add photos to document (2 per row)
  for (let i = 0; i < allPhotos.length; i++) {
    const photo = allPhotos[i];
    const photoImg = await createImageRun(photo.file, 250, 180);
    if (photoImg) {
      photoChildren.push(
        new Paragraph({
          children: [photoImg],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: photo.caption, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }
  }

  if (allPhotos.length === 0) {
    photoChildren.push(
      new Paragraph({
        text: 'No photographic evidence attached.',
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: photoChildren,
  });

  // ============ SECTION 8: COMMENTS & RECOMMENDATIONS ============
  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: [
      new Paragraph({
        text: '8. Comments and Recommendations',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: data.comments || 'No specific comments or recommendations.',
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: 'Thank you for the works.',
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'WCS Team', bold: true })],
      }),
    ],
  });

  // ============ SECTION 9: COMPANY INFO ============
  sections.push({
    properties: { type: SectionType.NEXT_PAGE },
    children: [
      new Paragraph({
        text: '9. Company Information and Services',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Water Compliance Services undertake the following legionella control, water treatment and water regulations compliance services:', bold: true })],
        spacing: { after: 200 },
      }),
      new Paragraph({ text: '• Legionella Risk Assessments – BS8580:2019', spacing: { after: 100 } }),
      new Paragraph({ text: '• Legionella Written Schemes', spacing: { after: 100 } }),
      new Paragraph({ text: '• Legionella Control Monitoring to HSG 274 – Part 1-3', spacing: { after: 100 } }),
      new Paragraph({ text: '• Legionella Sampling – BS7592:2022', spacing: { after: 100 } }),
      new Paragraph({ text: '• Cooling Tower Clean + Chlorinations', spacing: { after: 100 } }),
      new Paragraph({ text: '• Disinfection of mains fed cold and hot water services', spacing: { after: 200 } }),
      new Paragraph({ text: '', spacing: { after: 400 } }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Contact:', bold: true }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({ text: 'Tel: 0800 130 3221' }),
      new Paragraph({ text: 'Email: Info@watercompliance.co.uk' }),
      new Paragraph({ text: 'Web: www.watercompliance.co.uk' }),
    ],
  });

  // Create document
  const doc = new Document({
    sections,
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
  const XLSX = await import('xlsx');

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
