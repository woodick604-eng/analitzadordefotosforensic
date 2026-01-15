
import React from 'react';
import { CameraIcon } from './icons/CameraIcon';

const Header: React.FC = () => {
  return (
    <header className="flex flex-col md:flex-row items-center justify-between p-6 bg-base-200/50 rounded-3xl border border-base-300 gap-4 transition-all hover:border-brand-primary/30 group/header">
      <div className="flex items-center space-x-4">
        <div className="bg-gradient-to-tr from-brand-primary to-brand-secondary p-3 rounded-2xl shadow-lg shrink-0 transition-transform group-hover/header:scale-110 group-hover/header:rotate-3">
           <CameraIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-content-100 tracking-tighter uppercase leading-tight transition-colors group-hover/header:text-white">
            Analitzador d'imatges <span className="text-brand-secondary">d'accidents de trànsit</span>
          </h1>
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-[0.2em] mt-1 opacity-80">Processament Tècnic d'Evidències Policials</p>
        </div>
      </div>
      <div className="text-right hidden md:block">
        <div className="flex flex-col">
          <p className="text-[10px] text-content-200 font-mono uppercase opacity-40 leading-none">Protocol d'Atestats Policials</p>
          <p className="text-[10px] text-content-200 font-mono uppercase opacity-40 mt-1">Agent @5085</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
