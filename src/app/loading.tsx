export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d14]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-teal-500/20 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}
