"use strict";
/**
 * Date utility functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertDate = convertDate;
exports.formatISODate = formatISODate;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
/**
 * Converts various date inputs to a Date object
 *
 * @param date Date input (string, Date object, or timestamp)
 * @returns Date object
 */
function convertDate(date) {
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
function formatISODate(date) {
    const dateObj = convertDate(date);
    return dateObj.toISOString();
}
/**
 * Gets start of day for a given date
 *
 * @param date Date to get start of day for
 * @returns Date object set to start of day
 */
function startOfDay(date) {
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
function endOfDay(date) {
    const dateObj = convertDate(date);
    dateObj.setHours(23, 59, 59, 999);
    return dateObj;
}
