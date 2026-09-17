export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
  dark,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-3">{title}</h2>
      {subtitle && (
        <p className={`mt-4 text-base leading-relaxed ${center ? "mx-auto" : ""} ${dark ? "text-text-muted" : "text-text-dim"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}