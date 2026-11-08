import type { SectionType } from '../model/schema';

/**
 * Dynaweb's own built-in texts (form labels, notes, image placeholder,
 * generated navigation labels), in the site's language. The owner's content is
 * never translated here; only the words Dynaweb itself adds to a page.
 * English is the fallback for languages without a table yet.
 */
export interface UiText {
  name: string; email: string; date: string; people: string; message: string; bookingMessage: string;
  sendBooking: string; sendMessage: string; requestNote: string; offlineNote: string;
  imagePlaceholder: string; imagePlaceholderLabel: string; honeypot: string; book: string;
  sections: Partial<Record<SectionType, string>>;
}

const EN: UiText = {
  name: 'Name', email: 'Email', date: 'Preferred date', people: 'Number of people', message: 'Message',
  bookingMessage: 'Anything we should know', sendBooking: 'Send booking request', sendMessage: 'Send message',
  requestNote: 'This is a request, not a confirmed booking. We reply to confirm availability.',
  offlineNote: 'This form is not connected yet: messages cannot be sent from this page.',
  imagePlaceholder: '[Image]', imagePlaceholderLabel: 'Image placeholder', honeypot: 'Leave empty', book: 'Book',
  sections: {},
};

const FR: UiText = {
  name: 'Nom', email: 'E-mail', date: 'Date souhaitée', people: 'Nombre de personnes', message: 'Message',
  bookingMessage: 'Une précision ?', sendBooking: 'Envoyer la demande de réservation', sendMessage: 'Envoyer le message',
  requestNote: 'Ceci est une demande, pas une réservation confirmée. Nous vous répondons pour confirmer la disponibilité.',
  offlineNote: 'Ce formulaire n’est pas encore connecté : les messages ne peuvent pas être envoyés depuis cette page.',
  imagePlaceholder: '[Image]', imagePlaceholderLabel: 'Emplacement d’image', honeypot: 'Laisser vide', book: 'Réserver',
  sections: {
    navigation: 'Navigation', hero: 'Accueil', about: 'À propos', text: 'Texte', media: 'Vidéo', statistics: 'Chiffres clés',
    features: 'Points forts', services: 'Services', showcase: 'Produits', gallery: 'Galerie', team: 'Équipe',
    testimonials: 'Avis', pricing: 'Tarifs', cta: 'Réserver', contact: 'Contact', custom: 'Section', footer: 'Pied de page',
  },
};

export function ui(lang: string): UiText {
  return lang.toLowerCase().startsWith('fr') ? FR : EN;
}
