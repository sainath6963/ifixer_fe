// Public service descriptions, not a price list or a bookable service catalog.
export const repairServices = [
  {
    id: 'screen',
    title: 'Screen & display',
    icon: 'screen',
    issue: 'Cracks, flickering, lines or unresponsive touch.',
    detail:
      'Start with a display and touch assessment. Discuss the replacement options suited to your exact phone model before choosing a repair.',
  },
  {
    id: 'battery',
    title: 'Battery replacement',
    icon: 'battery',
    issue: 'Short battery life, unexpected shutdowns or charging concerns.',
    detail:
      'An assessment helps distinguish a worn battery from other power issues. Review the compatible battery options and estimate after diagnosis.',
  },
  {
    id: 'charging',
    title: 'Charging & power',
    icon: 'charging',
    issue: 'An unreliable connection or a phone that won’t power on.',
    detail:
      'The cable, charging port and internal power components can each cause trouble. Identify the source before deciding what needs replacing.',
  },
  {
    id: 'audio',
    title: 'Speaker & microphone',
    icon: 'audio',
    issue: 'Muffled sound, a quiet speaker or calls that are hard to hear.',
    detail:
      'Describe whether the issue happens during calls, recordings or playback. That helps narrow down the component and repair options.',
  },
  {
    id: 'camera',
    title: 'Camera & lens',
    icon: 'camera',
    issue: 'Blurry images, damaged lens glass or camera errors.',
    detail:
      'Lens damage and camera-module faults need different attention. Have the front and rear cameras assessed for your model.',
  },
  {
    id: 'diagnosis',
    title: 'Not sure what’s wrong?',
    icon: 'screen',
    issue: 'An unfamiliar fault, liquid exposure or more than one problem.',
    detail:
      'Start with a diagnosis and explain when the issue began. Repair feasibility, parts and final pricing depend on the condition of the device.',
  },
] as const;

export const repairQuestions = [
  [
    'How much will my repair cost?',
    'The cost depends on your phone model, the fault and the parts required. Ask for an estimate after diagnosis and approve the work before it begins.',
  ],
  [
    'Can you repair my phone model?',
    'Repair options and parts availability vary by model. Share the exact brand and model, along with the issue, before planning a visit.',
  ],
  [
    'How long does a repair take?',
    'Timing depends on diagnosis, the work required and parts availability. Ask for an expected completion time when you review the estimate.',
  ],
  [
    'What should I do before handing over my phone?',
    'Back up your data if the phone allows it. Note the symptoms and any earlier repairs, and ask which accessories to bring. Never share passwords in a public enquiry.',
  ],
  [
    'Is there a warranty on the repair?',
    'Ask which warranty terms apply to the specific part and repair. Review the coverage and exclusions on your repair receipt.',
  ],
] as const;
