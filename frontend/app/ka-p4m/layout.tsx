export default function KaP4MLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-6">
        
        <div className="max-w-300 mx-auto mb-6">
          <div className="bg-[#4E617A] p-4 sm:p-8 shadow-md">
            <h1 className="text-white font-bold text-base sm:text-xl uppercase leading-tight tracking-wide">
               Transformasi Tata Kelola <br />
              Organisasi Pengelolaan Ketidaksesuaian <br />
              Politeknik NEgEri Batam
            </h1>
          </div>
        </div>

        <div className="max-w-300 mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}