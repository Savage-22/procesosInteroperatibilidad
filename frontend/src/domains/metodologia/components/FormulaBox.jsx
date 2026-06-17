export default function FormulaBox({ children, label }) {
    return (
        <div className="my-3">
            {label && <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>}
            <div className="bg-[#1e3654] text-[#f4d100] font-mono text-sm px-4 py-3 rounded-lg leading-relaxed">
                {children}
            </div>
        </div>
    )
}
