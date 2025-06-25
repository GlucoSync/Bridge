"use strict";
/**
 * Unit conversion utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertGlucoseValue = convertGlucoseValue;
exports.formatGlucoseValue = formatGlucoseValue;
const types_1 = require("../types");
/**
 * Conversion factor from mg/dL to mmol/L
 * To convert mg/dL to mmol/L, divide by 18.0182
 */
const MGDL_TO_MMOL_FACTOR = 18.0182;
/**
 * Converts glucose values between different units
 *
 * @param value The glucose value to convert
 * @param fromUnit The unit of the input value
 * @param toUnit The desired output unit
 * @returns The converted value
 */
function convertGlucoseValue(value, fromUnit, toUnit) {
    // If units are the same, no conversion needed
    if (fromUnit === toUnit) {
        return value;
    }
    // Convert from mg/dL to mmol/L
    if (fromUnit === types_1.GlucoseUnit.MGDL && toUnit === types_1.GlucoseUnit.MMOL) {
        return Number((value / MGDL_TO_MMOL_FACTOR).toFixed(1));
    }
    // Convert from mmol/L to mg/dL
    if (fromUnit === types_1.GlucoseUnit.MMOL && toUnit === types_1.GlucoseUnit.MGDL) {
        return Math.round(value * MGDL_TO_MMOL_FACTOR);
    }
    // Should never reach here, but just in case
    throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
}
/**
 * Formats a glucose value with appropriate precision based on unit
 *
 * @param value The glucose value to format
 * @param unit The unit of the value
 * @returns Formatted string
 */
function formatGlucoseValue(value, unit) {
    if (unit === types_1.GlucoseUnit.MMOL) {
        // mmol/L typically shown with 1 decimal place
        return value.toFixed(1);
    }
    else {
        // mg/dL typically shown as whole numbers
        return Math.round(value).toString();
    }
}
