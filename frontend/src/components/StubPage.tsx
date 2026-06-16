export default function StubPage({ title }: { title: string }) {
  return (
    <div className="flex-1 p-8">
      <h1 className="font-display text-2xl text-gold-primary mb-4">{title}</h1>
      <div className="card">
        <p className="text-text-secondary">This feature is not yet implemented.</p>
      </div>
    </div>
  );
}
