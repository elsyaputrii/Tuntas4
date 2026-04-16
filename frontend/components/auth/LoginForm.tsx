"use client";

import Image from "next/image";
import { useState } from "react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image dengan efek Blur */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/background-polibatam.jpg" // Lokasi di folder public
          alt="Polibatam Background"
          fill
          className="object-cover blur-[4px] brightness-75" // Mengatur keburaman & kecerahan
          priority
        />
      </div>

      {/* Login Card (Container Biru Abu-abu) */}
      <div className="relative z-10 w-full max-w-md bg-[#7C93A7] p-10 rounded-[30px] shadow-2xl mx-4">
        <div className="flex flex-col items-center">
          {/* Logo Polibatam */}
          <div className="mb-6">
             <Image 
                src="/logo-polibatam.png" 
                alt="Logo" 
                width={120} 
                height={120} 
                className="object-contain"
             />
          </div>

          <h2 className="text-white text-center font-bold text-sm mb-8 uppercase tracking-wider">
            Aplikasi Pengelolaan Ketidaksesuaian <br /> Politeknik Negeri Batam
          </h2>

          {/* Form Inputs */}
          <div className="w-full space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                👤
              </span>
              <input
                type="text"
                placeholder="Enter Username"
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-600">
                🔒
              </span>
              <input
                type="password"
                placeholder="Enter Password"
                className="w-full pl-12 pr-4 py-3 rounded-lg bg-[#E8F0FE] text-gray-800 placeholder-gray-500 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button className="text-[12px] text-blue-800 hover:underline block text-left w-full mt-1">
              lupa password?
            </button>
          </div>

          {/* Login Button */}
          <button className="mt-8 w-32 py-2 bg-white text-gray-800 font-bold rounded-full hover:bg-gray-100 transition-all shadow-md">
            Login
          </button>
        </div>
      </div>
    </div>
  );
}