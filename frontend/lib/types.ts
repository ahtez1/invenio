export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_picture: string | null;
}

export interface Ticket {
  id: number;
  ticket_type: string;
  price: string;
  quantity_available: number;
}

export interface EventImage {
  id: number;
  image: string;
}

export interface EventSummary {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  organizer: User;
  min_ticket_price: string | null;
  cover_image: string | null;
  average_rating: number | null;
}

export interface EventDetail extends EventSummary {
  description: string;
  tickets: Ticket[];
  images: EventImage[];
}

export interface Review {
  id: number;
  user: User;
  rating: number;
  text: string;
  created_at: string;
}

export interface Collection {
  id: number;
  title: string;
  events_count: number;
}

export interface CartItem {
  id: number;
  ticket: Ticket & { event_id: number; event_title: string };
  quantity: number;
  line_total: number;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total_price: number;
}

export interface OrderItem {
  id: number;
  event_title: string;
  ticket_type: string;
  unit_price: string;
  quantity: number;
  event_id: number | null;
  event_date: string | null;
  event_time: string | null;
  event_location: string | null;
  references: string[];
}

export interface Order {
  id: number;
  status: "pending" | "paid" | "failed" | "cancelled";
  total: string;
  placed_at: string;
  paid_at: string | null;
  items: OrderItem[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
