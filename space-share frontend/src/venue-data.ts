export interface VenueReview {
  id: string
  venueId: string
  authorName: string
  authorCity: string
  date: string
  rating: number
  eventType: string
  guestCount: number
  comment: string
  verifiedStay: boolean
  hostReply?: string
}

export interface ReviewCategoryScores {
  cleanliness: number
  hospitality: number
  accuracy: number
  soundLighting: number
  locationParking: number
  valueForMoney: number
}

export interface FaqItem {
  question: string
  answer: string
}

export const CITY_OPTIONS = [
  'All India',
  'Delhi NCR',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Jaipur',
  'Goa',
  'Pune',
  'Kolkata',
]

export const HOME_TESTIMONIALS = [
  {
    name: 'Rohan & Meera Mehra',
    city: 'New Delhi',
    event: 'Grand Wedding Sangeet · 280 guests',
    rating: 5,
    text: 'Finding a venue that allowed outside catering without exorbitant royalty fees was impossible until SpaceShare. The farmhouse was breathtaking and the host assisted our decorator all afternoon. Unforgettable night!',
    avatarColor: '#f4623a',
  },
  {
    name: 'Tanvi Shirodkar',
    city: 'Goa',
    event: '30th Birthday Poolside Sundowner · 75 guests',
    rating: 5,
    text: 'The venue pictures matched reality 100%. Seamless check-in, crystal clear sound setup till midnight, and our guests could not stop taking photos. Booking process was quick and completely transparent.',
    avatarColor: '#2e9e6b',
  },
  {
    name: 'Aditya Swaminathan',
    city: 'Bengaluru',
    event: 'Startup Series-A Celebration · 110 guests',
    rating: 5,
    text: 'Zero surprises on pricing. The invoice was clear, power backup kicked in effortlessly when the city power blinked, and the valet team handled 40+ cars with ease. Best venue discovery platform in India.',
    avatarColor: '#e07653',
  },
]

export const VENUE_FAQS: FaqItem[] = [
  {
    question: 'What is the music curfew and sound policy?',
    answer:
      'Outdoor music is permitted until 10:00 PM in accordance with local guidelines. Indoor banquet halls and acoustic spaces can continue DJ / music till 1:00 AM.',
  },
  {
    question: 'Are outside decorators and caterers permitted?',
    answer:
      'Yes! SpaceShare verified venues allow you to bring your preferred caterers and decor teams with zero extra royalty fees. Kitchen prep areas and power feeds are available.',
  },
  {
    question: 'What is the alcohol and bar license policy?',
    answer:
      'Alcohol is permitted with a standard one-day event permit (FL-4 / P-10). The host team can provide the necessary venue NOC to assist in acquiring your permit swiftly.',
  },
  {
    question: 'What is the cancellation and rescheduling policy?',
    answer:
      'Enjoy free cancellation with 100% refund within 48 hours of booking. Up to 7 days before the event, you receive a full refund or can reschedule without fees.',
  },
]

export const CATEGORIZED_AMENITIES_MAP = [
  {
    category: '❄️ Climate & Dressing',
    items: [
      'Central Air Conditioning',
      '100% Inverter & GenSet Power Backup',
      'Private Bridal / VIP Green Room',
      'Modern Restrooms with Attendants',
    ],
  },
  {
    category: '🔊 Audio, Stage & Lights',
    items: [
      'Professional PA Sound System',
      'Wireless Handheld & Collar Mics',
      'Performance Stage with Spotlights',
      'Atmospheric Fairy & Disco Lighting',
      'HDMI High-Lumen Projector & Screen',
    ],
  },
  {
    category: '🍽️ Food & Dining Setup',
    items: [
      'Spacious Kitchen with Prep Stations',
      'Outside Caterers 100% Permitted',
      'Buffet Dining Tables & Banquet Chairs',
      'Dedicated Bar Counter & Ice Chests',
    ],
  },
  {
    category: '🚗 Access & Security',
    items: [
      'Dedicated Valet & 50+ Car Parking',
      'Round-the-clock CCTV & Guard on Duty',
      'Wheelchair Accessible Entrance',
      'Wide Gated Entry for Large Buses/Tempos',
    ],
  },
]

// In-memory cache for reviews so dynamic user submissions persist across tab navigation
const venueReviewsStore: Record<string, VenueReview[]> = {}

export function getVenueReviews(venueId: string, venueName: string, city: string): VenueReview[] {
  if (venueReviewsStore[venueId]) {
    return venueReviewsStore[venueId]
  }

  const initialReviews: VenueReview[] = [
    {
      id: `${venueId}-rev-1`,
      venueId,
      authorName: 'Aarav Malhotra',
      authorCity: city || 'New Delhi',
      date: 'October 2026',
      rating: 5,
      eventType: 'Engagement & Sangeet',
      guestCount: 180,
      comment: `We hosted our engagement at ${venueName} and couldn't be happier! The lawn was manicured to perfection, ambient lighting was magical as sunset approached, and the air-conditioned hall accommodated our buffet seamlessly. The host was proactive and ensured valet parking went without any bottlenecks. Highly recommended!`,
      verifiedStay: true,
      hostReply: 'Thank you Aarav! It was an absolute delight hosting your family. Wishing you both a lifetime of happiness!',
    },
    {
      id: `${venueId}-rev-2`,
      venueId,
      authorName: 'Priya & Vikram Nair',
      authorCity: city || 'Mumbai',
      date: 'September 2026',
      rating: 5,
      eventType: '30th Birthday Celebration',
      guestCount: 85,
      comment: `The acoustics and sound system here are top-tier. Our DJ had no issues plugging in, and the private green room gave us plenty of space to get ready. Outside catering was allowed which made planning our custom street-food counters super easy. Everyone was raving about the venue vibe!`,
      verifiedStay: true,
      hostReply: 'Thanks Priya! Glad the DJ and catering setup worked out so smoothly for the big 3-0 celebration!',
    },
    {
      id: `${venueId}-rev-3`,
      venueId,
      authorName: 'Sneha Kulkarni',
      authorCity: city || 'Pune',
      date: 'August 2026',
      rating: 5,
      eventType: 'Corporate Annual Gala',
      guestCount: 120,
      comment: `Booked this space for our annual company offsite and award evening. The high-speed WiFi, projector setup, and generator backup gave us complete peace of mind. Ample parking for 50+ cars and the security staff was polite and helpful throughout the night.`,
      verifiedStay: true,
    },
    {
      id: `${venueId}-rev-4`,
      venueId,
      authorName: 'Devansh Singhania',
      authorCity: city || 'Bengaluru',
      date: 'July 2026',
      rating: 4,
      eventType: 'Cocktail & Music Night',
      guestCount: 95,
      comment: `Gorgeous aesthetic and prime location that was easy for our guests to find via Google Maps. The open terrace area breezy and comfortable. Host was very flexible with our decorator who arrived early in the morning for flower setup. Will definitely book again.`,
      verifiedStay: true,
      hostReply: 'Appreciate your feedback Devansh! We loved having your crew here and hope to see you again soon.',
    },
  ]

  venueReviewsStore[venueId] = initialReviews
  return initialReviews
}

export function addVenueReview(venueId: string, review: VenueReview) {
  if (!venueReviewsStore[venueId]) {
    venueReviewsStore[venueId] = []
  }
  venueReviewsStore[venueId] = [review, ...venueReviewsStore[venueId]]
}

export const FEATURED_DESTINATIONS = [
  {
    city: 'Delhi NCR',
    area: 'Chattarpur & Gurugram',
    venuesCount: '45+ spaces',
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
    tag: 'Spacious Farmhouses',
  },
  {
    city: 'Mumbai',
    area: 'Alibaug & Lonavala',
    venuesCount: '38+ spaces',
    image: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=800&q=80',
    tag: 'Poolside Villas',
  },
  {
    city: 'Bengaluru',
    area: 'Yelahanka & Whitefield',
    venuesCount: '32+ spaces',
    image: 'https://images.unsplash.com/photo-1670529776180-60e4132ab90c?auto=format&fit=crop&w=800&q=80',
    tag: 'Open-Air Lawns',
  },
  {
    city: 'Jaipur',
    area: 'Kukas & Amer Road',
    venuesCount: '24+ spaces',
    image: 'https://images.unsplash.com/photo-1607861884586-c7cfaed16290?auto=format&fit=crop&w=800&q=80',
    tag: 'Heritage Havelis',
  },
  {
    city: 'Goa',
    area: 'Vagator & Candolim',
    venuesCount: '28+ spaces',
    image: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=800&q=80',
    tag: 'Beachfront Resorts',
  },
]

export const HOW_IT_WORKS_STEPS = [
  {
    num: '01',
    title: 'Explore & Filter Spaces',
    desc: 'Browse handpicked, 100% verified venues across India with transparent pricing, authentic photos, and real organizer reviews.',
  },
  {
    num: '02',
    title: 'Hold Date & Customise',
    desc: 'Lock in your event date with free 48-hour cancellation. Message the host directly about catering, DJ timings, and decor permissions.',
  },
  {
    num: '03',
    title: 'Celebrate Without Stress',
    desc: 'Arrive to a clean, power-backed venue with on-site host support, dedicated valet parking, and complete peace of mind.',
  },
]
