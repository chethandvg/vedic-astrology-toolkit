// Printable Kundli report: sheets, sections and the extension slots the integrator fills.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
export { APP_URL, coordinate, FactList, ReportSection, SectionStatus, Sheet, SubHeading, utcOffsetLabel, type Fact, type ReportSectionProps } from './ReportParts'
export { ReportCover, type ContentsEntry, type ReportCoverProps } from './ReportCover'
export { ReportCharts, ReportPlanetTable } from './ReportCharts'
export { ReportDasha, type ReportDashaProps } from './ReportDasha'
export { ReportOutlook, ReportTransits } from './ReportYear'
export {
  hasSlotContent, ReportStrengths, ReportYogas,
  type ReportStrength, type ReportStrengthsProps, type ReportYoga, type ReportYogasProps,
} from './ReportSlots'
