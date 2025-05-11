import { JobOfferSourceE, JobTypeE, RemoteTypeE } from "../enums/job-offer.enum";

export interface JobOfferI {
    jobTitle: string;
    companyName: string;
    location: string;
    remoteType: RemoteTypeE;
    jobType: JobTypeE;
    postedDate?: string; // Example: "2 days ago", "Posted today", optional
    descriptionSnippet?: string; // Short description if available
    description?: string; // Full description of the job
    jobLink: string; // Link to apply or job detail page
    source: JobOfferSourceE; // Platform
}
