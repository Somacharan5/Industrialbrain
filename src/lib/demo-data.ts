import type { DashboardStats, ComplianceFlag } from '@/types'

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
export const DEMO_STATS: DashboardStats = {
  total_documents: 247,
  total_chunks: 12843,
  total_entities: 3891,
  knowledge_graph_edges: 8247,
  queries_today: 83,
  avg_response_time_ms: 1240,
  compliance_score: 74,
  stale_documents: 23,
  active_flags: 11,
}

// ─── Compliance Flags ──────────────────────────────────────────────────────────
export const DEMO_FLAGS: ComplianceFlag[] = [
  {
    id: 'f1',
    severity: 'critical',
    regulation: 'OISD-118 Clause 6.2.1',
    description: 'Gas detection calibration records for coke oven battery area overdue by 47 days. Last calibration: 12 Feb 2026.',
    equipment_tag: 'GD-301',
    document_id: 'doc-032',
    detected_at: '2026-06-18T09:22:00Z',
    status: 'open',
    recommended_action: 'Immediate calibration of gas detectors GD-301 through GD-308. Halt hot work permits in area until resolved.',
  },
  {
    id: 'f2',
    severity: 'critical',
    regulation: 'Factory Act 1948 S.36 — Pressure Vessels',
    description: 'IBR certificate for steam drum V-102 expired 3 months ago. No renewal record found in document corpus.',
    equipment_tag: 'V-102',
    document_id: 'doc-041',
    detected_at: '2026-06-17T14:10:00Z',
    status: 'open',
    recommended_action: 'Contact Chief Inspector of Factories. Obtain provisional IBR certificate. Do not operate above 50% pressure until renewed.',
  },
  {
    id: 'f3',
    severity: 'major',
    regulation: 'OISD-137 Clause 4.1.3 — Rotating Equipment',
    description: 'Vibration monitoring records for 6 of 12 critical pumps in Area 2 not updated in over 90 days.',
    detected_at: '2026-06-15T11:30:00Z',
    status: 'open',
    recommended_action: 'Conduct immediate vibration survey. Update PdM database. Review PM schedule for quarterly monitoring compliance.',
  },
  {
    id: 'f4',
    severity: 'major',
    regulation: 'PESO Explosives Act — Storage License',
    description: 'Quantity of bulk explosives in magazine M-01 exceeds licensed storage limit by 12% per June inventory record.',
    detected_at: '2026-06-14T08:45:00Z',
    status: 'acknowledged',
    recommended_action: 'Reduce magazine stock below licensed limit. Inform PESO regional office. Review procurement scheduling.',
  },
  {
    id: 'f5',
    severity: 'minor',
    regulation: 'OISD-155 Clause 3.4 — Emergency Eyewash',
    description: '3 eyewash stations in electrical substation area missing from weekly test log for 2 consecutive weeks.',
    detected_at: '2026-06-12T16:20:00Z',
    status: 'open',
    recommended_action: 'Update test log retroactively if stations are functional. Add to daily operator rounds.',
  },
]

// ─── Recent Activity ───────────────────────────────────────────────────────────
export const DEMO_ACTIVITY = [
  { question: 'What is the isolation procedure for P-101 feed pump before maintenance?', mode: 'expert', time: '11:42 AM', citations: 4 },
  { question: 'Run compliance check on coke oven battery area procedures', mode: 'compliance', time: '10:15 AM', citations: 7 },
  { question: 'Analyze root cause of V-302 compressor vibration incident', mode: 'rca', time: '09:30 AM', citations: 5 },
  { question: 'When is PM due for cooling tower CT-01 fan motors?', mode: 'maintenance', time: '09:02 AM', citations: 3 },
  { question: 'What PPE is required for H2S areas above 5 ppm?', mode: 'field', time: '08:45 AM', citations: 2 },
  { question: 'List all OISD violations detected in the last compliance scan', mode: 'compliance', time: 'Yesterday', citations: 11 },
]

// ─── Demo Document Chunks for RAG ─────────────────────────────────────────────
// Realistic industrial content used when VITE_DEMO_MODE=true
export const DEMO_CHUNKS = [
  {
    id: 'c1',
    content: `ISOLATION PROCEDURE — FEED PUMP P-101
Document: SOP-MAINT-047 Rev 3 | Area: Feedstock Processing | Approved: 12 Jan 2026

1. SCOPE: This procedure applies to isolation of Feed Pump P-101 for all maintenance activities requiring physical access.

2. PREREQUISITES:
   - Obtain approved Maintenance Work Permit (MWP) from Area Supervisor
   - Notify Control Room Operator and log in Shift Handover Log
   - Confirm standby pump P-101B is operational before trip

3. ISOLATION STEPS:
   Step 1: Close suction valve XV-1001 (manual, fully close, 15 turns CW)
   Step 2: Close discharge valve XV-1002 and note position in log
   Step 3: Close minimum flow recirculation valve XV-1003
   Step 4: Switch P-101 to OFF at MCC panel MCC-2A, breaker CB-17
   Step 5: Apply LOTO lock — Mechanical isolation + Electrical isolation
   Step 6: Bleed pressure via vent XV-1004 to flare header — WAIT for pressure = 0 bar
   Step 7: Drain pump casing via drain DN-101 to closed drain system
   Step 8: Allow 30 min cool-down before physical access

4. HAZARDOUS CONDITIONS:
   ⚠️ Pumped fluid: Crude naphtha (flash point 28°C) — fire risk during venting
   ⚠️ Operating temperature: 145°C — burn risk during cool-down
   ⚠️ H2S present up to 15 ppm — SCBA required above 10 ppm threshold`,
    source: 'SOP-MAINT-047: Feed Pump P-101 Isolation Procedure',
  },
  {
    id: 'c2',
    content: `OISD STANDARD 118 — CLAUSE 6.2: GAS DETECTION SYSTEMS
Ref: OISD-STD-118, Third Revision, 2019

6.2.1 CALIBRATION REQUIREMENTS
All fixed gas detection equipment shall be calibrated at intervals not exceeding:
- Catalytic bead (pellistor) sensors: Every 3 months
- Electrochemical sensors (H2S, CO): Every 3 months
- Infrared sensors: Every 6 months
- Photoionization detectors (PID): Every 3 months

Calibration shall be performed using certified reference gas mixture with certificate of analysis traceable to NPL/BIS standards.

6.2.2 CALIBRATION RECORDS
A calibration register shall be maintained for each detector with:
a) Date of calibration
b) Pre-calibration response reading
c) Post-calibration response reading
d) Identity of certified gas used (batch number)
e) Name and signature of authorized calibrator
f) Next calibration due date

6.2.3 OUT-OF-CALIBRATION ACTION
Any detector found out of calibration or beyond calibration due date shall be:
- Tagged OUT OF SERVICE immediately
- Area treated as if detector is non-functional
- Continuous gas monitoring by portable instrument until fixed detector restored`,
    source: 'OISD-118 Third Revision 2019: Gas Detection Systems',
  },
  {
    id: 'c3',
    content: `MAINTENANCE WORK ORDER — WO-2026-1847
Equipment: Compressor V-302 (3rd Stage)
Type: Corrective Maintenance — Vibration Investigation
Date: 14 April 2026 | Technician: Ramesh Sharma | Supervisor: J. Krishnamurthy

FINDINGS:
Vibration measurement at DE bearing: 12.4 mm/s RMS (alarm limit: 7.1 mm/s, trip: 11.2 mm/s)
Vibration at NDE bearing: 9.2 mm/s RMS
Dominant frequency: 1x RPM (running speed component dominant — indicates imbalance or misalignment)
Thermal scan: NDE bearing temperature 78°C (normal: 50-60°C)

INVESTIGATION:
- Removed coupling guard and inspected coupling: 2 of 6 coupling bolts found loose (30% torque loss)
- Coupling element inspection: Elastomeric element shows wear (estimated 60% remaining life)
- Checked alignment using reverse dial method: Parallel misalignment 0.18mm (limit 0.10mm)

ROOT CAUSE (preliminary): Coupling bolt loosening caused by vibration ingress from upstream knockout drum KD-301 piping resonance, compounded by accumulated misalignment during last overhaul.

CORRECTIVE ACTION TAKEN:
1. Re-torqued all coupling bolts to 95 Nm (per OEM spec)
2. Realigned coupling — parallel misalignment corrected to 0.04mm
3. Replaced elastomeric coupling element (new P/N: ABC-4567-E)
4. Post-correction vibration: 4.2 mm/s RMS — within normal limits`,
    source: 'Work Order WO-2026-1847: Compressor V-302 Vibration Investigation',
  },
  {
    id: 'c4',
    content: `INCIDENT INVESTIGATION REPORT — IIR-2025-014
Incident: Near-Miss — Potential Gas Release, Coke Oven Battery #2
Date: 23 September 2025 | Shift: Night | Reported by: K. Venkatesh, Panel Operator

INCIDENT DESCRIPTION:
At 02:34 hrs, gas pressure sensor PT-1102 in coke oven battery #2 showed sudden pressure rise from 85 mmWC to 142 mmWC (normal operating range: 70-100 mmWC). Simultaneously, H2S detector GD-304 in the area showed 8 ppm (alert level: 10 ppm). Operator K. Venkatesh recognized the co-occurrence as potentially dangerous and initiated battery depressurization. Physical inspection at 03:10 hrs found a leaking expansion joint EJ-12 on the crude benzene piping.

IMMEDIATE CAUSE: Failed expansion joint gasket (PTFE, 2019 vintage) on crude benzene off-take line.

CONTRIBUTING FACTORS:
1. Expansion joint EJ-12 was last inspected 14 months ago (inspection interval specified as 12 months)
2. Night shift had no dedicated local patrol in the battery area between 00:00 and 03:00 hrs
3. No automated cross-correlation alert between pressure exceedance AND gas detection was configured

KEY LEARNING:
The combination of high pressure + gas detection was recognized by an EXPERIENCED operator. A less experienced operator might not have connected these two separate alarms. This co-occurrence pattern should be automated in the SCADA alarm management system.

RECOMMENDATIONS:
R1 (Immediate): Implement compound alarm: if PT-1102 > 110 mmWC AND any GD-3xx > 5 ppm simultaneously, trigger high-priority composite alarm
R2 (30 days): Inspect all 14 expansion joints in the benzene circuit
R3 (90 days): Revise local patrol rounds to cover battery area every 2 hours on all shifts`,
    source: 'Incident Investigation Report IIR-2025-014: Coke Oven Battery Near-Miss',
  },
  {
    id: 'c5',
    content: `EQUIPMENT DATA SHEET — FEED PUMP P-101
Tag: P-101 | Description: Crude Naphtha Feed Pump
Area: Feedstock Processing Unit | P&ID: DW-FPU-003 Rev 5

DESIGN DATA:
Fluid: Crude Naphtha
Capacity: 120 m³/hr
Differential Head: 280 m
Operating Temperature: 145°C (max 160°C)
Operating Pressure: Suction 2.1 barg | Discharge 16.4 barg
Specific Gravity: 0.72
Viscosity: 0.4 cP at operating temperature
NPSH Available: 4.2 m | NPSH Required: 2.8 m

MECHANICAL DATA:
Type: Horizontal Centrifugal, Single Stage, BB2
Manufacturer: Flowserve Corporation
Model: DVMX 150-315
Serial No: FSC-2017-P101
Year of Manufacture: 2017
Casing Material: ASTM A217 WC9 Cr-Mo
Impeller Material: ASTM A743 CF8M
Mechanical Seal: Flowserve SMSN Type II, API Plan 11+52
Driver: 160 kW, 2960 RPM, 415V, TEFC Motor (Kirloskar)

INSPECTION INTERVALS (OISD-137):
Mechanical seal: Every 18 months or at alarm
Bearing inspection: Every 6 months
Impeller/casing inspection: Every 36 months or major overhaul
Last Major Overhaul: March 2024 | Next Due: March 2027

CRITICAL OPERATING LIMITS:
Vibration alarm: 7.1 mm/s RMS
Vibration trip: 11.2 mm/s RMS
Bearing temp alarm: 75°C | Trip: 85°C
Minimum flow (anti-cavitation): 18 m³/hr`,
    source: 'Equipment Data Sheet: Feed Pump P-101 (EDS-FPU-P101 Rev 2)',
  },
  {
    id: 'c6',
    content: `FACTORY ACT 1948 — SECTION 36: PRESSURE VESSELS
(As amended by Indian Boilers Regulation Act)

36(1): No owner shall use or permit to be used any vessel unless it has been examined and certified as safe by a competent person appointed under this Act, and such examination shall have been made within the period prescribed.

36(2): The certificate referred to in sub-section (1) shall be in the prescribed form and shall specify:
a) The maximum permissible working pressure
b) The date of the last examination
c) The date by which the next examination must be completed
d) Any special conditions of use

IBR (Indian Boiler Regulations) — RENEWAL OF CERTIFICATES:
Section 8: Certificates shall be renewed annually for boilers and pressure vessels operating above 1 kg/cm² pressure.
Section 12: Owners of boilers and pressure vessels shall apply for renewal not less than 30 days before the expiry of the existing certificate.
Section 14: Operation of a boiler or pressure vessel after expiry of its certificate constitutes an offence punishable under Section 92 of the Factories Act, with imprisonment up to 3 months or fine up to Rs 1,00,000 or both.

COMPETENT PERSON: For IBR purposes, a Boiler Inspector authorized by the State Boiler Inspection Department. Certificate renewal requires physical inspection by this officer.`,
    source: 'Factory Act 1948 — Section 36 & IBR Regulations (Government of India)',
  },
  {
    id: 'c7',
    content: `PPE REQUIREMENTS — HYDROGEN SULFIDE (H2S) HAZARDOUS AREAS
Document: SAFETY-PPE-002 Rev 4 | Approved by: VP Safety

H2S EXPOSURE LIMITS (as per ACGIH / MoEF&CC):
- 1 ppm: Odor threshold (rotten egg smell)
- 5 ppm: Short Term Exposure Limit (STEL) — 15 min maximum
- 10 ppm: ALERT level — Additional precautions required
- 50 ppm: IDLH level — Immediately Dangerous to Life and Health
- 100 ppm+: Rapid loss of consciousness — fatal within minutes

PPE REQUIREMENTS BY H2S CONCENTRATION:
0-5 ppm (Routine area entry):
- Standard coveralls, safety shoes, hard hat
- Calibrated personal H2S monitor (mandatory carry)

5-10 ppm (Controlled entry):
- Above plus: Full face respirator with H2S cartridge (3M 6800 or equivalent)
- Buddy system: Minimum 2 persons, radio contact
- Entry log with time in/out

10-50 ppm (Permit Required):
- Supplied Air Breathing Apparatus (SABA) or SCBA only
- Full chemical splash suit if liquid H2S present
- Trained standby rescuer with SCBA at entry point
- Continuous air monitoring every 15 minutes

Above 50 ppm (Evacuation Zone):
- No entry without full SCBA (30-min minimum capacity)
- Rescue team with 60-min SCBA on standby
- Plant emergency team notified before entry`,
    source: 'SAFETY-PPE-002: H2S Hazardous Area Personal Protective Equipment Requirements',
  },
  {
    id: 'c8',
    content: `PREDICTIVE MAINTENANCE RECORD — COOLING TOWER CT-01 FAN MOTORS
Equipment: CT-01 Fans F-1 through F-6 | Location: Cooling Water System
Condition Monitoring Period: Jan 2025 — Jun 2026

VIBRATION TREND SUMMARY (Latest readings, May 2026):
F-1 Motor: 3.2 mm/s (GOOD) — Last checked 12 May 2026
F-2 Motor: 6.8 mm/s (ALARM) — Rising trend since March — recommend bearing inspection
F-3 Motor: 2.9 mm/s (GOOD)
F-4 Motor: 4.1 mm/s (SATISFACTORY)
F-5 Motor: 8.9 mm/s (DANGER) — Trip limit 9.5 mm/s — URGENT bearing replacement required
F-6 Motor: 3.7 mm/s (GOOD)

THERMAL IMAGING (April 2026):
F-5 Motor NDE bearing: 92°C (HOT SPOT detected)
F-2 Motor DE bearing: 68°C (WARM — monitor)

MAINTENANCE HISTORY F-5:
- Oct 2024: Bearing replaced (NDE) — Bearings: SKF 6314 C3
- Feb 2025: Routine PM — greasing performed
- May 2025: Vibration noted rising (5.2 mm/s) — increased monitoring frequency
- Feb 2026: 8.1 mm/s — Replacement recommended in next planned shutdown

RECOMMENDATION:
F-5 bearing has entered failure zone. At current vibration growth rate (trending +0.3 mm/s/month), estimated 2-4 weeks to trip threshold. Schedule bearing replacement in next available maintenance window. Do not defer beyond 15 July 2026.`,
    source: 'PM Record: Cooling Tower CT-01 Fan Motors (PM-CT01-2026)',
  },
]

// ─── Demo Knowledge Graph Nodes & Edges ───────────────────────────────────────
export const DEMO_GRAPH_NODES = [
  { id: 'eq:p101', label: 'P-101', node_type: 'equipment', properties: { type: 'Feed Pump', area: 'FPU', status: 'operational' } },
  { id: 'eq:v302', label: 'V-302', node_type: 'equipment', properties: { type: 'Compressor', area: 'Compression', status: 'operational' } },
  { id: 'eq:ct01', label: 'CT-01', node_type: 'equipment', properties: { type: 'Cooling Tower', area: 'Utilities', status: 'watch' } },
  { id: 'eq:gd304', label: 'GD-304', node_type: 'equipment', properties: { type: 'Gas Detector', area: 'Coke Oven', status: 'overdue' }, risk_level: 'critical' },
  { id: 'eq:v102', label: 'V-102', node_type: 'equipment', properties: { type: 'Steam Drum', status: 'operational' }, risk_level: 'critical' },
  { id: 'reg:oisd118', label: 'OISD-118', node_type: 'regulation', properties: { type: 'OISD Standard', topic: 'Gas Detection' } },
  { id: 'reg:oisd137', label: 'OISD-137', node_type: 'regulation', properties: { type: 'OISD Standard', topic: 'Rotating Equipment' } },
  { id: 'reg:factory36', label: 'Factory Act S.36', node_type: 'regulation', properties: { topic: 'Pressure Vessels' } },
  { id: 'proc:sop047', label: 'SOP-MAINT-047', node_type: 'procedure', properties: { title: 'P-101 Isolation Procedure' } },
  { id: 'chem:h2s', label: 'H2S', node_type: 'chemical', properties: { type: 'Hazardous Gas', idlh: '50 ppm' } },
  { id: 'chem:naphtha', label: 'Naphtha', node_type: 'chemical', properties: { type: 'Flammable Liquid', flashpoint: '28°C' } },
  { id: 'inc:iir014', label: 'IIR-2025-014', node_type: 'incident', properties: { type: 'Near-Miss', area: 'Coke Oven' }, risk_level: 'high' },
  { id: 'loc:cokeoven', label: 'Coke Oven Battery', node_type: 'location', properties: {} },
  { id: 'loc:fpu', label: 'Feedstock Processing', node_type: 'location', properties: {} },
]

export const DEMO_GRAPH_EDGES = [
  { id: 'e1', source_id: 'eq:p101', target_id: 'proc:sop047', relationship: 'REQUIRES', weight: 1 },
  { id: 'e2', source_id: 'eq:p101', target_id: 'chem:naphtha', relationship: 'HANDLES', weight: 1 },
  { id: 'e3', source_id: 'eq:p101', target_id: 'reg:oisd137', relationship: 'GOVERNED_BY', weight: 1 },
  { id: 'e4', source_id: 'eq:p101', target_id: 'loc:fpu', relationship: 'LOCATED_IN', weight: 1 },
  { id: 'e5', source_id: 'eq:gd304', target_id: 'reg:oisd118', relationship: 'GOVERNED_BY', weight: 1 },
  { id: 'e6', source_id: 'eq:gd304', target_id: 'loc:cokeoven', relationship: 'LOCATED_IN', weight: 1 },
  { id: 'e7', source_id: 'eq:gd304', target_id: 'inc:iir014', relationship: 'INVOLVED_IN', weight: 1 },
  { id: 'e8', source_id: 'inc:iir014', target_id: 'loc:cokeoven', relationship: 'OCCURRED_AT', weight: 1 },
  { id: 'e9', source_id: 'inc:iir014', target_id: 'chem:h2s', relationship: 'INVOLVED', weight: 1 },
  { id: 'e10', source_id: 'eq:v302', target_id: 'reg:oisd137', relationship: 'GOVERNED_BY', weight: 1 },
  { id: 'e11', source_id: 'eq:v102', target_id: 'reg:factory36', relationship: 'GOVERNED_BY', weight: 1 },
  { id: 'e12', source_id: 'loc:cokeoven', target_id: 'chem:h2s', relationship: 'CONTAINS_HAZARD', weight: 1 },
  { id: 'e13', source_id: 'eq:ct01', target_id: 'reg:oisd137', relationship: 'GOVERNED_BY', weight: 1 },
]

// ─── Demo RCA Result ───────────────────────────────────────────────────────────
export const DEMO_RCA = {
  equipment_tag: 'V-302',
  problem_statement: 'Recurring high vibration on 3rd stage compressor V-302 causing unplanned shutdowns',
  timeline: [
    { timestamp: '2025-10-15T00:00:00Z', event: 'First vibration alarm (7.8 mm/s) at V-302 DE bearing. Reset by operator.', source_doc: 'Shift Log Oct 2025' },
    { timestamp: '2025-12-03T00:00:00Z', event: 'Second vibration alarm (8.9 mm/s). Maintenance inspection: coupling bolts re-torqued.', source_doc: 'WO-2025-2201' },
    { timestamp: '2026-02-17T00:00:00Z', event: 'Vibration trip (11.5 mm/s). Unplanned shutdown — 14 hours downtime.', source_doc: 'Shift Log Feb 2026' },
    { timestamp: '2026-04-14T00:00:00Z', event: 'Third vibration alarm (12.4 mm/s). Investigation finds misalignment + worn coupling.', source_doc: 'WO-2026-1847' },
  ],
  root_causes: [
    {
      category: 'equipment',
      description: 'Elastomeric coupling element degradation allowing torsional vibration transmission to compressor shaft',
      confidence: 0.88,
      evidence: ['Coupling element at 60% remaining life at April 2026 inspection', 'Dominant 1x RPM frequency signature consistent with imbalance/coupling issue'],
    },
    {
      category: 'process',
      description: 'Upstream KD-301 knockout drum piping resonance amplifying vibration at compressor coupling frequency',
      confidence: 0.72,
      evidence: ['IIR-2025-014 notes piping resonance as contributing factor', 'Vibration onset correlates with high throughput periods'],
    },
    {
      category: 'organizational',
      description: 'Coupling element replacement deferred past OEM-recommended 18-month interval due to production pressure',
      confidence: 0.81,
      evidence: ['Last coupling element replaced March 2024 (26 months prior)', 'OEM manual specifies 18-month maximum service interval'],
    },
  ],
  contributing_factors: [
    'Vibration monitoring interval of 3 months insufficient for early trend detection',
    'No cross-alarm logic to flag rising vibration trend before trip threshold',
    'Post-overhaul alignment not verified with laser alignment tool (reverse dial method used instead)',
  ],
  recommendations: [
    { priority: 'immediate', action: 'Implement monthly vibration trending for V-302 and all critical compressors', regulation_reference: 'OISD-137 Clause 4.1.3' },
    { priority: 'immediate', action: 'Replace coupling element with OEM-specified elastomeric insert', regulation_reference: '' },
    { priority: 'short_term', action: 'Commission laser alignment verification after every major overhaul', regulation_reference: 'API 686 Chapter 6' },
    { priority: 'short_term', action: 'Configure compound vibration trend alarm: alert at 70% trip threshold', regulation_reference: '' },
    { priority: 'long_term', action: 'Conduct piping stress analysis on KD-301 suction piping to identify resonance frequencies', regulation_reference: 'ASME B31.3' },
  ],
  similar_incidents: [
    { date: '2024-07-20', description: 'P-201 pump bearing failure due to misalignment following seal replacement', equipment: 'P-201', lesson_learned: 'Post-maintenance alignment verification mandatory for all rotating equipment above 75 kW' },
    { date: '2023-11-08', description: 'CT-01 F-5 fan motor bearing failure — deferred replacement', equipment: 'CT-01-F5', lesson_learned: 'PdM recommendations must have mandatory action window, not advisory status' },
  ],
  generated_at: new Date().toISOString(),
}
