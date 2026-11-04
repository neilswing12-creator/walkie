import Link from "next/link";
import { PageHero, Prose } from "@/components/site/Prose";
export const metadata = { title: "Features", description: "GPS walk and run tracking, steps, pet collecting, missions and a 3D pet shop builder.", alternates: { canonical: "/features" } };
export default function Page() {
  return (<><PageHero eyebrow="Features" title="Everything inside Walkie" mood="happy" /><Prose>
    <h2>Fitness tracking</h2><ul><li>Outdoor walks and runs with GPS routes, pace, splits, speed and elevation</li><li>Indoor walks, treadmill runs and free workouts</li><li>Steps from Apple Health (iOS) and Health Connect (Android) in the mobile apps</li><li>Calorie estimates using the MET method</li><li>History, personal records, weekly and monthly insights</li></ul>
    <h2>Pets</h2><ul><li>14 original companions across six rarities</li><li>Feed, play, pet, rename and dress them up</li><li>Pets grow from baby to adult as you stay active</li></ul>
    <h2>Pet shop builder</h2><ul><li>Interactive isometric 3D world with day and night</li><li>Place, move, rotate and store buildings, furniture and decorations</li><li>Floors, fences, environments and shop expansions</li></ul>
    <h2>Motivation</h2><ul><li>Daily & weekly missions, a 7-day treat calendar and achievements</li><li>Streaks with optional streak freezes</li><li>Challenges, friends and opt-in leaderboards</li></ul>
    <p><Link href="/signup" className="btn-primary">Start free</Link></p>
  </Prose></>);
}
