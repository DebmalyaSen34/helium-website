import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Installation from './components/Installation';
import Contribution from './components/Contribution';
import './App.css';
import { Analytics } from '@vercel/analytics/next';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <Features />
        <Installation />
        <Contribution />
      </main>
      <Analytics />
    </div>
  );
}

export default App;
