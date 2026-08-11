import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { getContactSettings } from "@/server/services/settings";

/**
 * In Bangladesh a large share of orders start as a WhatsApp message, so this
 * is a primary conversion path rather than a support afterthought. It sits
 * clear of the mobile bottom bar and the iOS gesture area.
 */
export async function WhatsAppFab() {
  const contact = await getContactSettings();

  return (
    <a
      href={contact.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with FlexOver BD on WhatsApp"
      className="group fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-pop tap transition-transform duration-200 ease-(--ease-out-soft) hover:scale-105 active:scale-95 lg:right-6 lg:bottom-6"
      style={{ zIndex: "var(--z-fab)" }}
    >
      <WhatsAppIcon className="size-6.5" />
      <span className="pointer-events-none absolute right-full mr-3 hidden rounded-btn bg-scrim px-3 py-2 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-pop transition-opacity duration-200 group-hover:opacity-100 lg:block">
        Order on WhatsApp
      </span>
    </a>
  );
}
