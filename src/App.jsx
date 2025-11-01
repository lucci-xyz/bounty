import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AttachBounty from './pages/AttachBounty';
import LinkWallet from './pages/LinkWallet';
import Refund from './pages/Refund';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/attach-bounty" element={<AttachBounty />} />
      <Route path="/link-wallet" element={<LinkWallet />} />
      <Route path="/refund" element={<Refund />} />
    </Routes>
  );
}

export default App;

