// src/common/interfaces/company-profile.interface.ts

export interface CompanyProfile {
    companyName: string;
    website?: string; // Their website if available
    headquartersCity?: string; // Extracted from contact page or profile
    foundedYear?: string; // Example: "2012"
    companySize?: string; // Example: "11-50 employees"
    industry?: string; // Example: "Software Development"
    linkedInProfile?: string; // If found
    socialLinks?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        other?: string;
    };
    contactPageLink?: string; // Contact form page if detected
    description?: string; // Company bio or presentation
}
