export default function KaP4MLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        
        

        <div className="max-w-300 mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}