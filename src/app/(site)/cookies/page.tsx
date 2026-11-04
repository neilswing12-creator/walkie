import { PageHero, Prose } from "@/components/site/Prose";
export const metadata = { title: "Cookie Policy", description: "Cookies used by Walkie.", alternates: { canonical: "/cookies" } };
export default function Page() {
  return (<><PageHero eyebrow="Legal" title="Cookie Policy" sub="Last updated: November 2026" mood="sit" /><Prose>
    <p>Walkie uses a small number of cookies and local storage entries that are necessary for the service to work.</p>
    <ul><li><b>walkie_session</b> — keeps you signed in (HttpOnly, 30 days).</li><li><b>oauth_google / oauth_apple</b> — protects sign-in with Google or Apple (10 minutes).</li><li><b>walkie.activityDraft</b> (local storage) — saves an in-progress activity on your device so it isn't lost.</li></ul>
    <p>We don't use advertising cookies. Fonts are self-hosted. If an analytics provider is enabled, it receives only privacy-filtered events and no health or location data.</p>
  </Prose></>);
}
