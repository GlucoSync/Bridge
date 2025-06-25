/**
 * Unit conversion utilities
 */
import { GlucoseUnit } from "../types";
/**
 * Converts glucose values between different units
 *
 * @param value The glucose value to convert
 * @param fromUnit The unit of the input value
 * @param toUnit The desired output unit
 * @returns The converted value
 */
export declare function convertGlucoseValue(value: number, fromUnit: GlucoseUnit, toUnit: GlucoseUnit): number;
/**
 * Formats a glucose value with appropriate precision based on unit
 *
 * @param value The glucose value to format
 * @param unit The unit of the value
 * @returns Formatted string
 */
export declare function formatGlucoseValue(value: number, unit: GlucoseUnit): string;
