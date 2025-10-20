export default function LoadingScreen() {
  // TODO: create a clean animation for loading page / redesign loading page
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
      <div className="animate-pulse text-xl text-gray-700">Loading...</div>
    </div>
  );
}

