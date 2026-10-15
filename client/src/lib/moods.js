// Single source of truth for the five check-in moods (key matches the backend enum).
export const MOODS = [
  { key: 'happy', emoji: '😄', label: 'Great', score: 5, color: '#3b968b' },
  { key: 'neutral', emoji: '🙂', label: 'Good', score: 4, color: '#7bb6a2' },
  { key: 'okay', emoji: '😐', label: 'Okay', score: 3, color: '#d9b25f' },
  { key: 'sad', emoji: '😔', label: 'Low', score: 2, color: '#7b6fc9' },
  { key: 'crying', emoji: '😰', label: 'Struggling', score: 1, color: '#d9485f' },
];

export const moodByKey = (k) => MOODS.find((m) => m.key === k);
export const scoreLabel = (s) => MOODS.find((m) => m.score === s)?.label || '';

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// Helplines shown in the emergency modal and page (India).
export const HELPLINES = [
  { name: 'Tele-MANAS (Govt. of India)', number: '14416', desc: '24/7, free, multiple languages' },
  { name: 'KIRAN Mental Health', number: '1800-599-0019', desc: '24/7 toll-free rehabilitation helpline' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345', desc: '24/7 counselling helpline' },
  { name: 'iCall (TISS)', number: '9152987821', desc: 'Mon–Sat, 8am–10pm' },
  { name: 'Emergency services', number: '112', desc: 'Police, ambulance, fire — immediate danger' },
];
