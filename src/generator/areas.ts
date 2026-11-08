import type { Atmosphere, Goal, SectionType } from '../model/schema';

/**
 * Optional starting points by area of activity. Choosing one only PRE-FILLS
 * the wizard (activity, objective, atmosphere, suggested sections, search
 * engine type, placeholder headings); every value stays editable and nothing
 * is stored as a category. "Other" keeps Dynaweb fully generic.
 * Headings are always [placeholders]: they guide, they never state facts.
 */
export interface Area {
  id: string;
  label: string;
  activity: string;
  goal: Goal;
  atmosphere: Atmosphere;
  schemaType: string;
  sections: SectionType[];
  /** Placeholder headings for this area, by section type. */
  headings: Partial<Record<SectionType, string>>;
  /** Example of what such a site often needs, shown as a hint in the functionality field. */
  featuresHint: string;
}

const base: SectionType[] = ['navigation', 'hero', 'about'];
const end: SectionType[] = ['contact', 'footer'];

export const AREAS: Area[] = [
  {
    id: 'hotel', label: 'Hotel or accommodation', activity: 'Hotel', goal: 'bookings', atmosphere: 'luxury', schemaType: 'Hotel',
    sections: [...base, 'services', 'gallery', 'testimonials', 'pricing', 'cta', ...end],
    headings: { services: '[Rooms and amenities]', gallery: '[The place]', pricing: '[Rates]', cta: '[Plan your stay]' },
    featuresHint: 'Booking request form, room gallery, location map',
  },
  {
    id: 'tourism', label: 'Tourism, tours and activities', activity: 'Tourism', goal: 'bookings', atmosphere: 'natural', schemaType: 'TouristTrip',
    sections: [...base, 'services', 'gallery', 'testimonials', 'pricing', 'cta', ...end],
    headings: { services: '[Experiences]', gallery: '[Moments]', pricing: '[Prices and departures]', cta: '[Book your experience]' },
    featuresHint: 'Booking request form, horizontal photo story, itinerary',
  },
  {
    id: 'restaurant', label: 'Restaurant, cafe or bar', activity: 'Restaurant', goal: 'bookings', atmosphere: 'editorial', schemaType: 'Restaurant',
    sections: [...base, 'services', 'gallery', 'testimonials', 'cta', ...end],
    headings: { services: '[Menu highlights]', gallery: '[The room and the kitchen]', cta: '[Reserve a table]' },
    featuresHint: 'Table reservation request, menu, opening hours',
  },
  {
    id: 'ai-tech', label: 'AI or technology business', activity: 'Technology', goal: 'leads', atmosphere: 'technical', schemaType: 'Organization',
    sections: [...base, 'features', 'statistics', 'media', 'testimonials', 'pricing', 'cta', ...end],
    headings: { features: '[What the product does]', statistics: '[Results in figures]', media: '[Product demo]', pricing: '[Plans]', cta: '[Book a demo]' },
    featuresHint: 'Demo request form, product video, pricing plans',
  },
  {
    id: 'saas', label: 'Software or SaaS product', activity: 'Software', goal: 'sales', atmosphere: 'modern', schemaType: 'SoftwareApplication',
    sections: [...base, 'features', 'media', 'testimonials', 'pricing', 'cta', ...end],
    headings: { features: '[Key features]', media: '[See it in action]', pricing: '[Pricing]', cta: '[Start now]' },
    featuresHint: 'Sign-up call to action, feature tour, pricing table',
  },
  {
    id: 'services', label: 'Service company', activity: 'Professional services', goal: 'leads', atmosphere: 'modern', schemaType: 'ProfessionalService',
    sections: [...base, 'services', 'statistics', 'team', 'testimonials', 'cta', ...end],
    headings: { services: '[Our services]', statistics: '[Key figures]', team: '[The team]', cta: '[Request a quote]' },
    featuresHint: 'Quote request form, service list, team',
  },
  {
    id: 'agency', label: 'Creative or marketing agency', activity: 'Agency', goal: 'leads', atmosphere: 'editorial', schemaType: 'Organization',
    sections: [...base, 'services', 'gallery', 'team', 'testimonials', 'cta', ...end],
    headings: { services: '[What we do]', gallery: '[Selected work]', team: '[The studio]', cta: '[Start a project]' },
    featuresHint: 'Project inquiry form, case studies, showreel',
  },
  {
    id: 'shop', label: 'Shop or e-commerce', activity: 'Shop', goal: 'sales', atmosphere: 'playful', schemaType: 'Store',
    sections: [...base, 'showcase', 'testimonials', 'cta', ...end],
    headings: { showcase: '[Products]', cta: '[Shop now]' },
    featuresHint: 'Product catalogue, order or checkout link (payments need a service)',
  },
  {
    id: 'real-estate', label: 'Real estate', activity: 'Real estate', goal: 'leads', atmosphere: 'luxury', schemaType: 'RealEstateAgent',
    sections: [...base, 'showcase', 'gallery', 'team', 'testimonials', 'cta', ...end],
    headings: { showcase: '[Properties]', gallery: '[Inside the properties]', team: '[Our agents]', cta: '[Arrange a visit]' },
    featuresHint: 'Property listings, visit request form, map',
  },
  {
    id: 'education', label: 'Education or training', activity: 'Education', goal: 'leads', atmosphere: 'modern', schemaType: 'EducationalOrganization',
    sections: [...base, 'features', 'team', 'testimonials', 'pricing', 'cta', ...end],
    headings: { features: '[Courses]', team: '[Teachers]', pricing: '[Fees]', cta: '[Enrol]' },
    featuresHint: 'Course list, enrolment request form, schedule',
  },
  {
    id: 'events', label: 'Event or festival', activity: 'Event', goal: 'bookings', atmosphere: 'playful', schemaType: 'Event',
    sections: [...base, 'features', 'team', 'gallery', 'pricing', 'cta', ...end],
    headings: { features: '[Programme]', team: '[Speakers or artists]', gallery: '[Previous editions]', pricing: '[Tickets]', cta: '[Get your ticket]' },
    featuresHint: 'Programme, ticket link (sales need a service), venue map',
  },
  {
    id: 'health', label: 'Health and wellness', activity: 'Health and wellness', goal: 'bookings', atmosphere: 'natural', schemaType: 'HealthAndBeautyBusiness',
    sections: [...base, 'services', 'team', 'testimonials', 'pricing', 'cta', ...end],
    headings: { services: '[Treatments]', team: '[Practitioners]', pricing: '[Prices]', cta: '[Book an appointment]' },
    featuresHint: 'Appointment request form, services, practitioners',
  },
  {
    id: 'nonprofit', label: 'Non-profit or community', activity: 'Non-profit', goal: 'community', atmosphere: 'natural', schemaType: 'NGO',
    sections: [...base, 'text', 'statistics', 'team', 'cta', ...end],
    headings: { text: '[Our mission]', statistics: '[Our impact]', team: '[Who we are]', cta: '[Join or donate]' },
    featuresHint: 'Membership or volunteer form, donation link (payments need a service)',
  },
  {
    id: 'portfolio', label: 'Portfolio or freelancer', activity: 'Freelancer', goal: 'portfolio', atmosphere: 'editorial', schemaType: 'Person',
    sections: [...base, 'gallery', 'media', 'testimonials', ...end],
    headings: { gallery: '[Selected work]', media: '[Showreel]' },
    featuresHint: 'Project gallery, showreel, contact form',
  },
  {
    id: 'personal', label: 'Personal site or blog', activity: 'Personal', goal: 'information', atmosphere: 'minimalist', schemaType: 'Person',
    sections: [...base, 'text', 'gallery', 'footer'],
    headings: { text: '[Latest writing]', gallery: '[Photos]' },
    featuresHint: 'Articles, photos, newsletter sign-up (needs a service)',
  },
];

export function getArea(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}
