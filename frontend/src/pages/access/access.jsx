import React from "react";
import { useNavigate } from "react-router-dom";
import { decryptData } from "../../utils/encryption";

const Access = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
            <div className="max-w-md w-full bg-gray-900 rounded-xl shadow-2xl p-8 text-center">
                <h1 className="text-3xl font-bold text-blue-300 mb-2">Welcome to MedPortal</h1>
                
                <p className="text-gray-300 mb-8">
                    Your comprehensive healthcare management solution. Access your medical information securely and efficiently.
                </p>
                
                <div className="space-y-6">
                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full px-6 py-4 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition duration-300 shadow-lg flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        General Access
                    </button>
                    
                    <button 
                        onClick={() => navigate('/emergency')}
                        className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition duration-300 shadow-lg flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Emergency Access
                    </button>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <p className="text-gray-400 text-sm">
                        This application stores and manages sensitive medical information in compliance with healthcare privacy regulations.
                    </p>
                </div>
            </div>
            
            <footer className="mt-8 text-gray-500 text-sm">
                © {new Date().getFullYear()} MedPortal. All rights reserved.
            </footer>
        </div>
    );
};

export default Access;