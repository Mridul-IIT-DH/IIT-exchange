import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProfileSetup from './pages/ProfileSetup';
import ProductDetail from './pages/ProductDetail';
import Sell from './pages/Sell';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="setup-profile" element={<ProfileSetup />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="sell" element={<Sell />} />
            <Route path="edit/:id" element={<Sell />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="about" element={<About />} />
            <Route path="terms" element={<Terms />} />
            <Route path="contact" element={<Contact />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
