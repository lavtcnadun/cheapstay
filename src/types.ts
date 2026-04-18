import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Stay {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  type: 'Hotel' | 'Hostel' | 'Apartment' | 'Guesthouse';
  amenities: string[];
  description: string;
  authorId?: string;
  authorName?: string;
  approved?: boolean;
  isPaid?: boolean;
  createdAt?: any;
}

export interface Booking {
  id: string;
  stayId: string;
  userId: string;
  userName: string;
  stayName: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

export const MOCK_STAYS: Stay[] = [
  {
    id: '1',
    name: 'Ella Mountain View',
    location: 'Ella, Sri Lanka',
    price: 4500,
    rating: 4.8,
    reviews: 1240,
    image: 'https://images.unsplash.com/photo-1586902197503-e71026292412?auto=format&fit=crop&q=80&w=800',
    type: 'Hotel',
    amenities: ['Mountain View', 'Free WiFi', 'Breakfast'],
    description: 'A charming stay with breathtaking views of the Ella Gap and surrounding tea plantations.'
  },
  {
    id: '2',
    name: 'Kandy Lake Hostel',
    location: 'Kandy, Sri Lanka',
    price: 2200,
    rating: 4.5,
    reviews: 850,
    image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800',
    type: 'Hostel',
    amenities: ['Lake View', 'Shared Kitchen', 'Common Room'],
    description: 'Perfect for solo travelers looking to explore the cultural capital of Sri Lanka.'
  },
  {
    id: '3',
    name: 'Galle Fort Apartment',
    location: 'Galle, Sri Lanka',
    price: 8500,
    rating: 4.9,
    reviews: 2100,
    image: 'https://images.unsplash.com/photo-1588598136841-36c1d766bb3a?auto=format&fit=crop&q=80&w=800',
    type: 'Apartment',
    amenities: ['Historic Area', 'AC', 'Kitchen'],
    description: 'Modern apartment located inside the historic Galle Fort, steps away from the lighthouse.'
  },
  {
    id: '4',
    name: 'Mirissa Beach Guesthouse',
    location: 'Mirissa, Sri Lanka',
    price: 3500,
    rating: 4.7,
    reviews: 640,
    image: 'https://images.unsplash.com/photo-1540202404-a2f29036bb52?auto=format&fit=crop&q=80&w=800',
    type: 'Guesthouse',
    amenities: ['Beach Access', 'Garden', 'Quiet Area'],
    description: 'Experience the tropical vibes of Mirissa in this cozy guesthouse near the beach.'
  },
  {
    id: '5',
    name: 'Sigiriya Rock View',
    location: 'Sigiriya, Sri Lanka',
    price: 4000,
    rating: 4.6,
    reviews: 420,
    image: 'https://images.unsplash.com/photo-1588598136841-36c1d766bb3a?auto=format&fit=crop&q=80&w=800',
    type: 'Hotel',
    amenities: ['Rock View', 'Pool', 'Fast WiFi'],
    description: 'Spacious hotel with a stunning view of the Sigiriya Lion Rock fortress.'
  },
  {
    id: '6',
    name: 'Nuwara Eliya Tea Cabin',
    location: 'Nuwara Eliya, Sri Lanka',
    price: 5500,
    rating: 4.4,
    reviews: 1500,
    image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800',
    type: 'Guesthouse',
    amenities: ['Tea Plantation', 'Fireplace', 'Outdoor Seating'],
    description: 'Rustic cabin nestled in the cool hills of Nuwara Eliya, surrounded by tea estates.'
  }
];
