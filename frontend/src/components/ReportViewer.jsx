import React, { useRef, useState, useLayoutEffect } from 'react';
import html2pdf from 'html2pdf.js';
import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { Download } from 'lucide-react';
import logo from '../assets/Acropolis20Logo.png';
import nablLogo from '../assets/nabl-logo.png';
import nablQrcode from '../assets/nabl-qrcode.png';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveReportFields(jobCode) {
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
}

const ITEMS_PER_PAGE = 12; // max result rows before splitting to a new page

// ─── Shared styles ────────────────────────────────────────────────────────────
const border = '1px solid #333';
const td = { border, padding: '4px 7px', fontSize: '10.5px', verticalAlign: 'top' };
const label = { ...td, fontWeight: 600, whiteSpace: 'nowrap', width: '155px' };
const hdr = { ...td, fontWeight: 700, padding: '5px 7px' };
const pageStyle = {
  fontFamily: '"Times New Roman", Times, serif',
  backgroundColor: '#fff',
  color: '#000',
  padding: '18px 24px',
  maxWidth: '780px',
  minWidth: '780px',
  margin: '0 auto',
  boxSizing: 'border-box',
};

// ─── NABL Logo Image ──────────────────────────────────────────────────────────
// Using the imported nabl-logo.png image
function NablLogo({ size = 55 }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <img src={nablLogo} alt="NABL Logo" style={{ width: `${size}px`, objectFit: 'contain' }} />
      <div style={{ fontSize: '7.5px', fontWeight: 'bold', marginTop: '1px' }}>TC-12434</div>
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({ isNabl, docRef }) {
  return (
    <>
      <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>FTL/AIPER/F/7.8-01</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', border }}>
        <tbody>
          <tr>
            <td style={{ ...td, width: '150px', textAlign: 'center', verticalAlign: 'middle', border }}>
              <img src={logo} alt="Acropolis" style={{ maxWidth: '130px', maxHeight: '75px', objectFit: 'contain' }} />
            </td>
            <td style={{ ...td, textAlign: 'center', verticalAlign: 'middle', border }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>Food Testing Laboratory</div>
              <div style={{ fontSize: '10px', color: '#000' }}>
                Acropolis Institute of Pharmaceutical Education and Research<br />
                Mangliya Square, Indore Bypass Road, Indore M.P.-453771;<br />
                Mobile: +91 9201974674<br />
                Landline: 731-4730174, 175,176 &amp; 184<br />
                Email ID:<span style={{color: 'blue', textDecoration: 'underline'}}>ftl@acropolis.edu.in</span><br />
                Website: <span style={{color: 'blue', textDecoration: 'underline'}}>www.acrolabs.in</span>
              </div>
            </td>
            <td style={{ ...td, width: '150px', textAlign: 'center', verticalAlign: 'middle', border, padding: '4px' }}>
              {isNabl ? (
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ borderRight: '1px solid #333', paddingRight: '8px' }}>
                    <NablLogo size={70} />
                  </div>
                  <div style={{ paddingLeft: '4px' }}>
                    <img src={nablQrcode} alt="QR Code" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                  </div>
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── Continuation header (all pages except page 1) ───────────────────────────
function ContinuationHeader({ job, testReportNo, registrationNo }) {
  const sample = job?.sample || {};
  return (
    <>
      <div style={{ textAlign: 'left', fontSize: '10px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '4px' }}>Continue.......</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={label}>Sample Name</td>
            <td style={td}>{sample.sample_name || 'N/A'}</td>
            <td style={label}>Test Report No.</td>
            <td style={td}>{testReportNo}</td>
          </tr>
          <tr>
            <td style={label}>Sample Details</td>
            <td style={td}>{(sample.sample_count ? String(sample.sample_count).padStart(2, '0') + ' x ' : '') + (sample.sample_quantity || 'N/A')}</td>
            <td style={label}>Registration No.</td>
            <td style={td}>{registrationNo}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

// ─── Sample Info Table ────────────────────────────────────────────────────────
function SampleInfoTable({ job, testReportNo, registrationNo, issueDate, receiptDate, testingPeriodStr, isNabl }) {
  const customer = job.customer || {};
  const sample = job.sample || {};
  const compliance = job.compliance || {};
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', border: '1px solid #333' }}>
      <tbody>
        <tr>
          <td colSpan={4} style={{ ...td, padding: '8px', borderBottom: '1px solid #333' }}>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ width: '150px', fontWeight: 600 }}>Customer Name:</div>
              <div style={{ flex: 1 }}>{customer.customer_name || job.clientName || 'N/A'}</div>
            </div>
            <div style={{ display: 'flex', marginBottom: '4px' }}>
              <div style={{ width: '150px', fontWeight: 600 }}>Address:</div>
              <div style={{ flex: 1 }}>{customer.customer_address || 'N/A'}</div>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '150px', fontWeight: 600 }}>Contact Person :</div>
              <div style={{ flex: 1 }}>{customer.contact_person || 'N/A'}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style={{...label, width: '25%'}}>Sample Name<br /><span style={{ fontWeight: 400, fontSize: '9px' }}>( as stated by customer )</span></td>
          <td style={{...td, width: '35%'}}>{sample.sample_name || 'N/A'}</td>
          <td style={{...label, width: '20%'}}>Test Report No.</td>
          <td style={{...td, width: '20%'}}>{testReportNo}</td>
        </tr>
        <tr>
          <td rowSpan={4} style={{ ...label, verticalAlign: 'middle' }}>Sample Details</td>
          <td rowSpan={4} style={{ ...td, padding: 0 }}>
             <table style={{width: '100%', borderCollapse: 'collapse', height: '100%'}}>
               <tbody>
                 <tr>
                   <td style={{borderBottom: '1px solid #333', borderRight: '1px solid #333', fontWeight: 600, padding: '4px', textAlign: 'center'}}>Size</td>
                   <td style={{borderBottom: '1px solid #333', fontWeight: 600, padding: '4px', textAlign: 'center'}}>Container type</td>
                 </tr>
                 <tr>
                   <td style={{borderRight: '1px solid #333', padding: '4px', textAlign: 'center', verticalAlign: 'top'}}>01 x {sample.sample_quantity || 'N/A'}</td>
                   <td style={{padding: '4px', textAlign: 'center', verticalAlign: 'top'}}>{sample.packing_details || 'N/A'}</td>
                 </tr>
               </tbody>
             </table>
          </td>
          <td style={label}>Registration No.</td>
          <td style={td}>{registrationNo}</td>
        </tr>
        <tr>
          <td style={label}>Issue Date</td>
          <td style={td}>{issueDate}</td>
        </tr>
        <tr>
          <td style={label}>Date of Receipt</td>
          <td style={td}>{receiptDate}</td>
        </tr>
        <tr>
          <td style={label}>Testing period</td>
          <td style={td}>{testingPeriodStr}</td>
        </tr>
        <tr>
          <td style={label}>Product Category</td>
          <td style={td}>{job.groupMetadata?.productCategory || 'N/A'}</td>
          <td style={label}>Standard Specification</td>
          <td style={td}>--</td>
        </tr>
        <tr>
          <td style={label}>Marking Seal ( if any)</td>
          <td style={td}>{sample.marking_seal || 'NA'}</td>
          <td style={label}>Brand Name</td>
          <td style={td}>NA</td>
        </tr>
        <tr>
          <td style={label}>Sample condition on receipt</td>
          <td style={td}>{sample.condition_on_receipt || 'Satisfactory'}</td>
          <td style={label}>Tests requested</td>
          <td style={td}>As Mentioned below</td>
        </tr>
        <tr>
          <td style={label}>Customer ref.</td>
          <td style={td}>{customer.customer_reference_no || 'NA'}</td>
          <td style={label}>Batch No.</td>
          <td style={td}>NA</td>
        </tr>
        <tr>
          <td style={label}>Sampling Details</td>
          <td style={td} colSpan={3}>{sample.sampling_details || 'Sample provided by the customer'}</td>
        </tr>
        <tr>
          <td style={label}>DOM</td>
          <td style={td}>NA</td>
          <td style={label}>DOE</td>
          <td style={td}>NA</td>
        </tr>
        <tr>
          <td colSpan={2} style={{ ...label, whiteSpace: 'normal' }}>Any Handling Instructions provided : <span style={{textDecoration: 'line-through'}}>Yes</span>/NO ( if yes ; Short details)</td>
          <td colSpan={2} style={td}>{sample.special_handling_instructions || compliance.special_handling_instructions || 'No'}</td>
        </tr>
        <tr>
          <td colSpan={2} style={label}>Any data provided by customer</td>
          <td colSpan={2} style={td}>NA</td>
        </tr>
        <tr>
          <td style={label}>Sample Description</td>
          <td style={td} colSpan={3}>{sample.sample_description || 'N/A'}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Results Table rows renderer ─────────────────────────────────────────────
function ResultsTable({ rows, hasSpec, startIdx }) {
  let counter = startIdx;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
      <thead>
        <tr>
          <td style={{ ...hdr, width: '45px', textAlign: 'center' }}>Sr. No.</td>
          <td style={hdr}>Test Parameters</td>
          <td style={{ ...hdr, width: '70px', textAlign: 'center' }}>UoM</td>
          <td style={{ ...hdr, width: '95px', textAlign: 'center' }}>Result</td>
          <td style={{ ...hdr, width: '145px', textAlign: 'center' }}>Test Method</td>
          {hasSpec && (
            <td style={{ ...hdr, width: '100px', textAlign: 'center' }}>Specification</td>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          if (row.type === 'header') {
            return (
              <tr key={`hdr-${i}`}>
                <td colSpan={3} style={{ ...td, fontWeight: 700 }}>
                  Discipline- {row.dept === 'CHEMICAL' ? 'Chemical' : 'Biological'}<br />
                  {row.dept === 'CHEMICAL' ? 'Chemical Test Parameter' : 'Microbiology Test Parameters'}
                </td>
                <td colSpan={hasSpec ? 3 : 2} style={{ ...td, fontWeight: 700 }}>
                  Group - {row.group}<br />
                  Sub Group - {row.subGroup}
                </td>
              </tr>
            );
          } else {
            const r = row.data;
            counter++;
            return (
              <tr key={`res-${i}`}>
                <td style={{ ...td, textAlign: 'center' }}>{counter}.</td>
                <td style={td}>{r.name}</td>
                <td style={{ ...td, textAlign: 'center' }}>{r.unit || '—'}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: '#000' }}>
                  {r.value || '—'}
                </td>
                <td style={{ ...td, textAlign: 'center' }}>{r.testMethod || '—'}</td>
                {hasSpec && (
                  <td style={{ ...td, textAlign: 'center' }}>{r.specification || '—'}</td>
                )}
              </tr>
            );
          }
        })}
        {rows.length === 0 && (
          <tr><td colSpan={hasSpec ? 6 : 5} style={{ ...td, textAlign: 'center', color: '#888' }}>No results recorded.</td></tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Abbreviations block ──────────────────────────────────────────────────────
function AbbrevBlock({ isAmended, baseReportNo }) {
  return (
    <>
      <div style={{ fontSize: '10.5px', color: '#000', borderTop: 'none', paddingTop: '5px', marginBottom: '10px' }}>
        <div style={{textAlign: 'center', marginBottom: '4px'}}>
          <strong>Abbreviations used:</strong> UOM: Unit of Measurement; ND: Not Detected; DL: Detection Limit;<br/>
          DOE: Date of Expiry; DOM: Date of Manufacturing ;.{isAmended ? ' A: Amendment.' : ''}
        </div>
        <div style={{textAlign: 'center'}}>
          <strong>NOTE:</strong> 1) Report shall not be reproduced except in full without approval of the laboratory.<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2) The results relate only to the items sampled / tested as received.<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;3) Duplicate report will be issued on chargeable basis.
          {isAmended && (
            <><br />&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;4) This test report is the replacement to earlier test report no. ({baseReportNo}). Earlier test report stands obsolete.</>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: '11.5px', fontWeight: 'bold', margin: '15px 0' }}>
        *End of report*
      </div>
    </>
  );
}

// ─── Signature Footer ─────────────────────────────────────────────────────────
// involvedDepts: array of { name, designation } for all dept heads involved
function SignatureFooter({ involvedDepts }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
      <tbody>
        <tr>
          {/* Left: Reviewer (Diksha Dwivedi) */}
          <td style={{ width: '50%', fontSize: '10.5px', verticalAlign: 'bottom', paddingBottom: '4px', textAlign: 'left', paddingLeft: '30px' }}>
            <div style={{ marginBottom: '18px' }}>Reviewed By</div>
            <div>Ms. Diksha Dwivedi</div>
          </td>

          {/* Right: Department Authorised Signatories */}
          <td style={{ width: '50%', textAlign: 'right', fontSize: '10.5px', verticalAlign: 'bottom', paddingBottom: '4px', paddingRight: '30px' }}>
            {involvedDepts.map((d, i) => (
              <div key={i} style={{ marginBottom: i < involvedDepts.length - 1 ? '12px' : '0' }}>
                <div style={{ marginBottom: '18px' }}>Authorized Signatory</div>
                <div>{d.name}</div>
              </div>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ─── Page Footer (page number) ────────────────────────────────────────────────
function PageFooter({ pageNum, totalPages }) {
  return (
    <div style={{ textAlign: 'right', fontSize: '9.5px', color: '#555', borderTop: '1px solid #ccc',
      paddingTop: '4px', marginTop: '8px' }}>
      Page {pageNum} of {totalPages}
    </div>
  );
}

// ─── Build pages from result rows ─────────────────────────────────────────────
function buildPages(allRows, perPage) {
  const pages = [];
  let currentResultIndex = 0;
  for (let i = 0; i < Math.max(allRows.length, 1); i += perPage) {
    const pageRows = allRows.slice(i, i + perPage);
    pages.push({ rows: pageRows, startIdx: currentResultIndex });
    currentResultIndex += pageRows.filter(r => r.type === 'result').length;
  }
  return pages;
}

// ─── Single Report (NABL or Non-NABL) ────────────────────────────────────────
function SingleReport({ microReport, chemicalReport, isNabl, forwardedRef }) {
  const job = microReport?._job || chemicalReport?._job || {};
  const customer = job.customer || {};
  const sample = job.sample || {};

  const { testReportNo, registrationNo, isAmended, baseReportNo } = deriveReportFields(job.jobCode);
  const completedAt = microReport?.completedAt || chemicalReport?.completedAt;
  const issueDate = completedAt ? new Date(completedAt).toLocaleDateString('en-IN') : 'N/A';
  const receiptDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN') : 'N/A';
  const tp = microReport?.testingPeriod || chemicalReport?.testingPeriod;
  const testingPeriodStr = tp?.startDate && tp?.endDate
    ? `${new Date(tp.startDate).toLocaleDateString('en-IN')} to ${new Date(tp.endDate).toLocaleDateString('en-IN')}`
    : 'N/A';

  const sampleName = sample.sample_name || 'N/A';

  const allRows = [];
  const groupName = job.groupMetadata?.group || 'N/A';
  const subGroupName = job.groupMetadata?.subGroup || 'N/A';

  if (chemicalReport?.results?.length > 0) {
    allRows.push({ type: 'header', dept: 'CHEMICAL', group: groupName, subGroup: subGroupName });
    chemicalReport.results.forEach(r => allRows.push({ type: 'result', data: r }));
  }
  if (microReport?.results?.length > 0) {
    allRows.push({ type: 'header', dept: 'MICRO', group: groupName, subGroup: subGroupName });
    microReport.results.forEach(r => allRows.push({ type: 'result', data: r }));
  }

  const hasSpec = job.showSpecifications && allRows.some(r => r.type === 'result' && r.data.specification);
  const pages = buildPages(allRows, ITEMS_PER_PAGE);
  const totalPages = pages.length;

  // Signatories
  const involvedDepts = [];
  if (microReport) involvedDepts.push({
    name: microReport.createdBy?.name || 'N/A',
    designation: 'Microbiology Head'
  });
  if (chemicalReport) involvedDepts.push({
    name: chemicalReport.createdBy?.name || 'N/A',
    designation: 'Technical Manager (Chemical)'
  });
  if (involvedDepts.length === 0) involvedDepts.push({ name: 'N/A', designation: 'Technical Manager' });

  return (
    <div ref={forwardedRef}>
      {pages.map((pageObj, pageIdx) => {
        const isFirst = pageIdx === 0;
        const isLast = pageIdx === totalPages - 1;
        return (
          <div key={pageIdx} style={{ ...pageStyle, pageBreakAfter: isLast ? 'auto' : 'always' }}>
            {/* Header */}
            {isFirst
              ? <PageHeader isNabl={isNabl} />
              : <ContinuationHeader job={job} testReportNo={testReportNo} registrationNo={registrationNo} />
            }

            {/* Title (page 1 only) */}
            {isFirst && (
              <>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px',
                  marginBottom: '8px', letterSpacing: '1px' }}>
                  TEST REPORT
                </div>
                {isNabl && job.sample?.ulr_no && (
                  <div style={{ fontSize: '10.5px', marginBottom: '6px', fontWeight: 600 }}>
                    ULR No. {job.sample.ulr_no}
                  </div>
                )}
                <SampleInfoTable
                  job={job}
                  testReportNo={testReportNo}
                  registrationNo={registrationNo}
                  issueDate={issueDate}
                  receiptDate={receiptDate}
                  testingPeriodStr={testingPeriodStr}
                  isNabl={isNabl}
                />
              </>
            )}

            {/* TEST RESULT heading for first results page */}
            {(isFirst || true) && (
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px',
                marginBottom: '6px' }}>
                TEST RESULT
              </div>
            )}

            <ResultsTable
              rows={pageObj.rows}
              hasSpec={hasSpec}
              startIdx={pageObj.startIdx}
            />

            {/* Last page: abbreviations + signatures + page number */}
            {isLast && (
              <>
                <AbbrevBlock isAmended={isAmended} baseReportNo={baseReportNo} />
                <SignatureFooter involvedDepts={involvedDepts} />
              </>
            )}
            <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Hybrid: two separate reports (NABL + Non-NABL) ──────────────────────────
// For hybrid we render SingleReport twice but the job passes nabl/nonNabl params separately.
// The job data passed will have results already split by the caller.

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function ReportViewer({
  // Legacy single-dept
  report,
  // Combined (micro + chemical) — used for non-nabl combined or nabl
  microReport,
  chemicalReport,
  isCombined = false,
  // NABL mode from job: 'nabl' | 'non_nabl' | 'hybrid'
  nablMode = 'non_nabl',
  // For hybrid: nabl-tagged and non-nabl-tagged report objects
  nablMicroReport,
  nablChemicalReport,
  nonNablMicroReport,
  nonNablChemicalReport,
  onBack
}) {
  const reportRef = useRef();
  const nablReportRef = useRef();
  const nonNablReportRef = useRef();
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState('auto');

  useLayoutEffect(() => {
    const updateScale = () => {
      if (!wrapperRef.current || !contentRef.current) return;
      const availableWidth = wrapperRef.current.clientWidth;
      if (availableWidth < 780) {
        const newScale = availableWidth / 780;
        setScale(newScale);
        setContentHeight(`${contentRef.current.offsetHeight * newScale}px`);
      } else {
        setScale(1);
        setContentHeight('auto');
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);
  const isNabl = nablMode === 'nabl';
  const isHybrid = nablMode === 'hybrid';

  const jobForName = (microReport || chemicalReport || nablMicroReport || nablChemicalReport || report)?._job || {};
  const jobCode = jobForName.jobCode || 'Job';

  const downloadPDF = async (ref, filename) => {
    const el = ref.current;
    if (!el) return;
    await html2pdf().from(el).set({
      margin: [6, 8, 6, 8],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).save();
  };

  const downloadDOCX = async (ref, filename) => {
    const el = ref.current;
    if (!el) return;
    
    // Clone the DOM so we can manipulate styles and images just for the Word export
    const clone = el.cloneNode(true);
    
    // Force Times New Roman on everything, and strip out Dark Reader injected styles
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(node => {
      // Remove injected attributes from browser extensions
      Array.from(node.attributes || []).forEach(attr => {
        if (attr.name.startsWith('data-darkreader')) {
          node.removeAttribute(attr.name);
        }
      });

      if (node.style) {
        node.style.fontFamily = '"Times New Roman", Times, serif';
        
        // Strip out CSS custom properties (like --darkreader-*) that crash html-to-docx xmlbuilder
        for (let i = node.style.length - 1; i >= 0; i--) {
          const propName = node.style[i];
          if (propName && propName.startsWith('--')) {
            node.style.removeProperty(propName);
          }
        }
        
        // Strip out width from td/th to prevent xmlbuilder crashing on percentages
        const tag = node.tagName.toLowerCase();
        if (tag === 'td' || tag === 'th') {
          node.style.width = '';
        }
      }
    });
    
    // Convert all images to base64 so they render in the DOCX file offline
    const images = clone.querySelectorAll('img');
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        img.src = base64;
        
        // Remove style.width from images so html-to-docx relies purely on intrinsic base64 dimensions
        // Passing NaN or percentage strings caused Mobile Word to mark the file as corrupted.
        img.removeAttribute('style');
        img.removeAttribute('width');
        img.removeAttribute('height');
      } catch (err) {
        console.warn('Failed to convert image to base64 for DOCX export', err);
      }
    }

    // Wrap in standard HTML structure
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Report</title>
        <style>
          body, table, td, th, div, span, p { font-family: "Times New Roman", Times, serif !important; }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
      </html>
    `;
    
    try {
      // Use backend LibreOffice API to generate a REAL OOXML DOCX Blob
      const response = await axios.post(`${API_URL}/api/export/docx`, { html }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const docxBlob = response.data;
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download DOCX', err);
      alert('Error generating DOCX file. Please try again.');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '870px', margin: '0 auto', paddingBottom: '3rem', overflowX: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem',
        alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button onClick={onBack} className="btn"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isHybrid ? (
            <>
              <button onClick={() => downloadPDF(nablReportRef, `NABL_Report_${jobCode}.pdf`)}
                className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> Download NABL PDF
              </button>
              <button onClick={() => downloadDOCX(nablReportRef, `NABL_Report_${jobCode}.docx`)}
                className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#3b82f6', color: 'white', border: 'none' }}>
                <Download size={16} /> Download NABL DOCX
              </button>
              <button onClick={() => downloadPDF(nonNablReportRef, `NonNABL_Report_${jobCode}.pdf`)}
                className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> Download Non-NABL PDF
              </button>
              <button onClick={() => downloadDOCX(nonNablReportRef, `NonNABL_Report_${jobCode}.docx`)}
                className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#3b82f6', color: 'white', border: 'none' }}>
                <Download size={16} /> Download Non-NABL DOCX
              </button>
            </>
          ) : (
            <>
              <button onClick={() => downloadPDF(reportRef, `Report_${jobCode}.pdf`)}
                className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={16} /> Download PDF
              </button>
              <button onClick={() => downloadDOCX(reportRef, `Report_${jobCode}.docx`)}
                className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#3b82f6', color: 'white', border: 'none' }}>
                <Download size={16} /> Download DOCX
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={wrapperRef} style={{ border: '1px solid #ccc', borderRadius: '4px', width: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
        <div style={{ width: '100%', height: contentHeight, overflow: 'hidden' }}>
          <div 
            ref={contentRef}
            style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: 'top left', 
              width: '780px',
            }}
          >
            {isHybrid ? (
              <>
                {/* NABL section */}
                <div style={{ padding: '8px 16px', backgroundColor: '#e0f2fe', fontWeight: 700, fontSize: '13px',
                  borderBottom: '2px solid #0284c7' }}>
                  NABL Report
                </div>
                <SingleReport
                  microReport={nablMicroReport}
                  chemicalReport={nablChemicalReport}
                  isNabl={true}
                  forwardedRef={nablReportRef}
                />
                {/* Non-NABL section */}
                <div style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', fontWeight: 700, fontSize: '13px',
                  borderTop: '2px solid #64748b', borderBottom: '2px solid #64748b', marginTop: '24px' }}>
                  Non-NABL Report
                </div>
                <SingleReport
                  microReport={nonNablMicroReport}
                  chemicalReport={nonNablChemicalReport}
                  isNabl={false}
                  forwardedRef={nonNablReportRef}
                />
              </>
            ) : (
              <SingleReport
                microReport={isCombined ? microReport : (report ? { ...report, _job: report._job } : null)}
                chemicalReport={isCombined ? chemicalReport : null}
                isNabl={isNabl}
                forwardedRef={reportRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
