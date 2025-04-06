import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { account, Query, DATABASE_ID, COLLECTION_ID, databases } from './../../../appwriteConfig';
import { decryptData } from '../../utils/encryption';
import { TbLogout2 } from "react-icons/tb";
import { QRCodeCanvas } from 'qrcode.react';
import { FaRobot, FaFileAlt, FaTimes, FaPaperPlane, FaImage } from "react-icons/fa";
import { BsFileEarmarkImage } from "react-icons/bs";
import chatService from '../../services/chatService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [userData, setUserData] = useState({
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
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const qrRef = useRef();
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Format markdown in chat messages to HTML
  const formatSystemMessage = (content) => {
    let formattedContent = content;
    
    formattedContent = formattedContent.replace(/---/g, '<hr/>');
    
    formattedContent = formattedContent.replace(/### (.*?)$/gm, '<h3>$1</h3>');
    
    formattedContent = formattedContent.replace(/#### (.*?)$/gm, '<h4>$1</h4>');

    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    formattedContent = formattedContent.replace(/- (.*?)$/gm, '<li>$1</li>');
    
    formattedContent = formattedContent.replace(/<li>(.*?)<\/li>(\s*)<li>/g, '<li>$1</li><li>');
    formattedContent = formattedContent.replace(/<li>(.*?)(\s*)<\/li>/g, '<ul><li>$1</li></ul>');
    
    formattedContent = formattedContent.replace(/<\/ul>\s*<ul>/g, '');
    
    const paragraphs = formattedContent.split('\n\n');
    formattedContent = paragraphs.map(p => {
      if (!p.trim()) return '';
      if (p.includes('<h3>') || p.includes('<h4>') || p.includes('<ul>') || p.includes('<hr/>')) {
        return p;
      }
      return `<p>${p}</p>`;
    }).join('');
    
    return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
  };

  useEffect(() => {
    if (isLoggedOut) return;

    const fetchUserData = async () => {
      try {
        const userDataString = localStorage.getItem("authData");
        if (!userDataString) {
          throw new Error('No user data found');
        }
        const decryptedAuthData = decryptData(userDataString);
        const user = JSON.parse(decryptedAuthData);
        
        const userId = user.uid;
        
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID,
          [Query.equal('userId', userId)]
        );

        if (response.documents && response.documents.length > 0) {
          const document = response.documents[0];

          setUserData({
            name: document.name,
            email: document.email,
            dob: document.dob,
            fatherName: document.fatherName,
            motherName: document.motherName,
            fatherPhone: document.fatherPhone,
            motherPhone: document.motherPhone,
            bloodGroup: document.bloodGroup,
            allergies: document.allergies,
            vaccinations: document.vaccinations
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [isLoggedOut]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleLogout = async () => {
    try {
      setIsLoggedOut(true);
      localStorage.removeItem("authData");
      await account.deleteSession('current');
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggedOut(false); 
    }
  };

  const downloadQRCode = () => {
    if (!qrRef.current) return;
    
    const canvas = qrRef.current;
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    
    link.href = image;
    link.download = `${userData.name}-medical-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeQROverlay = () => {
    setShowQR(false);
  };

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
    if (!showChatbot && messages.length === 0) {
      // Add welcome message when opening chat for the first time
      setMessages([
        {
          role: 'assistant',
          content: `Hello ${userData.name}! I'm your medical assistant. I can help with your health questions! You can also upload medical images for me to analyze. How can I help you today?`
        }
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' && !selectedImage) return;
    
    let newMessage = {
      role: 'user',
      content: inputMessage,
    };
    
    // Handle image upload
    if (selectedImage) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        
        // Add image to message
        newMessage.content = inputMessage || "Please analyze this medical image.";
        newMessage.image = base64Image;
        
        await processMessage(newMessage);
        setSelectedImage(null);
        setImagePreview(null);
      };
      reader.readAsDataURL(selectedImage);
    } else {
      await processMessage(newMessage);
    }
    
    setInputMessage('');
  };

  const processMessage = async (newMessage) => {
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setChatLoading(true);
    
    try {
      // Format message for API
      const messagesForAPI = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.image 
          ? [
              { type: "text", text: msg.content },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${msg.image}` } }
            ]
          : msg.content
      }));
      
      const response = await chatService.sendMessage(messagesForAPI);
      
      if (response.choices && response.choices.length > 0) {
        const responseMessage = {
          role: 'assistant',
          content: response.choices[0].message.content
        };
        
        setMessages([...updatedMessages, responseMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...updatedMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again later.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const generateDiagnosisReport = async () => {
    const reportRequest = {
      role: 'user',
      content: `Based on our conversation and my medical details (Name: ${userData.name}, DOB: ${userData.dob}, Blood Type: ${userData.bloodGroup}, Allergies: ${userData.allergies || 'None'}, Vaccinations: ${userData.vaccinations || 'None'}), please generate a comprehensive diagnosis report with recommendations.`
    };
    
    await processMessage(reportRequest);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-300">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 flex gap-1 items-center bg-blue-600 hover:bg-blue-800 text-white rounded-md transition duration-150"
          >
            Logout <TbLogout2 />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Welcome, {userData?.name}!</h2>
          <p className="text-gray-300">
            Here you can view and manage your medical information. Generate a QR code for quick access to your medical details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Personal Information */}
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 col-span-2">
            <h3 className="text-lg font-medium text-blue-300 mb-4 pb-2 border-b border-gray-700">
              Personal Information
            </h3>
            {userData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Full Name</p>
                  <p className="font-medium">{userData.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="font-medium">{userData.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Date of Birth</p>
                  <p className="font-medium">{userData.dob}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Blood Group</p>
                  <p className="font-medium">{userData.bloodGroup}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Father's Name</p>
                  <p className="font-medium">{userData.fatherName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Father's Phone</p>
                  <p className="font-medium">{userData.fatherPhone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Mother's Name</p>
                  <p className="font-medium">{userData.motherName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Mother's Phone</p>
                  <p className="font-medium">{userData.motherPhone || 'Not provided'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No personal information available.</p>
            )}
          </div>

          {/* Medical Information */}
          <div className="bg-gray-900 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-blue-300 mb-4 pb-2 border-b border-gray-700">
              Medical Information
            </h3>
            {userData ? (
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Allergies</p>
                  <p className="font-medium">{userData.allergies || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Vaccinations</p>
                  <p className="font-medium">{userData.vaccinations || 'None reported'}</p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => setShowQR(true)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded-md transition duration-150"
                  >
                    Show QR Code
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No medical information available.</p>
            )}
          </div>
        </div>
      </main>

      {/* QR Code Overlay */}
      {showQR && userData && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full text-center relative">
            <button 
              onClick={closeQROverlay}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-lg font-medium text-blue-300 mb-4">
              Medical Information QR Code
            </h3>
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-4 rounded-lg mb-4">
                <QRCodeCanvas
                  id="qr-canvas"
                  value={JSON.stringify({
                    name: userData.name,
                    dob: userData.dob,
                    bloodGroup: userData.bloodGroup,
                    allergies: userData.allergies || 'None',
                    vaccinations: userData.vaccinations || 'None',
                    emergencyContact: userData.fatherPhone || userData.motherPhone || 'None'
                  })}
                  size={200}
                  level={"H"}
                  includeMargin={true}
                  ref={qrRef}
                />
              </div>
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-blue-300 hover:bg-blue-400 text-black font-medium rounded-md transition duration-150"
              >
                Download QR Code
              </button>
              <p className="text-sm text-gray-400 mt-2">
                This QR code contains your essential medical information for emergency situations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Button */}
      <div className="fixed bottom-6 right-6 flex space-x-2 z-40">
        <button
          onClick={() => {
            generateDiagnosisReport();
            toggleChatbot();
          }}
          className="h-14 px-4 bg-blue-600 hover:bg-blue-800 rounded-md flex items-center justify-center shadow-lg transition duration-150"
        >
          <FaFileAlt className="h-5 w-5 mr-2 text-white" />
          <span className="text-white text-sm">Get Diagnosis Report</span>
        </button>
        <button
          onClick={toggleChatbot}
          className="h-14 w-14 bg-blue-600 hover:bg-blue-800 rounded-md flex items-center justify-center shadow-lg transition duration-150"
        >
          <FaRobot className="h-6 w-6 text-white" />
        </button>
      </div>

      {showChatbot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-39">
          <div className="fixed inset-0 flex items-center justify-center z-40">
            <div className="w-[850px] h-[600px] bg-gray-900 rounded-lg shadow-xl flex flex-col">
              {/* Chatbot Header */}
              <div className="bg-blue-600 px-4 py-3 rounded-t-lg flex items-center justify-between">
                <h3 className="text-white font-medium">Medical Assistant</h3>
                <button 
                  onClick={toggleChatbot}
                  className="text-white hover:text-gray-200"
                >
                  <FaTimes />
                </button>
              </div>
              
              {/* Messages Container */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col">
                {messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`message ${
                        message.role === 'user' 
                          ? 'user-message bg-blue-600 text-white border-bottom-right-radius-2' 
                          : 'system-message bg-gray-800 text-white'
                      } ${message.role === 'assistant' ? 'formatted-message' : ''} 
                      px-4 py-2 rounded-lg w-fit max-w-[90%] break-words leading-relaxed`}
                      style={{
                        padding: message.role === 'user' ? '8px 15px' : '16px',
                        borderBottomRightRadius: message.role === 'user' ? '2px' : '12px',
                        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {message.role === 'assistant' 
                        ? formatSystemMessage(message.content) 
                        : message.content}
                    </div>
                    {message.image && (
                      <div className="mt-2">
                        <img 
                          src={`data:image/jpeg;base64,${message.image}`} 
                          alt="Uploaded medical image" 
                          className="max-w-xs rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="px-2 py-1 rounded-lg bg-gray-800 text-white w-fit">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Image Preview */}
                {imagePreview && (
                  <div className="px-4 pb-2">
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="h-20 rounded-md" 
                      />
                      <button 
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-blue-600 rounded-full p-1 text-white text-xs"
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  </div>
                )}

              
              {/* Input Area */}
                <div className="px-4 py-3 border-t border-gray-700 flex items-end">
                  <button
                    onClick={triggerFileInput}
                    className="pl-1 mr-2 py-2 text-blue-300 hover:text-blue-200"
                  >
                    <BsFileEarmarkImage size={24}/>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 py-2 px-3 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-auto"
                    rows="1"
                    style={{ maxHeight: '100px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!inputMessage.trim() && !selectedImage) || chatLoading}
                    className="ml-2 p-3 bg-blue-600 text-white rounded-md disabled:opacity-50"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for formatted messages */}
      <style jsx="true">{`
        .formatted-message h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #90cdf4;
        }
        
        .formatted-message h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: #90cdf4;
        }
        
        .formatted-message p {
          margin-bottom: 0.75rem;
        }
        
        .formatted-message ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .formatted-message strong {
          font-weight: 600;
        }
        
        .formatted-message hr {
          margin: 1rem 0;
          border: 0;
          border-top: 1px solid #4a5568;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;