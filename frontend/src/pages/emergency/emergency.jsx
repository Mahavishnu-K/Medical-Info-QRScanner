import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { decryptData } from "../../utils/encryption";
import axios from "axios";

const Emergency = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState({
        userId: '',
        name: '', 
        email: '', 
        dob: '', 
        fatherName: '', 
        motherName: '', 
        fatherPhone: '', 
        motherPhone: '', 
        bloodGroup: '', 
        allergies: '', 
        vaccinations: ''
    });
    const [requestId, setRequestId] = useState('');
    const [approvalStatus, setApprovalStatus] = useState('pending');
    const [messageError, setMessageError] = useState('');
    const [locationData, setLocationData] = useState(null);

    // Get location data
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    setLocationData({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                error => {
                    console.error("Error getting location:", error);
                }
            );
        }
    }, []);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log("Starting fetchUserData");
            
                const userDataString = localStorage.getItem("emergencyContact");
                console.log("User data from localStorage:", userDataString);
                
                if (!userDataString) {
                    console.error('No user data found in localStorage');
                    throw new Error('No user data found');
                }
            
                const decryptedEmergencyData = decryptData(userDataString);                
                const user = JSON.parse(decryptedEmergencyData);
                
                console.log(user);
    
                const updatedUserData = {
                    userId: user.uid,
                    name: user.name,
                    email: user.email,
                    dob: user.dob,
                    fatherName: user.fatherName,
                    motherName: user.motherName,
                    fatherPhone: user.fatherPhone,
                    motherPhone: user.motherPhone,
                    bloodGroup: user.bloodGroup,
                    allergies: user.allergies,
                    vaccinations: user.vaccinations
                };
                
                setUserData(updatedUserData);
                
                // Process the user data first, then send the alert
                return updatedUserData;
            } catch (error) {
                console.error('Error fetching user data:', error);
                setMessageError('Failed to fetch user data. Please try again.');
                return null;
            } finally {
                setLoading(false);
            }
        };
        
        fetchUserData().then(data => {
            if (data) {
                sendEmergencyAlert(data).catch(error => {
                    console.error('Error in sendEmergencyAlert:', error);
                    setMessageError('Failed to send emergency alert');
                });
            }
        });
    }, []);

    // Poll for approval status
    useEffect(() => {
        if (requestId && approvalStatus === 'pending') {
            const intervalId = setInterval(() => {
                checkApprovalStatus(requestId);
            }, 5000);
            
            pollingIntervalRef.current = intervalId;
            
            return () => {
                clearInterval(intervalId);
            };
        }
    }, [requestId, approvalStatus]);
    
    const pollingIntervalRef = useRef(null);
    
    const sendEmergencyAlert = async (userInfo) => {
        if (!userInfo || !userInfo.userId) {
            console.error("Invalid user data for emergency alert");
            throw new Error("Invalid user data");
        }
        
        try {
            const newRequestId = `emerg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            console.log("Sending emergency request with ID:", newRequestId);
            setRequestId(newRequestId);

            const createResponse = await axios.post('http://localhost:5000/api/create-emergency-request', {
                requestId: newRequestId,
                userId: userInfo.userId,
                status: 'pending',
                timestamp: new Date().toISOString(),
                location: locationData
            });

            console.log("Emergency request creation response:", createResponse);

            if (createResponse.data.success) {
                const baseUrl = window.location.origin;
                const approveUrl = `${baseUrl}/approve?requestId=${newRequestId}&action=approve`;
                const denyUrl = `${baseUrl}/approve?requestId=${newRequestId}&action=deny`;
                
                const locationInfo = locationData ? 
                    `Location: https://maps.google.com/?q=${locationData.latitude},${locationData.longitude}` : 
                    "Location not available";
    
                const messageBody = `EMERGENCY: ${userInfo.name} requires medical attention. Someone is requesting access to their medical information. ${locationInfo}. To APPROVE: ${approveUrl} To DENY: ${denyUrl}`;
                
                // Send SMS to both parents
                const sendSMSToParent = async (phoneNumber) => {
                    if (!phoneNumber) return;
                    
                    const formattedPhone = formatPhoneNumber(phoneNumber);
                    if (!formattedPhone) return;
                    
                    console.log(`Attempting to send SMS to: ${formattedPhone}`);
                    await axios.post('http://localhost:5000/api/send-sms', {
                        to: formattedPhone,
                        message: messageBody
                    });
                    console.log(`SMS sent to: ${formattedPhone}`);
                };
    
                await Promise.all([
                    sendSMSToParent(userInfo.fatherPhone),
                    sendSMSToParent(userInfo.motherPhone)
                ]);
                
                // Start polling for status updates
                setApprovalStatus('pending');
            } else {
                throw new Error('Failed to create emergency request');
            }
        } catch (error) {
            console.error("Error sending emergency alert:", error);
            setMessageError("Failed to send emergency alert to parents. Please try again.");
            throw error; // Re-throw to be caught by the caller
        }
    };

    const formatPhoneNumber = (phone) => {
        if (!phone || typeof phone !== 'string') return null;
        
        // Remove any non-digit characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Check if the phone number is valid
        if (cleaned.length < 7) return null; // Too short to be valid
        
        // For Indian 10-digit numbers, add +91 prefix
        if (cleaned.length === 10) {
            cleaned = '+91' + cleaned;
        } else if (!cleaned.startsWith('+')) {
            // Add + for any other format that doesn't already have it
            cleaned = '+' + cleaned;
        }
        
        return cleaned;
    };

    const checkApprovalStatus = async (reqId) => {
        if (!reqId) return;
        
        try {
            const response = await axios.get(`http://localhost:5000/api/check-emergency-status`, {
                params: { requestId: reqId }
            });
            
            if (response.data.success && response.data.status) {
                setApprovalStatus(response.data.status);
                
                // If approved or denied, stop polling
                if (response.data.status !== 'pending') {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            }
        } catch (error) {
            console.error("Error checking approval status:", error);
            // Don't set error state here to avoid UI flickering
        }
    };

    const renderEmergencyContent = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-300"></div>
                </div>
            );
        }

        if (messageError) {
            return (
                <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
                    <p>{messageError}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-white text-red-600 px-4 py-2 rounded-lg"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        if (approvalStatus === 'pending') {
            return (
                <div className="text-center p-8">
                    <div className="animate-pulse flex space-x-4 mb-6 justify-center">
                        <div className="rounded-full bg-blue-300 h-12 w-12"></div>
                    </div>
                    <h2 className="text-xl font-bold text-blue-300 mb-4">Waiting for Parent Approval</h2>
                    <p className="text-gray-300 mb-6">
                        An emergency alert has been sent to the parents. Please wait for their approval to view the medical information.
                    </p>
                    <div className="bg-gray-800 p-4 rounded-lg text-left">
                        <p className="text-gray-400 text-sm mb-2">Request ID: {requestId}</p>
                        <p className="text-gray-400 text-sm">Status: Pending</p>
                    </div>
                </div>
            );
        }

        if (approvalStatus === 'denied') {
            return (
                <div className="text-center p-8">
                    <div className="flex justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-500 mb-4">Access Denied</h2>
                    <p className="text-gray-300 mb-6">
                        The parents have denied access to the medical information. Please call emergency services if medical attention is needed.
                    </p>
                    <button 
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-lg transition duration-300"
                    >
                        Return to Home
                    </button>
                </div>
            );
        }

        // Approved - show medical information
        return (
            <div className="bg-gray-900 rounded-xl shadow-xl p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-300">Medical Information</h2>
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">Approved</div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-blue-300 text-lg font-semibold mb-2">Patient</h3>
                            <p className="text-white text-xl mb-1">{userData.name}</p>
                            <p className="text-gray-400">DOB: {userData.dob}</p>
                        </div>
                        
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-blue-300 text-lg font-semibold mb-2">Blood Group</h3>
                            <p className="text-white text-xl">{userData.bloodGroup || "Not specified"}</p>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-blue-300 text-lg font-semibold mb-2">Allergies</h3>
                        <p className="text-white">{userData.allergies || "No known allergies"}</p>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-blue-300 text-lg font-semibold mb-2">Emergency Contacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-gray-400">Father</p>
                                <p className="text-white">{userData.fatherName || "Not specified"}</p>
                                <p className="text-white">{userData.fatherPhone || "Not specified"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Mother</p>
                                <p className="text-white">{userData.motherName || "Not specified"}</p>
                                <p className="text-white">{userData.motherPhone || "Not specified"}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-blue-300 text-lg font-semibold mb-2">Vaccination Status</h3>
                        <p className="text-white">{userData.vaccinations || "No vaccination records available"}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-black p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-blue-300">Emergency Access</h1>
                    <button 
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition duration-300"
                    >
                        Back
                    </button>
                </header>
                
                <div className="bg-gray-900 rounded-xl shadow-xl p-6 mb-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="bg-red-600 w-10 h-10 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white">Emergency Access Protocol</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                        This emergency access feature is designed to provide critical medical information
                        during emergencies with parental consent. An alert has been sent to the patient's
                        emergency contacts.
                    </p>
                </div>
                
                {renderEmergencyContent()}
                
                <footer className="mt-8 text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} MedPortal Emergency System. Use only in case of emergency.
                </footer>
            </div>
        </div>
    );
};

export default Emergency;