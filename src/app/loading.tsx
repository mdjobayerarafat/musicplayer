export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-rose-500/20 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-rose-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}
