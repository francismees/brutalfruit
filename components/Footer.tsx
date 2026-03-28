import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-bf-gray-200 py-8 px-6 text-center">
      <div className="mb-4">
        <BrandLogo
          variant="wordmark"
          width={120}
          height={19}
          className="mx-auto opacity-60"
        />
      </div>
      <nav className="flex items-center justify-center gap-6 mb-4">
        <a
          href="#"
          className="label-ui text-bf-gray-400 hover:text-bf-black transition-colors"
        >
          Privacy
        </a>
        <span className="text-bf-gray-200">·</span>
        <a
          href="#"
          className="label-ui text-bf-gray-400 hover:text-bf-black transition-colors"
        >
          Contact
        </a>
        <span className="text-bf-gray-200">·</span>
        <a
          href="#"
          className="label-ui text-bf-gray-400 hover:text-bf-black transition-colors"
        >
          Socials
        </a>
      </nav>
      <p className="text-xs text-bf-gray-400 font-sans">
        © {new Date().getFullYear()} Brutal Fruit. Enjoy Responsibly.
      </p>
    </footer>
  );
}
