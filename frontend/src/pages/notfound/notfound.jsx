import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl text-center">
        <h1 className="text-6xl font-bold text-blue-300">404</h1>
        <h2 className="text-2xl font-medium text-white">Page Not Found</h2>
        <p className="text-gray-400">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="pt-6">
          <Link 
            to="/" 
            className="inline-block px-6 py-3 rounded-md bg-blue-300 text-black font-medium hover:bg-blue-400 transition duration-150"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;