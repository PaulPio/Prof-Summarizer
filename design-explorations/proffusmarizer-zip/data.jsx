/* global React */
// Mock data for ProfSummarizer · Studio

const COURSES = [
  { id: 'c1', name: 'Cognitive Neuroscience', code: 'PSY 312', color: '#5b5bd6', lecturesCount: 14, instructor: 'Prof. R. Okafor' },
  { id: 'c2', name: 'Macroeconomics II', code: 'ECON 220', color: '#f59e0b', lecturesCount: 9, instructor: 'Prof. M. Hessler' },
  { id: 'c3', name: 'Distributed Systems', code: 'CS 514', color: '#16a34a', lecturesCount: 11, instructor: 'Prof. L. Tanaka' },
  { id: 'c4', name: 'Renaissance Literature', code: 'ENG 401', color: '#db2777', lecturesCount: 6, instructor: 'Prof. A. Bellucci' },
];

// rich Cornell notes for the hero lecture
const HERO_CORNELL = {
  cues: [
    { cue: 'Default Mode Network', at: 142, related: 'fMRI' },
    { cue: 'Resting-state fMRI', at: 367, related: 'BOLD signal' },
    { cue: 'Anti-correlation', at: 612, related: 'Task-positive net' },
    { cue: 'PCC + mPFC hubs', at: 884, related: 'Connectivity' },
    { cue: 'Mind-wandering', at: 1124, related: 'Self-referential' },
    { cue: 'Alzheimer\u2019s pathology', at: 1492, related: 'Amyloid \u03b2' },
    { cue: 'Therapeutic targets', at: 1810, related: 'Translational' },
  ],
  notes: [
    { at: 142, text: 'The Default Mode Network (DMN) is a large-scale brain network most active during passive rest \u2014 not during goal-directed tasks. First characterized by Raichle et al. (2001) as a baseline state.' },
    { at: 367, text: 'Measured via resting-state fMRI: subjects lie still while BOLD signal fluctuations are recorded. Spontaneous low-frequency oscillations (~0.01\u20130.1 Hz) reveal functionally connected regions.' },
    { at: 612, text: 'DMN shows strong anti-correlation with the task-positive network (TPN). When attention engages externally, DMN deactivates \u2014 a hallmark of healthy cognitive switching.' },
    { at: 884, text: 'Core hubs: posterior cingulate cortex (PCC), medial prefrontal cortex (mPFC), angular gyrus, hippocampus. Hub damage \u2192 disproportionate network collapse.' },
    { at: 1124, text: 'Behaviorally linked to mind-wandering, autobiographical memory retrieval, and theory-of-mind. Active during \u201cself-referential\u201d processing.' },
    { at: 1492, text: 'DMN dysfunction implicated in Alzheimer\u2019s: PCC and mPFC are among the first sites of amyloid-\u03b2 plaque deposition. Network disruption may precede clinical symptoms by years.' },
    { at: 1810, text: 'Translational angle: DMN-targeted interventions (TMS, neurofeedback, psychedelics) under active investigation for depression, AD, and addiction.' },
  ],
  summary: 'The Default Mode Network is the brain\u2019s baseline state \u2014 a coordinated set of regions (PCC, mPFC, angular gyrus, hippocampus) active during rest and self-referential thought, anti-correlated with externally-focused attention. Its disruption is a sensitive early marker of Alzheimer\u2019s and a growing target for translational neuroscience.',
};

const HERO_KEY_POINTS = [
  'DMN was discovered by accident \u2014 a "baseline" subtracted from task fMRI turned out to be a coherent network.',
  'Anti-correlation with task-positive network is the canonical signature of healthy cognitive switching.',
  'PCC and mPFC are the network\u2019s "hubs"; damage there cascades disproportionately.',
  'DMN dysfunction predates Alzheimer\u2019s symptoms by an estimated 10\u201315 years on average.',
  'Psychedelics (psilocybin, LSD) appear to acutely "loosen" DMN connectivity \u2014 a possible mechanism for therapeutic ego-dissolution.',
];

const HERO_VOCAB = [
  { term: 'BOLD signal', def: 'Blood-oxygen-level-dependent contrast \u2014 the magnetic signal fMRI uses to indirectly measure neural activity via oxygenation changes.' },
  { term: 'Resting-state fMRI', def: 'fMRI acquired while the subject is awake but not performing a task; reveals intrinsic functional connectivity.' },
  { term: 'Anti-correlation', def: 'A negative temporal correlation between two regions\u2019 activity \u2014 when one is active, the other tends to be deactivated.' },
  { term: 'PCC', def: 'Posterior cingulate cortex \u2014 a major DMN hub at the midline of the parietal lobe.' },
  { term: 'mPFC', def: 'Medial prefrontal cortex \u2014 anterior DMN hub; involved in self-referential processing and value computation.' },
  { term: 'TPN', def: 'Task-positive network \u2014 the constellation of regions (dlPFC, IPS) engaged during externally-focused attention; anti-correlated with DMN.' },
  { term: 'Amyloid-\u03b2', def: 'Misfolded protein fragments that aggregate into plaques in Alzheimer\u2019s disease; preferentially deposit in DMN hubs.' },
  { term: 'Neurofeedback', def: 'A training paradigm using real-time fMRI or EEG to teach voluntary modulation of brain activity.' },
];

const HERO_ACTIONS = [
  'Read Raichle (2001) "A default mode of brain function" before Thursday.',
  'Skim the Greicius et al. (2003) connectivity paper \u2014 just methods + figures.',
  'Add DMN hubs to the anatomy quizlet (PCC, mPFC, angular gyrus).',
  'Office hours Wed 3pm \u2014 ask about hub vs. spoke damage cascades.',
];

const HERO_FLASHCARDS = [
  { term: 'Default Mode Network', def: 'A large-scale brain network most active during passive rest and internal thought, anti-correlated with task-positive attention.' },
  { term: 'Who described the DMN, when?', def: 'Marcus Raichle and colleagues, 2001, in "A default mode of brain function."' },
  { term: 'Two anatomical hubs of the DMN', def: 'Posterior cingulate cortex (PCC) and medial prefrontal cortex (mPFC).' },
  { term: 'What is the BOLD signal?', def: 'Blood-oxygen-level-dependent contrast \u2014 fMRI\u2019s indirect proxy for neural activity via blood oxygenation changes.' },
  { term: 'Why is anti-correlation important?', def: 'It is the signature of healthy switching between internal (DMN) and external (TPN) cognitive modes.' },
  { term: 'How does DMN relate to Alzheimer\u2019s?', def: 'DMN hubs are early sites of amyloid-\u03b2 deposition; network disruption may precede clinical symptoms by ~10\u201315 years.' },
  { term: 'Psychedelics and the DMN', def: 'Psilocybin and LSD acutely reduce DMN connectivity \u2014 a candidate mechanism for therapeutic ego-dissolution.' },
  { term: 'What is resting-state fMRI?', def: 'fMRI acquired during quiet wakefulness without a task; reveals intrinsic functional networks.' },
];

const HERO_QUIZ = [
  {
    q: 'Which pair of regions are considered the two primary "hubs" of the DMN?',
    options: ['Amygdala and hippocampus', 'PCC and mPFC', 'V1 and V4', 'dlPFC and IPS'],
    answer: 1,
    explanation: 'PCC (posterior cingulate) and mPFC (medial prefrontal) are the canonical anatomical hubs; their damage cascades disproportionately through the network.',
  },
  {
    q: 'Anti-correlation between the DMN and TPN is best described as:',
    options: [
      'A pathological signature seen in Alzheimer\u2019s',
      'A measurement artifact of fMRI preprocessing',
      'A hallmark of healthy switching between internal and external attention',
      'A property unique to psychedelic states',
    ],
    answer: 2,
    explanation: 'When external attention engages, DMN deactivates and TPN activates \u2014 the canonical signature of healthy cognitive switching.',
  },
  {
    q: 'Approximately how far in advance of clinical symptoms can DMN dysfunction be detected in at-risk Alzheimer\u2019s patients?',
    options: ['Days', '1\u20132 years', '10\u201315 years', 'It cannot \u2014 dysfunction only appears at diagnosis'],
    answer: 2,
    explanation: 'Subtle DMN changes have been measured in cognitively-normal at-risk individuals roughly a decade before clinical onset.',
  },
  {
    q: 'Which acute effect on the DMN has been observed with psilocybin?',
    options: ['Increased hub connectivity', 'No measurable effect', 'Loosened / reduced connectivity', 'Selective lesioning'],
    answer: 2,
    explanation: 'Psilocybin acutely reduces within-DMN connectivity \u2014 hypothesized to underlie ego-dissolution and therapeutic effects.',
  },
  {
    q: 'BOLD signal measures:',
    options: [
      'Direct electrical activity of single neurons',
      'Glucose uptake in cortical tissue',
      'Local changes in blood oxygenation as a proxy for neural activity',
      'Magnetic dipoles of neurotransmitter molecules',
    ],
    answer: 2,
    explanation: 'BOLD is an indirect, hemodynamic proxy for neural activity \u2014 active regions become locally more oxygenated.',
  },
];

const HERO_CONFUSIONS = [
  { at: 712, note: 'How do they actually compute anti-correlation? Pearson? Partial?' },
  { at: 1402, note: 'Wait \u2014 plaques deposit in hubs because of activity or perfusion?' },
  { at: 1690, note: '???' },
];

const HERO_TRANSCRIPT_SNIPPETS = [
  { at: 90, t: '\u2026so today I want to take you on a tour of what your brain is doing when, technically speaking, it is doing nothing.' },
  { at: 142, t: 'This network is called the Default Mode Network, and we discovered it almost by accident.' },
  { at: 220, t: 'Marcus Raichle was running fMRI experiments in the late 90s, and he noticed something weird in the baseline.' },
  { at: 367, t: 'The trick is resting-state fMRI \u2014 you put someone in the scanner, you ask them to lie still, and you just record.' },
  { at: 480, t: 'And what you find are these slow oscillations, about a tenth of a hertz, that synchronize across distant brain regions.' },
  { at: 612, t: 'Crucially, the DMN is anti-correlated with what we call the task-positive network.' },
  { at: 712, t: 'When attention turns outward, DMN goes quiet. When you mind-wander, it lights back up.' },
  { at: 884, t: 'There are two big hubs: the posterior cingulate cortex, PCC, and the medial prefrontal cortex.' },
  { at: 1010, t: 'And these hubs are like the airports of the brain \u2014 lose one, and traffic everywhere gets disrupted.' },
  { at: 1124, t: 'Behaviorally, DMN activity tracks mind-wandering, autobiographical memory, thinking about other people.' },
  { at: 1280, t: 'It is the substrate of the self, in some sense \u2014 of self-referential thought.' },
  { at: 1402, t: 'Now here is where it gets clinically interesting. In Alzheimer\u2019s disease, amyloid plaques don\u2019t deposit randomly.' },
  { at: 1492, t: 'They preferentially deposit in DMN hubs. PCC, mPFC \u2014 these are among the first sites hit.' },
  { at: 1610, t: 'So DMN dysfunction is becoming one of the earliest detectable biomarkers of Alzheimer\u2019s.' },
  { at: 1690, t: 'There is a fascinating dose-response thing in psilocybin trials that I want to come back to next week.' },
  { at: 1810, t: 'The therapeutic horizon is wide \u2014 TMS, neurofeedback, psychedelics \u2014 all targeting these hubs.' },
  { at: 1920, t: 'I want you to leave today with one image: a network humming when you are not paying attention. That is the self.' },
];

const LECTURES = [
  {
    id: 'l1',
    courseId: 'c1',
    title: 'The Default Mode Network',
    subtitle: 'Why your brain is loudest when you are doing nothing.',
    date: '2026-05-14',
    duration: 2070,        // 34:30
    durationLabel: '34:30',
    confusions: HERO_CONFUSIONS.length,
    flashcards: HERO_FLASHCARDS.length,
    quizScore: null,
    readMins: 8,
    starred: true,
  },
  { id: 'l2', courseId: 'c1', title: 'Synaptic Plasticity, Part II', subtitle: 'LTP, LTD, and the molecular machinery of memory.', date: '2026-05-09', duration: 2940, durationLabel: '49:00', confusions: 1, flashcards: 12, quizScore: 0.8, readMins: 11, starred: false },
  { id: 'l3', courseId: 'c1', title: 'The Visual Cortex', subtitle: 'From retina to V1 to recognition.', date: '2026-05-02', duration: 2580, durationLabel: '43:00', confusions: 0, flashcards: 9, quizScore: 1.0, readMins: 9, starred: false },
  { id: 'l4', courseId: 'c3', title: 'Consensus under Partial Failure', subtitle: 'Paxos, Raft, and why distributed agreement is hard.', date: '2026-05-13', duration: 3300, durationLabel: '55:00', confusions: 5, flashcards: 14, quizScore: 0.6, readMins: 14, starred: true },
  { id: 'l5', courseId: 'c2', title: 'Fiscal Multipliers', subtitle: 'When does a dollar of spending create more than a dollar of output?', date: '2026-05-11', duration: 2700, durationLabel: '45:00', confusions: 2, flashcards: 10, quizScore: 0.7, readMins: 10, starred: false },
  { id: 'l6', courseId: 'c4', title: 'Donne\u2019s Holy Sonnets', subtitle: 'Devotion, doubt, and the metaphysical mode.', date: '2026-05-07', duration: 2820, durationLabel: '47:00', confusions: 0, flashcards: 8, quizScore: null, readMins: 12, starred: false },
  { id: 'l7', courseId: 'c3', title: 'CRDTs and Eventual Consistency', subtitle: 'Convergent replicated data types, conflict-free merging.', date: '2026-04-30', duration: 3120, durationLabel: '52:00', confusions: 3, flashcards: 11, quizScore: 0.85, readMins: 13, starred: false },
  { id: 'l8', courseId: 'c2', title: 'Phillips Curve, Revisited', subtitle: 'Inflation, unemployment, expectations.', date: '2026-04-28', duration: 2640, durationLabel: '44:00', confusions: 1, flashcards: 9, quizScore: 0.9, readMins: 10, starred: false },
];

const VARIANTS = [
  { key: 'document', label: 'Document', sub: 'Linear long-scroll with outline rail', icon: 'document' },
  { key: 'workbench', label: 'Workbench', sub: 'Three-pane IDE', icon: 'workbench' },
  { key: 'tabs', label: 'Tabs', sub: 'Notion-style maximized tabs', icon: 'tabs' },
  { key: 'command', label: 'Command', sub: 'Minimal canvas \u00b7 \u2318K everything', icon: 'command' },
  { key: 'timeline', label: 'Timeline', sub: 'Audio scrubber syncs notes', icon: 'timeline' },
  { key: 'canvas', label: 'Canvas', sub: 'Spatial whiteboard of notes', icon: 'canvas' },
];

window.PSData = {
  COURSES, LECTURES, VARIANTS,
  HERO_CORNELL, HERO_KEY_POINTS, HERO_VOCAB, HERO_ACTIONS,
  HERO_FLASHCARDS, HERO_QUIZ, HERO_CONFUSIONS, HERO_TRANSCRIPT_SNIPPETS,
};
