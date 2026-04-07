/**
 * Core Essential Vaccine definitions.
 * Each entry describes a multi-dose vaccine series (3+ total doses).
 * - totalDoses: full number of doses in the series
 * - doseLabels: label for each upcoming dose date field shown in the form
 *               (length = totalDoses - 1, because dose 1 = administered_date)
 * - defaultIntervalDays: suggested gap between doses (used for UI hints)
 */

export interface CoreVaccine {
  name: string;
  totalDoses: number;
  doseLabels: string[];
  defaultIntervalDays: number;
}

export const CORE_ESSENTIAL_VACCINES: CoreVaccine[] = [
  {
    name: 'Anti-Rabies',
    totalDoses: 3,
    doseLabels: ['2nd Dose Due Date', '3rd Dose Due Date (Final Booster)'],
    defaultIntervalDays: 21,
  },
  {
    name: 'Parvovirus (Parvo)',
    totalDoses: 4,
    doseLabels: [
      '2nd Dose Due Date',
      '3rd Dose Due Date',
      '4th Dose Due Date (Final Booster)',
    ],
    defaultIntervalDays: 28,
  },
  {
    name: 'Distemper',
    totalDoses: 3,
    doseLabels: ['2nd Dose Due Date', '3rd Dose Due Date (Booster)'],
    defaultIntervalDays: 28,
  },
  {
    name: 'DHPP (5-in-1)',
    totalDoses: 4,
    doseLabels: [
      '2nd Dose Due Date',
      '3rd Dose Due Date',
      '4th Dose Due Date (Annual Booster)',
    ],
    defaultIntervalDays: 28,
  },
  {
    name: 'Leptospirosis',
    totalDoses: 3,
    doseLabels: ['2nd Dose Due Date', '3rd Dose Due Date (Annual)'],
    defaultIntervalDays: 28,
  },
  {
    name: 'Bordetella (Kennel Cough)',
    totalDoses: 3,
    doseLabels: ['2nd Dose Due Date', '3rd Dose Due Date (Annual)'],
    defaultIntervalDays: 14,
  },
  {
    name: 'Feline Panleukopenia (FVRCP)',
    totalDoses: 3,
    doseLabels: ['2nd Dose Due Date', '3rd Dose Due Date (Booster)'],
    defaultIntervalDays: 21,
  },
];

export function getCoreVaccineByName(name: string): CoreVaccine | undefined {
  return CORE_ESSENTIAL_VACCINES.find((v) => v.name === name);
}
