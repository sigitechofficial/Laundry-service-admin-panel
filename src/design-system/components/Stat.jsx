export default function Stat({ label, value }) {
  return (
    <div className="jd-stat">
      <div className="jd-stat__label">{label}</div>
      <div className="jd-stat__value">{value ?? 0}</div>
    </div>
  );
}
