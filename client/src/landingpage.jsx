import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import planeImg from './assets/airport-image.jpg';
import logoImg from './assets/logo.png'; 

const LandingPage = () => {
  const navigate = useNavigate();

  const handleExloreClick = () => {
    window.location.href = "https://en.wikipedia.org/wiki/Kalaburagi_Airport";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-glory overflow-x-hidden">
      {/* Header with navigation */}
      <header className="flex justify-between items-center px-12 py-6">
        <div className="flex items-center">
          <img 
            src={logoImg} 
            alt="Kalaburagi Airport Logo" 
            className="h-20 mr-3"
          />
          <span className="text-xl font-bold text-black dark:text-white">
            Kalaburagi Airport
          </span>
        </div>
        <nav>
          <ul className="flex space-x-12">
            <li><Link to="/landingpage" className="cursor-pointer font-bold hover:text-gray-600 transition text-black dark:text-white duration-300">Home</Link></li>
            <li><Link to="/details" className="cursor-pointer font-bold hover:text-gray-600 text-black dark:text-white transition duration-300">Flight Logs</Link></li>
            <li><Link to="/calculator" className="cursor-pointer font-bold hover:text-gray-600 text-black dark:text-white transition duration-300">Cost Details</Link></li>
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-12 w-full py-16 grid place-items-center ">
        {/* Left Column - Text Content */}
        <div className="col-span-12 md:col-span-5 px-12 md:pl-12 md:pr-6">
          <h1 className="text-6xl font-bold leading-tight mb-6 text-[#1a2e44] dark:text-sky-400">
            For Regional<br />
            Progress and Growth
          </h1>
          <p className="text-sm mb-8 text-gray-700 dark:text-gray-300">
            with our expanding services and infrastructure, we're driving economic development across North Karnataka.
          </p>
          <button 
            onClick={handleExloreClick}
            className="bg-[#4AADDE] text-white rounded-full py-3 px-6 flex items-center w-max hover:bg-sky-500 transition duration-300"
          >
            <span>Explore the Airport</span>
            <div className="bg-white rounded-full p-1 ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#4AADDE]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        </div>

        {/* Right Column - Image with smaller size */}
        <div className="col-span-12 md:col-span-7 mt-12 md:mt-0">
          <div className="rounded-[120px_50px_120px_50px] overflow-hidden">
            <img
              src={planeImg}
              alt="Airplane landing at sunset on a runway"
              className="w-auto h-auto object-cover object-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
