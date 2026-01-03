export const parseDurationToHours = (duration) => {
  if (!duration) return 0;

  const durationStr = duration.toString().trim();
  if (!durationStr) return 0;

  if (durationStr.includes(':')) {
    const [hours = '0', minutes = '0', seconds = '0'] = durationStr.split(':');
    const parsedHours = parseInt(hours, 10) || 0;
    const parsedMinutes = parseInt(minutes, 10) || 0;
    const parsedSeconds = parseInt(seconds, 10) || 0;
    return parsedHours + parsedMinutes / 60 + parsedSeconds / 3600;
  }

  return Number.isNaN(Number(durationStr)) ? 0 : parseFloat(durationStr);
};

export const estimateHoursFromTimes = (inTime, outTime) => {
  if (!inTime || !outTime) return 8.0;

  const parseTime = (timeStr) => {
    const [hours = '0', minutes = '0'] = timeStr.split(':');
    return (parseInt(hours, 10) || 0) + (parseInt(minutes, 10) || 0) / 60;
  };

  try {
    const start = parseTime(inTime);
    const end = parseTime(outTime);
    let duration = end - start;
    if (duration < 0) duration += 24;
    return Math.max(0, Math.min(duration, 24));
  } catch (error) {
    console.warn('estimateHoursFromTimes failed, falling back to default', error);
    return 8.0;
  }
};
