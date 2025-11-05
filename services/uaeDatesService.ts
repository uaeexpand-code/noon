import { type SpecialDate } from '../types';

// Helper function to calculate approximate Islamic holiday dates for a given Gregorian year.
// This is an approximation as the Islamic calendar is lunar and dates depend on moon sighting.
const getApproximateIslamicDate = (baseYear: number, baseDate: Date, targetYear: number): Date => {
  const yearDiff = targetYear - baseYear;
  // The Islamic calendar moves back by approx. 10.875 days each Gregorian year.
  const dayShift = Math.round(yearDiff * -10.875);

  const dateForTargetYear = new Date(baseDate);
  dateForTargetYear.setFullYear(targetYear);
  dateForTargetYear.setDate(dateForTargetYear.getDate() + dayShift);
  
  return dateForTargetYear;
};


// Base year for our calculations
const BASE_YEAR = 2024;

// Base dates for major Islamic holidays in the base year.
const BASE_DATES = {
  RAMADAN_BEGINS: new Date(BASE_YEAR, 2, 11),     // March 11, 2024
  EID_AL_FITR: new Date(BASE_YEAR, 3, 10),        // April 10, 2024
  EID_AL_ADHA: new Date(BASE_YEAR, 5, 16),        // June 16, 2024
  ISLAMIC_NEW_YEAR: new Date(BASE_YEAR, 6, 7),    // July 7, 2024
  PROPHETS_BIRTHDAY: new Date(BASE_YEAR, 8, 15),  // Sep 15, 2024
};

// Note: Islamic holiday dates are approximations. For a real-world app, an API would be better.
export const getSpecialDates = (year: number): SpecialDate[] => {
  return [
    { date: new Date(year, 0, 1), name: "New Year's Day", category: 'Global Event' },
    { date: new Date(year, 1, 14), name: "Valentine's Day", category: 'Commercial' },
    { date: new Date(year, 2, 8), name: "International Women's Day", category: 'Global Event' },
    { date: new Date(year, 2, 21), name: "Mother's Day (UAE)", category: 'Commercial' },
    
    // Dynamically calculate Islamic holidays for the given year
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.RAMADAN_BEGINS, year), name: "Ramadan Begins (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.EID_AL_FITR, year), name: "Eid Al Fitr (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.EID_AL_ADHA, year), name: "Eid Al Adha (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.ISLAMIC_NEW_YEAR, year), name: "Islamic New Year (approx.)", category: 'Religious' },
    { date: getApproximateIslamicDate(BASE_YEAR, BASE_DATES.PROPHETS_BIRTHDAY, year), name: "Prophet's Birthday (approx.)", category: 'Religious' },

    // Other fixed-date events
    { date: new Date(year, 4, 1), name: "Summer Heat Starts", category: 'Season' },
    { date: new Date(year, 5, 21), name: "Father's Day", category: 'Commercial' },
    { date: new Date(year, 6, 15), name: "Amazon Prime Day (approx.)", category: 'E-commerce Sale' },
    { date: new Date(year, 7, 28), name: "Emirati Women's Day", category: 'National Holiday' },
    { date: new Date(year, 7, 20), name: "Back to School Season", category: 'Commercial' },
    { date: new Date(year, 9, 31), name: "Diwali (Commercial)", category: 'Commercial' },
    { date: new Date(year, 10, 1), name: "Start of Cool Weather", category: 'Season' },
    { date: new Date(year, 10, 11), name: "Singles' Day Sale (11.11)", category: 'E-commerce Sale' },
    { date: new Date(year, 10, 29), name: "White/Yellow Friday Sale", category: 'E-commerce Sale' },
    { date: new Date(year, 11, 1), name: "Commemoration Day", category: 'National Holiday' },
    { date: new Date(year, 11, 1), name: "Winter Starts", category: 'Season' },
    { date: new Date(year, 11, 2), name: "UAE National Day", category: 'National Holiday' },
    { date: new Date(year, 11, 3), name: "UAE National Day Holiday", category: 'National Holiday' },
    { date: new Date(year, 11, 12), name: "12.12 Sale", category: 'E-commerce Sale' },
    { date: new Date(year, 11, 15), name: "Dubai Shopping Festival Starts", category: 'Commercial' },
  ];
};
