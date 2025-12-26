import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
   try {
     const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
       // If on home screen (or wherever you consider the root), exit the app
       if (location.pathname === '/' || location.pathname === '/home') {
         CapacitorApp.exitApp(); // 👈 closes the app
       } else {
         navigate(-1); // 👈 go back one page
       }
     });
 
     return () => {
       backListener.remove();
     };
   } catch (error) {
      console.log(error);
   }
  }, [navigate, location]);

  return null;
};

export default BackButtonHandler;
