'use client';
import Link from 'next/link';

export default function Page() {
  
  return (
    <div className="p-4">
      {/* 导航链接 */}
        <Link 
          href="/system" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          System View
        </Link>
    </div>
  );
}
