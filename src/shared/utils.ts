export function formatTimestampToArray(timestamp: string | number) {
  const ts = Number(timestamp);
  const date = new Date(ts);

  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format
  const time = `${hours}:${minutes} ${ampm}`;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[date.getDay()];

  return [month, day, year, time, dayOfWeek];
}

export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }
  if (seconds >= 600) { // 10 minutes
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
  }
  return `0m ${seconds}s`;
}

export function formatDisplayTitle(timestamp: string | number): string {
  const [month, day, year, time, dayOfWeek] = formatTimestampToArray(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entryDate = new Date(Number(timestamp));
  const entryDay = new Date(entryDate);
  entryDay.setHours(0, 0, 0, 0);

  const isToday = today.getTime() === entryDay.getTime();

  // Check if it's yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.getTime() === entryDay.getTime();

  const diffDays = Math.floor((today.getTime() - entryDay.getTime()) / (1000 * 60 * 60 * 24));

  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  if (diffDays <= 7) return `${dayOfWeek} ${time}`;
  if (diffDays <= 30) return `${entryDate.toLocaleString('default', { month: 'long' })} ${day} ${time}`;
  if (diffDays <= 365) return `${month}/${day} ${time}`;
  return `${month}/${day} ${year} ${time}`;
}
