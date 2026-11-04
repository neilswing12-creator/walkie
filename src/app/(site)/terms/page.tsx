import { PageHero, Prose } from "@/components/site/Prose";
export const metadata = { title: "Terms of Service", description: "The terms for using Walkie.", alternates: { canonical: "/terms" } };
export default function Page() {
  return (<><PageHero eyebrow="Legal" title="Terms of Service" sub="Last updated: November 2026" mood="sit" /><Prose>
    <h2>Using Walkie</h2><p>You must be at least 13 to use Walkie. Keep your account secure and don't misuse the service — for example by faking activities, exploiting bugs for rewards, or harassing other users. We may suspend accounts that do.</p>
    <h2>Health disclaimer</h2><p>Walkie is for general fitness and motivation, not medical advice. Distance, pace, steps and calories are estimates. Consult a professional before starting a new exercise program, and stay aware of your surroundings while walking or running.</p>
    <h2>Virtual items</h2><p>Coins, pets and items have no cash value, can't be transferred or sold, and are licensed to you for use in Walkie.</p>
    <h2>Subscriptions</h2><p>Walkie Plus renews automatically until cancelled. Trials convert to paid plans unless cancelled before the trial ends. Prices are shown before purchase. Refunds follow the policy of the store you purchased through.</p>
    <h2>Changes & termination</h2><p>We may update these terms and will notify you of material changes. You can stop using Walkie and delete your account at any time.</p>
    <h2>Contact</h2><p>legal@walkie.run</p>
  </Prose></>);
}
