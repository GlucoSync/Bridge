/**
 * Date utility functions
 */
/**
 * Converts various date inputs to a Date object
 *
 * @param date Date input (string, Date object, or timestamp)
 * @returns Date object
 */
export declare function convertDate(date: string | Date | number): Date;
/**
 * Formats a date to ISO string format
 *
 * @param date Date to format
 * @returns ISO string representation
 */
export declare function formatISODate(date: string | Date | number): string;
/**
 * Gets start of day for a given date
 *
 * @param date Date to get start of day for
 * @returns Date object set to start of day
 */
export declare function startOfDay(date: string | Date | number): Date;
/**
 * Gets end of day for a given date
 *
 * @param date Date to get end of day for
 * @returns Date object set to end of day
 */
export declare function endOfDay(date: string | Date | number): Date;
