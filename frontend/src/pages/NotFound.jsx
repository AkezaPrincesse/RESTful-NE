import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Flame size={48} className="text-brand" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600 mt-2">Page not found</p>
        <p className="text-gray-400 mt-1">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary mt-8 mx-auto w-fit justify-center">
          <Home size={16} />Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
