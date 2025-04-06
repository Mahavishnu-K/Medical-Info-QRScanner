import React, { useState } from 'react';
import { account, databases, ID, DATABASE_ID, COLLECTION_ID } from './../../../appwriteConfig';
import { encryptData } from '../../utils/encryption';
import { Permission, Role } from 'appwrite';

const SignupPage = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    dob: '', 
    fatherName: '', 
    motherName: '', 
    fatherPhone: '', 
    motherPhone: '', 
    bloodGroup: '', 
    password: '', 
    confirmPassword: '', 
    allergies: '', 
    vaccinations: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Extract firstName and lastName from name
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    try {
      const user = await account.create(
        ID.unique(), 
        formData.email, 
        formData.password, 
        `${firstName} ${lastName}`
      );
      console.log('User created:', user);
      
      await account.createEmailPasswordSession(formData.email, formData.password);
      
      await databases.createDocument(
        DATABASE_ID, 
        COLLECTION_ID, 
        ID.unique(), 
        {
          userId: user.$id,
          name: formData.name, 
          email: formData.email, 
          dob: formData.dob, 
          fatherName: formData.fatherName, 
          motherName: formData.motherName, 
          fatherPhone: formData.fatherPhone, 
          motherPhone: formData.motherPhone, 
          bloodGroup: formData.bloodGroup, 
          allergies: formData.allergies, 
          vaccinations: formData.vaccinations
        },
        [
          Permission.read(Role.user(user.$id)),
          Permission.update(Role.user(user.$id)),
          Permission.delete(Role.user(user.$id))
        ]
      );
      
      // Encrypt and store auth data
      const userData = { isLoggedin: true, uid: user.$id };
      const encryptedData = encryptData(JSON.stringify(userData)); 
      localStorage.setItem("authData", encryptedData);
      
      setSuccess(true);
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
      
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-gray-900 p-10 rounded-xl shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Please fill in all the required information
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500 text-white p-3 rounded text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500 text-white p-3 rounded text-sm">
            Account created successfully! Redirecting to dashboard...
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-gray-400 mb-1">
                Date of Birth *
              </label>
              <input
                id="dob"
                name="dob"
                type="date"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>
            
            {/* Blood Group */}
            <div>
              <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-400 mb-1">
                Blood Group *
              </label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                value={formData.bloodGroup}
                onChange={handleChange}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            
            {/* Father's Name */}
            <div>
              <label htmlFor="fatherName" className="block text-sm font-medium text-gray-400 mb-1">
                Father's Name
              </label>
              <input
                id="fatherName"
                name="fatherName"
                type="text"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Father's Name"
                value={formData.fatherName}
                onChange={handleChange}
              />
            </div>
            
            {/* Father's Phone */}
            <div>
              <label htmlFor="fatherPhone" className="block text-sm font-medium text-gray-400 mb-1">
                Father's Phone
              </label>
              <input
                id="fatherPhone"
                name="fatherPhone"
                type="tel"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Father's Phone Number"
                value={formData.fatherPhone}
                onChange={handleChange}
              />
            </div>
            
            {/* Mother's Name */}
            <div>
              <label htmlFor="motherName" className="block text-sm font-medium text-gray-400 mb-1">
                Mother's Name
              </label>
              <input
                id="motherName"
                name="motherName"
                type="text"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Mother's Name"
                value={formData.motherName}
                onChange={handleChange}
              />
            </div>
            
            {/* Mother's Phone */}
            <div>
              <label htmlFor="motherPhone" className="block text-sm font-medium text-gray-400 mb-1">
                Mother's Phone
              </label>
              <input
                id="motherPhone"
                name="motherPhone"
                type="tel"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Mother's Phone Number"
                value={formData.motherPhone}
                onChange={handleChange}
              />
            </div>
            
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            
            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-1">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>
          
          {/* Allergies */}
          <div>
            <label htmlFor="allergies" className="block text-sm font-medium text-gray-400 mb-1">
              Allergies (if any)
            </label>
            <textarea
              id="allergies"
              name="allergies"
              rows="2"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
              placeholder="List any allergies"
              value={formData.allergies}
              onChange={handleChange}
            ></textarea>
          </div>
          
          {/* Vaccinations */}
          <div>
            <label htmlFor="vaccinations" className="block text-sm font-medium text-gray-400 mb-1">
              Vaccinations
            </label>
            <textarea
              id="vaccinations"
              name="vaccinations"
              rows="2"
              className="appearance-none relative block w-full px-3 py-2 border border-gray-700 placeholder-gray-500 text-white bg-gray-800 rounded focus:outline-none focus:ring-blue-300 focus:border-blue-300 focus:z-10 sm:text-sm"
              placeholder="List vaccinations received"
              value={formData.vaccinations}
              onChange={handleChange}
            ></textarea>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-blue-300 hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 disabled:opacity-50 transition duration-150"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-blue-300 hover:text-blue-200">
              Log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;