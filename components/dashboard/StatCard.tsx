interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function StatCard({ icon, label, value, highlight }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-bf-gray-200 p-6">
      <div className="w-8 h-8 rounded-lg bg-bf-cream flex items-center justify-center mb-3 text-bf-ruby">
        {icon}
      </div>
      <p className="text-[0.65rem] font-sans font-medium uppercase tracking-[0.1em] text-bf-gray-400 mb-1">
        {label}
      </p>
      <p className={`text-4xl heading-display ${highlight ? "text-bf-rosegold-flat" : "text-bf-black"}`}>
        {value}
      </p>
    </div>
  );
}
