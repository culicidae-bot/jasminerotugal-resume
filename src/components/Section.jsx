export default function Section({ id, label, title, intro, index, children }) {
  const sectionId = `${id}-title`;
  return (
    <section className="section" id={id} aria-labelledby={sectionId}>
      <div className="section-heading">
        <p className="section-kicker">
          <span className="section-number">{String(index).padStart(2, '0')}</span>
          <span>{label}</span>
        </p>
        <h2 id={sectionId}>{title}</h2>
        {intro ? <p className="section-intro">{intro}</p> : null}
      </div>
      <div className="section-content">{children}</div>
    </section>
  );
}
