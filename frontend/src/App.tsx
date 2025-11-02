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
import MyStudio from './pages/MyStudio';
import CharacterManage from './pages/CharacterManage';
import EpisodeManage from './pages/EpisodeManage';
import SeasonCreate from './pages/SeasonCreate';
import SeasonEdit from './pages/SeasonEdit';
import StoryImport from './pages/StoryImport';
import StoryCollaborators from './components/StoryCollaborators';
import { CartProvider } from './contexts/CartContext';
import { ApiProvider } from './contexts/ApiContext';
import './App.css';

function App() {
  // Mock user data - this will be replaced with real authentication later
  const user = {
    first_name: 'Chris',
    username: 'chris'
  };

  // Set auth token for development
  React.useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      localStorage.setItem('authToken', '8fbc920c12fc42fec5012417bc51225445460acc');
    }
  }, []);

  return (
    <ApiProvider>
      <CartProvider>
        <Router>
          <Layout user={user}>
            <Routes>
            {/* Homepage */}
            <Route path="/" element={<Home />} />
            
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
            <Route path="/immersivecomics/my-studio/" element={<MyStudio />} />
            <Route path="/immersivecomics/import/" element={<StoryImport />} />
            
            {/* Collaboration URLs */}
            <Route path="/immersivecomics/story/:id/collaborators/" element={<StoryCollaborators />} />
            </Routes>
          </Layout>
        </Router>
      </CartProvider>
    </ApiProvider>
  );
}

export default App;
