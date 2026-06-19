export function StarBackground() {
  const stars = Array.from({ length: 54 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    top: `${(index * 61) % 100}%`,
    delay: `${(index % 9) * 0.3}s`,
  }));

  return (
    <div className="stars" aria-hidden="true">
      {stars.map((star) => (
        <span key={star.id} style={{ left: star.left, top: star.top, animationDelay: star.delay }} />
      ))}
    </div>
  );
}
