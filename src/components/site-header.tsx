import { Wordmark } from "./brand";
import { HeaderActions } from "./header-actions";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md supports-[backdrop-filter]:bg-paper/75">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Wordmark />
        <NavLinks />
        <HeaderActions />
        <MobileNav />
      </div>
    </header>
  );
}
