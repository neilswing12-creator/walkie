import { PageHero, Prose } from "@/components/site/Prose";
export const metadata = { title: "About", description: "Why we built Walkie — a cozy, honest way to walk and run more.", alternates: { canonical: "/about" } };
export default function Page() {
  return (<><PageHero eyebrow="About" title="Movement, made cozy." mood="greet" /><Prose>
    <p>Walkie started with a simple idea: the hardest part of exercise is starting, and a friendly face helps. So we made one — a slightly mischievous husky who's always ready for a walk.</p>
    <h2>What we believe</h2>
    <ul><li>Fitness tracking should be accurate, private and free.</li><li>Rewards should come from moving, not from paying. No pay-to-win.</li><li>Missing a day is normal. Streaks should encourage, never guilt.</li><li>Your location and health data belong to you.</li></ul>
    <h2>How Walkie earns money</h2>
    <p>Walkie Plus is an optional subscription for cosmetic extras like exclusive pets, premium decorations and deeper reports. Basic walking and running tracking will always be free.</p>
  </Prose></>);
}
