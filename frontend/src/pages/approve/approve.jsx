import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const Approve = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [processed, setProcessed] = useState(false);
    const [action, setAction] = useState("");
    const [requestId, setRequestId] = useState("");
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(true);
    
    useEffect(() => {
        // Parse URL parameters
        const queryParams = new URLSearchParams(location.search);
        const reqId = queryParams.get("requestId");
        const actionType = queryParams.get("action");
        
        if (!reqId || !actionType) {
            setError("Invalid request parameters");
            setProcessing(false);
            return;
        }
        
        setRequestId(reqId);
        setAction(actionType);
        
        // Process the approval/denial
        processRequest(reqId, actionType);
    }, [location]);
    
    const processRequest = async (reqId, actionType) => {
        try {
            // Make an API call to update approval status in database
            const response = await axios.post('http://localhost:5000/api/update-emergency-status', {
                requestId: reqId,
                status: actionType
            });
            
            // Handle response
            if (response.data.success) {
                setProcessed(true);
            } else {
                setError(response.data.message || "Failed to process your request. Please try again.");
            }
            
            setProcessing(false);
        } catch (error) {
            console.error("Error processing request:", error);
            setError("Failed to process your request. Please try again.");
            setProcessing(false);
        }
    };
    
    const renderContent = () => {
        if (processing) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-300"></div>
                </div>
            );
        }
        
        if (error) {
            return (
                <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
                    <p>{error}</p>
                </div>
            );
        }
        
        if (processed) {
            if (action === "approve") {
                return (
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-green-500 mb-4">Access Approved</h2>
                        <p className="text-gray-300 mb-6">
                            You have approved emergency access to the medical information. The requester can now view the patient's critical medical data.
                        </p>
                    </div>
                );
            } else {
                return (
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-red-500 mb-4">Access Denied</h2>
                        <p className="text-gray-300 mb-6">
                            You have denied emergency access to the medical information. The requester will not be able to view the patient's medical data.
                        </p>
                    </div>
                );
            }
        }
    };
    
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
            <div className="max-w-md w-full bg-gray-900 rounded-xl shadow-2xl p-8">
                <h1 className="text-3xl font-bold text-blue-300 mb-2 text-center">Emergency Access Request</h1>
                
                <p className="text-gray-300 mb-8 text-center">
                    Someone is requesting emergency access to medical information.
                </p>
                
                {renderContent()}
                
                <div className="mt-6 text-center">
                    <p className="text-gray-400 text-sm mb-4">
                        Request ID: {requestId}
                    </p>
                    
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-3 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition duration-300"
                    >
                        Close Window
                    </button>
                </div>
            </div>
            
            <footer className="mt-8 text-gray-500 text-sm">
                © {new Date().getFullYear()} MedPortal. All rights reserved.
            </footer>
        </div>
    );
};

export default Approve;