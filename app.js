const KEY = 'eceHubDataV3';
const THEME_KEY = 'eceHubTheme';

const AI_FLASHCARD_API = {
  baseURL: 'https://ecehub-backend.onrender.com',
  generateEndpoint: '/api/ai/flashcards/generate'
};

// ============================================================
// EcE Hub Community API
// ============================================================

const COMMUNITY_API_BASE =
  'https://ecehub-community.ecehub-ai-backend.workers.dev';

const COMMUNITY_API = {
  session: `${COMMUNITY_API_BASE}/api/auth/session`,
  profile: `${COMMUNITY_API_BASE}/api/users/me`,
  usernameCheck: `${COMMUNITY_API_BASE}/api/users/check-username`,
  flashcards: `${COMMUNITY_API_BASE}/api/flashcards`,
  workspace: `${COMMUNITY_API_BASE}/api/workspace`
};

window.AIassistant = {
  Available: false
};

const seed = {
  profile: { name: 'Student', course: 'EcE Learner' },
  classes: [],
  folders: [],
  books: [],
  sets: [],
  notes: [],
  quizzes: [],
  activity: []
};

const searchableRoutes = [
  'home',
  'library',
  'explore',
  'sets',
  'flashcards',
  'quizzes',
  'notes'
];

const BUILTIN_FLASHCARDS = [
  {
    id: 'builtin-methods-of-research',
    title: 'Research Basics',
    subject: 'Methods of Research',
    description: 'Fundamental research concepts and terminology.',
    cards: [
      ['What is research?', 'A systematic investigation to establish facts or principles'],
      ['Qualitative research', 'Research that focuses on understanding phenomena through observation and interviews'],
      ['Quantitative research', 'Research that uses numerical data and statistical analysis'],
      ['Experimental research', 'Research involving experiments to test hypotheses'],
      ['Survey research', 'Research using questionnaires to collect data from a population'],
      ['Case study', 'In-depth study of a particular instance or event'],
      ['Research ethics', 'Guidelines for conducting research responsibly and ethically'],
      ['Hypothesis', 'A testable statement predicting the outcome of research'],
      ['Literature review', 'A summary and evaluation of existing research on a topic'],
      ['Sampling', 'Process of selecting a representative group from a population for study'],
      ['Variables', 'Elements or factors that can change or be measured in research'],
      ['Independent variable', 'The factor that is manipulated to observe its effect'],
      ['Dependent variable', 'The factor that is measured to see the effect of changes'],
      ['Control group', 'Group in an experiment not exposed to the independent variable'],
      ['Random sampling', 'Selecting participants randomly to avoid bias'],
      ['Reliability', 'The consistency of a research measurement over time'],
      ['Validity', 'The accuracy of a measurement in reflecting what it is supposed to measure'],
      ['Data analysis', 'The process of organizing and interpreting collected data'],
      ['Research design', 'The overall strategy used to integrate the different components of a study'],
      ['Primary data', 'Data collected directly from first-hand sources'],
      ['Secondary data', 'Data collected from existing sources or research']
    ]
  },

  {
    id: 'builtin-engineering-management',
    title: 'Eng Management',
    subject: 'Engineering Management',
    description: 'Engineering management concepts covering planning, leadership, organizing, and controlling.',
    cards: [
      ['LESSON 5: What is the purpose of planning in engineering management?', 'Planning is the process of setting goals, defining strategies, and establishing action plans to achieve organizational objectives efficiently'],
      ['What are the key types of plans in engineering management?', 'Strategic plans (long-term direction), tactical plans (intermediate goals), and operational plans (day-to-day activities)'],
      ['What is the planning hierarchy?', 'Objectives → Strategies → Policies → Procedures → Rules; flows from highest to lowest level'],
      ['Define forecasting in planning context', 'Predicting future conditions and trends based on historical data and market analysis to inform decisions'],
      ['What are constraints on planning?', 'Internal constraints (resources, capabilities) and external constraints (market conditions, regulations, competition)'],
      ['What is a project scope statement?', 'A document that clearly defines project objectives, deliverables, boundaries, and success criteria'],
      ['Explain SMART goals in planning', 'Specific, Measurable, Achievable, Relevant, Time-bound objectives that provide clear direction'],
      ['What is risk planning in projects?', 'Identifying potential risks early and developing mitigation strategies to minimize negative impacts'],
      ['Define budget planning in engineering projects', 'Estimating and allocating financial resources needed for project activities and contingencies'],
      ['What is timeline or schedule planning?', 'Determining the sequence and duration of project activities to complete deliverables on time'],

      ['LESSON 6: What is leadership in engineering management?', 'Leadership is guiding, motivating, and influencing team members to achieve organizational goals effectively'],
      ['What are the key leadership styles?', 'Autocratic (directive), Democratic (participative), Laissez-faire (delegative), and Transformational leadership'],
      ['What is transformational leadership?', 'Leadership that inspires followers to exceed expectations and embrace organizational vision and values'],
      ['What is motivation in leadership?', 'Process of stimulating individuals to take actions that accomplish goals and fulfill needs'],
      ["Explain Maslow's Hierarchy of Needs", 'Five levels of human needs from basic (physiological) to highest (self-actualization) that drive motivation'],
      ['What is emotional intelligence in leadership?', 'Ability to recognize, understand, and manage emotions in oneself and others for effective leadership'],
      ['Define delegation in leadership', 'Assigning responsibility and authority to capable team members to accomplish specific tasks'],
      ['What makes an effective leader in engineering?', 'Technical knowledge, clear communication, problem-solving skills, integrity, and ability to inspire teams'],
      ['What is conflict resolution in teams?', 'Process of resolving disagreements by addressing underlying issues and finding mutually acceptable solutions'],
      ['Explain team dynamics and cohesion', 'The interactions and relationships within a team that affect morale, productivity, and goal achievement'],

      ['LESSON 7: What is organizing in management?', 'Organizing is structuring resources and activities to implement plans and achieve organizational objectives'],
      ['What is organizational structure?', 'Framework showing hierarchical relationships, authority levels, reporting lines, and responsibility distribution'],
      ['What are types of organizational structures?', 'Functional (by department), Divisional (by product/market), Matrix (hybrid), and Network structures'],
      ['Define span of control in organizations', 'Number of direct reports a manager can effectively supervise; affects organizational efficiency'],
      ['What is authority and responsibility?', 'Authority is the right to make decisions; responsibility is the obligation to perform assigned tasks'],
      ['Define centralization vs. decentralization', 'Centralization concentrates decisions at top levels; decentralization distributes authority throughout organization'],
      ['What is departmentalization?', 'Process of grouping related activities and people into departments for coordinated management'],
      ['Explain the chain of command', 'Line of authority and communication flowing from top management to operational levels'],
      ['What is job design in organization?', 'Process of specifying job content, responsibilities, methods, and relationships to achieve organizational goals'],
      ['Define staffing in organizing function', 'Recruiting, selecting, training, and developing human resources to fill organizational positions'],

      ['LESSON 8: What is controlling in management?', 'Controlling is monitoring performance against standards and taking corrective actions to ensure goal achievement'],
      ['What are the steps in the control process?', 'Establish standards → Measure performance → Compare with standards → Take corrective action → Monitor results'],
      ['What types of controls exist?', 'Preventive controls (before problems occur), detective controls (identify problems), and corrective controls (fix problems)'],
      ['Define performance metrics and KPIs', 'Quantifiable measures (Key Performance Indicators) used to assess progress toward organizational objectives'],
      ['What is variance analysis in controlling?', 'Comparison of actual performance against planned performance to identify deviations and causes'],
      ['Explain quality control in engineering', 'Process of ensuring products or services meet defined standards and customer requirements'],
      ['What is budget control in projects?', 'Monitoring actual expenses against budgeted amounts and implementing adjustments to prevent overruns'],
      ['Define schedule control in project management', 'Tracking project progress against timeline and adjusting activities to maintain schedule'],
      ['What is change control in projects?', 'Formal process for evaluating, approving, and implementing changes to project scope or requirements'],
      ['Explain feedback loops in control systems', 'Information flow from monitoring activities back to management for informed decision-making and adjustments'],
      ['What is benchmarking in controls?', 'Comparing organizational performance against industry standards or best-in-class practices for improvement']
    ]
  },

  {
    id: 'builtin-technopreneurship-module-5-6',
    title: 'Technopreneurship Concepts',
    subject: 'Technopreneurship Module 5 & 6',
    description: 'Market analysis, prototyping, MVPs, competitive advantage, and startup strategy.',
    cards: [
      ['What is a visual representation that shows how products or brands are perceived by customers relative to each other in terms of attributes or characteristics?', 'Position Map'],
      ['What refers to the unique qualities or strengths that enable a company to outperform its competitors in the market?', 'Competitive Advantage'],
      ['Which strategic planning tool helps evaluate strengths, weaknesses, opportunities, and threats?', 'SWOT Analysis'],
      ['What is competitive advantage?', 'A condition or circumstance that puts a company in a favorable or superior business position compared to its rivals.'],
      ['What is opportunity assessment?', 'The process of identifying and evaluating potential opportunities to determine their viability and potential for success.'],
      ['What is competitor analysis?', 'The process of identifying and evaluating the strengths and weaknesses of current and potential competitors.'],
      ['What is market sizing?', 'The process of estimating the potential of a market in terms of total revenue or units sold, involving TAM, SAM, and SOM.'],
      ['Define TAM in market sizing.', 'Total Addressable Market – the total possible market for your product or service, without limitations of geography, competition, or distribution.'],
      ['Define SAM in market sizing.', 'Serviceable Addressable Market – the portion of TAM that your product or service can reach given geographical constraints, regulations, and capabilities.'],
      ['Define SOM in market sizing.', 'Serviceable Obtainable Market – the portion of the market you can realistically capture in 2–4 years based on current product, plans, and resources.'],
      ['What is the top-down approach in market sizing?', 'Starts with a large, general market and narrows it down to a specific segment or niche.'],
      ['What is the bottom-up approach in market sizing?', 'Starts with a small, specific market and expands it to a larger, general market.'],
      ['Why is combining top-down and bottom-up approaches beneficial?', 'It enhances accuracy by cross-validating estimates, balancing broad overviews with granular insights, and reducing biases.'],
      ['What are the benefits of market sizing?', 'Identifies demand, ensures efforts are concentrated on greatest opportunities, reveals growth pathways, and highlights potential challenges.'],
      ['What is a prototype?', 'A preliminary version or model of a product, service, or process used to test and validate ideas before final development.'],
      ['What is the main goal of prototyping?', 'To test ideas early, reduce risk, and improve solutions through feedback.'],
      ['What is low-fidelity prototyping?', 'A simple, low-detail prototype used to quickly explore ideas and concepts.'],
      ['What is medium-fidelity prototyping?', 'A more detailed prototype, often digital, that shows structure and basic interactions.'],
      ['What is high-fidelity prototyping?', 'A highly detailed prototype that closely resembles the final product.'],
      ['What does fidelity mean in prototyping?', 'The level of accuracy or similarity of a prototype to the final product.'],
      ['Why should startups avoid over-engineering prototypes?', 'Because prototypes are meant for learning and testing, not final deployment.'],
      ['What is an MVP?', 'A Minimum Viable Product is a product with only essential features to solve a core problem and gather user feedback.'],
      ['Is an MVP a prototype?', 'No, an MVP is a usable product tested with real users, while a prototype is mainly for validation and learning.'],
      ['What is the primary purpose of an MVP?', 'To validate product-market fit using real customer feedback.'],
      ['Why is iteration important in product development?', 'It allows continuous improvement based on feedback and learning.'],
      ['What is opportunity assessment?', 'The process of evaluating whether a business idea is viable and worth pursuing.'],
      ['What is competitive advantage?', 'A condition that enables a business to outperform competitors in the market.'],
      ['What is competitor analysis?', 'The evaluation of competitors’ strengths and weaknesses to improve strategic positioning.'],
      ['Why is competitor analysis critical for startups?', 'It helps reduce risk, identify differentiation, and refine business strategy.'],
      ['What is market sizing?', 'Estimating the total potential market value or demand for a product or service.'],
      ['What does TAM stand for?', 'Total Addressable Market.'],
      ['What does SAM stand for?', 'Serviceable Available Market.'],
      ['What does SOM stand for?', 'Serviceable Obtainable Market.'],
      ['What is a USP?', 'A Unique Selling Proposition that differentiates a product from competitors.'],
      ['Why is a USP important?', 'It helps customers understand why they should choose your product.'],
      ['What is a positioning statement?', 'A statement that defines the target customer, market category, and key value proposition.'],
      ['What is market positioning?', 'How a product is perceived relative to competitors in the minds of customers.'],
      ['What is a competitive positioning map?', 'A visual chart plotting competitors based on key factors like price and quality.'],
      ['Why are X-Y graphs used in competition analysis?', 'To visually compare competitors and identify market gaps.'],
      ['What is a MOAT in business?', 'A sustainable advantage that protects a company from competitors.'],
      ['Who popularized the concept of business MOAT?', 'Investor Warren Buffett.'],
      ['What is a brand moat?', 'Customer loyalty and trust built through strong branding.'],
      ['What is a network effect?', 'When a product becomes more valuable as more people use it.'],
      ['What are switching costs?', 'The effort, time, or money required to change from one product to another.'],
      ['What is intellectual property as a moat?', 'Legal protection that prevents competitors from copying innovations.'],
      ['What are economies of scale?', 'Cost advantages gained by producing at a larger scale.'],
      ['Why is customer feedback important?', 'It guides improvements and ensures solutions meet real user needs.'],
      ['How did INT Technologies handle strong competitors?', 'By focusing on agility, personalized service, and niche markets.'],
      ['What lesson does the INT Technologies case highlight?', 'Adaptability and strategic positioning are critical for survival.'],
      ['Why is continuous competitor research necessary?', 'Markets evolve, and strategies must adapt to remain competitive.'],
      ['What is customer journey mapping?', 'A visual representation of a customer’s experience with a product or service.'],
      ['How does prototyping help investors?', 'It demonstrates feasibility, vision, and early validation.'],
      ['What is the risk of assuming no competition?', 'Customers always have alternatives, including choosing not to buy.']
    ]
  },

  {
    id: 'builtin-technopreneurship',
    title: 'Entrepreneurship in Tech',
    subject: 'Technopreneurship',
    description: 'Core concepts in technology entrepreneurship and startups.',
    cards: [
      ['What is technopreneurship?', 'Entrepreneurship that focuses on technology-based innovations'],
      ['Startup', 'A new business focused on growth and innovation'],
      ['Business model', 'A plan for how a company creates, delivers, and captures value'],
      ['Pitch deck', 'A presentation to attract investors to a startup'],
      ['Innovation', 'Developing new ideas, products, or services'],
      ['Funding', 'Securing financial resources to grow a business'],
      ['Market research', 'Studying market needs, trends, and competitors'],
      ['Product development', 'Designing and building a product from concept to launch'],
      ['Entrepreneurial mindset', 'Thinking creatively, taking risks, and solving problems'],
      ['Scaling a business', 'Growing a startup efficiently to reach more customers'],
      ['Lean startup', 'A methodology for developing businesses quickly with minimal waste'],
      ['Value proposition', 'The unique value a product or service provides to customers'],
      ['Customer validation', 'Testing assumptions by getting feedback from real users'],
      ['Revenue streams', 'Ways a business generates income'],
      ['Intellectual property', 'Protecting innovations through patents, copyrights, or trademarks'],
      ['Business plan', 'A formal document detailing business goals and strategies'],
      ['Networking', 'Building professional connections to support growth'],
      ['Competition analysis', 'Studying competitors to identify advantages and threats'],
      ['Technology adoption', 'Implementing new tech to improve products or services'],
      ['Exit strategy', 'Plan for how a founder or investor will leave the business profitably']
    ]
  },

  {
    id: 'builtin-thesis-outline',
    title: 'Electronics Engineering Topics',
    subject: 'Thesis Outline Topics',
    description: 'Essential topics for preparing an Electronics Engineering thesis.',
    cards: [
      ['Thesis purpose', 'To investigate, analyze, and present findings on a technical problem'],
      ['Title selection', 'Choosing a concise and relevant topic for research'],
      ['Abstract', 'A summary of the research, methodology, and results'],
      ['Introduction', 'Background information and problem statement'],
      ['Literature review', 'Survey of existing studies related to the research topic'],
      ['Methodology', 'Detailed plan of how the research is conducted'],
      ['Results', 'Presentation of data and findings'],
      ['Discussion', 'Interpretation and analysis of the results'],
      ['Conclusion', 'Summary of findings and recommendations'],
      ['References', 'List of all sources cited in the research'],
      ['Problem statement', 'The specific issue or question the research addresses'],
      ['Scope and limitations', 'Defines boundaries and constraints of the research'],
      ['Research objectives', 'Specific goals the research aims to achieve'],
      ['Hypothesis formulation', 'Creating a testable prediction based on theory'],
      ['Data collection methods', 'Techniques for gathering research data'],
      ['Analysis techniques', 'Methods for interpreting and processing data'],
      ['Figures and tables', 'Visual representations of data in the thesis'],
      ['Appendices', 'Supplementary materials provided at the end of the thesis'],
      ['Acknowledgments', 'Section to thank contributors and mentors'],
      ['Future work', 'Suggestions for research or development beyond the current study']
    ]
  },

  {
    id: 'builtin-geography',
    title: 'Basic Geography',
    subject: 'Geography',
    description: 'Basic geography facts and concepts.',
    cards: [
      ['Largest continent?', 'Asia'],
      ['Longest river in the world?', 'Nile'],
      ['Largest ocean?', 'Pacific'],
      ['Highest mountain?', 'Mount Everest'],
      ['Capital of France?', 'Paris'],
      ['Country with most population?', 'China'],
      ['Continent Australia is in?', 'Oceania'],
      ['Imaginary line dividing Earth into N and S?', 'Equator'],
      ['Largest desert?', 'Sahara'],
      ['What is tectonic plate movement called?', 'Plate tectonics']
    ]
  },

  {
    id: 'builtin-chemistry',
    title: 'Basic Chemistry',
    subject: 'Chemistry',
    description: 'Basic chemistry concepts and terminology.',
    cards: [
      ['Water formula?', 'H2O'],
      ['Atomic number?', 'Number of protons'],
      ['pH of pure water?', '7'],
      ['Most abundant gas in air?', 'Nitrogen'],
      ['Chemical symbol for gold?', 'Au'],
      ['Process of solid to gas?', 'Sublimation'],
      ['Acidic solution has pH?', '<7'],
      ['Base solution has pH?', '>7'],
      ['Covalent bond?', 'Sharing of electrons'],
      ['Ionic bond?', 'Transfer of electrons']
    ]
  },

  {
    id: 'builtin-physics',
    title: 'Basic Physics',
    subject: 'Physics',
    description: 'Basic physics formulas, units, and principles.',
    cards: [
      ['Force formula?', 'F = ma'],
      ['Speed formula?', 'Distance ÷ Time'],
      ['Acceleration formula?', 'Change in velocity ÷ Time'],
      ['Unit of energy?', 'Joule'],
      ['Unit of force?', 'Newton'],
      ['Unit of power?', 'Watt'],
      ['Gravity acceleration?', '9.8 m/s²'],
      ['Light speed?', '3 × 10⁸ m/s'],
      ["Newton's 1st law?", 'Inertia'],
      ["Newton's 2nd law?", 'F = ma']
    ]
  },

  {
    id: 'builtin-art',
    title: 'Basic Art',
    subject: 'Art',
    description: 'Basic art concepts, techniques, and famous artists.',
    cards: [
      ['Primary colors?', 'Red, Blue, Yellow'],
      ['Famous painter of Mona Lisa?', 'Leonardo da Vinci'],
      ['Art of making sculptures?', 'Sculpture'],
      ['Famous Dutch painter of Starry Night?', 'Vincent van Gogh'],
      ['Technique of shading?', 'Hatching'],
      ['Mixing colors?', 'Color theory'],
      ['Modern art style using geometric shapes?', 'Cubism'],
      ['Art of decorative writing?', 'Calligraphy'],
      ['Famous Mexican muralist?', 'Diego Rivera'],
      ['Art movement with surreal imagery?', 'Surrealism']
    ]
  }
];

let communityUser = null;
let communityReady = false;
let sourceBooks = [];
let libraryFolderId = null;
let data = load();
let route = 'home';
let activeClassId = null;
let activeSetId = null;
let timer = null;
let timerSeconds = 25 * 60;
let communityFlashcardSets = [];
let communityFlashcardsLoading = false;
let communityFlashcardsLoaded = false;
let communityFlashcardsError = null;

window.builtinStudyState = null;
/* ---------- persistence & helpers ---------- */
function isGoogleLinked() {
  return Boolean(
    communityUser &&
    communityUser.googleSub &&
    String(communityUser.googleSub).trim() !== ''
  );
}

function isGuestUser() {
  return !isGoogleLinked();
}

function getUserIdentityLabel() {
  if (isGoogleLinked()) {
    return 'Google account linked';
  }

  return 'Guest account';
}

function normalizeCommunityUser(user) {
  if (!user) return null;

  const googleSub =
    user.googleSub ??
    user.google_sub ??
    null;

  const googleEmail =
    user.googleEmail ??
    user.google_email ??
    '';

  const googleEmailVerified =
    user.googleEmailVerified ??
    user.google_email_verified ??
    false;

  return {
    ...user,

    googleSub:
      googleSub !== null &&
      googleSub !== undefined &&
      String(googleSub).trim() !== ''
        ? String(googleSub)
        : null,

    googleEmail:
      googleEmail
        ? String(googleEmail)
        : '',

    googleEmailVerified:
      Boolean(
        googleEmailVerified === true ||
        googleEmailVerified === 1 ||
        googleEmailVerified === '1'
      )
  };
}

function linkGoogleAccount() {
  if (!communityUser) {
    toast('Your guest session is still loading.');
    return;
  }

  if (isGoogleLinked()) {
    toast('Your Google account is already linked.');
    return;
  }

  const confirmed = confirm(
    'Link your Google account to EcE Hub?\n\n' +
    'Your current guest account will be kept. ' +
    'Your progress and saved flashcards will remain associated with this account.'
  );

  if (!confirmed) return;

  window.location.href =
    `${COMMUNITY_API_BASE}/api/auth/google/start`;
}

async function unlinkGoogleAccount() {
  if (!communityUser) {
    toast('Your community session is still loading.');
    return;
  }

  if (!isGoogleLinked()) {
    toast('No Google account is linked.');
    return;
  }

  const email =
    communityUser.googleEmail ||
    'your Google account';

  const confirmed = confirm(
    `Unlink ${email} from your EcE Hub account?\n\n` +
    'Your EcE Hub account, flashcards, workspace, and study progress will NOT be deleted.\n\n' +
    'You can link a Google account again later.'
  );

  if (!confirmed) return;

  try {
    /*
     * communityFetch() already parses JSON.
     * It does NOT return the native Response object.
     */
    const result = await communityFetch(
      '/api/auth/google/unlink',
      {
        method: 'POST'
      }
    );

    if (!result?.user) {
      throw new Error(
        result?.error ||
        'Failed to unlink Google account.'
      );
    }

    /*
     * The unlink endpoint already gives us
     * the updated user, so use it directly.
     */
    communityUser =
      normalizeCommunityUser(result.user);

    communityReady = true;

    console.log(
      'Google account unlinked:',
      communityUser
    );

    render();

    toast(
      'Google account unlinked successfully.'
    );

  } catch (error) {
    console.error(
      'Google unlink failed:',
      error
    );

    toast(
      `Failed to unlink Google account: ${error.message}`
    );
  }
}

async function handleGoogleLinkCallback() {
  const url =
    new URL(
      window.location.href
    );

  const linked =
    url.searchParams.get(
      'community_google_linked'
    );

  const error =
    url.searchParams.get(
      'community_google_error'
    );

  /*
   * --------------------------------------------------
   * GOOGLE LINK SUCCESS
   * --------------------------------------------------
   */
  if (linked === '1') {
    try {
      /*
       * The Worker creates a fresh session token
       * after successfully linking Google.
       *
       * Recover it from the temporary callback URL.
       */
      const callbackToken =
        url.searchParams.get(
          'community_session'
        );

      if (callbackToken) {
        localStorage.setItem(
          'ecehub_session_token',
          callbackToken
        );

        console.log(
          'Google callback session token stored.'
        );
      }

      /*
       * Now fetch /api/users/me.
       *
       * communityFetch() will automatically send:
       *
       * Authorization: Bearer <session token>
       */
      const result =
        await communityFetch(
          '/api/users/me',
          {
            method: 'GET'
          }
        );

      console.log(
        'Google-link profile refresh response:',
        result
      );

      if (!result?.user) {
        throw new Error(
          'The server did not return the linked community profile.'
        );
      }

      /*
       * Replace the old guest user in memory.
       */
      communityUser =
        normalizeCommunityUser(
          result.user
        );

      communityReady =
        true;

      console.log(
        'Google account linked. Refreshed user:',
        communityUser
      );

      console.log(
        'Google linked:',
        isGoogleLinked()
      );

      /*
       * Remove BOTH OAuth callback parameters.
       */
      url.searchParams.delete(
        'community_google_linked'
      );

      url.searchParams.delete(
        'community_session'
      );

      window.history.replaceState(
        {},
        document.title,

        url.pathname +
          (
            url.searchParams.toString()
              ? `?${url.searchParams.toString()}`
              : ''
          ) +
          url.hash
      );

      /*
       * Refresh UI.
       */
      updateCommunityHeader();

      updateCommunityUserUI();

      updateChrome();

      /*
       * Re-render current page.
       */
      render();

      toast(
        'Google account linked successfully.'
      );

      return true;

    } catch (err) {
      console.error(
        'Failed to refresh Google-linked community user:',
        err
      );

      toast(
        `Google account was linked, but the profile could not be refreshed: ${
          err?.message ||
          'Unknown error'
        }`
      );

      return false;
    }
  }

  /*
   * --------------------------------------------------
   * GOOGLE LINK ERROR
   * --------------------------------------------------
   */
  if (error) {
    console.error(
      'Google linking failed:',
      error
    );

    toast(
      `Google account linking failed: ${error}`
    );

    url.searchParams.delete(
      'community_google_error'
    );

    window.history.replaceState(
      {},
      document.title,

      url.pathname +
        (
          url.searchParams.toString()
            ? `?${url.searchParams.toString()}`
            : ''
        ) +
        url.hash
    );

    return false;
  }

  return false;
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return structuredClone(seed);
    // Normalize quizzes so missing/empty questions never crash study mode
    if (Array.isArray(raw.quizzes)) {
      raw.quizzes = raw.quizzes.map(q => ({
        ...q,
        questions: Array.isArray(q.questions)
          ? q.questions.filter(item => item && typeof item.q === 'string' && Array.isArray(item.options))
          : []
      }));
    }
    if (Array.isArray(raw.sets)) {
      raw.sets = raw.sets.map(s => ({
        ...s,
        cards: Array.isArray(s.cards) ? s.cards.filter(c => Array.isArray(c) && c.length >= 2) : []
      }));
    }
    return raw;
  } catch {
    return structuredClone(seed);
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])
  );
}
function toast(s) {
  const e = document.querySelector('#toast');
  e.textContent = s;
  e.classList.add('show');
  clearTimeout(window._t);
  window._t = setTimeout(() => e.classList.remove('show'), 1800);
}
function pageTitle(title, sub, button = '') {
  return `<div class="page-title"><div><h1>${title}</h1><p>${sub}</p></div>${button ? `<div class="actions">${button}</div>` : ''}</div>`;
}
function cardIcon(cls, char) {
  return `<span class="round ${cls}">${char}</span>`;
}
function openModal(html, { wide = false } = {}) {
  const modal = document.querySelector('#modal');
  modal.innerHTML = html;
  modal.classList.toggle('wide', !!wide);
  document.querySelector('#modalBackdrop').classList.add('open');
}
function closeModal() {
  document.querySelector('#modalBackdrop').classList.remove('open');
  document.querySelector('#modal').classList.remove('wide');
}
document.querySelector('#modalBackdrop').addEventListener('click', e => {
  if (e.target.id === 'modalBackdrop') closeModal();
});

/* ---------- theme ---------- */
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  const btn = document.querySelector('#themeButton');
  if (btn) btn.textContent = dark ? '☀' : '☾';
}
function toggleTheme() {
  applyTheme(!document.body.classList.contains('dark'));
}
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') applyTheme(true);
})();

function updateChrome() {
  const usernameEl =
    document.getElementById('headerUsername');

  const avatarEl =
    document.getElementById('communityProfileAvatar');

  if (!communityUser) {

    if (usernameEl) {
      usernameEl.textContent = '';
    }

    if (avatarEl) {
      avatarEl.innerHTML = `
        <span class="profile-avatar-fallback">
          ?
        </span>
      `;
    }

    return;
  }

  const displayName =
    communityUser.displayName ||
    communityUser.username ||
    'Student';

  const username =
    communityUser.username ||
    '';

  if (usernameEl) {
    usernameEl.textContent =
      username ? `@${username}` : '';
  }

  if (avatarEl) {
    avatarEl.innerHTML =
      communityProfileAvatar();
  }

  const profileButton =
    document.getElementById('communityProfileButton');

  if (profileButton) {
    profileButton.setAttribute(
      'aria-label',
      `Edit profile: ${displayName}${
        username ? ` (@${username})` : ''
      }`
    );
  }
}

function updateSearchVisibility() {
  const searchWrap = document.getElementById('searchWrap');

  if (!searchWrap) return;

  // Routes where the global search bar should be visible
  const searchableRoutes = [
    'home',
    'library',
    'explore',
    'sets',
    'flashcards',
    'quizzes',
    'notes'
  ];

  const shouldShow = searchableRoutes.includes(route);

  searchWrap.hidden = !shouldShow;

  // Also clear the search when leaving a searchable page
  if (!shouldShow) {
    const input = document.getElementById('globalSearch');
    const results = document.getElementById('searchResults');
    const clear = document.getElementById('searchClear');

    if (input) input.value = '';
    if (results) {
      results.innerHTML = '';
      results.hidden = true;
    }
    if (clear) clear.hidden = true;
  }
}
/* ---------- routing & render ---------- */
function render() {
  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle(
      'active',
      b.dataset.route === route ||
      (
        route.startsWith('explore-') &&
        b.dataset.route === 'explore'
      )
    )
  );

  const c = document.querySelector('#content');

  const views = {
    home: homeView,
    classes: classesView,
    library: libraryView,

    explore: exploreView,

    'explore-circuits': () =>
      window.ExploreGames.circuitChallengeView(),
    'explore-crossword': () =>
      window.ExploreGames.electronicsCrosswordView(),

    quizzes: quizzesView,
    tools: toolsView,
    sets: setsView,
    flashcards: flashcardsView,

    'ai-flashcard-maker': aiFlashcardMakerView,

    'builtin-flashcards': () => {
      if (window.builtinStudyState) {
        return builtinStudyView();
      }

      return builtinFlashcardsView();
    },

    notes: notesView,
    profile: profileView,
    settings: settingsView
  };

  c.innerHTML =
    (views[route] || homeView)();

  updateChrome();
  updateSearchVisibility();

  if (
    route === 'flashcards' &&
    !window.studyState &&
    !communityFlashcardsLoaded &&
    !communityFlashcardsLoading
  ) {
    loadCommunityFlashcards();
  }
}

function go(r) {
  route = r;
  if (r !== 'classes') {
    activeClassId = null;
    activeSetId = null;
  }
  closeSidebar();
  render();
  window.scrollTo(0, 0);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setsForClass(cls) {
  if (!cls) return [];
  const name = (cls.name || '').toLowerCase();
  return data.sets.filter(s => (s.subject || '').toLowerCase() === name);
}

function classStats(cls) {
  const sets = setsForClass(cls);
  const cards = sets.reduce((n, s) => n + (Array.isArray(s.cards) ? s.cards.length : 0), 0);
  return { sets: sets.length, cards, list: sets };
}

/* ---------- views ---------- */
function homeView() {
  const cards = data.sets.reduce((n, s) => n + s.cards.length, 0);
  const latestSet = data.sets[0];
  return (
    pageTitle(`Good evening, ${esc(data.profile.name)} 👋`, 'Your academic workspace') +
    `<div class="grid stats">
      <div class="card stat">${cardIcon('purple', '▣')}<div><strong>${data.classes.length}</strong><span>Subjects</span><small>Active subjects</small></div></div>
      <div class="card stat">${cardIcon('green', '▰')}<div><strong>${data.sets.length}</strong><span>Study Sets</span><small>Your flashcard sets</small></div></div>
      <div class="card stat">${cardIcon('blue', '▤')}<div><strong>${cards}</strong><span>Flashcards</span><small>Total cards</small></div></div>
      <div class="card stat">${cardIcon('orange', '♛')}<div><strong>${data.quizzes.length}</strong><span>Quizzes</span><small>Available now</small></div></div>
    </div>
    <div class="grid home-grid">
      <div>
        <div class="card continue" style="cursor:pointer" data-action="continue-study">
          ${cardIcon('purple', '▧')}
          <div>
            <h2>Continue studying</h2>
            <p>${latestSet ? `Resume “${esc(latestSet.title)}”` : 'Pick up where you left off with your latest study set.'}</p>
          </div>
          <div class="continue-art">📚</div>
        </div>
        <div class="section">
          <div class="section-head"><h2>My Classes</h2><button class="btn" data-action="classes">View all</button></div>
          <div class="grid class-grid">${data.classes.map(classCard).join('')}</div>
        </div>
      </div>
      <div class="side-stack">

        <div class="card">
          <div class="section-head">
            <h2>Recent Activity</h2>
          </div>

          ${data.activity.map(a =>
            `<div class="activity-item">
              <div class="activity-icon" style="background: var(--card)">
                ✓
              </div>

              <div>
                <strong>${esc(a.text)}</strong>
                <span>${esc(a.sub)}</span>
              </div>

              <time>${esc(a.time)}</time>
            </div>`
          ).join('')}
        </div>

        ${renderStudyGoal()}

      </div>
    </div>`
  );
}

function classCard(c) {
  return `<div class="card class-card">
    ${cardIcon(c.progress > 70 ? 'green' : c.progress > 50 ? 'orange' : 'purple', '⌘')}
    <h3>${esc(c.name)}</h3>
    <p>${esc(c.category)}</p>
    <span class="meta">${c.sets} sets • ${c.cards} cards</span>
    <div class="progress"><i style="width:${c.progress}%"></i></div>
    <span class="progress-label">${c.progress}%</span>
  </div>`;
}

function classesView() {
  // Drill-down: set cards list
  if (activeSetId) {
    const set = data.sets.find(x => x.id === activeSetId);
    const cls = data.classes.find(x => x.id === activeClassId);
    if (!set) {
      activeSetId = null;
      return classesView();
    }
    const cards = Array.isArray(set.cards) ? set.cards : [];
    const cardsHtml = cards.length
      ? `<div class="cards-list">${cards.map((c, i) =>
          `<div class="card card-item">
            <div class="card-section">
              <span class="card-label">Question</span>
              <p class="card-text">${esc(Array.isArray(c) ? c[0] : c)}</p>
            </div>
            <div class="card-section">
              <span class="card-label">Answer</span>
              <p class="card-text">${esc(Array.isArray(c) ? c[1] : '')}</p>
            </div>
            <span class="card-index">#${i + 1}</span>
          </div>`
        ).join('')}</div>`
      : `<div class="card empty">No cards yet. Edit this set to add question &amp; answer pairs.</div>`;
    return (
      pageTitle(
        esc(set.title),
        `${cards.length} card${cards.length === 1 ? '' : 's'}${cls ? ' · ' + esc(cls.name) : ''}`,
        `<button class="btn" data-action="back-to-class">← Back</button>
         <button class="btn" data-action="edit-set" data-id="${set.id}">Edit</button>
         <button class="btn primary" data-action="study-set" data-id="${set.id}">Study</button>`
      ) +
      `<div class="drill-hero">
        <p style="color:var(--muted);margin:0 0 16px;font-size:13px">Review cards below, or start a study session.</p>
      </div>` +
      cardsHtml
    );
  }

  // Drill-down: sets inside a class
  if (activeClassId) {
    const cls = data.classes.find(x => x.id === activeClassId);
    if (!cls) {
      activeClassId = null;
      return classesView();
    }
    const { list: sets, cards } = classStats(cls);
    const setsHtml = sets.length
      ? `<div class="grid set-grid">${sets.map(s =>
          `<div class="card set-card subject-set-card" data-action="open-set" data-id="${s.id}" style="cursor:pointer">
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.subject)}</p>
            <div class="set-meta">${Array.isArray(s.cards) ? s.cards.length : 0} cards</div>
            <div class="actions set-actions" style="margin-top:16px">
                <button
                    type="button"
                    class="btn primary"
                    data-action="study-set"
                    data-id="${s.id}">
                    Study
                </button>

                <button
                    type="button"
                    class="btn"
                    data-action="open-set"
                    data-id="${s.id}">
                    Cards
                </button>

                <button
                    type="button"
                    class="btn"
                    data-action="edit-set"
                    data-id="${s.id}">
                    Edit
                </button>

                <button
                    type="button"
                    class="btn danger"
                    data-action="delete-set"
                    data-id="${s.id}">
                    Delete
                </button>
            </div>
          </div>`
        ).join('')}</div>`
      : `<div class="card empty">No sets for this subject yet. Create one and set its subject to “${esc(cls.name)}”.</div>`;
    return (
      pageTitle(
        esc(cls.name),
        `${sets.length} set${sets.length === 1 ? '' : 's'} · ${cards} cards`,
        `<button class="btn" data-action="back-to-classes">← Back</button>
         <button class="btn" data-action="edit-class" data-id="${cls.id}">Edit</button>
         <button class="btn primary" data-action="add-set">+ New Set</button>`
      ) +
      `<div class="drill-hero subject-header">
        ${cardIcon(cls.progress > 70 ? 'green' : cls.progress > 50 ? 'orange' : 'purple', '⌘')}
        <div>
          <p style="margin:0;color:var(--muted);font-size:13px">${esc(cls.category || 'Engineering')}</p>
          <div class="progress" style="margin-top:10px;max-width:220px"><i style="width:${cls.progress || 0}%"></i></div>
        </div>
      </div>` +
      setsHtml
    );
  }

  // Root: subject cards
  const grid = data.classes.length
    ? `<div class="grid subject-grid">${data.classes.map(c => {
        const st = classStats(c);
        return `<div class="card subject-card" data-action="open-class" data-id="${c.id}" style="cursor:pointer">
        <button
            type="button"
            class="subject-delete btn danger"
            data-action="delete-class"
            data-id="${c.id}"
            title="Delete subject"
            aria-label="Delete ${esc(c.name)}">
            ×
        </button>

        <div class="subject-icon-wrap">
            ${cardIcon(c.progress > 70 ? 'green' : c.progress > 50 ? 'orange' : 'purple', '⌘')}
        </div>

        <h3>${esc(c.name)}</h3>
        <p>${esc(c.category || 'Engineering')}</p>
        <span class="meta">${st.sets} set${st.sets === 1 ? '' : 's'} · ${st.cards} cards</span>
        <div class="progress">
            <i style="width:${c.progress || 0}%"></i>
        </div>
        <span class="progress-label">${c.progress || 0}%</span>
        </div>`;
      }).join('')}</div>`
    : `<div class="card empty">No subjects yet. Create your first class to get started.</div>`;

  return (
    pageTitle('Classes', 'Pick a subject to browse its study sets and cards.',
      `<button class="btn primary" data-action="add-class">+ New Class</button>`) +
    grid
  );
}
function getDriveFileId(url) {
    if (!url) return null;

    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

    return match ? match[1] : null;
}


function getDriveThumbnail(driveUrl) {
    const fileId = getDriveFileId(driveUrl);

    if (!fileId) {
        return "";
    }

    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}


function getFolderThumbnail(folderId) {

    const firstBook = data.books.find(
        book => book.folderId === folderId
    );

    if (!firstBook || !firstBook.driveUrl) {
        return "";
    }

    return getDriveThumbnail(firstBook.driveUrl);
}
function renderLibrary(books) {
    const container = document.getElementById('library-container');

    container.innerHTML = '';

    books.forEach(book => {
        const thumbnail = getDriveThumbnail(book.driveUrl);

        const card = document.createElement('div');
        card.className = 'book-card';

        card.innerHTML = `
            <div class="book-cover">
                <img 
                    src="${thumbnail}" 
                    alt="${book.title}"
                    loading="lazy"
                    onerror="this.src='assets/pdf-placeholder.svg';"
                >
            </div>

            <div class="book-info">
                <h3>${book.title}</h3>
                <p>${book.folder}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            window.open(book.driveUrl, '_blank');
        });

        container.appendChild(card);
    });
}
async function loadLibraryData() {
  try {
    const response = await fetch('./library.json');

    if (!response.ok) {
      throw new Error(`Failed to load library.json: ${response.status}`);
    }

    sourceBooks = await response.json();

    const library = buildLibraryData(sourceBooks);

    data.folders = library.folders;
    data.books = library.books;

    render();
  } catch (error) {
    console.error('Failed to load library:', error);
  }
}

function buildLibraryData(sourceBooks) {
  const folderMap = new Map();

  const folders = [];
  const books = [];

  sourceBooks.forEach((item, index) => {
    const folderName =
      item.folder?.trim() || 'Uncategorized';

    let folder = folderMap.get(folderName);

    if (!folder) {
      folder = {
        id:
          'folder_' +
          folderName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),

        name: folderName
      };

      folderMap.set(folderName, folder);
      folders.push(folder);
    }

    books.push({
    id: `library_book_${index + 1}`,
    title: item.title || 'Untitled',
    author: item.author || '',
    course: item.course || '',
    folderId: folder.id,
    folder: folderName,
    yearLevel: Array.isArray(item.yearLevel)
        ? item.yearLevel
        : [],
    driveUrl: item.driveUrl || ''
});
  });

  return {
    folders,
    books
  };
}

function libraryView() {
  if (!Array.isArray(data.folders)) {
    data.folders = [];
  }

  if (!Array.isArray(data.books)) {
    data.books = [];
  }

  /* ==============================
     INSIDE A FOLDER
     ============================== */

  if (libraryFolderId) {
    const folder = data.folders.find(
      f => f.id === libraryFolderId
    );

    // Folder no longer exists
    if (!folder) {
      libraryFolderId = null;
      return libraryView();
    }

    const books = data.books.filter(
      b => b.folderId === folder.id
    );

    return (
      pageTitle(
        `📁 ${esc(folder.name)}`,
        `${books.length} ${books.length === 1 ? 'book' : 'books'} in this folder.`,
        `
          <button
            type="button"
            class="btn"
            data-action="back-library">
            ← Library
          </button>

          <button
            type="button"
            class="btn"
            data-action="edit-library-folder"
            data-id="${folder.id}">
            Edit Folder
          </button>

          <button
            type="button"
            class="btn primary"
            data-action="add-book-to-folder"
            data-id="${folder.id}">
            + Add Book
          </button>
        `
      ) +

      `
        <section class="library-folder-content">

          <div class="library-section-heading">
            <div>
              <h2>Books</h2>
              <p>
                Manage the books and PDF links in
                <strong>${esc(folder.name)}</strong>.
              </p>
            </div>
          </div>

          ${
            books.length
              ? `
                <div class="grid library-grid">
                  ${books.map(renderLibraryBook).join('')}
                </div>
              `
              : `
                <div class="card library-empty">

                  <div class="library-empty-icon">📚</div>

                  <strong>This folder is empty</strong>

                  <span>
                    Add a PDF to start building this collection.
                  </span>

                  <button
                    type="button"
                    class="btn primary"
                    data-action="add-book-to-folder"
                    data-id="${folder.id}">
                    + Add Book
                  </button>

                </div>
              `
          }

        </section>
      `
    );
  }

  /* ==============================
     MAIN LIBRARY
     ============================== */

 const folderCards = data.folders.map(folder => {

        const count = data.books.filter(
            b => b.folderId === folder.id
        ).length;

        return `
            <div class="card library-folder-card">

                <div class="library-folder-cover">
                    <img
                        src="${getFolderThumbnail(folder.id)}"
                        alt="${esc(folder.name)}"
                        loading="lazy"
                        onerror="this.onerror=null; this.src='assets/pdf-placeholder.svg';"
                    >
                </div>

                <div class="library-folder-info">
                    <h3>${esc(folder.name)}</h3>

                    <p>
                        ${count}
                        ${count === 1 ? 'book' : 'books'}
                    </p>
                </div>

                <button
                    type="button"
                    class="btn library-folder-open"
                    data-action="open-library-folder"
                    data-id="${folder.id}">
                    Open
                </button>

            </div>
        `;

    }).join('');

    return (
        pageTitle(
            'Library',
            'Organize your PDFs and academic references.',
            `
                <button
                    type="button"
                    class="btn"
                    data-action="add-library-folder">
                    + New Folder
                </button>

                <button
                    type="button"
                    class="btn primary"
                    data-action="add-book">
                    + Add PDF
                </button>
            `
        ) +

        `
            <section class="library-folders">

                <div class="library-section-heading">
                    <div>
                        <h2>Folders</h2>
                        <p>
                            Organize your books by subject or category.
                        </p>
                    </div>
                </div>

                ${
                    data.folders.length
                        ? `
                            <div class="library-folder-grid">
                                ${folderCards}
                            </div>
                        `
                        : `
                            <div class="card library-empty">

                                <div class="library-empty-icon">📁</div>

                                <strong>No folders yet</strong>

                                <span>
                                    Create a folder to organize your library.
                                </span>

                            </div>
                        `
                }

            </section>
        `
    );
}

function renderLibraryBook(book) {

    const thumbnail = getDriveThumbnail(book.driveUrl);

    return `
        <div class="card book-card">

            <div class="book-cover">
                <img
                    src="${thumbnail}"
                    alt="${esc(book.title)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='assets/pdf-placeholder.svg';"
                >
            </div>

            <h3>
                ${esc(book.title)}
            </h3>

            <p>
                ${esc(book.author || 'Unknown author')}
                ${
                    book.course
                        ? ` • ${esc(book.course)}`
                        : ''
                }
            </p>

        <div class="book-actions">

            <button
                type="button"
                class="btn primary"
                data-action="open-book"
                data-id="${book.id}">
                Open
            </button>

            <button
                type="button"
                class="btn"
                data-action="download-book"
                data-id="${book.id}">
                Download
            </button>

            <button
                type="button"
                class="btn"
                data-action="edit-book"
                data-id="${book.id}">
                Edit
            </button>

            <button
                type="button"
                class="btn danger"
                data-action="delete-book"
                data-id="${book.id}">
                Delete
            </button>

        </div>

        </div>
    `;
}
function downloadBook(book) {
    if (!book || !book.driveUrl) {
        console.error('No PDF URL found.');
        return;
    }

    const fileId = getDriveFileId(book.driveUrl);

    if (!fileId) {
        window.open(book.driveUrl, '_blank');
        return;
    }

    const downloadUrl =
        `https://drive.google.com/uc?export=download&id=${fileId}`;

    window.open(downloadUrl, '_blank');
}
function renderFolderBookCard(book) {

    const thumbnail = getDriveThumbnail(book.driveUrl);

    return `
        <div class="card book-card">

            <div class="book-cover">
                <img
                    src="${thumbnail}"
                    alt="${esc(book.title)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='assets/pdf-placeholder.svg';"
                >
            </div>

            <h3>
                ${esc(book.title)}
            </h3>

            <p class="book-author">
                ${esc(book.author || 'Unknown author')}
            </p>

            ${
                book.course
                    ? `<span class="book-course">${esc(book.course)}</span>`
                    : ''
            }

            <div class="book-actions">

                <button
                    type="button"
                    class="btn primary"
                    data-action="open-book"
                    data-id="${book.id}">
                    Open
                </button>
                <button
                    type="button"
                    class="btn"
                    data-action="download-book"
                    data-id="${book.id}">
                    Download
                </button>
                <button
                    type="button"
                    class="btn"
                    data-action="edit-book"
                    data-id="${book.id}">
                    Edit
                </button>

                <button
                    type="button"
                    class="btn danger"
                    data-action="delete-book"
                    data-id="${book.id}">
                    Delete
                </button>

            </div>

        </div>
    `;
}

function renderBookCard(book) {

    const thumbnail = getDriveThumbnail(book.driveUrl);

    return `
        <div class="card book-card">

            <div class="book-cover">
                <img
                    src="${thumbnail}"
                    alt="${esc(book.title)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='assets/pdf-placeholder.svg';"
                >
            </div>

            <h3>
                ${esc(book.title)}
            </h3>

            <p>
                ${esc(book.author || '')}
                ${book.author && book.course ? ' • ' : ''}
                ${esc(book.course || '')}
            </p>

            <div class="book-actions">

                <button
                    class="btn primary"
                    data-action="open-book"
                    data-id="${book.id}">
                    Open PDF
                </button>

                <button
                    class="btn danger"
                    data-action="delete-book"
                    data-id="${book.id}">
                    Delete
                </button>

            </div>

        </div>
    `;
}

function openBookForm(book = null, folderId = '') {
  const folders = Array.isArray(data.folders)
    ? data.folders
    : [];

  openModal(`
    <h2>${book ? 'Edit Book' : 'Add PDF'}</h2>

    <div class="form-grid">

      <div class="field">
        <label>Book Title</label>
        <input
          id="f-title"
          value="${esc(book?.title || '')}"
          placeholder="e.g. Engineering Circuit Analysis">
      </div>

      <div class="field">
        <label>Author</label>
        <input
          id="f-author"
          value="${esc(book?.author || '')}"
          placeholder="e.g. Hayt & Kemmerly">
      </div>

      <div class="field">
        <label>Course</label>
        <input
          id="f-course"
          value="${esc(book?.course || '')}"
          placeholder="e.g. Circuits 101">
      </div>

      <div class="field">
        <label>Folder</label>
        <select id="f-folder">
          <option value="">Uncategorized</option>

          ${folders.map(folder => `
            <option
              value="${folder.id}"
              ${
                (book?.folderId || folderId) === folder.id
                  ? 'selected'
                  : ''
              }>
              ${esc(folder.name)}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="field">
        <label>PDF / Google Drive Link</label>
        <input
          id="f-url"
          value="${esc(book?.url || '')}"
          placeholder="Paste the PDF or Google Drive link">
      </div>

    </div>

    <div class="modal-actions">
      <button
        type="button"
        class="btn"
        data-action="close-modal">
        Cancel
      </button>

      <button
        type="button"
        class="btn primary"
        data-action="save-book"
        data-id="${book?.id || ''}">
        ${book ? 'Save Changes' : 'Add Book'}
      </button>
    </div>
  `);
}

function exploreView() {
  return (
    pageTitle(
      'Explore',
      'Learn, practice, and challenge yourself.'
    ) +

    `
    <section class="explore-page">

      <!-- Featured Game -->
      <section class="explore-featured">

        <div class="explore-featured-content">

          <div class="explore-game-icon">
            ⚡
          </div>

          <span class="explore-eyebrow">
            FEATURED GAME
          </span>

          <h2>
            Circuit Challenge
          </h2>

          <p>
            Test your circuit analysis skills using
            real engineering problems.
          </p>

          <div class="explore-meta">
            <span>⚡ Electronics</span>
            <span>7 Challenges</span>
            <span>Beginner → Advanced</span>
          </div>

          <button
            type="button"
            class="btn primary explore-play-btn"
            data-action="open-circuit-challenge">
            Play Now
          </button>

        </div>

        <div class="explore-featured-decoration">
          ⚡
        </div>

      </section>


      <!-- Games -->
      <section class="explore-section">

        <div class="section-head">
          <div>
            <h2>Games</h2>

            <p class="explore-section-subtitle">
              Learn through interactive challenges.
            </p>
          </div>
        </div>


        <div class="explore-game-grid">


          <!-- Circuit Challenge -->
          <article class="explore-game-card">

            <div class="explore-card-icon">
              ⚡
            </div>

            <div class="explore-card-body">

              <span class="explore-card-category">
                ELECTRONICS
              </span>

              <h3>
                Circuit Challenge
              </h3>

              <p>
                Solve circuit problems and test your
                analysis skills.
              </p>

              <div class="explore-card-footer">

                <span>
                  7 challenges
                </span>

                <button
                  type="button"
                  class="btn primary"
                  data-action="open-circuit-challenge">
                  Play
                </button>

              </div>

            </div>

          </article>


          <!-- Logic Gates -->
          <article class="explore-game-card explore-game-disabled">

            <div class="explore-card-icon">
              🧠
            </div>

            <div class="explore-card-body">

              <span class="explore-card-category">
                DIGITAL LOGIC
              </span>

              <h3>
                Logic Gate Lab
              </h3>

              <p>
                Practice AND, OR, NOT, NAND, NOR,
                XOR and more.
              </p>

              <div class="explore-card-footer">

                <span>
                  Coming soon
                </span>

              </div>

            </div>

          </article>


          <!-- Components -->
          <!-- Electronics Crossword -->
          <article class="explore-game-card">

            <div class="explore-card-icon">
              🧩
            </div>

            <div class="explore-card-body">

              <span class="explore-card-category">
                ELECTRONICS
              </span>

              <h3>
                Electronics Crossword
              </h3>

              <p>
                Test your knowledge of electronic components,
                circuits, measurements, and technical terms.
              </p>

              <div class="explore-card-footer">

                <span>
                  Technical terminology
                </span>

                <button
                  type="button"
                  class="btn primary"
                  data-action="open-electronics-crossword">
                  Play
                </button>

              </div>

            </div>

          </article>


          <!-- Engineering Math -->
          <article class="explore-game-card explore-game-disabled">

            <div class="explore-card-icon">
              📐
            </div>

            <div class="explore-card-body">

              <span class="explore-card-category">
                ENGINEERING MATH
              </span>

              <h3>
                Engineering Math
              </h3>

              <p>
                Practice the mathematics used
                throughout engineering.
              </p>

              <div class="explore-card-footer">

                <span>
                  Coming soon
                </span>

              </div>

            </div>

          </article>


        </div>

      </section>


      <!-- More Games -->
      <section class="explore-coming-soon">

        <div class="explore-coming-icon">
          ✨
        </div>

        <div>

          <h3>
            More games are coming
          </h3>

          <p>
            Logic, mathematics, signals, programming,
            electronics, and more.
          </p>

        </div>

      </section>

    </section>
    `
  );
}

function setsView() {
  return (
    pageTitle('My Sets', 'Create and manage flashcard collections.', `<button class="btn primary" data-action="add-set">+ New Set</button>`) +
    `<div class="grid set-grid">${data.sets.map(s =>
      `<div class="card set-card">
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.subject)}</p>
        <div class="set-meta">${s.cards.length} cards</div>
        <div class="actions" style="margin-top:16px">
          <button class="btn primary" data-action="study-set" data-id="${s.id}">Study</button>
          <button class="btn" data-action="edit-set" data-id="${s.id}">Edit</button>
          <button class="btn danger" data-action="delete-set" data-id="${s.id}">Delete</button>
        </div>
      </div>`
    ).join('')}</div>`
  );
}

function builtinFlashcardsView() {

  return (
    pageTitle(
      'Built-in Flashcards',
      'Official EcE Hub flashcards. These decks are read-only.'
    ) +

    `
    <div class="builtin-flashcards-notice">
      <span class="builtin-notice-icon">▤</span>
      <div>
        <strong>Built-in Study Material</strong>
        <p>
          These flashcards are provided by EcE Hub and cannot be edited
          or deleted.
        </p>
      </div>
    </div>

    <div class="grid builtin-flashcard-grid">

      ${
        BUILTIN_FLASHCARDS.map(deck => `
          <div class="card builtin-deck-card">

            <div class="builtin-deck-icon">
              ▧
            </div>

            <div class="builtin-deck-content">

              <div class="builtin-badge">
                BUILT-IN
              </div>

              <h3>
                ${esc(deck.title)}
              </h3>

              <p class="builtin-subject">
                ${esc(deck.subject)}
              </p>

              <p class="builtin-description">
                ${esc(deck.description)}
              </p>

              <div class="builtin-meta">
                ${deck.cards.length}
                ${deck.cards.length === 1 ? 'card' : 'cards'}
              </div>

            </div>

            <div class="builtin-actions">

              <button
                type="button"
                class="btn primary"
                data-action="study-builtin"
                data-id="${deck.id}">
                Study
              </button>

              <button
                type="button"
                class="btn"
                data-action="view-builtin"
                data-id="${deck.id}">
                View Cards
              </button>

            </div>

          </div>
        `).join('')
      }

    </div>
    `
  );
}

function studyBuiltin(id) {

  const deck = BUILTIN_FLASHCARDS.find(
    x => x.id === id
  );

  if (!deck) {
    return toast('Built-in flashcard deck not found');
  }

  if (!deck.cards.length) {
    return toast('This deck has no flashcards');
  }

  window.builtinStudyState = {
    deckId: id,
    index: 0,
    revealed: false
  };

  render();
}

function builtinStudyView() {

  const state = window.builtinStudyState;

  if (!state) {
    return builtinFlashcardsView();
  }

  const deck = BUILTIN_FLASHCARDS.find(
    x => x.id === state.deckId
  );

  if (!deck) {
    window.builtinStudyState = null;
    return builtinFlashcardsView();
  }

  const card = deck.cards[state.index];

  const question = Array.isArray(card)
    ? card[0]
    : card;

  const answer = Array.isArray(card)
    ? card[1]
    : '';

  const shown = state.revealed;

  return `
    <div class="flash-study builtin-study">

      ${pageTitle(
        esc(deck.title),
        `${esc(deck.subject)} • Card ${state.index + 1} of ${deck.cards.length}`,
        `
          <button
            class="btn"
            data-action="exit-builtin-study">
            Exit
          </button>
        `
      )}

      <div class="builtin-readonly-label">
        🔒 Built-in flashcards • Read-only
      </div>

      <div
        class="card flash-card builtin-flash-card"
        data-action="flip-builtin-card">

        <div>

          <div class="term">
            ${esc(shown ? answer : question)}
          </div>

          <div class="hint">
            ${
              shown
                ? 'Answer'
                : 'Click to reveal answer'
            }
          </div>

        </div>

      </div>

      <div class="study-controls">

        <button
          class="btn"
          data-action="prev-builtin-card">
          ← Previous
        </button>

        <button
          class="btn primary"
          data-action="flip-builtin-card">
          ${shown ? 'Hide answer' : 'Reveal answer'}
        </button>

        <button
          class="btn"
          data-action="next-builtin-card">
          Next →
        </button>

      </div>

    </div>
  `;
}
function flashcardsView() {
  if (!window.studyState) {
    return (
      pageTitle(
        'Flashcards',
        'Create and manage your flashcard study sets.'
      ) +

      `<div class="flashcards-actions">

        <button
          type="button"
          class="btn primary"
          data-action="open-ai-flashcard-maker">
          ✨ AI Flashcard Maker
        </button>

      </div>` +

      `<div class="card empty">

        <h3>Your flashcard sets are organized in Classes.</h3>

        <p>
          Open a class to view its private and community flashcard sets.
        </p>

        <button
          type="button"
          class="btn"
          data-action="navigate"
          data-route="classes">
          Open Classes
        </button>

      </div>`
    );
  }

  const s =
    data.sets.find(
      x => x.id === window.studyState.setId
    );

  if (!s || !s.cards.length) {
    window.studyState = null;

    return (
      pageTitle(
        'Flashcards',
        'Set not found or empty.'
      ) +

      `<div class="card empty">
        This study set no longer exists.
        Choose another set.
      </div>`
    );
  }

  const card =
    s.cards[window.studyState.index];

  const shown =
    window.studyState.revealed;

  return `
    <div class="flash-study">

      ${pageTitle(
        'Flashcards',
        `${esc(s.title)} • Card ${
          window.studyState.index + 1
        } of ${s.cards.length}`,

        `<button
          class="btn"
          data-action="stop-study">
          Exit
        </button>`
      )}

      <div
        class="card flash-card"
        data-action="flip-card">

        <div>

          <div class="term">
            ${esc(
              shown
                ? card[1]
                : card[0]
            )}
          </div>

          <div class="hint">
            ${
              shown
                ? 'Answer'
                : 'Click to reveal answer'
            }
          </div>

        </div>

      </div>

      <div class="study-controls">

        <button
          class="btn"
          data-action="prev-card">
          ← Previous
        </button>

        <button
          class="btn primary"
          data-action="flip-card">
          ${
            shown
              ? 'Hide answer'
              : 'Reveal answer'
          }
        </button>

        <button
          class="btn"
          data-action="next-card">
          Next →
        </button>

      </div>

    </div>
  `;
}

function notesView() {
  return (
    pageTitle('Notes', 'Keep lecture notes, formulas and review summaries.', `<button class="btn primary" data-action="add-note">+ New Note</button>`) +
    `<div class="grid note-grid">${data.notes.map(n =>
      `<div class="card note-card">
        <h3>${esc(n.title)}</h3>
        <span class="pill">${esc(n.subject)}</span>
        <p>${esc(n.body)}</p>
        <span class="note-date">${esc(n.updated)}</span>
        <div class="actions" style="margin-top:13px">
          <button class="btn" data-action="edit-note" data-id="${n.id}">Edit</button>
          <button class="btn danger" data-action="delete-note" data-id="${n.id}">Delete</button>
        </div>
      </div>`
    ).join('')}</div>`
  );
}

function quizzesView() {
  return (
    pageTitle('Quizzes', 'Test yourself and measure what you know.', `<button class="btn primary" data-action="add-quiz">+ New Quiz</button>`) +
    `<div class="quiz-list">${data.quizzes.map(q =>
      `<div class="card quiz-card">
        <h3>${esc(q.title)}</h3>
        <p>${esc(q.subject)}</p>
        <div class="quiz-meta">${q.questions.length} questions</div>
        <div class="actions">
          <button class="btn primary" data-action="take-quiz" data-id="${q.id}">Take Quiz</button>
          <button class="btn danger" data-action="delete-quiz" data-id="${q.id}">Delete</button>
        </div>
      </div>`
    ).join('')}</div>`
  );
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function toolsView() {
  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const ss = String(timerSeconds % 60).padStart(2, '0');
  return (
    pageTitle('Study Tools', 'Simple tools to support focused study.') +
    `<div class="grid tool-grid">
      <div class="card">
        <h2>Pomodoro</h2>
        <div class="timer" id="timer">${mm}:${ss}</div>
        <div class="timer-controls">
          <button class="btn primary" data-action="timer-start">Start</button>
          <button class="btn" data-action="timer-reset">Reset</button>
        </div>
      </div>
      <div class="card">
        <h2>Quick Calculator</h2>
        <div class="field"><input id="calcInput" placeholder="e.g. 12*24+5"></div>
        <button class="btn primary" style="margin-top:10px" data-action="calculate">Calculate</button>
        <div id="calcResult" style="font-size:var(--font-subheading);font-weight:800;margin-top:18px">—</div>
      </div>
      <div class="card">
        <h2>Study Checklist</h2>
        <label style="display:block;margin:12px 0"><input type="checkbox"> Review notes</label>
        <label style="display:block;margin:12px 0"><input type="checkbox"> Study flashcards</label>
        <label style="display:block;margin:12px 0"><input type="checkbox"> Take a quiz</label>
      </div>
    </div>`
  );
}

function profileView() {
  const user = communityUser;

  if (!user) {
    return (
      pageTitle(
        'Profile',
        'Your EcE Hub account information.'
      ) +
      `
        <div class="card profile-card">
          <h2>Loading profile...</h2>

          <p class="profile-muted">
            Connecting to your EcE Hub account.
          </p>
        </div>
      `
    );
  }

  const displayName =
    user.displayName ||
    user.username ||
    'Student';

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || 'S';

  const googleLinked = isGoogleLinked();

  return (
    pageTitle(
      'Profile',
      'Manage your EcE Hub account.'
    ) +

    `
      <div class="card profile-card">

        <!-- PROFILE HEADER -->

        <div class="profile-header">

          <div class="profile-avatar">
            ${
              user.avatarUrl
                ? `
                  <img
                    src="${esc(user.avatarUrl)}"
                    alt=""
                    class="profile-avatar-image"
                  >
                `
                : esc(initial)
            }
          </div>

          <div class="profile-heading">

            <h2 class="profile-name">
              ${esc(displayName)}
            </h2>

            <div class="profile-username">
              @${esc(user.username || 'guest')}
            </div>

          </div>

        </div>


        <!-- ACCOUNT STATUS -->

        <div class="profile-account-status">

          <div class="profile-section-title">
            Account
          </div>

          ${
            googleLinked
              ? `
                <div class="profile-linked-status">
                  ✓ Google account linked
                </div>

                ${
                  user.googleEmail
                    ? `
                      <div class="profile-google-email">
                        ${esc(user.googleEmail)}
                      </div>
                    `
                    : ''
                }

                <p class="profile-description">
                  Your EcE Hub account can now be used
                  for cloud synchronization.
                </p>
              `
              : `
                <div class="profile-guest-status">
                  Guest account
                </div>

                <p class="profile-description">
                  You can use EcE Hub without linking
                  Google. Your study progress remains
                  stored locally until you choose to link
                  your account.
                </p>
              `
          }

        </div>


        <!-- ACCOUNT INFORMATION -->

        <div class="profile-information">

          <div class="profile-information-row">
            <span>Username:</span>
            <strong>
              @${esc(user.username || 'guest')}
            </strong>
          </div>

          <div class="profile-information-row">
            <span>Display name:</span>
            <strong>
              ${esc(displayName)}
            </strong>
          </div>

          <div class="profile-information-row">
            <span>User ID:</span>
            <span class="profile-user-id">
              ${esc(user.id || 'guest')}
            </span>
          </div>

        </div>


        <!-- ACTIONS -->

        <div class="profile-actions">

        <button
          type="button"
          class="btn primary"
          data-action="edit-profile"
        >
          Edit profile
        </button>

          ${
            googleLinked
              ? `
                <button
                  class="btn"
                  data-action="unlink-google"
                >
                  Unlink Google account
                </button>
              `
              : `
                <button
                  class="btn"
                  data-action="link-google"
                >
                  Link Google account
                </button>
              `
          }

        </div>

      </div>
    `
  );
}

function settingsView() {
  return (
    pageTitle('Settings', 'Control your workspace preferences.') +
    `<div class="card">
      <h2>Appearance</h2>
      <p style="color:var(--muted)">Switch between light and dark mode using the moon/sun button in the top bar, or the button below.</p>
      <button class="btn" data-action="theme">Toggle theme</button>
    </div>`
  );
}

/* ---------- modals & CRUD ---------- */

function asArray(v) {
  return Array.isArray(v) ? v : [];
}
function cardsToText(cards) {
  return asArray(cards)
    .map(c => Array.isArray(c) ? c.join(' | ') : String(c ?? ''))
    .filter(Boolean)
    .join('\n');
}

function modalForm(type, id) {
  const collectionKey = ({
    class: 'classes',
    book: 'books',
    note: 'notes',
    set: 'sets',
    quiz: 'quizzes'
  })[type] || type;
  const list = Array.isArray(data[collectionKey]) ? data[collectionKey] : [];
  const found = id ? list.find(x => x.id === id) : null;
  const forms = {
    class: [
      'Class',
      `<div class="form-grid two">
        <div class="field"><label>Name</label><input id="f-name" value="${esc(found?.name || '')}"></div>
        <div class="field"><label>Category</label><input id="f-category" value="${esc(found?.category || 'Engineering')}"></div>
      </div>
      <div class="field" style="margin-top:13px"><label>Progress %</label><input id="f-progress" type="number" min="0" max="100" value="${found?.progress ?? 0}"></div>`
    ],
    book: [
    'PDF Reference',
    `
        <div class="form-grid">

        <div class="field">
            <label>Title</label>
            <input
            id="f-title"
            value="${esc(found?.title || '')}"
            placeholder="Book title">
        </div>

        <div class="field">
            <label>Author</label>
            <input
            id="f-author"
            value="${esc(found?.author || '')}"
            placeholder="Author">
        </div>

        <div class="field">
            <label>Course</label>
            <input
            id="f-course"
            value="${esc(found?.course || '')}"
            placeholder="e.g. Circuits 101">
        </div>

        <div class="field">
            <label>Folder</label>

            <select id="f-folder">
            <option value="">Uncategorized</option>

            ${(data.folders || []).map(folder => `
                <option
                value="${folder.id}"
                ${found?.folderId === folder.id ? 'selected' : ''}>
                ${esc(folder.name)}
                </option>
            `).join('')}
            </select>
        </div>

        <div class="field">
            <label>Google Drive / PDF URL</label>
            <input
            id="f-url"
            value="${esc(found?.url || '')}"
            placeholder="Paste the Google Drive or PDF link">
        </div>

        </div>
    `
    ],
    note: [
      'Note',
      `<div class="form-grid">
        <div class="field"><label>Title</label><input id="f-title" value="${esc(found?.title || '')}"></div>
        <div class="field"><label>Subject</label><input id="f-subject" value="${esc(found?.subject || '')}"></div>
        <div class="field"><label>Content</label><textarea id="f-body">${esc(found?.body || '')}</textarea></div>
      </div>`
    ],
    set: [
    'Study Set',
    buildSetFormBody(found)
    ],
    quiz: [
      'Quiz',
      buildQuizFormBody(found)
    ]
  };
  if (!forms[type]) {
    console.error('Unknown modal type:', type);
    return toast('Cannot open form');
  }
  const [title, body] = forms[type];
  openModal(
    `<h2>${id ? 'Edit' : 'New'} ${title}</h2>${body}
     <div class="modal-actions">
       <button class="btn" data-action="close-modal">Cancel</button>
       <button class="btn primary" data-action="save-${type}" data-id="${id || ''}">Save</button>
     </div>`,
    { wide: type === 'quiz' }
  );
}

function buildSetFormBody(found) {
  const cards = Array.isArray(found?.cards) && found.cards.length
    ? found.cards
    : [['', '']];

  const defaultSubject =
    found?.subject ||
    (activeClassId
      ? data.classes.find(c => c.id === activeClassId)?.name || ''
      : '');

  return `
    <div class="form-grid">
      <div class="field">
        <label for="f-title">Study Set Title</label>
        <input
          id="f-title"
          value="${esc(found?.title || '')}"
          placeholder="e.g. Ohm's Law"
        >
      </div>

      <div class="field">
        <label for="f-subject">Subject</label>
        <input
          id="f-subject"
          value="${esc(defaultSubject)}"
          placeholder="e.g. Circuits 101"
        >
      </div>
    </div>

    <div class="set-builder">
      <div class="set-builder-head">
        <div>
          <h3>Flashcards</h3>
          <p>Create your cards by entering a question and its answer separately.</p>
        </div>

        <button
          type="button"
          class="btn primary"
          data-action="add-set-card">
          + Add Card
        </button>
      </div>

      <div id="set-cards">
        ${cards.map((card, i) => setCardBlock(i, card)).join('')}
      </div>

      <div class="set-builder-empty" id="set-cards-empty" ${cards.length ? 'style="display:none"' : ''}>
        <div class="set-empty-icon">▧</div>
        <strong>No flashcards yet</strong>
        <span>Click “Add Card” to create your first question and answer.</span>
      </div>
    </div>
  `;
}

function setCardBlock(index, card = ['', '']) {
  const question = Array.isArray(card) ? card[0] || '' : '';
  const answer = Array.isArray(card) ? card[1] || '' : '';

  return `
    <div class="set-card-editor" data-card-index="${index}">
      <div class="set-card-editor-head">
        <div class="set-card-number">
          <span>${index + 1}</span>
          <strong>Flashcard ${index + 1}</strong>
        </div>

        <button
          type="button"
          class="btn danger set-card-remove"
          data-action="remove-set-card"
          data-index="${index}">
          Remove
        </button>
      </div>

      <div class="set-card-fields">
        <div class="field">
          <label>
            <span class="field-number">Q</span>
            Question
          </label>
          <textarea
            class="set-question"
            placeholder="Type the question students should answer..."
          >${esc(question)}</textarea>
          <small>Write the question or term you want to study.</small>
        </div>

        <div class="field">
          <label>
            <span class="field-number answer">A</span>
            Answer
          </label>
          <textarea
            class="set-answer"
            placeholder="Type the correct answer here..."
          >${esc(answer)}</textarea>
          <small>Write the answer that should appear when the card is revealed.</small>
        </div>
      </div>
    </div>
  `;
}

function collectSetCardsFromForm() {
  const cards = [];

  document.querySelectorAll('#set-cards .set-card-editor').forEach(block => {
    const question = block.querySelector('.set-question')?.value.trim() || '';
    const answer = block.querySelector('.set-answer')?.value.trim() || '';

    if (!question && !answer) return;

    if (question && answer) {
      cards.push([question, answer]);
    }
  });

  return cards;
}

function renumberSetCards() {
  document.querySelectorAll('#set-cards .set-card-editor').forEach((block, i) => {
    block.dataset.cardIndex = i;

    const number = block.querySelector('.set-card-number span');
    const title = block.querySelector('.set-card-number strong');
    const remove = block.querySelector('[data-action="remove-set-card"]');

    if (number) number.textContent = i + 1;
    if (title) title.textContent = `Flashcard ${i + 1}`;
    if (remove) remove.dataset.index = i;
  });
}
/* ---------- friendly quiz builder ---------- */
function buildQuizFormBody(found) {
  const raw = asArray(found?.questions);
  const questions = raw.length
    ? raw
    : [{ q: '', options: ['', '', '', ''], answer: 0 }];
  return `<div class="form-grid">
    <div class="field"><label>Title</label><input id="f-title" value="${esc(found?.title || '')}" placeholder="e.g. Circuits Basics"></div>
    <div class="field"><label>Subject</label><input id="f-subject" value="${esc(found?.subject || '')}" placeholder="e.g. Circuits 101"></div>
  </div>
  <div class="quiz-builder">
    <div class="quiz-builder-head">
      <strong>Questions</strong>
      <button type="button" class="btn" data-action="add-quiz-question">+ Add question</button>
    </div>
    <div id="quiz-questions">
      ${questions.map((q, i) => quizQuestionBlock(i, q)).join('')}
    </div>
  </div>`;
}

function quizQuestionBlock(index, q = { q: '', options: ['', '', '', ''], answer: 0 }) {
  const opts = Array.isArray(q.options) ? q.options : ['', '', '', ''];
  while (opts.length < 4) opts.push('');
  const ans = typeof q.answer === 'number' ? q.answer : 0;
  return `<div class="q-block" data-q-index="${index}">
    <div class="q-block-head">
      <span class="q-num">Question ${index + 1}</span>
      <button type="button" class="btn danger q-remove" data-action="remove-quiz-question" data-index="${index}">Remove</button>
    </div>
    <div class="field">
      <label>Question</label>
      <input class="q-text" value="${esc(q.q || '')}" placeholder="Type the question here…">
    </div>
    <div class="q-options-label">Answer choices — pick the correct one</div>
    <div class="q-options">
      ${[0, 1, 2, 3].map(i => `
        <label class="q-option-row">
          <input type="radio" name="correct-${index}" value="${i}" ${ans === i ? 'checked' : ''} title="Mark as correct">
          <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
          <input class="q-opt" data-opt="${i}" value="${esc(opts[i] || '')}" placeholder="Option ${String.fromCharCode(65 + i)}">
        </label>
      `).join('')}
    </div>
    <p class="q-hint">Tip: click the circle next to the right answer so it highlights in purple.</p>
  </div>`;
}

function renumberQuizBlocks() {
  const blocks = document.querySelectorAll('#quiz-questions .q-block');
  blocks.forEach((block, i) => {
    block.dataset.qIndex = i;
    const num = block.querySelector('.q-num');
    if (num) num.textContent = `Question ${i + 1}`;
    const removeBtn = block.querySelector('[data-action="remove-quiz-question"]');
    if (removeBtn) removeBtn.dataset.index = i;
    block.querySelectorAll('input[type="radio"]').forEach(r => {
      r.name = `correct-${i}`;
    });
  });
}

function collectQuizQuestionsFromForm() {
  const blocks = document.querySelectorAll('#quiz-questions .q-block');
  const questions = [];
  blocks.forEach(block => {
    const text = (block.querySelector('.q-text')?.value || '').trim();
    const options = [...block.querySelectorAll('.q-opt')].map(inp => inp.value.trim());
    const checked = block.querySelector('input[type="radio"]:checked');
    const answer = checked ? +checked.value : 0;
    if (!text && options.every(o => !o)) return; // skip fully empty
    if (!text) return; // need a question
    const filled = options.map((o, i) => o || `Option ${String.fromCharCode(65 + i)}`);
    questions.push({
      q: text,
      options: filled.slice(0, 4),
      answer: Math.max(0, Math.min(3, answer))
    });
  });
  return questions;
}

function saveEntity(type, id) {
  const uid = id || crypto.randomUUID();
  if (type === 'class') {
    const obj = {
      id: uid,
      name: document.querySelector('#f-name').value.trim(),
      category: document.querySelector('#f-category').value.trim(),
      sets: 0,
      cards: 0,
      progress: +document.querySelector('#f-progress').value || 0
    };
    const old = data.classes.find(x => x.id === id);
    if (old) {
      obj.sets = old.sets;
      obj.cards = old.cards;
      Object.assign(old, obj);
    } else data.classes.push(obj);
  }
  if (type === 'book') {
    const obj = {
      id: uid,
      title: document.querySelector('#f-title').value.trim(),
      author: document.querySelector('#f-author').value.trim(),
      course: document.querySelector('#f-course').value.trim(),
      url: document.querySelector('#f-url').value.trim()
    };
    const old = data.books.find(x => x.id === id);
    if (old) Object.assign(old, obj);
    else data.books.push(obj);
  }
  if (type === 'note') {
    const obj = {
      id: uid,
      title: document.querySelector('#f-title').value.trim(),
      subject: document.querySelector('#f-subject').value.trim(),
      body: document.querySelector('#f-body').value.trim(),
      updated: 'Just now'
    };
    const old = data.notes.find(x => x.id === id);
    if (old) Object.assign(old, obj);
    else data.notes.unshift(obj);
  }
if (type === 'set') {
  const cards = collectSetCardsFromForm();

  const obj = {
    id: uid,
    title: document.querySelector('#f-title').value.trim(),
    subject: document.querySelector('#f-subject').value.trim(),
    cards
  };

  const old = data.sets.find(x => x.id === id);

  if (old) {
    Object.assign(old, obj);
  } else {
    data.sets.push(obj);
  }
}
  if (type === 'quiz') {
    const questions = collectQuizQuestionsFromForm();
    if (!questions.length) {
      toast('Add at least one question with text');
      return;
    }
    const obj = {
      id: uid,
      title: document.querySelector('#f-title').value.trim() || 'Untitled Quiz',
      subject: document.querySelector('#f-subject').value.trim() || 'General',
      questions
    };
    const old = data.quizzes.find(x => x.id === id);
    if (old) Object.assign(old, obj);
    else data.quizzes.push(obj);
  }
  save();
  closeModal();
  render();
  toast('Saved successfully');
}

/* ---------- quiz & study ---------- */
function takeQuiz(id) {
  const q = data.quizzes.find(x => x.id === id);
  if (!q) return toast('Quiz not found');
  if (!Array.isArray(q.questions) || q.questions.length === 0) {
    return toast('This quiz has no questions. Edit it and add some first.');
  }
  window.quizState = { id, index: 0, score: 0 };
  renderQuizQuestion(q);
}
function renderQuizQuestion(q) {
  const st = window.quizState;
  if (!q || !Array.isArray(q.questions) || !q.questions.length) {
    closeModal();
    return toast('Quiz has no questions');
  }
  const item = q.questions[st.index];
  if (!item || item.q == null) {
    closeModal();
    return toast('Question data is missing — try Reset Demo Data');
  }
  const options = Array.isArray(item.options) ? item.options : [];
  openModal(
    `<h2>${esc(q.title)}</h2>
     <div style="color:var(--muted);font-size:var(--font-small)">Question ${st.index + 1} of ${q.questions.length}</div>
     <div class="question">${esc(item.q)}</div>
     ${options.map((o, i) =>
       `<button class="option" data-action="answer-quiz" data-index="${i}">${esc(o)}</button>`
     ).join('')}
     <div class="modal-actions"><button class="btn" data-action="close-modal">Cancel</button></div>`
  );
}
function studySet(id) {
  window.studyState = { setId: id, index: 0, revealed: false };
  go('flashcards');
}

async function generateAIFlashcards() {

  console.log('=== AI FLASHCARD GENERATOR STARTED ===');

  const status =
    document.querySelector('#aiFlashcardStatus');

  const button =
    document.querySelector(
      '[data-action="generate-ai-flashcards"]'
    );

  const bookId =
    document.querySelector('#aiFlashcardBook')?.value || '';

  const book =
    data.books?.find(b => b.id === bookId);

  console.log('Book ID:', bookId);
  console.log('Selected book:', book);

  // -----------------------------
  // Validate PDF
  // -----------------------------

  if (!book) {

    if (status) {
      status.textContent =
        'Please select a PDF from your Library.';
    }

    return;
  }

  const driveUrl =
    book.driveUrl ||
    book.url ||
    '';

  console.log('Drive URL:', driveUrl);

  if (!driveUrl) {

    if (status) {
      status.textContent =
        'The selected PDF does not have a Google Drive link.';
    }

    return;
  }

  // -----------------------------
  // Chapters
  // -----------------------------

  const chapters =
    document
      .querySelector('#aiFlashcardChapters')
      ?.value
      .trim() || '';

  console.log('Chapters:', chapters);

  if (!chapters) {

    if (status) {
      status.textContent =
        'Please specify the chapters.';
    }

    return;
  }

  // -----------------------------
  // Card count
  // -----------------------------

  const count =
    Number(
      document.querySelector('#aiFlashcardCount')?.value || 20
    );

  console.log('Count:', count);

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 200
  ) {

    if (status) {
      status.textContent =
        'Please enter between 1 and 200 flashcards.';
    }

    return;
  }

  // -----------------------------
  // Difficulty
  // -----------------------------

  const difficulty =
    document.querySelector('#aiFlashcardDifficulty')?.value ||
    'medium';

  console.log('Difficulty:', difficulty);

  // -----------------------------
  // Instructions
  // -----------------------------

  const instructions =
    document
      .querySelector('#aiFlashcardInstructions')
      ?.value
      .trim() || '';

  console.log('Instructions:', instructions);

  console.log('Status element:', status);
  console.log('Button:', button);

  // -----------------------------
  // Loading state
  // -----------------------------

  if (button) {
    button.disabled = true;
    button.innerHTML = '⏳ Generating...';
  }

  if (status) {
    status.textContent =
      'Preparing your flashcards...';
  }

  // -----------------------------
  // Send request to backend
  // -----------------------------

  try {

    console.log('Sending request to AI backend...');

    const response = await fetch(
      AI_FLASHCARD_API.baseURL +
      AI_FLASHCARD_API.generateEndpoint,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({

          driveUrl,

          chapters,

          cardCount: count,

          difficulty,

          instructions

        })
      }
    );

    console.log(
      'Backend response:',
      response.status
    );

    // -----------------------------
    // Handle server error
    // -----------------------------

    if (!response.ok) {

      let message =
        `Server error (${response.status})`;

      try {

        const errorData =
          await response.json();

        if (errorData?.error) {
          message = errorData.error;
        }

      } catch (_) {}

      throw new Error(message);
    }

    // -----------------------------
    // Parse response
    // -----------------------------

    const result =
      await response.json();

    console.log(
      'AI result:',
      result
    );

    // -----------------------------
    // Validate AI response
    // -----------------------------

    if (
      !result ||
      !Array.isArray(result.cards)
    ) {

      throw new Error(
        'The AI returned an invalid flashcard response.'
      );
    }

    // -----------------------------
    // Success
    // -----------------------------

    if (status) {

      status.textContent =
        `${result.cards.length} flashcards generated.`;

    }

    // -----------------------------
    // Show preview
    // -----------------------------

  closeAIFlashcardGenerator();

  showAIGeneratedFlashcardPreview(
    result,
    {
      title:
        result.title ||
        book.title ||
        'AI Generated Flashcards',

      url:
        driveUrl
    }
  );

  } catch (error) {

    console.error(
      'AI flashcard generation failed:',
      error
    );

    if (status) {

      status.textContent =
        error.message ||
        'Failed to generate flashcards.';

    }

  } finally {

    if (button) {

      button.disabled = false;

      button.innerHTML =
        '✨ Generate Flashcards';

    }

  }
}

function aiFlashcardMakerView() {
  return `
    <section class="ai-flashcard-maker">

      ${pageTitle(
        'AI Flashcard Maker',
        'Create flashcards automatically from a Google Drive PDF.'
      )}

      <div class="card ai-flashcard-panel">

        <div class="ai-flashcard-field">
          <label>Select PDF</label>

          <div class="ai-pdf-search">
            <span class="search-icon">⌕</span>

            <input
              type="text"
              id="aiFlashcardBookSearch"
              class="input"
              placeholder="Search your PDFs..."
              autocomplete="off"
            >
          </div>

          <select id="aiFlashcardBook" class="input">
            <option value="">Choose a PDF from your Library...</option>

            ${(data.books || []).map(book => `
              <option
                value="${esc(book.id)}"
                data-title="${esc((book.title || '').toLowerCase())}">
                ${esc(book.title)}
              </option>
            `).join('')}
          </select>

          <small class="ai-flashcard-help">
            Select a PDF from your Library.
          </small>
        </div>

        <div class="ai-flashcard-field">
          <label>Chapters</label>

          <input
            type="text"
            id="aiFlashcardChapters"
            class="input"
            placeholder="Example: Chapters 2, 3 and 4">
        </div>

        <div class="ai-flashcard-row">

          <div class="ai-flashcard-field">
            <label>Number of cards</label>

            <input
              type="number"
              id="aiFlashcardCount"
              class="input"
              value="20"
              min="1"
              max="100">
          </div>

          <div class="ai-flashcard-field">
            <label>Difficulty</label>

            <select id="aiFlashcardDifficulty" class="input">
              <option value="easy">Easy</option>
              <option value="medium" selected>Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

        </div>

        <div class="ai-flashcard-field">
          <label>Additional instructions</label>

          <textarea
            id="aiFlashcardInstructions"
            class="input"
            rows="4"
            placeholder="Example: Focus on formulas, definitions and important concepts.">
          </textarea>
        </div>

        <div class="ai-flashcard-actions">

          <button
            type="button"
            class="btn"
            data-action="back-to-flashcards">
            Cancel
          </button>

          <button
            type="button"
            class="btn primary"
            data-action="generate-ai-flashcards">
            ✨ Generate Flashcards
          </button>

        </div>

        <div id="aiFlashcardStatus" class="ai-flashcard-status"></div>

      </div>

    </section>
  `;
}

function setupAIFlashcardBookSearch() {
  const searchInput = document.querySelector('#aiFlashcardBookSearch');
  const bookSelect = document.querySelector('#aiFlashcardBook');

  if (!searchInput || !bookSelect) {
    console.warn('AI PDF search elements not found');
    return;
  }

  console.log('AI PDF search initialized');

  // Keep a copy of all books
  const books = Array.isArray(data.books)
    ? [...data.books]
    : [];

  function renderBookOptions(query = '') {
    const selectedId = bookSelect.value;
    const search = query.trim().toLowerCase();

    const filteredBooks = books.filter(book => {
      const title = (book.title || '').toLowerCase();
      const author = (book.author || '').toLowerCase();
      const course = (book.course || '').toLowerCase();

      return (
        !search ||
        title.includes(search) ||
        author.includes(search) ||
        course.includes(search)
      );
    });

    bookSelect.innerHTML = `
      <option value="">
        ${
          search
            ? `Found ${filteredBooks.length} PDF${filteredBooks.length === 1 ? '' : 's'}`
            : 'Choose a PDF from your Library...'
        }
      </option>

      ${filteredBooks.map(book => `
        <option value="${esc(book.id)}">
          ${esc(book.title || 'Untitled PDF')}
        </option>
      `).join('')}
    `;

    // Restore selection if it still exists
    if (
      selectedId &&
      filteredBooks.some(book => book.id === selectedId)
    ) {
      bookSelect.value = selectedId;
    }
  }

  searchInput.addEventListener('input', () => {
    renderBookOptions(searchInput.value);
  });

  // Initial render
  renderBookOptions();

  console.log(
    `AI PDF search loaded ${books.length} PDFs`
  );
}

function showAIGeneratedFlashcardPreview(result, book) {

    // Remove any previous AI preview modal
  document
    .querySelectorAll('.ai-flashcard-modal')
    .forEach(modal => modal.remove());

  // Prevent the page behind the modal from scrolling
  document.body.style.overflow = 'hidden';

  const cards =
    Array.isArray(result.cards)
      ? result.cards
      : [];


  const modal =
    document.createElement('div');

  modal.className =
    'modal-overlay ai-flashcard-modal';


  modal.innerHTML = `
    <div class="modal-card ai-flashcard-preview">

      <div class="modal-header">

        <div>

          <h2>✨ Generated Flashcards</h2>

          <p>
            ${escapeHTML(
              result.title ||
              book.title ||
              'AI Flashcards'
            )}
          </p>

        </div>

        <button
          type="button"
          class="icon-btn"
          data-preview-action="close">
          ×
        </button>

      </div>


      <div class="ai-generated-count">

        ${cards.length}
        flashcards generated

      </div>


      <div class="ai-preview-list">

        ${cards.map((card, index) => {

          const question =
            Array.isArray(card)
              ? card[0]
              : card.question;

          const answer =
            Array.isArray(card)
              ? card[1]
              : card.answer;

          return `

            <div
              class="ai-preview-card"
              data-card-index="${index}">

              <div class="ai-preview-number">
                ${index + 1}
              </div>

              <div class="ai-preview-content">

                <input
                  class="ai-preview-question"
                  value="${escapeAttribute(
                    question || ''
                  )}">

                <textarea
                  class="ai-preview-answer"
                  rows="3">${escapeHTML(
                    answer || ''
                  )}</textarea>

              </div>

            </div>

          `;

        }).join('')}

      </div>


      <div class="modal-footer">

        <button
          type="button"
          class="btn"
          data-preview-action="close">
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          data-preview-action="save">
          💾 Save as Study Set
        </button>

      </div>

    </div>
  `;


  document.body.appendChild(modal);

  /* Close when clicking the dark area outside the card */
  modal.addEventListener('click', event => {

    if (event.target === modal) {

      modal.remove();

      document.body.style.overflow = '';

    }

  });


  modal.querySelectorAll(
    '[data-preview-action="close"]'
  ).forEach(button => {

    button.addEventListener(
      'click',
      () => {

        modal.remove();

        document.body.style.overflow = '';

      }
    );

  });


  modal.querySelector(
    '[data-preview-action="save"]'
  ).addEventListener(
    'click',
    () => saveAIGeneratedSet(
      modal,
      result,
      book
    )
  );

}

function closeAIFlashcardGenerator() {

  document
    .querySelectorAll('.ai-flashcard-generator-modal')
    .forEach(modal => modal.remove());

  document.body.style.overflow = '';

}

function saveAIGeneratedSet(modal, result, book) {

  const cards = [];

  modal.querySelectorAll(
    '.ai-preview-card'
  ).forEach(card => {

    const question =
      card.querySelector(
        '.ai-preview-question'
      )?.value.trim();

    const answer =
      card.querySelector(
        '.ai-preview-answer'
      )?.value.trim();

    if (question && answer) {

      cards.push([
        question,
        answer
      ]);

    }

  });


  if (!cards.length) {

    alert(
      'There are no valid flashcards to save.'
    );

    return;

  }


  const newSet = {

    id:
      'ai-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8),

    title:
      result.title ||
      `${book.title} — AI Flashcards`,

    subject:
      result.subject ||
      'AI Generated',

    description:
      result.description ||
      `AI-generated flashcards from ${book.title}.`,

    cards

  };


  if (!Array.isArray(data.sets)) {
    data.sets = [];
  }


  data.sets.push(newSet);


  save();


  modal.remove();


  route = 'sets';

  render();


  alert(
    `${cards.length} flashcards saved as an editable study set.`
  );

}

function editStudySet(set) {

  const cards = Array.isArray(set.cards)
    ? set.cards
    : [];

  const modal = document.createElement('div');

  modal.className = 'modal-overlay study-set-edit-modal';

  modal.innerHTML = `
    <div class="modal-card study-set-editor">

      <div class="modal-header">

        <div>
          <h2>✏️ Edit Study Set</h2>
          <p>${escapeHTML(set.title || 'Study Set')}</p>
        </div>

        <button
          type="button"
          class="icon-btn"
          data-edit-action="close">
          ×
        </button>

      </div>

      <div class="study-set-editor-body">

        <label>
          Set title
          <input
            type="text"
            class="input"
            id="editSetTitle"
            value="${escapeAttribute(set.title || '')}">
        </label>

        <label>
          Subject
          <input
            type="text"
            class="input"
            id="editSetSubject"
            value="${escapeAttribute(set.subject || '')}">
        </label>

        <div class="edit-cards">

          ${cards.map((card, index) => {

            const question =
              Array.isArray(card)
                ? card[0]
                : card.question || '';

            const answer =
              Array.isArray(card)
                ? card[1]
                : card.answer || '';

            return `
              <div
                class="edit-card"
                data-card-index="${index}">

                <div class="edit-card-header">
                  <strong>Card ${index + 1}</strong>

                  <button
                    type="button"
                    class="btn danger edit-delete-card">
                    🗑️
                  </button>
                </div>

                <input
                  type="text"
                  class="input edit-question"
                  value="${escapeAttribute(question)}"
                  placeholder="Question">

                <textarea
                  class="input edit-answer"
                  rows="3"
                  placeholder="Answer">${escapeHTML(answer)}</textarea>

              </div>
            `;

          }).join('')}

        </div>

      </div>

      <div class="modal-footer">

        <button
          type="button"
          class="btn"
          data-edit-action="close">
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          data-edit-action="save">
          💾 Save Changes
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelectorAll(
    '[data-edit-action="close"]'
  ).forEach(button => {

    button.addEventListener('click', () => {
      modal.remove();
    });

  });

  modal.querySelectorAll(
    '.edit-delete-card'
  ).forEach(button => {

    button.addEventListener('click', () => {

      const card = button.closest('.edit-card');

      if (card) {
        card.remove();
      }

    });

  });

  modal.querySelector(
    '[data-edit-action="save"]'
  )?.addEventListener('click', () => {

    const title =
      modal.querySelector('#editSetTitle')
        ?.value.trim();

    const subject =
      modal.querySelector('#editSetSubject')
        ?.value.trim();

    if (!title) {
      alert('Please enter a title.');
      return;
    }

    const updatedCards = [];

    modal.querySelectorAll(
      '.edit-card'
    ).forEach(card => {

      const question =
        card.querySelector('.edit-question')
          ?.value.trim();

      const answer =
        card.querySelector('.edit-answer')
          ?.value.trim();

      if (question && answer) {
        updatedCards.push([
          question,
          answer
        ]);
      }

    });

    set.title = title;
    set.subject = subject;
    set.cards = updatedCards;

    save();

    modal.remove();

    render();

  });

}

function deleteStudySet(set) {

  const confirmed = confirm(
    `Delete "${set.title}"?\n\nThis cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  data.sets = (data.sets || []).filter(
    existingSet => existingSet.id !== set.id
  );

  save();

  render();

}

function showAIAssistantUnavailable() {
  console.log('Showing AI unavailable modal');

  const existing = document.getElementById('aiUnavailableModal');

  if (existing) {
    existing.remove();
  }

  const modal = document.createElement('div');

  modal.id = 'aiUnavailableModal';

  modal.className = 'modal-overlay';

  modal.innerHTML = `
    <div class="modal ai-unavailable-modal">

      <div class="modal-header">

        <div>
          <h2>AI Assistant Unavailable</h2>
          <p>AI features are currently being updated.</p>
        </div>

        <button
          type="button"
          class="modal-close"
          data-action="close-ai-unavailable"
          aria-label="Close">
          ×
        </button>

      </div>

      <div class="modal-body">

        <div class="ai-unavailable-icon">
          ✨
        </div>

        <h3>AI Assistant is currently unavailable</h3>

        <p>
          We're currently updating the AI Assistant.
          The AI Flashcard Maker is temporarily unavailable.
        </p>

        <p class="muted">
          Please try again later once the update is complete.
        </p>

      </div>

      <div class="modal-footer">

        <button
          type="button"
          class="btn primary"
          data-action="close-ai-unavailable">
          Got it
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  console.log('AI unavailable modal added to DOM');
}

async function communityFetch(
  path,
  options = {}
) {
  const url =
    `${COMMUNITY_API_BASE}${path}`;

  const headers = {
    'Content-Type':
      'application/json',

    ...(options.headers || {})
  };

  /*
   * Use the frontend-held session token.
   */
  const sessionToken =
    localStorage.getItem(
      'ecehub_session_token'
    );

  if (sessionToken) {
    headers.Authorization =
      `Bearer ${sessionToken}`;
  }

  const response =
    await fetch(
      url,
      {
        ...options,

        /*
         * Keep this enabled so existing cookie
         * sessions continue to work where supported.
         */
        credentials: 'include',

        headers
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error =
      new Error(
        data?.error ||
        `Community API request failed (${response.status}).`
      );

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  return data;
}

async function loadCommunityFlashcards() {
  if (communityFlashcardsLoaded) {
    return communityFlashcardSets;
  }

  if (communityFlashcardsLoading) {
    return communityFlashcardSets;
  }

  communityFlashcardsLoading = true;
  communityFlashcardsError = null;

  try {
    communityFlashcardSets = await getCommunityFlashcards({
      limit: 50
    });

    communityFlashcardsLoaded = true;

    console.log(
      'Community flashcard sets loaded:',
      communityFlashcardSets
    );

    return communityFlashcardSets;
  } catch (err) {
    console.error(
      'Failed to load community flashcards:',
      err
    );

    communityFlashcardsError =
      err?.message ||
      'Failed to load flashcard sets.';

    communityFlashcardSets = [];

    return [];
  } finally {
    communityFlashcardsLoading = false;
  }
}

async function initializeCommunitySession() {
  try {
    const data =
      await communityFetch(
        '/api/auth/session',
        {
          method: 'POST'
        }
      );

    if (!data?.user) {
      throw new Error(
        'Community session response did not contain a user.'
      );
    }

    /*
     * Save the session token returned by the Worker.
     */
    if (
      data.sessionToken
    ) {
      localStorage.setItem(
        'ecehub_session_token',
        data.sessionToken
      );
    }

    communityUser =
      normalizeCommunityUser(
        data.user
      );

    communityReady =
      true;

    console.log(
      'Community session initialized:',
      communityUser
    );

    console.log(
      'Community session type:',
      data.existing
        ? 'existing'
        : 'new'
    );

    updateChrome();

    updateCommunityUserUI?.();

    return communityUser;

  } catch (err) {
    console.error(
      'Failed to initialize community session:',
      err
    );

    communityUser =
      null;

    communityReady =
      false;

    updateChrome();

    return null;
  }
}

function updateCommunityUserUI() {
  const profileButtons = document.querySelectorAll(
    '[data-action="open-profile"], [data-action="edit-profile"], .profile-button, .user-avatar'
  );

  profileButtons.forEach(button => {
    if (!communityUser) return;

    const displayName =
      communityUser.displayName ||
      communityUser.username ||
      'EcE Hub User';

    const username = communityUser.username || '';

    button.setAttribute(
      'aria-label',
      `Edit profile: ${displayName}${username ? ` (@${username})` : ''}`
    );

    if (communityUser.avatarUrl) {
      button.style.backgroundImage = `url("${communityUser.avatarUrl}")`;
      button.style.backgroundSize = 'cover';
      button.style.backgroundPosition = 'center';
      button.classList.add('has-avatar');
    }
  });
}

async function getMyProfile() {
  const result = await communityFetch(COMMUNITY_API.profile);

  communityUser =
    normalizeCommunityUser(result.user);

  updateCommunityUserUI();

  return communityUser;
}

async function updateMyProfile(profile) {
  const result = await communityFetch(
    COMMUNITY_API.profile,
    {
      method: 'PATCH',
      body: JSON.stringify(profile)
    }
  );

  communityUser =
    normalizeCommunityUser(result.user);

  updateCommunityUserUI();

  return communityUser;
}

async function checkUsernameAvailability(username) {
  const value = String(username || '').trim();

  if (!value) {
    return {
      available: false,
      reason: 'invalid'
    };
  }

  const url =
    `${COMMUNITY_API.usernameCheck}?username=` +
    encodeURIComponent(value);

  return communityFetch(url);
}

async function getCommunityFlashcards({
  query = '',
  subject = '',
  limit = 20
} = {}) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set('q', query.trim());
  }

  if (subject.trim()) {
    params.set('subject', subject.trim());
  }

  params.set(
    'limit',
    String(Math.min(50, Math.max(1, limit)))
  );

  const path = `/api/flashcards?${params.toString()}`;

  const result = await communityFetch(path);

  return result.sets || [];
}

async function getFlashcardSet(setId) {
  if (!setId) {
    throw new Error('Flashcard set ID is required.');
  }

  const result = await communityFetch(
    `${COMMUNITY_API.flashcards}/${encodeURIComponent(setId)}`
  );

  return result.set || null;
}

async function createFlashcardSet({
  title,
  subject = '',
  description = '',
  visibility = 'public',
  cards
}) {
  const result = await communityFetch(COMMUNITY_API.flashcards, {
    method: 'POST',
    body: JSON.stringify({
      title,
      subject,
      description,
      visibility,
      cards
    })
  });

  return result.set;
}

async function updateFlashcardSet(setId, data) {
  if (!setId) {
    throw new Error('Flashcard set ID is required.');
  }

  const result = await communityFetch(
    `${COMMUNITY_API.flashcards}/${encodeURIComponent(setId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  );

  return result.set;
}

async function deleteFlashcardSet(setId) {
  if (!setId) {
    throw new Error('Flashcard set ID is required.');
  }

  return communityFetch(
    `${COMMUNITY_API.flashcards}/${encodeURIComponent(setId)}`,
    {
      method: 'DELETE'
    }
  );
}

async function getWorkspaceSets() {
  const result = await communityFetch(COMMUNITY_API.workspace);
  return result.sets || [];
}

async function addFlashcardSetToWorkspace(setId) {
  if (!setId) {
    throw new Error('Flashcard set ID is required.');
  }

  return communityFetch(
    `${COMMUNITY_API.workspace}/${encodeURIComponent(setId)}`,
    {
      method: 'POST'
    }
  );
}

async function removeFlashcardSetFromWorkspace(setId) {
  if (!setId) {
    throw new Error('Flashcard set ID is required.');
  }

  return communityFetch(
    `${COMMUNITY_API.workspace}/${encodeURIComponent(setId)}`,
    {
      method: 'DELETE'
    }
  );
}

function communityProfileAvatar() {
  if (!communityUser) {
    return `
      <span class="profile-avatar-fallback">
        ?
      </span>
    `;
  }

  const name =
    communityUser.displayName ||
    communityUser.username ||
    'Student';

  const initial =
    name.trim().charAt(0).toUpperCase() || 'S';

  if (communityUser.avatarUrl) {
    return `
      <img
        src="${esc(communityUser.avatarUrl)}"
        alt=""
        onerror="
          this.style.display='none';
          this.nextElementSibling.style.display='flex';
        "
      >

      <span
        class="profile-avatar-fallback"
        style="display:none;"
      >
        ${esc(initial)}
      </span>
    `;
  }

  return `
    <span class="profile-avatar-fallback">
      ${esc(initial)}
    </span>
  `;
}

async function openCommunityProfileModal() {
  try {
    // Make sure the Cloudflare community session exists.
    if (!communityUser) {
      console.log('Community user missing, initializing session...');
      await initializeCommunitySession();
    }

    if (!communityUser) {
      console.error('Community profile still unavailable after session initialization.');
      showToast?.('Unable to load your community profile.', 'error');
      return;
    }

    const user = communityUser;

    const existing = document.getElementById('community-profile-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');

    modal.id = 'community-profile-modal';
    modal.className = 'modal-backdrop';

    modal.innerHTML = `
  <div class="community-profile-modal-card">

    <div class="community-profile-modal-header">

      <div>
        <h2>Edit profile</h2>

        <p>
          Your community identity and flashcard author profile.
        </p>
      </div>

      <button
        type="button"
        class="community-profile-modal-close"
        data-action="close-community-profile-modal"
        aria-label="Close"
      >
        ×
      </button>

    </div>


    <div class="community-profile-modal-body">

      <!-- PROFILE PREVIEW -->

      <div class="community-profile-preview">

        <div class="community-profile-preview-avatar">
          ${
            user.avatarUrl
              ? `
                <img
                  src="${esc(user.avatarUrl)}"
                  alt=""
                >
              `
              : esc(
                  (
                    user.displayName ||
                    user.username ||
                    'U'
                  )
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                )
          }
        </div>

        <div class="community-profile-preview-info">

          <strong class="community-profile-preview-name">
            ${esc(
              user.displayName ||
              user.username ||
              'Student'
            )}
          </strong>

          <div class="community-profile-preview-username">
            @${esc(user.username || 'guest')}
          </div>

        </div>

      </div>


      <!-- FORM -->

      <form
        id="community-profile-form"
        class="community-profile-form"
      >

        <label class="community-profile-field">

          <span>
            Username
          </span>

          <input
            id="community-profile-username"
            name="username"
            type="text"
            maxlength="24"
            minlength="3"
            pattern="[A-Za-z0-9_]{3,24}"
            value="${esc(user.username || '')}"
            autocomplete="off"
            required
          >

          <small
            id="community-username-status"
            class="community-profile-username-status"
          >
            3–24 letters, numbers, or underscores.
          </small>

        </label>


        <label class="community-profile-field">

          <span>
            Display name
          </span>

          <input
            name="displayName"
            type="text"
            maxlength="80"
            value="${esc(user.displayName || '')}"
          >

        </label>


        <label class="community-profile-field">

          <span>
            Avatar URL
          </span>

          <input
            name="avatarUrl"
            type="url"
            maxlength="500"
            value="${esc(user.avatarUrl || '')}"
            placeholder="https://..."
          >

        </label>


        <label class="community-profile-field">

          <span>
            Bio
          </span>

          <textarea
            name="bio"
            maxlength="500"
            rows="4"
            placeholder="Tell other EcE Hub users a little about yourself."
          >${esc(user.bio || '')}</textarea>

        </label>


        <div
          id="community-profile-error"
          class="community-profile-error"
        ></div>


        <div class="community-profile-modal-actions">

          <button
            type="button"
            class="btn"
            data-action="close-community-profile-modal"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="btn primary"
            id="save-community-profile"
          >
            Save profile
          </button>

        </div>

      </form>

    </div>

  </div>
`;
    document.body.appendChild(modal);

    const form = document.getElementById('community-profile-form');
    const usernameInput = document.getElementById('community-profile-username');
    const usernameStatus = document.getElementById('community-username-status');
    const errorBox = document.getElementById('community-profile-error');
    const saveButton = document.getElementById('save-community-profile');

    let usernameCheckTimer = null;

    usernameInput.addEventListener('input', () => {
      clearTimeout(usernameCheckTimer);

      const username = usernameInput.value.trim();

      usernameStatus.textContent =
        'Checking username...';

      usernameStatus.style.color = 'var(--muted)';

      usernameCheckTimer = setTimeout(async () => {
        try {
          const result = await communityFetch(
            `/api/users/check-username?username=${encodeURIComponent(username)}`
          );

          if (username !== usernameInput.value.trim()) return;

          if (result.available) {
            usernameStatus.textContent = 'Username is available.';
            usernameStatus.style.color = '#16a34a';
          } else {
            usernameStatus.textContent =
              result.reason === 'invalid'
                ? 'Username must be 3–24 letters, numbers, or underscores.'
                : 'That username is already taken.';

            usernameStatus.style.color = '#dc2626';
          }
        } catch (error) {
          usernameStatus.textContent =
            'Unable to check username right now.';

          usernameStatus.style.color = '#dc2626';
        }
      }, 350);
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      errorBox.style.display = 'none';
      saveButton.disabled = true;
      saveButton.textContent = 'Saving...';

      const formData = new FormData(form);

      const payload = {
        username: String(formData.get('username') || '').trim(),
        displayName: String(formData.get('displayName') || '').trim(),
        avatarUrl: String(formData.get('avatarUrl') || '').trim(),
        bio: String(formData.get('bio') || '').trim()
      };

      try {
        const result = await communityFetch('/api/users/me', {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });

        communityUser =
          normalizeCommunityUser(result.user);

        updateCommunityHeader();

        modal.remove();

        render();

        updateCommunityUserUI?.();

        showToast?.('Profile updated successfully.', 'success');

      } catch (error) {
        console.error('Failed to update community profile:', error);

        errorBox.textContent =
          error?.data?.error ||
          error?.message ||
          'Failed to update your profile.';

        errorBox.style.display = 'block';

        saveButton.disabled = false;
        saveButton.textContent = 'Save profile';
      }
    });

    // Close when clicking outside the card.
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.remove();
      }
    });

  } catch (error) {
    console.error('Failed to open community profile:', error);
    showToast?.('Unable to open your profile.', 'error');
  }
}

function setupCommunityProfileForm(modal) {
  const form =
    modal.querySelector('#community-profile-form');

  const usernameInput =
    modal.querySelector('#community-profile-username');

  const usernameStatus =
    modal.querySelector('#community-username-status');

  const errorBox =
    modal.querySelector('#community-profile-error');

  const saveButton =
    modal.querySelector('#community-profile-save');

  let usernameAvailable = false;
  let usernameTimer = null;
  let usernameCheckId = 0;

  async function checkUsername() {
    const username =
      usernameInput.value.trim();

    const currentCheckId =
      ++usernameCheckId;

    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      usernameAvailable = false;

      usernameStatus.textContent =
        'Username must be 3–24 letters, numbers, or underscores.';

      return false;
    }

    if (
      communityUser &&
      username.toLowerCase() ===
        String(communityUser.username || '').toLowerCase()
    ) {
      usernameAvailable = true;

      usernameStatus.textContent =
        'This is your current username.';

      return true;
    }

    usernameStatus.textContent =
      'Checking username...';

    try {
      const result =
        await communityFetch(
          `/api/users/check-username?username=${encodeURIComponent(username)}`
        );

      // Ignore an older request if the username
      // has changed since this request started.
      if (currentCheckId !== usernameCheckId) {
        return false;
      }

      usernameAvailable =
        result.available === true;

      usernameStatus.textContent =
        usernameAvailable
          ? 'Username is available.'
          : 'That username is already taken.';

      return usernameAvailable;

    } catch (error) {
      // Ignore errors from outdated requests.
      if (currentCheckId !== usernameCheckId) {
        return false;
      }

      console.error(
        'Username availability check failed:',
        error
      );

      usernameAvailable = false;

      usernameStatus.textContent =
        'Unable to check username right now.';

      return false;
    }
  }

  usernameInput.addEventListener('input', () => {
    clearTimeout(usernameTimer);

    usernameAvailable = false;

    usernameStatus.textContent =
      'Checking username...';

    usernameTimer = setTimeout(() => {
      checkUsername();
    }, 350);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();

    errorBox.hidden = true;
    errorBox.textContent = '';

    const validUsername =
      await checkUsername();

    if (!validUsername) {
      errorBox.textContent =
        'Please choose an available username.';

      errorBox.hidden = false;
      return;
    }

    const payload = {
      username:
        usernameInput.value.trim(),

      displayName:
        modal
          .querySelector(
            '#community-profile-display-name'
          )
          .value
          .trim(),

      avatarUrl:
        modal
          .querySelector(
            '#community-profile-avatar'
          )
          .value
          .trim(),

      bio:
        modal
          .querySelector(
            '#community-profile-bio'
          )
          .value
          .trim()
    };

    saveButton.disabled = true;
    saveButton.textContent =
      'Saving...';

    try {
      const result =
        await communityFetch(
          '/api/users/me',
          {
            method: 'PATCH',
            body: JSON.stringify(payload)
          }
        );

      if (!result?.user) {
        throw new Error(
          'The server did not return the updated profile.'
        );
      }

      communityUser =
        normalizeCommunityUser(
          result.user
        );

      console.log(
        'Community profile updated:',
        communityUser
      );

      updateCommunityHeader();

      closeCommunityProfileModal();

      if (
        typeof renderCommunityUser ===
        'function'
      ) {
        renderCommunityUser(
          communityUser
        );
      }

      if (
        typeof render === 'function'
      ) {
        render();
      }

    } catch (error) {
      console.error(
        'Community profile update failed:',
        error
      );

      errorBox.textContent =
        error?.data?.error ||
        error?.message ||
        'Could not update your profile.';

      errorBox.hidden = false;

      saveButton.disabled = false;
      saveButton.textContent =
        'Save Profile';
    }
  });
}

function closeCommunityProfileModal() {
  const modal =
    document.getElementById('community-profile-modal');

  if (!modal) return;

  modal.classList.remove('open');

  setTimeout(() => {
    modal.remove();
  }, 180);
}

function updateCommunityHeader() {
  const nameElement =
    document.getElementById('headerName');

  const usernameElement =
    document.getElementById('headerUsername');

  const avatarElement =
    document.getElementById('headerAvatar');

  if (!nameElement || !avatarElement) {
    return;
  }

  const displayName =
    communityUser?.displayName ||
    data.profile?.name ||
    'Student';

  const username =
    communityUser?.username ||
    'guest';

  nameElement.textContent =
    displayName;

  if (usernameElement) {
    usernameElement.textContent =
      `@${username}`;
  }

  if (communityUser?.avatarUrl) {
    avatarElement.innerHTML = `
      <img
        src="${esc(communityUser.avatarUrl)}"
        alt=""
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:50%;
        "
      >
      <span></span>
    `;
  } else {
    avatarElement.innerHTML = `
      ${esc(displayName.charAt(0).toUpperCase())}
      <span></span>
    `;
  }
}

/* ---------- event binding (delegated — works for modals too) ---------- */
function action(a, id, index, el) {
  console.log('ACTION:', a, el);
    if (a === 'clear-community-search') {
    clearCommunitySearch();
    return;
  }

   if (a === 'open-circuit-challenge') {
    window.ExploreGames.startCircuitChallenge();
    return;
  }

 if (a === 'open-electronics-crossword') {
    window.ExploreGames.startElectronicsCrossword();
    return;
  }

  if (a === 'crossword-submit') {
    window.ExploreGames.submitElectronicsCrossword();
    return;
  }

  if (a === 'crossword-reveal') {
    window.ExploreGames.revealElectronicsCrossword();
    return;
  }

  if (a === 'crossword-next') {
    window.ExploreGames.nextElectronicsCrossword();
    return;
  }

  if (a === 'restart-electronics-crossword') {
    window.ExploreGames.restartElectronicsCrossword();
    return;
  }

  if (a === 'exit-electronics-crossword') {
    window.ExploreGames.exitElectronicsCrossword();
    return;
  }

  if (a === 'circuit-submit') {
    window.ExploreGames.submitCircuitAnswer();
    return;
  }

  if (a === 'circuit-show-solution') {
    window.ExploreGames.showCircuitSolution();
    return;
  }

  if (a === 'circuit-next') {
    window.ExploreGames.nextCircuitQuestion();
    return;
  }

  if (a === 'restart-circuit-challenge') {
    window.ExploreGames.restartCircuitChallenge();
    return;
  }

  if (a === 'exit-circuit-challenge') {
    window.ExploreGames.exitCircuitChallenge();
    return;
  }
  
  if (a === 'view-community-user') {
    return openCommunityUserProfile(
      el?.dataset.id || '',
      el?.dataset.username || ''
    );
  }

  if (a === 'view-community-set') {
    return openCommunityFlashcardSet(
      id
    );
  }

  if (a === 'add-community-set') {
    return addCommunitySetToWorkspace(
      id
    );
  }
  if (a === 'search-go') {
    return goSearchResult(el?.dataset.type || '', id, el?.dataset.route || '');
  }
  if (a === 'open-class') {
    activeClassId = id;
    activeSetId = null;
    route = 'classes';
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (a === 'open-set') {
    activeSetId = id;
    // keep activeClassId if set
    if (!activeClassId) {
      const s = data.sets.find(x => x.id === id);
      const cls = s && data.classes.find(c => (c.name || '').toLowerCase() === (s.subject || '').toLowerCase());
      if (cls) activeClassId = cls.id;
    }
    route = 'classes';
    render();
    window.scrollTo(0, 0);
    return;
  }
      if (a === 'edit-profile') {
      console.log('EDIT PROFILE CLICKED');
      openCommunityProfileModal();
      return;
    }

    if (a === 'close-community-profile-modal') {
      closeCommunityProfileModal();
      return;
    }
        if (a === 'save-community-profile') {
    data.profile.name = document.querySelector('#profile-name').value || 'Student';
    data.profile.course = document.querySelector('#profile-course').value || 'EcE Learner';
    save();
    closeModal();
    render();
    toast('Profile updated');
    return;
  }
    /* ==============================
     LIBRARY
     ============================== */

  if (a === 'open-library-folder') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    libraryFolderId = id;
    route = 'library';

    render();
    return;
  }

  if (a === 'back-library') {
    libraryFolderId = null;
    route = 'library';

    render();
    return;
  }

  if (a === 'add-library-folder') {
    openModal(`
      <h2>New Library Folder</h2>

      <div class="field">
        <label for="f-folder-name">
          Folder Name
        </label>

        <input
          id="f-folder-name"
          type="text"
          placeholder="e.g. Circuits"
          autocomplete="off"
        >

        <small>
          Use folders to organize books by subject,
          course, or category.
        </small>
      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-library-folder">
          Create Folder
        </button>

      </div>
    `);

    setTimeout(() => {
      document
        .querySelector('#f-folder-name')
        ?.focus();
    }, 0);

    return;
  }

  if (a === 'save-library-folder') {
    const input =
      document.querySelector('#f-folder-name');

    const name = input?.value.trim();

    if (!name) {
      return toast('Please enter a folder name');
    }

    if (!Array.isArray(data.folders)) {
      data.folders = [];
    }

    const duplicate = data.folders.some(
      f =>
        f.name.toLowerCase() ===
        name.toLowerCase()
    );

    if (duplicate) {
      return toast(
        'A folder with that name already exists'
      );
    }

    data.folders.push({
      id:
        'folder_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(2, 8),

      name
    });

    save();
    closeModal();
    render();

    toast('Folder created');
    return;
  }

  if (a === 'edit-library-folder') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    openModal(`
      <h2>Edit Library Folder</h2>

      <div class="field">
        <label for="f-folder-name">
          Folder Name
        </label>

        <input
          id="f-folder-name"
          value="${esc(folder.name)}"
          autocomplete="off"
        >
      </div>

      <div class="modal-actions">

        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn primary"
          data-action="save-library-folder-edit"
          data-id="${folder.id}">
          Save Changes
        </button>

      </div>
    `);

    return;
  }

  if (a === 'save-library-folder-edit') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    const name =
      document
        .querySelector('#f-folder-name')
        ?.value.trim();

    if (!name) {
      return toast('Please enter a folder name');
    }

    folder.name = name;

    save();
    closeModal();
    render();

    toast('Folder updated');
    return;
  }

  if (a === 'add-book') {
    openBookForm();
    return;
  }

  if (a === 'add-book-to-folder') {
    const folder = data.folders?.find(
      f => f.id === id
    );

    if (!folder) {
      return toast('Folder not found');
    }

    openBookForm(null, folder.id);
    return;
  }

  if (a === 'edit-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      return toast('Book not found');
    }

    openBookForm(book);
    return;
  }

  if (a === 'open-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      return toast('Book not found');
    }

    if (!book.driveUrl) {
      return toast('No PDF link configured');
    }

    window.open(book.driveUrl, '_blank');
    return;
  }
    if (a === 'download-book') {
      const book = data.books?.find(
        b => b.id === id
      );

      if (book) {
        downloadBook(book);
      }

      return;
    }
  if (a === 'delete-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      return toast('Book not found');
    }

    openModal(`
      <div class="delete-modal">

        <div class="delete-modal-icon">
          !
        </div>

        <h2>
          Delete book?
        </h2>

        <p>
          Are you sure you want to delete
          <strong>${esc(book.title)}</strong>?
        </p>

        <p class="delete-warning">
          The book and its PDF link will be
          permanently removed.
        </p>

        <div class="modal-actions">

          <button
            type="button"
            class="btn"
            data-action="close-modal">
            Cancel
          </button>

          <button
            type="button"
            class="btn danger"
            data-action="confirm-delete-book"
            data-id="${book.id}">
            Delete Book
          </button>

        </div>

      </div>
    `);

    return;
  }

  if (a === 'confirm-delete-book') {
    const book = data.books?.find(
      b => b.id === id
    );

    if (!book) {
      closeModal();
      return toast('Book not found');
    }

    data.books = data.books.filter(
      b => b.id !== id
    );

    save();
    closeModal();
    render();

    toast(`"${book.title}" deleted`);
    return;
  }
  if (a === 'back-to-classes') {
    activeClassId = null;
    activeSetId = null;
    route = 'classes';
    render();
    return;
  }
  if (a === 'back-to-class') {
    activeSetId = null;
    route = 'classes';
    render();
    return;
  }
  if (a === 'add-class') return modalForm('class');
  if (a === 'edit-class') return modalForm('class', id);
if (a === 'delete-class') {
  const cls = data.classes.find(x => x.id === id);
  if (!cls) return toast('Class not found');

  openModal(`
    <div class="delete-modal">
      <div class="delete-modal-icon">!</div>

      <h2>Delete subject?</h2>

      <p>
        Are you sure you want to delete
        <strong>${esc(cls.name)}</strong>?
      </p>

      <p class="delete-warning">
        This action cannot be undone.
      </p>

      <div class="modal-actions">
        <button class="btn" data-action="close-modal">
          Cancel
        </button>

        <button
          class="btn danger delete-confirm"
          data-action="confirm-delete-class"
          data-id="${id}">
          Delete Subject
        </button>
      </div>
    </div>
  `);

  return;
}
if (a === 'confirm-delete-class') {
  const cls = data.classes.find(x => x.id === id);

  if (!cls) {
    closeModal();
    return toast('Subject not found');
  }

  data.classes = data.classes.filter(x => x.id !== id);

  save();
  closeModal();
  render();

  toast(`"${cls.name}" deleted`);
  return;
}


if (a === 'save-book') {
  const title = document.querySelector('#f-title')?.value.trim();
  const author = document.querySelector('#f-author')?.value.trim();
  const course = document.querySelector('#f-course')?.value.trim();
  const folderId = document.querySelector('#f-folder')?.value || '';
  const url = document.querySelector('#f-url')?.value.trim();

  if (!title) {
    return toast('Please enter a book title');
  }

  if (!url) {
    return toast('Please enter the PDF or Google Drive link');
  }

  const existing = data.books.find(b => b.id === id);

  if (existing) {
    existing.title = title;
    existing.author = author;
    existing.course = course;
    existing.folderId = folderId;
    existing.url = url;
  } else {
    data.books.push({
      id: 'book_' + Date.now(),
      title,
      author,
      course,
      folderId,
      url
    });
  }

  save();
  closeModal();
  render();

  toast(existing ? 'Book updated' : 'Book added');
  return;
}

  if (a === 'add-note') return modalForm('note');
  if (a === 'edit-note') return modalForm('note', id);
  if (a === 'delete-note') {
    if (confirm('Delete this note?')) {
      data.notes = data.notes.filter(x => x.id !== id);
      save();
      render();
      toast('Note deleted');
    }
    return;
  }
  if (a === 'add-set') return modalForm('set');
  if (a === 'edit-set') return modalForm('set', id);
  if (a === 'delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    return toast('Study set not found');
  }

  const cardCount = Array.isArray(set.cards)
    ? set.cards.length
    : 0;

  openModal(`
    <div class="delete-modal">
      <div class="delete-modal-icon">!</div>

      <h2>Delete study set?</h2>

      <p>
        Are you sure you want to delete
        <strong>${esc(set.title)}</strong>?
      </p>

      <p class="delete-warning">
        This will permanently delete the study set
        and its ${cardCount} flashcard${cardCount === 1 ? '' : 's'}.
      </p>

      <div class="modal-actions">
        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn danger delete-confirm"
          data-action="confirm-delete-set"
          data-id="${id}">
          Delete Study Set
        </button>
      </div>
    </div>
  `);

  return;
}
if (a === 'confirm-delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    closeModal();
    return toast('Study set not found');
  }

  data.sets = data.sets.filter(x => x.id !== id);

  save();
  closeModal();
  render();

  toast(`"${set.title}" deleted`);

  return;
}
  if (a === 'study-set') return studySet(id);
  if (a === 'continue-study') {
    if (data.sets.length) return studySet(data.sets[0].id);
    return toast('No study sets yet — create one first');
  }
  if (a === 'stop-study') {
    window.studyState = null;
    return go('flashcards');
  }
  if (a === 'flip-card') {
    if (!window.studyState) return;
    window.studyState.revealed = !window.studyState.revealed;
    return render();
  }
  if (a === 'next-card') {
    const s = data.sets.find(x => x.id === window.studyState?.setId);
    if (!s) return;
    window.studyState.index = (window.studyState.index + 1) % s.cards.length;
    window.studyState.revealed = false;
    return render();
  }
  if (a === 'prev-card') {
    const s = data.sets.find(x => x.id === window.studyState?.setId);
    if (!s) return;
    window.studyState.index = (window.studyState.index - 1 + s.cards.length) % s.cards.length;
    window.studyState.revealed = false;
    return render();
  }
  if (a === 'delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    return toast('Study set not found');
  }

  openModal(`
    <div class="delete-modal">
      <div class="delete-modal-icon">!</div>

      <h2>Delete study set?</h2>

      <p>
        Are you sure you want to delete
        <strong>${esc(set.title)}</strong>?
      </p>

      <p class="delete-warning">
        All ${Array.isArray(set.cards) ? set.cards.length : 0}
        flashcards in this set will also be deleted.
      </p>

      <div class="modal-actions">
        <button
          type="button"
          class="btn"
          data-action="close-modal">
          Cancel
        </button>

        <button
          type="button"
          class="btn danger delete-confirm"
          data-action="confirm-delete-set"
          data-id="${id}">
          Delete Study Set
        </button>
      </div>
    </div>
  `);

  return;
}
if (a === 'confirm-delete-set') {
  const set = data.sets.find(x => x.id === id);

  if (!set) {
    closeModal();
    return toast('Study set not found');
  }

  data.sets = data.sets.filter(x => x.id !== id);

  save();
  closeModal();
  render();

  toast(`"${set.title}" deleted`);
  return;
}
  if (a === 'add-quiz') return modalForm('quiz');
  if (a === 'add-quiz-question') {
    const container = document.querySelector('#quiz-questions');
    if (!container) return;
    const next = container.querySelectorAll('.q-block').length;
    container.insertAdjacentHTML('beforeend', quizQuestionBlock(next));
    renumberQuizBlocks();
    const last = container.querySelector('.q-block:last-child .q-text');
    if (last) last.focus();
    return;
  }
  if (a === 'remove-quiz-question') {
    const container = document.querySelector('#quiz-questions');
    if (!container) return;
    const blocks = container.querySelectorAll('.q-block');
    if (blocks.length <= 1) {
      toast('Keep at least one question');
      return;
    }
    const block = container.querySelector(`.q-block[data-q-index="${index}"]`)
      || blocks[+index];
    if (block) block.remove();
    renumberQuizBlocks();
    return;
  }
  if (a === 'delete-quiz') {
    if (confirm('Delete this quiz?')) {
      data.quizzes = data.quizzes.filter(x => x.id !== id);
      save();
      render();
      toast('Quiz deleted');
    }
    return;
  }
  if (a === 'take-quiz') return takeQuiz(id);
  if (a === 'answer-quiz') {
    if (!window.quizState) return;
    const q = data.quizzes.find(x => x.id === window.quizState.id);
    if (!q || !Array.isArray(q.questions) || !q.questions.length) {
      closeModal();
      return toast('Quiz data is missing');
    }
    const current = q.questions[window.quizState.index];
    if (current && +index === current.answer) window.quizState.score++;
    window.quizState.index++;
    if (window.quizState.index < q.questions.length) return renderQuizQuestion(q);
    const total = q.questions.length;
    const score = Math.round((window.quizState.score / total) * 100);
    data.activity.unshift({ text: `Completed quiz: ${q.title}`, sub: `Score: ${score}%`, time: 'Just now' });
    data.activity = data.activity.slice(0, 8);
    save();
    openModal(
      `<h2>Quiz complete 🎉</h2>
       <div class="result"><strong>${score}%</strong>
         <p>You got ${window.quizState.score} out of ${total} correct.</p>
       </div>
       <div class="modal-actions"><button class="btn primary" data-action="close-modal">Done</button></div>`
    );
    return;
  }
  if (a.startsWith('save-')) return saveEntity(a.slice(5), id);
  if (a === 'close-modal') return closeModal();
  if (a === 'theme') return toggleTheme();
  if (a === 'classes') return go('classes');
  if (a === 'timer-start') return startTimer();
  if (a === 'timer-reset') return resetTimer();
  if (a === 'calculate') {
    const input = document.querySelector('#calcInput').value.trim();
    const resultEl = document.querySelector('#calcResult');
    if (!input) {
      resultEl.textContent = '—';
      return;
    }
    try {
      // Restrict to basic arithmetic for safety
      if (!/^[\d\s+\-*/().%]+$/.test(input)) throw new Error('Invalid');
      // eslint-disable-next-line no-new-func
      resultEl.textContent = Function(`"use strict"; return (${input})`)();
    } catch {
      resultEl.textContent = 'Invalid';
    }
    return;
  }

  if (a === 'add-set-card') {
    const container = document.querySelector('#set-cards');
    if (!container) return;

    const index = container.querySelectorAll('.set-card-editor').length;

    container.insertAdjacentHTML(
        'beforeend',
        setCardBlock(index, ['', ''])
    );

    renumberSetCards();

    const empty = document.querySelector('#set-cards-empty');
    if (empty) empty.style.display = 'none';

    const cards = container.querySelectorAll('.set-card-editor');
    cards[cards.length - 1]
        ?.querySelector('.set-question')
        ?.focus();

    return;
    }

  if (a === 'remove-set-card') {
    const block = el?.closest('.set-card-editor');

    if (block) {
      block.remove();
    }

    renumberSetCards();

    const container = document.querySelector('#set-cards');
    const empty = document.querySelector('#set-cards-empty');

    if (container && empty) {
      const count = container.querySelectorAll('.set-card-editor').length;
      empty.style.display = count ? 'none' : 'flex';
    }

    return;
  }
  if (a === 'study-builtin') {
    return studyBuiltin(id);
  }

  if (a === 'view-builtin') {
    return studyBuiltin(id);
  }

  if (a === 'exit-builtin-study') {
    window.builtinStudyState = null;
    return go('builtin-flashcards');
  }

  if (a === 'flip-builtin-card') {

    if (!window.builtinStudyState) {
      return;
    }

    window.builtinStudyState.revealed =
      !window.builtinStudyState.revealed;

    return render();
  }

  if (a === 'next-builtin-card') {

    const state = window.builtinStudyState;

    if (!state) {
      return;
    }

    const deck = BUILTIN_FLASHCARDS.find(
      x => x.id === state.deckId
    );

    if (!deck || !deck.cards.length) {
      return;
    }

    state.index =
      (state.index + 1) % deck.cards.length;

    state.revealed = false;

    return render();
  }

  if (a === 'prev-builtin-card') {

    const state = window.builtinStudyState;

    if (!state) {
      return;
    }

    const deck = BUILTIN_FLASHCARDS.find(
      x => x.id === state.deckId
    );

    if (!deck || !deck.cards.length) {
      return;
    }

    state.index =
      (state.index - 1 + deck.cards.length)
      % deck.cards.length;

    state.revealed = false;

    return render();
  }
  if (a === 'open-ai-flashcard-maker') {
    console.log('AI Flashcard Maker clicked');

    if (window.AIassistant?.Available !== true) {
      console.log('AI Assistant unavailable');
      showAIAssistantUnavailable();
      return;
    }

    console.log('AI Assistant available');

    route = 'ai-flashcard-maker';
    render();

    setTimeout(() => {
      setupAIFlashcardBookSearch();
    }, 0);

    window.scrollTo(0, 0);
    return;
  }
  if (a === 'back-to-flashcards') {
    route = 'flashcards';
    render();
    return;
  }
  if (a === 'generate-ai-flashcards') {
    return generateAIFlashcards();
  }
  if (action === 'edit-set') {
    const id = element.dataset.id;

    const set = data.sets?.find(
      s => s.id === id
    );

    if (!set) {
      alert('Study set not found.');
      return;
    }

    editStudySet(set);

    return;
  }

  if (action === 'delete-set') {
    const id = element.dataset.id;

    const set = data.sets?.find(
      s => s.id === id
    );

    if (!set) {
      alert('Study set not found.');
      return;
    }

    deleteStudySet(set);

    return;
  }
  if (a === 'close-ai-unavailable') {
    const modal = document.getElementById('aiUnavailableModal');

    if (modal) {
      modal.remove();
    }

    return;
  }
  if (a === 'unlink-google') {

    unlinkGoogleAccount();

    return;

  }
  if (a === 'link-google') {

    linkGoogleAccount();

    return;

  }
}

/* ---------- timer ---------- */
function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    timerSeconds--;
    if (timerSeconds <= 0) {
      clearInterval(timer);
      timer = null;
      timerSeconds = 0;
      toast('Pomodoro complete!');
    }
    const e = document.querySelector('#timer');
    if (e) {
      e.textContent =
        `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`;
    }
  }, 1000);
}
function resetTimer() {
  clearInterval(timer);
  timer = null;
  timerSeconds = 25 * 60;
  const e = document.querySelector('#timer');
  if (e) e.textContent = '25:00';
}

/* ---------- one-time event delegation (covers content + modals) ---------- */
document.addEventListener('click', e => {
  const actionEl = e.target.closest('[data-action]');

  if (actionEl) {
    e.preventDefault();

    action(
      actionEl.dataset.action,
      actionEl.dataset.id || '',
      actionEl.dataset.index || '',
      actionEl
    );

    return;
  }

  const routeEl = e.target.closest('[data-route]');

  if (routeEl) {
    e.preventDefault();
    go(routeEl.dataset.route);
  }
});

function isMobileNav() {
  return window.matchMedia('(max-width: 850px)').matches;
}
function toggleSidebar() {
  if (isMobileNav()) {
    const open = !document.querySelector('#sidebar').classList.contains('open');
    document.querySelector('#sidebar').classList.toggle('open', open);
    const overlay = document.querySelector('#sidebarOverlay');
    if (overlay) {
      overlay.classList.toggle('show', open);
      overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    document.body.classList.toggle('nav-locked', open);
  } else {
    // Desktop: collapse / expand the fixed sidebar
    document.querySelector('.app-shell').classList.toggle('sidebar-collapsed');
  }
}
function closeSidebar() {
  // Only closes the mobile drawer — does not collapse desktop sidebar
  document.querySelector('#sidebar').classList.remove('open');
  const overlay = document.querySelector('#sidebarOverlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('nav-locked');
}

document.querySelector('#menuButton').addEventListener('click', e => {
  e.stopPropagation();
  toggleSidebar();
});
const overlayEl = document.querySelector('#sidebarOverlay');
if (overlayEl) {
  overlayEl.addEventListener('click', () => closeSidebar());
}
window.addEventListener('resize', () => {
  // reset mobile drawer state when crossing breakpoint
  if (!isMobileNav()) {
    document.querySelector('#sidebar').classList.remove('open');
    if (overlayEl) overlayEl.classList.remove('show');
    document.body.classList.remove('nav-locked');
  }
});
document.querySelector('#themeButton').addEventListener('click', () => toggleTheme());
document.querySelector('#helpButton').addEventListener('click', () =>
  toast('EcE Hub help: use the sidebar to open each system.')
);
document.querySelector('#resetData').addEventListener('click', () => {
  if (confirm('Reset all local EcE Hub data to the demo data?')) {
    data = clone(seed);
    save();
    window.studyState = null;
    go('home');
    toast('Demo data restored');
  }
});
/* ---------- global search ---------- */
/* ---------- global community search ---------- */

let communitySearchRequest = null;

async function performCommunitySearch(query) {
  const q = String(query || '').trim();

  if (!q) {
    go('home');
    return;
  }

  /*
   * Abort an older search if the user submits another one.
   */
  if (communitySearchRequest) {
    communitySearchRequest.abort();
  }

  communitySearchRequest = new AbortController();

  /*
   * Show the search results in the HOME view.
   */
  route = 'home';

  const container = document.querySelector('#app');

  if (container) {
    container.innerHTML = `
      <section class="search-page">
        <div class="search-page-header">
          <button
            type="button"
            class="btn"
            data-action="clear-community-search"
          >
            ← Back
          </button>

          <div>
            <h1>Search</h1>
            <p>
              Searching for
              <strong>${esc(q)}</strong>
            </p>
          </div>
        </div>

        <div class="search-page-loading">
          Searching EcE Hub...
        </div>
      </section>
    `;
  }

  try {
    const response = await communityFetch(
      `/api/search?q=${encodeURIComponent(q)}`,
      {
        method: 'GET',
        signal: communitySearchRequest.signal
      }
    );

    renderCommunitySearchResults(
      response,
      q
    );

  } catch (error) {

    if (error?.name === 'AbortError') {
      return;
    }

    console.error(
      'Community search failed:',
      error
    );

    if (container) {
      container.innerHTML = `
        <section class="search-page">

          <div class="search-page-header">
            <button
              type="button"
              class="btn"
              data-action="clear-community-search"
            >
              ← Back
            </button>

            <div>
              <h1>Search</h1>
              <p>
                Search failed for
                <strong>${esc(q)}</strong>
              </p>
            </div>
          </div>

          <div class="search-empty">
            Unable to search EcE Hub right now.
          </div>

        </section>
      `;
    }
  }
}


function renderCommunitySearchResults(
  result,
  query
) {
  const container =
    document.querySelector('#app');

  if (!container) return;

  const users =
    Array.isArray(result?.users)
      ? result.users
      : [];

  const flashcards =
    Array.isArray(result?.flashcards)
      ? result.flashcards
      : [];

  const total =
    users.length +
    flashcards.length;

  container.innerHTML = `
    <section class="search-page">

      <div class="search-page-header">

        <button
          type="button"
          class="btn"
          data-action="clear-community-search"
        >
          ← Back
        </button>

        <div>
          <h1>Search results</h1>

          <p>
            Results for
            <strong>“${esc(query)}”</strong>
          </p>
        </div>

      </div>


      ${
        total === 0
          ? `
            <div class="search-empty">
              No results found for
              “${esc(query)}”.
            </div>
          `
          : ''
      }


      ${
        users.length
          ? `
            <section class="search-result-section">

              <div class="search-result-section-header">
                <h2>People</h2>
                <span>
                  ${users.length}
                </span>
              </div>

              <div class="search-user-list">

                ${users.map(user => {

                  const name =
                    user.displayName ||
                    user.username ||
                    'Student';

                  const initial =
                    name
                      .trim()
                      .charAt(0)
                      .toUpperCase() ||
                    'S';

                  return `
                    <article
                      class="search-user-card"
                    >

                      <div class="search-user-avatar">

                        ${
                          user.avatarUrl
                            ? `
                              <img
                                src="${esc(user.avatarUrl)}"
                                alt=""
                                onerror="
                                  this.style.display='none';
                                  this.nextElementSibling.style.display='flex';
                                "
                              >

                              <span
                                class="search-avatar-fallback"
                                style="display:none;"
                              >
                                ${esc(initial)}
                              </span>
                            `
                            : `
                              <span
                                class="search-avatar-fallback"
                              >
                                ${esc(initial)}
                              </span>
                            `
                        }

                      </div>


                      <div class="search-user-info">

                        <strong>
                          ${esc(name)}
                        </strong>

                        <span>
                          @${esc(
                            user.username ||
                            'guest'
                          )}
                        </span>

                        ${
                          user.bio
                            ? `
                              <small>
                                ${esc(user.bio)}
                              </small>
                            `
                            : ''
                        }

                      </div>


                      <button
                        type="button"
                        class="btn"
                        data-action="view-community-user"
                        data-id="${esc(user.id)}"
                        data-username="${esc(
                          user.username || ''
                        )}"
                      >
                        View profile
                      </button>

                    </article>
                  `;

                }).join('')}

              </div>

            </section>
          `
          : ''
      }


      ${
        flashcards.length
          ? `
            <section class="search-result-section">

              <div class="search-result-section-header">
                <h2>Flashcards</h2>
                <span>
                  ${flashcards.length}
                </span>
              </div>

              <div class="search-flashcard-list">

                ${flashcards.map(set => {

                  const author =
                    set.author || {};

                  const authorName =
                    author.displayName ||
                    author.username ||
                    'Student';

                  return `
                    <article
                      class="search-flashcard-card"
                    >

                      <div
                        class="search-flashcard-content"
                      >

                        <h3>
                          ${esc(
                            set.title ||
                            'Untitled set'
                          )}
                        </h3>

                        ${
                          set.subject
                            ? `
                              <span
                                class="search-flashcard-subject"
                              >
                                ${esc(
                                  set.subject
                                )}
                              </span>
                            `
                            : ''
                        }

                        ${
                          set.description
                            ? `
                              <p>
                                ${esc(
                                  set.description
                                )}
                              </p>
                            `
                            : ''
                        }

                        <div
                          class="search-flashcard-meta"
                        >
                          <span>
                            ${Number(
                              set.cardCount || 0
                            )} cards
                          </span>

                          <span>
                            by
                            ${esc(authorName)}

                            ${
                              author.username
                                ? `
                                  · @${esc(
                                    author.username
                                  )}
                                `
                                : ''
                            }
                          </span>
                        </div>

                      </div>


                      <div
                        class="search-flashcard-actions"
                      >

                        <button
                          type="button"
                          class="btn"
                          data-action="view-community-set"
                          data-id="${esc(set.id)}"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          class="btn primary"
                          data-action="add-community-set"
                          data-id="${esc(set.id)}"
                        >
                          + Add to Workspace
                        </button>

                      </div>

                    </article>
                  `;

                }).join('')}

              </div>

            </section>
          `
          : ''
      }

    </section>
  `;
}


function clearCommunitySearch() {
  const input =
    document.querySelector('#globalSearch');

  if (input) {
    input.value = '';
  }

  go('home');

  window.scrollTo(0, 0);
}


/*
 * Global search bar.
 *
 * IMPORTANT:
 * Search results are no longer rendered
 * into #searchResults.
 *
 * Pressing ENTER performs a full search
 * and replaces the Home view.
 */

const searchInput =
  document.querySelector('#globalSearch');

if (searchInput) {

  searchInput.addEventListener(
    'keydown',
    event => {

      if (event.key === 'Escape') {
        searchInput.value = '';
        searchInput.blur();
        return;
      }

      if (event.key === 'Enter') {

        event.preventDefault();

        const query =
          searchInput.value.trim();

        if (!query) return;

        performCommunitySearch(query);
      }
    }
  );

}


/*
 * Clear button.
 */

const searchClear =
  document.querySelector('#searchClear');

if (searchClear) {

  searchClear.addEventListener(
    'click',
    event => {

      event.preventDefault();

      clearCommunitySearch();

    }
  );

}

document.addEventListener('click', e => {
  const wrap = document.querySelector('#searchWrap');
  if (wrap && !wrap.contains(e.target)) {
    const panel = document.querySelector('#searchResults');
    if (panel) panel.hidden = true;
  }
});

function getStudyGoalData() {
  const today = new Date();

  // Monday = start of week
  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  startOfWeek.setDate(startOfWeek.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);

    days.push({
      date,
      label: date.toLocaleDateString('en-US', {
        weekday: 'short'
      }),
      studied: false
    });
  }

  /*
   * Use the existing activity data.
   *
   * IMPORTANT:
   * This assumes activity entries contain a date/time field.
   */
  if (Array.isArray(data.activity)) {
    days.forEach(day => {
      const target = day.date.toISOString().slice(0, 10);

      day.studied = data.activity.some(activity => {
        const value =
          activity.date ||
          activity.createdAt ||
          activity.timestamp;

        if (!value) return false;

        const activityDate = new Date(value);

        if (Number.isNaN(activityDate.getTime())) {
          return false;
        }

        return activityDate.toISOString().slice(0, 10) === target;
      });
    });
  }

  const completed = days.filter(day => day.studied).length;

  return {
    completed,
    total: 7,
    percentage: Math.round((completed / 7) * 100),
    days
  };
}

function renderStudyGoal() {
  const goal = getStudyGoalData();

  return `
    <div class="card">
      <div class="section-head">
        <h2>Study Goal</h2>

        <button
          type="button"
          class="btn">
          This Week
        </button>
      </div>

      <p style="color:var(--muted);font-size:var(--font-small);margin-bottom:8px;">
        Keep your streak going!
      </p>

      <div class="goal-big">
        ${goal.completed}
        <span>/ ${goal.total} days</span>
      </div>

      <div class="goal-progress">
        <i style="width:${goal.percentage}%"></i>
      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        color:var(--muted);
        font-size:10px;
      ">
        ${goal.days.map(day => `
          <span>
            ${day.label}${day.studied ? ' ✓' : ''}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}
loadLibraryData();

(async () => {

  await initializeCommunitySession();

  await handleGoogleLinkCallback();

})();
/* ---------- boot ---------- */
render();
