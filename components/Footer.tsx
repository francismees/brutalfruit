import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-bf-gray-200 py-10 px-6 text-center flex flex-col items-center">
      <div className="mb-6 flex justify-center">
        <div 
          className="w-24 h-4 bg-rosegold opacity-80" 
          style={{ 
            WebkitMaskImage: 'url(/bf-logo-wordmark.svg)', 
            WebkitMaskSize: 'contain', 
            WebkitMaskRepeat: 'no-repeat', 
            WebkitMaskPosition: 'center',
            maskImage: 'url(/bf-logo-wordmark.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
          }} 
          title="Brutal Fruit"
        />
      </div>
      <p className="text-xs text-bf-gray-400 font-sans max-w-sm mx-auto leading-relaxed">
        © 2026 Brutal Fruit.<br />
        Not For Persons Under the Age of 18.<br />
        Please Enjoy Brutal Fruit Responsibly.
      </p>
    </footer>
  );
}
