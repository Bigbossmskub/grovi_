import React from 'react'
import LandingPage from './LandingPage'
import RiceInfoPage from './RiceInfoPage'
import UserGuidePage from './UserGuidePage'



import { useEffect } from 'react'
import { useSection } from '../contexts/SectionContext'

const sectionIds = ['landing', 'rice-info', 'user-guide'] as const;

const HomePage: React.FC = () => {
  const { setCurrentSection } = useSection();

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => {
      let found: string = 'landing';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 80 && rect.bottom > 80) {
            found = id;
            break;
          }
        }
      }
      setCurrentSection(found as any);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setCurrentSection]);

  return (
    <div>
      <div id="landing"><LandingPage /></div>
      <div id="rice-info"><RiceInfoPage /></div>
      <div id="user-guide"><UserGuidePage /></div>
    </div>
  );
}

export default HomePage
