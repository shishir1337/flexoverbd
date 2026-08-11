import { getAnnouncements } from "@/server/services/settings";
import { AnnouncementRotator } from "./announcement-rotator";

/**
 * Dismissal without a hydration flash.
 *
 * The bar is server-rendered on every request, so React's tree is identical on
 * both sides and there is no mismatch to reconcile. Hiding is done purely in
 * CSS, by a class this script puts on <html> while the parser is still above
 * the bar — so a dismissed bar is never painted, yet React still believes it
 * rendered one. Doing it in React state instead would either flash the bar for
 * a frame or shift the whole page down once state settled.
 */
const NO_FLASH = `try{if(sessionStorage.getItem('flexover.announcement.v1')==='off')document.documentElement.classList.add('announcement-off')}catch(e){}`;

export async function AnnouncementBar() {
  const announcements = await getAnnouncements();
  if (announcements.length === 0) return null;

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: fixed literal, no interpolation — must run before paint to avoid a flash */}
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />

      <div id="announcement-bar" className="bg-scrim text-white">
        <div className="container-page">
          <div className="relative flex min-h-11 items-center justify-center gap-3 py-2.5">
            {/*
              Screen readers get the whole list at once, in source order. The
              visual rotator is hidden from them because an auto-advancing live
              region would interrupt whatever the user was actually reading.
            */}
            <ul className="sr-only">
              {announcements.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>

            <AnnouncementRotator messages={announcements} />
          </div>
        </div>
      </div>
    </>
  );
}
