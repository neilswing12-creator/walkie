import { PageHero, Prose } from "@/components/site/Prose";
import { ContactForm } from "@/components/site/ContactForm";
export const metadata = { title: "Contact", description: "Get in touch with the Walkie team.", alternates: { canonical: "/contact" } };
export default function Page() { return (<><PageHero eyebrow="Contact" title="Say hello" sub="Questions, bugs or ideas — we read everything." mood="greet" /><Prose><ContactForm /></Prose></>); }
