import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Download, X } from 'lucide-react';
import logo from '../assets/Acropolis20Logo.png';

// Helper: derive report fields from job code
function deriveReportFields(jobCode) {
  // Extract base 10-digit code (handles "2605081100-retest-1" -> "2605081100")
  const baseCode = jobCode ? jobCode.split('-')[0] : '';
  const last4 = baseCode ? baseCode.slice(-4) : '0000';
  const yy = baseCode ? baseCode.slice(0, 2) : '00';

  // Extract retest part if present
  const retestMatch = jobCode ? jobCode.match(/retest-\d+/) : null;
  const retestSuffix = retestMatch ? `/${retestMatch[0].toUpperCase()}` : '';

  const testReportNo = `FTL/AIPER/${yy}/${last4}${retestSuffix}`;
  const registrationNo = String(Math.max(0, parseInt(last4, 10) - 1099));
  return { testReportNo, registrationNo };
}

// --- Single Dept Report Viewer ---
function SingleReportContent({ report, forwardedRef }) {
  const job = report._job || {};
  const customer = job.customer || {};
  const sample = job.sample || {};
  const compliance = job.compliance || {};
  const dept = report.createdBy?.department?.toLowerCase() === 'micro' ? 'MICRO' : 'CHEMICAL';

  // Field mappings
  const { testReportNo, registrationNo } = deriveReportFields(job.jobCode);
  const issueDate = report.completedAt ? new Date(report.completedAt).toLocaleDateString('en-IN') : 'N/A';
  const receiptDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN') : (sample.received_date ? new Date(sample.received_date).toLocaleDateString('en-IN') : 'N/A');
  const testingPeriodStr = report.testingPeriod?.startDate && report.testingPeriod?.endDate
    ? `${new Date(report.testingPeriod.startDate).toLocaleDateString('en-IN')} to ${new Date(report.testingPeriod.endDate).toLocaleDateString('en-IN')}`
    : 'N/A';
  const analyst = report.assignedTo?.name || 'N/A';
  const head = report.createdBy?.name || 'N/A';

  const borderStyle = '1px solid #333';
  const tdStyle = { border: borderStyle, padding: '5px 8px', fontSize: '11px', verticalAlign: 'top' };
  const labelStyle = { ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap', width: '170px', backgroundColor: '#f8f9fa' };
  const headerTd = { border: borderStyle, padding: '6px 8px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f0f0f0' };

  return (
    <div ref={forwardedRef} style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', color: '#000', padding: '20px 28px', maxWidth: '800px', margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', border: borderStyle }}>
        <tbody>
          <tr>
            <td style={{ ...tdStyle, width: '160px', textAlign: 'center', verticalAlign: 'middle', border: borderStyle }}>
              <img src={logo} alt="Acropolis Logo" style={{ maxWidth: '130px', maxHeight: '70px', objectFit: 'contain' }} />
            </td>
            <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle', border: borderStyle }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>Food Testing Laboratory</div>
              <div style={{ fontSize: '10px', color: '#444' }}>
                Acropolis Institute of Pharmaceutical Education and Research<br />
                Mangliya Square, Indore Bypass Road, Indore M.P.-453771<br />
                Mobile: +91 9201974674 | Landline: 731-4730174, 175, 176 &amp; 184<br />
                Email ID: ftl@acropolis.edu.in | Website: www.acrolabs.in
              </div>
            </td>
            <td style={{ ...tdStyle, fontSize: '9px', textAlign: 'right', verticalAlign: 'top', border: borderStyle, whiteSpace: 'nowrap' }}>
              FTL/AIPER/F/7.8-01
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── TITLE ── */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px', textDecoration: 'underline', marginBottom: '10px', letterSpacing: '1px' }}>
        TEST REPORT — {dept} DEPARTMENT
      </div>

      {/* ── CUSTOMER / SAMPLE INFO ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={labelStyle}>Customer Name</td>
            <td style={{ ...tdStyle, fontWeight: 600 }} colSpan={3}>{customer.customer_name || job.clientName || 'N/A'}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Address</td>
            <td style={tdStyle} colSpan={3}>{customer.customer_address || 'N/A'}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Contact Details</td>
            <td style={tdStyle} colSpan={3}>{customer.mobile_number || 'N/A'}{customer.email ? ` | ${customer.email}` : ''}</td>
          </tr>
        </tbody>
      </table>

      {/* ── SAMPLE DETAILS (2-column grid) ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={labelStyle}>Sample Name</td>
            <td style={tdStyle}>{sample.sample_name || 'N/A'}</td>
            <td style={labelStyle}>Test Report No.</td>
            <td style={tdStyle}>{testReportNo}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sample Quantity</td>
            <td style={tdStyle}>{sample.sample_quantity || 'N/A'}</td>
            <td style={labelStyle}>Registration No.</td>
            <td style={tdStyle}>{registrationNo}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Packing Details</td>
            <td style={tdStyle}>{sample.packing_details || 'N/A'}</td>
            <td style={labelStyle}>Issue Date</td>
            <td style={tdStyle}>{issueDate}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Marking Seal (if any)</td>
            <td style={tdStyle}>{sample.marking_seal || 'N/A'}</td>
            <td style={labelStyle}>Date of Receipt</td>
            <td style={tdStyle}>{receiptDate}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sample Condition on Receipt</td>
            <td style={tdStyle}>{sample.condition_on_receipt || 'N/A'}</td>
            <td style={labelStyle}>Testing Period</td>
            <td style={tdStyle}>{testingPeriodStr}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Customer Ref.</td>
            <td style={tdStyle}>{customer.customer_reference_no || 'N/A'}</td>
            <td style={labelStyle}>Standard Specification</td>
            <td style={tdStyle}>-</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sampling Details</td>
            <td style={tdStyle}>{sample.sampling_details || 'N/A'}</td>
            <td style={labelStyle}>Brand Name</td>
            <td style={tdStyle}>N/A</td>
          </tr>
          <tr>
            <td style={labelStyle}>DOM</td>
            <td style={tdStyle}>N/A</td>
            <td style={labelStyle}>DOE</td>
            <td style={tdStyle}>N/A</td>
          </tr>
          <tr>
            <td style={labelStyle}>Any Handling Instructions</td>
            <td style={tdStyle} colSpan={3}>{sample.special_handling_instructions || compliance.special_handling_instructions || 'No'}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Any data provided by customer</td>
            <td style={tdStyle} colSpan={3}>N/A</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sample Description</td>
            <td style={tdStyle} colSpan={3}>{sample.sample_description || 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      {/* ── TEST RESULTS ── */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', textDecoration: 'underline', marginBottom: '8px' }}>TEST RESULT</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <td style={{ ...headerTd, width: '40px', textAlign: 'center' }}>Sr. No.</td>
            <td style={headerTd}>Test Parameters</td>
            <td style={{ ...headerTd, width: '80px', textAlign: 'center' }}>UoM</td>
            <td style={{ ...headerTd, width: '100px', textAlign: 'center' }}>Result</td>
            <td style={{ ...headerTd, width: '160px', textAlign: 'center' }}>Test Method</td>
          </tr>
        </thead>
        <tbody>
          {(report.results || []).map((r, i) => {
            const isOutlier = (() => {
              if (r.referenceRange?.includes('-') && !isNaN(parseFloat(r.value))) {
                const [min, max] = r.referenceRange.split('-').map(s => parseFloat(s));
                const val = parseFloat(r.value);
                return !isNaN(min) && !isNaN(max) && (val < min || val > max);
              }
              return false;
            })();
            return (
              <tr key={i}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}.</td>
                <td style={tdStyle}>{r.name}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{r.unit || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: isOutlier ? '#c0392b' : '#000' }}>
                  {r.value || '-'} {isOutlier && <span style={{ fontSize: '9px' }}>(FLAG)</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{r.testMethod || '-'}</td>
              </tr>
            );
          })}
          {(!report.results || report.results.length === 0) && (
            <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#888' }}>No results recorded.</td></tr>
          )}
        </tbody>
      </table>

      {/* ── ABBREVIATIONS & NOTES ── */}
      <div style={{ fontSize: '9.5px', color: '#333', borderTop: '1px solid #aaa', paddingTop: '6px', marginBottom: '30px' }}>
        <strong>Abbreviations used:</strong> UOM: Unit of Measurement; BLQ: Below limit of Quantification; LOQ: Limit of Quantification; DOE: Date of Expiry; DOM: Date of Manufacturing; NA: Not Applicable.<br />
        <strong>NOTE:</strong> 1) Report shall not be reproduced except in full without approval of the laboratory.<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2) The results relate only to the items sampled / tested as received.<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;3) Duplicate report will be issued on chargeable basis.
      </div>

      {/* ── SIGNATURES ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <tbody>
          <tr>
            <td style={{ width: '35%', verticalAlign: 'bottom', fontSize: '11px', paddingBottom: '4px' }}>
              <div>Reviewed By</div>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{analyst}</div>
              <div>Analyst</div>
            </td>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '11px', paddingBottom: '4px' }}>
              <strong>*End of report*</strong>
            </td>
            <td style={{ width: '35%', textAlign: 'right', fontSize: '11px', paddingBottom: '4px' }}>
              <div>Authorised Signatory</div>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{head}</div>
              <div>Technical Manager</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// --- Combined (Micro + Chemical) Report ---
function CombinedReportContent({ microReport, chemicalReport, forwardedRef }) {
  const job = microReport?._job || chemicalReport?._job || {};
  const customer = job.customer || {};
  const sample = job.sample || {};

  const { testReportNo, registrationNo } = deriveReportFields(job.jobCode);
  const latestCompletedAt = microReport?.completedAt || chemicalReport?.completedAt;
  const issueDate = latestCompletedAt ? new Date(latestCompletedAt).toLocaleDateString('en-IN') : 'N/A';
  const receiptDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN') : 'N/A';
  const tp = microReport?.testingPeriod || chemicalReport?.testingPeriod;
  const testingPeriodStr = tp?.startDate && tp?.endDate
    ? `${new Date(tp.startDate).toLocaleDateString('en-IN')} to ${new Date(tp.endDate).toLocaleDateString('en-IN')}`
    : 'N/A';
  const microAnalyst = microReport?.assignedTo?.name || 'N/A';
  const chemicalAnalyst = chemicalReport?.assignedTo?.name || 'N/A';

  const borderStyle = '1px solid #333';
  const tdStyle = { border: borderStyle, padding: '5px 8px', fontSize: '11px', verticalAlign: 'top' };

  const labelStyle = { ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap', width: '170px', backgroundColor: '#f8f9fa' };
  const headerTd = { border: borderStyle, padding: '6px 8px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f0f0f0' };
  const sectionHeaderTd = { border: borderStyle, padding: '8px', fontSize: '12px', fontWeight: 700, backgroundColor: '#e8f4fd', textAlign: 'center' };

  const allResults = [
    ...(microReport?.results || []).map(r => ({ ...r, _dept: 'MICRO' })),
    ...(chemicalReport?.results || []).map(r => ({ ...r, _dept: 'CHEMICAL' })),
  ];

  return (
    <div ref={forwardedRef} style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', color: '#000', padding: '20px 28px', maxWidth: '800px', margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', border: borderStyle }}>
        <tbody>
          <tr>
            <td style={{ ...tdStyle, width: '160px', textAlign: 'center', verticalAlign: 'middle', border: borderStyle }}>
              <img src={logo} alt="Acropolis Logo" style={{ maxWidth: '130px', maxHeight: '70px', objectFit: 'contain' }} />
            </td>
            <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle', border: borderStyle }}>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '3px' }}>Food Testing Laboratory</div>
              <div style={{ fontSize: '10px', color: '#444' }}>
                Acropolis Institute of Pharmaceutical Education and Research<br />
                Mangliya Square, Indore Bypass Road, Indore M.P.-453771<br />
                Mobile: +91 9201974674 | Landline: 731-4730174, 175, 176 &amp; 184<br />
                Email ID: ftl@acropolis.edu.in | Website: www.acrolabs.in
              </div>
            </td>
            <td style={{ ...tdStyle, fontSize: '9px', textAlign: 'right', verticalAlign: 'top', border: borderStyle, whiteSpace: 'nowrap' }}>
              FTL/AIPER/F/7.8-01
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px', textDecoration: 'underline', marginBottom: '10px', letterSpacing: '1px' }}>
        COMBINED TEST REPORT (MICRO + CHEMICAL)
      </div>

      {/* ── CUSTOMER BLOCK ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={labelStyle}>Customer Name</td>
            <td style={{ ...tdStyle, fontWeight: 600 }} colSpan={3}>{customer.customer_name || job.clientName || 'N/A'}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Address</td>
            <td style={tdStyle} colSpan={3}>{customer.customer_address || 'N/A'}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Contact Details</td>
            <td style={tdStyle} colSpan={3}>{customer.mobile_number || 'N/A'}{customer.email ? ` | ${customer.email}` : ''}</td>
          </tr>
        </tbody>
      </table>

      {/* ── SAMPLE DETAILS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={labelStyle}>Sample Name</td>
            <td style={tdStyle}>{sample.sample_name || 'N/A'}</td>
            <td style={labelStyle}>Test Report No.</td>
            <td style={tdStyle}>{testReportNo}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sample Quantity</td>
            <td style={tdStyle}>{sample.sample_quantity || 'N/A'}</td>
            <td style={labelStyle}>Registration No.</td>
            <td style={tdStyle}>{registrationNo}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Packing Details</td>
            <td style={tdStyle}>{sample.packing_details || 'N/A'}</td>
            <td style={labelStyle}>Issue Date</td>
            <td style={tdStyle}>{issueDate}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Marking Seal (if any)</td>
            <td style={tdStyle}>{sample.marking_seal || 'N/A'}</td>
            <td style={labelStyle}>Date of Receipt</td>
            <td style={tdStyle}>{receiptDate}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sample Condition on Receipt</td>
            <td style={tdStyle}>{sample.condition_on_receipt || 'N/A'}</td>
            <td style={labelStyle}>Testing Period</td>
            <td style={tdStyle}>{testingPeriodStr}</td>
          </tr>
          <tr>
            <td style={labelStyle}>Customer Ref.</td>
            <td style={tdStyle}>{customer.customer_reference_no || 'N/A'}</td>
            <td style={labelStyle}>Standard Specification</td>
            <td style={tdStyle}>-</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sampling Details</td>
            <td style={tdStyle}>{sample.sampling_details || 'N/A'}</td>
            <td style={labelStyle}>Brand Name</td>
            <td style={tdStyle}>N/A</td>
          </tr>
          <tr>
            <td style={labelStyle}>DOM</td>
            <td style={tdStyle}>N/A</td>
            <td style={labelStyle}>DOE</td>
            <td style={tdStyle}>N/A</td>
          </tr>
          <tr>
            <td style={labelStyle}>Sample Description</td>
            <td style={tdStyle} colSpan={3}>{sample.sample_description || 'N/A'}</td>
          </tr>
        </tbody>
      </table>

      {/* ── COMBINED TEST RESULTS ── */}
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', textDecoration: 'underline', marginBottom: '8px' }}>TEST RESULT</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <td style={{ ...headerTd, width: '40px', textAlign: 'center' }}>Sr. No.</td>
            <td style={headerTd}>Test Parameters</td>
            <td style={{ ...headerTd, width: '60px', textAlign: 'center' }}>Dept</td>
            <td style={{ ...headerTd, width: '70px', textAlign: 'center' }}>UoM</td>
            <td style={{ ...headerTd, width: '90px', textAlign: 'center' }}>Result</td>
            <td style={{ ...headerTd, width: '140px', textAlign: 'center' }}>Test Method</td>
          </tr>
        </thead>
        <tbody>
          {allResults.map((r, i) => {
            let isOutlier = false;
            if (r.referenceRange?.includes('-') && !isNaN(parseFloat(r.value))) {
              const [min, max] = r.referenceRange.split('-').map(s => parseFloat(s));
              const val = parseFloat(r.value);
              if (!isNaN(min) && !isNaN(max) && (val < min || val > max)) isOutlier = true;
            }
            return (
              <tr key={i}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}.</td>
                <td style={tdStyle}>{r.name}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontSize: '10px', fontWeight: 600, color: r._dept === 'MICRO' ? '#15803d' : '#1d4ed8' }}>{r._dept}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{r.unit || '-'}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: isOutlier ? '#c0392b' : '#000' }}>
                  {r.value || '-'} {isOutlier && <span style={{ fontSize: '9px' }}>(FLAG)</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{r.testMethod || '-'}</td>
              </tr>
            );
          })}
          {allResults.length === 0 && (
            <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#888' }}>No results recorded.</td></tr>
          )}
        </tbody>
      </table>

      {/* ── ABBREVIATIONS ── */}
      <div style={{ fontSize: '9.5px', color: '#333', borderTop: '1px solid #aaa', paddingTop: '6px', marginBottom: '30px' }}>
        <strong>Abbreviations used:</strong> UOM: Unit of Measurement; BLQ: Below limit of Quantification; LOQ: Limit of Quantification; DOE: Date of Expiry; DOM: Date of Manufacturing; NA: Not Applicable.<br />
        <strong>NOTE:</strong> 1) Report shall not be reproduced except in full without approval of the laboratory.<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2) The results relate only to the items sampled / tested as received.<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;3) Duplicate report will be issued on chargeable basis.
      </div>

      {/* ── SIGNATURES ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <tbody>
          <tr>
            <td style={{ width: '35%', fontSize: '11px' }}>
              {microReport && <><div>Reviewed By (Micro)</div><div style={{ fontWeight: 700 }}>{microAnalyst}</div><div>Analyst</div></>}
              {chemicalReport && <><div style={{ marginTop: '8px' }}>Reviewed By (Chemical)</div><div style={{ fontWeight: 700 }}>{chemicalAnalyst}</div><div>Analyst</div></>}
            </td>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '11px', verticalAlign: 'bottom' }}>
              <strong>*End of report*</strong>
            </td>
            <td style={{ width: '35%', textAlign: 'right', fontSize: '11px', verticalAlign: 'bottom' }}>
              <div>Authorised Signatory</div>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>Technical Manager</div>
              <div>Food Testing Laboratory</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// --- Main Export ---
export default function ReportViewer({ report, microReport, chemicalReport, isCombined = false, onBack }) {
  const reportRef = useRef();

  const downloadPDF = () => {
    const element = reportRef.current;
    const filename = isCombined
      ? `Combined_Report_${(microReport || chemicalReport)?.testCode?.split('-')[0] || 'Job'}.pdf`
      : `Report_${report?.testCode}.pdf`;
    html2pdf().from(element).set({
      margin: 8,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <button onClick={onBack} className="btn" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          ← Back
        </button>
        <button onClick={downloadPDF} className="btn btn-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Download size={16} /> Download Official PDF
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
        {isCombined
          ? <CombinedReportContent microReport={microReport} chemicalReport={chemicalReport} forwardedRef={reportRef} />
          : <SingleReportContent report={report} forwardedRef={reportRef} />
        }
      </div>
    </div>
  );
}
