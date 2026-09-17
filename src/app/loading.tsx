export default function GlobalLoading() {
  return (
    <div className="flex flex-col space-y-4 p-8 w-full max-w-5xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="h-10 bg-gray-200 rounded w-1/3 mb-6"></div>
      
      {/* Search Bar Skeleton */}
      <div className="h-12 bg-gray-200 rounded w-full mb-8"></div>
      
      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-gray-100 p-6 rounded-lg shadow-sm">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
            
            <div className="flex justify-between items-center mt-auto">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
