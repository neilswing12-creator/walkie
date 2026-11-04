import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (<div className="bg-walkie-white"><a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Skip to content</a><SiteHeader /><main id="main">{children}</main><SiteFooter /></div>);
}
