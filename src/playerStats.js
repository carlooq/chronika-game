export function initialPlayerStats() {
  return {
    totalRuns:0, campaignRuns:0, quickRuns:0, correctAnswers:0,
    totalAnswers:0, totalTimeSeconds:0, categories:{}, modes:{},
    recentRuns:[], lastPlayedAt:0,
  };
}
export function normaliseStats(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    ...initialPlayerStats(), ...source,
    categories:source.categories && typeof source.categories === 'object' ? source.categories : {},
    modes:source.modes && typeof source.modes === 'object' ? source.modes : {},
    recentRuns:Array.isArray(source.recentRuns) ? source.recentRuns.slice(0,8) : [],
  };
}
// Statistics are informative until server-validated multiplayer is introduced.
// A client-sent result must NEVER determine a ranked/competitive prize.
export function applyRunStats(current, run) {
  const before = normaliseStats(current);
  const category = String(run.category || '');
  const type = String(run.type || '');
  const allowedCategories = ['cinema','poland','sport','culture'];
  const allowedModes = ['timeline','earlier','year'];
  if (!allowedCategories.includes(category) || !allowedModes.includes(type)) {
    throw new Error('Nieznany tryb lub kategoria.');
  }
  const rounds = Math.max(1,Math.min(30,Math.floor(Number(run.rounds)||1)));
  const correct = Math.max(0,Math.min(rounds,Math.floor(Number(run.correct)||0)));
  const duration = Math.max(0,Math.min(3600,Math.floor(Number(run.durationSeconds)||0)));
  const wasCampaign = !!run.stageId;
  const categoryStats = before.categories[category] || {};
  const modeStats = before.modes[type] || {};
  const recentRun = {
    category, type, correct, rounds,
    stageId:wasCampaign?String(run.stageId).slice(0,60):'',
    at:Date.now(),
  };
  return {
    ...before,
    totalRuns:before.totalRuns+1,
    campaignRuns:before.campaignRuns+Number(wasCampaign),
    quickRuns:before.quickRuns+Number(!wasCampaign),
    correctAnswers:before.correctAnswers+correct,
    totalAnswers:before.totalAnswers+rounds,
    totalTimeSeconds:before.totalTimeSeconds+duration,
    categories:{
      ...before.categories,
      [category]:{
        played:Number(categoryStats.played||0)+1,
        correct:Number(categoryStats.correct||0)+correct,
        answers:Number(categoryStats.answers||0)+rounds,
      },
    },
    modes:{
      ...before.modes,
      [type]:{
        played:Number(modeStats.played||0)+1,
        correct:Number(modeStats.correct||0)+correct,
        answers:Number(modeStats.answers||0)+rounds,
      },
    },
    recentRuns:[recentRun,...before.recentRuns].slice(0,8),
    lastPlayedAt:recentRun.at,
  };
}
export function accuracyPercent(correct, total) {
  return Number(total) > 0 ? Math.round(100 * Number(correct||0) / Number(total)) : 0;
}
export function formatDuration(seconds) {
  const value = Math.max(0,Number(seconds)||0);
  if (value < 60) return value ? '< 1 min' : '0 min';
  const minutes = Math.floor(value / 60), hours = Math.floor(minutes / 60);
  return hours ? `${hours} godz. ${minutes%60} min` : `${minutes} min`;
}
