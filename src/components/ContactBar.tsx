import { Phone } from "lucide-react";

const ContactBar = () => {
  const phoneNumber = "+38978721872";
  const viberNumber = "38978721872"; // No + for Viber URI typically
  const whatsappNumber = "38978721872";
  const messengerLink = "https://m.me/100039719028828";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-pb z-40">
      <div className="max-w-md mx-auto">
        {/* Primary action - Phone call */}
        <a
          href={`tel:${phoneNumber}`}
          className="contact-btn contact-btn-primary w-full mb-3"
        >
          <Phone className="w-5 h-5" />
          <span>Повикај нè</span>
        </a>

        {/* Secondary actions - Viber, WhatsApp & Messenger */}
        <div className="flex items-center justify-center gap-3">
          <a
            href={`viber://chat?number=${viberNumber}`}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Viber"
          >
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.014 2c-5.482 0-9.955 4.382-9.955 9.77 0 1.83.515 3.54 1.391 5.006L2 22l5.418-1.404c1.424.802 3.062 1.263 4.807 1.263 5.482 0 9.955-4.382 9.955-9.77S17.496 2 12.014 2zm4.41 14.12c-.2.56-1.162 1.073-1.622 1.14-.42.062-.953.088-1.538-.097-.354-.112-.808-.26-1.388-.51-2.436-1.05-4.024-3.523-4.144-3.687-.12-.163-.975-1.303-.975-2.485s.617-1.764.836-2.005c.22-.242.48-.302.64-.302.16 0 .32 0 .46.008.147.008.346-.056.54.413.2.477.68 1.664.74 1.784.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.252.313-.36.42-.12.12-.244.25-.104.49.14.24.622 1.024 1.336 1.66.918.816 1.692 1.068 1.932 1.188.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.398.66 1.638.78.24.12.4.18.46.28.06.1.06.58-.14 1.14z"/>
            </svg>
            <span className="text-sm font-medium text-foreground">Viber</span>
          </a>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="WhatsApp"
          >
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-sm font-medium text-foreground">WhatsApp</span>
          </a>
          <a
            href={messengerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            aria-label="Messenger"
          >
            <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.888 1.437 5.467 3.682 7.152V22l3.4-1.866c.907.252 1.87.388 2.918.388 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm.995 12.443l-2.546-2.716-4.97 2.716 5.468-5.807 2.609 2.716 4.906-2.716-5.467 5.807z"/>
            </svg>
            <span className="text-sm font-medium text-foreground">Messenger</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactBar;
