export interface Agency {
    name: string;
    href: string;
    description: string;
    location: string;
    services: string;
    agencyDetailes?: AgencyDetails;
}

export interface AgencyDetails {
    name: string;
    location: string;
    description: string;
    mobilePhone?: string;
    landlinePhone?: string;
    website?: string;
    employees?: string;
    projects?: string;
    remoteWork?: string;
    founded?: string;
    memberSince?: string;
    collaborations?: string; // not extracted currently but reserved
    awards?: string;
    languages?: string;
    headquarters?: string; // new
    headquartersCity?: string; // new
    linkedinProfile?: string;
    otherSocialLinks?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
    };
    contactPage?: string;
}
  
