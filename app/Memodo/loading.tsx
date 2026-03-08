export default function MemodoLoading() {
  return (
    <div className="space-y-4 px-4 py-6">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-56 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
