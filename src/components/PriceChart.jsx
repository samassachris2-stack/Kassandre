import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TOOLTIP_STYLE = { background: "#12121a", border: "1px solid #2a2a3e", borderRadius: "8px", color: "#e8e8f0", fontSize: "13px" };

// Graphique des cotes. Chargé à la demande pour ne pas alourdir l'ouverture d'un marché.
// Sans "lines": un seul tracé (marché binaire). Avec "lines": un tracé par option.
export default function PriceChart({ data, height = 120, lines }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b6b8a" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6b6b8a" }} unit="%" />
        {lines ? (
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        ) : (
          <Tooltip formatter={(value) => [`${value}%`, "Oui"]} contentStyle={TOOLTIP_STYLE} />
        )}
        {lines ? (
          lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />
          ))
        ) : (
          <Line type="monotone" dataKey="oui" stroke="#7c3aed" strokeWidth={2} dot={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
