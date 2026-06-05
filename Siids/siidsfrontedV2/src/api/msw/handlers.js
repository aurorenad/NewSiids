import { http, HttpResponse } from 'msw';

// In-Memory Mock Databases for reactive state simulation
let mockGoods = [
  {
    id: 1001,
    goodsDescription: 'Toyota Hilux 2018 (White)',
    goodsType: 'VEHICLE',
    location: 'Gikondo Warehouse',
    seizedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    status: 'SEIZED',
    pvNumber: null,
    ownerName: 'Emmanuel Ntaganda',
    ownerPhone: '+250788123456',
    daysInStock: 5,
    ownerOtpSkipped: false
  },
  {
    id: 1002,
    goodsDescription: 'Samsung Electronics Cargo Batch (150 Boxes)',
    goodsType: 'ELECTRONICS',
    location: 'Rubavu Port Office',
    seizedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    status: 'MAIN_STOCK',
    pvNumber: 'PV-2026-9941',
    ownerName: 'Unknown',
    ownerPhone: null,
    daysInStock: 8,
    ownerOtpSkipped: true
  },
  {
    id: 1003,
    goodsDescription: 'Textiles and Cotton Rolls (Imported)',
    goodsType: 'TEXTILE',
    location: 'Kigali Main Depository',
    seizedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'RELEASE_REQUEST_PENDING',
    pvNumber: 'PV-2026-9948',
    ownerName: 'Aline Mutoni Ltd',
    ownerPhone: '+250785987654',
    daysInStock: 12,
    ownerOtpSkipped: false,
    releaseDetails: {
      auctionEstimate: 4500000.00,
      proposedAuctionDate: '2026-06-15',
      buyerCategory: 'REGISTERED_RECYCLER',
      smNotes: 'Ready for disposal approval.'
    }
  },
  {
    id: 1004,
    goodsDescription: 'Premium Whiskey Cases (20 Boxes)',
    goodsType: 'ALCOHOL',
    location: 'Gikondo Warehouse',
    seizedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'RETURNED',
    pvNumber: 'PV-2026-9950',
    ownerName: 'John Doe Importations',
    ownerPhone: '+250789000111',
    daysInStock: 3,
    ownerOtpSkipped: false,
    returnDetails: {
      reasonType: 'DOCUMENT_MISMATCH',
      conflictFields: ['goodsDescription', 'location'],
      description: 'Mismatched volume counts on PV form vs seizure note.'
    }
  }
];

let mockReports = [
  {
    id: 201,
    title: 'Smuggling Activity Report - Rubavu Border',
    subject: 'Illegal trade patterns of high-value electronics',
    body: 'Surveillance logs indicate consistent night transit breaches bypassing custom scanners.',
    status: 'PENDING_AC_SIGNATURE',
    generationType: 'MANUAL',
    createdByName: 'Jean Paul - Intelligence Officer',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [],
    revisions: []
  },
  {
    id: 202,
    title: 'Auto-Generated Case Findings Summary - RRA-INTEL-2026-0041',
    subject: 'Automated report compilation for case investigation reference RRA-INTEL-2026-0041',
    body: 'Automated compile: Findings extracted from case plans and evidence attachments. Attached items consist strictly of verified evidence tags.',
    status: 'PENDING_DIRECTOR_SIGNATURE',
    generationType: 'AUTO_GENERATED',
    createdByName: 'SIIDS Document Engine',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [
      { id: 50, signedBy: 'Assistant Commissioner - Enforcement', role: 'AC', signedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() }
    ],
    revisions: [],
    caseId: 'RRA-INTEL-2026-0041',
    caseNum: 'RRA-INTEL-2026-0041'
  },
  {
    id: 203,
    title: 'Finalised Customs Transit Verification Report',
    subject: 'Verification of transit papers for vehicle serial VN-984218',
    body: 'All files are reviewed. Documents matching rules. Verified by AC and Director of Intelligence.',
    status: 'FINALISED',
    generationType: 'MANUAL',
    createdByName: 'Aime - Intelligence Officer',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [
      { id: 48, signedBy: 'Assistant Commissioner - Enforcement', role: 'AC', signedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 49, signedBy: 'Director of Intelligence', role: 'DIRECTOR_OF_INTELLIGENCE', signedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    revisions: []
  },
  {
    id: 301,
    title: 'Case Plan: Construction Materials Fraud',
    subject: 'Investigation Scope and Strategy for RRA-INV-2026-0052',
    body: 'OBJECTIVE: Investigate the systematic under-declaration of imported steel rebars.\n\nSCOPE: Full audit of imports over the last 12 months for 3 construction companies.\n\nACTIVITIES:\n1. Subpoena customs declarations and cross-reference with supplier invoices.\n2. Conduct physical stock counts at primary warehouses.\n3. Interview procurement managers.',
    status: 'CASE_PLAN_SUBMITTED',
    generationType: 'MANUAL',
    createdByName: 'Insp. S. Musoni',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [],
    revisions: [],
    caseId: 'RRA-INV-2026-0052',
    caseNum: 'RRA-INV-2026-0052'
  },
  {
    id: 302,
    title: 'Final Investigation Report: Textile Smuggling Ring',
    subject: 'Complete investigation findings for RRA-INV-2026-0050',
    body: '1. EXECUTIVE SUMMARY\nWe executed a covert field operation tracking 4 trucks bypassing the primary eastern border post.\n\n2. FINDINGS\nStockpiles of undeclared textiles were discovered in warehouse B4.\n\n3. RECOMMENDATIONS\nImmediate seizure of assets and referral to prosecution.',
    status: 'REPORT_SUBMITTED',
    generationType: 'MANUAL',
    createdByName: 'Insp. R. Uwera',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [],
    revisions: [],
    caseId: 'RRA-INV-2026-0050',
    caseNum: 'RRA-INV-2026-0050'
  },
  {
    id: 204,
    title: 'Initial Case Plan: Counterfeit Pharma',
    subject: 'Plan for field surveillance of warehouse',
    body: '1. Identify warehouse\n2. Monitor traffic\n3. Execute raid',
    status: 'RETURNED_FOR_CORRECTION',
    generationType: 'MANUAL',
    createdByName: 'Maj. Gakwaya',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [],
    revisions: [],
    caseId: 'RRA-INV-2026-0053',
    caseNum: 'RRA-INV-2026-0053'
  },
  {
    id: 205,
    title: 'Final Investigation Report: Illegal Mining',
    subject: 'Complete investigation findings for RRA-INV-2026-0054',
    body: '1. EXECUTIVE SUMMARY\nConfirmed illegal extraction in Sector 4.\n\n2. FINDINGS\nEquipment seized, 3 individuals detained.\n\n3. RECOMMENDATIONS\nRefer to prosecution.',
    status: 'PENDING_AC_SIGNATURE',
    generationType: 'MANUAL',
    createdByName: 'Insp. R. Uwera',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    signatures: [
      { id: 51, signedBy: 'Director of Investigation', role: 'DIRECTOR_OF_INVESTIGATION', signedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() }
    ],
    revisions: [],
    caseId: 'RRA-INV-2026-0054',
    caseNum: 'RRA-INV-2026-0054'
  }
];

let mockCases = [
  {
    id: 'RRA-INTEL-2026-0041',
    subject: 'Cross-Border Electronics Infraction',
    description: 'Intercepted cargo containing unregistered semiconductor boards.',
    status: 'SENT_FROM_AC',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: null,
    assignedTo: null,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0050',
    subject: 'High-Value Textile Smuggling Ring',
    description: 'Requires undercover field agents to verify storage locations.',
    status: 'ASSIGNED_TO_INVESTIGATION_OFFICER',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-uwera',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0051',
    subject: 'Tax Evasion - Shell Corporation Audit',
    description: 'Investigate their tax declarations and bank records.',
    status: 'CASE_PLAN_SUBMITTED',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-gakwaya',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0052',
    subject: 'Construction Materials Fraud Network',
    description: 'Network of construction firms evading duties.',
    status: 'INVESTIGATION_IN_PROGRESS',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-musoni',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0053',
    subject: 'Counterfeit Pharmaceuticals Distribution',
    description: 'Investigation into a distribution network dealing in counterfeit pharmaceuticals.',
    status: 'REPORT_SUBMITTED',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-gakwaya',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0054',
    subject: 'Illegal Mining Operations - Western Province',
    description: 'Extensive investigation concluded on illegal mineral extraction.',
    status: 'REPORT_APPROVED',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-uwera',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0055',
    subject: 'Vehicle Import Undervaluation',
    description: 'Suspiciously low valuations on imported luxury vehicles.',
    status: 'SENT_TO_AC',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-musoni',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'RRA-INV-2026-0056',
    subject: 'Cross-Border Gold Smuggling',
    description: 'Gold smuggling syndicate operating at airport.',
    status: 'AC_RETURNED',
    routedTo: 'DIRECTOR_OF_INVESTIGATION',
    departmentName: 'Investigation Division',
    assignedTo: 'inv-uwera',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  }
];

let mockDelegations = [];
let mockNotifications = [];

let mockUsers = [
  { id: 1, username: 'admin', role: 'Admin', active: true },
  { id: 2, username: 'surveillance', role: 'SURVEILLANCE_OFFICER', active: true },
  { id: 3, username: 'manager', role: 'STOCK_MANAGER', active: true },
  { id: 4, username: 'prso', role: 'PRSO', active: true },
  { id: 5, username: 'deputy', role: 'DEPUTY_PRSO', active: true },
  { id: 6, username: 'ac', role: 'ASSISTANT_COMMISSIONER', active: true },
  { id: 7, username: 'director', role: 'DIRECTOR_OF_INTELLIGENCE', active: true },
  { id: 8, username: 'intel', role: 'INTELLIGENCE_OFFICER', active: true },
  { id: 9, username: 'inv-director', role: 'DIRECTOR_OF_INVESTIGATION', active: true },
  { id: 10, username: 'inv-officer', role: 'INVESTIGATION_OFFICER', active: true }
];

// Helper response wrap builder
const wrapResponse = (data, error = null) => ({
  success: error === null,
  timestamp: new Date().toISOString(),
  data,
  error
});

export const handlers = [
  // Forgot & Reset Password Mock Intercepts
  http.post('/api/v1/auth/forgot-password', async ({ request }) => {
    const { username, email } = await request.json();
    return HttpResponse.json(wrapResponse({
      message: `Password reset OTP successfully sent to registered email for ${username}`
    }));
  }),

  http.post('/api/v1/auth/reset-password', async ({ request }) => {
    const { username, password } = await request.json();
    return HttpResponse.json(wrapResponse({
      message: `Password successfully updated for user ${username}`
    }));
  }),

  // 1. Auth Login Mock
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { username, password } = await request.json();
    
    // Look up username in mockUsers list or match by sub-string
    const foundUser = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    let role = 'SURVEILLANCE_OFFICER';
    let name = 'Olivier Nsengimana';
    
    if (foundUser) {
      role = foundUser.role;
    } else if (username.includes('admin')) {
      role = 'Admin';
    } else if (username.includes('manager')) {
      role = 'STOCK_MANAGER';
    } else if (username.includes('deputy')) {
      role = 'DEPUTY_PRSO';
    } else if (username.includes('prso')) {
      role = 'PRSO';
    } else if (username.includes('ac')) {
      role = 'ASSISTANT_COMMISSIONER';
    } else if (username.includes('inv-director')) {
      role = 'DIRECTOR_OF_INVESTIGATION';
    } else if (username.includes('inv-officer')) {
      role = 'INVESTIGATION_OFFICER';
    } else if (username.includes('director')) {
      role = 'DIRECTOR_OF_INTELLIGENCE';
    } else if (username.includes('intel')) {
      role = 'INTELLIGENCE_OFFICER';
    }

    if (role === 'Admin') {
      name = 'System Administrator';
    } else if (role === 'STOCK_MANAGER') {
      name = 'Claver Gatete';
    } else if (role === 'DEPUTY_PRSO') {
      name = 'Fidelis Karangwa';
    } else if (role === 'PRSO') {
      name = 'Richard Tusabe';
    } else if (role === 'ASSISTANT_COMMISSIONER') {
      name = 'AC Ronald Niwenshuti';
    } else if (role === 'DIRECTOR_OF_INVESTIGATION') {
      name = 'Director of Investigation Jean de Dieu';
    } else if (role === 'INVESTIGATION_OFFICER') {
      name = 'Investigation Officer Alphonse';
    } else if (role === 'DIRECTOR_OF_INTELLIGENCE') {
      name = 'Director Christian Mugunga';
    } else if (role === 'INTELLIGENCE_OFFICER') {
      name = 'Eric Gatera';
    }

    return HttpResponse.json(wrapResponse({
      token: `mock_jwt_token_${role}_xyz`,
      user: {
        username,
        name,
        role,
        department: 'Intelligence & Enforcement Division'
      }
    }));
  }),

  // 2. OTP Mocks
  http.post('/api/v1/otp/send', async ({ request }) => {
    const { phoneNumber, context } = await request.json();
    return HttpResponse.json(wrapResponse({
      message: `SMS OTP successfully dispatched to ${phoneNumber} under context ${context}`
    }));
  }),

  http.post('/api/v1/otp/verify', async ({ request }) => {
    const { phoneNumber, context, code } = await request.json();
    if (code === '123456') {
      return HttpResponse.json(wrapResponse({
        verified: true,
        verificationToken: `otp_token_${Math.random().toString(36).substring(2, 10)}`
      }));
    } else {
      return HttpResponse.json(wrapResponse(null, {
        code: 'INVALID_OTP',
        message: 'The verification code entered is invalid or has expired.',
        details: []
      }), { status: 400 });
    }
  }),

  // 3. Stock List & Actions (including both legacy and new aligned RRA routes)
  http.get('/api/v1/stock/goods', () => {
    return HttpResponse.json(wrapResponse(mockGoods));
  }),

  http.get('/api/v1/stock/goods/temporary', () => {
    const tempStock = mockGoods.filter(g => 
      g.status === 'SEIZED' || 
      g.status === 'OTP_VERIFICATION_PENDING' || 
      g.status === 'DRAFT' || 
      g.status === 'RETURNED'
    );
    return HttpResponse.json(wrapResponse(tempStock));
  }),

  http.get('/api/v1/stock/goods/main', () => {
    const mainStock = mockGoods.filter(g => 
      g.status === 'MAIN_STOCK' || 
      g.status === 'RELEASE_REQUEST_PENDING' || 
      g.status === 'RELEASE_APPROVED' || 
      g.status === 'EXCEPTION'
    );
    return HttpResponse.json(wrapResponse(mainStock));
  }),

  http.post('/api/v1/stock/seizure-notes', async ({ request }) => {
    const data = await request.json();
    const newNote = {
      id: mockGoods.length + 1001,
      goodsDescription: data.goodsDescription,
      goodsType: data.goodsType,
      location: data.location,
      seizedAt: new Date().toISOString(),
      status: 'SEIZED',
      pvNumber: null,
      ownerName: data.ownerName || 'Unknown',
      ownerPhone: data.ownerPhone || null,
      daysInStock: 1,
      ownerOtpSkipped: data.ownerOtpSkipped || false
    };
    mockGoods.push(newNote);
    return HttpResponse.json(wrapResponse(newNote));
  }),

  http.post('/api/v1/stock/goods/temporary/seizure-notes', async ({ request }) => {
    const data = await request.json();
    const newNote = {
      id: mockGoods.length + 1001,
      goodsDescription: data.goodsDescription,
      goodsType: data.goodsType,
      location: data.location,
      seizedAt: new Date().toISOString(),
      status: data.ownerOtpSkipped ? 'SEIZED' : 'OTP_VERIFICATION_PENDING',
      pvNumber: null,
      ownerName: data.ownerName || 'Unknown',
      ownerPhone: data.ownerPhone || null,
      daysInStock: 1,
      ownerOtpSkipped: data.ownerOtpSkipped || false
    };
    mockGoods.push(newNote);
    return HttpResponse.json(wrapResponse(newNote));
  }),

  http.post('/api/v1/stock/goods/temporary/:id/release', async ({ params, request }) => {
    const { id } = params;
    const { fineAmount, penaltyAmount } = await request.json();
    const goodsItem = mockGoods.find(g => g.id === parseInt(id));
    if (!goodsItem) {
      return HttpResponse.json(wrapResponse(null, { code: 'GOODS_NOT_FOUND', message: 'Item not found.' }), { status: 404 });
    }
    goodsItem.status = 'RETURNED';
    goodsItem.fines = { fineAmount, penaltyAmount, releasedAt: new Date().toISOString() };
    return HttpResponse.json(wrapResponse(goodsItem));
  }),

  http.post('/api/v1/stock/goods/temporary/:id/escalate', async ({ params }) => {
    const { id } = params;
    const goodsItem = mockGoods.find(g => g.id === parseInt(id));
    if (!goodsItem) {
      return HttpResponse.json(wrapResponse(null, { code: 'GOODS_NOT_FOUND', message: 'Item not found.' }), { status: 404 });
    }
    goodsItem.status = 'MAIN_STOCK';
    goodsItem.pvNumber = `PV-2026-${Math.floor(Math.random() * 9000) + 1000}`;
    return HttpResponse.json(wrapResponse(goodsItem));
  }),

  http.post('/api/v1/stock/release-notes', async ({ request }) => {
    const data = await request.json();
    const goodsItem = mockGoods.find(g => g.id === data.goodsId);
    if (!goodsItem) {
      return HttpResponse.json(wrapResponse(null, {
        code: 'GOODS_NOT_FOUND',
        message: 'Inventory reference not found.'
      }), { status: 404 });
    }
    goodsItem.status = 'RELEASE_REQUEST_PENDING';
    goodsItem.releaseDetails = {
      auctionEstimate: parseFloat(data.auctionEstimate),
      proposedAuctionDate: data.proposedAuctionDate,
      buyerCategory: data.buyerCategory,
      smNotes: data.smNotes
    };
    return HttpResponse.json(wrapResponse(goodsItem));
  }),

  http.post('/api/v1/stock/goods/:id/approve-release', async ({ params }) => {
    const { id } = params;
    const goodsItem = mockGoods.find(g => g.id === parseInt(id));
    if (!goodsItem) {
      return HttpResponse.json(wrapResponse(null, { code: 'GOODS_NOT_FOUND', message: 'Item not found.' }), { status: 404 });
    }
    goodsItem.status = 'RELEASE_APPROVED';
    return HttpResponse.json(wrapResponse(goodsItem));
  }),

  http.patch('/api/v1/stock/goods/:id/deputy-send-back', async ({ params, request }) => {
    const { id } = params;
    const { reason } = await request.json();
    const goodsItem = mockGoods.find(g => g.id === parseInt(id));
    if (!goodsItem) {
      return HttpResponse.json(wrapResponse(null, { code: 'GOODS_NOT_FOUND', message: 'Item not found.' }), { status: 404 });
    }
    goodsItem.status = 'SEIZED'; // Back to Temporary Stock
    goodsItem.returnDetails = {
      reasonType: 'DEPUTY_SEND_BACK',
      description: reason
    };
    return HttpResponse.json(wrapResponse(goodsItem));
  }),

  http.patch('/api/v1/stock/goods/:id/exception-case', async ({ params, request }) => {
    const { id } = params;
    const { reason } = await request.json();
    const goodsItem = mockGoods.find(g => g.id === parseInt(id));
    if (!goodsItem) {
      return HttpResponse.json(wrapResponse(null, { code: 'GOODS_NOT_FOUND', message: 'Item not found.' }), { status: 404 });
    }
    goodsItem.status = 'EXCEPTION';
    goodsItem.exceptionDetails = {
      reason,
      createdAt: new Date().toISOString()
    };
    return HttpResponse.json(wrapResponse(goodsItem));
  }),

  // 4. Case Routing Mock
  http.patch('/api/v1/cases/:id/route', async ({ params, request }) => {
    const { id } = params;
    const { routedTo, departmentName, assignedPersonnel } = await request.json();
    const activeCase = mockCases.find(c => c.id === id);
    if (!activeCase) {
      return HttpResponse.json(wrapResponse(null, { code: 'CASE_NOT_FOUND', message: 'Case file not found.' }), { status: 404 });
    }
    activeCase.routedTo = routedTo;
    activeCase.departmentName = departmentName || null;
    activeCase.assignedPersonnel = assignedPersonnel || null;
    activeCase.status = 'ROUTED';

    // Also update associated report
    const associatedReport = mockReports.find(r => r.caseId === id);
    if (associatedReport) {
      associatedReport.status = 'ROUTED';
    }

    return HttpResponse.json(wrapResponse(activeCase));
  }),

  http.get('/api/v1/cases', () => {
    return HttpResponse.json(wrapResponse(mockCases));
  }),

  http.post('/api/v1/cases', async ({ request }) => {
    const data = await request.json();
    const newCaseId = `RRA-INTEL-2026-00${mockCases.length + 42}`;
    const newCase = {
      id: newCaseId,
      caseNum: newCaseId,
      taxPayer: {
        taxPayerTIN: data.tin,
        taxPayerName: data.taxPayerName || 'Unknown Taxpayer',
        taxPayerAddress: data.taxPayerAddress || 'Unknown Address'
      },
      taxPeriod: data.taxPeriod || '2026-Q1',
      taxType: data.taxType || 'None',
      status: 'ASSIGNED',
      createdByName: 'Eric Gatera - Intelligence Officer',
      summaryOfInformationCase: data.summaryOfInformationCase || '',
      createdAt: new Date().toISOString(),
      referringDepartment: data.referringDepartment || 'Strategic Intelligence Division',
      reportId: null,
      routedTo: null,
      departmentName: null
    };
    mockCases.push(newCase);
    return HttpResponse.json(wrapResponse(newCase));
  }),

  http.patch('/api/v1/cases/:id/assign', async ({ params, request }) => {
    const { id } = params;
    const { assignedTo } = await request.json();
    const activeCase = mockCases.find(c => c.id === id);
    if (!activeCase) {
      return HttpResponse.json(wrapResponse(null, { code: 'CASE_NOT_FOUND', message: 'Case not found.' }), { status: 404 });
    }
    activeCase.assignedTo = assignedTo;
    activeCase.status = 'ASSIGNED_TO_INVESTIGATION_OFFICER';
    return HttpResponse.json(wrapResponse(activeCase));
  }),

  http.post('/api/v1/reports/:caseId/generate', async ({ params }) => {
    const { caseId } = params;
    const activeCase = mockCases.find(c => c.id === caseId);
    if (!activeCase) {
      return HttpResponse.json(wrapResponse(null, { code: 'CASE_NOT_FOUND', message: 'Case not found.' }), { status: 404 });
    }

    const generatedReport = {
      id: mockReports.length + 201,
      title: `Final Investigation Report - ${activeCase.id}`,
      subject: `Automated investigation compilation for ${activeCase.subject}`,
      body: `SUMMARY: ${activeCase.description || 'No case overview notes.'}\n\nFINDINGS: Prior investigations show semiconductor boards smuggled across the Rubavu Border bypass customs scanners.\n\nCONCLUSION: Evidence indicates direct customs declaration evasion. Recommend immediate asset enforcement.`,
      status: 'PENDING_DIRECTOR_SIGNATURE',
      generationType: 'AUTO_GENERATED',
      createdByName: 'SIIDS Document Engine',
      createdAt: new Date().toISOString(),
      signatures: [],
      revisions: [],
      caseId: activeCase.id
    };

    mockReports.push(generatedReport);
    activeCase.status = 'INVESTIGATION_COMPLETED';
    return HttpResponse.json(wrapResponse(generatedReport));
  }),

  // 5. Intelligence Reports Mock
  http.get('/api/v1/reports', ({ request }) => {
    const url = new URL(request.url);
    const generationType = url.searchParams.get('generationType');
    
    if (generationType) {
      return HttpResponse.json(wrapResponse(mockReports.filter(r => r.generationType === generationType)));
    }
    return HttpResponse.json(wrapResponse(mockReports));
  }),

  http.post('/api/v1/reports', async ({ request }) => {
    console.log('[MSW] Intercepted POST /api/v1/reports');
    const data = await request.json();
    const isCasePlan = data.isCasePlan;
    const newReport = {
      id: mockReports.length + 201,
      title: data.title,
      subject: data.subject,
      body: data.body,
      status: isCasePlan ? 'CASE_PLAN_SUBMITTED' : 'PENDING_DIRECTOR_SIGNATURE',
      generationType: isCasePlan ? 'CASE_PLAN' : 'MANUAL',
      createdByName: 'Investigation Officer',
      createdAt: new Date().toISOString(),
      signatures: [],
      revisions: [],
      caseId: data.caseId,
      caseNum: data.caseId, // For compatibility
      attachments: data.attachments || [] 
    };
    mockReports.push(newReport);

    if (data.caseId) {
      const activeCase = mockCases.find(c => c.id === data.caseId);
      if (activeCase) {
        activeCase.status = isCasePlan ? 'CASE_PLAN_SUBMITTED' : 'REPORT_SUBMITTED';
        activeCase.reportId = newReport.id;
      }
    }

    return HttpResponse.json(wrapResponse(newReport));
  }),

  http.post('/api/v1/reports/:id/sign', async ({ params, request }) => {
    const { id } = params;
    const { signerRole, signerName } = await request.json();
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) {
      return HttpResponse.json(wrapResponse(null, { code: 'REPORT_NOT_FOUND', message: 'Report draft not found.' }), { status: 404 });
    }

    if (report.status === 'FINALISED') {
      return HttpResponse.json(wrapResponse(null, { code: 'REPORT_LOCKED', message: 'Finalised reports cannot be signed.' }), { status: 400 });
    }

    // Add signature record
    report.signatures.push({
      id: Math.floor(Math.random() * 100) + 100,
      signedBy: signerName,
      role: signerRole,
      signedAt: new Date().toISOString()
    });

    // Workflow state resolution logic
    if (signerRole === 'AC') {
      report.status = 'APPROVED';
      mockNotifications.push({ id: Date.now(), message: `Report "${report.title}" was approved by AC and awaits routing.`, severity: 'SUCCESS', actionUrl: '/ac' });
    } else if (signerRole === 'DIRECTOR_OF_INTELLIGENCE') {
      report.status = 'PENDING_AC_SIGNATURE';
      mockNotifications.push({ id: Date.now(), message: `Report "${report.title}" awaits AC signature.`, severity: 'INFO', actionUrl: '/ac' });
    } else if (signerRole === 'DIRECTOR_OF_INVESTIGATION') {
      const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
      if (activeCase && activeCase.status === 'REPORT_APPROVED') {
         activeCase.status = 'SENT_TO_AC';
         report.status = 'PENDING_AC_SIGNATURE';
      } else if (activeCase) {
         activeCase.status = 'REPORT_APPROVED';
         report.status = 'APPROVED';
      }
    }

    return HttpResponse.json(wrapResponse(report));
  }),

  http.put('/api/v1/reports/:id', async ({ params, request }) => {
    const { id } = params;
    const data = await request.json();
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) {
      return HttpResponse.json(wrapResponse(null, { code: 'REPORT_NOT_FOUND', message: 'Report not found.' }), { status: 404 });
    }

    if (report.status === 'FINALISED') {
      return HttpResponse.json(wrapResponse(null, { code: 'REPORT_LOCKED', message: 'Cannot edit finalized reports.' }), { status: 403 });
    }

    // Record revision
    report.revisions.push({
      id: report.revisions.length + 1,
      revisedBy: data.editorName || 'Director of Intelligence',
      revisedAt: new Date().toISOString(),
      revisionContent: {
        title: report.title,
        subject: report.subject,
        body: report.body,
        action: 'MODIFIED',
        reason: data.reason || 'Manual revision of findings narrative.'
      }
    });



    report.title = data.title;
    report.subject = data.subject;
    report.body = data.body;

    if (data.status) {
      report.status = data.status;
      if (data.status === 'PENDING_DIRECTOR_SIGNATURE' || data.status === 'CASE_PLAN_SUBMITTED') {
        const isCasePlan = data.status === 'CASE_PLAN_SUBMITTED' || report.generationType === 'CASE_PLAN';
        mockNotifications.push({ 
          id: Date.now(), 
          message: `${isCasePlan ? 'Case Plan' : 'Report'} "${report.title}" was RESUBMITTED by Investigation Officer.`, 
          severity: 'INFO', 
          actionUrl: '/doi' 
        });

        // Update case status
        const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
        if (activeCase) {
          activeCase.status = isCasePlan ? 'CASE_PLAN_SUBMITTED' : 'REPORT_SUBMITTED';
        }
      }
    }

    return HttpResponse.json(wrapResponse(report));
  }),

  http.post('/api/v1/reports/:id/reject', async ({ params, request }) => {
    const { id } = params;
    const { rejectionReason } = await request.json();
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) {
      return HttpResponse.json(wrapResponse(null, { code: 'REPORT_NOT_FOUND', message: 'Report not found.' }), { status: 404 });
    }
    report.status = 'REJECTED';
    report.rejectionReason = rejectionReason;
    report.signatures = report.signatures.filter(s => s.role !== 'DIRECTOR_OF_INTELLIGENCE');
    report.revisions.push({
      id: report.revisions.length + 1,
      revisedBy: 'Director Christian Mugunga',
      revisedAt: new Date().toISOString(),
      revisionContent: {
        action: 'REJECTED',
        reason: rejectionReason
      }
    });
    // Update case status
    const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
    if (activeCase) {
      activeCase.status = 'REPORT_REJECTED';
    }
    
    mockNotifications.push({ 
      id: Date.now(), 
      message: `Report "${report.title}" was permanently REJECTED. Reason: ${rejectionReason}`, 
      severity: 'DANGER', 
      actionUrl: '/reports' 
    });

    return HttpResponse.json(wrapResponse(report));
  }),

  http.post('/api/v1/reports/:id/return', async ({ params, request }) => {
    const { id } = params;
    const { returnToEmployeeId, returnReason, returnDocumentPath } = await request.json();
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) {
      return HttpResponse.json(wrapResponse(null, { code: 'REPORT_NOT_FOUND', message: 'Report not found.' }), { status: 404 });
    }
    report.status = 'REPORT_RETURNED';
    report.returnReason = returnReason;
    report.returnedToEmployeeId = returnToEmployeeId;
    report.returnDocumentPath = returnDocumentPath || null;
    report.hasReturnDocument = !!returnDocumentPath;
    report.signatures = report.signatures.filter(s => s.role !== 'DIRECTOR_OF_INTELLIGENCE');
    report.revisions.push({
      id: report.revisions.length + 1,
      revisedBy: 'Director Christian Mugunga',
      revisedAt: new Date().toISOString(),
      revisionContent: {
        action: 'RETURNED_TO_OFFICER',
        reason: returnReason,
        returnedTo: returnToEmployeeId,
        hasDocument: !!returnDocumentPath
      }
    });
    // Update case status
    const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
    if (activeCase) {
      activeCase.status = 'REPORT_RETURNED';
    }

    mockNotifications.push({ 
      id: Date.now(), 
      message: `Report "${report.title}" was RETURNED for correction.`, 
      severity: 'WARNING', 
      actionUrl: '/reports' 
    });

    return HttpResponse.json(wrapResponse(report));
  }),

  // 6. Delegations Mock
  http.post('/api/v1/delegations', async ({ request }) => {
    const { granteeId, granteeName, permission } = await request.json();
    const newDelegation = {
      id: mockDelegations.length + 1,
      grantorName: 'PRSO Richard Tusabe',
      granteeId,
      granteeName,
      permission,
      grantedAt: new Date().toISOString(),
      revokedAt: null
    };
    mockDelegations.push(newDelegation);
    return HttpResponse.json(wrapResponse(newDelegation));
  }),

  // Notifications Mock Endpoint
  http.get('/api/v1/notifications', () => {
    // In a real app we'd filter by user role, but for this mock we just return the full log
    return HttpResponse.json(wrapResponse(mockNotifications));
  }),

  // 7. Finance metrics summaries mock
  http.get('/api/v1/finance/summary', () => {
    return HttpResponse.json(wrapResponse({
      finesCollectedRwf: 18450000.00,
      auctionRevenueRwf: 32900000.00,
      temporaryStockCount: mockGoods.filter(g => g.status === 'SEIZED').length,
      mainStockCount: mockGoods.filter(g => g.status === 'MAIN_STOCK').length,
      pendingReleaseCount: mockGoods.filter(g => g.status === 'RELEASE_REQUEST_PENDING').length,
      releasedCount: mockGoods.filter(g => g.status === 'RELEASE_APPROVED' || g.status === 'HANDED_OVER').length
    }));
  }),

  // 8. User Management Mocks
  http.get('/api/v1/users', () => {
    return HttpResponse.json(wrapResponse(mockUsers));
  }),

  http.post('/api/v1/admin/register-user', async ({ request }) => {
    const { username, role } = await request.json();
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return HttpResponse.json(wrapResponse(null, {
        code: 'USER_CONFLICT',
        message: 'A user account for this Employee ID already exists.'
      }), { status: 409 });
    }

    const newUser = {
      id: mockUsers.length + 1,
      username,
      role,
      active: true
    };
    mockUsers.push(newUser);
    return HttpResponse.json(wrapResponse(newUser));
  }),

  http.put('/api/v1/users/:id/deactivate', async ({ params }) => {
    const { id } = params;
    const user = mockUsers.find(u => u.id === parseInt(id));
    if (!user) {
      return HttpResponse.json(wrapResponse(null, {
        code: 'USER_NOT_FOUND',
        message: 'User account not found.'
      }), { status: 404 });
    }
    user.active = !user.active;
    return HttpResponse.json(wrapResponse(user));
  }),

  http.put('/api/v1/users/:id/role', async ({ params, request }) => {
    const { id } = params;
    const { role } = await request.json();
    const user = mockUsers.find(u => u.id === parseInt(id));
    if (!user) {
      return HttpResponse.json(wrapResponse(null, {
        code: 'USER_NOT_FOUND',
        message: 'User account not found.'
      }), { status: 404 });
    }
    user.role = role;
    return HttpResponse.json(wrapResponse(user));
  }),

  // Case Plan specific actions
  http.post('/api/v1/reports/:id/approve-plan', async ({ params }) => {
    const { id } = params;
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) return HttpResponse.json(wrapResponse(null, { code: 'NOT_FOUND', message: 'Report not found' }), { status: 404 });
    report.status = 'APPROVED';
    const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
    if (activeCase) activeCase.status = 'INVESTIGATION_IN_PROGRESS';
    return HttpResponse.json(wrapResponse(report));
  }),

  http.post('/api/v1/reports/:id/reject-plan', async ({ params, request }) => {
    const { id } = params;
    const { reason } = await request.json();
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) return HttpResponse.json(wrapResponse(null, { code: 'NOT_FOUND', message: 'Report not found' }), { status: 404 });
    report.status = 'REJECTED';
    report.rejectionReason = reason;
    const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
    if (activeCase) activeCase.status = 'CASE_PLAN_REJECTED';
    return HttpResponse.json(wrapResponse(report));
  }),

  http.post('/api/v1/reports/:id/return-plan', async ({ params, request }) => {
    const { id } = params;
    const { reason } = await request.json();
    const report = mockReports.find(r => r.id === parseInt(id));
    if (!report) return HttpResponse.json(wrapResponse(null, { code: 'NOT_FOUND', message: 'Report not found' }), { status: 404 });
    report.status = 'CORRECTION_REQUESTED';
    report.returnReason = reason;
    const activeCase = mockCases.find(c => c.reportId === report.id || c.caseNum === report.caseNum || c.id === report.caseId);
    if (activeCase) activeCase.status = 'CASE_PLAN_RETURNED';
    return HttpResponse.json(wrapResponse(report));
  })
];
