import { DocumentPropertyDataType } from '#/document-management/index.js';
import { defineEnum, type EnumType } from '#/enumeration/index.js';

/**
 * TstdlDocumentCategory defines the categories for documents within property management and housing cooperatives.
 * It includes top-level categories and their respective subcategories.
 * Each category is represented as a key in PascalCase (English) and a value in kebab-case (English).
 */
export const TstdlDocumentCategory = defineEnum('TstdlDocumentCategory', {
  // Top-Level Categories (max 8)
  Administration: 'administration',
  Finance: 'finance',
  Maintenance: 'maintenance',
  TenantAndMemberManagement: 'tenant-and-member-management',
  LegalMatters: 'legal-matters',
  Meetings: 'meetings',
  PropertyDevelopment: 'property-development',
  ServiceProviders: 'service-providers',

  // Subcategories (mapped to top-level parents, max 8 per parent)

  // Under Administration
  Contracts: 'contracts',
  GeneralCorrespondence: 'general-correspondence',

  // Under Finance
  Invoices: 'invoices',
  AnnualStatements: 'annual-statements',
  Budgeting: 'budgeting',
  BankStatements: 'bank-statements',

  // Under Maintenance
  RepairAndMaintenance: 'repair-and-maintenance',
  Inspections: 'inspections',
  DamageManagement: 'damage-management',

  // Under TenantAndMemberManagement
  TenantFiles: 'tenant-files',
  MemberFiles: 'member-files',
  CorrespondenceTenantMember: 'correspondence-tenant-member',
  Applications: 'applications',
  HandoverProtocols: 'handover-protocols',

  // Under LegalMatters
  Litigation: 'litigation',
  LegalConsultation: 'legal-consultation',
  ResolutionsAndBylaws: 'resolutions-and-bylaws',

  // Under Meetings
  MeetingDocumentation: 'meeting-documentation',

  // Under PropertyDevelopment
  Planning: 'planning',
  ConstructionProjects: 'construction-projects',
  Permits: 'permits',

  // Under ServiceProviders
  ProviderContracts: 'provider-contracts',
  ProviderCorrespondence: 'provider-correspondence',

  // Sub-subcategories (mapped to subcategory parents, max 5 per parent)

  // Under Contracts
  RentalAgreements: 'rental-agreements',
  PurchaseAgreements: 'purchase-agreements',
  WorkContracts: 'work-contracts',

  // Under AnnualStatements
  FinancialStatements: 'financial-statements',
  OperatingAndHeatingCosts: 'operating-and-heating-costs',

  // Under RepairAndMaintenance
  MaintenancePlans: 'maintenance-plans',
});

/**
 * Type alias for TstdlDocumentCategory for easier use.
 */
type TstdlDocumentCategory = EnumType<typeof TstdlDocumentCategory>;

/**
 * Top-level categories and their parent-child relationships.
 * Top-level categories are mapped to null.
 * Subcategories are mapped to their respective parent category.
 */
export const TstdlCategoryParents = {
  // Top-Level Categories
  [TstdlDocumentCategory.Administration]: null,
  [TstdlDocumentCategory.Finance]: null,
  [TstdlDocumentCategory.Maintenance]: null,
  [TstdlDocumentCategory.TenantAndMemberManagement]: null,
  [TstdlDocumentCategory.LegalMatters]: null,
  [TstdlDocumentCategory.Meetings]: null,
  [TstdlDocumentCategory.PropertyDevelopment]: null,
  [TstdlDocumentCategory.ServiceProviders]: null,

  // Subcategories
  [TstdlDocumentCategory.Contracts]: TstdlDocumentCategory.Administration,
  [TstdlDocumentCategory.GeneralCorrespondence]: TstdlDocumentCategory.Administration,

  [TstdlDocumentCategory.Invoices]: TstdlDocumentCategory.Finance,
  [TstdlDocumentCategory.AnnualStatements]: TstdlDocumentCategory.Finance,
  [TstdlDocumentCategory.Budgeting]: TstdlDocumentCategory.Finance,
  [TstdlDocumentCategory.BankStatements]: TstdlDocumentCategory.Finance,

  [TstdlDocumentCategory.RepairAndMaintenance]: TstdlDocumentCategory.Maintenance,
  [TstdlDocumentCategory.Inspections]: TstdlDocumentCategory.Maintenance,
  [TstdlDocumentCategory.DamageManagement]: TstdlDocumentCategory.Maintenance,

  [TstdlDocumentCategory.TenantFiles]: TstdlDocumentCategory.TenantAndMemberManagement,
  [TstdlDocumentCategory.MemberFiles]: TstdlDocumentCategory.TenantAndMemberManagement,
  [TstdlDocumentCategory.CorrespondenceTenantMember]: TstdlDocumentCategory.TenantAndMemberManagement,
  [TstdlDocumentCategory.Applications]: TstdlDocumentCategory.TenantAndMemberManagement,
  [TstdlDocumentCategory.HandoverProtocols]: TstdlDocumentCategory.TenantAndMemberManagement,

  [TstdlDocumentCategory.Litigation]: TstdlDocumentCategory.LegalMatters,
  [TstdlDocumentCategory.LegalConsultation]: TstdlDocumentCategory.LegalMatters,
  [TstdlDocumentCategory.ResolutionsAndBylaws]: TstdlDocumentCategory.LegalMatters,

  [TstdlDocumentCategory.MeetingDocumentation]: TstdlDocumentCategory.Meetings,

  [TstdlDocumentCategory.Planning]: TstdlDocumentCategory.PropertyDevelopment,
  [TstdlDocumentCategory.ConstructionProjects]: TstdlDocumentCategory.PropertyDevelopment,
  [TstdlDocumentCategory.Permits]: TstdlDocumentCategory.PropertyDevelopment,

  [TstdlDocumentCategory.ProviderContracts]: TstdlDocumentCategory.ServiceProviders,
  [TstdlDocumentCategory.ProviderCorrespondence]: TstdlDocumentCategory.ServiceProviders,

  // Sub-subcategories
  [TstdlDocumentCategory.RentalAgreements]: TstdlDocumentCategory.Contracts,
  [TstdlDocumentCategory.PurchaseAgreements]: TstdlDocumentCategory.Contracts,
  [TstdlDocumentCategory.WorkContracts]: TstdlDocumentCategory.Contracts,

  [TstdlDocumentCategory.FinancialStatements]: TstdlDocumentCategory.AnnualStatements,
  [TstdlDocumentCategory.OperatingAndHeatingCosts]: TstdlDocumentCategory.AnnualStatements,

  [TstdlDocumentCategory.MaintenancePlans]: TstdlDocumentCategory.RepairAndMaintenance,
} as const satisfies Record<TstdlDocumentCategory, TstdlDocumentCategory | null>;

/**
 * Labels for each document category.
 * This object maps each category to a human-readable label in German.
 */
export const TstdlDocumentCategoryLabels = {
  // Top-Level Categories
  [TstdlDocumentCategory.Administration]: 'Allgemeine Verwaltung',
  [TstdlDocumentCategory.Finance]: 'Finanzen',
  [TstdlDocumentCategory.Maintenance]: 'Instandhaltung',
  [TstdlDocumentCategory.TenantAndMemberManagement]: 'Mieter- und Mitgliederverwaltung',
  [TstdlDocumentCategory.LegalMatters]: 'Rechtliches',
  [TstdlDocumentCategory.Meetings]: 'Sitzungen',
  [TstdlDocumentCategory.PropertyDevelopment]: 'Immobilienentwicklung',
  [TstdlDocumentCategory.ServiceProviders]: 'Dienstleister',

  // Subcategories
  [TstdlDocumentCategory.Contracts]: 'Verträge',
  [TstdlDocumentCategory.GeneralCorrespondence]: 'Allgemeine Korrespondenz',

  [TstdlDocumentCategory.Invoices]: 'Rechnungen',
  [TstdlDocumentCategory.AnnualStatements]: 'Jahresabrechnungen',
  [TstdlDocumentCategory.Budgeting]: 'Budgetierung',
  [TstdlDocumentCategory.BankStatements]: 'Kontoauszüge',

  [TstdlDocumentCategory.RepairAndMaintenance]: 'Reparatur und Instandhaltung',
  [TstdlDocumentCategory.Inspections]: 'Inspektionen',
  [TstdlDocumentCategory.DamageManagement]: 'Schadensmanagement',

  [TstdlDocumentCategory.TenantFiles]: 'Mieterakten',
  [TstdlDocumentCategory.MemberFiles]: 'Mitgliederakten',
  [TstdlDocumentCategory.CorrespondenceTenantMember]: 'Mieter-/Mitglieder-Korrespondenz',
  [TstdlDocumentCategory.Applications]: 'Bewerbungen',
  [TstdlDocumentCategory.HandoverProtocols]: 'Übergabeprotokolle',

  [TstdlDocumentCategory.Litigation]: 'Rechtsstreitigkeiten',
  [TstdlDocumentCategory.LegalConsultation]: 'Rechtsberatung',
  [TstdlDocumentCategory.ResolutionsAndBylaws]: 'Beschlüsse und Satzungen',

  [TstdlDocumentCategory.MeetingDocumentation]: 'Sitzungsdokumentation',

  [TstdlDocumentCategory.Planning]: 'Planung',
  [TstdlDocumentCategory.ConstructionProjects]: 'Bauprojekte',
  [TstdlDocumentCategory.Permits]: 'Genehmigungen',

  [TstdlDocumentCategory.ProviderContracts]: 'Dienstleisterverträge',
  [TstdlDocumentCategory.ProviderCorrespondence]: 'Dienstleister-Korrespondenz',

  // Sub-subcategories
  [TstdlDocumentCategory.RentalAgreements]: 'Mietverträge',
  [TstdlDocumentCategory.PurchaseAgreements]: 'Kaufverträge',
  [TstdlDocumentCategory.WorkContracts]: 'Werkverträge',

  [TstdlDocumentCategory.FinancialStatements]: 'Finanzabschlüsse',
  [TstdlDocumentCategory.OperatingAndHeatingCosts]: 'Betriebs- und Heizkostenabrechnungen',

  [TstdlDocumentCategory.MaintenancePlans]: 'Wartungspläne',
} as const satisfies Record<TstdlDocumentCategory, string>;

/**
 * TstdlDocumentType defines the types for documents within property management and housing cooperatives.
 * Each type is associated with a specific category.
 * Each type is represented as a key in PascalCase (English) and a value in kebab-case (English).
 */
export const TstdlDocumentType = defineEnum('TstdlDocumentType', {
  // Document Types under Administration/Contracts/RentalAgreements
  ResidentialRentalAgreement: 'residential-rental-agreement',
  CommercialRentalAgreement: 'commercial-rental-agreement',
  ShortTermRentalAgreement: 'short-term-rental-agreement',
  // Document Types under Administration/Contracts/PurchaseAgreements
  PurchaseAgreementProperty: 'purchase-agreement-property',
  SaleAgreementProperty: 'sale-agreement-property',
  // Document Types under Administration/Contracts/WorkContracts
  WorkOrderContract: 'work-order-contract',
  FrameworkAgreement: 'framework-agreement', // Broader contract type
  // Document Types under Administration/GeneralCorrespondence
  TerminationNotice: 'termination-notice',
  ComplaintLetter: 'complaint-letter',

  // Document Types under Finance/Invoices
  IncomingInvoice: 'incoming-invoice',
  OutgoingInvoice: 'outgoing-invoice',
  PaymentReminder: 'payment-reminder',
  // Document Types under Finance/AnnualStatements/FinancialStatements
  AnnualFinancialStatement: 'annual-financial-statement',
  // Document Types under Finance/AnnualStatements/OperatingAndHeatingCosts
  OperatingCostStatement: 'operating-cost-statement',
  HeatingCostStatement: 'heating-cost-statement',
  // Document Types under Finance/BankStatements
  BankStatement: 'bank-statement',
  // Document Types under Finance/Budgeting
  BudgetPlan: 'budget-plan',

  // Document Types under Maintenance/RepairAndMaintenance
  RepairOrderForm: 'repair-order-form',
  MaintenanceReport: 'maintenance-report',
  // Document Types under Maintenance/Inspections
  InspectionReport: 'inspection-report',
  // Document Types under Maintenance/DamageManagement
  DamageReport: 'damage-report',
  // Document Types under Maintenance/RepairAndMaintenance/MaintenancePlans
  MaintenancePlanDocument: 'maintenance-plan-document',

  // Document Types under TenantAndMemberManagement/TenantFiles
  TenantRegistrationForm: 'tenant-registration-form',
  // Document Types under TenantAndMemberManagement/MemberFiles
  MemberApplication: 'member-application',
  // Document Types under TenantAndMemberManagement/HandoverProtocols
  HandoverProtocolApartment: 'handover-protocol-apartment',
  // Document Types under TenantAndMemberManagement/CorrespondenceTenantMember
  RentAdjustmentNotice: 'rent-adjustment-notice',
  TenantCorrespondenceLetter: 'tenant-correspondence-letter',
  MemberCorrespondenceLetter: 'member-correspondence-letter',

  // Document Types under LegalMatters/Litigation
  CourtOrder: 'court-order',
  LawsuitDocument: 'lawsuit-document',
  // Document Types under LegalMatters/LegalConsultation
  LegalOpinionReport: 'legal-opinion-report',
  // Document Types under LegalMatters/ResolutionsAndBylaws
  OwnerAssociationResolution: 'owner-association-resolution',
  CooperativeBylaws: 'cooperative-bylaws',

  // Document Types under Meetings/MeetingDocumentation
  MeetingMinutes: 'meeting-minutes',
  MeetingInvitation: 'meeting-invitation',
  MeetingAgenda: 'meeting-agenda',

  // Document Types under PropertyDevelopment/Planning
  FeasibilityStudy: 'feasibility-study',
  ArchitecturalPlan: 'architectural-plan',
  // Document Types under PropertyDevelopment/Permits
  BuildingPermitDocument: 'building-permit-document',
  DemolitionPermit: 'demolition-permit',
  // Document Types under PropertyDevelopment/ConstructionProjects
  ConstructionSchedule: 'construction-schedule',
  ConstructionDocumentation: 'construction-documentation',

  // Document Types under ServiceProviders/ProviderContracts
  ServiceContract: 'service-contract',
  ServiceLevelAgreement: 'service-level-agreement',
  // Document Types under ServiceProviders/ProviderCorrespondence
  ProviderCommunication: 'provider-communication',
});

/**
 * Type alias for TstdlDocumentType for easier use.
 */
type TstdlDocumentType = EnumType<typeof TstdlDocumentType>;

/**
 * Labels for each document type.
 * This object maps each type to a human-readable label in German.
 */
export const TstdlDocumentTypeLabels = {
  [TstdlDocumentType.ResidentialRentalAgreement]: 'Wohnraummietvertrag',
  [TstdlDocumentType.CommercialRentalAgreement]: 'Gewerbemietvertrag',
  [TstdlDocumentType.ShortTermRentalAgreement]: 'Kurzzeitmietvertrag',
  [TstdlDocumentType.PurchaseAgreementProperty]: 'Kaufvertrag Immobilie',
  [TstdlDocumentType.SaleAgreementProperty]: 'Verkaufsvertrag Immobilie',
  [TstdlDocumentType.WorkOrderContract]: 'Werkauftragsvertrag',
  [TstdlDocumentType.FrameworkAgreement]: 'Rahmenvertrag',
  [TstdlDocumentType.TerminationNotice]: 'Kündigungsschreiben',
  [TstdlDocumentType.ComplaintLetter]: 'Beschwerdeschreiben',

  [TstdlDocumentType.IncomingInvoice]: 'Eingangsrechnung',
  [TstdlDocumentType.OutgoingInvoice]: 'Ausgangsrechnung',
  [TstdlDocumentType.PaymentReminder]: 'Zahlungserinnerung',
  [TstdlDocumentType.AnnualFinancialStatement]: 'Jahresfinanzabschluss',
  [TstdlDocumentType.OperatingCostStatement]: 'Betriebskostenabrechnung',
  [TstdlDocumentType.HeatingCostStatement]: 'Heizkostenabrechnung',
  [TstdlDocumentType.BankStatement]: 'Kontoauszug',
  [TstdlDocumentType.BudgetPlan]: 'Budgetplan',

  [TstdlDocumentType.RepairOrderForm]: 'Reparaturauftragsformular',
  [TstdlDocumentType.MaintenanceReport]: 'Instandhaltungsbericht',
  [TstdlDocumentType.InspectionReport]: 'Inspektionsbericht',
  [TstdlDocumentType.DamageReport]: 'Schadensmeldung',
  [TstdlDocumentType.MaintenancePlanDocument]: 'Wartungsplandokument',

  [TstdlDocumentType.TenantRegistrationForm]: 'Mieteranmeldeformular',
  [TstdlDocumentType.MemberApplication]: 'Mitgliederantrag',
  [TstdlDocumentType.HandoverProtocolApartment]: 'Wohnungsübergabeprotokoll',
  [TstdlDocumentType.RentAdjustmentNotice]: 'Mietanpassungsschreiben',
  [TstdlDocumentType.TenantCorrespondenceLetter]: 'Mieter-Korrespondenzschreiben',
  [TstdlDocumentType.MemberCorrespondenceLetter]: 'Mitglieder-Korrespondenzschreiben',

  [TstdlDocumentType.CourtOrder]: 'Gerichtsbeschluss',
  [TstdlDocumentType.LawsuitDocument]: 'Gerichtsdokument',
  [TstdlDocumentType.LegalOpinionReport]: 'Rechtsgutachten',
  [TstdlDocumentType.OwnerAssociationResolution]: 'Wohnungseigentümergemeinschafts-Beschluss',
  [TstdlDocumentType.CooperativeBylaws]: 'Genossenschaftssatzung',

  [TstdlDocumentType.MeetingMinutes]: 'Sitzungsprotokoll',
  [TstdlDocumentType.MeetingInvitation]: 'Sitzungseinladung',
  [TstdlDocumentType.MeetingAgenda]: 'Sitzungstagesordnung',

  [TstdlDocumentType.FeasibilityStudy]: 'Machbarkeitsstudie',
  [TstdlDocumentType.ArchitecturalPlan]: 'Architekturplan',
  [TstdlDocumentType.BuildingPermitDocument]: 'Baugenehmigungsdokument',
  [TstdlDocumentType.DemolitionPermit]: 'Abrissgenehmigung',
  [TstdlDocumentType.ConstructionSchedule]: 'Bauzeitenplan',
  [TstdlDocumentType.ConstructionDocumentation]: 'Baudokumentation',

  [TstdlDocumentType.ServiceContract]: 'Dienstleistungsvertrag',
  [TstdlDocumentType.ServiceLevelAgreement]: 'Service-Level-Agreement',
  [TstdlDocumentType.ProviderCommunication]: 'Dienstleister-Kommunikation',
} as const satisfies Record<TstdlDocumentType, string>;

/**
 * TstdlDocumentTypeCategories maps each document type to its most granular category.
 */
export const TstdlDocumentTypeCategories = {
  [TstdlDocumentType.ResidentialRentalAgreement]: TstdlDocumentCategory.RentalAgreements,
  [TstdlDocumentType.CommercialRentalAgreement]: TstdlDocumentCategory.RentalAgreements,
  [TstdlDocumentType.ShortTermRentalAgreement]: TstdlDocumentCategory.RentalAgreements,
  [TstdlDocumentType.PurchaseAgreementProperty]: TstdlDocumentCategory.PurchaseAgreements,
  [TstdlDocumentType.SaleAgreementProperty]: TstdlDocumentCategory.PurchaseAgreements,
  [TstdlDocumentType.WorkOrderContract]: TstdlDocumentCategory.WorkContracts,
  [TstdlDocumentType.FrameworkAgreement]: TstdlDocumentCategory.Contracts,
  [TstdlDocumentType.TerminationNotice]: TstdlDocumentCategory.GeneralCorrespondence,
  [TstdlDocumentType.ComplaintLetter]: TstdlDocumentCategory.GeneralCorrespondence,

  [TstdlDocumentType.IncomingInvoice]: TstdlDocumentCategory.Invoices,
  [TstdlDocumentType.OutgoingInvoice]: TstdlDocumentCategory.Invoices,
  [TstdlDocumentType.PaymentReminder]: TstdlDocumentCategory.Invoices,
  [TstdlDocumentType.AnnualFinancialStatement]: TstdlDocumentCategory.FinancialStatements,
  [TstdlDocumentType.OperatingCostStatement]: TstdlDocumentCategory.OperatingAndHeatingCosts,
  [TstdlDocumentType.HeatingCostStatement]: TstdlDocumentCategory.OperatingAndHeatingCosts,
  [TstdlDocumentType.BankStatement]: TstdlDocumentCategory.BankStatements,
  [TstdlDocumentType.BudgetPlan]: TstdlDocumentCategory.Budgeting,

  [TstdlDocumentType.RepairOrderForm]: TstdlDocumentCategory.RepairAndMaintenance,
  [TstdlDocumentType.MaintenanceReport]: TstdlDocumentCategory.RepairAndMaintenance,
  [TstdlDocumentType.InspectionReport]: TstdlDocumentCategory.Inspections,
  [TstdlDocumentType.DamageReport]: TstdlDocumentCategory.DamageManagement,
  [TstdlDocumentType.MaintenancePlanDocument]: TstdlDocumentCategory.MaintenancePlans,

  [TstdlDocumentType.TenantRegistrationForm]: TstdlDocumentCategory.TenantFiles,
  [TstdlDocumentType.MemberApplication]: TstdlDocumentCategory.MemberFiles,
  [TstdlDocumentType.HandoverProtocolApartment]: TstdlDocumentCategory.HandoverProtocols,
  [TstdlDocumentType.RentAdjustmentNotice]: TstdlDocumentCategory.CorrespondenceTenantMember,
  [TstdlDocumentType.TenantCorrespondenceLetter]: TstdlDocumentCategory.CorrespondenceTenantMember,
  [TstdlDocumentType.MemberCorrespondenceLetter]: TstdlDocumentCategory.CorrespondenceTenantMember,

  [TstdlDocumentType.CourtOrder]: TstdlDocumentCategory.Litigation,
  [TstdlDocumentType.LawsuitDocument]: TstdlDocumentCategory.Litigation,
  [TstdlDocumentType.LegalOpinionReport]: TstdlDocumentCategory.LegalConsultation,
  [TstdlDocumentType.OwnerAssociationResolution]: TstdlDocumentCategory.ResolutionsAndBylaws,
  [TstdlDocumentType.CooperativeBylaws]: TstdlDocumentCategory.ResolutionsAndBylaws,

  [TstdlDocumentType.MeetingMinutes]: TstdlDocumentCategory.MeetingDocumentation,
  [TstdlDocumentType.MeetingInvitation]: TstdlDocumentCategory.MeetingDocumentation,
  [TstdlDocumentType.MeetingAgenda]: TstdlDocumentCategory.MeetingDocumentation,

  [TstdlDocumentType.FeasibilityStudy]: TstdlDocumentCategory.Planning,
  [TstdlDocumentType.ArchitecturalPlan]: TstdlDocumentCategory.Planning,
  [TstdlDocumentType.BuildingPermitDocument]: TstdlDocumentCategory.Permits,
  [TstdlDocumentType.DemolitionPermit]: TstdlDocumentCategory.Permits,
  [TstdlDocumentType.ConstructionSchedule]: TstdlDocumentCategory.ConstructionProjects,
  [TstdlDocumentType.ConstructionDocumentation]: TstdlDocumentCategory.ConstructionProjects,

  [TstdlDocumentType.ServiceContract]: TstdlDocumentCategory.ProviderContracts,
  [TstdlDocumentType.ServiceLevelAgreement]: TstdlDocumentCategory.ProviderContracts,
  [TstdlDocumentType.ProviderCommunication]: TstdlDocumentCategory.ProviderCorrespondence,
} as const satisfies Record<TstdlDocumentType, TstdlDocumentCategory>;

export const TstdlDocumentProperty = defineEnum('TstdlDocumentProperty', {
  Correspondent: 'correspondent',
  HasCorrespondent: 'has-correspondent',
  EffectiveDate: 'effective-date', // Date from which the document or its terms are active
  ExpiryDate: 'expiry-date', // Date on which the document or its terms expire
  ReferenceNumber: 'reference-number', // Generic reference (e.g., file number, internal ID)
  RealEstate: 'real-estate', // Identifier for the property (e.g., address, unit number)
  TenantId: 'tenant-id', // Identifier for a tenant
  ContractNumber: 'contract-number', // Specific for contracts
  InvoiceNumber: 'invoice-number', // Specific for invoices
  Amount: 'amount', // Primary monetary value (e.g., invoice total, rent, contract value)
  Currency: 'currency', // Currency for the Amount (e.g., EUR, CHF)
  DueDate: 'due-date', // Due date for payment, action, etc.
  StartDate: 'start-date', // Start date for a period covered (e.g., lease term, service period)
  EndDate: 'end-date', // End date for a period covered
  Status: 'status', // e.g., Paid, Pending, Approved, Active
  CaseNumber: 'case-number', // For legal matters
  MeetingDate: 'meeting-date', // For meeting related documents
});

export type TstdlDocumentProperty = EnumType<typeof TstdlDocumentProperty>;

export const TstdlDocumentPropertyConfiguration = {
  [TstdlDocumentProperty.Correspondent]: [DocumentPropertyDataType.Text, 'Korrespondent'],
  [TstdlDocumentProperty.HasCorrespondent]: [DocumentPropertyDataType.Boolean, 'Hat Korrespondent'],
  [TstdlDocumentProperty.EffectiveDate]: [DocumentPropertyDataType.Date, 'Wirksamkeitsdatum'],
  [TstdlDocumentProperty.ExpiryDate]: [DocumentPropertyDataType.Date, 'Ablaufdatum'],
  [TstdlDocumentProperty.ReferenceNumber]: [DocumentPropertyDataType.Text, 'Referenznummer'],
  [TstdlDocumentProperty.RealEstate]: [DocumentPropertyDataType.Text, 'Liegenschaft'],
  [TstdlDocumentProperty.TenantId]: [DocumentPropertyDataType.Text, 'Mieter-ID'],
  [TstdlDocumentProperty.ContractNumber]: [DocumentPropertyDataType.Text, 'Vertragsnummer'],
  [TstdlDocumentProperty.InvoiceNumber]: [DocumentPropertyDataType.Text, 'Rechnungsnummer'],
  [TstdlDocumentProperty.Amount]: [DocumentPropertyDataType.Decimal, 'Betrag'],
  [TstdlDocumentProperty.Currency]: [DocumentPropertyDataType.Text, 'Währung'],
  [TstdlDocumentProperty.DueDate]: [DocumentPropertyDataType.Date, 'Fälligkeitsdatum'],
  [TstdlDocumentProperty.StartDate]: [DocumentPropertyDataType.Date, 'Startdatum'],
  [TstdlDocumentProperty.EndDate]: [DocumentPropertyDataType.Date, 'Enddatum'],
  [TstdlDocumentProperty.Status]: [DocumentPropertyDataType.Text, 'Status'],
  [TstdlDocumentProperty.CaseNumber]: [DocumentPropertyDataType.Text, 'Fall-/Aktenzeichen'],
  [TstdlDocumentProperty.MeetingDate]: [DocumentPropertyDataType.Date, 'Sitzungsdatum'],
} as const satisfies Record<TstdlDocumentProperty, [DocumentPropertyDataType, string]>;

export const TstdlDocumentTypeProperties = {
  // Administration/Contracts/RentalAgreements
  [TstdlDocumentType.ResidentialRentalAgreement]: [
        TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.StartDate, // Lease start
    TstdlDocumentProperty.EndDate, // Lease end
    TstdlDocumentProperty.Amount, // Rent
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.CommercialRentalAgreement]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.StartDate,
    TstdlDocumentProperty.EndDate,
    TstdlDocumentProperty.Amount,
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.ShortTermRentalAgreement]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.StartDate,
    TstdlDocumentProperty.EndDate,
    TstdlDocumentProperty.Amount,
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  // Administration/Contracts/PurchaseAgreements
  [TstdlDocumentType.PurchaseAgreementProperty]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Buyer/Seller
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.EffectiveDate, // Closing date
    TstdlDocumentProperty.Amount, // Purchase price
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.SaleAgreementProperty]: [ // Similar to Purchase
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.Amount,
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  // Administration/Contracts/WorkContracts
  [TstdlDocumentType.WorkOrderContract]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Client/Contractor
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.StartDate, // Work start
    TstdlDocumentProperty.EndDate, // Work end
    TstdlDocumentProperty.Amount, // Contract value
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.FrameworkAgreement]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.StartDate,
    TstdlDocumentProperty.EndDate,
    TstdlDocumentProperty.Amount,
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status,
  ],
  // Administration/GeneralCorrespondence
  [TstdlDocumentType.TerminationNotice]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Sender/Recipient
    TstdlDocumentProperty.EffectiveDate, // Termination effective date
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.ContractNumber, // Related contract
  ],
  [TstdlDocumentType.ComplaintLetter]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Complainant/Recipient
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.ReferenceNumber,
  ],

  // Finance/Invoices
  [TstdlDocumentType.IncomingInvoice]: [
    TstdlDocumentProperty.InvoiceNumber,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Supplier
    TstdlDocumentProperty.DueDate,
    TstdlDocumentProperty.Amount, // Gross amount
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.Status, // e.g., Unpaid, Paid
    TstdlDocumentProperty.ReferenceNumber, // e.g. PO number
  ],
  [TstdlDocumentType.OutgoingInvoice]: [
    TstdlDocumentProperty.InvoiceNumber,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Customer/Tenant
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.DueDate,
    TstdlDocumentProperty.Amount,
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.PaymentReminder]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Debtor
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.DueDate, // Original or new
    TstdlDocumentProperty.Amount, // Outstanding amount
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.ReferenceNumber, // Original invoice number
  ],
  // Finance/AnnualStatements
  [TstdlDocumentType.AnnualFinancialStatement]: [
    TstdlDocumentProperty.StartDate, // Reporting period start
    TstdlDocumentProperty.EndDate, // Reporting period end
    TstdlDocumentProperty.RealEstate, // Can be general or specific
    TstdlDocumentProperty.ReferenceNumber,
  ],
  [TstdlDocumentType.OperatingCostStatement]: [
    TstdlDocumentProperty.StartDate, // Billing period start
    TstdlDocumentProperty.EndDate, // Billing period end
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.Amount, // Total due/credit
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.ReferenceNumber,
  ],
  [TstdlDocumentType.HeatingCostStatement]: [ // Similar to OperatingCostStatement
    TstdlDocumentProperty.StartDate,
    TstdlDocumentProperty.EndDate,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.Amount,
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.ReferenceNumber,
  ],
  // Finance/BankStatements
  [TstdlDocumentType.BankStatement]: [
    TstdlDocumentProperty.StartDate, // Statement period start
    TstdlDocumentProperty.EndDate, // Statement period end
    TstdlDocumentProperty.ReferenceNumber, // Account number
    TstdlDocumentProperty.RealEstate, // If account is tied to a property
  ],
  // Finance/Budgeting
  [TstdlDocumentType.BudgetPlan]: [
    TstdlDocumentProperty.StartDate, // Budget period start
    TstdlDocumentProperty.EndDate, // Budget period end
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.Amount, // Total budget
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.ReferenceNumber,
  ],

  // Maintenance
  [TstdlDocumentType.RepairOrderForm]: [
    TstdlDocumentProperty.RealEstate,
    // Description of issue
    TstdlDocumentProperty.Status, // Open, In Progress, Closed
    TstdlDocumentProperty.ReferenceNumber, // Order No.
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Reported by
  ],
  [TstdlDocumentType.MaintenanceReport]: [
    TstdlDocumentProperty.RealEstate,
    // Work done
    TstdlDocumentProperty.StartDate, // Work start date
    TstdlDocumentProperty.EndDate, // Work end date
    TstdlDocumentProperty.ReferenceNumber,
  ],
  [TstdlDocumentType.InspectionReport]: [
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Inspector
    // e.g., Annual Safety Inspection
    TstdlDocumentProperty.Status, // Passed, Failed, Issues Found
    TstdlDocumentProperty.EffectiveDate, // Inspection Date
  ],
  [TstdlDocumentType.DamageReport]: [
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Reported by
    // Description of damage
    TstdlDocumentProperty.Amount, // Estimated damage cost
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.Status, // Reported, Assessed, Repaired
  ],
  [TstdlDocumentType.MaintenancePlanDocument]: [
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.StartDate, // Plan start
    TstdlDocumentProperty.EndDate, // Plan end
    TstdlDocumentProperty.ReferenceNumber,
  ],

  // TenantAndMemberManagement
  [TstdlDocumentType.TenantRegistrationForm]: [
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Tenant
    TstdlDocumentProperty.EffectiveDate, // Move-in date
  ],
  [TstdlDocumentType.MemberApplication]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Applicant
    TstdlDocumentProperty.Status, // Submitted, Approved, Rejected
    TstdlDocumentProperty.EffectiveDate, // Membership start if approved
  ],
  [TstdlDocumentType.HandoverProtocolApartment]: [
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Tenant/Landlord Rep
    TstdlDocumentProperty.EffectiveDate, // Handover date
    TstdlDocumentProperty.Status, // e.g., Defects noted
  ],
  [TstdlDocumentType.RentAdjustmentNotice]: [
    TstdlDocumentProperty.EffectiveDate, // Adjustment effective date
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.Amount, // New rent
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Landlord/Tenant
  ],
  [TstdlDocumentType.TenantCorrespondenceLetter]: [
    TstdlDocumentProperty.TenantId,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Sender/Recipient
  ],
  [TstdlDocumentType.MemberCorrespondenceLetter]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Sender/Recipient (Member ID if applicable)
  ],

  // LegalMatters
  [TstdlDocumentType.CourtOrder]: [
    TstdlDocumentProperty.CaseNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Court/Parties
    TstdlDocumentProperty.EffectiveDate,
  ],
  [TstdlDocumentType.LawsuitDocument]: [
    TstdlDocumentProperty.CaseNumber,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Parties/Lawyers
  ],
  [TstdlDocumentType.LegalOpinionReport]: [
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Lawyer/Client
    TstdlDocumentProperty.CaseNumber,
    TstdlDocumentProperty.RealEstate,
  ],
  [TstdlDocumentType.OwnerAssociationResolution]: [
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.RealEstate, // Building/Association ID
    TstdlDocumentProperty.ReferenceNumber, // Resolution No.
  ],
  [TstdlDocumentType.CooperativeBylaws]: [
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.ReferenceNumber,
  ],

  // Meetings
  [TstdlDocumentType.MeetingMinutes]: [
    TstdlDocumentProperty.MeetingDate,
    // e.g., "Minutes of AGM"
    TstdlDocumentProperty.ReferenceNumber,
  ],
  [TstdlDocumentType.MeetingInvitation]: [
    TstdlDocumentProperty.MeetingDate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Inviter/Invitee
  ],
  [TstdlDocumentType.MeetingAgenda]: [
    TstdlDocumentProperty.MeetingDate,
  ],

  // PropertyDevelopment
  [TstdlDocumentType.FeasibilityStudy]: [
    // Project Name / Study Subject
    TstdlDocumentProperty.RealEstate, // If specific site
    TstdlDocumentProperty.Amount, // Estimated Cost/Benefit
    TstdlDocumentProperty.Currency,
  ],
  [TstdlDocumentType.ArchitecturalPlan]: [
    // Plan Title / Project Name
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.ReferenceNumber, // Plan No.
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Architect
  ],
  [TstdlDocumentType.BuildingPermitDocument]: [
    TstdlDocumentProperty.ReferenceNumber, // Permit Number
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.ExpiryDate,
    // Project Name
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Issuing Authority
  ],
  [TstdlDocumentType.DemolitionPermit]: [ // Similar to BuildingPermit
    TstdlDocumentProperty.ReferenceNumber,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.ExpiryDate,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
  ],
  [TstdlDocumentType.ConstructionSchedule]: [
    // Project Name
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.StartDate,
    TstdlDocumentProperty.EndDate,
  ],
  [TstdlDocumentType.ConstructionDocumentation]: [
    // Project Name / Doc Title
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.ReferenceNumber,
  ],

  // ServiceProviders
  [TstdlDocumentType.ServiceContract]: [
    TstdlDocumentProperty.ContractNumber,
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.ExpiryDate,
    TstdlDocumentProperty.Amount, // Contract Value
    TstdlDocumentProperty.Currency,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Service Provider
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.ServiceLevelAgreement]: [
    TstdlDocumentProperty.ReferenceNumber, // SLA ID or linked ContractNo
    TstdlDocumentProperty.EffectiveDate,
    TstdlDocumentProperty.ExpiryDate,
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent,
    TstdlDocumentProperty.Status,
  ],
  [TstdlDocumentType.ProviderCommunication]: [
    TstdlDocumentProperty.RealEstate,
    TstdlDocumentProperty.HasCorrespondent,
    TstdlDocumentProperty.Correspondent, // Sender/Recipient
  ],
} as const satisfies Partial<Record<TstdlDocumentType, TstdlDocumentProperty[]>>;
