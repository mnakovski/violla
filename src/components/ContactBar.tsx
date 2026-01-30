import { Phone, MessageCircle, Instagram, Facebook } from "lucide-react";

const ContactBar = () => {
  const phoneNumber = "+1234567890"; // Replace with actual number
  const whatsappNumber = "1234567890"; // Replace with actual number

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb">
      <div className="max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <a
            href={`tel:${phoneNumber}`}
            className="contact-btn contact-btn-primary"
          >
            <Phone className="w-5 h-5" />
            <span>Call Us</span>
          </a>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contact-btn contact-btn-accent"
          >
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp</span>
          </a>
        </div>

        <div className="flex items-center justify-center gap-4">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 text-foreground" />
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5 text-foreground" />
          </a>
          <a
            href="viber://chat?number=%2B1234567890"
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Viber"
          >
            <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.014 2c-5.482 0-9.955 4.382-9.955 9.77 0 1.83.515 3.54 1.391 5.006L2 22l5.418-1.404c1.424.802 3.062 1.263 4.807 1.263 5.482 0 9.955-4.382 9.955-9.77S17.496 2 12.014 2zm4.41 14.12c-.2.56-1.162 1.073-1.622 1.14-.42.062-.953.088-1.538-.097-.354-.112-.808-.26-1.388-.51-2.436-1.05-4.024-3.523-4.144-3.687-.12-.163-.975-1.303-.975-2.485s.617-1.764.836-2.005c.22-.242.48-.302.64-.302.16 0 .32 0 .46.008.147.008.346-.056.54.413.2.477.68 1.664.74 1.784.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.252.313-.36.42-.12.12-.244.25-.104.49.14.24.622 1.024 1.336 1.66.918.816 1.692 1.068 1.932 1.188.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.398.66 1.638.78.24.12.4.18.46.28.06.1.06.58-.14 1.14z"/>
            </svg>
          </a>
          <a
            href="https://m.me/yourpage"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Messenger"
          >
            <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.888 1.437 5.467 3.682 7.152V22l3.4-1.866c.907.252 1.87.388 2.918.388 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.995 12.443l-2.546-2.716-4.97 2.716 5.468-5.807 2.609 2.716 4.906-2.716-5.467 5.807z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactBar;
