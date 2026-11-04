import { PageHero, Prose } from "@/components/site/Prose";
export const metadata = { title: "Blog", description: "News and walking tips from the Walkie team.", alternates: { canonical: "/blog" } };
export default function Page() {
  return (<><PageHero eyebrow="Blog" title="Stories from the trail" sub="Our first posts are on their way — walking tips, product updates and pet lore." mood="sit" /><Prose><p className="text-center">No posts yet. Join the waitlist on the home page to hear when we publish.</p></Prose></>);
}
