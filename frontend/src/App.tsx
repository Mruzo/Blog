import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Stories from './pages/Stories';
import StoryCreationWizard from './components/StoryCreationWizard';
import StoryEdit from './pages/StoryEdit';
import StoryManage from './pages/StoryManage';
import ProductList from './pages/ProductList';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import SelectShipping from './pages/SelectShipping';
import PaymentSuccess from './pages/PaymentSuccess';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import Studios from './pages/Studios';
import StudioDetail from './pages/StudioDetail';
import MyStudio from './pages/MyStudio';
import StudioEdit from './pages/StudioEdit';
import CharacterManage from './pages/CharacterManage';
import EpisodeManage from './pages/EpisodeManage';
import SeasonCreate from './pages/SeasonCreate';
import SeasonEdit from './pages/SeasonEdit';
import StoryImport from './pages/StoryImport';
import StoryCollaborators from './components/StoryCollaborators';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register';
import PasswordReset from './pages/PasswordReset';
import PasswordResetDone from './pages/PasswordResetDone';
import PasswordResetConfirm from './pages/PasswordResetConfirm';
import PasswordResetComplete from './pages/PasswordResetComplete';
import Contact from './pages/Contact';
import { CartProvider } from './contexts/CartContext';
import { ApiProvider, useApi } from './contexts/ApiContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import './App.css';

// Inner component that has access to ApiContext
function AppContent() {
  const { currentUser } = useApi();

  return (
    <Router>
      <Layout user={currentUser ? {
        first_name: currentUser.first_name,
        username: currentUser.username
      } : null}>
        <Routes>
          {/* Homepage */}
          <Route path="/" element={<Home />} />
          
          {/* Authentication URLs */}
          <Route path="/login/" element={<Login />} />
          <Route path="/register/" element={<Register />} />
          <Route path="/password-reset/" element={<PasswordReset />} />
          <Route path="/password-reset/done/" element={<PasswordResetDone />} />
          <Route path="/password-reset-confirm/:uidb64/:token/" element={<PasswordResetConfirm />} />
          <Route path="/password-reset-complete/" element={<PasswordResetComplete />} />
          
          {/* Contact Form */}
          <Route path="/contact/" element={<Contact />} />
          
          {/* Product/Store URLs - Matching Django exactly */}
          <Route path="/product/" element={<ProductList />} />
          <Route path="/product/cart/" element={<Cart />} />
          <Route path="/product/cart/checkout/" element={<Checkout />} />
          <Route path="/product/cart/shipping/:orderId/" element={<SelectShipping />} />
          <Route path="/product/payment/success/" element={<PaymentSuccess />} />
          <Route path="/product/my-orders/" element={<MyOrders />} />
          <Route path="/product/order/:orderId/" element={<OrderDetail />} />
          
          {/* Immersive Comics URLs - Matching Django exactly */}
          <Route path="/immersivecomics/" element={<Stories />} />
          <Route path="/immersivecomics/dashboard/" element={<Stories />} />
          <Route path="/immersivecomics/story/create/" element={<StoryCreationWizard />} />
          <Route path="/immersivecomics/story/create/:stepId/" element={<StoryCreationWizard />} />
          <Route path="/immersivecomics/story/:id/edit/" element={<StoryEdit />} />
          <Route path="/immersivecomics/story/:id/manage/" element={<StoryManage />} />
          <Route path="/immersivecomics/story/:storyId/characters/" element={<CharacterManage />} />
          <Route path="/immersivecomics/story/:storyId/season/create/" element={<SeasonCreate />} />
          <Route path="/immersivecomics/season/:seasonId/edit/" element={<SeasonEdit />} />
          <Route path="/immersivecomics/season/:seasonId/episodes/" element={<EpisodeManage />} />
          
          {/* Studio URLs */}
          <Route path="/immersivecomics/studios/" element={<Studios />} />
          <Route path="/studios/:id/" element={<StudioDetail />} />
          <Route path="/immersivecomics/my-studio/" element={<MyStudio />} />
          <Route path="/immersivecomics/studio/:id/edit/" element={<StudioEdit />} />
          <Route path="/immersivecomics/import/" element={<StoryImport />} />
          
          {/* Collaboration URLs */}
          <Route path="/immersivecomics/story/:id/collaborators/" element={<StoryCollaborators />} />
          
          {/* Catch-all route for 404 - show dedicated 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}

function App() {
  return (
    <ApiProvider>
      <CartProvider>
        <FeedbackProvider>
          <AppContent />
        </FeedbackProvider>
      </CartProvider>
    </ApiProvider>
  );
}

export default App;
