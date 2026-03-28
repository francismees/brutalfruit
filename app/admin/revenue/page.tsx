export default function RevenuePage() {
  return (
    <div className="flex-1">
      <header className="px-6 lg:px-8 py-5 border-b border-bf-gray-200 bg-white">
        <h1 className="heading-display text-2xl">Revenue</h1>
      </header>

      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-bf-cream flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bf-gray-400)" strokeWidth="1.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="heading-display-italic text-2xl mb-2 text-bf-gray-400">Coming Soon</h2>
          <p className="text-editorial text-bf-gray-400 max-w-sm mx-auto">
            Revenue analytics will be available in a future update.
            We&apos;re crafting something beautiful.
          </p>
        </div>
      </div>
    </div>
  );
}
