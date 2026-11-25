export const NOTE_CATEGORIES = [
  ['general', 'General'],
  ['support', 'Support note'],
  ['progress', 'Progress note'],
  ['medication', 'Medication note'],
  ['observation', 'Observation note'],
  ['behavioural', 'Behavioural note'],
  ['moods', 'Moods'],
  ['locked_concern', 'Locked note of concern'],
];
export const BEHAVIOURAL_SUBTYPES = [['positive', 'Positive behaviour'], ['negative', 'Negative behaviour']];
const LEGACY_LABELS = { supports: 'Supports', behaviours: 'Behaviours' };
export const categoryLabel = value => NOTE_CATEGORIES.find(([key]) => key === value)?.[1] || LEGACY_LABELS[value] || 'General';