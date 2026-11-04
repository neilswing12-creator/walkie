import Link from "next/link";
import { PageHero, Prose } from "@/components/site/Prose";
const FAQ: [string, string][] = [
  ["Is Walkie free?", "Yes. Walking and running tracking, pets, missions and the starter pet shop are free. Walkie Plus adds optional cosmetic extras."],
  ["How are steps counted?", "In the iOS and Android apps, Walkie reads daily steps from Apple Health or Health Connect with your permission. In a web browser, steps are estimated from the distance of walks and runs you track — they're labelled 'est.'"],
  ["Why did my activity not earn coins?", "Activities under one minute, past the daily coin cap, or with speeds that look like a vehicle (e.g. >10 km/h walking) are saved but don't earn rewards."],
  ["Does GPS work with my screen off?", "In the browser, GPS pauses when the tab is in the background, so keep the screen on. The mobile apps are designed for screen-off tracking."],
  ["Who can see my routes?", "Only you, by default. Precise routes are never shown publicly. You can choose to share route maps with friends in Profile → Privacy."],
  ["How do I delete my account?", "Profile → Account → Delete account. Everything is permanently erased. You can export your data first."],
  ["How do I cancel Walkie Plus?", "Web subscriptions: Profile → Walkie Plus → Manage billing. App Store / Google Play subscriptions are managed in your device's subscription settings."],
];
export const metadata = { title: "Help Center", description: "Answers to common questions about Walkie.", alternates: { canonical: "/help" } };
export default function Page() {
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} /><PageHero eyebrow="Help Center" title="How can we help?" mood="discover" /><Prose>
    <div className="space-y-3">{FAQ.map(([q, a]) => <details key={q} className="card group p-5"><summary className="cursor-pointer list-none font-display text-lg font-semibold">{q}</summary><p>{a}</p></details>)}</div>
    <p className="text-center">Still stuck? <Link href="/contact" className="font-bold text-walkie-blue">Contact us</Link>.</p>
  </Prose></>);
}
