export function formatBytes(bytes = 0){
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}                         

export function formatDateTime(value) {
    if (!value) return "_";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "_";
    return new Intl.DateTimeFormat("en-SG", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function toLocalDateTimeInput(date = new Date()) {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0, 19);
}

/**
 * Read the local capture date and time from an Insta360 filename such as
 * VID_20260915_155527_00_018.insv. The returned value is suitable for a
 * datetime-local input; timezone conversion happens only when the form submits.
 */
export function captureDateTimeFromFileName(fileName) {
    const match = fileName.match(/^VID_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:_|\.)/i);
    if (!match) return null;

    const [, year, month, day, hour, minute, second] = match;
    const parts = [year, month, day, hour, minute, second].map(Number);
    const [numericYear, numericMonth, numericDay, numericHour, numericMinute, numericSecond] = parts;
    const candidate = new Date(Date.UTC(
        numericYear,
        numericMonth - 1,
        numericDay,
        numericHour,
        numericMinute,
        numericSecond,
    ));

    const isValid = candidate.getUTCFullYear() === numericYear
        && candidate.getUTCMonth() === numericMonth - 1
        && candidate.getUTCDate() === numericDay
        && candidate.getUTCHours() === numericHour
        && candidate.getUTCMinutes() === numericMinute
        && candidate.getUTCSeconds() === numericSecond;

    return isValid
        ? `${year}-${month}-${day}T${hour}:${minute}:${second}`
        : null;
}
