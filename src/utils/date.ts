/**
 * Date utility functions
 */

/**
 * Converts various date inputs to a Date object
 *
 * @param date Date input (string, Date object, or timestamp)
 * @returns Date object
 */
export function convertDate(date: string | Date | number): Date {
  if (date instanceof Date) {
    return date;
  }

  if (typeof date === "string") {
    return new Date(date);
  }

  if (typeof date === "number") {
    return new Date(date);
  }

  throw new Error("Invalid date format");
}

/**
 * Formats a date to ISO string format
 *
 * @param date Date to format
 * @returns ISO string representation
 */
export function formatISODate(date: string | Date | number): string {
  const dateObj = convertDate(date);
  return dateObj.toISOString();
}

/**
 * Gets start of day for a given date
 *
 * @param date Date to get start of day for
 * @returns Date object set to start of day
 */
export function startOfDay(date: string | Date | number): Date {
  const dateObj = convertDate(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Gets end of day for a given date
 *
 * @param date Date to get end of day for
 * @returns Date object set to end of day
 */
export function endOfDay(date: string | Date | number): Date {
  const dateObj = convertDate(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}
