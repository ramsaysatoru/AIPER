const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, WidthType, BorderStyle, AlignmentType, VerticalAlign, PageBreak, Header, Footer, SectionType } = require('docx');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../assets/acropolis-logo.png');
const nablLogoPath = path.join(__dirname, '../assets/nabl-logo.png');
const nablQrcodePath = path.join(__dirname, '../assets/nabl-qrcode.png');

const ITEMS_PER_PAGE = 12;

// --- Helper Functions for Styling ---
const BORDERS_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const BORDERS_ALL = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

// A4 portrait usable width = 12240 (page) - 720*2 (margins) = 10800 DXA (twips)
const PAGE_WIDTH_DXA = 10800;

const createCell = (text, options = {}) => {
  const { bold = false, alignment = AlignmentType.LEFT, colSpan = 1, rowSpan = 1, borders = BORDERS_ALL, shading = null, size = 20, verticalAlign = VerticalAlign.CENTER, widthPct } = options;
  
  const textString = text || "";
  const lines = textString.split('\n');

  const children = lines.map(line => 
    new Paragraph({
      children: [new TextRun({ text: line, bold, font: "Times New Roman", size })],
      alignment,
      spacing: { line: 240, before: 20, after: 20 }
    })
  );

  const cellOptions = {
    children,
    columnSpan: colSpan,
    rowSpan: rowSpan,
    borders,
    verticalAlign,
    margins: { top: 40, bottom: 40, left: 60, right: 60 }
  };
  if (widthPct) {
    cellOptions.width = { size: Math.round(PAGE_WIDTH_DXA * widthPct / 100), type: WidthType.DXA };
  }
  if (shading) {
    cellOptions.shading = { fill: shading };
  }
  return new TableCell(cellOptions);
};

const createImageCell = (imageBuffer, width, height, borders = BORDERS_ALL, alignment = AlignmentType.CENTER, widthPct = null) => {
  if (!imageBuffer) return new TableCell({ children: [new Paragraph({ children: [] })], borders });
  const cellOpts = {
    children: [
      new Paragraph({
        children: [
          new ImageRun({
            data: imageBuffer,
            transformation: { width, height }
          })
        ],
        alignment
      })
    ],
    borders,
    verticalAlign: VerticalAlign.CENTER
  };
  if (widthPct) {
    cellOpts.width = { size: Math.round(PAGE_WIDTH_DXA * widthPct / 100), type: WidthType.DXA };
  }
  return new TableCell(cellOpts);
};

const deriveReportFields = (jobCode) => {
  const baseCode = jobCode ? jobCode.split('-')[0] : '';
  const last4 = baseCode ? baseCode.slice(-4) : '0000';
  const yy = baseCode ? baseCode.slice(0, 2) : '00';
  const retestMatch = jobCode ? jobCode.match(/retest-(\d+)/i) : null;
  let retestLetter = '';
  if (retestMatch && retestMatch[1]) {
    const retestCount = parseInt(retestMatch[1], 10);
    retestLetter = String.fromCharCode(64 + retestCount); // 1 -> A
  }
  const baseReportNo = `FTL/AIPER/${yy}/${last4}`;
  const testReportNo = `${baseReportNo}${retestLetter ? '-' + retestLetter : ''}`;
  const registrationNo = String(Math.max(0, parseInt(last4, 10) - 1099));
  return { testReportNo, registrationNo, isAmended: !!retestLetter, baseReportNo };
};

// --- Page Builders ---
const buildHeaderTable = (isNabl) => {
  const logoBuf = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
  const nablLogoBuf = fs.existsSync(nablLogoPath) ? fs.readFileSync(nablLogoPath) : null;
  const nablQrcodeBuf = fs.existsSync(nablQrcodePath) ? fs.readFileSync(nablQrcodePath) : null;

  const cells = [
    createImageCell(logoBuf, 130, 75, BORDERS_ALL, AlignmentType.CENTER, 25),
    new TableCell({
      children: [
        new Paragraph({ children: [new TextRun({ text: "Food Testing Laboratory", bold: true, font: "Times New Roman", size: 28 })], alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 } }),
        new Paragraph({ children: [new TextRun({ text: "Acropolis Institute of Pharmaceutical Education and Research", font: "Times New Roman", size: 18 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "Mangliya Square, Indore Bypass Road, Indore M.P.-453771;", font: "Times New Roman", size: 18 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "Mobile: +91 9201974674 | Landline: 731-4730174, 175,176 & 184", font: "Times New Roman", size: 18 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "Email ID: ftl@acropolis.edu.in | Website: www.acrolabs.in", font: "Times New Roman", size: 18, color: "0000FF" })], alignment: AlignmentType.CENTER })
      ],
      verticalAlign: VerticalAlign.CENTER,
      borders: BORDERS_ALL,
      width: { size: Math.round(PAGE_WIDTH_DXA * 50 / 100), type: WidthType.DXA }
    })
  ];

  if (isNabl) {
    const nablRuns = [];
    if (nablLogoBuf) {
      nablRuns.push(new ImageRun({ data: nablLogoBuf, transformation: { width: 75, height: 75 } }));
    }
    if (nablLogoBuf && nablQrcodeBuf) {
      nablRuns.push(new TextRun({ text: "\u00A0\u00A0\u00A0\u00A0\u00A0" })); // 5 Non-breaking spaces for reliable HTML/Word spacing
    }
    if (nablQrcodeBuf) {
      nablRuns.push(new ImageRun({ data: nablQrcodeBuf, transformation: { width: 75, height: 75 } }));
    }

    cells.push(
      new TableCell({
        children: [
          new Paragraph({ children: nablRuns, alignment: AlignmentType.CENTER }),
          new Paragraph({
            children: [new TextRun({ text: "TC-12434", bold: true, font: "Times New Roman", size: 14 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 20 }
          })
        ],
        verticalAlign: VerticalAlign.CENTER,
        borders: BORDERS_ALL,
        width: { size: Math.round(PAGE_WIDTH_DXA * 25 / 100), type: WidthType.DXA }
      })
    );
  } else {
    cells.push(new TableCell({ children: [new Paragraph({ children: [] })], borders: BORDERS_ALL, width: { size: Math.round(PAGE_WIDTH_DXA * 25 / 100), type: WidthType.DXA } }));
  }

  return new Table({
    rows: [new TableRow({ children: cells })],
    width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA }
  });
};

const buildSampleInfoTable = (job, isNabl) => {
  const customer = job.customer || {};
  const sample = job.sample || {};
  const compliance = job.compliance || {};
  
  const { testReportNo, registrationNo } = deriveReportFields(job.jobCode);
  const completedAt = job.completedAt || new Date();
  const issueDate = new Date(completedAt).toLocaleDateString('en-IN');
  const receiptDate = new Date(job.createdAt).toLocaleDateString('en-IN');
  
  const tp = job.testingPeriod || {};
  const testingPeriodStr = tp.startDate && tp.endDate
      ? `${new Date(tp.startDate).toLocaleDateString('en-IN')} to ${new Date(tp.endDate).toLocaleDateString('en-IN')}`
      : 'N/A';

  const rows = [];
  
  // Row 1: Customer Info
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({ children: [new TextRun({ text: "Customer Name: ", bold: true, font: "Times New Roman", size: 20 }), new TextRun({ text: customer.customer_name || job.clientName || 'N/A', font: "Times New Roman", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "Address: ", bold: true, font: "Times New Roman", size: 20 }), new TextRun({ text: customer.customer_address || 'N/A', font: "Times New Roman", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "Contact Person: ", bold: true, font: "Times New Roman", size: 20 }), new TextRun({ text: customer.contact_person || 'N/A', font: "Times New Roman", size: 20 })] })
        ],
        columnSpan: 6,
        borders: BORDERS_ALL
      })
    ]
  }));

  // Row 2: Sample Name & Report No
  rows.push(new TableRow({
    children: [
      createCell("Sample Name\n(as stated by customer)", { bold: true, colSpan: 2, widthPct: 33 }),
      createCell(sample.sample_name || 'N/A', { colSpan: 2, widthPct: 33 }),
      createCell("Test Report No.", { bold: true, widthPct: 17 }),
      createCell(testReportNo, { widthPct: 17 })
    ]
  }));

  // Row 3-6: Sample Details combined
  rows.push(new TableRow({
    children: [
      createCell("Sample Details", { bold: true, colSpan: 2, rowSpan: 4 }),
      createCell("Size", { bold: true, alignment: AlignmentType.CENTER }),
      createCell("Container type", { bold: true, alignment: AlignmentType.CENTER }),
      createCell("Registration No.", { bold: true }),
      createCell(registrationNo)
    ]
  }));
  
  rows.push(new TableRow({
    children: [
      createCell(`01 x ${sample.sample_quantity || 'N/A'}`, { rowSpan: 3, alignment: AlignmentType.CENTER }),
      createCell(sample.packing_details || 'N/A', { rowSpan: 3, alignment: AlignmentType.CENTER }),
      createCell("Issue Date", { bold: true }),
      createCell(issueDate)
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Date of Receipt", { bold: true }),
      createCell(receiptDate)
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Testing period", { bold: true }),
      createCell(testingPeriodStr)
    ]
  }));

  // Remaining Rows
  rows.push(new TableRow({
    children: [
      createCell("Product Category", { bold: true, colSpan: 2 }),
      createCell(job.groupMetadata?.productCategory || 'N/A', { colSpan: 2 }),
      createCell("Standard Specification", { bold: true }),
      createCell("--")
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Marking Seal (if any)", { bold: true, colSpan: 2 }),
      createCell(sample.marking_seal || 'NA', { colSpan: 2 }),
      createCell("Brand Name", { bold: true }),
      createCell("NA")
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Sample condition on receipt", { bold: true, colSpan: 2 }),
      createCell(sample.condition_on_receipt || 'Satisfactory', { colSpan: 2 }),
      createCell("Tests requested", { bold: true }),
      createCell("As Mentioned below")
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Customer ref.", { bold: true, colSpan: 2 }),
      createCell(customer.customer_reference_no || 'NA', { colSpan: 2 }),
      createCell("Batch No.", { bold: true }),
      createCell("NA")
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Sampling Details", { bold: true, colSpan: 2 }),
      createCell(sample.sampling_details || 'Sample provided by the customer', { colSpan: 4 })
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("DOM", { bold: true, colSpan: 2 }),
      createCell("NA", { colSpan: 2 }),
      createCell("DOE", { bold: true }),
      createCell("NA")
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Any Handling Instructions provided : Yes/NO", { bold: true, colSpan: 4 }),
      createCell(sample.special_handling_instructions || compliance.special_handling_instructions || 'No', { colSpan: 2 })
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Any data provided by customer", { bold: true, colSpan: 4 }),
      createCell("NA", { colSpan: 2 })
    ]
  }));

  rows.push(new TableRow({
    children: [
      createCell("Sample Description", { bold: true }),
      createCell(sample.sample_description || 'N/A', { colSpan: 5 })
    ]
  }));

  return new Table({ rows, width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA } });
};

const buildResultsTable = (rowsData, hasSpec, startIdx) => {
  const tableRows = [];
  let counter = startIdx;

  // Header Row
  const headerCells = [
    createCell("Sr. No.", { bold: true, alignment: AlignmentType.CENTER, widthPct: 8 }),
    createCell("Test Parameters", { bold: true, widthPct: 35 }),
    createCell("UoM", { bold: true, alignment: AlignmentType.CENTER, widthPct: 12 }),
    createCell("Result", { bold: true, alignment: AlignmentType.CENTER, widthPct: 15 }),
    createCell("Test Method", { bold: true, alignment: AlignmentType.CENTER, widthPct: hasSpec ? 15 : 30 })
  ];
  if (hasSpec) {
    headerCells.push(createCell("Specification", { bold: true, alignment: AlignmentType.CENTER, widthPct: 15 }));
  }
  tableRows.push(new TableRow({ children: headerCells }));

  // Data Rows
  for (const r of rowsData) {
    if (r.type === 'header') {
      tableRows.push(new TableRow({
        children: [
          createCell(`Discipline- ${r.dept === 'CHEMICAL' ? 'Chemical' : 'Biological'}\n${r.dept === 'CHEMICAL' ? 'Chemical Test Parameter' : 'Microbiology Test Parameters'}`, { bold: true, colSpan: 3 }),
          createCell(`Group - ${r.group}\nSub Group - ${r.subGroup}`, { bold: true, colSpan: hasSpec ? 3 : 2 })
        ]
      }));
    } else {
      counter++;
      const dataCells = [
        createCell(`${counter}.`, { alignment: AlignmentType.CENTER }),
        createCell(r.data.name),
        createCell(r.data.unit || '--', { alignment: AlignmentType.CENTER }),
        createCell(r.data.value || '--', { bold: true, alignment: AlignmentType.CENTER }),
        createCell(r.data.testMethod || '--', { alignment: AlignmentType.CENTER })
      ];
      if (hasSpec) {
        dataCells.push(createCell(r.data.specification || '--', { alignment: AlignmentType.CENTER }));
      }
      tableRows.push(new TableRow({ children: dataCells }));
    }
  }

  if (rowsData.length === 0) {
    tableRows.push(new TableRow({
      children: [createCell("No results recorded.", { colSpan: hasSpec ? 6 : 5, alignment: AlignmentType.CENTER })]
    }));
  }

  return new Table({ rows: tableRows, width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA } });
};

/**
 * Generate a complete DOCX report using docx library
 * @param {Object} job - The job data (populated with sample, customer, compliance, parameters)
 * @param {String} reportType - 'nabl' or 'non_nabl'
 * @returns {Promise<Buffer>}
 */
const generateReport = async (job, reportType) => {
  const isNabl = reportType === 'nabl';
  const { testReportNo, registrationNo, isAmended, baseReportNo } = deriveReportFields(job.jobCode);
  
  const allRows = [];
  const groupName = job.groupMetadata?.group || 'N/A';
  const subGroupName = job.groupMetadata?.subGroup || 'N/A';
  
  const parameters = job.parameters || [];
  
  // Case-insensitive type matching (schema stores 'Chemical'/'Micro', not uppercase)
  const chemicalResults = parameters.filter(p => (p.type || '').toUpperCase() === 'CHEMICAL');
  const microResults = parameters.filter(p => (p.type || '').toUpperCase() === 'MICRO');
  
  if (chemicalResults.length > 0) {
    allRows.push({ type: 'header', dept: 'CHEMICAL', group: groupName, subGroup: subGroupName });
    chemicalResults.forEach(r => allRows.push({ type: 'result', data: r }));
  }
  if (microResults.length > 0) {
    allRows.push({ type: 'header', dept: 'MICRO', group: groupName, subGroup: subGroupName });
    microResults.forEach(r => allRows.push({ type: 'result', data: r }));
  }

  const hasSpec = !!job.showSpecifications;

  // Pagination Logic
  const pages = [];
  let currentResultIndex = 0;
  for (let i = 0; i < Math.max(allRows.length, 1); i += ITEMS_PER_PAGE) {
    const pageRows = allRows.slice(i, i + ITEMS_PER_PAGE);
    pages.push({ rows: pageRows, startIdx: currentResultIndex });
    currentResultIndex += pageRows.filter(r => r.type === 'result').length;
  }

  const sections = [];

  for (let i = 0; i < pages.length; i++) {
    const isFirst = i === 0;
    const isLast = i === pages.length - 1;
    const pageObj = pages[i];
    
    const children = [];

    // Header Reference
    children.push(new Paragraph({
      children: [new TextRun({ text: "FTL/AIPER/F/7.8-01", bold: true, font: "Times New Roman", size: 16 })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 100 }
    }));

    if (isFirst) {
      children.push(buildHeaderTable(isNabl));
      children.push(new Paragraph({
        children: [new TextRun({ text: "TEST REPORT", bold: true, font: "Times New Roman", size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 }
      }));
      if (isNabl && job.sample?.ulr_no) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `ULR No. ${job.sample.ulr_no}`, bold: true, font: "Times New Roman", size: 20 })],
          alignment: AlignmentType.LEFT,
          spacing: { after: 100 }
        }));
      }
      children.push(buildSampleInfoTable(job, isNabl));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Continue.......", bold: true, italics: true, font: "Times New Roman", size: 16 })],
        alignment: AlignmentType.LEFT,
        spacing: { after: 100 }
      }));
      // Continuation Header Table
      children.push(new Table({
        rows: [
          new TableRow({ children: [createCell("Sample Name", { bold: true, widthPct: 25 }), createCell(job.sample?.sample_name || 'N/A', { widthPct: 25 }), createCell("Test Report No.", { bold: true, widthPct: 25 }), createCell(testReportNo, { widthPct: 25 })] }),
          new TableRow({ children: [createCell("Sample Details", { bold: true, widthPct: 25 }), createCell(`01 x ${job.sample?.sample_quantity || 'N/A'}`, { widthPct: 25 }), createCell("Registration No.", { bold: true, widthPct: 25 }), createCell(registrationNo, { widthPct: 25 })] })
        ],
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA }
      }));
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: "TEST RESULT", bold: true, font: "Times New Roman", size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 }
    }));

    children.push(buildResultsTable(pageObj.rows, hasSpec, pageObj.startIdx));

    if (isLast) {
      // Abbreviations
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Abbreviations used: UOM: Unit of Measurement; ND: Not Detected; DL: Detection Limit; DOE: Date of Expiry; DOM: Date of Manufacturing ;", font: "Times New Roman", size: 18 })
        ],
        spacing: { before: 200 }, alignment: AlignmentType.CENTER
      }));
      
      const notes = [
        "1) Report shall not be reproduced except in full without approval of the laboratory.",
        "2) The results relate only to the items sampled / tested as received.",
        "3) Duplicate report will be issued on chargeable basis."
      ];
      if (isAmended) notes.push(`4) This test report is the replacement to earlier test report no. (${baseReportNo}). Earlier test report stands obsolete.`);
      
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "NOTE: ", bold: true, font: "Times New Roman", size: 18 }),
          new TextRun({ text: notes.join("    "), font: "Times New Roman", size: 18 })
        ],
        alignment: AlignmentType.CENTER
      }));

      children.push(new Paragraph({
        children: [new TextRun({ text: "*End of report*", bold: true, font: "Times New Roman", size: 22 })],
        alignment: AlignmentType.CENTER, spacing: { before: 200, after: 400 }
      }));

      // Signatures
      children.push(new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Reviewed By", font: "Times New Roman", size: 20 })], spacing: { after: 600 } }),
                  new Paragraph({ children: [new TextRun({ text: "Ms. Diksha Dwivedi", font: "Times New Roman", size: 20 })] })
                ],
                borders: BORDERS_NONE, width: { size: Math.round(PAGE_WIDTH_DXA / 2), type: WidthType.DXA }
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: "Authorized Signatory", font: "Times New Roman", size: 20 })], alignment: AlignmentType.RIGHT, spacing: { after: 600 } }),
                  new Paragraph({ children: [new TextRun({ text: job.distribution?.chemical?.assignedHead?.name || job.distribution?.micro?.assignedHead?.name || 'Technical Manager', font: "Times New Roman", size: 20 })], alignment: AlignmentType.RIGHT })
                ],
                borders: BORDERS_NONE, width: { size: Math.round(PAGE_WIDTH_DXA / 2), type: WidthType.DXA }
              })
            ]
          })
        ],
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA }
      }));
    }

    if (!isLast) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    sections.push({
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
          size: { width: 12240, height: 15840 } // A4 portrait in twips
        }
      },
      headers: {
        default: new Header({ children: [] })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `Page ${i + 1} of ${pages.length}`, font: "Times New Roman", size: 18, color: "555555" })],
              alignment: AlignmentType.RIGHT
            })
          ]
        })
      },
      children
    });
  }

  const doc = new Document({ sections });
  return await Packer.toBuffer(doc);
};

module.exports = {
  generateReport
};
